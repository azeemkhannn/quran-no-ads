import { Redirect } from 'expo-router';
import { HomeScreen } from '@/home/HomeScreen';
import { useReaderStore } from '@/store/reader-store';

export default function Index() {
  // New install: show the welcome screens first (once).
  const welcomed = useReaderStore((s) => s.welcomed);
  if (!welcomed) return <Redirect href="/welcome" />;
  return <HomeScreen />;
}
