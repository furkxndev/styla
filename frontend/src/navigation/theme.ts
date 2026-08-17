import { DefaultTheme, type Theme } from '@react-navigation/native';
import { colors } from '../theme';

/** React Navigation temasını uygulama paletiyle eşitler */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};
