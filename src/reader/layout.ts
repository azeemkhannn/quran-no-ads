// Pure layout maths for a 13-line mushaf page. No React here so it is easy to tune and test.

export const LINES_PER_PAGE = 13;
/** Font size used when measuring natural line widths. */
export const MEASURE_FONT_SIZE = 40;
/** Smallest gap between words on a full line, as a fraction of the font size. */
export const MIN_WORD_GAP_EM = 0.18;
/**
 * The base font size makes the Nth-widest line of the mushaf just fit; FONT_BOOST then enlarges
 * it. Lines that no longer fit at the boosted size (mostly dense lines in Juz Amma) get a slightly
 * smaller font, like a calligrapher compressing a crowded line.
 */
const BASE_LINE_RANK = 40;
const FONT_BOOST = 1.05;
/**
 * Words ending in a Quranic annotation sign (waqf marks such as ۚ ۙ ؕ ۪, U+0615 and U+06D6–U+06ED).
 * The font draws these signs up to 0.6 em to the left of the word's box (measured with canvas ink
 * bounds). iOS and web draw outside the box, but Android clips text to its box, so the sign would
 * vanish. These words therefore get SIGN_PAD_EM of padding on their left, inside the box.
 */
// iOS only (Android/web use joiner spaces, see pages.ts): marks standing after a space ("word ۪"), or
// a waqf/annotation sign attached at the end ("عَاصِمٍۚ"). Ordinary letter marks at the end of a word
// (e.g. small madda U+06E4) don't count.
export const TRAILING_SIGN =
  /(?: [ؐ-ًؚ-ٟۖ-ۭ]+|[ؔؕؗۖ-۪ۜ-۬][ً-ٟۖ-ۭ]*)$/;
export const SIGN_PAD_EM = 0.65;

/** Max glyph size relative to the line slot height (Nastaleeq has tall ascenders/descenders). */
const FONT_TO_LINE_HEIGHT = 0.6;

// ---- Page chrome (keep in sync with MushafPage styles) ----
export const PAGE_HEADER_H = 34; // para · page number · surah, above the frame
export const PAGE_BOTTOM_GAP = 8; // space below the frame (room for the bottom ornament)
export const FRAME_OUTER_BORDER = 2;
export const FRAME_GAP = 2; // space between the outer and inner border
export const FRAME_INNER_BORDER = 1;
/** Padding inside the inner border: room for Nastaleeq swashes and the rounded corners. */
export const FRAME_PAD_H = 5;
export const FRAME_PAD_V = 8;
export const FRAME_RADIUS = 18;
const FRAME_H = FRAME_OUTER_BORDER + FRAME_GAP + FRAME_INNER_BORDER + FRAME_PAD_H;
const FRAME_V = FRAME_OUTER_BORDER + FRAME_GAP + FRAME_INNER_BORDER + FRAME_PAD_V;

export type PageLayout = {
  fontSize: number;
  lineHeight: number;
  /** Width the justified text block occupies (centered in the page). */
  blockWidth: number;
  /** Horizontal margin outside the page frame, on each side. */
  sidePad: number;
  pageWidth: number;
  pageHeight: number;
  /** Font-size multiplier (< 1) for measured lines that are too wide at fontSize, keyed by "page:line". */
  lineScale: Record<string, number>;
};

/**
 * @param widths natural widths of the widest candidate lines at MEASURE_FONT_SIZE, keyed by "page:line"
 */
export function computeLayout(width: number, height: number, widths: Record<string, number>): PageLayout {
  const sidePad = Math.max(4, Math.round(width * 0.01));
  const innerW = width - sidePad * 2 - FRAME_H * 2;
  const innerH = height - PAGE_HEADER_H - PAGE_BOTTOM_GAP - FRAME_V * 2;
  const lineHeight = Math.floor(innerH / LINES_PER_PAGE);

  const sorted = Object.values(widths).sort((a, b) => b - a);
  const baseNatural = sorted[Math.min(BASE_LINE_RANK, sorted.length) - 1];

  // 2% safety margin: Nastaleeq strokes overhang their advance width at line ends.
  const avail = innerW * 0.98;
  const byWidth = ((MEASURE_FONT_SIZE * avail) / baseNatural) * FONT_BOOST;
  const byHeight = lineHeight * FONT_TO_LINE_HEIGHT;
  const fontSize = Math.floor(Math.min(byWidth, byHeight) * 10) / 10;

  const lineScale: Record<string, number> = {};
  for (const [key, w] of Object.entries(widths)) {
    const px = (w * fontSize) / MEASURE_FONT_SIZE;
    if (px > avail) lineScale[key] = avail / px;
  }

  // When height is the limit (wide screens / tablets) keep the printed proportions:
  // the text block shrinks to the natural width instead of stretching word gaps.
  const blockWidth = Math.min(innerW, Math.ceil((baseNatural * fontSize) / MEASURE_FONT_SIZE / 0.98) + 2);

  return { fontSize, lineHeight, blockWidth, sidePad, pageWidth: width, pageHeight: height, lineScale };
}
