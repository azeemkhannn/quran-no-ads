export type ThemeName = 'light' | 'sepia' | 'night';

/** Ionicons glyph names (from @expo/vector-icons). */
export type ThemeIcon = 'sunny-outline' | 'cafe-outline' | 'moon-outline';

export type Theme = {
  name: ThemeName;
  label: string;
  icon: ThemeIcon;
  bg: string; // app background around the page
  paper: string; // page background
  ink: string; // Quran text
  frame: string; // ornamental borders
  frameSoft: string;
  muted: string; // header/footer labels
  statusBar: 'dark' | 'light';
};

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: 'light', label: 'Light', icon: 'sunny-outline',
    bg: '#EFE9DA', paper: '#FFFCF4', ink: '#151515',
    frame: '#1F6F5B', frameSoft: '#D9E8DF', muted: '#5B6B63', statusBar: 'dark',
  },
  sepia: {
    name: 'sepia', label: 'Sepia', icon: 'cafe-outline',
    bg: '#E3D3B0', paper: '#F5E9CF', ink: '#2B1E0F',
    frame: '#8A5A1C', frameSoft: '#EAD8B2', muted: '#7A6040', statusBar: 'dark',
  },
  night: {
    name: 'night', label: 'Night', icon: 'moon-outline',
    bg: '#000000', paper: '#000000', ink: '#E9E3D3',
    frame: '#C9A54A', frameSoft: '#1C1A14', muted: '#9C9584', statusBar: 'light',
  },
};

export const THEME_ORDER: ThemeName[] = ['light', 'sepia', 'night'];
