import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ProgressBar, Screen, Text } from '../../components/ui';
import { OptionGroup } from '../../components/wardrobe';
import { STYLE_LABELS, STYLE_OPTIONS } from '../../constants/categories';
import {
  COLOR_FAMILY_HEX,
  COLOR_FAMILY_LABELS,
  COLOR_FAMILY_OPTIONS,
} from '../../constants/colorPalette';
import { OCCASIONS } from '../../constants/occasions';
import { useNotificationControls } from '../../hooks/useNotifications';
import { locationService } from '../../services/location/locationService';
import { colors, radius, spacing } from '../../theme';
import type { ColorFamily, StyleTag } from '../../types/clothing';
import type { Occasion } from '../../types/outfit';
import type { StylePreferences } from '../../types/user';
import { useAuthStore } from '../../store/authStore';
import { useWeatherStore } from '../../store/weatherStore';

const TIME_OPTIONS = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];

const SENSITIVITY_OPTIONS: {
  value: StylePreferences['temperatureSensitivity'];
  label: string;
  description: string;
}[] = [
  { value: 'cold', label: 'Üşürüm', description: 'Biraz daha kalın giyinmeyi severim' },
  { value: 'neutral', label: 'Normal', description: 'Havaya göre dengeli giyinirim' },
  { value: 'warm', label: 'Terlerim', description: 'İnce giyinmeyi tercih ederim' },
];

/** Kayıt sonrası kişiselleştirme akışı (4 adım) */
export const OnboardingScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const updateNotifications = useAuthStore((state) => state.updateNotifications);
  const updateLocation = useAuthStore((state) => state.updateLocation);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const fetchWeather = useWeatherStore((state) => state.fetchWeather);
  const { setEnabled } = useNotificationControls();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [styles_, setStyles] = useState<StyleTag[]>(user?.preferences.favoriteStyles ?? []);
  const [avoided, setAvoided] = useState<ColorFamily[]>(
    user?.preferences.avoidedColors ?? [],
  );
  const [sensitivity, setSensitivity] = useState<
    StylePreferences['temperatureSensitivity']
  >(user?.preferences.temperatureSensitivity ?? 'neutral');
  const [occasions, setOccasions] = useState<Occasion[]>(
    user?.preferences.frequentOccasions ?? ['daily'],
  );
  const [notificationTime, setNotificationTime] = useState(
    user?.notifications.dailyOutfitTime ?? '08:00',
  );

  const totalSteps = 4;

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const handleFinish = async () => {
    setSaving(true);
    await updatePreferences({
      favoriteStyles: styles_,
      avoidedColors: avoided,
      temperatureSensitivity: sensitivity,
      frequentOccasions: occasions,
    });

    const granted = await setEnabled(true);
    await updateNotifications({
      dailyOutfitTime: notificationTime,
      dailyOutfitEnabled: granted,
    });

    const location = await locationService.getCurrentLocation();
    if (location) {
      await updateLocation({
        useDeviceLocation: true,
        city: location.city,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
    await fetchWeather({ force: true });

    await completeOnboarding();
    setSaving(false);
  };

  const canContinue =
    (step === 0 && styles_.length > 0) ||
    step === 1 ||
    (step === 2 && occasions.length > 0) ||
    step === 3;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.progressRow}>
        <ProgressBar value={((step + 1) / totalSteps) * 100} />
        <Text variant="caption" color={colors.textTertiary}>
          {step + 1}/{totalSteps}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {step === 0 && (
          <StepLayout
            icon="color-palette-outline"
            title="Tarzın nasıl?"
            description="Sana en yakın stilleri seç. AI önerilerini bu çizgide tutacak."
          >
            <OptionGroup
              options={STYLE_OPTIONS.map((style) => ({
                value: style,
                label: STYLE_LABELS[style],
              }))}
              values={styles_}
              onToggle={(style) => setStyles(toggle(styles_, style as StyleTag))}
              size="md"
            />
          </StepLayout>
        )}

        {step === 1 && (
          <StepLayout
            icon="thermometer-outline"
            title="Havaya karşı nasılsın?"
            description="Bunu bilirsek kombinlerin sıcaklık dengesi sana göre olur."
          >
            <View style={s.cards}>
              {SENSITIVITY_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.value}
                  title={option.label}
                  description={option.description}
                  selected={sensitivity === option.value}
                  onPress={() => setSensitivity(option.value)}
                />
              ))}
            </View>

            <View style={s.section}>
              <Text variant="caption" color={colors.textSecondary}>
                Uzak durmak istediğin renkler (opsiyonel)
              </Text>
              <OptionGroup
                options={COLOR_FAMILY_OPTIONS.map((family) => ({
                  value: family,
                  label: COLOR_FAMILY_LABELS[family],
                  dotColor: COLOR_FAMILY_HEX[family],
                }))}
                values={avoided}
                onToggle={(family) => setAvoided(toggle(avoided, family as ColorFamily))}
              />
            </View>
          </StepLayout>
        )}

        {step === 2 && (
          <StepLayout
            icon="calendar-outline"
            title="Genelde nereye gidiyorsun?"
            description="Sık kullandığın durumları seç, ana sayfada kısayol olarak görelim."
          >
            <OptionGroup
              options={OCCASIONS.map((occasion) => ({
                value: occasion.key,
                label: occasion.label,
              }))}
              values={occasions}
              onToggle={(occasion) => setOccasions(toggle(occasions, occasion as Occasion))}
              size="md"
            />
          </StepLayout>
        )}

        {step === 3 && (
          <StepLayout
            icon="notifications-outline"
            title="Sabah bildirimi"
            description="Her sabah hava durumu ve günün kombini bildirimini alacaksın."
          >
            <OptionGroup
              label="Bildirim saati"
              options={TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
              value={notificationTime}
              onSelect={(time) => setNotificationTime(String(time))}
              size="md"
            />

            <View style={s.notificationPreview}>
              <View style={s.previewIcon}>
                <Ionicons name="shirt" size={16} color={colors.primaryText} />
              </View>
              <View style={s.previewTexts}>
                <Text variant="caption" color={colors.text}>
                  ☀️ Günaydın!
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  Bugün hava 27°C. Bugünün kombinini senin için hazırladık.
                </Text>
              </View>
            </View>

            <Text variant="caption" color={colors.textTertiary}>
              Konum iznini de isteyeceğiz — hava durumunu doğru şehirden almak için.
              Dilediğin zaman ayarlardan değiştirebilirsin.
            </Text>
          </StepLayout>
        )}
      </ScrollView>

      <View style={s.actions}>
        <Button
          label={step === totalSteps - 1 ? 'Başlayalım' : 'Devam et'}
          onPress={() => (step === totalSteps - 1 ? handleFinish() : setStep(step + 1))}
          disabled={!canContinue}
          loading={saving}
          fullWidth
          size="lg"
        />
        {step > 0 ? (
          <Button
            label="Geri"
            variant="ghost"
            onPress={() => setStep(step - 1)}
            fullWidth
          />
        ) : (
          <Button label="Şimdilik geç" variant="ghost" onPress={handleFinish} fullWidth />
        )}
      </View>
    </Screen>
  );
};

