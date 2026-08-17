import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Button, Card, Header, Screen, Skeleton, Text } from '../../components/ui';
import {
  ItemForm,
  emptyFormValues,
  validateItemForm,
  type ItemFormValues,
} from '../../components/wardrobe';
import { wardrobeApi } from '../../services/api';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { colors, radius, spacing } from '../../theme';
import type { CreateClothingItemPayload } from '../../types/clothing';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewAnalysis'>;

/**
 * AI analiz sonucunu gösterir ve kullanıcının düzenlemesine izin verir.
 * Kaydet'e basıldığında görsel yüklenir ve ürün oluşturulur.
 */
export const ReviewAnalysisScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri, analysis: initialAnalysis } = route.params;
  const analyzeImage = useWardrobeStore((state) => state.analyzeImage);
  const analyzing = useWardrobeStore((state) => state.analyzing);
  const addItem = useWardrobeStore((state) => state.addItem);

  const [values, setValues] = useState<ItemFormValues>(emptyFormValues());
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormValues, string>>>({});
  const [confidence, setConfidence] = useState<number | null>(
    initialAnalysis?.confidence ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);

  const runAnalysis = useCallback(async () => {
    setAnalysisFailed(false);
    const result = await analyzeImage(imageUri);
    if (!result) {
      setAnalysisFailed(true);
      return;
    }
    setConfidence(result.confidence);
    setValues({
      name: result.name,
      category: result.category,
      subcategory: result.subcategory,
      colors: result.colors,
      pattern: result.pattern,
      styles: result.styles,
      seasons: result.seasons,
      materials: result.materials ?? [],
      formality: result.formality,
      temperatureRange: result.temperatureRange,
    });
  }, [analyzeImage, imageUri]);

  useEffect(() => {
    if (initialAnalysis) {
      setValues({
        name: initialAnalysis.name,
        category: initialAnalysis.category,
        subcategory: initialAnalysis.subcategory,
        colors: initialAnalysis.colors,
        pattern: initialAnalysis.pattern,
        styles: initialAnalysis.styles,
        seasons: initialAnalysis.seasons,
        materials: initialAnalysis.materials ?? [],
        formality: initialAnalysis.formality,
        temperatureRange: initialAnalysis.temperatureRange,
      });
      return;
    }
    runAnalysis();
  }, [initialAnalysis, runAnalysis]);

  const handleSave = async () => {
    const validation = validateItemForm(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      const uploaded = await wardrobeApi
        .uploadImage(imageUri)
        .catch(() => ({ url: imageUri }));

      const payload: CreateClothingItemPayload = {
        name: values.name.trim(),
        category: values.category,
        subcategory: values.subcategory,
        imageUrl: uploaded.url,
        colors: values.colors,
        pattern: values.pattern,
        styles: values.styles,
        seasons: values.seasons,
        materials: values.materials,
        formality: values.formality,
        temperatureRange: values.temperatureRange,
        brand: values.brand?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        aiConfidence: confidence ?? undefined,
      };

      const created = await addItem(payload);
      if (!created) {
        Alert.alert('Kaydedilemedi', 'Ürün eklenemedi. Lütfen tekrar dene.');
        return;
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Ürün bilgileri" onBack={() => navigation.goBack()} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="subtle">
            <View style={styles.imageRow}>
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
              <View style={styles.imageMeta}>
                {analyzing ? (
                  <>
                    <View style={styles.analyzingRow}>
                      <Ionicons name="sparkles" size={15} color={colors.accent} />
                      <Text variant="bodyMedium" color={colors.accentDark}>
                        AI analiz ediyor…
                      </Text>
                    </View>
                    <Skeleton width="80%" height={12} />
                    <Skeleton width="60%" height={12} />
                  </>
                ) : analysisFailed ? (
                  <>
                    <Text variant="bodyMedium">Analiz yapılamadı</Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      Bilgileri elle girebilir veya tekrar deneyebilirsin.
                    </Text>
                    <Button
                      label="Tekrar dene"
                      size="sm"
                      variant="outline"
                      onPress={runAnalysis}
                    />
                  </>
                ) : (
                  <>
                    <Badge
                      label={
                        confidence
                          ? `AI analizi · %${Math.round(confidence * 100)} güven`
                          : 'Elle giriş'
                      }
                      tone="accent"
                      icon="sparkles"
                    />
                    <Text variant="caption" color={colors.textTertiary}>
                      Doğru olmayan bir şey varsa aşağıdan düzeltebilirsin. Düzeltmelerin
                      AI'ın seni daha iyi tanımasına yardımcı olur.
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Card>

          <Card
            header={{
              title: 'Ürün bilgileri',
              subtitle: 'AI çıktısını düzenleyebilirsin',
              icon: 'pricetag-outline',
            }}
          >
            <ItemForm value={values} onChange={setValues} errors={errors} />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Gardıroba ekle"
            onPress={handleSave}
            loading={saving}
            disabled={analyzing}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrapper: { paddingHorizontal: spacing.xl },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  imageRow: { flexDirection: 'row', gap: spacing.lg },
  image: {
    width: 110,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  // flex: 1 + numberOfLines: uzun açıklama kartın dışına taşmaz
  imageMeta: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
