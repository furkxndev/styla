import React, { useCallback, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import {
  AddItemScreen,
  AdminDashboardScreen,
  AdminSettingsScreen,
  AdminUserDetailScreen,
  AdminUsersScreen,
  EditItemScreen,
  ItemDetailScreen,
  LocationSettingsScreen,
  NotificationSettingsScreen,
  OnboardingScreen,
  OutfitDetailScreen,
  ReviewAnalysisScreen,
  SettingsScreen,
  StylePreferencesScreen,
} from '../screens';
import {
  useDailyNotificationScheduler,
  useNotificationResponse,
} from '../hooks/useNotifications';
import { useAuthStore } from '../store/authStore';
import { useOutfitStore } from '../store/outfitStore';
import { useWardrobeStore } from '../store/wardrobeStore';
import { navigationTheme } from './theme';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const user = useAuthStore((state) => state.user);
  const fetchItems = useWardrobeStore((state) => state.fetchItems);
  const fetchHistory = useOutfitStore((state) => state.fetchHistory);

  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !user.onboardingCompleted;

  // Oturum açıldığında kullanıcı verisini yükle
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchItems();
    fetchHistory({ silent: true });
  }, [isAuthenticated, fetchItems, fetchHistory]);

  // Sabah bildirimini planla / güncelle
  useDailyNotificationScheduler();

  // Bildirime dokunulduğunda "Bugünün Kombini" ekranına git
  const handleNotificationNavigate = useCallback(
    (screen: string) => {
      if (screen !== 'DailyOutfit') return;
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Tabs', { screen: 'Home' });
    },
    [navigationRef],
  );
  useNotificationResponse(handleNotificationNavigate);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen
              name="AddItem"
              component={AddItemScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ReviewAnalysis"
              component={ReviewAnalysisScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
            <Stack.Screen name="EditItem" component={EditItemScreen} />
            <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
            />
            <Stack.Screen name="StylePreferences" component={StylePreferencesScreen} />
            <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
