# IndoPak Quran – No Ads: Project Plan

A free, offline, ad-free IndoPak 13-line Quran for Android and iOS, built in React Native.

**Main promise:** no ads, no tracking, no login, no internet needed. The app opens straight to the page you last read.

---

## 1. Research findings

### 1.1 The 13-line IndoPak mushaf
- The 13-line IndoPak (Hafizi) mushaf is the one most huffaz in South Asia and South Africa use. The common print is the **Taj Company 13-line (Code 23), about 848 pages**.
- Users have asked Quran.com and Tarteel for a 13-line IndoPak option, so the big free apps do not serve it well. That gap is the opportunity.
- The App Store already has 13-line apps ("13 Line Quran Indopak Script", "IndoPak Quran Line 13", "Quran 13 Line"). Most are ad-supported or image-based and large. **Your edge: no ads, small download, crisp text, offline, private.**

### 1.2 Where the data comes from (the most important decision)
**Quranic Universal Library (QUL, by Tarteel)**, at qul.tarteel.ai, publishes mushaf layout data that reproduces printed pages line by line:

| QUL layout | Pages | Lines/page | Notes |
|---|---|---|---|
| **ID 23 – IndoPak 13 lines, Taj Company** | 847 | 13 | ✅ Recommended. Matches the most common print |
| ID 17 – IndoPak 13 lines, Qudratullah | 849 | 13 | Alternative print |
| ID 6 – IndoPak 15 lines, Qudratullah | 610 | 15 | Possible later addition |
| ID 7 – IndoPak 16 lines, Taj | 548 | 16 | Possible later addition |

- **Font:** QUL "Indopak Nastaleeq" (resource 242), available as TTF, WOFF and WOFF2. It includes waqf-e-lazim marks. It pairs with QUL's **IndoPak Nastaleeq word-by-word script** (resource 59).
- **Another source:** the `marwan/indopak-quran-text` repo on GitHub, which has IndoPak text built against the 13-line Hanafi mushaf, with its own fonts.

### 1.3 Licensing ⚠️ (settle this before you publish)
- QUL's font page says *"We don't have copyright information for this resource."*
- The QuranWBW / Quran.com IndoPak text and font (credited to Ayman Siddiqui and R. Siddiqua) say: **do not sell, change, or share without credit.** A free app that gives credit fits that spirit. Still, **email QUL/Tarteel and QuranWBW and ask for written permission** before release.
- KFGQPC fonts, from the King Fahd Complex, have a restrictive license (all rights reserved). Do not ship them without permission.
- Do **not** use scanned page images from Taj Company or other printers. Those scans are copyrighted, and they are heavy.

### 1.4 How to draw the pages: font vs images
| | Font + layout data (recommended) | Scanned page images |
|---|---|---|
| App size | **~8–20 MB** | 150–400 MB |
| Sharpness | Crisp at every screen size | Blurry when zoomed |
| Night mode | Easy (change the text color) | Hard (color inversion looks poor) |
| Tap a word or ayah | Possible | Not possible |
| Copyright | Font/data permission needed | Printer's scans, usually not allowed |
| Work needed | Line justification takes effort | Easy |

**Decision: use the font and the QUL layout data.** This choice is what makes the app small and still look like the printed mushaf.

---

## 2. Scope: simple features

### Version 1 (MVP)
1. **Mushaf reader:** 847 pages, 13 lines each, swiped right-to-left like a real book, with the page number and para (juz) number in the header.
2. **Resume reading:** the app reopens on the last page you read.
3. **Indexes:** a Surah list (114) and a Para list (30, with IndoPak names such as الٓمّٓ and سَيَقُولُ). Tapping one jumps to its page.
4. **Go to page:** type a number from 1 to 847.
5. **Bookmarks:** long-press a page to save it, with an optional label.
6. **Themes:** Light (cream paper), Sepia, and Night (true black, which saves battery on AMOLED screens).
7. **Keep the screen on** while reading (a setting).
8. **Mushaf markers:** ruku (ع), manzil, sajda, and para/hizb quarter marks (ربع، نصف، ثلث) in the margins.
9. **About screen:** credits for the font and data, and a "Report a mistake" button (opens email, no server needed).

