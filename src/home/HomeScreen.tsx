import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useIsFocused } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JUZ, SURAHS, TOTAL_PAGES, getPage, surahAtPage, type SurahInfo } from '@/data/pages';
import { PARA_NAMES } from '@/data/meta';
import { readerStore, useReaderStore, type Bookmark, type ReadingMode, type Recent } from '@/store/reader-store';
import { BackgroundMeasurer } from '@/reader/LineMeasurer';
import { REMINDER_SUPPORTED, formatTime } from '@/reminder/reminder';
import { ReminderSheet } from '@/reminder/ReminderSheet';
import { THEMES, THEME_ORDER, type Theme, type ThemeName } from '@/theme';

type Tab = 'surahs' | 'paras' | 'bookmarks';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
const ROW_H = 72;

/**
 * Opens the reader at a page. With no mode given, the app decides (see readerStore.modeFor): your
 * Continue reading place is only moved when it should be, so nobody has to answer a question.
 */
function openReader(page: number, mode?: ReadingMode, surah?: number) {
  readerStore.openPage(page, mode, surah);
  router.push('/read');
}

type OnOpen = (page: number, surah?: number) => void;

type Item =
  | { kind: 'controls' }
  | { kind: 'surah'; surah: SurahInfo }
  | { kind: 'para'; para: (typeof JUZ)[number] }
  | { kind: 'bookmark'; bookmark: Bookmark }
  | { kind: 'empty'; icon: IconName; title: string; text: string };

const CONTROLS: Item = { kind: 'controls' };

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٰٟ'`\-\s]/g, '');

/**
 * Home landing page. The whole screen is one list: the title, About banner and Continue reading
 * card scroll away, and the Surahs / Paras / Bookmarks tabs (with search) stay pinned at the top,
 * so on small phones the list gets the full screen.
 */
