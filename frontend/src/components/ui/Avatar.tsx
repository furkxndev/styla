import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, typography } from '../../theme';
import { initials } from '../../utils/format';
import { Text } from './Text';

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, uri, size = 48 }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius.pill }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={name}
    >
      <Text
        style={[typography.title3, { color: colors.primaryText, fontSize: size * 0.36 }]}
      >
        {initials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