### Version 2 (later, only if wanted)
- Highlight the ayah you tap and copy or share its text.
- A hifz helper: hide lines and reveal them one at a time.
- Optional audio recitation, downloaded per surah (the base app stays offline and small).
- A 15-line layout, chosen in settings.
- Tablet two-page spread.

### Not doing (keeps the app light)
Ads, analytics, logins, cloud sync, translations or tafsir in v1, push notifications.

---

## 3. Tech stack

| Area | Choice | Why |
|---|---|---|
| Framework | **Expo (latest SDK) + React Native, New Architecture, Hermes** | One codebase, and EAS cloud builds let you build for iOS without a Mac |
| Language | TypeScript | Fewer bugs |
| Navigation | Expo Router | Simple, file-based |
| Page swiping | `react-native-pager-view` (RTL) | Native paging, smooth, and only nearby pages are in memory |
| Quran data | **Bundled read-only SQLite** with `expo-sqlite` | Fast queries, works offline, ~3–6 MB |
| Settings and bookmarks | `react-native-mmkv` | Very fast and tiny |
| Font | Bundled IndoPak Nastaleeq TTF via `expo-font` | Offline |
| Keep screen on | `expo-keep-awake` | |
| Builds and store | EAS Build + EAS Submit | Free tier is enough |

**No network permission at all.** Remove `INTERNET` from the Android manifest in release builds and say so on the store page: "Works 100% offline, collects no data."

---

## 4. Data pipeline (one-time Node script)

```
QUL downloads (layout + word-by-word + font)
      │
      ▼
scripts/build-db.ts ── merge, check, compact
      │
      ▼
assets/quran.db (SQLite, read-only, ~3–6 MB)
```

Planned tables (check them against the actual QUL export):
```sql
words  (id INTEGER PK, surah INT, ayah INT, position INT, text TEXT)
lines  (page INT, line INT, type TEXT,        -- 'ayah' | 'surah_name' | 'basmallah'
        is_centered INT, first_word INT, last_word INT, surah INT)
surahs (number INT, name_ar TEXT, name_en TEXT, start_page INT, ayah_count INT, revelation TEXT)
juz    (number INT, name_ar TEXT, start_page INT)
markers(page INT, line INT, kind TEXT)       -- ruku, manzil, sajda, hizb-quarter
```

The build script should also check that:
- there are exactly 847 pages with 13 lines each (blank lines on surah-start pages are allowed),
- the total is 6,236 ayahs and 114 surahs,
- no word is missing or appears twice between page boundaries.

---

## 5. Making the pages look like the printed mushaf

This is the hardest part of the project. Do it first.

1. **One font size per device:** at app start, measure the widest line in the mushaf at a test size. Then set the font size so that line fills the screen width minus the margins. Every page then uses the same size.
2. **Line height:** (screen height − header − footer) ÷ 13, so a full page fits with no scrolling.
3. **Justify each line:** draw the words of a line in a `flexDirection: 'row-reverse'` row with `justifyContent: 'space-between'`, so every line reaches both edges like print. Lines with `is_centered` (the last lines of a surah) are centered instead.
4. **Surah header:** a decorated frame (one small SVG) with the surah name, plus a centered Bismillah line.
5. **Performance:** each page is about 13 rows of roughly 10 `<Text>` words. Wrap pages in `React.memo`, render only the current page and one page on each side, and load the page's rows from SQLite (a ~1 ms query).
6. **Fallback if spacing looks wrong:** draw each line as one string and stretch it with `transform: [{ scaleX }]`, measured with `onTextLayout`. Pick whichever looks closer to the print after testing on real phones.

**Spike goal (week 1):** pages 1, 2, 3, 300 and 847 should look right on a small Android phone, a large Android phone and an iPhone before anything else gets built.

---

## 6. Project structure

```
quran-app/
├─ app/                  # Expo Router screens
│  ├─ index.tsx          # Reader (opens last page)
│  ├─ surahs.tsx
│  ├─ juz.tsx
│  ├─ bookmarks.tsx
│  └─ settings.tsx
├─ src/
│  ├─ reader/            # MushafPage, MushafLine, SurahHeader, PageFooter
│  ├─ db/                # sqlite open + queries
│  ├─ store/             # mmkv: settings, bookmarks, lastPage
│  └─ theme/             # light / sepia / night tokens
├─ assets/
│  ├─ fonts/IndoPakNastaleeq.ttf
│  └─ quran.db
└─ scripts/build-db.ts
```

