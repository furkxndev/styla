import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Header, Screen, Text } from '../../components/ui';
import { OptionGroup } from '../../components/wardrobe';
import { STYLE_LABELS, STYLE_OPTIONS } from '../../constants/categories';
import {
  COLOR_FAMILY_HEX,
  COLOR_FAMILY_LABELS,
  COLOR_FAMILY_OPTIONS,
} from '../../constants/colorPalette';
import { OCCASIONS } from '../../constants/occasions';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';
import type { ColorFamily, StyleTag } from '../../types/clothing';
import type { Occasion } from '../../types/outfit';
import type { StylePreferences } from '../../types/user';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StylePreferences'>;

const SENSITIVITY_OPTIONS: {
  value: StylePreferences['temperatureSensitivity'];
  label: string;
}[] = [
  { value: 'cold', label: 'Üşürüm' },
  { value: 'neutral', label: 'Normal' },
  { value: 'warm', label: 'Terlerim' },
];

export const StylePreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);

  const [preferences, setPreferences] = useState<StylePreferences>(
    user?.preferences ?? {
      favoriteStyles: [],
      avoidedColors: [],
      temperatureSensitivity: 'neutral',
      frequentOccasions: [],
      defaultFormality: 3,
    },
  );
  const [saving, setSaving] = useState(false);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const handleSave = async () => {
    setSaving(true);
    await updatePreferences(preferences);
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Stil tercihleri" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color={colors.textSecondary}>
          Bu tercihler AI'ın kombin önerilerini şekillendirir. İstediğin zaman
          güncelleyebilirsin.
        </Text>

        <Card>
          <OptionGroup
            label="Sevdiğin stiller"
            options={STYLE_OPTIONS.map((style) => ({
              value: style,
              label: STYLE_LABELS[style],
            }))}
            values={preferences.favoriteStyles}
            onToggle={(style) =>
              setPreferences({
                ...preferences,
                favoriteStyles: toggle(preferences.favoriteStyles, style as StyleTag),
              })
            }
          />
        </Card>

        <Card>
          <OptionGroup
            label="Kaçındığın renkler"
            hint="Bu renkleri kombinlerde kullanmayacağım"
            options={COLOR_FAMILY_OPTIONS.map((family) => ({
              value: family,
              label: COLOR_FAMILY_LABELS[family],
              dotColor: COLOR_FAMILY_HEX[family],
            }))}
            values={preferences.avoidedColors}
            onToggle={(family) =>
              setPreferences({
                ...preferences,
                avoidedColors: toggle(preferences.avoidedColors, family as ColorFamily),
              })
            }
          />
        </Card>

        <Card>
          <OptionGroup
            label="Sıcaklık hassasiyetin"
            options={SENSITIVITY_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={preferences.temperatureSensitivity}
            onSelect={(value) =>
              setPreferences({
                ...preferences,
                temperatureSensitivity: value as StylePreferences['temperatureSensitivity'],
              })
            }
          />
        </Card>

        <Card>
          <OptionGroup
            label="Sık kullandığın durumlar"
            options={OCCASIONS.map((occasion) => ({
              value: occasion.key,
              label: occasion.label,
            }))}
            values={preferences.frequentOccasions}
            onToggle={(occasion) =>
              setPreferences({
                ...preferences,
                frequentOccasions: toggle(
                  preferences.frequentOccasions,
                  occasion as Occasion,
                ),
              })
            }
          />
        </Card>

        <Button label="Kaydet" onPress={handleSave} loading={saving} fullWidth size="lg" />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: spacing.xl },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
});
