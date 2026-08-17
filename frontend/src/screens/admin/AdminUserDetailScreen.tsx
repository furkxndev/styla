import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Header,
  ListRow,
  Screen,
  Skeleton,
  StatCard,
  Text,
} from '../../components/ui';
import { useIsAdmin } from '../../hooks/useAdmin';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';
import { formatRelative } from '../../utils/date';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUserDetail'>;

export const AdminUserDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const isAdmin = useIsAdmin();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const user = useAdminStore((state) => state.selectedUser);
  const status = useAdminStore((state) => state.selectedStatus);
  const error = useAdminStore((state) => state.selectedError);
  const selectUser = useAdminStore((state) => state.selectUser);
  const updateUser = useAdminStore((state) => state.updateUser);
  const deleteUser = useAdminStore((state) => state.deleteUser);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAdmin) selectUser(userId);
  }, [isAdmin, userId, selectUser]);

  /** Backend'in kendini-koruma hataları (400) kullanıcıya olduğu gibi gösterilir */
  const run = useCallback(
    async (action: () => Promise<string | null>, successNavigateBack = false) => {
      setBusy(true);
      const failure = await action();
      setBusy(false);
      if (failure) {
        Alert.alert('İşlem tamamlanamadı', failure);
        return;
      }
      if (successNavigateBack) navigation.goBack();
    },
    [navigation],
  );

  if (!isAdmin) {
    return (
      <Screen>
        <Header title="Kullanıcı" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Bu alana erişim yetkin yok"
          actionLabel="Geri dön"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <Header title="Kullanıcı" onBack={() => navigation.goBack()} />
        {status === 'loading' ? (
          <View style={styles.skeletons}>
            <Skeleton height={96} />
            <Skeleton height={72} />
            <Skeleton height={140} />
          </View>
        ) : (
          <EmptyState
            icon="person-remove-outline"
            title="Kullanıcı bulunamadı"
            description={error ?? 'Kayıt silinmiş olabilir.'}
            actionLabel="Geri dön"
            onAction={() => navigation.goBack()}
          />
        )}
      </Screen>
    );
  }

  const isSelf = user.id === currentUserId;
  const nextRole = user.role === 'admin' ? 'user' : 'admin';

  const confirmRoleChange = () => {
    Alert.alert(
      'Rolü değiştir',
      user.role === 'admin'
        ? `${user.fullName} yönetici yetkilerini kaybedecek. Devam edilsin mi?`
        : `${user.fullName} yönetici olacak ve tüm verilere erişebilecek. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Değiştir',
          onPress: () => run(() => updateUser(user.id, { role: nextRole })),
        },
      ],
    );
  };

  const confirmActiveToggle = () => {
    Alert.alert(
      user.isActive ? 'Hesabı pasife al' : 'Hesabı aktifleştir',
      user.isActive
        ? `${user.fullName} giriş yapamayacak. Devam edilsin mi?`
        : `${user.fullName} tekrar giriş yapabilecek. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: user.isActive ? 'Pasife al' : 'Aktifleştir',
          onPress: () => run(() => updateUser(user.id, { isActive: !user.isActive })),
        },
      ],
    );
  };

  // Silme yıkıcı: iki ayrı onay penceresi, ikincisi hesabı adıyla hatırlatır
  const confirmDelete = () => {
    Alert.alert(
      'Hesabı sil',
      `${user.fullName} hesabı ve tüm verileri kalıcı olarak silinecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Emin misin?', `${user.email} geri alınamaz şekilde silinecek.`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () => run(() => deleteUser(user.id), true),
              },
            ]),
        },
      ],
    );
  };

  return (
    <Screen scroll bottomInset={spacing.xxl}>
      <Header title="Kullanıcı" onBack={() => navigation.goBack()} />

      <View style={styles.stack}>
        <Card>
          <View style={styles.identity}>
            <Avatar name={user.fullName} size={56} />
            <View style={styles.identityTexts}>
              <Text variant="title3" numberOfLines={1}>
                {user.fullName}
              </Text>
              <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={styles.badges}>
                <Badge
                  label={user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                  tone={user.role === 'admin' ? 'accent' : 'neutral'}
                />
                <Badge
                  label={user.isActive ? 'Aktif' : 'Pasif'}
                  tone={user.isActive ? 'success' : 'danger'}
                />
                {!user.onboardingCompleted && (
                  <Badge label="Kurulum yarım" tone="warning" />
                )}
                {isSelf && <Badge label="Sen" tone="info" />}
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.row}>
          <StatCard
            style={styles.half}
            label="Parça"
            value={user.wardrobeCount}
            icon="shirt-outline"
          />
          <StatCard
            style={styles.half}
            label="Kombin"
            value={user.outfitCount}
            icon="sparkles-outline"
          />
        </View>

        <Card padded={false}>
          <ListRow
            icon="calendar-outline"
            title="Kayıt tarihi"
            value={formatRelative(user.createdAt)}
            showChevron={false}
          />
          <ListRow
            icon="time-outline"
            title="Son kombin"
            value={user.lastOutfitAt ? formatRelative(user.lastOutfitAt) : 'Yok'}
            showChevron={false}
          />
        </Card>

        <Card padded={false}>
          <ListRow
            icon="shield-checkmark-outline"
            title={user.role === 'admin' ? 'Yönetici yetkisini kaldır' : 'Yönetici yap'}
            subtitle="Rol değişikliği anında geçerli olur"
            showChevron={false}
            onPress={busy ? undefined : confirmRoleChange}
          />
          <ListRow
            icon={user.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            title={user.isActive ? 'Hesabı pasife al' : 'Hesabı aktifleştir'}
            subtitle="Pasif hesaplar giriş yapamaz"
            showChevron={false}
            onPress={busy ? undefined : confirmActiveToggle}
          />
        </Card>

        <Card padded={false}>
          <ListRow
            icon="trash-outline"
            title="Hesabı sil"
            subtitle="Gardırop, kombinler ve sohbetler dahil her şey silinir"
            tone="danger"
            showChevron={false}
            onPress={busy ? undefined : confirmDelete}
          />
        </Card>

        {isSelf && (
          <Text variant="caption" color={colors.textTertiary} align="center">
            Kendi hesabın: sunucu bazı işlemleri güvenlik gereği reddedebilir.
          </Text>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  skeletons: { gap: spacing.md },
  identity: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  identityTexts: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
