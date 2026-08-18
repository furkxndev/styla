import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Header, ListRow, Screen, Text } from '../../components/ui';
import { useNotificationControls } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing } from '../../theme';
import { dateFromTimeString, formatTimeString } from '../../utils/date';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>;

export const NotificationSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updateNotifications = useAuthStore((state) => state.updateNotifications);
  const { setEnabled, setTime, previewText } = useNotificationControls();

  const settings = user?.notifications;
  const [showPicker, setShowPicker] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    const ok = await setEnabled(enabled);
    setPermissionDenied(enabled && !ok);
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !date) return;
    setTime(formatTimeString(date.getHours(), date.getMinutes()));
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Bildirimler" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Bildirim önizlemesi */}
        <Card>
          <Text variant="caption" color={colors.textTertiary}>
            Her sabah böyle bir bildirim alacaksın
          </Text>
          <View style={styles.preview}>
            <View style={styles.previewIcon}>
              <Ionicons name="shirt" size={17} color={colors.primaryText} />
            </View>
            <View style={styles.previewTexts}>
              <Text variant="bodyMedium">{previewText.title}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {previewText.body}
              </Text>
            </View>
          </View>
        </Card>

        <Card padded={false}>
          <ListRow
            icon="sunny-outline"
            title="Günlük kombin bildirimi"
            subtitle="Sabahları günün kombinini hatırlat"
            showChevron={false}
            rightSlot={
              <Switch
                value={!!settings?.dailyOutfitEnabled}
                onValueChange={handleToggle}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />

          <ListRow
            icon="time-outline"
            title="Bildirim saati"
            subtitle="Bildirimin gönderileceği saat"
            value={settings?.dailyOutfitTime ?? '08:00'}
            onPress={() => setShowPicker(true)}
          />

          <ListRow
            icon="rainy-outline"
            title="Hava durumu uyarıları"
            subtitle="Ani hava değişimlerinde bilgilendir"
            showChevron={false}
            rightSlot={
              <Switch
                value={!!settings?.weatherAlertsEnabled}
                onValueChange={(value) =>
                  updateNotifications({ weatherAlertsEnabled: value })
                }
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />

          <ListRow
            icon="moon-outline"
            title="Akşam hatırlatması"
            subtitle="Bugün ne giydiğini kaydetmeyi hatırlat"
            showChevron={false}
            rightSlot={
              <Switch
                value={!!settings?.wearReminderEnabled}
                onValueChange={(value) =>
                  updateNotifications({ wearReminderEnabled: value })
                }
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />
        </Card>

        {permissionDenied && (
          <Card background={colors.warningSoft} bordered={false}>
            <Text variant="caption" color={colors.warning}>
              Bildirim izni verilmedi. Cihaz ayarlarından Styla uygulamasına bildirim
              iznini açman gerekiyor.
            </Text>
          </Card>
        )}

        <Text variant="caption" color={colors.textTertiary} style={styles.note}>
          Bildirime dokunduğunda doğrudan "Bugünün Kombini" ekranına yönlendirilirsin.
          Bildirim metni o günün hava durumuna ve oluşturulan kombine göre hazırlanır.
        </Text>

        {showPicker && (
          <View style={styles.picker}>
            <DateTimePicker
              value={dateFromTimeString(settings?.dailyOutfitTime ?? '08:00')}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
            {Platform.OS === 'ios' && (
              <Button label="Tamam" onPress={() => setShowPicker(false)} fullWidth />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: spacing.xl },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  preview: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTexts: { flex: 1, gap: spacing.xxs },
  note: { paddingHorizontal: spacing.xs },
  picker: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
