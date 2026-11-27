import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readerStore, type ReminderTime } from '@/store/reader-store';
import type { Theme } from '@/theme';
import { formatTime, setReminderTime, turnOffReminder, turnOnReminder } from './reminder';

const MINUTE_STEP = 5;
const PRESETS: { label: string; time: ReminderTime }[] = [
  { label: 'Early', time: { hour: 5, minute: 0 } },
  { label: 'Morning', time: { hour: 7, minute: 0 } },
  { label: 'Evening', time: { hour: 18, minute: 0 } },
  { label: 'Night', time: { hour: 21, minute: 0 } },
];

const same = (a: ReminderTime, b: ReminderTime) => a.hour === b.hour && a.minute === b.minute;

/**
 * Daily reminder settings, opened from the bell on Home: on/off and the time.
 * Nothing changes until Save. Mount it only while open, so it starts from the saved settings.
 */
export function ReminderSheet({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const saved = readerStore.getState();
  const [on, setOn] = useState(saved.reminder === true);
  const [time, setTime] = useState<ReminderTime>(saved.reminderTime);
  const [busy, setBusy] = useState(false);

  const stepHour = (d: number) => setTime((t) => ({ ...t, hour: (t.hour + d + 24) % 24 }));
  const stepMinute = (d: number) =>
    setTime((t) => ({ ...t, minute: (Math.round(t.minute / MINUTE_STEP) * MINUTE_STEP + d * MINUTE_STEP + 60) % 60 }));
  const setHalf = (pm: boolean) => setTime((t) => ({ ...t, hour: (t.hour % 12) + (pm ? 12 : 0) }));
  const pm = time.hour >= 12;

  const save = async () => {
    setBusy(true);
    const wasOn = readerStore.getState().reminder === true;
    await setReminderTime(time); // saves, and reschedules if the reminder is already on
    if (on && !wasOn) {
      const result = await turnOnReminder();
      if (result === 'blocked') {
        setBusy(false);
        onClose();
        Alert.alert('Notifications are off', 'To get the daily reminder, allow notifications for Al Quran in your phone settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    } else if (!on && wasOn) {
      await turnOffReminder();
    }
    setBusy(false);
    onClose();
    Alert.alert(
      on ? 'Daily reminder on' : 'Daily reminder off',
      on ? `You will get a reminder to read every day at ${formatTime(time)}.` : 'You will no longer get the daily reading reminder.',
    );
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.paper, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: theme.frameSoft }]} />

        <View style={styles.headRow}>
          <View style={[styles.headIcon, { backgroundColor: theme.frameSoft }]}>
            <Ionicons name="notifications" size={20} color={theme.frame} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.ink }]}>Daily reminder</Text>
            <Text style={[styles.sub, { color: theme.muted }]}>One notification a day to read. Works offline.</Text>
          </View>
          <Switch
            value={on}
            onValueChange={setOn}
            trackColor={{ true: theme.frame, false: theme.frameSoft }}
            thumbColor={theme.paper}
            accessibilityLabel="Daily reminder"
          />
        </View>

        <View style={[styles.timeBlock, { opacity: on ? 1 : 0.4 }]} pointerEvents={on ? 'auto' : 'none'}>
          <Text style={[styles.label, { color: theme.muted }]}>REMIND ME AT</Text>

          <View style={styles.clock}>
            <Stepper theme={theme} label="Hour" value={String(time.hour % 12 === 0 ? 12 : time.hour % 12)} onStep={stepHour} />
            <Text style={[styles.colon, { color: theme.ink }]}>:</Text>
            <Stepper theme={theme} label="Minute" value={String(time.minute).padStart(2, '0')} onStep={stepMinute} />
            <View style={[styles.ampm, { borderColor: theme.frame }]}>
              {(['AM', 'PM'] as const).map((p) => {
                const sel = (p === 'PM') === pm;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setHalf(p === 'PM')}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    style={[styles.ampmItem, sel && { backgroundColor: theme.frame }]}
                  >
                    <Text style={[styles.ampmText, { color: sel ? theme.paper : theme.frame }]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const sel = same(p.time, time);
              return (
                <Pressable
                  key={p.label}
                  onPress={() => setTime(p.time)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label}, ${formatTime(p.time)}`}
                  style={[styles.preset, { borderColor: theme.frame, backgroundColor: sel ? theme.frame : 'transparent' }]}
                >
                  <Text style={[styles.presetLabel, { color: sel ? theme.paper : theme.frame }]}>{p.label}</Text>
                  <Text style={[styles.presetTime, { color: sel ? theme.paper : theme.muted }]}>{formatTime(p.time)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btn, styles.btnGhost, { borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.btnText, { color: theme.frame }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btn, { backgroundColor: theme.frame, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.btnText, { color: theme.paper }]}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({ theme, label, value, onStep }: { theme: Theme; label: string; value: string; onStep: (d: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onStep(1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} up`}
        style={({ pressed }) => [styles.stepBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-up" size={20} color={theme.frame} />
      </Pressable>
      <Text style={[styles.stepValue, { color: theme.ink }]} accessibilityLabel={`${label} ${value}`}>{value}</Text>
      <Pressable
        onPress={() => onStep(-1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} down`}
        style={({ pressed }) => [styles.stepBtn, { backgroundColor: theme.frameSoft, opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-down" size={20} color={theme.frame} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, gap: 18 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },

  timeBlock: { gap: 14 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  colon: { fontSize: 40, fontWeight: '700', marginTop: -6 },
  stepper: { alignItems: 'center', gap: 6 },
  stepBtn: { width: 54, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 42, fontWeight: '800', minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ampm: { marginLeft: 8, borderWidth: 1.5, borderRadius: 14, overflow: 'hidden' },
  ampmItem: { paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  ampmText: { fontSize: 15, fontWeight: '800' },

  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 8, alignItems: 'center' },
  presetLabel: { fontSize: 13, fontWeight: '800' },
  presetTime: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1.5 },
  btnText: { fontSize: 16, fontWeight: '800' },
});
