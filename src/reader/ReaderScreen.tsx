import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGE_NUMBERS, TOTAL_PAGES, getPage } from '@/data/pages';
import { readerStore, useReaderStore } from '@/store/reader-store';
import { THEMES, THEME_ORDER, type Theme } from '@/theme';
import { computeLayout } from './layout';
import { GoToPageDialog } from './GoToPageDialog';
import { BackgroundMeasurer, getMeasuredWidths } from './LineMeasurer';
import { MushafPage } from './MushafPage';
import { PagePager, type PagerHandle } from './PagePager';

const TOOLBAR_H = 60;
const STATUS_H = 34;
// iOS turns pages with a small five-page pager: a FlatList of all pages opened on a far page could show
// a blank page there (see PagePager). Android and web keep the FlatList, which works well there.
const USE_PAGER = Platform.OS === 'ios';

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

  const [lineWidths, setLineWidths] = useState(getMeasuredWidths);
  // Opens on the page chosen on Home (the Continue reading place, or a surah/para/bookmark).
  const [index, setIndex] = useState(() => readerStore.getState().session.startPage - 1);
  const [goToOpen, setGoToOpen] = useState(false);
  // Size of the area the pages actually get, measured on screen. Using the window size instead
  // breaks on Android (edge-to-edge system bars, fractional widths make paging drift).
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const listRef = useRef<FlatList<number>>(null);
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerHandle>(null);
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

  const cycleTheme = () =>
    readerStore.setTheme(THEME_ORDER[(THEME_ORDER.indexOf(themeName) + 1) % THEME_ORDER.length]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={theme.statusBar} />
      {!lineWidths && <BackgroundMeasurer onMeasured={setLineWidths} />}

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
          <View style={styles.center}>
            <ActivityIndicator color={theme.frame} />
          </View>
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

        <View style={styles.group}>
          {/* Next page is on the left in an Arabic book. */}
          <RoundButton icon="chevron-back" label="Next page" onPress={() => goTo(index + 1)} disabled={index >= TOTAL_PAGES - 1} theme={theme} solid />
          <Pressable
            onPress={() => setGoToOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Page ${page} of ${TOTAL_PAGES}. Tap to go to a page`}
            style={({ pressed }) => [styles.pill, { backgroundColor: theme.frameSoft, borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.pillText, { color: theme.frame }]} allowFontScaling={false}>
              {page}
            </Text>
          </Pressable>
          <RoundButton icon="chevron-forward" label="Previous page" onPress={() => goTo(index - 1)} disabled={index <= 0} theme={theme} solid />
        </View>

        <RoundButton icon={theme.icon} label={`Theme: ${theme.label}. Tap to change`} onPress={cycleTheme} theme={theme} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  pill: {
    minWidth: 64, height: 42, borderRadius: 21, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  pillText: { fontSize: 16, fontWeight: '700' },
});
