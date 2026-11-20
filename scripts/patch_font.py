"""Add a second code point for the font's SPACE glyph (idempotent).

Why: in the IndoPak Nastaleeq font, waqf signs (ۚ ۛۖۚ ۪ …) and the ayah-end circle are positioned
and stacked by OpenType rules that need the real `space` glyph right before them in the same
Arabic run ("قَبْلِكَ ۚ"). Android's text engine (Minikin) always splits text after U+0020 before
shaping, so those rules never fire there: signs pile on top of each other or vanish, and the part
after the space can wrap onto a hidden line.

Fix: map U+202F NARROW NO-BREAK SPACE ("joiner space", unused by the font) to the very same `space`
glyph. Android does not split at U+202F (it splits only at U+0020, U+00A0, U+2000-200A, U+3000), and
U+202F has script Common, so it stays inside the Arabic run (a private-use code point would not: its
script is Unknown, which breaks the run and the Arabic rules stop applying). HarfBuzz sees the `space`
glyph, so every rule applies exactly as the font designer intended. The app uses U+202F instead of
U+0020 inside word units on Android/web (see src/data/pages.ts). No glyph is added or changed.

Usage: python scripts/patch_font.py assets/fonts/IndoPakNastaleeq.ttf
"""
import sys

from fontTools.ttLib import TTFont

JOINER_SPACE = 0x202F


def main():
    path = sys.argv[1]
    font = TTFont(path)
    changed = False
    for table in font["cmap"].tables:
        if not table.isUnicode():
            continue
        current = table.cmap.get(JOINER_SPACE)
        if current == "space":
            continue
        if current is not None:
            sys.exit(f"U+{JOINER_SPACE:04X} is already used by glyph {current!r}; pick another code point")
        table.cmap[JOINER_SPACE] = "space"
        changed = True
    if changed:
        font.save(path)
        print(f"patched: U+{JOINER_SPACE:04X} -> space in {path}")
    else:
        print("already patched")


if __name__ == "__main__":
    main()
