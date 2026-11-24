// App state shared by the home screen and the reader, persisted on the device.
// Tiny hand-rolled store (useSyncExternalStore) instead of a state library: keeps the app light.
import { useSyncExternalStore } from 'react';
import { SURAHS, TOTAL_PAGES, surahAtPage } from '@/data/pages';
import type { ThemeName } from '@/theme';
import { storage } from './storage';

export type Bookmark = { page: number; createdAt: number };
/** A surah read outside the main reading (e.g. a daily Ya-Sin), and the page where it was left. */
export type Recent = { surah: number; page: number; at: number };

/**
 * How the reader was opened (decided automatically, see modeFor):
 * - 'continue': page turns move the Continue reading place (lastPage), as in a khatm.
 * - 'temporary': a surah/para/bookmark read on the side; the Continue reading place is left alone
 *   and the surah is remembered under "Recently read".
 */
export type ReadingMode = 'continue' | 'temporary';

export type ReminderTime = { hour: number; minute: number };
export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 5, minute: 0 };

/** "05:30" → { hour: 5, minute: 30 }; anything invalid → the default time. */
function parseTime(raw: string | null): ReminderTime {
  const m = raw?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return DEFAULT_REMINDER_TIME;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : DEFAULT_REMINDER_TIME;
}

type State = {
  /** The Continue reading place (saved on the device). */
  lastPage: number;
  /**
   * The current reader session (not saved): its mode, the page it opened on, and the surah being
   * read (several short surahs can share a page, so the opened one is remembered, not guessed).
   */
  session: { mode: ReadingMode; startPage: number; surah: number };
  theme: ThemeName;
  bookmarks: Bookmark[]; // newest first
  recents: Recent[]; // newest first
  /** Daily reading reminder: on, off, or null when it has never been offered (first launch). */
  reminder: boolean | null;
  /** Time of the daily reminder, 24-hour clock (default 5:00 AM). */
  reminderTime: ReminderTime;
  /** The welcome screens have been shown (they appear once, on a new install only). */
  welcomed: boolean;
};

const KEYS = {
  lastPage: 'lastPage', theme: 'theme', bookmarks: 'bookmarks', recents: 'recents', reminder: 'reminder', welcomed: 'welcomed',
  reminderTime: 'reminderTime',
} as const;
const MAX_RECENTS = 6;
const validPage = (p: unknown): p is number => Number.isInteger(p) && (p as number) >= 1 && (p as number) <= TOTAL_PAGES;

function loadList<T extends { page: number }>(key: string): T[] {
  try {
    const raw = JSON.parse(storage.get(key) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x) => validPage(x?.page)) : [];
  } catch {
    return []; // Corrupt value: start empty.
  }
}

/**
 * Welcome screens are for new installs only. Someone updating from an older version already has
 * saved data (a reading place, bookmarks, recents, a reminder choice or measured line widths), so they
 * count as welcomed and never see them.
 */
function loadWelcomed(): boolean {
  if (storage.get(KEYS.welcomed) === '1') return true;
  // Not the theme: it can be picked on the welcome screens themselves.
  const existingUser = [KEYS.lastPage, KEYS.bookmarks, KEYS.recents, KEYS.reminder, 'lineWidths:v3'].some(
    (k) => storage.get(k) !== null,
  );
  if (existingUser) storage.set(KEYS.welcomed, '1');
  return existingUser;
}

function load(): State {
  const page = Number(storage.get(KEYS.lastPage));
  const theme = storage.get(KEYS.theme);
  const reminder = storage.get(KEYS.reminder);
  const lastPage = validPage(page) ? page : 1;
  return {
    lastPage,
    session: { mode: 'continue', startPage: lastPage, surah: surahAtPage(lastPage).number },
    theme: theme === 'sepia' || theme === 'night' || theme === 'light' ? theme : 'light',
    bookmarks: loadList<Bookmark>(KEYS.bookmarks),
    recents: loadList<Recent>(KEYS.recents),
    reminder: reminder === 'on' ? true : reminder === 'off' ? false : null,
    reminderTime: parseTime(storage.get(KEYS.reminderTime)),
    welcomed: loadWelcomed(),
  };
}

let state: State = load();
const listeners = new Set<() => void>();

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let recentsTimer: ReturnType<typeof setTimeout> | undefined;

