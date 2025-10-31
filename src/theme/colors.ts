// Roblox-inspired color system for Vocab Streak

export const RobloxTheme = {
  // Primary brand color - Roblox vivid blue
  primary: '#1446FF',
  primaryDark: '#0D32CC',
  primaryLight: '#3D66FF',

  // Dark theme backgrounds
  background: '#0A0A0F', // Deep black with slight blue tint
  backgroundElevated: '#1A1A24', // Elevated surfaces (cards, panels)
  backgroundHighlight: '#242430', // Hover/pressed states

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B4B4BE',
  textTertiary: '#7A7A87',

  // Success states (correct answers)
  success: '#00C896',
  successBg: '#0A2A23',
  successBorder: '#00C896',

  // Warning states (hints, wrong answers)
  warning: '#FFB800',
  warningBg: '#2A2310',
  warningBorder: '#FFB800',

  // Error/incorrect
  error: '#FF3B5C',
  errorBg: '#2A0A0F',
  errorBorder: '#FF3B5C',

  // Neutral grays
  gray900: '#0F0F14',
  gray800: '#1A1A24',
  gray700: '#242430',
  gray600: '#393946',
  gray500: '#4F4F5C',
  gray400: '#7A7A87',
  gray300: '#B4B4BE',
  gray200: '#D4D4DC',
  gray100: '#E8E8ED',

  // Borders and dividers
  border: '#393946',
  borderLight: '#242430',

  // Special effects
  shadow: 'rgba(20, 70, 255, 0.3)', // Blue-tinted shadow
  overlay: 'rgba(10, 10, 15, 0.9)',
};

// Typography scale (matching Roblox's bold, clear style)
export const Typography = {
  // Heading sizes
  h1: {
    fontSize: 36,
    fontWeight: '700' as '700',
    lineHeight: 44,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as '700',
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as '700',
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as '600',
    lineHeight: 28,
  },

  // Body text
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as '400',
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as '400',
    lineHeight: 20,
  },

  // UI labels
  label: {
    fontSize: 14,
    fontWeight: '600' as '600',
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as '600',
    lineHeight: 16,
  },
};

// Spacing scale (8px base unit like Roblox)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius scale
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
