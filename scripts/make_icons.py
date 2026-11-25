"""Builds every app icon (iOS, Android adaptive, splash, web) from one square source image.

Usage: python -I scripts/make_icons.py [assets/images/icon-source.webp]

The source is a square picture whose corners are rounded off on a white background. The script
fills those corners with the picture's own edge colours, so stores get a full-bleed square and
each platform applies its own corner mask.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

SRC = sys.argv[1] if len(sys.argv) > 1 else "assets/images/icon-source.webp"
OUT = "assets/"
SIZE = 1024
SPLASH_BG = (1, 50, 25)  # the source's dark-green edge; also used in app.json
ANDROID_SCALE = 0.70  # keeps the arch, title and book inside a circular launcher mask


def corner_mask(im: Image.Image) -> Image.Image:
    """White (255) where the source shows its white rounded-off corners."""
    w, h = im.size
    px = im.load()
    mask = Image.new("L", im.size, 0)
    m = mask.load()
    seen = set()
    queue = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        if min(px[x, y][:3]) < 200:  # reached the picture
            continue
        m[x, y] = 255
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # Swallow the light anti-aliased fringe along the curve.
    return mask.filter(ImageFilter.MaxFilter(7))


def fill_corners(im: Image.Image, mask: Image.Image) -> Image.Image:
    """Paints the masked corners with a smooth spread of the nearby picture colours.

    Normalised convolution at a few radii: colour = blur(colour * keep) / blur(keep).
    """
    rgb = np.asarray(im, dtype=np.float32)
    hole = np.asarray(mask, dtype=np.float32) / 255
    keep = 1 - hole
    out = rgb.copy()
    todo = hole > 0
    for radius in (6, 20, 60, 180):
        k = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
        den = np.asarray(k, dtype=np.float32) / 255
        num = np.stack([
            np.asarray(Image.fromarray((rgb[..., c] * keep).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)
            for c in range(3)
        ], axis=-1)
        ok = todo & (den > 0.02)
        out[ok] = num[ok] / den[ok][:, None]
        todo &= ~ok
    filled = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    # Soften only the filled corners so they carry no hard steps.
    soft = filled.filter(ImageFilter.GaussianBlur(10))
    feather = mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(4))
    return Image.composite(soft, filled, feather)


def on_layer(img: Image.Image, scale: float, feather: int = 0) -> Image.Image:
    """Places img (RGBA) centred on a transparent square layer at the given scale."""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    side = round(SIZE * scale)
    small = img.resize((side, side), Image.LANCZOS)
    if feather:
        a = Image.new("L", (side, side), 0)
        ImageDraw.Draw(a).rectangle((feather, feather, side - feather, side - feather), fill=255)
        a = a.filter(ImageFilter.GaussianBlur(feather / 2))
        small.putalpha(ImageChops.multiply(small.getchannel("A"), a))
    off = (SIZE - side) // 2
    layer.alpha_composite(small, (off, off))
    return layer


def notification_icon(mono: Image.Image, size: int = 96) -> Image.Image:
    """Android notification icon: the app icon's artwork (arch, title, book) as a white silhouette.

    Android draws only the alpha channel of this icon (in the app colour), so it is the same shape
    as the themed icon, cropped tight and made crisp so it still reads at 24dp.
    """
    art = mono.crop(mono.getbbox())
    side = max(art.size)
    square = Image.new("RGBA", (side, side), (255, 255, 255, 0))
    square.alpha_composite(art, ((side - art.width) // 2, (side - art.height) // 2))
    pad = round(size * 0.04)
    small = square.resize((size - 2 * pad, size - 2 * pad), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda v: 255 if v > 90 else (0 if v < 30 else v * 2))
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    white = Image.new("RGBA", small.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    img.alpha_composite(white, (pad, pad))
    return img


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    if src.width != src.height:
        raise SystemExit("source must be square")
    mask = corner_mask(src)
    full = fill_corners(src, mask)  # full-bleed square

    icon = full.resize((SIZE, SIZE), Image.LANCZOS)
    icon.save(OUT + "icon.png")  # iOS + default; opaque as the App Store requires
    icon.resize((48, 48), Image.LANCZOS).save(OUT + "favicon.png")

    # iOS 18 tinted: greyscale, the system colours it.
    ImageOps.grayscale(icon).convert("RGB").save(OUT + "ios-icon-tinted.png")

    # Android adaptive icon (108dp layers, only the centre 72dp is ever shown).
    Image.new("RGB", (SIZE, SIZE), SPLASH_BG).save(OUT + "android-icon-background.png")
    fg = on_layer(full.convert("RGBA"), ANDROID_SCALE, feather=10)
    fg.save(OUT + "android-icon-foreground.png")

    # Android 13+ themed icon: the gold artwork (title, arch, book) as a white silhouette.
    lum = ImageOps.grayscale(full)
    alpha = lum.point(lambda v: max(0, min(255, (v - 95) * 255 // 70)))
    mono = Image.new("RGBA", full.size, (255, 255, 255, 0))
    mono.putalpha(alpha)
    on_layer(mono, ANDROID_SCALE).save(OUT + "android-icon-monochrome.png")

    # Splash: the original rounded tile with its corners made transparent.
    tile = src.convert("RGBA")
    tile.putalpha(ImageOps.invert(mask.filter(ImageFilter.GaussianBlur(1.5))))
    tile.resize((SIZE, SIZE), Image.LANCZOS).save(OUT + "splash-icon.png")

    notification_icon(mono).save(OUT + "notification-icon.png")

    for name in ("icon", "favicon", "ios-icon-tinted", "android-icon-background",
                 "android-icon-foreground", "android-icon-monochrome", "splash-icon", "notification-icon"):
        print("wrote", OUT + name + ".png")


if __name__ == "__main__":
    main()
