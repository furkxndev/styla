import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, radius, shadows, spacing } from '../../theme';
import type { ChatMessage } from '../../types/assistant';
import type { ClothingItem } from '../../types/clothing';
import { formatTime } from '../../utils/date';
import { Text } from '../ui/Text';
import { AssistantAvatar } from './AssistantAvatar';
import { ReferencedItems } from './ReferencedItems';

/** Avatar genişliği + boşluk: aynı gruptaki mesajlar hizada kalsın */
const AVATAR_SIZE = 28;

interface ChatBubbleProps {
  message: ChatMessage;
  /** Aynı kişinin üst üste mesajlarında avatar ve üst köşe yalnızca ilkinde */
  isFirstInGroup?: boolean;
  /** Kuyruk ve saat grubun son mesajında gösterilir */
  isLastInGroup?: boolean;
  onItemPress?: (item: ClothingItem) => void;
  onOutfitPress?: (message: ChatMessage) => void;
  onRetry?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  onItemPress,
  onOutfitPress,
  onRetry,
}) => {
  const isUser = message.role === 'user';
  const failed = message.status === 'error';
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const animation = {
    opacity: appear,
    transform: [
      {
        translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
        isFirstInGroup ? styles.groupStart : styles.groupContinuation,
        animation,
      ]}
    >
      {!isUser &&
        (isFirstInGroup ? (
          <AssistantAvatar size={AVATAR_SIZE} style={styles.avatar} />
        ) : (
          <View style={styles.avatarSpacer} />
        ))}

      <View style={[styles.column, isUser ? styles.columnUser : styles.columnAssistant]}>
        {isUser ? (
          <LinearGradient
            colors={[palette.ink700, palette.ink900]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.bubble,
              userCorners(isFirstInGroup, isLastInGroup),
              failed && styles.bubbleFailed,
            ]}
          >
            <Text variant="body" color={colors.primaryText}>
              {message.content}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.bubble,
              styles.assistantBubble,
              shadows.xs,
              assistantCorners(isFirstInGroup, isLastInGroup),
            ]}
          >
            <Text variant="body">{message.content}</Text>
          </View>
        )}

        {!!message.referencedItems?.length && (
          <ReferencedItems items={message.referencedItems} onItemPress={onItemPress} />
        )}

        {message.suggestedOutfit && onOutfitPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Önerilen kombini görüntüle"
            onPress={() => onOutfitPress(message)}
            style={({ pressed }) => [styles.outfitLink, pressed && styles.pressed]}
          >
            <View style={styles.outfitIcon}>
              <Ionicons name="shirt" size={13} color={colors.accentDark} />
            </View>
            <Text variant="captionStrong" color={colors.text} style={styles.outfitLabel}>
              Önerilen kombini gör
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </Pressable>
        )}

        {failed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mesajı yeniden gönder"
            onPress={onRetry}
            disabled={!onRetry}
            style={({ pressed }) => [styles.metaRow, pressed && styles.pressed]}
          >
            <Ionicons name="alert-circle" size={12} color={colors.danger} />
            <Text variant="caption" color={colors.danger} style={styles.meta}>
              Gönderilemedi{onRetry ? ' · Tekrar dene' : ''}
            </Text>
          </Pressable>
        ) : (
          (isLastInGroup || message.status === 'sending') && (
            <View style={styles.metaRow}>
              <Text variant="caption" color={colors.textQuaternary} style={styles.meta}>
                {message.status === 'sending'
                  ? 'Gönderiliyor…'
                  : formatTime(message.createdAt)}
              </Text>
            </View>
          )
        )}
      </View>
    </Animated.View>
  );
};

/** Gün değişimini gösteren ince ayırıcı */
export const DayDivider: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.dayWrapper}>
    <View style={styles.dayLine} />
    <Text variant="caption" color={colors.textTertiary}>
      {label}
    </Text>
    <View style={styles.dayLine} />
  </View>
);

/** Kuyruk yalnızca grubun son baloncuğunda; ortadakiler yumuşak kalır */
const assistantCorners = (first: boolean, last: boolean) => ({
  borderTopLeftRadius: first ? radius.lg : radius.xs,
  borderBottomLeftRadius: last ? radius.xs : radius.lg,
});

const userCorners = (first: boolean, last: boolean) => ({
  borderTopRightRadius: first ? radius.lg : radius.xs,
  borderBottomRightRadius: last ? radius.xs : radius.lg,
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '90%',
  },
  rowUser: { alignSelf: 'flex-end' },
  rowAssistant: { alignSelf: 'flex-start' },
  groupStart: { marginTop: spacing.lg },
  groupContinuation: { marginTop: spacing.xs },
  avatar: { marginTop: spacing.xxs },
  avatarSpacer: { width: AVATAR_SIZE },
  column: { flexShrink: 1, gap: spacing.xs },
  columnAssistant: { alignItems: 'flex-start' },
  columnUser: { alignItems: 'flex-end' },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleFailed: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
  outfitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: spacing.xs + 1,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  outfitIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitLabel: { flexShrink: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  meta: { fontSize: 11 },
  dayWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dayLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
