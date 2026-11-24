import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QURAN_FONT } from '@/reader/MushafPage';
import { initReminder } from '@/reminder/reminder';
import { useReaderStore } from '@/store/reader-store';
import { THEMES } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [QURAN_FONT]: require('../../assets/fonts/IndoPakNastaleeq.ttf'),
    ...Ionicons.font,
  });
  const theme = THEMES[useReaderStore((s) => s.theme)];

  // Daily reading reminder: offered on first launch, kept scheduled afterwards. Waits for the first
  // screen so the permission question appears over the app, not over the splash screen.
  useEffect(() => {
    if (fontsLoaded) initReminder();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.frame} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="read" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
      {/* First launch only; no swipe-back, the screens end with their own buttons. */}
      <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
