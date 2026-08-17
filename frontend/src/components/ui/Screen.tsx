import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, layout } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  /** İçerik kaydırılabilir olsun mu */
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Kaydırma alanının altına eklenecek boşluk (tab bar / sabit buton için) */
  bottomInset?: number;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  style,
  contentContainerStyle,
  background = colors.background,
  refreshing,
  onRefresh,
  bottomInset = 0,
}) => {
  const paddingStyle = padded ? { paddingHorizontal: layout.screenPadding } : null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background }, style]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            paddingStyle,
            { paddingBottom: bottomInset + 24 },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textSecondary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, paddingStyle, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});
