import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JUZ, SURAHS, TOTAL_PAGES, getPage, surahAtPage, type SurahInfo } from '@/data/pages';
import { PARA_NAMES } from '@/data/meta';
import { readerStore, useReaderStore, type Bookmark, type ReadingMode, type Recent } from '@/store/reader-store';
import { BackgroundMeasurer } from '@/reader/LineMeasurer';
import { THEMES, THEME_ORDER, type Theme } from '@/theme';

type Tab = 'surahs' | 'paras' | 'bookmarks';
const ROW_H = 68;

/**
 * Opens the reader at a page. With no mode given, the app decides (see readerStore.modeFor): your
 * Continue reading place is only moved when it should be, so nobody has to answer a question.
 */
function openReader(page: number, mode?: ReadingMode, surah?: number) {
  readerStore.openPage(page, mode, surah);
  router.push('/read');
}

type OnOpen = (page: number, surah?: number) => void;

/** Home landing page: continue reading, then Surahs / Paras / Bookmarks. */
export function HomeScreen() {
  const themeName = useReaderStore((s) => s.theme);
  const theme = THEMES[themeName];
  const lastPage = useReaderStore((s) => s.lastPage);
  const bookmarks = useReaderStore((s) => s.bookmarks);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('surahs');
  const [query, setQuery] = useState('');

  const current = getPage(lastPage);
  const recents = useReaderStore((s) => s.recents);
  const surah = surahAtPage(lastPage);
  const started = lastPage > 1;
  const progress = lastPage / TOTAL_PAGES;
  const onOpen: OnOpen = (page, surahNo) => openReader(page, undefined, surahNo);

  const cycleTheme = () => readerStore.setTheme(THEME_ORDER[(THEME_ORDER.indexOf(themeName) + 1) % THEME_ORDER.length]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 10 }]}>
      <StatusBar style={theme.statusBar} />
      {/* Prepares the reader's font size while you browse, so pages open instantly. */}
      <BackgroundMeasurer />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appArabic, { color: theme.frame }]}>القرآن الكريم</Text>
          <Text style={[styles.title, { color: theme.ink }]}>Quran No Ads</Text>
          <Text style={[styles.tagline, { color: theme.muted }]}>IndoPak 13-line mushaf · offline · free</Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable
            onPress={() => router.push('/about')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="About, sources and verification"
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.frame} />
          </Pressable>
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
      </View>

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

      {/* Segmented control */}
      <View style={[styles.segment, { backgroundColor: theme.frameSoft }]} accessibilityRole="tablist">
        {(
          [
            ['surahs', 'Surahs', 'list'],
            ['paras', 'Paras', 'albums-outline'],
            ['bookmarks', `Bookmarks${bookmarks.length ? ` · ${bookmarks.length}` : ''}`, 'bookmark-outline'],
          ] as const
        ).map(([key, label, icon]) => {
          const selected = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && [styles.segmentSelected, { backgroundColor: theme.paper }]]}
            >
              <Ionicons name={icon} size={15} color={selected ? theme.frame : theme.muted} />
              <Text style={[styles.segmentText, { color: selected ? theme.frame : theme.muted }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'surahs' && (
        <SurahList theme={theme} query={query} setQuery={setQuery} currentSurah={surah.number} bottom={insets.bottom} onOpen={onOpen} />
      )}
      {tab === 'paras' && <ParaList theme={theme} currentPara={current.juz} bottom={insets.bottom} onOpen={onOpen} />}
      {tab === 'bookmarks' && <BookmarkList theme={theme} bookmarks={bookmarks} bottom={insets.bottom} onOpen={onOpen} />}
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

// ---------- Surahs ----------

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٰٟ'`\-\s]/g, '');

function SurahList({
  theme, query, setQuery, currentSurah, bottom, onOpen,
}: {
  theme: Theme; query: string; setQuery: (q: string) => void; currentSurah: number; bottom: number; onOpen: OnOpen;
}) {
  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) => String(s.number) === q || normalize(s.name).includes(q) || normalize(s.nameAr).includes(q),
    );
  }, [query]);

  return (
    <>
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
      <FlatList
        data={results}
        keyExtractor={(s) => String(s.number)}
        renderItem={({ item }) => <SurahRow surah={item} theme={theme} current={item.number === currentSurah} onOpen={onOpen} />}
        getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
        initialScrollIndex={query ? 0 : Math.max(0, Math.min(currentSurah - 3, SURAHS.length - 8))}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        ListEmptyComponent={<Empty theme={theme} icon="search" title="No surah found" text="Try a name like Yasin or a number from 1 to 114." />}
      />
    </>
  );
}

