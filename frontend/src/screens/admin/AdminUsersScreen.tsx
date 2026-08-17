import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Screen,
  Skeleton,
  Text,
  TextField,
  Chip,
} from '../../components/ui';
import { useAdminUsers, useIsAdmin } from '../../hooks/useAdmin';
import { useDebounce } from '../../hooks/useDebounce';
import { colors, layout, spacing } from '../../theme';
import type { AdminUserSummary } from '../../types/admin';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUsers'>;

/** Filtre çiplerinin tek listede tutulması: rol + aktiflik birlikte sıfırlanabilsin */
type QuickFilter = 'all' | 'admin' | 'active' | 'inactive';

const FILTER_LABELS: Record<QuickFilter, string> = {
  all: 'Tümü',
  admin: 'Yönetici',
  active: 'Aktif',
  inactive: 'Pasif',
};

export const AdminUsersScreen: React.FC<Props> = ({ navigation }) => {
  const isAdmin = useIsAdmin();
  const {
    users,
    total,
    hasMore,
    loadingMore,
    loading,
    error,
    isEmpty,
    setFilters,
    loadMore,
    refresh,
  } = useAdminUsers(isAdmin);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (!isAdmin) return;
    setFilters({
      // Boş arama undefined'a çevriliyor: aksi hâlde ilk açılışta '' -> undefined
      // farkı yüzünden liste iki kez çekiliyordu
      search: debouncedSearch.trim() || undefined,
      role: quickFilter === 'admin' ? 'admin' : undefined,
      isActive:
        quickFilter === 'active' ? true : quickFilter === 'inactive' ? false : undefined,
    });
  }, [isAdmin, debouncedSearch, quickFilter, setFilters]);

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} height={72} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Liste yüklenemedi"
          description={error}
          compact
        />
      );
    }
    if (isEmpty) {
      return (
        <EmptyState
          icon="search-outline"
          title="Eşleşen kullanıcı yok"
          description="Arama terimini veya filtreleri değiştirmeyi dene."
          compact
        />
      );
    }
    return null;
  }, [loading, error, isEmpty]);

  if (!isAdmin) {
    return (
      <Screen>
        <Header title="Kullanıcılar" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Bu alana erişim yetkin yok"
          actionLabel="Geri dön"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Kullanıcılar"
        subtitle={`${total} kayıt`}
        onBack={() => navigation.goBack()}
      />

      <TextField
        icon="search-outline"
        placeholder="Ad veya e-posta ara"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.filters}>
        {(Object.keys(FILTER_LABELS) as QuickFilter[]).map((key) => (
          <Chip
            key={key}
            label={FILTER_LABELS[key]}
            size="sm"
            selected={quickFilter === key}
            onPress={() => setQuickFilter(key)}
          />
        ))}
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={refresh}
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          hasMore ? (
            <Button
              label="Daha fazla yükle"
              variant="outline"
              size="sm"
              loading={loadingMore}
              onPress={loadMore}
              style={styles.more}
            />
          ) : null
        }
      />
    </Screen>
  );
};

const UserRow: React.FC<{ user: AdminUserSummary; onPress: () => void }> = ({
  user,
  onPress,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${user.fullName}, ${user.email}`}
    onPress={onPress}
  >
    {({ pressed }) => (
      <Card variant="subtle" style={pressed ? styles.pressed : undefined}>
        <View style={styles.row}>
          <Avatar name={user.fullName} size={42} />

          <View style={styles.texts}>
            <View style={styles.nameRow}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
                {user.fullName}
              </Text>
              {user.role === 'admin' && <Badge label="Yönetici" tone="accent" />}
              {!user.isActive && <Badge label="Pasif" tone="danger" />}
            </View>

            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {user.email}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {user.wardrobeCount} parça · {user.outfitCount} kombin
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </Card>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.sm, paddingBottom: layout.screenPadding },
  skeletons: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xxs },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: { flexShrink: 1 },
  pressed: { opacity: 0.9 },
  more: { marginTop: spacing.md, alignSelf: 'center' },
});
