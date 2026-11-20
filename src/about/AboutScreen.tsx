import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyQuranData } from '@/data/pages';
import { useReaderStore } from '@/store/reader-store';
import { THEMES, type Theme } from '@/theme';

/** About & verification: what this mushaf is, where every part comes from, and a live data check. */
export function AboutScreen() {
  const theme = THEMES[useReaderStore((s) => s.theme)];
  const insets = useSafeAreaInsets();
  const checks = useMemo(() => verifyQuranData(), []);
  const allOk = checks.every((c) => c.ok);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={back}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.backBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </Pressable>
        <Text style={[styles.title, { color: theme.ink }]}>About & sources</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {/* Live verification */}
        <View style={[styles.verifyCard, { backgroundColor: allOk ? theme.frame : '#B3261E' }]}>
          <View style={styles.verifyHead}>
            <Ionicons name={allOk ? 'shield-checkmark' : 'warning'} size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>{allOk ? 'Quran text verified' : 'Verification problem'}</Text>
              <Text style={styles.verifySub}>Checked just now on this device</Text>
            </View>
          </View>
          {checks.map((c) => (
            <View key={c.label} style={styles.checkRow} accessibilityLabel={`${c.label}: ${c.ok ? 'passed' : 'failed'}. ${c.detail}`}>
              <Ionicons name={c.ok ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" />
              <Text style={styles.checkLabel}>{c.label}</Text>
              <Text style={styles.checkDetail}>{c.detail}</Text>
            </View>
          ))}
        </View>

        <Section theme={theme} icon="book-outline" title="This mushaf">
          <Item theme={theme} label="Script" value="IndoPak (Nastaleeq), as printed in South Asia" />
          <Item theme={theme} label="Layout" value="13 lines per page, Taj Company print, 847 pages" />
          <Item theme={theme} label="Riwayah" value="Hafs ʿan ʿĀṣim" />
          <Item theme={theme} label="Contents" value="114 surahs · 30 paras · 6,236 ayahs" />
          <Item theme={theme} label="Signs" value="Waqf signs, ruku (ع) and ayah markers as in the print" />
        </Section>

        <Section theme={theme} icon="library-outline" title="Sources">
          <Source
            theme={theme}
            title="Quran text"
            text="IndoPak Nastaleeq script, word by word, from the Quranic Universal Library (QUL) by Tarteel."
          />
          <Source
            theme={theme}
            title="Page layout"
            text="“Indopak 13 lines layout (Taj company)”, QUL. It places every word on its page and line exactly as in the printed mushaf."
          />
          <Source
            theme={theme}
            title="Surah names & para divisions"
            text="QUL Quran metadata. The para names are the traditional IndoPak names (الٓمّٓ, سَيَقُوْلُ …)."
          />
          <Source
            theme={theme}
            title="Font"
            text="“Indopak Nastaleeq” (Hanafi, v4.2.2, with waqf lazim), QUL. Credits in the font: Al Qalam, Ghandhara, KFGQPC, Ayman Siddiqui."
          />
          <Source
            theme={theme}
            title="Technical note"
            text="No word of the text is changed. The font has one added character-map entry (U+202F mapped to its own space glyph) so that waqf signs render correctly on Android; no glyph is added or edited."
          />
        </Section>

        <Section theme={theme} icon="lock-closed-outline" title="Privacy">
          <Bullet theme={theme} text="No ads, no tracking, no account." />
          <Bullet theme={theme} text="Works fully offline. The app makes no internet requests." />
          <Bullet theme={theme} text="Your reading place, bookmarks and theme stay on this phone only." />
        </Section>

        <Section theme={theme} icon="flag-outline" title="Found a mistake?">
          <Text style={[styles.body, { color: theme.ink }]}>
            The text has been checked against the data above, and every page should match the printed Taj 13-line mushaf. If
            you notice anything that differs from your printed copy, please note the page and line number and report it, so it
            can be corrected for everyone.
          </Text>
        </Section>

        <Text style={[styles.footer, { color: theme.muted }]}>Quran No Ads · version {version}</Text>
      </ScrollView>
    </View>
  );
}

function Section({ theme, icon, title, children }: { theme: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: theme.paper, borderColor: theme.frameSoft }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.frameSoft }]}>
          <Ionicons name={icon} size={18} color={theme.frame} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Item({ theme, label, value }: { theme: Theme; label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.itemValue, { color: theme.ink }]}>{value}</Text>
    </View>
  );
}

function Source({ theme, title, text }: { theme: Theme; title: string; text: string }) {
  return (
    <View style={styles.source}>
      <Text style={[styles.sourceTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

function Bullet({ theme, text }: { theme: Theme; text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name="checkmark" size={16} color={theme.frame} />
      <Text style={[styles.body, { color: theme.ink, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },

  verifyCard: { borderRadius: 22, padding: 16, gap: 8 },
  verifyHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  verifyTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  verifySub: { color: '#fff', opacity: 0.85, fontSize: 12.5, marginTop: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkLabel: { color: '#fff', fontSize: 13.5, fontWeight: '800', width: 72 },
  checkDetail: { color: '#fff', fontSize: 13.5, flex: 1, opacity: 0.95 },

  section: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  item: { gap: 1 },
  itemLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  itemValue: { fontSize: 14.5 },
  source: { gap: 2 },
  sourceTitle: { fontSize: 14.5, fontWeight: '700' },
  body: { fontSize: 13.5, lineHeight: 20 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
