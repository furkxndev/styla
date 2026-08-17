import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Button, Card, Divider, Header, Screen, Text } from '../../components/ui';
import { ClothingImage } from '../../components/wardrobe';
import {
  FORMALITY_LABELS,
  MATERIAL_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
  getCategoryLabel,
} from '../../constants/categories';
import { useOutfitStore } from '../../store/outfitStore';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { formatRelative } from '../../utils/date';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

interface AttributeRow {
  label: string;
  value: string;
  swatches?: string[];
}

export const ItemDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { itemId } = route.params;
  const item = useWardrobeStore((state) =>
    state.items.find((entry) => entry.id === itemId),
  );
  const toggleFavorite = useWardrobeStore((state) => state.toggleFavorite);
  const removeItem = useWardrobeStore((state) => state.removeItem);
  const history = useOutfitStore((state) => state.history);

  const outfitCount = useMemo(
    () =>
      history.filter((outfit) => outfit.slots.some((slot) => slot.itemId === itemId))
        .length,
    [history, itemId],
  );

  // Özellikler tek bir listede toplandı: satırlar arası ayraçlar tutarlı olsun
  const attributes = useMemo<AttributeRow[]>(() => {
    if (!item) return [];
    return [
      { label: 'Kategori', value: getCategoryLabel(item.category) },
      ...(item.subcategory ? [{ label: 'Tür', value: item.subcategory }] : []),
      {
        label: 'Renkler',
        value: item.colors.map((color) => color.name).join(', '),
        swatches: item.colors.map((color) => color.hex),
      },
      { label: 'Desen', value: PATTERN_LABELS[item.pattern] },
      {
        label: 'Stil',
        value: item.styles.map((style) => STYLE_LABELS[style]).join(', ') || '—',
      },
      {
        label: 'Mevsim',
        value: item.seasons.map((season) => SEASON_LABELS[season]).join(', ') || 'Tüm yıl',
      },
      ...(item.materials?.length
        ? [
            {
              label: 'Kumaş',
              value: item.materials.map((material) => MATERIAL_LABELS[material]).join(', '),
            },
          ]
        : []),
      { label: 'Resmiyet', value: FORMALITY_LABELS[item.formality] },
      {
        label: 'Sıcaklık aralığı',
        value: `${item.temperatureRange.min}°C – ${item.temperatureRange.max}°C`,
      },
      ...(item.brand ? [{ label: 'Marka', value: item.brand }] : []),
    ];
  }, [item]);

  if (!item) {
    return (
      <Screen edges={['top']}>
        <Header title="Ürün" onBack={() => navigation.goBack()} />
        <Text variant="body" color={colors.textSecondary}>
          Ürün bulunamadı.
        </Text>
      </Screen>
    );
  }

  const handleDelete = () => {
    Alert.alert('Ürünü sil', `"${item.name}" gardırobundan kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await removeItem(item.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header
          title={item.name}
          subtitle={getCategoryLabel(item.category)}
          onBack={() => navigation.goBack()}
          rightIcon={item.isFavorite ? 'heart' : 'heart-outline'}
          rightAccessibilityLabel={
            item.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'
          }
          onRightPress={() => toggleFavorite(item.id)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Görsel ve etiketleri tek kartta: parçanın kimliği tek bakışta okunsun */}
        <Card padded={false}>
          <ClothingImage
            uri={item.imageUrl}
            category={item.category}
            colorsList={item.colors}
            style={styles.image}
            radiusSize={0}
            iconSize={56}
          />
          {(item.aiConfidence || item.isUserEdited || item.isFavorite) && (
            <View style={styles.badges}>
              {item.aiConfidence && !item.isUserEdited && (
                <Badge
                  label={`AI · %${Math.round(item.aiConfidence * 100)}`}
                  tone="accent"
                  icon="sparkles"
                />
              )}
              {item.isUserEdited && (
                <Badge label="Düzenlendi" tone="neutral" icon="create-outline" />
              )}
              {item.isFavorite && <Badge label="Favori" tone="danger" icon="heart" />}
            </View>
          )}
        </Card>

        <Card header={{ title: 'Kullanım', icon: 'analytics-outline' }}>
          <View style={styles.statsRow}>
            <Stat label="Giyilme" value={`${item.wearCount}`} />
            <Stat
              label="Son giyim"
              value={item.lastWornAt ? formatRelative(item.lastWornAt) : 'Hiç'}
            />
            <Stat label="Kombin" value={`${outfitCount}`} />
          </View>
        </Card>

        <Card padded={false} header={{ title: 'Özellikler', icon: 'pricetag-outline' }}>
          <View style={styles.attributes}>
            {attributes.map((attribute, index) => (
              <View key={attribute.label}>
                {index > 0 && <Divider />}
                <Attribute {...attribute} />
              </View>
            ))}
          </View>
        </Card>

        {item.notes && (
          <Card header={{ title: 'Not', icon: 'document-text-outline' }}>
            <Text variant="body" color={colors.textSecondary}>
              {item.notes}
            </Text>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            label="Bilgileri düzenle"
            icon="create-outline"
            variant="outline"
            onPress={() => navigation.navigate('EditItem', { itemId: item.id })}
            fullWidth
          />
          <Button
            label="Bunu nasıl kombinlerim?"
            icon="sparkles-outline"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Tabs', {
                screen: 'Assistant',
                params: {
                  initialQuestion: `${item.name} parçasını nasıl kombinlerim?`,
                  focusItemId: item.id,
                },
              })
            }
            fullWidth
          />
          <Button
            label="Gardıroptan sil"
            variant="danger"
            onPress={handleDelete}
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

/** Kart içi metrik: büyük değer önde, etiket geride */
const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text
      style={typography.title3}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {value}
    </Text>
    <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Attribute: React.FC<AttributeRow> = ({ label, value, swatches }) => (
  <View style={styles.attributeRow}>
    <Text variant="caption" color={colors.textTertiary} style={styles.attributeLabel}>
      {label}
    </Text>
    <View style={styles.attributeValue}>
      {swatches && (
        <View style={styles.swatches}>
          {swatches.map((hex) => (
            <View key={hex} style={[styles.swatch, { backgroundColor: hex }]} />
          ))}
        </View>
      )}
      <Text variant="callout" style={styles.attributeText}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: layout.screenPadding },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  image: { width: '100%', aspectRatio: 1 },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    padding: layout.cardPadding,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xxs },
  attributes: { paddingBottom: spacing.sm },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },
  attributeLabel: { width: 104, paddingTop: spacing.xxs },
  attributeValue: { flex: 1, gap: spacing.xs },
  attributeText: { flex: 1 },
  swatches: { flexDirection: 'row', gap: spacing.xs },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: { gap: spacing.sm, paddingTop: spacing.xs },
});
