// Page data access over assets/data/quran.json: the QUL 13-line layout (scripts/build_data.py) with the
// QuranWBW IndoPak v5.4 text (scripts/apply_quranwbw.py).
//
// quran.json format (compact arrays to keep the bundle small):
//   lines:    [page, line, type(0 ayah | 1 surah_name | 2 basmallah), centered(0|1), surah, firstWordId, lastWordId][]
//   wordText: string[]   index = wordId - 1
//   wordLoc:  number[]   surah*1e6 + ayah*1e3 + position, index = wordId - 1
//   surahs:   [nameArabic, nameSimple, ayahCount, revelationPlace, startPage][]   index = surah - 1
//   juz:      [surah, ayah, startPage, firstWordText][]                          index = juz - 1
import raw from '../../assets/data/quran.json';

/** One unit on a line: a word (with its waqf signs) or an ayah-number marker. */
export type Word = { text: string; s: number; a: number; p: number; end: boolean };
export type LineType = 'ayah' | 'surah_name' | 'basmallah';
export type Line = { line: number; type: LineType; centered: boolean; surah: number | null; words: Word[] };
export type Page = { page: number; lines: Line[]; juz: number; surah: number };
export type SurahInfo = { number: number; nameAr: string; name: string; ayahs: number; place: string; startPage: number };
export type JuzInfo = { number: number; surah: number; ayah: number; startPage: number; firstWord: string };

type RawLine = [number, number, number, number, number, number, number];
type QuranData = {
  pages: number;
  linesPerPage: number;
  lines: RawLine[];
  wordText: string[];
  wordLoc: number[];
  surahs: [string, string, number, string, number][];
  juz: [number, number, number, string][];
};

const data = raw as unknown as QuranData;
const TYPES: LineType[] = ['ayah', 'surah_name', 'basmallah'];

export const TOTAL_PAGES = data.pages;

export const SURAHS: SurahInfo[] = data.surahs.map(([nameAr, name, ayahs, place, startPage], i) => ({
  number: i + 1, nameAr, name, ayahs, place, startPage,
}));

export const JUZ: JuzInfo[] = data.juz.map(([surah, ayah, startPage, firstWord], i) => ({
  number: i + 1, surah, ayah, startPage, firstWord,
}));

// Index of the first raw line for each page (lines are sorted by page, then line).
const pageStart: number[] = new Array(TOTAL_PAGES + 2).fill(-1);
data.lines.forEach((l, i) => {
  if (pageStart[l[0]] === -1) pageStart[l[0]] = i;
});
pageStart[TOTAL_PAGES + 1] = data.lines.length;

/**
 * The text is QuranWBW's IndoPak v5.4, shown exactly as published: QuranWBW gave permission to use the
 * font and text only WITHOUT any modification. v5.4 was made for React Native: waqf signs and ayah
 * markers are single glyphs of the AlQuranNeo font attached to their word, so Android and iOS render
 * them correctly with no tricks. Each word and each ayah marker is drawn as its own unit.
 */
function wordAt(id: number): Word {
  const loc = data.wordLoc[id - 1];
  const s = Math.floor(loc / 1_000_000);
  const a = Math.floor((loc % 1_000_000) / 1000);
  const p = loc % 1000;
  // The ayah marker is the last entry of an ayah: the next word id starts a new ayah.
  const next = data.wordLoc[id];
  const end = next === undefined || Math.floor(next / 1000) !== Math.floor(loc / 1000);
  return { text: data.wordText[id - 1], s, a, p, end };
}

function lineWords(first: number, last: number): Word[] {
  const out: Word[] = [];
  for (let id = first; id <= last; id++) out.push(wordAt(id));
  return out;
}

/**
 * The surah a reader of this page is in: the latest one that has started by this page. (The page
 * header follows print and names the surah of the page's first line, which can be the previous one.)
 */
export function surahAtPage(page: number): SurahInfo {
  let found = SURAHS[0];
  for (const s of SURAHS) {
    if (s.startPage <= page) found = s;
    else break;
  }
  return found;
}

export function juzOf(surah: number, ayah: number): number {
  let juz = 1;
  for (const j of JUZ) {
    if (surah > j.surah || (surah === j.surah && ayah >= j.ayah)) juz = j.number;
    else break;
  }
  return juz;
}

const cache = new Map<number, Page>();

/** Builds one page on demand (cheap: ~13 lines, ~100 words) and keeps it cached. */
export function getPage(page: number): Page {
  const hit = cache.get(page);
  if (hit) return hit;
  const lines: Line[] = [];
  for (let i = pageStart[page]; i < pageStart[page + 1] && i >= 0; i++) {
    const [, line, type, centered, surah, first, last] = data.lines[i];
    lines.push({
      line,
      type: TYPES[type],
      centered: centered === 1,
      surah: surah || null,
      words: type === 0 ? lineWords(first, last) : [],
    });
  }
  const firstWord = lines.flatMap((l) => l.words)[0];
  const headerSurah = lines.find((l) => l.type === 'surah_name')?.surah;
  const result: Page = {
    page,
    lines,
    juz: firstWord ? juzOf(firstWord.s, firstWord.a) : 1,
    surah: firstWord?.s ?? headerSurah ?? 1,
  };
  cache.set(page, result);
  return result;
}

