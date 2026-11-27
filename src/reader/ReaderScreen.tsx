import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGE_NUMBERS, TOTAL_PAGES, getPage } from '@/data/pages';
import { AppLoading } from '@/loading/AppLoading';
import { ThemeButton } from '@/ui/ThemeButton';
import { noteReadingSession } from '@/review/review';
import { readerStore, useReaderStore } from '@/store/reader-store';
import { THEMES, type Theme } from '@/theme';
import { computeLayout } from './layout';
import { GoToPageDialog } from './GoToPageDialog';
import { useMeasureProgress, useMeasuredWidths } from './LineMeasurer';
import { MushafPage } from './MushafPage';
import { PagePager, type PagerHandle } from './PagePager';

const TOOLBAR_H = 60;
const STATUS_H = 34;
// iOS turns pages with a small five-page pager: a FlatList of all pages opened on a far page could show
// a blank page there (see PagePager). Android and web keep the FlatList, which works well there.
const USE_PAGER = Platform.OS === 'ios';
/** Next/Previous buttons: web only. On phones pages are turned by swiping. */
const SHOW_ARROWS = Platform.OS === 'web';

/** Back to the home page (or straight to it when the reader was opened from a link). */
function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ReaderScreen() {
  const themeName = useReaderStore((s) => s.theme);
  const bookmarks = useReaderStore((s) => s.bookmarks);
  const mode = useReaderStore((s) => s.session.mode);
  const lastPage = useReaderStore((s) => s.lastPage);
  const theme = THEMES[themeName];
  // Only 'continue' sessions move the Continue reading place; side readings ('temporary') update
  // their "Recently read" entry instead. The app picks the mode (readerStore.modeFor).
  const tracks = useRef(mode === 'continue');
  useEffect(() => {
    tracks.current = mode === 'continue';
  }, [mode]);

  const lineWidths = useMeasuredWidths();
  const setupProgress = useMeasureProgress();
  // Opens on the page chosen on Home (the Continue reading place, or a surah/para/bookmark).
  const [index, setIndex] = useState(() => readerStore.getState().session.startPage - 1);
  const [goToOpen, setGoToOpen] = useState(false);
  // Size of the area the pages actually get, measured on screen. Using the window size instead
  // breaks on Android (edge-to-edge system bars, fractional widths make paging drift).
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const listRef = useRef<FlatList<number>>(null);
  const insets = useSafeAreaInsets();
  // The screen stays on while the reader is open (reading takes longer than the phone's sleep
  // timer). Leaving the reader, or closing the app, lets the phone sleep normally again.
  useKeepAwake('reader', { suppressDeactivateWarnings: true });
  const pagerRef = useRef<PagerHandle>(null);
  // Pages seen in this session; on leaving, a real reading counts toward the rating pop-up.
  const seenPages = useRef(new Set([index]));
  useEffect(() => () => noteReadingSession(seenPages.current.size), []);
  // Latest page index, for callbacks (refs can't be read during render).
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const layout = useMemo(
    () => (lineWidths && area ? computeLayout(area.w, area.h, lineWidths) : null),
    [area, lineWidths],
  );
  const bookmarked = useMemo(() => new Set(bookmarks.map((b) => b.page)), [bookmarks]);
  // Stable object: a new array on every render would make the list re-render its pages on each page turn.
  const extraData = useMemo(() => ({ theme, bookmarked }), [theme, bookmarked]);
  const page = index + 1;
  const isBookmarked = bookmarked.has(page);

  /** Shows page i and saves it (as the Continue reading place, or as a Recently read entry). */
  const changeIndex = useCallback((i: number) => {
    seenPages.current.add(i);
    setIndex(i);
    if (tracks.current) readerStore.setLastPage(i + 1);
    else readerStore.recordRecent(i + 1);
  }, []);

  // Created once: FlatList does not allow this callback to change.
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) changeIndex(first.index);
  });

  const goTo = useCallback(
    (i: number, animated = true) => {
      const next = Math.max(0, Math.min(TOTAL_PAGES - 1, i));
      if (USE_PAGER) {
        const d = next - indexRef.current;
        if (animated && (d === 1 || d === -1)) pagerRef.current?.turn(d);
        else changeIndex(next);
        return;
      }
      listRef.current?.scrollToIndex({ index: next, animated });
      changeIndex(next);
    },
    [changeIndex],
  );


  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={theme.statusBar} />

      <View
        style={styles.pages}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          const w = Math.floor(width);
          const h = Math.floor(height);
          setArea((a) => (a && a.w === w && a.h === h ? a : { w, h }));
        }}
      >
        {layout && USE_PAGER ? (
          <PagePager
            ref={pagerRef}
            index={index}
            count={TOTAL_PAGES}
            pageWidth={layout.pageWidth}
            onIndexChange={changeIndex}
            renderPage={(i) => (
              <MushafPage page={getPage(i + 1)} layout={layout} theme={theme} bookmarked={bookmarked.has(i + 1)} />
            )}
          />
        ) : layout ? (
          <FlatList
            ref={listRef}
            data={PAGE_NUMBERS}
            keyExtractor={(p) => String(p)}
            renderItem={({ item }) => (
              <MushafPage page={getPage(item)} layout={layout} theme={theme} bookmarked={bookmarked.has(item)} />
            )}
            extraData={extraData}
            horizontal
            inverted // page 1 on the right; swipe right to turn forward, like a printed mushaf
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: layout.pageWidth, offset: layout.pageWidth * i, index: i })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          />
        ) : (
          // First open only: the line widths are measured once, then saved on the phone.
          <AppLoading
            label="Preparing pages"
            note={lineWidths ? undefined : 'Please wait, this happens only once.'}
            progress={lineWidths ? undefined : setupProgress}
            colors={{ bg: theme.bg, accent: theme.frame, text: theme.muted }}
          />
        )}
      </View>

      <StatusLine
        theme={theme}
        temporary={mode === 'temporary'}
        page={page}
        lastPage={lastPage}
        onSaveHere={() => readerStore.saveHere(page)}
      />

      {/* Bottom toolbar: home + bookmark | page navigation | theme */}
      <View style={[styles.toolbar, { height: TOOLBAR_H }]}>
        <View style={styles.group}>
          <RoundButton icon="home-outline" label="Home: surahs, paras and bookmarks" onPress={goHome} theme={theme} />
          <RoundButton
            icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            label={isBookmarked ? `Remove bookmark from page ${page}` : `Bookmark page ${page}`}
            onPress={() => readerStore.toggleBookmark(page)}
            theme={theme}
            active={isBookmarked}
          />
        </View>

        <View style={styles.middle}>
          {/* Phones turn pages by swiping, so the arrows are only shown on web (mouse and keyboard).
              Next page is on the left in an Arabic book. */}
          {SHOW_ARROWS && (
            <RoundButton icon="chevron-back" label="Next page" onPress={() => goTo(index + 1)} disabled={index >= TOTAL_PAGES - 1} theme={theme} solid />
          )}
          <Pressable
            onPress={() => setGoToOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Page ${page} of ${TOTAL_PAGES}. Tap to go to a page`}
            style={({ pressed }) => [styles.pill, { backgroundColor: theme.frameSoft, borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.pillIcon, { backgroundColor: theme.frame }]}>
              <Ionicons name="book-outline" size={14} color={theme.paper} />
            </View>
            <Text style={styles.pillLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.3}>
              <Text style={[styles.pillPage, { color: theme.frame }]}>{page}</Text>
              <Text style={[styles.pillTotal, { color: theme.muted }]}> / {TOTAL_PAGES}</Text>
            </Text>
            {/* Hint that tapping opens Go to page (no room for it beside the web arrows). */}
            {!SHOW_ARROWS && <Ionicons name="search" size={16} color={theme.frame} />}
          </Pressable>
          {SHOW_ARROWS && (
            <RoundButton icon="chevron-forward" label="Previous page" onPress={() => goTo(index - 1)} disabled={index <= 0} theme={theme} solid />
          )}
        </View>

        <ThemeButton theme={theme} />
      </View>

      <GoToPageDialog
        visible={goToOpen}
        current={page}
        total={TOTAL_PAGES}
        theme={theme}
        onClose={() => setGoToOpen(false)}
        onGo={(n) => goTo(n - 1, false)}
      />
    </View>
  );
}

/**
 * Slim line above the toolbar (always the same height, so the page layout never jumps):
 * - side reading: says the Continue reading place is kept, with a Move here button;
 * - otherwise: overall progress, since every page turn is saved as the Continue reading place.
 */
function StatusLine({
  theme, temporary, page, lastPage, onSaveHere,
}: {
  theme: Theme; temporary: boolean; page: number; lastPage: number; onSaveHere: () => void;
}) {
  if (temporary) {
    return (
      <View style={styles.status}>
        <View style={[styles.tempChip, { backgroundColor: theme.frameSoft, borderColor: theme.frame }]}>
          <Ionicons name="flag-outline" size={15} color={theme.frame} />
          <Text style={[styles.tempText, { color: theme.ink }]} numberOfLines={1}>
            Your place stays on page {lastPage}
          </Text>
          <Pressable
            onPress={onSaveHere}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Move your Continue reading place to page ${page}`}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.frame, opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={[styles.saveText, { color: theme.paper }]}>Move here</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  const pct = Math.round((page / TOTAL_PAGES) * 100);
  return (
    <View style={styles.status} accessibilityLabel={`Continue reading saved at page ${page}, ${pct} percent of the Quran`}>
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.frameSoft }]}>
          <View style={[styles.progressFill, { width: `${Math.max(1, (page / TOTAL_PAGES) * 100)}%`, backgroundColor: theme.frame }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.muted }]}>{pct}%</Text>
      </View>
    </View>
  );
}

