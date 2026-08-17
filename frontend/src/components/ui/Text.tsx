import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { colors, typography, type TypographyKey } from '../../theme';

export interface AppTextProps extends RNTextProps {
  variant?: TypographyKey;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

/** Tipografi ölçeğine bağlı tek metin bileşeni */
export const Text: React.FC<AppTextProps> = ({
  variant = 'body',
  color = colors.text,
  align,
  weight,
  style,
  children,
  ...rest
}) => (
  <RNText
    style={[
      typography[variant] as TextStyle,
      { color },
      align ? { textAlign: align } : null,
      weight ? { fontWeight: weight } : null,
      style,
    ]}
    {...rest}
  >
    {children}
  </RNText>
);
