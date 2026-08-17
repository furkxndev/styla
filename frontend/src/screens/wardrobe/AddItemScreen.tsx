import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, Header, Screen, Text } from '../../components/ui';
import { ClothingImage } from '../../components/wardrobe';
import { useWardrobe } from '../../hooks/useWardrobe';
import { imagePickerService } from '../../services/media/imagePickerService';
import { colors, layout, radius, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddItem'>;

const TIPS = [
  'Kıyafeti düz ve sade bir zemine yerleştir',
  'Doğal ışıkta çek, gölgelerden kaçın',
  'Tek seferde tek bir parça fotoğrafla',
];

/** Fotoğraf kaynağı seçimi — sonrasında AI analiz ekranına geçilir */
export const AddItemScreen: React.FC<Props> = ({ navigation }) => {
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const wardrobe = useWardrobe(false);
  const recent = wardrobe.items.slice(0, 4);

  const handlePick = async (source: 'camera' | 'library') => {
    if (busy) return;
    setBusy(source);
    try {
      const image =
        source === 'camera'
          ? await imagePickerService.takePhoto()
          : await imagePickerService.pickFromLibrary();

      if (!image) return;
      navigation.replace('ReviewAnalysis', { imageUri: image.uri, analysis: null });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Kıyafet ekle" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ana eylem: iki büyük seçim kartı yan yana */}
        <View style={styles.actions}>
          <ActionCard
            icon="camera"
            title="Fotoğraf çek"
            description="Kamerayı aç"
            onPress={() => handlePick('camera')}
            loading={busy === 'camera'}
            disabled={busy !== null}
            primary
          />
          <ActionCard
            icon="images"
            title="Galeriden seç"
            description="Mevcut fotoğraf"
            onPress={() => handlePick('library')}
            loading={busy === 'library'}
            disabled={busy !== null}
          />
        </View>

        <Card variant="subtle">
          <View style={styles.introRow}>
            <View style={styles.introIcon}>
              <Ionicons name="sparkles" size={17} color={colors.accentDark} />
            </View>
            <View style={styles.introTexts}>
              <Text variant="bodyMedium">Gerisini yapay zekâ halleder</Text>
              <Text variant="caption" color={colors.textSecondary}>
                Kategori, renk, desen, stil ve mevsim uygunluğu otomatik belirlenir.
                Sonrasında dilediğin bilgiyi düzenleyebilirsin.
              </Text>
            </View>
          </View>
        </Card>

        {recent.length > 0 && (
          <Card
            header={{
              title: 'Son eklenenler',
              subtitle: `Gardırobunda ${wardrobe.items.length} parça var`,
              icon: 'time-outline',
            }}
          >
            <View style={styles.recentRow}>
              {recent.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                  style={styles.recentItem}
                >
                  <ClothingImage
                    uri={item.thumbnailUrl || item.imageUrl}
                    category={item.category}
                    colorsList={item.colors}
                    style={styles.recentImage}
                    radiusSize={radius.sm}
                    iconSize={20}
                  />
                  <Text variant="caption" numberOfLines={1} style={styles.recentName}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        <Card header={{ title: 'İyi sonuç için ipuçları', icon: 'bulb-outline' }}>
          <View style={styles.tips}>
            {TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.success}
                  style={styles.tipIcon}
                />
                <Text variant="callout" color={colors.textSecondary} style={styles.tipText}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const ActionCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}> = ({ icon, title, description, onPress, loading, disabled, primary }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled, busy: loading }}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.actionCard,
      primary && styles.actionCardPrimary,
      (pressed || disabled) && styles.actionCardPressed,
    ]}
  >
    <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? colors.primaryText : colors.text}
        />
      ) : (
        <Ionicons
          name={icon}
          size={22}
          color={primary ? colors.primaryText : colors.text}
        />
      )}
    </View>
    <Text
      variant="bodyMedium"
      align="center"
      numberOfLines={1}
      color={primary ? colors.primaryText : colors.text}
    >
      {title}
    </Text>
    <Text
      variant="caption"
      align="center"
      numberOfLines={1}
      color={primary ? 'rgba(255,255,255,0.75)' : colors.textTertiary}
    >
      {description}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: layout.screenPadding },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionCardPressed: { opacity: 0.8 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.16)' },
  introRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flex: 1 zorunlu — uzun açıklama kartın dışına taşmaz
  introTexts: { flex: 1, gap: spacing.xxs },
  recentRow: { flexDirection: 'row', gap: spacing.sm },
  recentItem: { flex: 1, gap: spacing.xs },
  recentImage: { width: '100%', aspectRatio: 1 },
  recentName: { textAlign: 'center' },
  tips: { gap: spacing.md },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tipIcon: { marginTop: 1 },
  tipText: { flex: 1 },
});
