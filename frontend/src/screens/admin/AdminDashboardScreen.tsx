import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  Header,
  ProgressBar,
  Screen,
  SegmentedControl,
  StatCard,
  Text,
} from '../../components/ui';
import {
  FEATURE_LABELS,
  formatCompact,
  formatUsd,
  useAdminOverview,
  useIsAdmin,
} from '../../hooks/useAdmin';
import { colors, radius, spacing } from '../../theme';
import { formatShortDate } from '../../utils/date';
import type { AiUsageSummary } from '../../types/admin';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

type Period = 'today' | 'month';

const PERIOD_OPTIONS = [
  { value: 'today' as const, label: 'Bugün' },
  { value: 'month' as const, label: 'Bu ay' },
];

/** Grafik yüksekliği piksel cinsinden sabit; barlar buna oranlanır */
const CHART_HEIGHT = 96;

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const isAdmin = useIsAdmin();
  const { overview, usage, settings, loading, error, refresh } = useAdminOverview(isAdmin);

  const [period, setPeriod] = useState<Period>('today');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const bucket = useMemo(
    () => (period === 'today' ? usage?.today : usage?.month),
    [period, usage],
  );

  if (!isAdmin) {
    return (
      <Screen>
        <Header title="Yönetim" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Bu alana erişim yetkin yok"
          description="Yönetim paneli yalnızca yönetici hesaplarına açıktır."
          actionLabel="Geri dön"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (error && !overview) {
    return (
      <Screen>
        <Header title="Yönetim" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cloud-offline-outline"
          title="Veriler yüklenemedi"
          description={error}
          actionLabel="Tekrar dene"
          onAction={handleRefresh}
        />
      </Screen>
    );
  }

  const skeleton = loading && !overview;
  const featureTotal = (usage?.byFeature ?? []).reduce((sum, item) => sum + item.cost, 0);

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={handleRefresh}
      bottomInset={spacing.xxl}
    >
      <Header
        title="Yönetim"
        subtitle="Kullanım, kullanıcılar ve ayarlar"
        onBack={() => navigation.goBack()}
        rightIcon="options-outline"
        rightAccessibilityLabel="Ayarlar"
        onRightPress={() => navigation.navigate('AdminSettings')}
      />

      <View style={styles.stack}>
        {/* --- AI harcaması --- */}
        <View style={styles.row}>
          <StatCard
            style={styles.half}
            label="Bugünkü harcama"
            value={formatUsd(usage?.today.cost ?? 0)}
            hint={`${usage?.today.requests ?? 0} istek`}
            icon="flash-outline"
            tone="accent"
            loading={skeleton}
          />
          <StatCard
            style={styles.half}
            label="Bu ay"
            value={formatUsd(usage?.month.cost ?? 0)}
            hint={`${usage?.month.requests ?? 0} istek`}
            icon="calendar-outline"
            loading={skeleton}
          />
        </View>

        {/* --- Sağlayıcı (OpenRouter) --- */}
        <ProviderCard provider={usage?.provider ?? null} />

        {/* --- Günlük seri --- */}
        {usage && usage.dailySeries.length > 0 && (
          <Card
            header={{
              title: 'Son 14 gün',
              subtitle: 'Günlük AI maliyeti',
              icon: 'bar-chart-outline',
            }}
          >
            <UsageChart series={usage.dailySeries} />
          </Card>
        )}

        {/* --- Özellik bazlı dağılım --- */}
        <Card header={{ title: 'Özellik bazlı kullanım', icon: 'layers-outline' }}>
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            size="sm"
          />

          <View style={styles.bucketRow}>
            <BucketFigure label="Maliyet" value={formatUsd(bucket?.cost ?? 0)} />
            <BucketFigure label="İstek" value={String(bucket?.requests ?? 0)} />
            <BucketFigure label="Token" value={formatCompact(bucket?.tokens ?? 0)} />
          </View>

          <Divider />

          {(usage?.byFeature ?? []).map((entry) => {
            const share = featureTotal > 0 ? (entry.cost / featureTotal) * 100 : 0;
            return (
              <View key={entry.feature} style={styles.featureRow}>
                <View style={styles.featureHead}>
                  <Text variant="bodyMedium">{FEATURE_LABELS[entry.feature]}</Text>
                  <Text variant="captionStrong" color={colors.textSecondary}>
                    {formatUsd(entry.cost)}
                  </Text>
                </View>
                <ProgressBar value={share} color={colors.accentMuted} height={5} />
                <Text variant="caption" color={colors.textTertiary}>
                  {entry.requests} istek · %{share.toFixed(0)}
                </Text>
              </View>
            );
          })}

          <Text variant="caption" color={colors.textTertiary}>
            Özellik dağılımı toplam kayıtlar üzerinden hesaplanır; üstteki rakamlar seçili
            döneme aittir.
          </Text>
        </Card>

        {/* --- Kullanıcı özeti --- */}
        <View style={styles.row}>
          <StatCard
            style={styles.half}
            label="Kullanıcı"
            value={overview?.users.total ?? 0}
            hint={`${overview?.users.active ?? 0} aktif`}
            icon="people-outline"
            loading={skeleton}
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <StatCard
            style={styles.half}
            label="Son 7 gün"
            value={overview?.users.newLast7Days ?? 0}
            hint={`${overview?.users.admins ?? 0} yönetici`}
            icon="person-add-outline"
            tone="success"
            loading={skeleton}
          />
        </View>

        {/* --- İçerik özeti --- */}
        <Card
          header={{
            title: 'İçerik',
            icon: 'albums-outline',
            action: {
              label: 'Kullanıcılar',
              onPress: () => navigation.navigate('AdminUsers'),
            },
          }}
        >
          <View style={styles.contentGrid}>
            <BucketFigure
              label="Kıyafet"
              value={formatCompact(overview?.content.wardrobeItems ?? 0)}
            />
            <BucketFigure
              label="Kombin"
              value={formatCompact(overview?.content.outfits ?? 0)}
            />
            <BucketFigure
              label="Giyilen"
              value={formatCompact(overview?.content.wornOutfits ?? 0)}
            />
            <BucketFigure
              label="Mesaj"
              value={formatCompact(overview?.content.chatMessages ?? 0)}
            />
          </View>
        </Card>

        {/* --- Aktif modeller --- */}
        <Card
          header={{
            title: 'Aktif modeller',
            icon: 'sparkles-outline',
            action: {
              label: 'Değiştir',
              onPress: () => navigation.navigate('AdminSettings'),
            },
          }}
        >
          <ModelLine label="Metin" value={settings?.aiModel} />
          <Divider />
          <ModelLine label="Görsel" value={settings?.aiVisionModel} />
          {settings && !settings.aiFeaturesEnabled && (
            <Badge
              label="AI özellikleri kapalı"
              tone="danger"
              icon="pause-circle-outline"
            />
          )}
        </Card>
      </View>
    </Screen>
  );
};

