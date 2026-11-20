import { I18nManager, Text, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { SIGN_PAD_EM, TRAILING_SIGN } from './layout';

// Words flow right-to-left. If the device runs the app in RTL mode, 'row' is already right-to-left.
export const RTL_ROW = I18nManager.isRTL ? 'row' : 'row-reverse';
// Left side of a box (where trailing waqf signs are drawn).
const LEFT_PAD = I18nManager.isRTL ? 'paddingEnd' : 'paddingLeft';

/**
 * One word unit as drawn on a line: a single Text. Used by both the page and the startup measurer so
 * widths agree. On Android/web the unit's inner spaces are U+202F joiner spaces (see pages.ts), so it
 * never splits or wraps. On iOS ("word ۚ" with a normal space) a word ending in a waqf sign gets
 * padding on its left, because the font draws the sign slightly past the word's box.
 */
export function WordUnit({
  text, style, fontSize, onLayout,
}: {
  text: string; style: StyleProp<TextStyle>; fontSize: number; onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <Text
      style={TRAILING_SIGN.test(text) ? [style, { [LEFT_PAD]: fontSize * SIGN_PAD_EM }] : style}
      allowFontScaling={false}
      onLayout={onLayout}
    >
      {text}
    </Text>
  );
}
