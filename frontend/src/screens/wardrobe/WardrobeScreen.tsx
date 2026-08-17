import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  ClothingCardSkeleton,
  Divider,
  EmptyState,
  IconButton,
  ListRow,
  Sheet,
  Text,
} from '../../components/ui';
import {
  ActiveFilterBar,
  CategoryFilterBar,
  ClothingCard,
  ItemActionSheet,
  OptionGroup,
  WardrobeToolbar,
  type ActiveFilter,
} from '../../components/wardrobe';
import {
  COLOR_FAMILY_HEX,
  COLOR_FAMILY_LABELS,
  COLOR_FAMILY_OPTIONS,
} from '../../constants/colorPalette';
import {
  SEASON_LABELS,
  SEASON_OPTIONS,
  STYLE_LABELS,
  STYLE_OPTIONS,
  getCategoryLabel,
} from '../../constants/categories';
import { useDebounce } from '../../hooks/useDebounce';
import { useWardrobe } from '../../hooks/useWardrobe';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { colors, layout, radius, spacing } from '../../theme';
import {
  WARDROBE_SORT_OPTIONS,
  sortLabelFor,
  sortWardrobeItems,
  type WardrobeSort,
} from '../../utils/wardrobeSort';
import type { ClothingItem, ColorFamily, Season, StyleTag } from '../../types/clothing';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const WardrobeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const wardrobe = useWardrobe();
  const fetchItems = useWardrobeStore((state) => state.fetchItems);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<WardrobeSort>('recent');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [actionItem, setActionItem] = useState<ClothingItem | null>(null);
  const debouncedSearch = useDebounce(search, 250);

  const items = useMemo(() => {
    const query = debouncedSearch.trim().toLocaleLowerCase('tr-TR');
    const filtered = query
      ? wardrobe.filteredItems.filter((item) =>
          [item.name, item.subcategory, item.brand, ...item.colors.map((c) => c.name)]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('tr-TR')
            .includes(query),
        )
      : wardrobe.filteredItems;

    return sortWardrobeItems(filtered, sort);
  }, [debouncedSearch, wardrobe.filteredItems, sort]);

  /** Kategori şeridi ayrı gösterildiği için burada yer almaz */
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const { season, colorFamily, style, favoritesOnly } = wardrobe.filters;
    const list: ActiveFilter[] = [];

    if (favoritesOnly) {
      list.push({
        key: 'favorites',
        label: 'Favoriler',
        onRemove: () => wardrobe.setFilters({ favoritesOnly: false }),
      });
    }
    if (season) {
      list.push({
        key: `season-${season}`,
        label: SEASON_LABELS[season],
        onRemove: () => wardrobe.setFilters({ season: undefined }),
      });
    }
    if (colorFamily) {
      list.push({
        key: `color-${colorFamily}`,
        label: COLOR_FAMILY_LABELS[colorFamily],
        dotColor: COLOR_FAMILY_HEX[colorFamily],
        onRemove: () => wardrobe.setFilters({ colorFamily: undefined }),
      });
    }
    if (style) {
      list.push({
        key: `style-${style}`,
        label: STYLE_LABELS[style],
        onRemove: () => wardrobe.setFilters({ style: undefined }),
      });
    }
    return list;
  }, [wardrobe]);

  const category = wardrobe.filters.category ?? 'all';
  const isNarrowed = items.length !== wardrobe.items.length;
  const hasQuery = debouncedSearch.trim().length > 0;

  const clearAll = useCallback(() => {
    wardrobe.resetFilters();
    setSearch('');
  }, [wardrobe]);

  const closeActions = useCallback(() => setActionItem(null), []);

  const handleDelete = useCallback(
    (item: ClothingItem) => {
      closeActions();
      Alert.alert('Ürünü sil', `"${item.name}" gardırobundan kaldırılsın mı?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => wardrobe.removeItem(item.id),
        },
      ]);
    },
    [closeActions, wardrobe],
  );

  const subtitle = isNarrowed
    ? `${items.length} sonuç · ${wardrobe.items.length} parça`
    : wardrobe.favorites.length > 0
      ? `${wardrobe.items.length} parça · ${wardrobe.favorites.length} favori`
      : `${wardrobe.items.length} parça`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sabit üst blok: başlık + araç çubuğu + kategori şeridi + aktif filtreler */}
      <View style={styles.header}>
        <View style={styles.headerPadded}>
          <View style={styles.titleRow}>
            <View style={styles.titleTexts}>
              <Text variant="title1">Gardırop</Text>
              <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <IconButton
              icon="add"
              accessibilityLabel="Kıyafet ekle"
              onPress={() => navigation.navigate('AddItem')}
              background={colors.primary}
              color={colors.primaryText}
              size={22}
            />
          </View>

          <WardrobeToolbar
            search={search}
            onSearchChange={setSearch}
            activeFilterCount={activeFilters.length}
            onOpenFilters={() => setFilterSheetOpen(true)}
            sortLabel={sortLabelFor(sort)}
            onOpenSort={() => setSortSheetOpen(true)}
          />
        </View>

        <CategoryFilterBar
          value={category}
          onChange={(next) => wardrobe.setFilters({ category: next })}
          counts={wardrobe.counts}
          total={wardrobe.items.length}
        />

        <ActiveFilterBar filters={activeFilters} onClearAll={clearAll} />
      </View>

      {wardrobe.error && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
          onPress={() => fetchItems()}
          style={({ pressed }) => [styles.error, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="cloud-offline-outline" size={15} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={styles.errorText}>
            {wardrobe.error}
          </Text>
          <Text variant="captionStrong" color={colors.danger}>
            Tekrar dene
          </Text>
        </Pressable>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // İlk yüklemede iskelet gösterilir; çekerek yenileme yalnızca dolu listede
        onRefresh={wardrobe.items.length > 0 ? wardrobe.refresh : undefined}
        refreshing={wardrobe.loading && wardrobe.items.length > 0}
        renderItem={({ item }) => (
          // Hücre sarmalayıcı: tek elemanlı son satırda kart tüm genişliği kaplamasın
          <View style={styles.cell}>
            <ClothingCard
              item={item}
              onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
              onLongPress={setActionItem}
              onToggleFavorite={() => wardrobe.toggleFavorite(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          wardrobe.loading ? (
            <View style={styles.skeletonGrid}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.skeletonCell}>
                  <ClothingCardSkeleton />
                </View>
              ))}
            </View>
          ) : wardrobe.items.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="Gardırobun boş"
              description="İlk kıyafetini ekle — fotoğrafını çek, gerisini AI halletsin."
              actionLabel="İlk kıyafeti ekle"
              onAction={() => navigation.navigate('AddItem')}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="Sonuç bulunamadı"
              description={
                hasQuery
                  ? `“${debouncedSearch.trim()}” ile eşleşen parça yok. Aramayı veya filtreleri değiştirmeyi dene.`
                  : category !== 'all'
                    ? `${getCategoryLabel(category)} kategorisinde bu filtrelere uyan parça yok.`
                    : 'Bu filtrelere uyan parça yok.'
              }
              actionLabel="Filtreleri temizle"
              onAction={clearAll}
            />
          )
        }
      />

      {/* Uzun basış: favori / düzenle / asistana sor / sil */}
      <ItemActionSheet
        item={actionItem}
        onClose={closeActions}
        onToggleFavorite={(item) => {
          wardrobe.toggleFavorite(item.id);
          closeActions();
        }}
        onEdit={(item) => {
          closeActions();
          navigation.navigate('EditItem', { itemId: item.id });
        }}
        onAskAssistant={(item) => {
          closeActions();
          navigation.navigate('Tabs', {
            screen: 'Assistant',
            params: {
              initialQuestion: `${item.name} parçasını nasıl kombinlerim?`,
              focusItemId: item.id,
            },
          });
        }}
        onDelete={handleDelete}
      />

      <Sheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title="Sırala"
        subtitle="Listenin sırasını değiştir"
      >
        <View style={styles.sheetGroup}>
          {WARDROBE_SORT_OPTIONS.map((option, index) => (
            <React.Fragment key={option.key}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon={option.icon}
                title={option.label}
                subtitle={option.hint}
                showChevron={false}
                onPress={() => {
                  setSort(option.key);
                  setSortSheetOpen(false);
                }}
                rightSlot={
                  sort === option.key ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accentDark} />
                  ) : undefined
                }
              />
            </React.Fragment>
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filtrele"
        subtitle="Gardırobunu daralt"
        scrollable
      >
        <Chip
          label="Sadece favoriler"
          icon="heart"
          selected={!!wardrobe.filters.favoritesOnly}
          onPress={() =>
            wardrobe.setFilters({ favoritesOnly: !wardrobe.filters.favoritesOnly })
          }
          style={styles.favoriteChip}
        />

        <OptionGroup
          label="Mevsim"
          options={SEASON_OPTIONS.map((season) => ({
            value: season,
            label: SEASON_LABELS[season],
          }))}
          value={wardrobe.filters.season ?? ''}
          onSelect={(season) =>
            wardrobe.setFilters({
              season: wardrobe.filters.season === season ? undefined : (season as Season),
            })
          }
        />

        <OptionGroup
          label="Renk"
          options={COLOR_FAMILY_OPTIONS.map((family) => ({
            value: family,
            label: COLOR_FAMILY_LABELS[family],
            dotColor: COLOR_FAMILY_HEX[family],
          }))}
          value={wardrobe.filters.colorFamily ?? ''}
          onSelect={(family) =>
            wardrobe.setFilters({
              colorFamily:
                wardrobe.filters.colorFamily === family
                  ? undefined
                  : (family as ColorFamily),
            })
          }
        />

        <OptionGroup
          label="Stil"
          options={STYLE_OPTIONS.map((style) => ({
            value: style,
            label: STYLE_LABELS[style],
          }))}
          value={wardrobe.filters.style ?? ''}
          onSelect={(style) =>
            wardrobe.setFilters({
              style: wardrobe.filters.style === style ? undefined : (style as StyleTag),
            })
          }
        />

        <View style={styles.sheetActions}>
          <Button
            label="Temizle"
            variant="outline"
            onPress={clearAll}
            style={styles.sheetButton}
          />
          <Button
            label={isNarrowed ? `${items.length} parçayı gör` : 'Uygula'}
            onPress={() => setFilterSheetOpen(false)}
            style={styles.sheetButton}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  // Kategori şeridi kenardan kenara kayar; başlık ve araç çubuğu dolgulu kalır
  headerPadded: { paddingHorizontal: layout.screenPadding, gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleTexts: { flex: 1, gap: spacing.xxs },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },
  errorText: { flex: 1 },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  column: { gap: spacing.md },
  cell: { flex: 1, maxWidth: '48.5%' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  skeletonCell: { width: '47%' },
  favoriteChip: { alignSelf: 'flex-start' },
  sheetGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sheetButton: { flex: 1 },
});
