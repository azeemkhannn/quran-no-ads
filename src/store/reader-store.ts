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
};

const KEYS = { lastPage: 'lastPage', theme: 'theme', bookmarks: 'bookmarks', recents: 'recents' } as const;
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

function load(): State {
  const page = Number(storage.get(KEYS.lastPage));
  const theme = storage.get(KEYS.theme);
  const lastPage = validPage(page) ? page : 1;
  return {
    lastPage,
    session: { mode: 'continue', startPage: lastPage, surah: surahAtPage(lastPage).number },
    theme: theme === 'sepia' || theme === 'night' || theme === 'light' ? theme : 'light',
    bookmarks: loadList<Bookmark>(KEYS.bookmarks),
    recents: loadList<Recent>(KEYS.recents),
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

export function useReaderStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}
