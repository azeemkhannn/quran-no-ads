import { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyQuranData } from '@/data/pages';
import { RATE_SUPPORTED, openStorePage } from '@/review/review';
import { useReaderStore } from '@/store/reader-store';
import { THEMES, type Theme } from '@/theme';

const DEVELOPER = { name: 'Azeem Ullah Khan', email: 'azeemkhannnn7@gmail.com' } as const;

/** Opens the phone's mail app with a mistake report addressed to the developer. */
function reportMistake() {
  const subject = encodeURIComponent('Al Quran – mistake report');
  const body = encodeURIComponent('Page:\nLine:\nWhat is different from the printed mushaf:\n');
  Linking.openURL(`mailto:${DEVELOPER.email}?subject=${subject}&body=${body}`).catch(() => {
    Alert.alert('No email app found', `Please write to ${DEVELOPER.email} with the page and line number.`);
  });
}

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
        {/* Developer */}
        <View style={[styles.devCard, { backgroundColor: theme.paper, borderColor: theme.frameSoft }]}>
          <View style={styles.devHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.devKicker, { color: theme.frame }]}>DEVELOPER</Text>
              <Text style={[styles.devName, { color: theme.ink }]}>{DEVELOPER.name}</Text>
              <Text style={[styles.devEmail, { color: theme.muted }]} selectable>
                {DEVELOPER.email}
              </Text>
            </View>
          </View>
          <View style={[styles.notForSale, { borderColor: theme.frame }]}>
            <Ionicons name="pricetag-outline" size={16} color={theme.frame} />
            <Text style={[styles.notForSaleText, { color: theme.frame }]}>THIS APP IS NOT FOR SALE</Text>
          </View>
          <View style={[styles.duaBox, { backgroundColor: theme.frameSoft }]}>
            <Ionicons name="heart" size={18} color={theme.frame} />
            <Text style={[styles.duaText, { color: theme.ink }]}>
              It is free for everyone, forever, with no ads. In return, please make dua for my mother and father.
            </Text>
          </View>
          <Pressable
            onPress={reportMistake}
            accessibilityRole="button"
            accessibilityLabel={`Report a mistake by email to ${DEVELOPER.email}`}
            style={({ pressed }) => [styles.reportBtn, { backgroundColor: theme.frame, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="mail-outline" size={18} color={theme.paper} />
            <Text style={[styles.reportText, { color: theme.paper }]}>Report a mistake</Text>
          </Pressable>
        </View>

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
          <Item theme={theme} label="Script" value="IndoPak (QuranWBW v5.4, Hanafi), as printed in South Asia" />
          <Item theme={theme} label="Layout" value="13 lines per page, Taj Company print, 847 pages" />
          <Item theme={theme} label="Riwayah" value="Hafs ʿan ʿĀṣim" />
          <Item theme={theme} label="Contents" value="114 surahs · 30 paras · 6,236 ayahs" />
          <Item theme={theme} label="Signs" value="Waqf signs, ruku (ع) and ayah markers as in the print" />
        </Section>

        <Section theme={theme} icon="library-outline" title="Sources">
          <Source
            theme={theme}
            title="Quran text and font"
            text="IndoPak Quran text v5.4 (Hanafi) and the AlQuranNeo font by QuranWBW.com (Ayman Siddiqui & R. Siddiqua), used with prior written permission from QuranWBW, unmodified, and only for displaying the Quran text. Made as Sadaqa-e-Jaria."
          />
          <Source
            theme={theme}
            title="Copyright holders"
            text="© Ayman Siddiqui · © Al-Qalam and Ghandhara Software · © King Fahd Glorious Quran Printing Complex (KFGQPC). All rights remain with their respective owners."
          />
          <Source
            theme={theme}
            title="Text sources & font development"
            text="Text: KFGQPC, TypeMyBook.com (Ata Rafi), InPage Quran publishing resources. Font: Ayman Siddiqui & R. Siddiqua, the Al-Qalam font project, Ghandhara Software, KFGQPC (ayah numbers)."
          />
          <Source
            theme={theme}
            title="Verification of the text"
            text="Hafiz Muhammad Zain Viqar (Content Lead, Deen App) and his team of huffaz: Hafiz Muavia bin Muhammad Haneef, Hafiz Ali Ahmed bin Aftab Ahmed, Hafiz Abdul Rehman bin Ramzan."
          />
          <Source
            theme={theme}
            title="Special thanks"
            text="Abdul Majeed Khan, Arif Karim, Shakir-ul-Qadree and Jawad (Al Qalam Quran Majeed font), and everyone who helped digitise, verify and preserve the Quranic text."
          />
          <Source
            theme={theme}
            title="Page layout"
            text="“Indopak 13 lines layout (Taj company)” from the Quranic Universal Library (QUL) by Tarteel. It places every word on its page and line exactly as in the printed mushaf."
          />
          <Source
            theme={theme}
            title="Surah names & para divisions"
            text="QUL Quran metadata. The para names are the traditional IndoPak names (الٓمّٓ, سَيَقُوْلُ …)."
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
            you notice anything that differs from your printed copy, please note the page and line number and email{' '}
            {DEVELOPER.email}, so it can be corrected for everyone.
          </Text>
          <Pressable
            onPress={reportMistake}
            accessibilityRole="button"
            accessibilityLabel={`Report a mistake by email to ${DEVELOPER.email}`}
            style={({ pressed }) => [styles.reportBtnOutline, { borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="mail-outline" size={17} color={theme.frame} />
            <Text style={[styles.reportText, { color: theme.frame }]}>Email a correction</Text>
          </Pressable>
        </Section>

        {RATE_SUPPORTED && (
          <Pressable
            onPress={openStorePage}
            accessibilityRole="button"
            accessibilityLabel="Rate this app on Google Play"
            style={({ pressed }) => [styles.reportBtnOutline, { borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="star-outline" size={17} color={theme.frame} />
            <Text style={[styles.reportText, { color: theme.frame }]}>Rate this app</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push({ pathname: '/welcome', params: { again: '1' } })}
          accessibilityRole="button"
          accessibilityLabel="Show the welcome screens again"
          style={({ pressed }) => [styles.reportBtnOutline, { borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="sparkles-outline" size={17} color={theme.frame} />
          <Text style={[styles.reportText, { color: theme.frame }]}>Show welcome again</Text>
        </Pressable>

        <Text style={[styles.footer, { color: theme.muted }]}>Al Quran · version {version}</Text>
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

  devCard: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 14 },
  devHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  devKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  devName: { fontSize: 19, fontWeight: '800', marginTop: 2 },
  devEmail: { fontSize: 13.5, marginTop: 2 },
  notForSale: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5,
    borderStyle: 'dashed', borderRadius: 12, paddingVertical: 8,
  },
  notForSaleText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  duaBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 12 },
  duaText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  reportBtn: { height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reportBtnOutline: {
    height: 42, borderRadius: 21, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  reportText: { fontSize: 15, fontWeight: '700' },

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
