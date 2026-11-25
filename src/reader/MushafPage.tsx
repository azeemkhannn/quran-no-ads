import { memo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BISMILLAH_WORDS, SURAHS, lineKey, type Line, type Page, type WordPiece } from '../data/pages';
import { toArabicDigits } from '../data/meta';
import type { Theme } from '../theme';
import {
  FRAME_GAP, FRAME_INNER_BORDER, FRAME_OUTER_BORDER, FRAME_PAD_H, FRAME_PAD_V, FRAME_RADIUS,
  MIN_WORD_GAP_EM, PAGE_BOTTOM_GAP, PAGE_HEADER_H, type PageLayout,
} from './layout';
import { RTL_ROW, WordUnit } from './WordUnit';

// QuranWBW's AlQuranNeo v5.x font (IndoPak v5.4), used unmodified and ONLY for Quran text.
export const QURAN_FONT = 'AlQuranNeo';

type Props = { page: Page; layout: PageLayout; theme: Theme; bookmarked?: boolean };

function MushafPageImpl({ page, layout, theme, bookmarked }: Props) {
  const { fontSize, lineHeight, blockWidth, sidePad, pageWidth, pageHeight } = layout;
  const textStyle = [styles.quran, { fontSize, lineHeight, color: theme.ink }];
  const isOpening = page.page <= 2; // ornamental opening pages: shorter, vertically centered block

  const renderLine = (l: Line) => {
    const key = `${page.page}-${l.line}`;
    if (l.type === 'surah_name') {
      return <SurahHeader key={key} surah={l.surah ?? 1} height={lineHeight} fontSize={fontSize} theme={theme} />;
    }
    if (l.type === 'basmallah') {
      return (
        <View
          key={key}
          style={[styles.slot, { height: lineHeight, flexDirection: RTL_ROW, justifyContent: 'center', columnGap: fontSize * 0.3 }]}
        >
          {BISMILLAH_WORDS.map((w, i) => (
            <Text key={i} style={textStyle} allowFontScaling={false}>{w}</Text>
          ))}
        </View>
      );
    }
    return (
      <AyahLine
        key={key}
        id={lineKey(page.page, l.line)}
        words={l.words}
        centered={l.centered}
        fontSize={fontSize}
        lineHeight={lineHeight}
        presetScale={layout.lineScale[lineKey(page.page, l.line)]}
        color={theme.ink}
      />
    );
  };

  return (
    <View style={{ width: pageWidth, height: pageHeight, backgroundColor: theme.bg }}>
      <View style={[styles.sheet, { marginHorizontal: sidePad }]}>
        <View style={[styles.header, { height: PAGE_HEADER_H }]}>
          <Text style={[styles.label, styles.labelLeft, { color: theme.muted }]} allowFontScaling={false}>
            پارہ {toArabicDigits(page.juz)}
          </Text>
          <View
            style={[styles.pageBadge, { borderColor: theme.frame, backgroundColor: bookmarked ? theme.frame : theme.frameSoft }]}
            accessibilityLabel={bookmarked ? `Page ${page.page}, bookmarked` : `Page ${page.page}`}
          >
            {bookmarked && <Ionicons name="bookmark" size={11} color={theme.paper} />}
            <Text style={[styles.pageNumber, { color: bookmarked ? theme.paper : theme.frame }]} allowFontScaling={false}>
              {toArabicDigits(page.page)}
            </Text>
          </View>
          <Text style={[styles.label, styles.labelRight, { color: theme.muted }]} allowFontScaling={false}>
            سورۃ {SURAHS[page.surah - 1].nameAr}
          </Text>
        </View>

        <View style={[styles.frame, { borderColor: theme.frame, backgroundColor: theme.paper }]}>
          <View
            style={[
              styles.frameInner,
              { borderColor: theme.frame, justifyContent: isOpening ? 'center' : 'flex-start' },
            ]}
          >
            <View style={{ width: isOpening ? blockWidth * 0.72 : blockWidth, alignSelf: 'center' }}>
              {/* Faint ruled line between rows, as in a printed mushaf. Drawn behind the text and
                  inside each row's height, so it never moves a word. */}
              {page.lines.slice(1).map((l, i) => (
                <View
                  key={`rule-${l.line}`}
                  pointerEvents="none"
                  style={[styles.rule, { top: lineHeight * (i + 1), backgroundColor: theme.frame }]}
                />
              ))}
              {page.lines.map(renderLine)}
            </View>
          </View>
          <Ornament theme={theme} position="top" />
          <Ornament theme={theme} position="bottom" />
        </View>
      </View>
    </View>
  );
}

/** Small diamond with a dot, sitting on the middle of the frame's top or bottom border. */
function Ornament({ theme, position }: { theme: Theme; position: 'top' | 'bottom' }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.ornamentWrap, position === 'top' ? { top: -ORNAMENT / 2 - 1 } : { bottom: -ORNAMENT / 2 - 1 }]}
    >
      <View style={[styles.ornament, { borderColor: theme.frame, backgroundColor: theme.paper }]}>
        <View style={[styles.ornamentDot, { backgroundColor: theme.frame }]} />
      </View>
    </View>
  );
}

export const MushafPage = memo(MushafPageImpl);

// Shrink factors found at runtime, keyed by "fontSize|page:line", so a revisited page renders
// right the first time.
const fittedScale = new Map<string, number>();
// Lines already confirmed to fit at their current size. Revisited pages skip the per-word layout
// callbacks (~120 per page), which matters on low-end phones.
const fitConfirmed = new Set<string>();