export function HomeScreen() {
  // Home stays mounted under the reader. While hidden it stops listening to the store, so every
  // page turn doesn't redraw it in the background; it catches up when you come back.
  const live = useIsFocused();
  const themeName = useReaderStore((s) => s.theme, live);
  const theme = THEMES[themeName];
  const lastPage = useReaderStore((s) => s.lastPage, live);
  const bookmarks = useReaderStore((s) => s.bookmarks, live);
  const recents = useReaderStore((s) => s.recents, live);
  const reminder = useReaderStore((s) => s.reminder, live);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('surahs');
  const [query, setQuery] = useState('');

  const currentPara = getPage(lastPage).juz;
  const currentSurah = surahAtPage(lastPage).number;
  const onOpen: OnOpen = (page, surahNo) => openReader(page, undefined, surahNo);

  const items = useMemo<Item[]>(() => {
    if (tab === 'surahs') {
      const q = normalize(query.trim());
      const list = q
        ? SURAHS.filter((x) => String(x.number) === q || normalize(x.name).includes(q) || normalize(x.nameAr).includes(q))
        : SURAHS;
      if (!list.length) {
        return [CONTROLS, { kind: 'empty', icon: 'search', title: 'No surah found', text: 'Try a name like Yasin or a number from 1 to 114.' }];
      }
      return [CONTROLS, ...list.map((x) => ({ kind: 'surah' as const, surah: x }))];
    }
    if (tab === 'paras') return [CONTROLS, ...JUZ.map((j) => ({ kind: 'para' as const, para: j }))];
    if (!bookmarks.length) {
      return [
        CONTROLS,
        {
          kind: 'empty',
          icon: 'bookmark-outline',
          title: 'No bookmarks yet',
          text: 'While reading, tap the bookmark button at the bottom left to save a page here.',
        },
      ];
    }
    return [CONTROLS, ...bookmarks.map((b) => ({ kind: 'bookmark' as const, bookmark: b }))];
  }, [tab, query, bookmarks]);

  const renderItem = ({ item }: { item: Item }) => {
    switch (item.kind) {
      case 'controls':
        return <Controls theme={theme} tab={tab} setTab={setTab} query={query} setQuery={setQuery} bookmarkCount={bookmarks.length} />;
      case 'surah':
        return <SurahRow surah={item.surah} theme={theme} current={item.surah.number === currentSurah} onOpen={onOpen} />;
      case 'para':
        return <ParaRow para={item.para} theme={theme} current={item.para.number === currentPara} onOpen={onOpen} />;
      case 'bookmark':
        return <BookmarkRow bookmark={item.bookmark} theme={theme} onOpen={onOpen} />;
      case 'empty':
        return <Empty theme={theme} icon={item.icon} title={item.title} text={item.text} />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <StatusBar style={theme.statusBar} />
      {/* Prepares the reader's font size while you browse, so pages open instantly. */}
      <BackgroundMeasurer />
      <FlatList
        data={items}
        keyExtractor={itemKey}
        renderItem={renderItem}
        extraData={theme}
        ListHeaderComponent={
          <HomeHeader theme={theme} themeName={themeName} lastPage={lastPage} recents={recents} reminder={reminder} />
        }
        // Index 0 is the header above; index 1 is the tabs + search bar, pinned while the list scrolls.
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </View>
  );
}

function itemKey(item: Item): string {
  switch (item.kind) {
    case 'surah':
      return `s${item.surah.number}`;
    case 'para':
      return `p${item.para.number}`;
    case 'bookmark':
      return `b${item.bookmark.page}`;
    default:
      return item.kind;
  }
}

// ---------- Header (scrolls away) ----------

/** Bell next to the theme button: opens the daily reminder settings (on/off and time). */
function ReminderButton({ theme, on }: { theme: Theme; on: boolean }) {
  const [open, setOpen] = useState(false);
  const time = useReaderStore((s) => s.reminderTime);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={on ? `Daily reminder on at ${formatTime(time)}. Tap to change` : 'Daily reminder off. Tap to set it up'}
        style={({ pressed }) => [styles.headerBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name={on ? 'notifications' : 'notifications-off-outline'} size={20} color={theme.frame} />
      </Pressable>
      {open && <ReminderSheet theme={theme} onClose={() => setOpen(false)} />}
    </>
  );
}

function HomeHeader({
  theme, themeName, lastPage, recents, reminder,
}: {
  theme: Theme; themeName: ThemeName; lastPage: number; recents: Recent[]; reminder: boolean | null;
}) {
  const current = getPage(lastPage);
  const surah = surahAtPage(lastPage);
  const started = lastPage > 1;
  const progress = lastPage / TOTAL_PAGES;
  const cycleTheme = () => readerStore.setTheme(THEME_ORDER[(THEME_ORDER.indexOf(themeName) + 1) % THEME_ORDER.length]);

  return (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appArabic, { color: theme.frame }]}>القرآن الكريم</Text>
          <Text style={[styles.title, { color: theme.ink }]}>Quran No Ads</Text>
          <Text style={[styles.tagline, { color: theme.muted }]}>IndoPak 13-line mushaf · offline · free</Text>
        </View>
        {REMINDER_SUPPORTED && <ReminderButton theme={theme} on={reminder === true} />}
        <Pressable
          onPress={cycleTheme}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Theme: ${theme.label}. Tap to change`}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={theme.icon} size={20} color={theme.frame} />
        </Pressable>
      </View>

      {/* About & sources: highlighted so people see the text is verified and where it comes from */}
      <Pressable
        onPress={() => router.push('/about')}
        accessibilityRole="button"
        accessibilityLabel="Quran text verified. Open About and sources"
        style={({ pressed }) => [
          styles.aboutBanner,
          { backgroundColor: theme.frameSoft, borderColor: theme.frame, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <View style={[styles.aboutIcon, { backgroundColor: theme.frame }]}>
          <Ionicons name="shield-checkmark" size={16} color={theme.paper} />
        </View>
        <Text style={[styles.aboutText, { color: theme.ink }]} numberOfLines={1}>
          Quran text verified · <Text style={{ color: theme.frame, fontWeight: '800' }}>About & sources</Text>
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.frame} />
      </Pressable>

      {/* Continue reading */}
      <Pressable
        onPress={() => openReader(lastPage, 'continue')}
        accessibilityRole="button"
        accessibilityLabel={`${started ? 'Continue reading' : 'Start reading'} at page ${lastPage}, ${surah.name}`}
        style={({ pressed }) => [styles.hero, { backgroundColor: theme.frame, opacity: pressed ? 0.88 : 1 }]}
      >
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroKicker, { color: theme.paper }]}>{started ? 'CONTINUE READING' : 'START READING'}</Text>
            <Text style={[styles.heroTitle, { color: theme.paper }]}>{surah.name}</Text>
            <Text style={[styles.heroSub, { color: theme.paper }]}>
              Page {lastPage} · Para {current.juz}
            </Text>
          </View>
          <Text style={[styles.heroArabic, { color: theme.paper }]}>{surah.nameAr}</Text>
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(2, progress * 100)}%`, backgroundColor: theme.paper }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.paper }]}>{Math.round(progress * 100)}%</Text>
          <View style={[styles.heroGo, { backgroundColor: theme.paper }]}>
            <Ionicons name="arrow-forward" size={18} color={theme.frame} />
          </View>
        </View>
      </Pressable>

      {recents.length > 0 && <RecentRow theme={theme} recents={recents} />}
    </View>
  );
}

