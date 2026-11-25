// Play Store / App Store rating pop-up (the store's own in-app review sheet).
// Asked only after real use, never on first launch and never in the middle of reading:
// when you come back to Home after your 4th reading of a few pages or more. At most twice,
// two months apart. The store itself may also decide not to show it (it has its own limits).
import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { storage } from '@/store/storage';

const PACKAGE = 'com.azeestudio.qurannoads';
const KEY_SESSIONS = 'review:sessions';
const KEY_ASKED = 'review:asked'; // "count:timestamp"

const SESSIONS_BEFORE_ASK = 4;
const MIN_PAGES = 3; // a session counts when at least this many pages were seen
const MAX_ASKS = 2;
const RETRY_AFTER_MS = 60 * 24 * 60 * 60 * 1000;
const DELAY_MS = 900; // let the Home screen settle after leaving the reader

function readAsked(): { count: number; at: number } {
  const [count, at] = (storage.get(KEY_ASKED) ?? '0:0').split(':').map(Number);
  return { count: count || 0, at: at || 0 };
}

/** Called when the reader closes, with how many pages were seen in that session. */
export function noteReadingSession(pagesSeen: number) {
  if (pagesSeen < MIN_PAGES) return;
  const sessions = Number(storage.get(KEY_SESSIONS) ?? '0') + 1;
  storage.set(KEY_SESSIONS, String(sessions));

  const asked = readAsked();
  if (sessions < SESSIONS_BEFORE_ASK || asked.count >= MAX_ASKS) return;
  if (asked.count > 0 && Date.now() - asked.at < RETRY_AFTER_MS) return;

  setTimeout(async () => {
    try {
      if (!(await StoreReview.hasAction())) return;
      storage.set(KEY_ASKED, `${asked.count + 1}:${Date.now()}`);
      await StoreReview.requestReview();
    } catch {
      // A rating prompt must never break the app.
    }
  }, DELAY_MS);
}

/** The "Rate this app" button: opens the app's store page, where a rating can always be left. */
export async function openStorePage() {
  const url =
    StoreReview.storeUrl() ??
    (Platform.OS === 'android' ? `market://details?id=${PACKAGE}` : `https://play.google.com/store/apps/details?id=${PACKAGE}`);
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE}`).catch(() => {});
  }
}

/** Whether a "Rate this app" button makes sense here (Android only until there is an App Store listing). */
export const RATE_SUPPORTED = Platform.OS === 'android';
