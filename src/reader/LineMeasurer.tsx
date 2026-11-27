import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { widestLineCandidates, type LineCandidate } from '../data/pages';
import { MEASURE_FONT_SIZE, MIN_WORD_GAP_EM } from './layout';
import { QURAN_FONT } from './MushafPage';
import { WordUnit } from './WordUnit';
import { storage } from '../store/storage';

// Measured once per device and saved: the result only depends on the font, the data and the phone's
// text engine, so later launches skip the measuring entirely (it is the slowest step on low-end
// phones). Bump MEASURE_VERSION whenever the font, the data or the word layout changes.
// On a new install it starts as soon as the font is loaded (while the welcome screens show), and runs
// in small batches so the phone never freezes; Home and the reader show a loading screen until done.
const MEASURE_VERSION = 'v4'; // v4: QuranWBW IndoPak v5.4 text and AlQuranNeo font
const STORAGE_KEY = `lineWidths:${MEASURE_VERSION}`;
/** Lines drawn per step. Small enough that each step takes a fraction of a second on a slow phone. */
const BATCH = 30;

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
/** Share of the lines measured so far, 0..1 (1 when done). */
let progress = cachedWidths ? 1 : 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Records setup progress; with the full result, saves it so later launches skip the setup. */
function report(share: number, result?: Record<string, number>) {
  progress = share;
  if (result) {
    cachedWidths = result;
    storage.set(STORAGE_KEY, JSON.stringify(result));
  }
  emit();
}

export const getMeasuredWidths = () => cachedWidths;
/** The measured line widths, or null while the first-launch setup is still running. */
export const useMeasuredWidths = () => useSyncExternalStore(subscribe, getMeasuredWidths, getMeasuredWidths);
/** Setup progress, 0..1. */
export const useMeasureProgress = () => useSyncExternalStore(subscribe, () => progress, () => progress);

/**
 * Mounted once at the app root. On a new install it measures the widest lines in small batches
 * (renders nothing visible), then saves the result; afterwards it renders nothing.
 */
export function SetupMeasurer() {
  const [lines] = useState<LineCandidate[]>(() => (cachedWidths ? [] : widestLineCandidates()));
  const [batch, setBatch] = useState(0);
  const [done, setDone] = useState(!!cachedWidths);
  const widths = useRef<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (done || !lines.length) return null;
  const start = batch * BATCH;
  const slice = lines.slice(start, start + BATCH);
  const end = start + slice.length;

  const onLine = (key: string, width: number) => {
    if (widths.current[key] !== undefined) return;
    widths.current[key] = width;
    const measured = Object.keys(widths.current).length;
    if (measured < end) return;
    if (measured >= lines.length) {
      setDone(true);
      report(1, { ...widths.current });
    } else {
      // A short pause between batches lets taps, scrolling and animations run.
      timer.current = setTimeout(() => setBatch((b) => b + 1), 16);
      report(measured / lines.length);
    }
  };

  return (
    <View style={styles.offscreen} pointerEvents="none">
      {slice.map(({ key, words }) => (
        <View key={key} style={styles.row} onLayout={(e) => onLine(key, e.nativeEvent.layout.width)}>
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
