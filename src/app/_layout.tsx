import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppLoading } from '@/loading/AppLoading';
import { SetupMeasurer } from '@/reader/LineMeasurer';
import { QURAN_FONT } from '@/reader/MushafPage';
import { initReminder } from '@/reminder/reminder';
import { useReaderStore } from '@/store/reader-store';
import { THEMES } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [QURAN_FONT]: require('../../assets/fonts/AlQuranNeo5x3-Arabic.ttf'),
    ...Ionicons.font,
  });
  const theme = THEMES[useReaderStore((s) => s.theme)];

  // Daily reading reminder: offered on first launch, kept scheduled afterwards. Waits for the first
  // screen so the permission question appears over the app, not over the splash screen.
  useEffect(() => {
    if (fontsLoaded) initReminder();
  }, [fontsLoaded]);

  // Continues the splash screen with a small animation until the Quran font is ready.
  if (!fontsLoaded) return <AppLoading />;

  return (
    <>
    {/* New install: measures the Quran lines for this phone in small steps, starting while the
        welcome screens show (see LineMeasurer). Renders nothing once done. */}
    <SetupMeasurer />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="read" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
      {/* First launch only; no swipe-back, the screens end with their own buttons. */}
      <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
    </>
  );
}
