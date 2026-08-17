import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ListRow,
  Screen,
  Skeleton,
  Text,
} from '../../components/ui';
import {
  FeedbackBar,
  OccasionSelector,
  OutfitPreview,
  ScoreBreakdown,
} from '../../components/outfit';
import { WeatherCard } from '../../components/weather';
import { OCCASION_MAP, getOccasionLabel } from '../../constants/occasions';
import { useDailyOutfit } from '../../hooks/useDailyOutfit';
import { useWardrobe } from '../../hooks/useWardrobe';
import { useWeather } from '../../hooks/useWeather';
import { useAuthStore } from '../../store/authStore';
import { useOutfitStore } from '../../store/outfitStore';
import { colors, layout, radius, spacing } from '../../theme';
import { formatLongDate, greetingForHour } from '../../utils/date';
import { scoreLabel } from '../../utils/styleRules';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((state) => state.user);
  const { weather, loading: weatherLoading, refresh: refreshWeather } = useWeather();
  const wardrobe = useWardrobe();
  const daily = useDailyOutfit();
  const fetchToday = useOutfitStore((state) => state.fetchToday);
  const clearOutfitError = useOutfitStore((state) => state.clearError);
  const [refreshing, setRefreshing] = useState(false);
  const [showScores, setShowScores] = useState(false);

  // Yenileme YALNIZCA veriyi tazeler; yeni kombin ÜRETMEZ.
  // Günün kombini günde bir kez oluşur (veya "Yeni kombin" ile elle istenir).
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWeather(true), wardrobe.refresh(), fetchToday()]);
    setRefreshing(false);
  }, [refreshWeather, wardrobe, fetchToday]);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const outfit = daily.outfit;
  /**
   * Ekrandaki kombin seçili ortama ait değilse "bayat" sayılır: "Spor" seçiliyken
   * günlük kombini göstermek yerine iskelet gösterilir.
   */
  const staleForOccasion = !!outfit && outfit.occasion !== daily.occasion;
  const busy = daily.generating || daily.preparing || !!daily.pendingOccasion;
  const loadingOutfit = busy && (!outfit || staleForOccasion);
  const occasionMeta = OCCASION_MAP[daily.occasion];

  const occasionHint = daily.pendingOccasion
    ? `${getOccasionLabel(daily.pendingOccasion)} için kombin hazırlanıyor…`
    : daily.readyOccasions.length > 1
      ? 'Hazır ortamlar arasında beklemeden geçiş yapabilirsin'
      : (occasionMeta?.description ?? 'Duruma göre kombin oluşturayım');

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.content}
      bottomInset={spacing.xxl}
    >
      {/* Selamlama: sayfa başlığı olduğu için kart değil */}
      <View style={styles.greeting}>
        <Text variant="title1">
          {greetingForHour()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {formatLongDate(new Date())}
        </Text>
      </View>

      <WeatherCard weather={weather} loading={weatherLoading} />

      {/* Durum seçici: yatay kaydırma kırpılmasın diye dolgu kutucukların içinde */}
      <Card
        padded={false}
        header={{
          title: 'Bugün nereye gidiyorsun?',
          subtitle: occasionHint,
          icon: 'compass-outline',
        }}
      >
        <OccasionSelector
          value={daily.occasion}
          onChange={daily.changeOccasion}
          disabled={busy}
          readyOccasions={daily.readyOccasions}
          pendingOccasion={daily.pendingOccasion}
        />
      </Card>

      {/* Kombin varken oluşan hatalar (üretim/geri bildirim) sessiz kalmasın:
          kullanıcı düğmeye bastığında hiçbir şey olmamış gibi görünüyordu */}
      {daily.error && daily.outfit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hatayı kapat"
          onPress={clearOutfitError}
          style={({ pressed }) => [styles.errorBanner, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={styles.errorText}>
            {daily.error}
          </Text>
          <Ionicons name="close" size={15} color={colors.danger} />
        </Pressable>
      )}

      <View style={styles.outfitSection} nativeID="daily-outfit">
        {loadingOutfit ? (
          <Card
            header={{
              title: 'Bugünün Kombini',
              subtitle: `${getOccasionLabel(daily.occasion)} için hazırlanıyor…`,
              icon: 'sparkles-outline',
            }}
          >
            {/* İskelet: gerçek kartla aynı yerleşimi taklit eder, sıçrama olmaz */}
            <View style={styles.skeletonRow}>
              <Skeleton width={76} height={76} borderRadius={radius.md} />
              <Skeleton width={76} height={76} borderRadius={radius.md} />
              <Skeleton width={76} height={76} borderRadius={radius.md} />
            </View>
            <View style={styles.skeletonLines}>
              <Skeleton height={12} />
              <Skeleton width="80%" height={12} />
            </View>
            <View style={styles.generatingRow}>
              <Ionicons name="sparkles" size={13} color={colors.accent} />
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={styles.generatingText}
              >
                Gardırobun, hava durumu ve tercihlerin değerlendiriliyor…
              </Text>
            </View>
          </Card>
        ) : !wardrobe.canGenerateOutfit ? (
          <Card header={{ title: 'Bugünün Kombini', icon: 'sparkles-outline' }}>
            <EmptyState
              compact
              icon="shirt-outline"
              title="Gardırobun henüz hazır değil"
              description={
                wardrobe.missingCategories.length
                  ? `Kombin oluşturabilmem için şunlara ihtiyacım var: ${wardrobe.missingCategories.join(', ')}`
                  : 'Birkaç parça ekleyerek başlayabilirsin.'
              }
              actionLabel="Kıyafet ekle"
              onAction={() => navigation.navigate('AddItem')}
            />
          </Card>
        ) : staleForOccasion ? (
          // Üretim başarısız olduysa başka ortamın kombinini göstermek yanıltıcı olur
          <Card
            header={{
              title: 'Bugünün Kombini',
              subtitle: getOccasionLabel(daily.occasion),
              icon: 'sparkles-outline',
            }}
          >
            <EmptyState
              compact
              icon="sparkles-outline"
              title="Bu ortam için kombin yok"
              description={daily.error ?? 'Senin için bir kombin oluşturayım mı?'}
              actionLabel="Kombin oluştur"
              onAction={daily.regenerate}
            />
          </Card>
        ) : outfit ? (
          <>
            <Card
              header={{
                title: 'Bugünün Kombini',
                subtitle: scoreLabel(outfit.score.overall),
                icon: 'sparkles-outline',
                action: {
                  label: 'Detay',
                  onPress: () =>
                    navigation.navigate('OutfitDetail', { outfitId: outfit.id }),
                },
              }}
            >
              <View style={styles.badgeRow}>
                <Badge
                  label={`%${outfit.score.overall} uyum`}
                  tone={outfit.score.overall >= 75 ? 'success' : 'accent'}
                  icon="sparkles"
                />
                {outfit.wornAt && (
                  <Badge label="Bugün giyildi" tone="dark" icon="checkmark-circle" />
                )}
              </View>

              <OutfitPreview
                outfit={outfit}
                size="lg"
                onItemPress={(slot) =>
                  navigation.navigate('ItemDetail', { itemId: slot.itemId })
                }
              />

              <Text variant="body">{outfit.summary}</Text>

              {outfit.stylingTip && (
                <View style={styles.tip}>
                  <Ionicons name="bulb-outline" size={15} color={colors.accentDark} />
                  <Text variant="caption" color={colors.accentDark} style={styles.tipText}>
                    {outfit.stylingTip}
                  </Text>
                </View>
              )}

              <Divider />

              {/* Skor dökümü kart içinde ayrı bir bölüm: açıldığında da hiyerarşi bozulmuyor */}
              <Button
                label={showScores ? 'Uyum detayını gizle' : 'Neden bu kombin?'}
                variant="ghost"
                size="sm"
                icon={showScores ? 'chevron-up' : 'chevron-down'}
                iconPosition="right"
                onPress={() => setShowScores((prev) => !prev)}
              />

              {showScores && (
                <View style={styles.scores}>
                  <ScoreBreakdown score={outfit.score} />
                </View>
              )}
            </Card>

            <FeedbackBar
              outfit={outfit}
              onLike={daily.like}
              onDislike={daily.dislike}
              onRegenerate={daily.regenerate}
              onWear={() => daily.markWorn()}
              regenerating={daily.generating}
            />
          </>
        ) : (
          <Card header={{ title: 'Bugünün Kombini', icon: 'sparkles-outline' }}>
            <EmptyState
              compact
              icon="sparkles-outline"
              title="Kombin hazır değil"
              description={daily.error ?? 'Senin için bir kombin oluşturayım mı?'}
              actionLabel="Kombin oluştur"
              onAction={daily.regenerate}
            />
          </Card>
        )}
      </View>

      <Card padded={false} header={{ title: 'Hızlı işlemler', icon: 'flash-outline' }}>
        <View style={styles.quickList}>
          <ListRow
            icon="add-circle-outline"
            title="Kıyafet ekle"
            subtitle="Fotoğrafını çek, gerisini AI halletsin"
            onPress={() => navigation.navigate('AddItem')}
          />
          <Divider inset />
          <ListRow
            icon="chatbubble-ellipses-outline"
            title="Stil asistanı"
            subtitle="Aklındaki soruyu sor"
            onPress={() => navigation.navigate('Tabs', { screen: 'Assistant' })}
          />
          <Divider inset />
          <ListRow
            icon="time-outline"
            title="Kombin geçmişi"
            subtitle="Neyi ne zaman giydin"
            onPress={() => navigation.navigate('Tabs', { screen: 'History' })}
          />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.md },
  greeting: { gap: spacing.xxs },
  outfitSection: { gap: spacing.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: { flex: 1 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tipText: { flex: 1 },
  scores: { paddingTop: spacing.xs },
  skeletonRow: { flexDirection: 'row', gap: spacing.md },
  skeletonLines: { gap: spacing.sm },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generatingText: { flex: 1 },
  quickList: { paddingBottom: spacing.sm },
});