export const readerStore = {
  /**
   * How to open a page from Home, without asking:
   * - nothing read yet → 'continue' (the first thing you open becomes your place);
   * - the page is at your place (or just around it) → 'continue';
   * - anything else → 'temporary': your Continue reading place is kept safe.
   */
  modeFor(page: number): ReadingMode {
    const { lastPage } = state;
    if (lastPage === 1) return 'continue';
    if (page >= lastPage - 1 && page <= lastPage + 2) return 'continue';
    return 'temporary';
  },
  /** Remember the page being read (saved after a short pause so fast swiping doesn't write each page). */
  setLastPage(page: number) {
    if (page === state.lastPage) return;
    update({ lastPage: page });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storage.set(KEYS.lastPage, String(page)), 400);
  },
  /** Remember where a side reading stopped, under its surah (one entry per surah). */
  recordRecent(page: number) {
    // Keep the surah being read while the page is still within it; otherwise use the page's surah.
    const cur = state.session.surah;
    const end = cur < 114 ? SURAHS[cur].startPage : TOTAL_PAGES; // next surah's first page
    const surah = page >= SURAHS[cur - 1].startPage && page <= end ? cur : surahAtPage(page).number;
    if (surah !== cur) update({ session: { ...state.session, surah } });
    const recents = [{ surah, page, at: Date.now() }, ...state.recents.filter((r) => r.surah !== surah)].slice(0, MAX_RECENTS);
    update({ recents });
    clearTimeout(recentsTimer);
    recentsTimer = setTimeout(() => storage.set(KEYS.recents, JSON.stringify(state.recents)), 400);
  },
  removeRecent(surah: number) {
    const recents = state.recents.filter((r) => r.surah !== surah);
    update({ recents });
    storage.set(KEYS.recents, JSON.stringify(recents));
  },
  setTheme(theme: ThemeName) {
    update({ theme });
    storage.set(KEYS.theme, theme);
  },
  /** The welcome screens were completed: never show them automatically again. */
  finishWelcome() {
    update({ welcomed: true });
    storage.set(KEYS.welcomed, '1');
  },
  /** Only records the time; rescheduling is done by src/reminder. */
  setReminderTime(time: ReminderTime) {
    update({ reminderTime: time });
    storage.set(KEYS.reminderTime, `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`);
  },
  /** Only records the choice; scheduling is done by src/reminder. */
  setReminder(on: boolean) {
    update({ reminder: on });
    storage.set(KEYS.reminder, on ? 'on' : 'off');
  },
  toggleBookmark(page: number) {
    const exists = state.bookmarks.some((b) => b.page === page);
    const bookmarks = exists
      ? state.bookmarks.filter((b) => b.page !== page)
      : [{ page, createdAt: Date.now() }, ...state.bookmarks];
    update({ bookmarks });
    storage.set(KEYS.bookmarks, JSON.stringify(bookmarks));
  },
  removeBookmark(page: number) {
    const bookmarks = state.bookmarks.filter((b) => b.page !== page);
    update({ bookmarks });
    storage.set(KEYS.bookmarks, JSON.stringify(bookmarks));
  },
  /**
   * Start a reader session at a page; the mode decides whether page turns move the Continue place.
   * `surah` is given when a surah was opened from the list (it may share its page with others).
   */
  openPage(page: number, mode: ReadingMode = readerStore.modeFor(page), surah = surahAtPage(page).number) {
    update({ session: { mode, startPage: page, surah } });
    if (mode === 'continue') readerStore.saveHere(page);
    else readerStore.recordRecent(page);
  },
  /** Make this page the Continue reading place, and keep following page turns from now on. */
  saveHere(page: number) {
    clearTimeout(saveTimer);
    update({ lastPage: page, session: { ...state.session, mode: 'continue' } });
    storage.set(KEYS.lastPage, String(page));
  },
  getState: () => state,
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const noSubscribe = () => () => {};

/**
 * Reads from the store and re-renders when the selected value changes.
 * Pass live = false to stop listening (e.g. Home while it is hidden behind the reader, so page turns
 * don't redraw it); it catches up as soon as live is true again.
 */
export function useReaderStore<T>(select: (s: State) => T, live = true): T {
  return useSyncExternalStore(live ? subscribe : noSubscribe, () => select(state), () => select(state));
}