const StepLayout: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <View style={s.step}>
    <View style={s.stepHead}>
      <View style={s.stepIcon}>
        <Ionicons name={icon} size={22} color={colors.accentDark} />
      </View>
      {/* flex: 1 — uzun başlık/açıklama ikonun yanından taşmaz */}
      <View style={s.stepTitles}>
        <Text variant="title2">{title}</Text>
        <Text variant="callout" color={colors.textSecondary}>
          {description}
        </Text>
      </View>
    </View>

    {/* Adımın seçenekleri kendi kartında toplanır */}
    <Card>{children}</Card>
  </View>
);

const SelectableCard: React.FC<{
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}> = ({ title, description, selected, onPress }) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    accessibilityLabel={title}
    onPress={onPress}
    style={({ pressed }) => [
      s.selectable,
      selected && s.selectableActive,
      pressed && { opacity: 0.85 },
    ]}
  >
    <Text
      variant="bodyMedium"
      style={s.selectableTitle}
      color={selected ? colors.text : colors.textSecondary}
    >
      {title}
    </Text>
    <Text variant="caption" color={colors.textTertiary}>
      {description}
    </Text>
    {selected && (
      <View style={s.check}>
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      </View>
    )}
  </Pressable>
);

const s = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  content: { paddingBottom: spacing.xxl },
  step: { gap: spacing.lg },
  stepHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitles: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.sm, marginTop: spacing.lg },
  cards: { gap: spacing.sm },
  selectable: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xxs,
  },
  selectableActive: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  },
  selectableTitle: { marginRight: spacing.xxl },
  check: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  notificationPreview: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  previewIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTexts: { flex: 1, gap: spacing.xxs },
  actions: { gap: spacing.xs, paddingBottom: spacing.lg },
});
