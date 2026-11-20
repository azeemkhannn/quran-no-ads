import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { widestLineCandidates, type LineCandidate } from '../data/pages';
import { MEASURE_FONT_SIZE, MIN_WORD_GAP_EM } from './layout';
import { QURAN_FONT } from './MushafPage';
import { WordUnit } from './WordUnit';
import { storage } from '../store/storage';

// Measured once per device and saved: the result only depends on the font, the data and the phone's
// text engine, so later launches skip the measuring entirely (it is the slowest step on low-end
// phones). Bump MEASURE_VERSION whenever the font, the data or the word layout changes.
// The home screen measures in the background on first launch, so the reader still opens instantly.
const MEASURE_VERSION = 'v3';
const STORAGE_KEY = `lineWidths:${MEASURE_VERSION}`;

function loadSaved(): Record<string, number> | null {
  try {
    const raw = storage.get(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

let cachedWidths: Record<string, number> | null = loadSaved();
export const getMeasuredWidths = () => cachedWidths;

/** Measures in the background (renders nothing visible) unless already measured this run. */
export function BackgroundMeasurer({ onMeasured }: { onMeasured?: (w: Record<string, number>) => void }) {
  const [lines] = useState(() => (cachedWidths ? [] : widestLineCandidates()));
  const [done, setDone] = useState(!!cachedWidths);
  if (done) return null;
  return (
    <LineMeasurer
      lines={lines}
      onMeasured={(w) => {
        cachedWidths = w;
        storage.set(STORAGE_KEY, JSON.stringify(w));
        setDone(true);
        onMeasured?.(w);
      }}
    />
  );
}

/**
 * Renders the longest ayah lines off-screen once, word by word exactly like the page does (same
 * WordUnit), with only the minimum word gap, and reports each line's natural width at MEASURE_FONT_SIZE.
 */
export function LineMeasurer({
  lines,
  onMeasured,
}: {
  lines: LineCandidate[];
  onMeasured: (widths: Record<string, number>) => void;
}) {
  const widths = useRef<Record<string, number>>({});
  const done = useRef(false);

  return (
    <View style={styles.offscreen} pointerEvents="none">
      {lines.map(({ key, words }) => (
        <View
          key={key}
          style={styles.row}
          onLayout={(e) => {
            if (done.current) return;
            widths.current[key] = e.nativeEvent.layout.width;
            if (Object.keys(widths.current).length >= lines.length) {
              done.current = true;
              onMeasured({ ...widths.current });
            }
          }}
        >
          {words.map((w, j) => (
            <WordUnit key={j} text={w.text} style={styles.text} fontSize={MEASURE_FONT_SIZE} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -100000, top: 0, width: 100000, opacity: 0 },
  row: { alignSelf: 'flex-start', flexDirection: 'row', columnGap: MEASURE_FONT_SIZE * MIN_WORD_GAP_EM },
  text: { fontFamily: QURAN_FONT, fontSize: MEASURE_FONT_SIZE, includeFontPadding: false },
});
