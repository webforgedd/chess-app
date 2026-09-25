import { useColorScheme } from 'react-native';

export const palette = {
  dark: {
    bg: '#0D0D0D', surface: '#1A1A1A', surface2: '#262626',
    text: '#FFFFFF', textMuted: '#9A9A9A',
    primary: '#FFFFFF', onPrimary: '#111111',
    lastMove: 'rgba(255,255,255,0.30)', selected: 'rgba(255,255,255,0.55)',
  },
  light: {
    bg: '#F2F2F2', surface: '#FFFFFF', surface2: '#E8E8E8',
    text: '#111111', textMuted: '#6B6B6B',
    primary: '#111111', onPrimary: '#FFFFFF',
    lastMove: 'rgba(0,0,0,0.20)', selected: 'rgba(0,0,0,0.40)',
  },
};

// Board themes (Phase 1 ships "grey"; others are ready for the theme picker)
export const boardThemes = {
  grey: { light: '#E6E6E6', dark: '#8A8A8A' },
  charcoal: { light: '#D0D0D0', dark: '#3A3A3A' },
  mono: { light: '#FFFFFF', dark: '#5C5C5C' },
};

export const radius = { board: 8, button: 12, card: 16 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24 };

export function useTheme() {
  return useColorScheme() === 'light' ? palette.light : palette.dark;
}