---

## 7. Keeping the app small (target: under 15 MB to download)
- Ship an Android App Bundle (AAB), so Play delivers each phone only the code it needs.
- Turn on R8/ProGuard and resource shrinking.
- Use Hermes, with no big UI libraries (no UI kits, no lodash, no moment).
- Ship one font file. Make the SQLite file `VACUUM`ed and read-only.
- Use only a few dependencies (fewer than 10 runtime packages).

---

## 8. Timeline (one developer, part-time)

| Week | Work |
|---|---|
| 1 | Get licensing permission emails sent. Set up the Expo project. Run the **page-rendering spike** (section 5). |
| 2 | Data pipeline: build `quran.db` and its validation checks. |
| 3 | Reader: pager, header and footer, markers, last-page resume. |
| 4 | Surah and Para indexes, go to page, bookmarks. |
| 5 | Themes, settings, keep-awake, About screen. Size tuning. |
| 6 | **Proofreading:** a hafiz checks every page against the printed Taj 13-line mushaf. Fix bugs. |
| 7 | Store assets and listings. Android closed test. TestFlight. |
| 8 | Public release. |

---

## 9. Publishing checklist
- **Google Play:** a $25 one-time developer fee. New personal accounts must run a **closed test with at least 12 testers for 14 days** before going public, so start recruiting testers early (your masjid or madrasa).
- **Apple App Store:** $99 per year. EAS Build can build iOS in the cloud without a Mac, but test on a real iPhone through TestFlight.
- **Apple guideline 4.3 (spam):** there are many Quran apps, so stress in the review notes and listing what makes this one different: 13-line IndoPak, no ads, offline, no data collected.
- **Privacy:** Play Data Safety says "No data collected" and Apple's privacy label says "Data Not Collected". You still need a one-page privacy policy URL (a free GitHub Pages site works).
- **Store keywords:** "13 line Quran", "IndoPak Quran", "Hafizi Quran", "Quran no ads", "Quran offline", "Pakistani Quran", "Quran Sharif".

---

## 10. Risks and how to handle them
| Risk | What to do |
|---|---|
| Text errors in the Quran | Check the data in code, have a hafiz proofread every page, keep the "Report a mistake" button, and push fixes quickly |
| Font or data license refused | Ask early. A backup is the `marwan/indopak-quran-text` data and fonts, with credit |
| Line spacing doesn't match the print on some phones | Week-1 spike plus the scaleX fallback. Test on small screens |
| Apple rejects the app as spam | Make the differences clear and polish the design |
| Your own costs | Apple $99/yr is the only ongoing cost. You could accept optional donations later, with no ads |

---

## 11. First steps this week
1. Download QUL layout **ID 23 (Taj 13-line)**, the IndoPak Nastaleeq font (242) and the word-by-word IndoPak script (59).
2. Email QUL/Tarteel and QuranWBW asking for permission to use them in a free, ad-free app with credit.
3. Run `npx create-expo-app@latest quran-app` and build the **single-page rendering spike**.

---

## Sources
- QUL mushaf layouts: https://qul.tarteel.ai/mushaf_layouts (ID 23 Taj 13-line, ID 17 Qudratullah 13-line)
- QUL Indopak Nastaleeq font: https://qul.tarteel.ai/resources/font/242
- IndoPak text and fonts: https://github.com/marwan/indopak-quran-text
- Requests for a 13-line IndoPak mushaf: https://feedback.quran.com/feature-requests/p/13-line-indopak-mushaf
- Taj 13-line, 848 pages: https://www.albalaghbooks.com/quran-and-tafseer/mushafs/plain-mushafs/mus-haf-13-lines-code-23-k/
- KFGQPC license: https://openhub.net/licenses/KFGQPC
- Tarteel on Quran rendering: https://tarteel.ai/blog/from-page-to-screen-rethinking-quran-rendering-for-the-digital-age/
- Open Mushaf Native (Expo, image-based): https://www.mintlify.com/adelpro/open-mushaf-native
- Quran Foundation font-rendering guide: https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/
