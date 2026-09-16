/**
 * DirectStay visual foundations.
 *
 * A warm, sober, premium mountain-hospitality palette. Kept as plain tokens (no UI
 * library) so every screen composes the same spacing, radius and color language.
 */

export const colors = {
  background: '#F7F3EC',
  surface: '#FFFFFF',
  surfaceMuted: '#EFE8DC',
  primary: '#2F5D50',
  primaryDark: '#213F36',
  primarySoft: '#DCE8E2',
  accent: '#B4713D',
  accentSoft: '#F1E1D0',
  text: '#20211F',
  textMuted: '#6B6F68',
  textSubtle: '#8C8F87',
  border: '#E3DBCC',
  danger: '#B23B32',
  dangerSoft: '#F6DEDB',
  success: '#2F6B4F',
  successSoft: '#DCEBDF',
  warning: '#8A6114',
  warningSoft: '#F4E7CE',
  info: '#3C5A7A',
  infoSoft: '#DDE6F0',
  neutral: '#6B6F68',
  neutralSoft: '#E7E3DA',
  white: '#FFFFFF',
  overlaySoft: 'rgba(20, 24, 20, 0.18)',
  overlayStrong: 'rgba(20, 24, 20, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export const lineHeight = {
  sm: 18,
  md: 22,
  lg: 26,
  xl: 30,
} as const;

export const control = {
  minTouchSize: 44,
} as const;

export const shadows = {
  card: {
    shadowColor: '#20211F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#20211F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