// ---------- Recently read ----------

/**
 * Surahs read on the side (daily Ya-Sin, Al-Kahf on Friday…), each reopening where it was left,
 * without touching the Continue reading place.
 */
function RecentRow({ theme, recents }: { theme: Theme; recents: Recent[] }) {
  return (
    <View style={styles.recentBlock}>
      <Text style={[styles.recentTitle, { color: theme.muted }]}>RECENTLY READ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
        {recents.map((r) => {
          const s = SURAHS[r.surah - 1];
          return (
            <Pressable
              key={r.surah}
              onPress={() => openReader(r.page, 'temporary', r.surah)}
              onLongPress={() => readerStore.removeRecent(r.surah)}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}, page ${r.page}. Long press to remove`}
              style={({ pressed }) => [
                styles.recentChip,
                { backgroundColor: theme.paper, borderColor: theme.frameSoft, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.recentArabic, { color: theme.frame }]}>{s.nameAr}</Text>
              <View>
                <Text style={[styles.recentName, { color: theme.ink }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.recentPage, { color: theme.muted }]}>page. {r.page}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------- Tabs + search (pinned) ----------

function Controls({
  theme, tab, setTab, query, setQuery, bookmarkCount,
}: {
  theme: Theme; tab: Tab; setTab: (t: Tab) => void; query: string; setQuery: (q: string) => void; bookmarkCount: number;
}) {
  const tabs: readonly (readonly [Tab, string, IconName])[] = [
    ['surahs', 'Surahs', 'list'],
    ['paras', 'Paras', 'albums-outline'],
    ['bookmarks', 'Bookmarks', 'bookmark-outline'],
  ];
  return (
    <View style={[styles.controls, { backgroundColor: theme.bg, borderBottomColor: theme.frameSoft }]}>
      <View style={[styles.segment, { backgroundColor: theme.frameSoft }]} accessibilityRole="tablist">
        {tabs.map(([key, label, icon]) => {
          const selected = tab === key;
          const count = key === 'bookmarks' ? bookmarkCount : 0;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={count ? `${label}, ${count}` : label}
              style={[styles.segmentItem, selected && [styles.segmentSelected, { backgroundColor: theme.paper }]]}
            >
              <Ionicons name={icon} size={15} color={selected ? theme.frame : theme.muted} />
              <Text style={[styles.segmentText, { color: selected ? theme.frame : theme.muted }]} numberOfLines={1}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[styles.countPill, { backgroundColor: selected ? theme.frame : theme.muted }]}>
                  <Text style={[styles.countText, { color: theme.paper }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {tab === 'surahs' && (
        <View style={[styles.search, { backgroundColor: theme.paper, borderColor: theme.frameSoft }]}>
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search surah name or number"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.ink }]}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search surahs"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ---------- Rows ----------

function SurahRow({ surah, theme, current, onOpen }: { surah: SurahInfo; theme: Theme; current: boolean; onOpen: OnOpen }) {
  return (
    <Row theme={theme} current={current} onPress={() => onOpen(surah.startPage, surah.number)} label={`Surah ${surah.name}, page ${surah.startPage}`}>
      <NumberBadge n={surah.number} theme={theme} current={current} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.ink }]} numberOfLines={1}>{surah.name}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
          {surah.place === 'makkah' ? 'Makki' : 'Madani'} · {surah.ayahs} ayahs
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={[styles.rowArabic, { color: current ? theme.frame : theme.ink }]} numberOfLines={1}>{surah.nameAr}</Text>
        <Text style={[styles.rowPage, { color: theme.muted }]}>Page {surah.startPage}</Text>
      </View>
    </Row>
  );
}

function ParaRow({ para, theme, current, onOpen }: { para: (typeof JUZ)[number]; theme: Theme; current: boolean; onOpen: OnOpen }) {
  return (
    <Row theme={theme} current={current} onPress={() => onOpen(para.startPage)} label={`Para ${para.number}, page ${para.startPage}`}>
      <NumberBadge n={para.number} theme={theme} current={current} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>Para {para.number}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
          {SURAHS[para.surah - 1].name} {para.surah}:{para.ayah}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={[styles.rowArabic, { color: current ? theme.frame : theme.ink }]} numberOfLines={1}>
          {PARA_NAMES[para.number - 1]}
        </Text>
        <Text style={[styles.rowPage, { color: theme.muted }]}>Page {para.startPage}</Text>
      </View>
    </Row>
  );
}

function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

function BookmarkRow({ bookmark, theme, onOpen }: { bookmark: Bookmark; theme: Theme; onOpen: OnOpen }) {
  const p = getPage(bookmark.page);
  const surah = SURAHS[p.surah - 1];
  return (
    <Row
      theme={theme}
      current={false}
      onPress={() => onOpen(bookmark.page)}
      label={`Bookmark, page ${bookmark.page}, ${surah.name}`}
      trailing={
        <Pressable
          onPress={() => readerStore.removeBookmark(bookmark.page)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove bookmark for page ${bookmark.page}`}
          style={({ pressed }) => [styles.trash, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="trash-outline" size={20} color={theme.muted} />
        </Pressable>
      }
    >
      <View style={[styles.bookmarkIcon, { backgroundColor: theme.frameSoft }]}>
        <Ionicons name="bookmark" size={18} color={theme.frame} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>Page {bookmark.page}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
          {surah.name} · Para {p.juz} · {timeAgo(bookmark.createdAt)}
        </Text>
      </View>
    </Row>
  );
}

// ---------- Shared pieces ----------

function Row({
  theme, current, onPress, label, children, trailing,
}: {
  theme: Theme; current: boolean; onPress: () => void; label: string; children: React.ReactNode;
  /** Extra control beside the row (kept outside the row's button: buttons can't be nested on web). */
  trailing?: React.ReactNode;
}) {
  return (
    <View style={[styles.rowWrap, current && { backgroundColor: theme.frameSoft }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      >
        {children}
      </Pressable>
      {trailing}
      {!current && <View style={[styles.divider, { backgroundColor: theme.frameSoft }]} />}
    </View>
  );
}

/** Number inside a small rotated square, a common motif in mushaf indexes. */
function NumberBadge({ n, theme, current }: { n: number; theme: Theme; current: boolean }) {
  return (
    <View style={styles.badgeWrap}>
      <View style={[styles.badgeDiamond, { borderColor: theme.frame, backgroundColor: current ? theme.frame : 'transparent' }]} />
      <Text style={[styles.badgeText, { color: current ? theme.paper : theme.frame }]}>{n}</Text>
    </View>
  );
}

function Empty({ theme, icon, title, text }: { theme: Theme; icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.frameSoft }]}>
        <Ionicons name={icon} size={30} color={theme.frame} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: { paddingTop: 10, paddingBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 12, gap: 12 },
  appArabic: { fontSize: 15, fontWeight: '700', textAlign: 'left', writingDirection: 'ltr' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  tagline: { fontSize: 13, marginTop: 2 },
  aboutBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 14,
    paddingLeft: 6, paddingRight: 12, height: 44, borderRadius: 22, borderWidth: 1.5,
  },
  aboutIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aboutText: { flex: 1, fontSize: 14, fontWeight: '600' },
  headerBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  hero: {
    marginHorizontal: 16, borderRadius: 24, padding: 18, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, opacity: 0.85 },
  heroTitle: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  heroSub: { fontSize: 14, opacity: 0.9, marginTop: 2 },
  heroArabic: { fontSize: 30, fontWeight: '700' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 13, fontWeight: '700', minWidth: 34, textAlign: 'right' },
  heroGo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  recentBlock: { marginTop: 16 },
  recentTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginHorizontal: 20, marginBottom: 8 },
  recentList: { paddingHorizontal: 16, gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1.5,
  },
  recentArabic: { fontSize: 18, fontWeight: '700' },
  recentName: { fontSize: 13, fontWeight: '700', maxWidth: 110 },
  recentPage: { fontSize: 11, marginTop: 1 },

  controls: { paddingTop: 10, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  segment: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, padding: 4 },
  segmentItem: {
    flex: 1, height: 40, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 4,
  },
  segmentSelected: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  countPill: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '800' },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 14,
    height: 46, borderRadius: 14, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  rowWrap: { height: ROW_H, flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, paddingRight: 8, borderRadius: 16 },
  row: { flex: 1, height: ROW_H, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 6, gap: 14 },
  divider: { position: 'absolute', left: 62, right: 10, bottom: 0, height: StyleSheet.hairlineWidth },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 3 },
  rowEnd: { alignItems: 'flex-end', maxWidth: '45%' },
  rowArabic: { fontSize: 21, fontWeight: '600' },
  rowPage: { fontSize: 12, marginTop: 1 },

  badgeWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badgeDiamond: { position: 'absolute', width: 28, height: 28, borderWidth: 1.5, borderRadius: 6, transform: [{ rotate: '45deg' }] },
  badgeText: { fontSize: 13, fontWeight: '800' },

  bookmarkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trash: { padding: 6 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 240, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
