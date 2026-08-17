import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { BrandSplash } from './src/components/brand';
import { useAppBootstrap } from './src/hooks/useAppBootstrap';
import { RootNavigator } from './src/navigation';
import { colors } from './src/theme';

/**
 * Native açılış ekranı elle gizlenir: giriş animasyonu ilk karesini çizene kadar
 * ekranda kalır, böylece aradaki boş kare (beyaz flaş) hiç görünmez.
 * Global kapsamda çağrılması gerekir (bileşen içinde çağrılırsa geç kalır).
 */
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 260, fade: true });

export default function App() {
  const { ready } = useAppBootstrap();
  const [introDone, setIntroDone] = useState(false);

  const handleFirstFrame = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Emniyet kemeri: ilk kare bildirimi herhangi bir sebeple gelmezse uygulama
  // native splash'ın arkasında kilitli kalmasın
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {/* Uygulama, animasyon katmanının ARKASINDA kurulur: perde kalktığında
            ekran hazır olur, ayrıca ikinci bir yükleme göstergesi gerekmez */}
        {ready ? <RootNavigator /> : <View style={styles.canvas} />}

        {!introDone && (
          <BrandSplash
            ready={ready}
            onFirstFrame={handleFirstFrame}
            onFinish={() => setIntroDone(true)}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  canvas: { flex: 1, backgroundColor: colors.background },
});