export const PAGE_NUMBERS: number[] = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

/**
 * Bismillah words = Al-Fatiha 1:1 without its ayah-end marker. Drawn word by word: on Android a
 * single Text with spaces can wrap its last word onto a hidden second line.
 */
export const BISMILLAH_WORDS: string[] = (() => {
  const out: string[] = [];
  for (let id = 1; ; id++) {
    const w = wordAt(id);
    if (w.a !== 1 || w.end) break;
    out.push(w.text);
  }
  return out;
})();

/** A word as drawn. */
export type WordPiece = { text: string };

/**
 * The longest ayah lines of the whole mushaf, for measuring once per device.
 * Measuring all ~10,700 lines would be slow, so pick candidates by length: count of base
 * letters (diacritics excluded) plus word gaps. The widest of these sets the font size.
 */
export type LineCandidate = { key: string; words: WordPiece[] };

export const lineKey = (page: number, line: number) => `${page}:${line}`;

export function widestLineCandidates(count = 500): LineCandidate[] {
  const scored: { key: string; words: WordPiece[]; score: number }[] = [];
  for (const [page, line, type, centered, , first, last] of data.lines) {
    if (type !== 0 || centered) continue;
    const words: WordPiece[] = lineWords(first, last).map(({ text }) => ({ text }));
    const base = words
      .map((w) => w.text)
      .join('')
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ\s]/g, '').length;
    // Waqf signs and ayah markers are private-use glyphs of the font; they take extra room.
    const signs = words.filter((w) => /[-]/.test(w.text)).length;
    scored.push({ key: lineKey(page, line), words, score: base + words.length * 0.5 + signs * 1.3 });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, count).map(({ key, words }) => ({ key, words }));
}

// ---------- Integrity check (shown on the About page) ----------

export type Check = { label: string; detail: string; ok: boolean };

/**
 * Re-checks the bundled Quran data on this device (same checks as scripts/build_data.py):
 * every word present once and in order, 6,236 ayahs, 114 surahs with the right ayah counts, etc.
 * Pure counting over the bundled arrays (~85k words), a few milliseconds.
 */
export function verifyQuranData(): Check[] {
  const checks: Check[] = [];
  const add = (label: string, ok: boolean, detail: string) => checks.push({ label, ok, detail });

  // Pages: 1..847, none empty, at most 13 lines each.
  let pagesOk = true;
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const n = pageStart[p + 1] - pageStart[p];
    if (pageStart[p] < 0 || n < 1 || n > data.linesPerPage) pagesOk = false;
  }
  add('Pages', pagesOk && TOTAL_PAGES === 847, `${TOTAL_PAGES} pages, up to ${data.linesPerPage} lines each`);

  // Words: the ayah lines cover word 1..N exactly once, in order.
  let expected = 1;
  let wordsOk = true;
  let headers = 0;
  let lastHeader = 0;
  const bismillahAfter = new Set<number>(); // surahs whose header is followed by a Bismillah line
  for (const [, , type, , surah, first, last] of data.lines) {
    if (type === 1) {
      headers++;
      lastHeader = surah;
    }
    if (type === 2) bismillahAfter.add(lastHeader);
    if (type !== 0) continue;
    if (first !== expected || last < first) wordsOk = false;
    expected = last + 1;
  }
  const totalWords = data.wordText.length;
  add('Words', wordsOk && expected === totalWords + 1, `${totalWords.toLocaleString('en')} words, each once and in order`);

  // Ayahs and surahs: count from the words themselves and compare with the surah list.
  const maxAyah = new Array(115).fill(0);
  let ayahs = 0;
  let prevKey = -1;
  for (const loc of data.wordLoc) {
    const key = Math.floor(loc / 1000);
    if (key !== prevKey) {
      ayahs++;
      prevKey = key;
    }
    const s = Math.floor(loc / 1_000_000);
    maxAyah[s] = Math.max(maxAyah[s], Math.floor((loc % 1_000_000) / 1000));
  }
  add('Ayahs', ayahs === 6236, `${ayahs.toLocaleString('en')} ayahs`);
  const countsOk = SURAHS.length === 114 && SURAHS.every((s) => maxAyah[s.number] === s.ayahs);
  add('Surahs', countsOk && headers === 114, `114 surahs, each with its full ayah count`);
  // Every surah begins with Bismillah except At-Tawbah (9). In Al-Fatihah it is ayah 1 itself, so it is
  // part of the text rather than a separate line; all other surahs get their own Bismillah line.
  const fatihaOpensWithIt = BISMILLAH_WORDS.length === 4 && wordAt(1).s === 1 && wordAt(1).a === 1;
  const othersOk = SURAHS.every((sr) => sr.number === 1 || (sr.number === 9 ? !bismillahAfter.has(9) : bismillahAfter.has(sr.number)));
  add('Bismillah', fatihaOpensWithIt && othersOk, '113 surahs begin with Bismillah (in Al-Fatihah it is ayah 1); only At-Tawbah has none');

  // Paras: 30, in page order.
  const parasOk = JUZ.length === 30 && JUZ.every((j, i) => i === 0 || j.startPage >= JUZ[i - 1].startPage);
  add('Paras', parasOk, '30 paras in order');
  return checks;
}
