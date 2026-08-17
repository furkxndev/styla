import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ClothingAnalysisResult } from '../types/clothing';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Home: undefined;
  Wardrobe: undefined;
  Assistant: { initialQuestion?: string; focusItemId?: string } | undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  AddItem: { imageUri?: string } | undefined;
  EditItem: { itemId: string };
  ItemDetail: { itemId: string };
  OutfitDetail: { outfitId: string };
  /** AI analizinden sonra kullanıcı onay ekranı */
  ReviewAnalysis: { imageUri: string; analysis: ClothingAnalysisResult | null };
  Settings: undefined;
  NotificationSettings: undefined;
  StylePreferences: undefined;
  LocationSettings: undefined;
  /** Yalnızca role === 'admin' kullanıcılara açılan yönetim akışı */
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminUserDetail: { userId: string };
  AdminSettings: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
