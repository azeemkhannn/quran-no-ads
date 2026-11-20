import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme';

/**
 * "Go to page" dialog. It sits in the upper part of the screen so the keyboard never covers it
 * (on iOS and Android alike), and it always opens with an empty field.
 */
export function GoToPageDialog({
  visible, current, total, theme, onClose, onGo,
}: {
  visible: boolean; current: number; total: number; theme: Theme;
  onClose: () => void; onGo: (page: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  // Cleared on every close, so the dialog always opens with an empty field.
  const close = () => {
    setValue('');
    onClose();
  };

  const n = parseInt(value, 10);
  const valid = n >= 1 && n <= total;

  const submit = () => {
    if (!valid) return;
    onGo(n);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
        <Pressable
          // Inner Pressable swallows taps so tapping the card doesn't close the dialog.
          onPress={() => {}}
          style={[styles.card, { marginTop: insets.top + 72, backgroundColor: theme.paper, borderColor: theme.frame }]}
        >
          <View style={styles.titleRow}>
            <Ionicons name="book-outline" size={20} color={theme.frame} />
            <Text style={[styles.title, { color: theme.ink }]}>Go to page</Text>
          </View>
          <Text style={[styles.hint, { color: theme.muted }]}>
            You are on page {current}. Enter 1 – {total}.
          </Text>

          <TextInput
            value={value}
            onChangeText={(t) => setValue(t.replace(/\D/g, '').slice(0, 3))}
            onSubmitEditing={submit}
            autoFocus
            keyboardType="number-pad"
            returnKeyType="go"
            placeholder="Page number"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Page number"
            style={[styles.input, { color: theme.ink, borderColor: valid || !value ? theme.frame : '#C0392B', backgroundColor: theme.frameSoft }]}
          />
          {!!value && !valid && <Text style={styles.error}>Page must be between 1 and {total}.</Text>}

          <View style={styles.buttons}>
            <Pressable
              onPress={close}
              style={({ pressed }) => [styles.btn, styles.btnGhost, { borderColor: theme.frame, opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: theme.frame }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!valid}
              style={({ pressed }) => [styles.btn, { backgroundColor: theme.frame, opacity: !valid ? 0.4 : pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: theme.paper }]}>Go</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.paper} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center' },
  card: {
    width: '86%', maxWidth: 360, borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 14 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, fontSize: 22, fontWeight: '600', textAlign: 'center', paddingVertical: 0 },
  error: { color: '#C0392B', fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnGhost: { borderWidth: 1.5 },
  btnText: { fontSize: 16, fontWeight: '700' },
});
