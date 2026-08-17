import { config } from '../../constants/config';
import type {
  ClothingAnalysisResult,
  ClothingItem,
  CreateClothingItemPayload,
  UpdateClothingItemPayload,
} from '../../types/clothing';
import { mockWardrobe } from '../mock/mockServer';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

/** Görseli multipart olarak hazırlar (React Native FormData formatı) */
const buildImageFormData = (imageUri: string, field = 'image') => {
  const formData = new FormData();
  const fileName = imageUri.split('/').pop() ?? 'photo.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';

  formData.append(field, {
    uri: imageUri,
    name: fileName,
    type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  } as unknown as Blob);

  return formData;
};

export const wardrobeApi = {
  list: (): Promise<ClothingItem[]> =>
    config.useMockApi
      ? mockWardrobe.list()
      : apiClient.get<ClothingItem[]>(ENDPOINTS.wardrobe.list),

  create: (payload: CreateClothingItemPayload): Promise<ClothingItem> =>
    config.useMockApi
      ? mockWardrobe.create(payload)
      : apiClient.post<ClothingItem>(ENDPOINTS.wardrobe.create, payload),

  update: (id: string, patch: UpdateClothingItemPayload): Promise<ClothingItem> =>
    config.useMockApi
      ? mockWardrobe.update(id, patch)
      : apiClient.patch<ClothingItem>(ENDPOINTS.wardrobe.update(id), patch),

  remove: (id: string): Promise<void> =>
    config.useMockApi
      ? mockWardrobe.remove(id)
      : apiClient.delete<void>(ENDPOINTS.wardrobe.remove(id)),

  toggleFavorite: (id: string): Promise<ClothingItem> =>
    config.useMockApi
      ? mockWardrobe.toggleFavorite(id)
      : apiClient.post<ClothingItem>(ENDPOINTS.wardrobe.toggleFavorite(id)),

  /** Fotoğrafı yükleyip AI analizini alır */
  analyzeImage: (imageUri: string): Promise<ClothingAnalysisResult> =>
    config.useMockApi
      ? mockWardrobe.analyze(imageUri)
      : apiClient.upload<ClothingAnalysisResult>(
          ENDPOINTS.wardrobe.analyze,
          buildImageFormData(imageUri),
        ),

  /** Görseli kalıcı depolamaya yükler, kalıcı URL döner */
  uploadImage: (imageUri: string): Promise<{ url: string }> =>
    config.useMockApi
      ? Promise.resolve({ url: imageUri })
      : apiClient.upload<{ url: string }>(
          ENDPOINTS.wardrobe.upload,
          buildImageFormData(imageUri),
        ),
};
