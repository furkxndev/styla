import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chip,
  EmptyState,
  OutfitCardSkeleton,
  SegmentedControl,
  StatCard,
  Text,
} from '../../components/ui';
import { OutfitCard } from '../../components/outfit';
import { OCCASIONS } from '../../constants/occasions';
import { useOutfitStore } from '../../store/outfitStore';
import { colors, layout, spacing } from '../../theme';
import type { Occasion } from '../../types/outfit';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
/**
 * Geçmiş yalnızca kullanıcının sahiplendiği kombinleri tutar:
 * giydikleri ve beğendikleri. Üretilip dokunulmamış öneriler burada listelenmez —
 * onlar ana sayfadaki "Bugünün Kombini" akışına aittir.
 */
type Filter = 'worn' | 'liked';

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'worn', label: 'Giydiklerim' },
  { value: 'liked', label: 'Beğendiklerim' },
];

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const history = useOutfitStore((state) => state.history);
  const status = useOutfitStore((state) => state.status);
  const fetchHistory = useOutfitStore((state) => state.fetchHistory);

  const [filter, setFilter] = useState<Filter>('worn');
  const [occasion, setOccasion] = useState<Occasion | 'all'>('all');

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = useMemo(
    () =>
      history.filter((outfit) => {
        // Sahiplenilmemiş (yalnızca üretilmiş) kombinler geçmişe girmez
        if (filter === 'worn' ? !outfit.wornAt : outfit.feedback !== 'liked') return false;
        if (occasion !== 'all' && outfit.occasion !== occasion) return false;
        return true;
      }),
    [history, filter, occasion],
  );

  const stats = useMemo(() => {
    const worn = history.filter((outfit) => outfit.wornAt);
    const liked = history.filter((outfit) => outfit.feedback === 'liked');
    const uniqueDays = new Set(worn.map((outfit) => outfit.wornAt?.slice(0, 10)));
    return { worn: worn.length, liked: liked.length, days: uniqueDays.size };
  }, [history]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(outfit) => outfit.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={status === 'loading'}
        onRefresh={() => fetchHistory({ silent: true })}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text variant="title1">Kombin Geçmişi</Text>
              <Text variant="caption" color={colors.textTertiary}>
                Giydiğin ve beğendiğin kombinler
              </Text>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                compact
                label="Giyilen"
                value={stats.worn}
                icon="shirt-outline"
                style={styles.statCard}
              />
              <StatCard
                compact
                label="Kayıtlı gün"
                value={stats.days}
                icon="calendar-outline"
                style={styles.statCard}
              />
              <StatCard
                compact
                label="Beğenilen"
                value={stats.liked}
                icon="heart-outline"
                tone="accent"
                style={styles.statCard}
              />
            </View>

            {/* Birbirini dışlayan üç seçim: çip yığını yerine tek bir segment kontrolü */}
            <View style={styles.filters}>
              <SegmentedControl
                options={FILTER_OPTIONS}
                value={filter}
                onChange={setFilter}
                size="sm"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.occasionRow}
              >
                <Chip
                  label="Tüm durumlar"
                  size="sm"
                  selected={occasion === 'all'}
                  onPress={() => setOccasion('all')}
                />
                {OCCASIONS.map((item) => (
                  <Chip
                    key={item.key}
                    label={item.label}
                    size="sm"
                    selected={occasion === item.key}
                    onPress={() => setOccasion(item.key)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            onPress={() => navigation.navigate('OutfitDetail', { outfitId: item.id })}
          />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <View style={styles.skeletons}>
              <OutfitCardSkeleton />
              <OutfitCardSkeleton />
            </View>
          ) : filter === 'worn' ? (
            <EmptyState
              icon="shirt-outline"
              title="Henüz giydiğin kombin yok"
              description="Ana sayfadaki günün kombininde 'Bugün bunu giydim' dediğinde burada birikmeye başlar."
              actionLabel="Bugünün kombinine git"
              onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
            />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="Henüz beğendiğin kombin yok"
              description="Beğendiğin kombinleri kalp simgesiyle işaretle, buradan tekrar bakabilirsin."
              actionLabel="Bugünün kombinine git"
              onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
            />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.huge,
  },
  header: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerTexts: { gap: spacing.xxs },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1 },
  filters: { gap: spacing.md },
  occasionRow: { gap: spacing.sm, paddingVertical: spacing.xxs },
  separator: { height: spacing.md },
  skeletons: { gap: spacing.md },
});
