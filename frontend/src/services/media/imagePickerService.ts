import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { config } from '../../constants/config';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

const openSettingsAlert = (message: string) => {
  Alert.alert('İzin gerekli', message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Ayarlar', onPress: () => Linking.openSettings() },
  ]);
};

const toPickedImage = (result: ImagePicker.ImagePickerResult): PickedImage | null => {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
  };
};

export const imagePickerService = {
  async takePhoto(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      openSettingsAlert('Fotoğraf çekebilmek için kamera iznine ihtiyacımız var.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: config.wardrobe.imageQuality,
      allowsEditing: true,
      aspect: [3, 4],
    });

    return toPickedImage(result);
  },

  async pickFromLibrary(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      openSettingsAlert('Galeriden fotoğraf seçmek için izin vermen gerekiyor.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: config.wardrobe.imageQuality,
      allowsEditing: true,
      aspect: [3, 4],
    });

    return toPickedImage(result);
  },

  isTooLarge(image: PickedImage): boolean {
    if (!image.fileSize) return false;
    return image.fileSize > config.wardrobe.maxImageSizeMb * 1024 * 1024;
  },
};
