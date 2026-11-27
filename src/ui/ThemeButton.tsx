import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { readerStore } from '@/store/reader-store';
import { THEMES, THEME_ORDER, type Theme, type ThemeName } from '@/theme';

/** Filled icons read better than the outline ones on the filled button. */
const FILLED: Record<ThemeName, React.ComponentProps<typeof Ionicons>['name']> = {
  light: 'sunny',
  sepia: 'cafe',
  night: 'moon',
};

/**
 * The theme switch (Light → Sepia → Night), on Home and in the reader. Highlighted on purpose:
 * filled with the theme colour inside a double ring (like the mushaf page frame), three dots for
 * the three themes with the current one marked, and the icon turns when the theme changes.
 * - `pill`: icon, theme name and dots (Home header).
 * - otherwise a round button with just the icon, sized for the reader toolbar.
 */
export function ThemeButton({ theme, pill }: { theme: Theme; pill?: boolean }) {
  const [spin] = useState(() => new Animated.Value(0));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    spin.setValue(0);
    const anim = Animated.timing(spin, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [theme.name, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-120deg', '0deg'] });
  const scale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.15, 1] });
  const next = THEMES[THEME_ORDER[(THEME_ORDER.indexOf(theme.name) + 1) % THEME_ORDER.length]];

  return (
    <Pressable
      onPress={() => readerStore.setTheme(next.name)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${theme.label}. Tap for ${next.label}`}
      style={({ pressed }) => [
        styles.ring,
        pill ? styles.ringPill : styles.ringRound,
        { borderColor: theme.frame, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <View style={[styles.fill, pill ? styles.fillPill : styles.fillRound, { backgroundColor: theme.frame }]}>
        <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
          <Ionicons name={FILLED[theme.name]} size={pill ? 17 : 20} color={theme.paper} />
        </Animated.View>
        {pill && <Text style={[styles.label, { color: theme.paper }]}>{theme.label}</Text>}
        {pill && <Dots theme={theme} />}
      </View>
    </Pressable>
  );
}

/** One dot per theme, in that theme's page colour; the current one is larger, with a ring. */
function Dots({ theme }: { theme: Theme }) {
  return (
    <View style={styles.dots} pointerEvents="none">
      {THEME_ORDER.map((name) => {
        const current = name === theme.name;
        return (
          <View
            key={name}
            style={[
              styles.dot,
              current && styles.dotCurrent,
              { backgroundColor: THEMES[name].paper, borderColor: current ? theme.paper : 'rgba(255,255,255,0.45)' },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer ring with a gap, then the filled button: the same double line as the page frame.
  ring: {
    borderWidth: 1.5, padding: 2,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  ringRound: { width: 46, height: 46, borderRadius: 23 },
  ringPill: { height: 46, borderRadius: 23 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fillRound: { borderRadius: 19 },
  fillPill: { borderRadius: 19, flexDirection: 'row', gap: 7, paddingLeft: 12, paddingRight: 11 },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5, borderWidth: StyleSheet.hairlineWidth },
  dotCurrent: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.2 },
});
