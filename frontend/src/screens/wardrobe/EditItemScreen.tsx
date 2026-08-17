import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Header, Screen, Text } from '../../components/ui';
import {
  ItemForm,
  emptyFormValues,
  itemToFormValues,
  validateItemForm,
  type ItemFormValues,
} from '../../components/wardrobe';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { colors, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditItem'>;

export const EditItemScreen: React.FC<Props> = ({ navigation, route }) => {
  const { itemId } = route.params;
  const item = useWardrobeStore((state) =>
    state.items.find((entry) => entry.id === itemId),
  );
  const updateItem = useWardrobeStore((state) => state.updateItem);

  const [values, setValues] = useState<ItemFormValues>(
    item ? itemToFormValues(item) : emptyFormValues(),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  if (!item) {
    return (
      <Screen edges={['top']}>
        <Header title="Düzenle" onBack={() => navigation.goBack()} />
        <Text variant="body" color={colors.textSecondary}>
          Ürün bulunamadı.
        </Text>
      </Screen>
    );
  }

  const handleSave = async () => {
    const validation = validateItemForm(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    await updateItem(item.id, {
      name: values.name.trim(),
      category: values.category,
      subcategory: values.subcategory,
      colors: values.colors,
      pattern: values.pattern,
      styles: values.styles,
      seasons: values.seasons,
      materials: values.materials,
      formality: values.formality,
      temperatureRange: values.temperatureRange,
      brand: values.brand?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Bilgileri düzenle" onBack={() => navigation.goBack()} />
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
          <Card
            header={{
              title: 'Ürün bilgileri',
              subtitle: 'Düzenlemelerin AI önerilerini etkiler',
              icon: 'create-outline',
            }}
          >
            <ItemForm value={values} onChange={setValues} errors={errors} />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Değişiklikleri kaydet"
            onPress={handleSave}
            loading={saving}
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
    paddingTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