function SurahRow({ surah, theme, current, onOpen }: { surah: SurahInfo; theme: Theme; current: boolean; onOpen: OnOpen }) {
  return (
    <Row theme={theme} current={current} onPress={() => onOpen(surah.startPage, surah.number)} label={`Surah ${surah.name}, page ${surah.startPage}`}>
      <NumberBadge n={surah.number} theme={theme} current={current} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.ink }]} numberOfLines={1}>{surah.name}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
          {surah.place === 'makkah' ? 'Makki' : 'Madani'} · {surah.ayahs} ayahs · page. {surah.startPage}
        </Text>
      </View>
      <Text style={[styles.rowArabic, { color: theme.ink }]}>{surah.nameAr}</Text>
    </Row>
  );
}

// ---------- Paras ----------

function ParaList({ theme, currentPara, bottom, onOpen }: { theme: Theme; currentPara: number; bottom: number; onOpen: OnOpen }) {
  return (
    <FlatList
      data={JUZ}
      keyExtractor={(j) => String(j.number)}
      getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
      initialScrollIndex={Math.max(0, Math.min(currentPara - 3, JUZ.length - 8))}
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
      renderItem={({ item }) => {
        const current = item.number === currentPara;
        return (
          <Row theme={theme} current={current} onPress={() => onOpen(item.startPage)} label={`Para ${item.number}, page ${item.startPage}`}>
            <NumberBadge n={item.number} theme={theme} current={current} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: theme.ink }]}>Para {item.number}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
                {SURAHS[item.surah - 1].name} {item.surah}:{item.ayah} · page. {item.startPage}
              </Text>
            </View>
            <Text style={[styles.rowArabic, { color: theme.ink }]}>{PARA_NAMES[item.number - 1]}</Text>
          </Row>
        );
      }}
    />
  );
}

// ---------- Bookmarks ----------

function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

function BookmarkList({
  theme, bookmarks, bottom, onOpen,
}: {
  theme: Theme; bookmarks: Bookmark[]; bottom: number; onOpen: OnOpen;
}) {
  if (bookmarks.length === 0) {
    return (
      <Empty
        theme={theme}
        icon="bookmark-outline"
        title="No bookmarks yet"
        text="While reading, tap the bookmark button at the bottom left to save a page here."
      />
    );
  }
  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(b) => String(b.page)}
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
      renderItem={({ item }) => {
        const p = getPage(item.page);
        const surah = SURAHS[p.surah - 1];
        return (
          <Row
            theme={theme}
            current={false}
            onPress={() => onOpen(item.page)}
            label={`Bookmark, page ${item.page}, ${surah.name}`}
            trailing={
              <Pressable
                onPress={() => readerStore.removeBookmark(item.page)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove bookmark for page ${item.page}`}
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
              <Text style={[styles.rowTitle, { color: theme.ink }]}>Page {item.page}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={1}>
                {surah.name} · Para {p.juz} · {timeAgo(item.createdAt)}
              </Text>
            </View>
          </Row>
        );
      }}
    />
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
    <View style={[styles.rowWrap, { borderBottomColor: theme.frameSoft }, current && { backgroundColor: theme.frameSoft }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      >
        {children}
      </Pressable>
      {trailing}
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

function Empty({ theme, icon, title, text }: { theme: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }) {
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
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  appArabic: { fontSize: 15, fontWeight: '700', textAlign: 'left', writingDirection: 'ltr' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  tagline: { fontSize: 13, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
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

  segment: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 10, borderRadius: 14, padding: 4 },
  segmentItem: { flex: 1, height: 38, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentSelected: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '700' },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 14,
    height: 44, borderRadius: 14, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  rowWrap: { height: ROW_H, flexDirection: 'row', alignItems: 'center', paddingRight: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flex: 1, height: ROW_H, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 6, gap: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowArabic: { fontSize: 20, fontWeight: '600' },

  badgeWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badgeDiamond: { position: 'absolute', width: 28, height: 28, borderWidth: 1.5, borderRadius: 6, transform: [{ rotate: '45deg' }] },
  badgeText: { fontSize: 13, fontWeight: '800' },

  bookmarkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trash: { padding: 6 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
