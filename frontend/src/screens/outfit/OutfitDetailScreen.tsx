import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Badge,
  Button,
  Card,
  Divider,
  Header,
  Screen,
  Text,
  TextField,
} from '../../components/ui';
import { FeedbackBar, ScoreBreakdown } from '../../components/outfit';
import { ClothingImage } from '../../components/wardrobe';
import { WeatherPill } from '../../components/weather';
import { getOccasionLabel } from '../../constants/occasions';
import { useOutfitStore } from '../../store/outfitStore';
import { useWeatherStore } from '../../store/weatherStore';
import { colors, layout, radius, spacing } from '../../theme';
import { formatLongDate } from '../../utils/date';
import { scoreLabel } from '../../utils/styleRules';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OutfitDetail'>;

export const OutfitDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { outfitId } = route.params;
  const outfit = useOutfitStore((state) =>
    state.todayOutfit?.id === outfitId
      ? state.todayOutfit
      : state.history.find((entry) => entry.id === outfitId),
  );
  const like = useOutfitStore((state) => state.like);
  const dislike = useOutfitStore((state) => state.dislike);
  const markWorn = useOutfitStore((state) => state.markWorn);
  const removeOutfit = useOutfitStore((state) => state.removeOutfit);
  const generate = useOutfitStore((state) => state.generate);
  const generating = useOutfitStore((state) => state.generating);
  const weather = useWeatherStore((state) => state.weather);

  const [note, setNote] = useState('');

  if (!outfit) {
    return (
      <Screen edges={['top']}>
        <Header title="Kombin" onBack={() => navigation.goBack()} />
        <Text variant="body" color={colors.textSecondary}>
          Kombin bulunamadı.
        </Text>
      </Screen>
    );
  }

  const handleDelete = () => {
    Alert.alert('Kombini sil', 'Bu kombin geçmişinden kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await removeOutfit(outfit.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header
          title={getOccasionLabel(outfit.occasion)}
          subtitle={formatLongDate(outfit.date)}
          onBack={() => navigation.goBack()}
          rightIcon="trash-outline"
          rightAccessibilityLabel="Kombini sil"
          onRightPress={handleDelete}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badges}>
          <Badge
            label={`${scoreLabel(outfit.score.overall)} · %${outfit.score.overall}`}
            tone={outfit.score.overall >= 75 ? 'success' : 'accent'}
            icon="sparkles"
          />
          <WeatherPill weather={outfit.weather} compact />
          {outfit.wornAt && <Badge label="Giyildi" tone="dark" icon="checkmark-circle" />}
        </View>

        <Card
          padded={false}
          header={{
            title: 'Kombindeki parçalar',
            subtitle: `${outfit.slots.length} parça`,
            icon: 'layers-outline',
          }}
        >
          <View style={styles.slotList}>
            {outfit.slots.map((slot, index) => (
              <View key={slot.itemId}>
                {index > 0 && <Divider inset />}
                <View style={styles.slotRow}>
                  <ClothingImage
                    uri={slot.item.thumbnailUrl || slot.item.imageUrl}
                    category={slot.item.category}
                    colorsList={slot.item.colors}
                    style={styles.slotImage}
                    radiusSize={radius.sm}
                    iconSize={20}
                  />
                  <View style={styles.slotTexts}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {slot.item.name}
                    </Text>
                    {slot.reason && (
                      <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>
                        {slot.reason}
                      </Text>
                    )}
                  </View>
                  <Button
                    label="Gör"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      navigation.navigate('ItemDetail', { itemId: slot.itemId })
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card header={{ title: 'Neden bu kombin?', icon: 'sparkles-outline' }}>
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

          {/* Skor dökümü ikincil bilgi: kendi başlığıyla kart içinde ayrı bir bölüm */}
          <View style={styles.scores}>
            <Text variant="captionStrong" color={colors.textTertiary}>
              Uyum dökümü
            </Text>
            <ScoreBreakdown score={outfit.score} />
          </View>
        </Card>

        {!outfit.wornAt && (
          <Card header={{ title: 'Not', subtitle: 'Opsiyonel', icon: 'create-outline' }}>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="Bu kombinle ilgili aklında kalsın istediğin bir şey"
              multiline
            />
          </Card>
        )}

        {outfit.note && (
          <Card header={{ title: 'Notun', icon: 'document-text-outline' }}>
            <Text variant="body" color={colors.textSecondary}>
              {outfit.note}
            </Text>
          </Card>
        )}

        <FeedbackBar
          outfit={outfit}
          onLike={() => like(outfit.id)}
          onDislike={(reason) => dislike(outfit.id, reason)}
          onRegenerate={() =>
            generate({ occasion: outfit.occasion, weather, regenerate: true }).then(
              (next) => {
                if (next) navigation.replace('OutfitDetail', { outfitId: next.id });
              },
            )
          }
          onWear={() => markWorn(outfit.id, note.trim() || undefined)}
          regenerating={generating}
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: layout.screenPadding },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  slotList: { paddingBottom: spacing.sm },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },
  slotImage: { width: 48, height: 48 },
  slotTexts: { flex: 1, gap: spacing.xxs },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tipText: { flex: 1 },
  scores: { gap: spacing.md },
});
