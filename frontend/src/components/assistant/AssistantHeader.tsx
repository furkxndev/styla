import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, spacing } from '../../theme';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';
import { AssistantAvatar } from './AssistantAvatar';

interface AssistantHeaderProps {
  /** Gardıroptaki parça sayısı: asistanın neyi bildiğini somutlaştırır */
  itemCount: number;
  /** Sohbet başlamışsa temizleme düğmesi görünür */
  canClear: boolean;
  onClear: () => void;
  /** Liste kaydırıldığında alt ayraç belirir; başlık içerikten ayrışır */
  elevated?: boolean;
}

/**
 * Sabit üst başlık. Kart içine alınmadı: sohbet ekranında başlık
 * bir "içerik bloğu" değil, uygulama çubuğu gibi davranmalı.
 */
export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  itemCount,
  canClear,
  onClear,
  elevated = false,
}) => {
  const dividerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dividerOpacity, {
      toValue: elevated ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [elevated, dividerOpacity]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <AssistantAvatar size={40} online />

        <View style={styles.texts}>
          <Text variant="title3" numberOfLines={1}>
            Stil Asistanı
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {itemCount > 0 ? `Hazır · ${itemCount} parçayı biliyor` : 'Hazır'}
            </Text>
          </View>
        </View>

        {canClear && (
          <IconButton
            icon="create-outline"
            accessibilityLabel="Yeni sohbet başlat"
            onPress={onClear}
            bordered
            background={colors.surface}
            color={colors.textSecondary}
            size={18}
          />
        )}
      </View>

      <Animated.View style={[styles.divider, { opacity: dividerOpacity }]} />
    </View>
  );
};

/** Başlıkta ve intro'da tekrar eden küçük bilgi etiketi */
export const MetaPill: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = ({ icon, label }) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={12} color={colors.textSecondary} />
    <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  // flex: 1 — uzun durum metni sağdaki düğmeyi ekrandan itmesin
  texts: { flex: 1, gap: spacing.xxs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
});
