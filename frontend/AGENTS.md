# Expo HAS CHANGED

Bu proje **Expo SDK 54** kullanıyor (App Store'daki Expo Go ile uyum için SDK 57'den düşürüldü).

Kod yazmadan önce sürüme özel dokümantasyonu oku: https://docs.expo.dev/versions/v54.0.0/

Notlar:
- `expo-image` SDK 54'te config plugin **içermez**; `app.json` → `plugins` dizisine eklenmemeli.
- Paket sürümlerini elle değiştirme; `npx expo install <paket>` ve `npx expo install --fix` kullan.
