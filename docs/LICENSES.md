# Licences and permissions — Quran No Ads

Checked on 21 November 2026. This is a practical summary, not legal advice.

## Summary

| Part of the app | Where it comes from | What its licence says | Permission needed? |
|---|---|---|---|
| **Font** `assets/fonts/IndoPakNastaleeq.ttf` | "AlQuran IndoPak by QuranWBW", v2.100, by Ayman Siddiqui for QuranWBW.com. Based on the Al Qalam Quran Majeed fonts; ayah numbers from the KFGQPC Nastaleeq font. Re-hosted on QUL as font 242. | The licence text inside the font says: *"NOT FOR SALE, NOT FOR MODIFICATION, NOT FOR DISTRIBUTION OR NOT FOR DEVELOPMENT WITHOUT WRITTEN NOTICE BY QURANWBW.COM"* — email quranwbw@gmail.com. It is made for Sadaqa-e-Jaria. | **YES: written permission from QuranWBW.** It covers distribution in the app and our small modification (one added character mapping, see below). |
| **Quran text** (IndoPak Nastaleeq, word by word) | QUL "Quran script 59". This IndoPak text was originally prepared by Ayman Siddiqui and R. Siddiqua for QuranWBW.com and Quran.com. | QUL: *"We don't have copyright information for this resource."* The published IndoPak text repo asks that it is not sold, manipulated, or distributed without credit. | **YES: include it in the QuranWBW email** (same authors). Credit is required. |
| **Page layout** (Taj Company 13-line, 847 pages) | QUL "mushaf layout 313". It follows the mushaf printed by Taj Company, Lahore. | QUL: *"We don't have copyright information for this resource."* | **YES: ask QUL/Tarteel** about the data. **Recommended: courtesy request to Taj Company**, since the line and page arrangement follows their print. |
| **Surah names and juz metadata** | QUL Quran metadata | No licence stated. These are basic facts (surah names, juz boundaries). | Low risk. Mention them in the QUL request. |
| **Para names** (الٓمّٓ, سَيَقُوْلُ …) | Traditional names, typed in the app | Public domain (traditional) | No |
| **Ayah-number glyphs** (inside the font) | KFGQPC (King Fahd Complex) Nastaleeq font | The KFGQPC end-user licence reserves all rights | **Ask QuranWBW** whether their permission covers this. If not, KFGQPC must be asked. |
| **App code libraries** (Expo, React, React Native, expo-router, expo-sqlite, Ionicons via @expo/vector-icons, …) | npm | **MIT** (all 16 runtime packages checked) | No. Keep their licence notices: the app's About page and store listing can say "Open-source licences: MIT". |
| **QUL software** | github.com/TarteelAI/quranic-universal-library | MIT (software only; this does not cover the data or fonts) | No. We don't use their code. |

## Our changes to third-party files

- **Font:** `scripts/patch_font.py` adds one character-map entry, U+202F mapped to the font's own `space` glyph. No glyph is added, removed or edited. This is needed so waqf signs and ayah circles render correctly on Android. **The font licence forbids modification without written notice, so this must be disclosed to QuranWBW and approved.**
- **Text:** no word is changed. On Android and web, the spaces *inside* a word unit are written as U+202F at display time only. The bundled data file keeps the original text.

## Permission requests sent (21 November 2026)

| To | How | Status |
|---|---|---|
| QuranWBW (font and IndoPak text) | Email to quranwbw@gmail.com | Waiting for reply |
| QUL / Tarteel (layout, script, font, metadata) | One GitHub issue per resource, filed with their "Licence or permission" form: [#1106](https://github.com/TarteelAI/quranic-universal-library/issues/1106) layout 313, [#1107](https://github.com/TarteelAI/quranic-universal-library/issues/1107) script 59, [#1108](https://github.com/TarteelAI/quranic-universal-library/issues/1108) font 242, [#1109](https://github.com/TarteelAI/quranic-universal-library/issues/1109) metadata. They replace [#1085](https://github.com/TarteelAI/quranic-universal-library/issues/1085), closed on 24 Nov 2026. | Waiting for reply |
| Taj Company (13-line layout) | Email to orders@tajquran.com, the only email on tajquran.com | Waiting for reply |
| KFGQPC (ayah-number glyphs) | Not sent: depends on QuranWBW's answer | — |

## Before publishing to Google Play / App Store

1. Get written permission from **QuranWBW** for the font and text, including the font modification.
2. Ask **QUL / Tarteel** about the layout data and metadata, and the attribution they want (sent as a GitHub issue, because QUL gives no email).
3. Send a courtesy permission request to **Taj Company** for using their 13-line page layout.
4. Only if QuranWBW says it's needed, contact **KFGQPC** about the ayah-number glyphs.
5. Keep every reply, and keep the credits on the About page exactly as each author asks.

If QuranWBW refuses or doesn't answer, the fallback is to switch to a font whose licence allows redistribution. That would need the Android rendering checks redone.
