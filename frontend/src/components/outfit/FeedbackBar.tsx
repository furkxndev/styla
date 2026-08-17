import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DISLIKE_REASONS } from '../../constants/occasions';
import { colors, radius, spacing } from '../../theme';
import type { DislikeReason, Outfit } from '../../types/outfit';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';

interface FeedbackBarProps {
  outfit: Outfit;
  onLike: () => void;
  onDislike: (reason?: DislikeReason) => void;
  onRegenerate: () => void;
  onWear: () => void;
  regenerating?: boolean;
}

/**
 * Kombin değerlendirme çubuğu.
 * Beğenilmediğinde nedeni sorar — bu neden AI'ın öğrenmesi için kaydedilir.
 */
export const FeedbackBar: React.FC<FeedbackBarProps> = ({
  outfit,
  onLike,
  onDislike,
  onRegenerate,
  onWear,
  regenerating = false,
}) => {
  const [reasonSheetOpen, setReasonSheetOpen] = useState(false);
  const liked = outfit.feedback === 'liked';
  const worn = outfit.feedback === 'worn' || !!outfit.wornAt;

  const handleLike = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    onLike();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <FeedbackButton
          icon={liked ? 'heart' : 'heart-outline'}
          label="Beğendim"
          active={liked}
          activeColor={colors.danger}
          onPress={handleLike}
        />
        <FeedbackButton
          icon="thumbs-down-outline"
          label="Beğenmedim"
          onPress={() => setReasonSheetOpen(true)}
        />
        <FeedbackButton
          icon="refresh"
          label="Yeni kombin"
          onPress={onRegenerate}
          loading={regenerating}
        />
      </View>

      <Button
        label={worn ? 'Bugün bunu giydin ✓' : 'Bugün bunu giydim'}
        icon={worn ? 'checkmark-circle' : 'shirt-outline'}
        variant={worn ? 'secondary' : 'primary'}
        onPress={onWear}
        disabled={worn}
        fullWidth
      />

      <Sheet
        visible={reasonSheetOpen}
        onClose={() => setReasonSheetOpen(false)}
        title="Neyi beğenmedin?"
        subtitle="Bunu öğrenerek bir dahakine daha iyi öneri yapacağım"
      >
        <View style={styles.reasons}>
          {DISLIKE_REASONS.map((reason) => (
            <Pressable
              key={reason.key}
              accessibilityRole="button"
              onPress={() => {
                setReasonSheetOpen(false);
                onDislike(reason.key as DislikeReason);
              }}
              style={({ pressed }) => [styles.reasonRow, pressed && styles.reasonPressed]}
            >
              <Text variant="body">{reason.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
};

const FeedbackButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  loading?: boolean;
}> = ({
  icon,
  label,
  onPress,
  active = false,
  activeColor = colors.accent,
  loading = false,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: active, busy: loading }}
    disabled={loading}
    onPress={() => {
      Haptics.selectionAsync().catch(() => undefined);
      onPress();
    }}
    style={({ pressed }) => [
      styles.feedbackButton,
      active && { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
      (pressed || loading) && { opacity: 0.6 },
    ]}
  >
    <Ionicons name={icon} size={19} color={active ? activeColor : colors.textSecondary} />
    <Text variant="caption" color={active ? activeColor : colors.textSecondary}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  iconRow: { flexDirection: 'row', gap: spacing.sm },
  feedbackButton: {
    flex: 1,
    height: 62,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  reasons: { gap: spacing.xs },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonPressed: { opacity: 0.7 },
});
