import { useRef, useState } from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, View,
  type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPage } from '@/data/pages';
import { QURAN_FONT } from '@/reader/MushafPage';
import { RTL_ROW, WordUnit } from '@/reader/WordUnit';
import { initReminder } from '@/reminder/reminder';
import { readerStore, useReaderStore } from '@/store/reader-store';
import { THEMES, THEME_ORDER, type Theme, type ThemeName } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SLIDES = 4;
/** Green tick on "Works offline", the same in every theme. */
const OK_GREEN = '#2E9E6A';

/**
 * Welcome screens, shown once on a new install (and again from About on request).
 * Four screens: welcome, reading, themes, your place. There is no Skip: the screens are short.
 * The daily reminder is not a screen here: right after the last one, the phone asks for
 * notification permission over Home (see initReminder).
 */
export function WelcomeScreen() {
  const theme = THEMES[useReaderStore((s) => s.theme)];
  const insets = useSafeAreaInsets();
  const { again } = useLocalSearchParams<{ again?: string }>();
  const [width, setWidth] = useState(0);
  const [slide, setSlide] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const goToSlide = (i: number) => {
    setSlide(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setSlide(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = () => {
    readerStore.finishWelcome();
    // Opened again from About: go back there. First launch: Home replaces the welcome screens.
    if (again && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
    // First launch: once Home is showing, offer the daily reminder (the phone's permission prompt).
    setTimeout(initReminder, 600);
  };

  const last = slide === SLIDES - 1;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <StatusBar style={theme.statusBar} />
      <View style={styles.pages} onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        {width > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            // Web has no momentum events; settle from the plain scroll position there.
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              if (Math.abs(x - Math.round(x / width) * width) < 2) onScrollEnd(e);
            }}
            scrollEventThrottle={32}
          >
            <Slide width={width}><WelcomeSlide theme={theme} /></Slide>
            <Slide width={width}><ReadingSlide theme={theme} /></Slide>
            <Slide width={width}><ThemeSlide theme={theme} /></Slide>
            <Slide width={width}><PlaceSlide theme={theme} /></Slide>
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Screen ${slide + 1} of ${SLIDES}`}>
          {Array.from({ length: SLIDES }, (_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === slide ? theme.frame : theme.muted }, i === slide ? styles.dotActive : styles.dotIdle]}
            />
          ))}
        </View>
        <Pressable
          onPress={last ? finish : () => goToSlide(slide + 1)}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Start reading' : 'Next'}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.frame, opacity: pressed ? 0.85 : 1 }]}
        >
          {last && <Ionicons name="book" size={18} color={theme.paper} />}
          <Text style={[styles.primaryText, { color: theme.paper }]}>{last ? 'Start reading' : 'Next'}</Text>
          {!last && <Ionicons name="arrow-forward" size={18} color={theme.paper} />}
        </Pressable>
      </View>
    </View>
  );
}

function Slide({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

function Heading({ theme, kicker, title, text }: { theme: Theme; kicker?: string; title: string; text?: string }) {
  return (
    <View style={styles.heading}>
      {!!kicker && <Text style={[styles.kicker, { color: theme.frame }]}>{kicker}</Text>}
      <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      {!!text && <Text style={[styles.text, { color: theme.muted }]}>{text}</Text>}
    </View>
  );
}

function Feature({ theme, icon, text }: { theme: Theme; icon: IconName; text: string }) {
  return (
    <View style={[styles.feature, { backgroundColor: theme.paper, borderColor: theme.frameSoft }]}>
      <View style={[styles.featureIcon, { backgroundColor: theme.frameSoft }]}>
        <Ionicons name={icon} size={18} color={theme.frame} />
      </View>
      <Text style={[styles.featureText, { color: theme.ink }]}>{text}</Text>
    </View>
  );
}

// ---------- 1. Welcome ----------

function WelcomeSlide({ theme }: { theme: Theme }) {
  return (
    <>
      <Image source={require('../../assets/icon.png')} style={styles.appIcon} accessibilityIgnoresInvertColors />
      <Text style={[styles.salam, { color: theme.frame }]}>السلام علیکم</Text>
      <Heading theme={theme} title="Welcome to Quran No Ads" />
      <View style={styles.chips}>
        {(
          [
            ['ban-outline', 'No ads', theme.frame],
            ['checkmark-circle', 'Works offline', OK_GREEN],
            ['heart-outline', 'Free forever', theme.frame],
          ] as const
        ).map(([icon, label, iconColor]) => (
          <View key={label} style={[styles.chip, { backgroundColor: theme.frameSoft }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
            <Text style={[styles.chipText, { color: theme.frame }]}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.noteBox, { backgroundColor: theme.paper, borderColor: theme.frame }]}>
        <Ionicons name="heart" size={18} color={theme.frame} />
        <Text style={[styles.note, { color: theme.ink }]}>
          Made as <Text style={{ color: theme.frame }}>Sadaqa-e-Jaria</Text>.{'\n'}This app is not for sale.
        </Text>
      </View>
    </>
  );
}

// ---------- 2. Reading ----------

/** A few real lines of page 1 (Al-Fatihah), drawn with the mushaf font. */
function MiniPage({ theme }: { theme: Theme }) {
  const lines = getPage(1).lines.filter((l) => l.type === 'ayah').slice(0, 4);
  return (
    <View style={[styles.miniPage, { backgroundColor: theme.paper, borderColor: theme.frame }]}>
      <View style={[styles.miniInner, { borderColor: theme.frame }]}>
        <View style={[styles.miniHeader, { backgroundColor: theme.frameSoft, borderColor: theme.frame }]}>
          <Text style={[styles.miniHeaderText, { color: theme.ink }]} allowFontScaling={false}>سورۃ الفاتحة</Text>
        </View>
        {lines.map((l) => (
          <View key={l.line} style={[styles.miniLine, { flexDirection: RTL_ROW }]}>
            {l.words.map((w, i) => (
              <WordUnit key={i} text={w.text} fontSize={17} style={[styles.miniWord, { color: theme.ink }]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function ReadingSlide({ theme }: { theme: Theme }) {
  return (
    <>
      <MiniPage theme={theme} />
      <Heading theme={theme} kicker="READING" title="Like a printed mushaf" text="Every page has the same 13 lines as the print, so your hifz and your place stay the same." />
      <View style={styles.features}>
        <Feature theme={theme} icon="swap-horizontal" text="Swipe to turn pages, right to left, like a printed mushaf." />
        <Feature theme={theme} icon="search" text="Tap the page number at the bottom to jump to any page." />
        <Feature theme={theme} icon="phone-portrait-outline" text="The screen stays on while you read." />
      </View>
    </>
  );
}

// ---------- 3. Themes ----------

function ThemeSlide({ theme }: { theme: Theme }) {
  return (
    <>
      <Heading theme={theme} kicker="THEMES" title="Choose your theme" text="Tap one to try it. You can change it any time with the theme button." />
      <View style={styles.themeRow}>
        {THEME_ORDER.map((name) => (
          <ThemeCard key={name} name={name} selected={theme.name === name} />
        ))}
      </View>
    </>
  );
}

function ThemeCard({ name, selected }: { name: ThemeName; selected: boolean }) {
  const t = THEMES[name];
  return (
    <Pressable
      onPress={() => readerStore.setTheme(name)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${t.label} theme`}
      style={({ pressed }) => [
        styles.themeCard,
        { backgroundColor: t.bg, borderColor: selected ? t.frame : 'transparent', opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.themePage, { backgroundColor: t.paper, borderColor: t.frame }]}>
        <Text style={[styles.themeArabic, { color: t.ink }]} allowFontScaling={false}>القرآن الكريم</Text>
        {[0.9, 1, 0.8, 1, 0.95, 0.85, 1, 0.6].map((w, i) => (
          <View key={i} style={[styles.themeBar, { width: `${w * 100}%`, backgroundColor: t.ink, opacity: 0.22 }]} />
        ))}
      </View>
      <View style={styles.themeLabelRow}>
        <Ionicons name={selected ? 'checkmark-circle' : t.icon} size={16} color={t.frame} />
        <Text style={[styles.themeLabel, { color: t.frame }]}>{t.label}</Text>
      </View>
    </Pressable>
  );
}

// ---------- 4. Your place ----------

function PlaceSlide({ theme }: { theme: Theme }) {
  return (
    <>
      <View style={[styles.placeCard, { backgroundColor: theme.frame }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.placeKicker, { color: theme.paper }]}>CONTINUE READING</Text>
          <Text style={[styles.placeTitle, { color: theme.paper }]}>Al-Kahf</Text>
          <Text style={[styles.placeSub, { color: theme.paper }]}>Page 293 · Para 15</Text>
        </View>
        <View style={[styles.placeGo, { backgroundColor: theme.paper }]}>
          <Ionicons name="arrow-forward" size={18} color={theme.frame} />
        </View>
      </View>
      <Heading
        theme={theme}
        kicker="YOUR PLACE"
        title="Your place is always kept"
        text="The app remembers where you stopped. No setting up, no questions."
      />
      <View style={styles.features}>
        <Feature theme={theme} icon="time-outline" text="Read a surah on the side, like a daily Ya-Sin. Your main place stays where it was." />
        <Feature theme={theme} icon="list" text="Find any surah or para from the lists on Home." />
        <Feature theme={theme} icon="bookmark-outline" text="Bookmark pages to come back to them." />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pages: { flex: 1 },
  slide: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 18 },

  heading: { alignItems: 'center', gap: 8, maxWidth: 420 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  appIcon: { width: 112, height: 112, borderRadius: 28 },
  salam: { fontSize: 22, fontWeight: '700', marginBottom: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16 },
  chipText: { fontSize: 13, fontWeight: '700' },
  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 16, maxWidth: 360,
  },
  note: { flexShrink: 1, fontSize: 15, lineHeight: 22, fontWeight: '700', textAlign: 'center' },

  features: { alignSelf: 'stretch', gap: 8, maxWidth: 440, width: '100%', marginHorizontal: 'auto' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, borderWidth: 1 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20 },

  miniPage: { width: '86%', maxWidth: 320, borderWidth: 2, borderRadius: 18, padding: 3 },
  miniInner: { borderWidth: 1, borderRadius: 15, paddingVertical: 10, paddingHorizontal: 12, gap: 2, alignItems: 'center' },
  miniHeader: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginBottom: 4 },
  // Not Quran text: the phone's Arabic font (the Quran font is used only for Quran text).
  miniHeaderText: { fontSize: 13, fontWeight: '700', lineHeight: 26 },
  miniLine: { justifyContent: 'center', columnGap: 6, height: 34, alignItems: 'center' },
  miniWord: { fontFamily: QURAN_FONT, fontSize: 17, lineHeight: 34 },

  themeRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', justifyContent: 'center' },
  themeCard: { flex: 1, maxWidth: 130, borderRadius: 18, borderWidth: 2.5, padding: 8, gap: 8 },
  themePage: { borderWidth: 1.5, borderRadius: 12, padding: 8, gap: 7, alignItems: 'center', minHeight: 170 },
  // Decorative label, not Quran text: the phone's Arabic font.
  themeArabic: { fontSize: 13, fontWeight: '700', lineHeight: 26 },
  themeBar: { height: 5, borderRadius: 3 },
  themeLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  themeLabel: { fontSize: 14, fontWeight: '800' },

  placeCard: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 360, borderRadius: 22, padding: 16, gap: 12 },
  placeKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, opacity: 0.85 },
  placeTitle: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  placeSub: { fontSize: 13, opacity: 0.9 },
  placeGo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  footer: { paddingHorizontal: 24, paddingTop: 8, gap: 14, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22 },
  dotIdle: { opacity: 0.35 },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 26, alignSelf: 'stretch', maxWidth: 440, width: '100%', marginHorizontal: 'auto',
  },
  primaryText: { fontSize: 16, fontWeight: '800' },
});
