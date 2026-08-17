import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Screen,
  Sheet,
  Text,
  TextField,
} from '../../components/ui';
import {
  formatContextLength,
  formatPricePerMillion,
  useAdminSettings,
  useIsAdmin,
} from '../../hooks/useAdmin';
import { useDebounce } from '../../hooks/useDebounce';
import { colors, radius, spacing } from '../../theme';
import type { AiModelOption, AppSettings } from '../../types/admin';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSettings'>;

/** Hangi alan için model seçiliyor; null iken sayfa kapalı */
type PickerTarget = 'text' | 'vision' | null;

const TEMPERATURE_STEP = 0.1;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;

export const AdminSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const isAdmin = useIsAdmin();
  const {
    settings,
    models,
    visionModels,
    modelsLoading,
    saveSettings,
    saving,
    loading,
    error,
  } = useAdminSettings(isAdmin);

  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [saved, setSaved] = useState(false);

  // Sunucudan ayarlar geldiğinde taslağı bir kez doldur; sonra kullanıcı düzenler
  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  // Başarı rozetini kendiliğinden söndür: ekranda kalıcı gürültü olmasın
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  const patch = useCallback(
    (values: Partial<AppSettings>) =>
      setDraft((current) => (current ? { ...current, ...values } : current)),
    [],
  );

  const dirty = useMemo(() => {
    if (!draft || !settings) return false;
    return (
      draft.aiModel !== settings.aiModel ||
      draft.aiVisionModel !== settings.aiVisionModel ||
      draft.aiTemperature !== settings.aiTemperature ||
      draft.maxWardrobeItemsPerPrompt !== settings.maxWardrobeItemsPerPrompt ||
      draft.registrationEnabled !== settings.registrationEnabled ||
      draft.aiFeaturesEnabled !== settings.aiFeaturesEnabled
    );
  }, [draft, settings]);

  const handleSave = async () => {
    if (!draft) return;
    const failure = await saveSettings({
      aiModel: draft.aiModel,
      aiVisionModel: draft.aiVisionModel,
      aiTemperature: draft.aiTemperature,
      maxWardrobeItemsPerPrompt: draft.maxWardrobeItemsPerPrompt,
      registrationEnabled: draft.registrationEnabled,
      aiFeaturesEnabled: draft.aiFeaturesEnabled,
    });

    if (failure) {
      Alert.alert('Kaydedilemedi', failure);
      return;
    }
    setSaved(true);
  };

  if (!isAdmin) {
    return (
      <Screen>
        <Header title="Sistem ayarları" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Bu alana erişim yetkin yok"
          actionLabel="Geri dön"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (!draft) {
    return (
      <Screen>
        <Header title="Sistem ayarları" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={loading ? 'hourglass-outline' : 'cloud-offline-outline'}
          title={loading ? 'Ayarlar yükleniyor' : 'Ayarlar yüklenemedi'}
          description={loading ? undefined : (error ?? undefined)}
          compact
        />
      </Screen>
    );
  }

  const temperature = Number(draft.aiTemperature.toFixed(1));

  const stepTemperature = (direction: 1 | -1) => {
    const next = Number((temperature + direction * TEMPERATURE_STEP).toFixed(1));
    if (next < TEMPERATURE_MIN || next > TEMPERATURE_MAX) return;
    patch({ aiTemperature: next });
  };

  return (
    <Screen scroll bottomInset={spacing.huge}>
      <Header
        title="Sistem ayarları"
        subtitle="Değişiklikler anında yayına girer"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.stack}>
        {saved && (
          <Badge label="Ayarlar güncellendi" tone="success" icon="checkmark-circle" />
        )}

        {/* --- Modeller --- */}
        <Card header={{ title: 'Yapay zekâ modelleri', icon: 'sparkles-outline' }}>
          <ModelPickerRow
            label="Metin modeli"
            modelId={draft.aiModel}
            models={models}
            onPress={() => setPicker('text')}
          />
          <Divider />
          <ModelPickerRow
            label="Görsel modeli"
            modelId={draft.aiVisionModel}
            models={models}
            onPress={() => setPicker('vision')}
          />
          {modelsLoading && (
            <Text variant="caption" color={colors.textTertiary}>
              Model listesi yükleniyor…
            </Text>
          )}
        </Card>

        {/* --- Üretim parametreleri --- */}
        <Card header={{ title: 'Üretim parametreleri', icon: 'options-outline' }}>
          <View style={styles.stepperRow}>
            <View style={styles.stepperTexts}>
              <Text variant="bodyMedium">Sıcaklık</Text>
              <Text variant="caption" color={colors.textTertiary}>
                0 tutarlı, 2 yaratıcı
              </Text>
            </View>
            <View style={styles.stepper}>
              <IconButton
                icon="remove"
                accessibilityLabel="Sıcaklığı azalt"
                onPress={() => stepTemperature(-1)}
                disabled={temperature <= TEMPERATURE_MIN}
                background={colors.surfaceAlt}
                size={18}
              />
              <Text variant="title3" style={styles.stepperValue}>
                {temperature.toFixed(1)}
              </Text>
              <IconButton
                icon="add"
                accessibilityLabel="Sıcaklığı artır"
                onPress={() => stepTemperature(1)}
                disabled={temperature >= TEMPERATURE_MAX}
                background={colors.surfaceAlt}
                size={18}
              />
            </View>
          </View>

          <Divider />

          <TextField
            label="İstem başına en fazla kıyafet"
            hint="Model bağlamına gönderilecek parça sayısı"
            keyboardType="number-pad"
            value={String(draft.maxWardrobeItemsPerPrompt)}
            onChangeText={(value) => {
              // Yalnız rakam kabul et; boş bırakılırsa 0 yazıp kullanıcıyı serbest bırak
              const numeric = value.replace(/[^0-9]/g, '');
              patch({ maxWardrobeItemsPerPrompt: numeric ? Number(numeric) : 0 });
            }}
          />
        </Card>

        {/* --- Anahtarlar --- */}
        <Card header={{ title: 'Özellik anahtarları', icon: 'toggle-outline' }}>
          <ToggleRow
            title="Yeni kayıtlar"
            description="Kapalıyken kimse hesap oluşturamaz"
            value={draft.registrationEnabled}
            onChange={(value) => patch({ registrationEnabled: value })}
          />
          <Divider />
          <ToggleRow
            title="AI özellikleri"
            description="Kombin üretimi, analiz ve asistanı topluca durdurur"
            value={draft.aiFeaturesEnabled}
            onChange={(value) => patch({ aiFeaturesEnabled: value })}
          />
        </Card>

        <Button
          label="Kaydet"
          icon="checkmark"
          onPress={handleSave}
          loading={saving}
          disabled={!dirty}
          fullWidth
        />

        {settings && (
          <Text variant="caption" color={colors.textTertiary} align="center">
            Son güncelleme: {new Date(settings.updatedAt).toLocaleString('tr-TR')}
            {settings.updatedBy ? ` · ${settings.updatedBy}` : ''}
          </Text>
        )}
      </View>

      <ModelPickerSheet
        target={picker}
        models={picker === 'vision' ? visionModels : models}
        selectedId={picker === 'vision' ? draft.aiVisionModel : draft.aiModel}
        onClose={() => setPicker(null)}
        onSelect={(model) => {
          patch(picker === 'vision' ? { aiVisionModel: model.id } : { aiModel: model.id });
          setPicker(null);
        }}
      />
    </Screen>
  );
};

