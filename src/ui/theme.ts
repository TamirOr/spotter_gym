// Design tokens from the Spotter mockups.
export const colors = {
  ink: '#141714',
  muted: '#5F665F',
  background: '#FFFFFF',
  surface: '#F2F4EE',
  line: '#EEF0EB',
  track: '#E3E6DF',
  fieldBorder: '#C9CEC6',
  accent: '#C6F24E',
  inverseMuted: '#B4BBB3',
  scrim: 'rgba(20, 23, 20, 0.45)',
} as const;

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semibold: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radii = { sm: 12, md: 16, lg: 22, sheet: 24, round: 999 } as const;

/** Minimum size of anything tappable. */
export const TOUCH_TARGET = 44;
