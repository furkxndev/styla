import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import type { ClothingItem } from '../../types/clothing';
import { itemSubtitle } from '../../utils/format';
import { Divider } from '../ui/Divider';
import { ListRow } from '../ui/ListRow';
import { Sheet } from '../ui/Sheet';

interface ItemActionSheetProps {
  /** null iken sheet kapalıdır */
  item: ClothingItem | null;
  onClose: () => void;
  onToggleFavorite: (item: ClothingItem) => void;
  onEdit: (item: ClothingItem) => void;
  onAskAssistant: (item: ClothingItem) => void;
  onDelete: (item: ClothingItem) => void;
}

/**
 * Karta uzun basınca açılan hızlı işlemler.
 * Detay sayfasına gitmeden favori/düzenle/sil yapılabilir.
 */
export const ItemActionSheet: React.FC<ItemActionSheetProps> = ({
  item,
  onClose,
  onToggleFavorite,
  onEdit,
  onAskAssistant,
  onDelete,
}) => {
  /**
   * Kapanış animasyonu sürerken içerik boşalmasın: sheet dışarı kayarken
   * son seçilen ürün gösterilmeye devam eder.
   */
  const [shown, setShown] = useState<ClothingItem | null>(item);

  useEffect(() => {
    if (item) setShown(item);
  }, [item]);

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      title={shown?.name ?? ''}
      subtitle={shown ? itemSubtitle(shown) : undefined}
    >
      {shown && (
        <Actions item={shown} {...{ onToggleFavorite, onEdit, onAskAssistant, onDelete }} />
      )}
    </Sheet>
  );
};

const Actions: React.FC<{
  item: ClothingItem;
  onToggleFavorite: (item: ClothingItem) => void;
  onEdit: (item: ClothingItem) => void;
  onAskAssistant: (item: ClothingItem) => void;
  onDelete: (item: ClothingItem) => void;
}> = ({ item, onToggleFavorite, onEdit, onAskAssistant, onDelete }) => (
  <View style={styles.group}>
    <ListRow
      icon={item.isFavorite ? 'heart-dislike-outline' : 'heart-outline'}
      title={item.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      showChevron={false}
      onPress={() => onToggleFavorite(item)}
    />
    <Divider inset />
    <ListRow
      icon="create-outline"
      title="Düzenle"
      subtitle="Bilgileri güncelle"
      onPress={() => onEdit(item)}
    />
    <Divider inset />
    <ListRow
      icon="sparkles-outline"
      title="Bunu nasıl kombinlerim?"
      subtitle="Stil asistanına sor"
      onPress={() => onAskAssistant(item)}
    />
    <Divider inset />
    <ListRow
      icon="trash-outline"
      title="Sil"
      tone="danger"
      showChevron={false}
      onPress={() => onDelete(item)}
    />
  </View>
);

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
