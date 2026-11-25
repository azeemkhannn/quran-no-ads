import { I18nManager, Text, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';

// Words flow right-to-left. If the device runs the app in RTL mode, 'row' is already right-to-left.
export const RTL_ROW = I18nManager.isRTL ? 'row' : 'row-reverse';

/**
 * One unit as drawn on a line: a word (with its waqf signs) or an ayah marker, as a single Text.
 * Used by both the page and the startup measurer so widths agree. The text is shown exactly as in
 * QuranWBW's IndoPak v5.4, which renders correctly on Android and iOS without any changes.
 */
export function WordUnit({
  text, style, onLayout,
}: {
  text: string; style: StyleProp<TextStyle>; fontSize?: number; onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <Text style={style} allowFontScaling={false} onLayout={onLayout}>
      {text}
    </Text>
  );
}
