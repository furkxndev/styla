export { colors, palette, weatherGradients } from './colors';
export type { ColorKey } from './colors';
export { typography } from './typography';
export type { TypographyKey } from './typography';
export { spacing, radius, layout } from './spacing';
export type { Spacing } from './spacing';
export { shadows } from './shadows';

import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, layout } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  layout,
  shadows,
} as const;

export type Theme = typeof theme;
