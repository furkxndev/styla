import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { OCCASIONS } from '../../constants/occasions';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import type { Occasion } from '../../types/outfit';
import { Text } from '../ui/Text';

interface OccasionSelectorProps {
  value: Occasion;
  onChange: (occasion: Occasion) => void;
  disabled?: boolean;
  /** Bugün için kombini hazır olan ortamlar: geçiş beklemesiz olur */
  readyOccasions?: Occasion[];
  /** Kombini şu an hazırlanan ortam */
  pendingOccasion?: Occasion | null;
}

/**
 * "Bugün nereye gidiyorsun?" seçici.
 *
 * Çip yerine kutucuk: ikon + ad birlikte durduğu için tarama kolay, dokunma
 * alanı büyük. Hazır kombini olan ortamlarda küçük bir nokta görünür —
 * kullanıcı hangi geçişin anında olacağını önceden bilir.
 */
export const OccasionSelector: React.FC<OccasionSelectorProps> = ({
  value,
  onChange,
  disabled,
  readyOccasions = [],
  pendingOccasion = null,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.content}
  >
    {OCCASIONS.map((occasion) => {
      const selected = value === occasion.key;
      const pending = pendingOccasion === occasion.key;
      const ready = readyOccasions.includes(occasion.key);
      const fg = selected ? colors.primaryText : colors.text;

      return (
        <Pressable
          key={occasion.key}
          accessibilityRole="button"
          accessibilityState={{ selected, disabled: !!disabled }}
          accessibilityLabel={
            ready && !selected ? `${occasion.label}, kombin hazır` : occasion.label
          }
          accessibilityHint={occasion.description}
          disabled={disabled}
          onPress={() => {
            if (selected) return;
            Haptics.selectionAsync().catch(() => undefined);
            onChange(occasion.key);
          }}
          style={({ pressed }) => [
            styles.tile,
            selected ? styles.tileSelected : shadows.xs,
            pressed && styles.tilePressed,
            disabled && !pending && styles.tileDisabled,
          ]}
        >
          <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
            {pending ? (
              <ActivityIndicator
                size="small"
                color={selected ? colors.primaryText : colors.accent}
              />
            ) : (
              <Ionicons
                name={occasion.icon}
                size={18}
                color={selected ? colors.primaryText : colors.accentDark}
              />
            )}
          </View>

          <Text variant="captionStrong" color={fg} numberOfLines={1} style={styles.label}>
            {occasion.shortLabel}
          </Text>

          {/* Hazır kombin göstergesi: seçili kutucukta zaten ekranda olduğu için gizli */}
          {ready && !selected && !pending && <View style={styles.readyDot} />}
        </Pressable>
      );
    })}
  </ScrollView>
);

const TILE_WIDTH = 84;

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: layout.cardPadding,
    paddingBottom: spacing.xs,
  },
  tile: {
    width: TILE_WIDTH,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tileSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tilePressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  tileDisabled: { opacity: 0.5 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Seçili kutucukta koyu zemin üzerinde hafif bir kontrast katmanı
  iconBoxSelected: { backgroundColor: 'rgba(255,255,255,0.14)' },
  label: { ...typography.captionStrong, fontSize: 11.5 },
  readyDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
});
