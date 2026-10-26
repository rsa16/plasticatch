import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** The two app themes. The camera and verifying screens are always dark, whatever this is. */
export type ThemeScheme = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  line: string;
  brand: string;
  onBrand: string;
  accent: string;
  onAccent: string;
  accentTint: string;
  lime: string;
  gold: string;
  streak: string;
  danger: string;
  onDanger: string;
  /** Full-screen scrim over a live camera preview or the map. */
  scrim: string;
  /** The HUD card colour used over the camera preview. */
  hudSurface: string;
};

export type ThemeType = {
  display: TextStyle;
  title: TextStyle;
  heading: TextStyle;
  body: TextStyle;
  label: TextStyle;
  caption: TextStyle;
  numeric: TextStyle;
};

export type Theme = {
  scheme: ThemeScheme;
  color: ThemeColors;
  type: ThemeType;
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    huge: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  elevation: {
    floating: ViewStyle;
  };
};

/** Gabarito is bundled for display type; body copy stays on the platform face. */
export const DisplayFont = {
  regular: 'Gabarito_400Regular',
  medium: 'Gabarito_500Medium',
  semibold: 'Gabarito_600SemiBold',
  bold: 'Gabarito_700Bold',
  extraBold: 'Gabarito_800ExtraBold',
  black: 'Gabarito_900Black',
} as const;

const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

const floatingElevation: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#08140D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  android: { elevation: 6 },
  default: {
    boxShadow: '0px 6px 14px rgba(8, 20, 13, 0.16)',
  },
});

function createType(display: (weight: keyof typeof DisplayFont) => string): ThemeType {
  return {
    display: {
      fontFamily: display('extraBold'),
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.4,
    },
    title: {
      fontFamily: display('bold'),
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    heading: {
      fontFamily: display('bold'),
      fontSize: 18,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '400',
    },
    label: {
      fontFamily: display('semibold'),
      fontSize: 14,
      lineHeight: 18,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    numeric: {
      fontFamily: display('extraBold'),
      fontSize: 32,
      lineHeight: 36,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
  };
}

const lightColors: ThemeColors = {
  bg: '#F4F7F2',
  surface: '#FFFFFF',
  surfaceSunken: '#E6EDE4',
  ink: '#0E1F16',
  inkMuted: '#4E6558',
  line: '#CBD9CC',
  brand: '#193328',
  onBrand: '#F4F7F2',
  accent: '#2C7250',
  onAccent: '#F7FBF8',
  accentTint: '#DFF0E6',
  lime: '#C8F169',
  gold: '#F4C542',
  streak: '#FF6B2C',
  danger: '#B23A3A',
  onDanger: '#FFF7F6',
  scrim: 'rgba(8, 18, 12, 0.82)',
  hudSurface: 'rgba(18, 33, 26, 0.94)',
};

const darkColors: ThemeColors = {
  bg: '#0B1510',
  surface: '#12211A',
  surfaceSunken: '#0F1C15',
  ink: '#E9F3EC',
  inkMuted: '#9FB5A6',
  line: '#294034',
  brand: '#193328',
  onBrand: '#F4F7F2',
  accent: '#5BC08C',
  onAccent: '#08120C',
  accentTint: '#1B3327',
  lime: '#C8F169',
  gold: '#F4C542',
  streak: '#FF6B2C',
  danger: '#FF7A6E',
  onDanger: '#1A0A08',
  scrim: 'rgba(4, 10, 7, 0.84)',
  hudSurface: 'rgba(18, 33, 26, 0.94)',
};

export const lightTheme: Theme = {
  scheme: 'light',
  color: lightColors,
  type: createType((weight) => DisplayFont[weight]),
  space,
  radius,
  elevation: { floating: floatingElevation },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  color: darkColors,
  type: createType((weight) => DisplayFont[weight]),
  space,
  radius,
  elevation: { floating: floatingElevation },
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
