import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

/** Same colour and image as the native splash screen (app.json), so the hand-over is seamless. */
const SPLASH_BG = '#013219';
const GOLD = '#D8B45A';
const ICON_W = 220;
const BAR_W = 140;
const SLIDER_W = 46;

type Colors = { bg: string; accent: string; text: string };

/**
 * Animated loading screen. Shown while the app starts (it continues the splash screen: same
 * background and icon, which then gently breathes, with a moving bar below), and, with the theme's
 * colours, while the reader prepares its pages the first time.
 */
export function AppLoading({ label = 'Preparing the mushaf', colors }: { label?: string; colors?: Partial<Colors> }) {
  const c: Colors = { bg: SPLASH_BG, accent: GOLD, text: 'rgba(255,255,255,0.75)', ...colors };
  const [breathe] = useState(() => new Animated.Value(0));
  const [slide] = useState(() => new Animated.Value(0));
  const [fadeIn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.timing(slide, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ),
    ];
    loops.forEach((l) => l.start());
    // The bar and label appear after a moment, so a quick start shows only the (still) splash icon.
    const show = Animated.timing(fadeIn, { toValue: 1, duration: 300, delay: 250, useNativeDriver: true });
    show.start();
    return () => {
      loops.forEach((l) => l.stop());
      show.stop();
    };
  }, [breathe, slide, fadeIn]);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-SLIDER_W, BAR_W] });

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]} accessibilityRole="progressbar" accessibilityLabel={`${label}…`}>
      {colors ? null : (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.icon} resizeMode="contain" />
        </Animated.View>
      )}
      <Animated.View style={[styles.below, colors ? null : styles.belowIcon, { opacity: colors ? 1 : fadeIn }]}>
        <View style={[styles.track, { backgroundColor: c.accent + '33' }]}>
          <Animated.View style={[styles.slider, { backgroundColor: c.accent, transform: [{ translateX }] }]} />
        </View>
        <Text style={[styles.label, { color: c.text }]}>{label}…</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON_W, height: ICON_W },
  // Keeps the icon exactly where the native splash draws it (centred), with the bar hanging below.
  belowIcon: { position: 'absolute', top: '50%', marginTop: ICON_W / 2 + 28 },
  below: { alignItems: 'center', gap: 12 },
  track: { width: BAR_W, height: 4, borderRadius: 2, overflow: 'hidden' },
  slider: { width: SLIDER_W, height: 4, borderRadius: 2 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
});