/**
 * One justified ayah line. Safety net for the rare dense line the startup measurement missed:
 * if its words don't fit with at least MIN_WORD_GAP_EM between them, it shrinks just this line.
 */
function AyahLine({
  id, words, centered, fontSize, lineHeight, presetScale, color,
}: {
  id: string; words: WordPiece[]; centered: boolean; fontSize: number; lineHeight: number;
  presetScale: number | undefined; color: string;
}) {
  const cacheKey = `${fontSize}|${id}`;
  const [scale, setScale] = useState(() => fittedScale.get(cacheKey) ?? presetScale ?? 1);
  const needsCheck = !centered && !fitConfirmed.has(`${cacheKey}|${scale}`);
  const wordWidths = useRef<number[]>([]);
  const rowWidth = useRef(0);
  const fs = fontSize * scale;

  const check = () => {
    if (centered || !rowWidth.current) return;
    const ws = wordWidths.current;
    if (ws.length < words.length || ws.some((w) => w === undefined)) return;
    const need = ws.reduce((a, b) => a + b, 0) + fs * MIN_WORD_GAP_EM * (words.length - 1);
    if (need > rowWidth.current + 0.5) {
      const next = (scale * rowWidth.current) / need;
      fittedScale.set(cacheKey, next);
      wordWidths.current = [];
      setScale(next);
    } else {
      fitConfirmed.add(`${cacheKey}|${scale}`);
    }
  };

  const style = [styles.quran, { fontSize: fs, lineHeight, color }];
  return (
    <View
      style={[
        styles.slot,
        {
          height: lineHeight,
          flexDirection: RTL_ROW,
          justifyContent: centered ? 'center' : 'space-between',
          columnGap: centered ? fontSize * 0.35 : 0,
        },
      ]}
      onLayout={needsCheck ? (e) => {
        rowWidth.current = e.nativeEvent.layout.width;
        check();
      } : undefined}
    >
      {words.map((w, i) => (
        <WordUnit
          key={i}
          text={w.text}
          style={style}
          fontSize={fs}
          onLayout={!needsCheck ? undefined : (e) => {
            wordWidths.current[i] = e.nativeEvent.layout.width;
            check();
          }}
        />
      ))}
    </View>
  );
}

function SurahHeader({ surah, height, fontSize, theme }: { surah: number; height: number; fontSize: number; theme: Theme }) {
  const boxH = height * 0.8;
  return (
    <View style={[styles.slot, { height, justifyContent: 'center' }]}>
      <View style={[styles.surahBox, { height: boxH, borderRadius: boxH / 2, borderColor: theme.frame, backgroundColor: theme.frameSoft }]}>
        <View style={[styles.surahBoxInner, { borderRadius: boxH / 2 - 3, borderColor: theme.frame }]}>
          <View style={[styles.surahDot, { backgroundColor: theme.frame }]} />
          {/* The surah name is not Quran text, so it uses the phone's Arabic font, not the Quran font
              (QuranWBW's permission covers the Quran text only). One Text per word: on Android a
              Text with spaces can wrap a word onto a hidden line. */}
          <View style={{ flexDirection: RTL_ROW, columnGap: fontSize * 0.25 }}>
            {['سورۃ', ...SURAHS[surah - 1].nameAr.split(' ')].map((w, i) => (
              <Text
                key={i}
                style={[styles.surahName, { color: theme.ink, fontSize: fontSize * 0.62, lineHeight: boxH * 0.9 }]}
                allowFontScaling={false}
              >
                {w}
              </Text>
            ))}
          </View>
          <View style={[styles.surahDot, { backgroundColor: theme.frame }]} />
        </View>
      </View>
    </View>
  );
}

const ORNAMENT = 12;

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingBottom: PAGE_BOTTOM_GAP },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  frame: {
    flex: 1,
    borderWidth: FRAME_OUTER_BORDER,
    borderRadius: FRAME_RADIUS,
    padding: FRAME_GAP,
    // soft lift off the background
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  frameInner: {
    flex: 1,
    borderWidth: FRAME_INNER_BORDER,
    borderRadius: FRAME_RADIUS - FRAME_GAP - 1,
    paddingHorizontal: FRAME_PAD_H,
    paddingVertical: FRAME_PAD_V,
  },
  ornamentWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  ornament: {
    width: ORNAMENT, height: ORNAMENT, borderWidth: 1.5, transform: [{ rotate: '45deg' }],
    alignItems: 'center', justifyContent: 'center',
  },
  ornamentDot: { width: 4, height: 4, borderRadius: 2 },
  label: { flex: 1, fontSize: 13, fontWeight: '600' },
  labelLeft: { textAlign: 'left', writingDirection: 'ltr' },
  labelRight: { textAlign: 'right', writingDirection: 'ltr' },
  // No fixed height: the badge wraps the number, so it stays centered inside the border even if a
  // platform's Arabic-digit font has taller line metrics (iOS).
  pageBadge: {
    minWidth: 42, minHeight: 24, paddingHorizontal: 12, paddingVertical: 2, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3,
  },
  pageNumber: { fontSize: 13, fontWeight: '700', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  slot: { width: '100%', alignItems: 'center' },
  rule: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, opacity: 0.28 },
  quran: { fontFamily: QURAN_FONT, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  surahName: { fontWeight: '700', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  surahBox: { width: '100%', borderWidth: 1.5, padding: 2 },
  surahBoxInner: {
    flex: 1, borderWidth: StyleSheet.hairlineWidth * 2, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  surahDot: { width: 5, height: 5, borderRadius: 2.5, transform: [{ rotate: '45deg' }] },
});
