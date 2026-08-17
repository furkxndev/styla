import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CATEGORIES,
  FORMALITY_LABELS,
  MATERIAL_LABELS,
  MATERIAL_OPTIONS,
  PATTERN_LABELS,
  PATTERN_OPTIONS,
  SEASON_LABELS,
  SEASON_OPTIONS,
  STYLE_LABELS,
  STYLE_OPTIONS,
} from '../../constants/categories';
import { COLOR_PRESETS } from '../../constants/colorPalette';
import { colors, spacing } from '../../theme';
import type {
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  Formality,
  Material,
  Pattern,
  Season,
  StyleTag,
} from '../../types/clothing';
import { TextField } from '../ui/TextField';
import { Text } from '../ui/Text';
import { OptionGroup } from './OptionGroup';

export interface ItemFormValues {
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  colors: ClothingColor[];
  pattern: Pattern;
  styles: StyleTag[];
  seasons: Season[];
  materials: Material[];
  formality: Formality;
  temperatureRange: { min: number; max: number };
  brand?: string;
  notes?: string;
}

interface ItemFormProps {
  value: ItemFormValues;
  onChange: (value: ItemFormValues) => void;
  errors?: Partial<Record<keyof ItemFormValues, string>>;
}

/** Sıcaklık aralığı mevsim seçimine göre otomatik güncellenir */
const SEASON_TEMPERATURES: Record<Season, { min: number; max: number }> = {
  winter: { min: -5, max: 12 },
  autumn: { min: 8, max: 20 },
  spring: { min: 12, max: 24 },
  summer: { min: 20, max: 38 },
};

const deriveTemperature = (seasons: Season[]) => {
  if (!seasons.length) return { min: 5, max: 30 };
  const ranges = seasons.map((season) => SEASON_TEMPERATURES[season]);
  return {
    min: Math.min(...ranges.map((r) => r.min)),
    max: Math.max(...ranges.map((r) => r.max)),
  };
};

/** AI analizini kullanıcının düzenlediği ortak form */
export const ItemForm: React.FC<ItemFormProps> = ({ value, onChange, errors }) => {
  const subcategories = useMemo(
    () =>
      CATEGORIES.find((category) => category.key === value.category)?.subcategories ?? [],
    [value.category],
  );

  const update = (patch: Partial<ItemFormValues>) => onChange({ ...value, ...patch });

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  return (
    <View style={styles.container}>
      <TextField
        label="Ürün adı"
        value={value.name}
        onChangeText={(name) => update({ name })}
        placeholder="Örn. Beyaz Oxford Gömlek"
        error={errors?.name}
        maxLength={60}
      />

      <OptionGroup
        label="Kategori"
        options={CATEGORIES.map((category) => ({
          value: category.key,
          label: category.label,
        }))}
        value={value.category}
        onSelect={(category) =>
          update({ category: category as ClothingCategory, subcategory: undefined })
        }
      />

      {subcategories.length > 0 && (
        <OptionGroup
          label="Alt kategori"
          options={subcategories.map((sub) => ({ value: sub, label: sub }))}
          value={value.subcategory ?? ''}
          onSelect={(subcategory) => update({ subcategory: String(subcategory) })}
        />
      )}

      <OptionGroup
        label="Renkler"
        hint="Birden fazla seçebilirsin"
        options={COLOR_PRESETS.map((color) => ({
          value: color.hex,
          label: color.name,
          dotColor: color.hex,
        }))}
        values={value.colors.map((color) => color.hex)}
        onToggle={(hex) => {
          const preset = COLOR_PRESETS.find((color) => color.hex === hex);
          if (!preset) return;
          const exists = value.colors.some((color) => color.hex === hex);
          update({
            colors: exists
              ? value.colors.filter((color) => color.hex !== hex)
              : [...value.colors, preset],
          });
        }}
      />
      {errors?.colors && (
        <Text variant="caption" color={colors.danger}>
          {errors.colors}
        </Text>
      )}

      <OptionGroup
        label="Desen"
        options={PATTERN_OPTIONS.map((pattern) => ({
          value: pattern,
          label: PATTERN_LABELS[pattern],
        }))}
        value={value.pattern}
        onSelect={(pattern) => update({ pattern: pattern as Pattern })}
      />

      <OptionGroup
        label="Stil"
        hint="Birden fazla seçebilirsin"
        options={STYLE_OPTIONS.map((style) => ({
          value: style,
          label: STYLE_LABELS[style],
        }))}
        values={value.styles}
        onToggle={(style) => update({ styles: toggle(value.styles, style as StyleTag) })}
      />

      <OptionGroup
        label="Mevsim"
        options={SEASON_OPTIONS.map((season) => ({
          value: season,
          label: SEASON_LABELS[season],
        }))}
        values={value.seasons}
        onToggle={(season) => {
          const seasons = toggle(value.seasons, season as Season);
          update({ seasons, temperatureRange: deriveTemperature(seasons) });
        }}
      />

      <OptionGroup
        label="Kumaş"
        options={MATERIAL_OPTIONS.map((material) => ({
          value: material,
          label: MATERIAL_LABELS[material],
        }))}
        values={value.materials}
        onToggle={(material) =>
          update({ materials: toggle(value.materials, material as Material) })
        }
      />

      <OptionGroup
        label="Resmiyet"
        hint={`${value.temperatureRange.min}°C – ${value.temperatureRange.max}°C aralığı`}
        options={(Object.keys(FORMALITY_LABELS) as unknown as string[]).map((key) => ({
          value: Number(key),
          label: FORMALITY_LABELS[Number(key) as Formality],
        }))}
        value={value.formality}
        onSelect={(formality) => update({ formality: Number(formality) as Formality })}
      />

      <TextField
        label="Marka (opsiyonel)"
        value={value.brand ?? ''}
        onChangeText={(brand) => update({ brand })}
        placeholder="Örn. Zara"
      />

      <TextField
        label="Not (opsiyonel)"
        value={value.notes ?? ''}
        onChangeText={(notes) => update({ notes })}
        placeholder="Bu parçayla ilgili aklında kalsın istediğin bir şey"
        multiline
      />
    </View>
  );
};

/** Var olan bir üründen form değerleri oluşturur */
export const itemToFormValues = (item: ClothingItem): ItemFormValues => ({
  name: item.name,
  category: item.category,
  subcategory: item.subcategory,
  colors: item.colors,
  pattern: item.pattern,
  styles: item.styles,
  seasons: item.seasons,
  materials: item.materials ?? [],
  formality: item.formality,
  temperatureRange: item.temperatureRange,
  brand: item.brand,
  notes: item.notes,
});

export const emptyFormValues = (): ItemFormValues => ({
  name: '',
  category: 'top',
  colors: [],
  pattern: 'solid',
  styles: [],
  seasons: [],
  materials: [],
  formality: 3,
  temperatureRange: { min: 10, max: 25 },
});

export const validateItemForm = (values: ItemFormValues) => {
  const errors: Partial<Record<keyof ItemFormValues, string>> = {};
  if (!values.name.trim()) errors.name = 'Ürün adı gerekli';
  if (!values.colors.length) errors.colors = 'En az bir renk seç';
  return errors;
};

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
});
