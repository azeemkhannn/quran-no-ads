# Licences and permissions — Quran No Ads

Updated on 25 November 2026. This is a practical summary, not legal advice.

## Summary

| Part of the app | Where it comes from | Status |
|---|---|---|
| **Quran text** (IndoPak v5.4, Hanafi) | QuranWBW.com, prepared by Ayman Siddiqui & R. Siddiqua | **Permission granted by QuranWBW (25 Nov 2026)**, on the conditions below. Used unmodified. |
| **Font** (AlQuranNeo v5.x) | QuranWBW.com, by Ayman Siddiqui & R. Siddiqua, based on the Al-Qalam fonts; ayah numbers from KFGQPC | **Permission granted by QuranWBW (25 Nov 2026).** Used unmodified, for the Quran text only. **Not included in this repository**, at QuranWBW's request. |
| **Ayah-number glyphs** (inside the font) | KFGQPC | QuranWBW confirmed they are part of their Sadaqa-e-Jaria font, so no separate permission is needed. |
| **Page layout** (Taj Company 13-line, 847 pages) | QUL "mushaf layout 313", following the Taj Company print | QUL: *"We don't have copyright information for this resource."* Permission asked from QUL and Taj Company; waiting. |
| **Surah names and juz metadata** | QUL Quran metadata | Basic facts; permission asked from QUL; waiting. |
| **Para names** (الٓمّٓ, سَيَقُوْلُ …) | Traditional names, typed in the app | Public domain (traditional) |
| **App code libraries** (Expo, React Native, …) | npm | MIT |

## QuranWBW's conditions (permission email, 25 November 2026)

1. The project stays free (Sadaqa-e-Jaria): no ads, and no Quran text behind a paywall.
2. The font is used only with its own compatible Quran text, **without any modifications**. The text must appear
   exactly as on QUL, Quran.com and QuranWBW.com. (They recommended the IndoPak v5.4 data and font, which work
   without changes.)
3. The font is used only to display the Quran text (or duas from the Quran with the exact ayah reference).
4. It is not used for anything else, such as general duas or notices.
5. All credits from their README are shown, including that prior permission was obtained to use the original,
   unmodified Quran text and font, restricted to displaying the Quran text only.

They also asked that the font is not shared on a public repository.

## How the app meets them

- Free, no ads, no purchases, not for sale.
- Text and font are QuranWBW's IndoPak v5.4 files, unmodified. `scripts/apply_quranwbw.py` places the v5.4 words on
  the 13-line layout; the only step is splitting "بَعْدَ مَا" at its space in three ayahs, where the layout counts
  it as two words. No character is added, removed or changed (the script checks this).
- The Quran font is used only for the Quran text (pages, Bismillah, Al-Fatihah sample on the welcome screen).
  Surah names, headers and all other text use the phone's normal font.
- The full credits are on the About page and in NOTICE.md.
- The font file is excluded from git and was removed from the repository history.

## Permission requests

| To | How | Status |
|---|---|---|
| QuranWBW (text and font) | Email | **Granted, 25 Nov 2026** |
| QUL / Tarteel (layout, metadata) | GitHub issues [#1106](https://github.com/TarteelAI/quranic-universal-library/issues/1106) layout 313, [#1107](https://github.com/TarteelAI/quranic-universal-library/issues/1107) script 59, [#1108](https://github.com/TarteelAI/quranic-universal-library/issues/1108) font 242, [#1109](https://github.com/TarteelAI/quranic-universal-library/issues/1109) metadata (they replace #1085) | Waiting for reply |
| Taj Company (13-line layout) | Email | Waiting for reply |
| KFGQPC (ayah-number glyphs) | Not needed, per QuranWBW | — |