const ModelPickerRow: React.FC<{
  label: string;
  modelId: string;
  models: AiModelOption[];
  onPress: () => void;
}> = ({ label, modelId, models, onPress }) => {
  const model = models.find((candidate) => candidate.id === modelId);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.pickerRow, pressed && styles.pressed]}>
          <View style={styles.pickerTexts}>
            <Text variant="caption" color={colors.textTertiary}>
              {label}
            </Text>
            <Text variant="bodyMedium" numberOfLines={1}>
              {model?.name ?? modelId}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {model
                ? `${formatContextLength(model.contextLength)} · ${formatPricePerMillion(model.promptPrice)}`
                : modelId}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      )}
    </Pressable>
  );
};

const ToggleRow: React.FC<{
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ title, description, value, onChange }) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleTexts}>
      <Text variant="bodyMedium">{title}</Text>
      <Text variant="caption" color={colors.textTertiary}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={title}
      trackColor={{ false: colors.surfaceAlt, true: colors.accentMuted }}
      thumbColor={colors.surface}
    />
  </View>
);

/** 400+ model olabildiği için liste her zaman aramayla daraltılır */
const ModelPickerSheet: React.FC<{
  target: PickerTarget;
  models: AiModelOption[];
  selectedId: string;
  onClose: () => void;
  onSelect: (model: AiModelOption) => void;
}> = ({ target, models, selectedId, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);

  useEffect(() => {
    if (!target) setQuery('');
  }, [target]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return models;
    return models.filter((model) =>
      `${model.name} ${model.id}`.toLocaleLowerCase('tr-TR').includes(needle),
    );
  }, [models, debounced]);

  return (
    <Sheet
      visible={target !== null}
      onClose={onClose}
      title={target === 'vision' ? 'Görsel modeli' : 'Metin modeli'}
      subtitle={
        target === 'vision'
          ? 'Yalnızca görsel girdiyi destekleyen modeller listelenir'
          : `${models.length} model arasından seç`
      }
    >
      <TextField
        icon="search-outline"
        placeholder="Model ara (ör. sonnet, gemini)"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.modelList}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.modelListContent}
        ListEmptyComponent={
          <Text variant="callout" color={colors.textTertiary} align="center">
            Eşleşen model yok.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item.id === selectedId }}
            accessibilityLabel={item.name}
            onPress={() => onSelect(item)}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.modelRow,
                  item.id === selectedId && styles.modelRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.modelTexts}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
                    {item.id}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {formatContextLength(item.contextLength)} ·{' '}
                    {formatPricePerMillion(item.promptPrice)}
                  </Text>
                </View>
                {item.id === selectedId && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accentDark} />
                )}
              </View>
            )}
          </Pressable>
        )}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pickerTexts: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.7 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperTexts: { flex: 1, gap: spacing.xxs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperValue: { minWidth: 42, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleTexts: { flex: 1, gap: spacing.xxs },
  modelList: { height: 360 },
  modelListContent: { gap: spacing.xs, paddingVertical: spacing.sm },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelRowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  modelTexts: { flex: 1, gap: spacing.xxs },
});