/** Sağlayıcının kendi bildirdiği harcama; bizim kaydımızla birebir aynı olmayabilir */
const ProviderCard: React.FC<{ provider: AiUsageSummary['provider'] }> = ({ provider }) => {
  if (!provider) {
    return (
      <Card variant="subtle" header={{ title: 'OpenRouter hesabı', icon: 'cloud-outline' }}>
        <Text variant="callout" color={colors.textSecondary}>
          Sağlayıcı verisine şu an ulaşılamıyor.
        </Text>
      </Card>
    );
  }

  const used = provider.limit
    ? Math.min(100, (provider.usageTotal / provider.limit) * 100)
    : 0;

  return (
    <Card header={{ title: 'OpenRouter hesabı', icon: 'cloud-outline' }}>
      <View style={styles.bucketRow}>
        <BucketFigure label="Bugün" value={formatUsd(provider.usageDaily)} />
        <BucketFigure label="Bu ay" value={formatUsd(provider.usageMonthly)} />
        <BucketFigure
          label="Kalan"
          value={
            provider.limitRemaining === null
              ? 'Limitsiz'
              : formatUsd(provider.limitRemaining, 2)
          }
        />
      </View>

      {provider.limit !== null && (
        <ProgressBar value={used} color={used > 85 ? colors.danger : colors.primary} />
      )}

      <Text variant="caption" color={colors.textTertiary}>
        Sağlayıcı verisi tüm anahtar kullanımını kapsar; uygulama içi kayıtla farklı
        olabilir.
      </Text>
    </Card>
  );
};

/** Kütüphanesiz çubuk grafik: sabit yükseklikli kutuya oranlanmış View'ler */
const UsageChart: React.FC<{ series: AiUsageSummary['dailySeries'] }> = ({ series }) => {
  const data = series.slice(-14);
  const max = Math.max(...data.map((day) => day.cost));

  return (
    <View>
      <View style={styles.chart}>
        {data.map((day, index) => (
          <View key={day.date} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                {
                  // 3px taban: sıfır harcamalı gün de görünsün
                  height: max > 0 ? Math.max(3, (day.cost / max) * CHART_HEIGHT) : 3,
                  backgroundColor:
                    index === data.length - 1 ? colors.accent : colors.accentMuted,
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.chartFooter}>
        <Text variant="caption" color={colors.textTertiary}>
          {formatShortDate(data[0].date)}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          en yüksek {formatUsd(max)}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {formatShortDate(data[data.length - 1].date)}
        </Text>
      </View>
    </View>
  );
};

const BucketFigure: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.figure}>
    <Text variant="title3" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      {value}
    </Text>
    <Text variant="caption" color={colors.textTertiary}>
      {label}
    </Text>
  </View>
);

const ModelLine: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.modelLine}>
    <Text variant="caption" color={colors.textTertiary}>
      {label}
    </Text>
    <Text variant="bodyMedium" numberOfLines={1}>
      {value ?? '—'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  bucketRow: { flexDirection: 'row', gap: spacing.md },
  figure: { flex: 1, gap: spacing.xxs },
  contentGrid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  featureRow: { gap: spacing.xs },
  featureHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: radius.xs },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  modelLine: { gap: spacing.xxs },
});
