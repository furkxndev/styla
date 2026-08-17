import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AssistantHeader,
  AssistantIntro,
  ChatBubble,
  ChatComposer,
  DayDivider,
  ScrollToEndButton,
  SuggestionChips,
  TypingIndicator,
} from '../../components/assistant';
import { Text } from '../../components/ui';
import { useAssistant } from '../../hooks/useAssistant';
import { useWardrobe } from '../../hooks/useWardrobe';
import { colors, layout, radius, spacing } from '../../theme';
import { formatRelative, toISODate } from '../../utils/date';
import type { ChatMessage } from '../../types/assistant';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import { withAlpha } from '../../utils/color';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type AssistantRoute = RouteProp<TabParamList, 'Assistant'>;

interface ChatRow {
  message: ChatMessage;
  /** Aynı kişinin ardışık mesajları tek grup sayılır */
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  /** Gün değiştiyse mesajın üstünde tarih ayırıcısı görünür */
  dayLabel?: string;
}

/** Son mesaja bu mesafeden fazla uzaklaşınca "aşağı in" düğmesi çıkar */
const NEAR_BOTTOM_THRESHOLD = 140;

export const AssistantScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<AssistantRoute>();
  const { messages, sending, error, send, retryLast, clear } = useAssistant();
  const wardrobe = useWardrobe();
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  const listRef = useRef<FlatList<ChatRow>>(null);
  const handledQuestion = useRef<string | null>(null);
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const [scrolled, setScrolled] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  /** Yalnızca karşılama mesajı varsa sohbet henüz başlamamış demektir */
  const isFresh = messages.length <= 1;

  // Ürün detayından "Bunu nasıl kombinlerim?" ile gelindiğinde
  useEffect(() => {
    const question = route.params?.initialQuestion;
    if (!question || handledQuestion.current === question) return;
    handledQuestion.current = question;
    send(question, route.params?.focusItemId);
    navigation.setParams({ initialQuestion: undefined, focusItemId: undefined } as never);
  }, [route.params?.initialQuestion, route.params?.focusItemId, send, navigation]);

  /**
   * iOS'ta klavye yüksekliği elle telafi edilir: KeyboardAvoidingView'in
   * ölçümü sekme çubuğunun altında kalan alanı hesaba katmıyor.
   * Android'de pencere zaten yeniden boyutlanır (softwareKeyboardLayoutMode: resize).
   */
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const animateTo = (padding: number, duration: number) =>
      Animated.timing(keyboardPadding, {
        toValue: padding,
        duration: duration || 250,
        useNativeDriver: false,
      }).start();

    const showSub = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      const overlap = Math.max(0, windowHeight - event.endCoordinates.screenY);
      animateTo(Math.max(0, overlap - tabBarHeight), event.duration);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', (event) => {
      animateTo(0, event.duration);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardPadding, tabBarHeight, windowHeight]);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    if (isFresh) return;
    scrollToEnd();
  }, [messages.length, sending, isFresh, scrollToEnd]);

  const handleSend = useCallback(
    (message: string) => {
      send(message);
      scrollToEnd();
    },
    [send, scrollToEnd],
  );

  const handleClear = useCallback(() => {
    Alert.alert('Yeni sohbet başlat', 'Bu sohbetteki mesajlar silinir. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Başlat', style: 'destructive', onPress: () => clear() },
    ]);
  }, [clear]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrolled(contentOffset.y > 4);
    const distanceToEnd = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setAtBottom(distanceToEnd < NEAR_BOTTOM_THRESHOLD);
  }, []);

  /** Gruplama ve gün ayırıcıları listeden bir kez hesaplanır */
  const rows = useMemo<ChatRow[]>(
    () =>
      messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const dayChanged =
          !previous ||
          toISODate(new Date(previous.createdAt)) !==
            toISODate(new Date(message.createdAt));

        return {
          message,
          isFirstInGroup: !previous || previous.role !== message.role || dayChanged,
          isLastInGroup: !next || next.role !== message.role,
          dayLabel: dayChanged ? formatRelative(message.createdAt) : undefined,
        };
      }),
    [messages],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AssistantHeader
        itemCount={wardrobe.items.length}
        canClear={!isFresh}
        onClear={handleClear}
        elevated={scrolled}
      />

      <Animated.View style={[styles.body, { paddingBottom: keyboardPadding }]}>
        {isFresh ? (
          <AssistantIntro
            welcome={messages[0]?.content ?? ''}
            itemCount={wardrobe.items.length}
            onSelect={handleSend}
            disabled={sending}
            onScroll={handleScroll}
          />
        ) : (
          <View style={styles.listWrapper}>
            <FlatList
              ref={listRef}
              data={rows}
              keyExtractor={(row) => row.message.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onScroll={handleScroll}
              scrollEventThrottle={32}
              onContentSizeChange={() => atBottom && scrollToEnd(false)}
              renderItem={({ item }) => (
                <>
                  {item.dayLabel && <DayDivider label={item.dayLabel} />}
                  <ChatBubble
                    message={item.message}
                    isFirstInGroup={item.isFirstInGroup}
                    isLastInGroup={item.isLastInGroup}
                    onRetry={retryLast}
                    onItemPress={(clothing) =>
                      navigation.navigate('ItemDetail', { itemId: clothing.id })
                    }
                    onOutfitPress={(message) =>
                      message.suggestedOutfit &&
                      navigation.navigate('OutfitDetail', {
                        outfitId: message.suggestedOutfit.id,
                      })
                    }
                  />
                </>
              )}
              ListFooterComponent={sending ? <TypingIndicator /> : null}
            />

            {/* Listenin üstünde yumuşak geçiş: mesajlar başlığa doğru soluklaşır */}
            <LinearGradient
              pointerEvents="none"
              colors={[colors.background, withAlpha(colors.background, 0)]}
              style={styles.topFade}
            />

            <View style={styles.floating} pointerEvents="box-none">
              <ScrollToEndButton visible={!atBottom} onPress={() => scrollToEnd()} />
            </View>
          </View>
        )}

        {error && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tekrar dene"
            onPress={retryLast}
            style={({ pressed }) => [styles.error, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="cloud-offline-outline" size={15} color={colors.danger} />
            <Text variant="caption" color={colors.danger} style={styles.errorText}>
              {error}
            </Text>
            <Text variant="captionStrong" color={colors.danger}>
              Tekrar dene
            </Text>
          </Pressable>
        )}

        <View style={styles.footer}>
          {!isFresh && <SuggestionChips onSelect={handleSend} disabled={sending} />}
          <View style={styles.composer}>
            <ChatComposer onSend={handleSend} sending={sending} />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  listWrapper: { flex: 1 },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: spacing.lg,
  },
  // Yüzen düğme composer'ın hemen üstünde, sağ kenarda durur
  floating: {
    position: 'absolute',
    right: layout.screenPadding,
    bottom: spacing.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },
  errorText: { flex: 1 },
  footer: { paddingBottom: spacing.md },
  composer: { paddingHorizontal: layout.screenPadding },
});
