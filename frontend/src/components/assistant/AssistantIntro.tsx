import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, layout, palette, radius, shadows, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { AssistantAvatar } from './AssistantAvatar';
import { MetaPill } from './AssistantHeader';
import { ASSISTANT_PROMPTS, type AssistantPrompt } from './prompts';

interface AssistantIntroProps {
  /** Asistanın karşılama metni (store'daki tek kaynaktan gelir) */
  welcome: string;
  itemCount: number;
  onSelect: (question: string) => void;
  disabled?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Sohbet henüz başlamamışken görünen karşılama ekranı.
 * Boş bir sohbet listesi yerine asistanın ne yapabildiğini gösterir:
 * kimlik (gradyan panel) + somut başlangıç soruları (kart ızgarası).
 */
export const AssistantIntro: React.FC<AssistantIntroProps> = ({
  welcome,
  itemCount,
  onSelect,
  disabled = false,
  onScroll,
}) => (
  <ScrollView
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    onScroll={onScroll}
    scrollEventThrottle={32}
  >
    <LinearGradient
      colors={[palette.accent100, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.hero}
    >
      <AssistantAvatar size={54} />

      <View style={styles.heroTexts}>
        <Text variant="title2">Stil Asistanı</Text>
        <Text variant="callout" color={colors.textSecondary}>
          {welcome}
        </Text>
      </View>

      <View style={styles.heroMeta}>
        <MetaPill
          icon={itemCount > 0 ? 'shirt-outline' : 'add-circle-outline'}
          label={itemCount > 0 ? `${itemCount} parça` : 'Gardırobun boş'}
        />
        <MetaPill icon="partly-sunny-outline" label="Hava durumuna göre" />
      </View>
    </LinearGradient>

    <View style={styles.section}>
      <Text variant="overline" color={colors.textTertiary}>
        Ne sormak istersin?
      </Text>

      <View style={styles.grid}>
        {ASSISTANT_PROMPTS.map((prompt) => (
          <PromptTile
            key={prompt.id}
            prompt={prompt}
            disabled={disabled}
            onPress={() => onSelect(prompt.question)}
          />
        ))}
      </View>
    </View>

    <View style={styles.note}>
      <Ionicons name="lock-closed-outline" size={13} color={colors.textQuaternary} />
      <Text variant="caption" color={colors.textTertiary} style={styles.noteText}>
        Yanıtlar yalnızca senin gardırobun, hava durumu ve stil tercihlerine göre üretilir.
      </Text>
    </View>
  </ScrollView>
);

const PromptTile: React.FC<{
  prompt: AssistantPrompt;
  disabled: boolean;
  onPress: () => void;
}> = ({ prompt, disabled, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={prompt.question}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={() => {
      Haptics.selectionAsync().catch(() => undefined);
      onPress();
    }}
    style={({ pressed }) => [
      styles.tile,
      shadows.xs,
      pressed && styles.tilePressed,
      disabled && styles.tileDisabled,
    ]}
  >
    <View style={styles.tileIcon}>
      <Ionicons name={prompt.icon} size={16} color={colors.accentDark} />
    </View>
    <View style={styles.tileTexts}>
      <Text variant="bodyMedium" style={styles.tileTitle} numberOfLines={2}>
        {prompt.title}
      </Text>
      <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>
        {prompt.hint}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    overflow: 'hidden',
  },
  heroTexts: { gap: spacing.xs },
  heroMeta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  section: { gap: spacing.md },
  // 48.5 + 48.5 = %97: aradaki boşluk space-between ile oluşur, sarma yaşanmaz
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  tile: {
    width: '48.5%',
    minHeight: 118,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileDisabled: { opacity: 0.5 },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTexts: { gap: spacing.xxs },
  tileTitle: { fontSize: 14, lineHeight: 20 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  noteText: { flex: 1 },
});
