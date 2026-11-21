# Quran No Ads

An offline, ad-free 13-line IndoPak mushaf (Taj Company layout, 847 pages) for Android and iOS, built with Expo / React Native.

## Status
- All **847 pages** render from the font plus layout data (no page images).
- Lines are justified like the print. Surah-ending lines are centered, and each surah has a header and a Bismillah line.
- One font size per device: the widest line fills the screen (on tablets the height limits it).
- Right-to-left page swipe (page 1 on the right), Next/Prev buttons and a Go-to-page box.
- Light, Sepia and Night themes.
- **Resume:** reopens on the last page read. The theme and bookmarks are saved on the device (SQLite key-value store on phones, `localStorage` on web), with no account and no network.
- **Home landing page** (the app opens here) has:
  - a "Continue reading" card with reading progress;
  - a **Surahs** tab with search by name or number;
  - a **Paras** tab with the traditional IndoPak para names;
  - a **Bookmarks** tab with remove buttons.
  
  Tapping anything opens the reader. The reader's home button, or Android Back, returns here. Home also measures the reader's font size in the background, so pages open instantly.
- **Your place is kept automatically, with no questions.** "Continue reading" is your main place (for example, a khatm). Opening a surah, para or bookmark from Home reads it on the side and leaves your main place where it is. Two cases do move it: when you haven't started reading yet, and when the page is right at your place. Side readings appear under **Recently read** (one entry per surah, at the page where you stopped; long-press to remove). In the reader, the line above the toolbar says "Your place stays on page N" and has a **Move here** button. When you're reading your main place, it shows your progress instead. The rules are in `readerStore.modeFor`.
- **Bookmarks:** a toolbar button toggles the bookmark on the current page, and bookmarked pages show a solid page badge.
- Navigation uses Expo Router. Routes are in `src/app/` (`/` is Home, `/read` is the reader), screens in `src/home/` and `src/reader/`, and state in `src/store/`.
- A browser check at phone width found no line overflowing on any of the 847 pages.

## Run
```
npm install
npx expo start          # press a = Android, i = iOS (Expo Go), w = web
```

## Data
`assets/data/quran.json` (2.6 MB, about 600 KB compressed) is generated from the QUL downloads:

```
python -I scripts/build_data.py <folder with unzipped QUL files> assets/data/quran.json
```

The script needs these files in the folder:
- `indopak-13-lines-taj-company.db`
- `indopak-nastaleeq.db`
- `quran-metadata-surah-name.sqlite`
- `quran-metadata-juz.sqlite`

It **fails** unless all of these hold:
- every word 1..83,668 appears exactly once, in order;
- 847 pages with at most 13 lines each;
- 6,236 ayahs, 114 surah headers, 112 separate Bismillah lines and 30 juz. Every surah except At-Tawbah begins with Bismillah; in Al-Fatihah it is ayah 1, so it isn't a separate line.

The data is bundled as compact JSON rather than SQLite because it is read-only and small. That avoids a native database dependency and works the same on Android, iOS and web.

## Files
- `src/reader/layout.ts`: font-size and line-height maths (the numbers to tune)
- `src/reader/MushafPage.tsx`: draws one page
- `src/reader/LineMeasurer.tsx`: measures the 60 longest lines once at startup
- `src/data/pages.ts`: reads `quran.json` and builds each page on demand

## Next
- Test on real Android and iOS phones, especially small screens.
- Resume at the last-read page, the Surah and Para lists, and bookmarks (MVP features).
- Cache the measured font size per screen width, so measuring runs only on first launch.
- Have a hafiz proofread every page against the printed Taj 13-line mushaf. One known item: QUL encodes the ayah-1 marker of Al-Fatiha's Bismillah with a different glyph (U+F61E) that shows as an empty circle.
- Ask QUL/Tarteel and QuranWBW for permission and add their credits to the About screen.

## Credits
- The font is "Indopak Nastaleeq" (Hanafi v4.2.2 with waqf lazim) from the Quranic Universal Library (Tarteel). Its embedded credits name Al Qalam, Ghandhara, KFGQPC and Ayman Siddiqui.
- One technical change to the font: `scripts/patch_font.py` adds a single character-map entry, U+202F → the font's own `space` glyph. No glyph is added or edited. Android splits text at normal spaces before shaping, which broke the waqf signs and ayah circles, and this entry lets the app use U+202F inside words on Android and web instead. Re-run the script whenever the font is replaced. Mention this change when asking QUL for permission.
- The layout, words and metadata come from the QUL "Indopak 13 lines (Taj company)" layout, the IndoPak Nastaleeq word-by-word script, and QUL's surah and juz metadata.
