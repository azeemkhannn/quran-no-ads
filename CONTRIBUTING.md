# Contributing to Quran No Ads

Assalamu alaikum, and thank you for wanting to help! Quran No Ads is a free, offline, ad-free IndoPak
13-line Quran app for Android and iOS. **It is not for sale** and never will be. It is made as
Sadaqa-e-Jaria, so every improvement you make benefits everyone who reads with it.

You can help even without writing code:

- **Report a mistake in the Quran text or layout.** This is the most valuable contribution. Use the
  [Quran text mistake](https://github.com/azeemkhannn/quran-no-ads/issues/new?template=text_mistake.yml) form.
- **Report a bug** or **suggest a feature** with the issue forms.
- **Test on your phone**, especially low-end Android phones and iPhones, and tell us what you find.

## Golden rules

1. **Never edit the Quran text or page layout by hand.** The text comes from verified sources
   (see [NOTICE.md](NOTICE.md)). If something is wrong, open a *Quran text mistake* issue with the page and
   line number and, if you can, a photo of the same page in a printed Taj Company 13-line mushaf.
   Fixes go through the data pipeline (`scripts/build_data.py`) so they are checked.
2. **No ads, no tracking, no analytics, no accounts, no network requests.** The app must keep working fully
   offline. Pull requests that add any of these will not be merged.
3. **Keep it light.** Many readers use low-end phones. Avoid big dependencies, and prefer Expo modules
   that already ship in Expo Go.
4. **Respect the sources.** The font and the Quran data are not covered by the GPL, and they have their own
   owners and terms. Don't swap them, edit them or redistribute them in other projects.

## Get the app running

You need **Node.js 20+** and the **Expo Go** app (SDK 58) on your phone, or an Android emulator.

```bash
git clone https://github.com/azeemkhannn/quran-no-ads.git
cd quran-no-ads
npm install
npx expo start        # press a = Android, i = iOS, w = web, or scan the QR code with Expo Go
```

The Quran data (`assets/data/quran.json`) is in the repo. **The Quran font is not:** QuranWBW allows its
use in this app but asked that it is not shared on public repositories. To run the app, ask QuranWBW
(quranwbw.com) for the IndoPak font yourself and place it at `assets/fonts/IndoPakNastaleeq.ttf`. Please don't
commit it; the folder is in `.gitignore`.

## Before you open a pull request

```bash
npx tsc --noEmit      # typecheck
npx expo lint         # lint
npx expo-doctor       # dependency checks
```

All three must pass. Then:

- **Test on Android**, either a real phone or an emulator, and on the web preview. Android renders Arabic
  text differently from iOS and web (see below), so a change that looks fine in the browser can break
  on Android.
- For UI changes, add **screenshots** (light and night theme) to the pull request.
- Keep pull requests **small and focused**: one fix or feature each.

## Project structure

```
src/app/            routes (Expo Router): index = Home, read = reader, about = About & sources
src/home/           Home screen: continue reading, recently read, surahs, paras, bookmarks
src/reader/         the mushaf page: layout maths, line fitting, word rendering, go-to-page dialog
src/about/          About & sources page, with on-device verification of the Quran data
src/data/           page and word data access, integrity checks, para names
src/store/          saved state (reading place, bookmarks, theme, recents), stored on the device only
scripts/            build_data.py (QUL data → quran.json, with validation), patch_font.py
docs/               licences, plan, screenshots
```

## Things to know about the Arabic rendering

These cost a lot of time to get right, so please read them before touching `src/data/pages.ts`,
`src/reader/WordUnit.tsx` or the font:

- In this font, **waqf signs and ayah circles are positioned by rules that need the font's `space` glyph
  right before them**, in the same Arabic run.
- **Android splits text at every normal space** before shaping, and it can wrap the part after the space
  onto a hidden line. That made signs vanish, pile up, or cut off the start of words.
- The fix: `scripts/patch_font.py` maps **U+202F** to the font's `space` glyph. On Android and web, the
  spaces inside a word unit are written as U+202F, plus one after trailing signs. iOS keeps the original
  text.
- If you change the font, the data or the word layout, bump `MEASURE_VERSION` in
  `src/reader/LineMeasurer.tsx`, so phones measure the lines again.
- Every page must keep exactly its 13 lines, justified, with no overflow. Check several pages (for example
  2, 3, 7, 293 and 843) in both themes.

## Good first contributions

Look for issues labelled **good first issue**. Some ideas:

- A Settings screen: font-size fine-tuning
- Tablet layout: two pages side by side in landscape
- Hifz helper: hide or reveal lines for revision
- An Urdu translation of the app's interface text

## Licence of your contributions

By contributing, you agree that your contribution is licensed under the **GNU General Public License
v3.0 or later**, the same as the project's code. Please only submit work that you wrote or have the right
to share.

## Questions

Open a [question issue](https://github.com/azeemkhannn/quran-no-ads/issues/new/choose), or email the maintainer, Azeem Ullah Khan, at
azeemkhannnn7@gmail.com.

JazakAllahu khairan for helping!
