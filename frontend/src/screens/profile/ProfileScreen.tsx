import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Avatar,
  Badge,
  Card,
  Divider,
  ListRow,
  ProgressBar,
  Screen,
  StatCard,
  Text,
} from '../../components/ui';
import { STYLE_LABELS } from '../../constants/categories';
import { useWardrobe } from '../../hooks/useWardrobe';
import { useAuthStore } from '../../store/authStore';
import { useOutfitStore } from '../../store/outfitStore';
import { colors, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Admin ekranları ayrı bir navigasyon parçası olarak ekleniyor */
type AdminRoute = 'AdminDashboard' | 'AdminUsers' | 'AdminSettings';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role);
  const logout = useAuthStore((state) => state.logout);
  const history = useOutfitStore((state) => state.history);
  const getLearned = useOutfitStore((state) => state.getLearnedPreferences);
  const wardrobe = useWardrobe(false);

  const learned = useMemo(() => getLearned(), [getLearned, history]);

  const wornCount = history.filter((outfit) => outfit.wornAt).length;
  const isAdmin = role === 'admin';

  // Admin rotalarının tipleri RootStackParamList'e ayrıca ekleniyor; tipler gelene
  // kadar derleme kırılmasın diye gevşek imzalı bir sarmalayıcı kullanılıyor.
  const openAdmin = (route: AdminRoute) =>
    (navigation as unknown as { navigate: (name: AdminRoute) => void }).navigate(route);

  const handleLogout = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen scroll contentContainerStyle={styles.content} bottomInset={spacing.xxl}>
      <Card>
        <View style={styles.identity}>
          <Avatar name={user?.fullName ?? 'Kullanıcı'} uri={user?.avatarUrl} size={56} />
          <View style={styles.identityTexts}>
            <Text variant="title3" numberOfLines={1}>
              {user?.fullName ?? 'Kullanıcı'}
            </Text>
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          {isAdmin && <Badge label="Yönetici" tone="dark" icon="shield-checkmark" />}
        </View>
      </Card>

      {/* Yönetim: yalnızca admin rolündeki kullanıcıya görünür */}
      {isAdmin && (
        <Card
          padded={false}
          header={{
            title: 'Yönetim',
            subtitle: 'Uygulama geneli ayarlar ve kullanıcılar',
            icon: 'shield-checkmark-outline',
          }}
        >
          <View style={styles.rowGroup}>
            <ListRow
              icon="speedometer-outline"
              title="Admin paneli"
              subtitle="Kullanım ve maliyet özeti"
              onPress={() => openAdmin('AdminDashboard')}
            />
            <Divider inset />
            <ListRow
              icon="people-outline"
              title="Kullanıcılar"
              subtitle="Hesapları görüntüle ve yönet"
              onPress={() => openAdmin('AdminUsers')}
            />
            <Divider inset />
            <ListRow
              icon="construct-outline"
              title="Sistem ayarları"
              subtitle="AI modelleri ve uygulama ayarları"
              onPress={() => openAdmin('AdminSettings')}
            />
          </View>
        </Card>
      )}

      <View style={styles.statsRow}>
        <StatCard
          compact
          label="Parça"
          value={wardrobe.items.length}
          icon="shirt-outline"
          style={styles.statCard}
        />
        <StatCard
          compact
          label="Kombin"
          value={history.length}
          icon="sparkles-outline"
          tone="accent"
          style={styles.statCard}
        />
        <StatCard
          compact
          label="Giyilen"
          value={wornCount}
          icon="checkmark-circle-outline"
          style={styles.statCard}
        />
      </View>

      <Card
        header={{
          title: 'AI seni ne kadar tanıyor?',
          icon: 'sparkles-outline',
          subtitle: `Öğrenme ilerlemesi %${learned.learningProgress}`,
        }}
      >
        <ProgressBar value={learned.learningProgress} color={colors.accent} />
        <Text variant="caption" color={colors.textSecondary}>
          {learned.learningProgress < 30
            ? 'Kombinleri değerlendirdikçe önerilerim sana daha çok benzeyecek.'
            : learned.learningProgress < 70
              ? 'Tarzını öğrenmeye başladım. Beğenilerini işaretlemeye devam et.'
              : 'Tarzını iyi tanıyorum — önerilerim artık epey isabetli.'}
        </Text>

        {learned.likedStyles.length > 0 && (
          <View style={styles.learnedStyles}>
            <Divider />
            <Text variant="captionStrong" color={colors.textTertiary}>
              Öne çıkan stillerin
            </Text>
            <View style={styles.badgeRow}>
              {learned.likedStyles.map((style) => (
                <Badge key={style} label={STYLE_LABELS[style]} tone="neutral" />
              ))}
            </View>
          </View>
        )}
      </Card>

      <Card padded={false} header={{ title: 'Ayarlar', icon: 'options-outline' }}>
        <View style={styles.rowGroup}>
          <ListRow
            icon="color-palette-outline"
            title="Stil tercihleri"
            subtitle="Sevdiğin stiller, kaçındığın renkler"
            onPress={() => navigation.navigate('StylePreferences')}
          />
          <Divider inset />
          <ListRow
            icon="notifications-outline"
            title="Bildirimler"
            subtitle={
              user?.notifications.dailyOutfitEnabled
                ? `Her sabah ${user.notifications.dailyOutfitTime}`
                : 'Kapalı'
            }
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <Divider inset />
          <ListRow
            icon="location-outline"
            title="Konum"
            subtitle={
              user?.location.useDeviceLocation
                ? 'Cihaz konumu kullanılıyor'
                : (user?.location.city ?? 'Belirlenmedi')
            }
            onPress={() => navigation.navigate('LocationSettings')}
          />
          <Divider inset />
          <ListRow
            icon="settings-outline"
            title="Uygulama ayarları"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </Card>

      <Card padded={false} header={{ title: 'Yakında', icon: 'time-outline' }}>
        <View style={styles.rowGroup}>
          {[
            { icon: 'calendar-outline' as const, label: 'Haftalık kombin planlama' },
            {
              icon: 'stats-chart-outline' as const,
              label: 'Kıyafet kullanım istatistikleri',
            },
            { icon: 'bag-handle-outline' as const, label: 'Alışveriş önerileri' },
          ].map((item) => (
            <ListRow
              key={item.label}
              icon={item.icon}
              title={item.label}
              showChevron={false}
              rightSlot={<Badge label="Yakında" tone="neutral" />}
            />
          ))}
        </View>
      </Card>

      <Card padded={false}>
        <ListRow
          icon="log-out-outline"
          title="Çıkış yap"
          destructive
          showChevron={false}
          onPress={handleLogout}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityTexts: { flex: 1, gap: spacing.xxs },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1 },
  // Kart içi liste grubu: satırlar arası boşluk kart ritmiyle karışmasın
  rowGroup: { paddingBottom: spacing.sm },
  learnedStyles: { gap: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
});