function RoundButton({
  icon, label, onPress, disabled, theme, solid, active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: Theme;
  /** Filled (primary) style, used for page turning. */
  solid?: boolean;
  /** Highlighted state, e.g. the current page is bookmarked. */
  active?: boolean;
}) {
  const filled = solid || active;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.round,
        filled
          ? { backgroundColor: theme.frame }
          : { backgroundColor: theme.frameSoft, borderColor: theme.frame, borderWidth: StyleSheet.hairlineWidth * 2 },
        { opacity: disabled ? 0.25 : pressed ? 0.75 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={filled ? theme.paper : theme.frame} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pages: { flex: 1 },
  status: { height: STATUS_H, justifyContent: 'center', paddingHorizontal: 12 },
  tempChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', maxWidth: '100%',
    height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth * 2, paddingLeft: 10, paddingRight: 3,
  },
  tempText: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  saveBtn: { height: 24, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 12, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '700', minWidth: 30, textAlign: 'right' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  // Middle of the toolbar: grows to fill the space between the side buttons.
  middle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 8 },
  pill: {
    flex: 1, maxWidth: 240, minWidth: 110, height: 42, borderRadius: 21, borderWidth: StyleSheet.hairlineWidth * 2,
    paddingLeft: 5, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pillIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { flex: 1, textAlign: 'center' },
  pillPage: { fontSize: 18, fontWeight: '800' },
  pillTotal: { fontSize: 13, fontWeight: '600' },
});
