import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { layout, spacing } from '../../theme';
import { Chip } from '../ui/Chip';
import { ASSISTANT_PROMPTS } from './prompts';

interface SuggestionChipsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

/**
 * Sohbet sürerken composer üstünde duran kısa öneri şeridi.
 * Etiketler kısa başlıklar; asistana yine tam soru gönderilir.
 */
export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onSelect, disabled }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
  >
    {ASSISTANT_PROMPTS.map((prompt) => (
      <Chip
        key={prompt.id}
        label={prompt.title}
        icon={prompt.icon}
        size="sm"
        disabled={disabled}
        onPress={() => onSelect(prompt.question)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  // Şerit ekran dolgusundan başlar, sağda son çip kenara yapışmaz
  content: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
});
