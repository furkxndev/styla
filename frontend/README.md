# Kombin — Frontend (React Native + Expo)

AI destekli kişisel stil asistanı uygulamasının mobil arayüzü.
Kullanıcı gardırobunu dijitalleştirir, uygulama hava durumu + duruma göre her gün
kombin üretir, geri bildirimlerle kullanıcının stilini zamanla öğrenir.

## Çalıştırma

```bash
cd frontend
npm install
npm start          # ardından i / a / w
```

Uygulama iki modda çalışır; hangisinin geçerli olduğunu `.env` belirler:

- **Bağlı mod** (`EXPO_PUBLIC_USE_MOCK_API=false`) — `backend/` altındaki NestJS API'yi
  kullanır. Gerçek AI kombin üretimi, kıyafet analizi ve stil asistanı buradadır.
  Kurulum için aşağıdaki *Backend'e bağlanma* bölümüne bak.
- **Demo modu** (`EXPO_PUBLIC_USE_MOCK_API=true`) — `src/services/mock/` altındaki sahte
  sunucu cihazda (AsyncStorage) gerçek bir veri katmanı gibi davranır. Örnek gardırop,
  hava durumu ve kural tabanlı kombin üretimi hazır gelir; backend gerekmez.

> npm cache izin hatası alırsan: `sudo chown -R $(id -u):$(id -g) ~/.npm`

## Klasör yapısı

```
src/
  components/        Yeniden kullanılabilir bileşenler
    ui/              Tasarım sistemi (Button, Card, Chip, Sheet, TextField…)
    wardrobe/        Kıyafet kartı, görsel, filtre barı, ürün formu
    outfit/          Kombin önizleme, geri bildirim çubuğu, skor dökümü
    weather/         Hava durumu kartı ve rozeti
    assistant/       Sohbet balonu, yazma alanı, öneri çipleri
  constants/         Kategoriler, durumlar, renk paleti, config, storage key'leri
  hooks/             useDailyOutfit, useWeather, useWardrobe, useNotifications…
  navigation/        Root / Auth / Tab navigatörleri + tipler
  screens/           Ekranlar (auth, onboarding, home, wardrobe, assistant, history, profile, admin)
  services/
    api/             HTTP istemcisi + uç nokta sözleşmesi + domain API'leri
    mock/            Backend hazır olana kadar çalışan sahte sunucu
    notifications/   Sabah bildirimi planlama
    location/        Konum izni ve geocoding
    media/           Kamera / galeri
    storage/         AsyncStorage + SecureStore sarmalayıcıları
  store/             Zustand store'ları (auth, wardrobe, weather, outfit, assistant)
  theme/             Renk, tipografi, boşluk, gölge ölçekleri
  types/             Tüm domain tipleri (backend sözleşmesiyle birebir)
  utils/             Renk uyumu, hava durumu kuralları, tarih, kombin motoru
```

## Mimarideki temel kararlar

**Ekranlar API'yi doğrudan tanımaz.** Akış şu şekilde:

```
Ekran → hook → zustand store → services/api/*.api.ts → (mock | gerçek backend)
```

`src/services/api/*.api.ts` dosyalarındaki her fonksiyon `config.useMockApi`
değerine bakar. Backend hazır olduğunda tek yapılacak şey bayrağı kapatmaktır —
ekranlarda, store'larda veya hook'larda hiçbir değişiklik gerekmez.

**Kural tabanlı kombin motoru** (`src/utils/outfitEngine.ts`) iki iş görür:
mock modda kombin üretir ve backend'e ulaşılamadığında çevrimdışı yedek olur.
Gerçek kişiselleştirme backend'deki LLM + öğrenme katmanında yapılacaktır.

**Görsel yer tutucu:** Ürün fotoğrafı yoksa/yüklenemezse kart, ürünün renklerinden
üretilen bir gradyan + kategori ikonu gösterir. Uygulama internetsiz de düzgün görünür.

## Tasarım sistemi

Uygulamanın görsel dili `src/theme/` altındaki **token'lardan** oluşur. Ekranlarda ve
bileşenlerde **ham renk kodu (`'#C2703C'`), ham `fontSize` veya ham piksel boşluk
yazılmaz** — her değer bir token üzerinden gelir. Sebep basit: bir tonu ya da ritmi
değiştirmek istediğimizde tek dosya düzenlemek yeterli olsun, uygulama 40 ekrana
dağılmış sihirli sayılarla parça parça kaymasın.

| Token | Dosya | İçerik |
| --- | --- | --- |
| `colors` / `palette` | `theme/colors.ts` | Anlamsal renkler (`background`, `surface`, `surfaceSubtle`, `text`, `textSecondary`, `border`, `borderSubtle`, `accent`, durum renkleri) + ham palet |
| `typography` | `theme/typography.ts` | `display`, `title1…3`, `body`, `caption` … hazır metin stilleri |
| `spacing` / `radius` / `layout` | `theme/spacing.ts` | 4pt tabanlı boşluk ölçeği, köşe yarıçapları, ekran/kart iç boşlukları |
| `shadows` | `theme/shadows.ts` | `xs…lg` — platforma göre iOS shadow / Android elevation / web boxShadow |

```ts
import { colors, spacing, radius, typography } from '../../theme';

// ✅ token
{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md }

// ❌ ham değer
{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16 }
```

Renk kullanımında **anlamsal** isimleri tercih et (`colors.textSecondary`), ham paleti
(`palette.ink500`) yalnızca yeni bir anlamsal token tanımlarken kullan. Karanlık tema
ileride `colors` içindeki eşlemeler değiştirilerek ekleneceği için, ekranların paletten
değil `colors`'tan beslenmesi bunun ön koşuludur.

### Bileşenler

Hazır bileşenler `src/components/ui/` altındadır ve tek noktadan dışa aktarılır
(`import { Card, Button } from '../../components/ui'`). Yeni bir ekran yazarken önce
buraya bak; aynı görsel öğeyi ikinci kez elle kurmak tasarımın dağılmasının bir numaralı
sebebidir.

| Bileşen | Ne için |
| --- | --- |
| `Screen` | Ekran iskeleti: güvenli alan, zemin rengi, kaydırma |
| `Header` · `SectionHeader` | Ekran başlığı ve bölüm başlığı |
| `Text` | Tipografi token'ına bağlı metin (`variant` ile) |
| `Button` · `IconButton` | Birincil/ikincil eylemler |
| `Card` | Yüzey kutusu (padding + kenarlık + gölge token'ları) |
| `ListRow` | Ayarlar/menü satırı (sol ikon, başlık, sağ aksesuar) |
| `TextField` | Etiketli, hata durumlu giriş alanı |
| `Chip` · `Badge` | Filtre çipi ve durum rozeti |
| `SegmentedControl` | İki-üç seçenek arasında geçiş (sekme yerine, ekran içi) |
| `StatCard` | Tek bir metrik: değer, etiket, `tone` ve opsiyonel `trend` |
| `Divider` | Kart içi ayraç (`inset` ile içeriden başlar) |
| `ProgressBar` · `Skeleton` | İlerleme ve yükleniyor iskeleti |
| `EmptyState` | Boş liste durumu (ikon + açıklama + eylem) |
| `Sheet` | Alttan açılan modal |
| `Avatar` | Kullanıcı baş harfi / fotoğrafı |

## Admin paneli

Yönetici ekranları ayrı bir uygulama değildir; aynı mobil uygulamanın içindedir ve
backend'deki `/admin/*` uçlarını kullanır.

**Erişim:** Girişi **Profil → Yönetim** satırıdır. Bu satır yalnızca oturumdaki
kullanıcının `role === 'admin'` olması hâlinde görünür (`user.role`, `/auth/me`
yanıtından gelir). Rol saklamak bir güvenlik önlemi değil, arayüz ayrıntısıdır:
asıl koruma backend'dedir — `/admin/*` uçları rolü **her istekte veritabanından**
doğrular, dolayısıyla ekranı zorla açan biri boş veri ve `403` alır.

İlk yönetici backend `.env` içindeki `ADMIN_EMAIL` ile belirlenir
(bkz. `backend/README.md` → *Admin Paneli ve Sistem Ayarları*).

| Ekran | İçerik |
| --- | --- |
| **Genel bakış** | Kullanıcı sayıları (toplam / aktif / yönetici / son 7 gün), içerik sayıları (kıyafet, kombin, giyilen kombin, mesaj), bugün ve bu ayın AI maliyeti — `GET /admin/overview` |
| **Kullanıcılar** | Arama, rol ve aktiflik filtresi, sayfalı liste; satırda gardırop/kombin sayısı — `GET /admin/users` |
| **Kullanıcı detayı** | Rolü değiştirme, hesabı aktif/pasif yapma, hesabı silme — `PATCH` / `DELETE /admin/users/:id` |
| **Sistem ayarları** | Metin ve görsel modeli seçimi, `aiTemperature`, prompt'a girecek azami parça sayısı, kayıt açık/kapalı, AI özellikleri açık/kapalı — `GET` + `PATCH /admin/settings`, model listesi `GET /admin/models` |
| **AI kullanımı** | Özellik bazlı maliyet kırılımı, son 30 günün günlük serisi ve OpenRouter hesabının bildirdiği gerçek harcama — `GET /admin/usage` |

Ayar değişiklikleri anında geçerlidir; backend'i yeniden başlatmak gerekmez.

İki maliyet rakamı bilinçli olarak yan yana gösterilir ve **aynı şey değildir:**
*uygulama kaydı* yalnızca bu uygulamanın yaptığı çağrıları, *sağlayıcı verisi* ise API
anahtarının tüm kullanımını kapsar. Sağlayıcıya ulaşılamadığında o blok gizlenir
(`AiUsageSummary.provider === null`), ekran yine açılır.

Yönetici kendi yetkisini kaldıramaz, kendi hesabını pasife alamaz veya silemez; sistemde
en az bir aktif yönetici kalmalıdır. Bu kurallar backend'de uygulanır, arayüz dönen
Türkçe hata mesajını gösterir.

Tip tanımları `src/types/admin.ts` içindedir ve backend `domain.types.ts` ile birebir aynıdır.

## Backend'e bağlanma

`backend/` klasöründeki NestJS API bu uygulamayı besler. Bağlanmak için:

1. `.env.example` → `.env` olarak kopyala.
2. Değerleri doldur:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1
```

> **Fiziksel telefon `localhost`'a ulaşamaz** — `localhost` telefonun kendisidir.
> Bilgisayarının LAN IP'sini kullan (`ipconfig getifaddr en0`) ve telefonla
> bilgisayarın aynı Wi-Fi ağında olduğundan emin ol. Aynı IP'yi backend `.env`
> içindeki `PUBLIC_URL` değerine de yaz; yüklenen kıyafet görsellerinin URL'i
> ondan üretilir.

3. `.env` değişince Metro'yu cache temizleyerek yeniden başlat: `npx expo start -c`.

`.env` yoksa uygulama `app.json → expo.extra` değerlerine düşer; oradaki varsayılan
`useMockApi: true` olduğu için backend olmadan da demo modda açılır.

### Yerel ağ üzerinden HTTP

Backend geliştirmede TLS'siz (`http://`) çalıştığı için `app.json` içinde iki ayar var:
iOS'ta `NSAppTransportSecurity.NSAllowsLocalNetworking`, Android'de
`usesCleartextTraffic`. Expo Go bunlar olmadan da çalışır; derlenmiş (standalone)
sürümlerde gereklidir. Üretimde backend HTTPS'e alınıp bu ayarlar kaldırılmalıdır.

### Backend'in karşılaması gereken sözleşme

Tüm uç noktalar `src/services/api/endpoints.ts` içinde tanımlıdır.
Yanıtlar ya doğrudan gövde ya da `{ "data": ... }` sarmalı olabilir; istemci ikisini de açar.
Kimlik doğrulama: `Authorization: Bearer <accessToken>`.

| Uç nokta | Metot | Gövde / Dönüş |
|---|---|---|
| `/auth/register` | POST | `RegisterPayload` → `AuthSession` |
| `/auth/login` | POST | `LoginPayload` → `AuthSession` |
| `/auth/me` | GET | → `User` |
| `/users/me` | PATCH | `Partial<User>` → `User` |
| `/users/me/preferences` | PATCH | `StylePreferences` → `User` |
| `/users/me/notifications` | PATCH | `NotificationSettings` → `User` |
| `/users/me/push-token` | POST | `{ token }` |
| `/wardrobe/items` | GET / POST | → `ClothingItem[]` / `ClothingItem` |
| `/wardrobe/items/:id` | PATCH / DELETE | → `ClothingItem` |
| `/wardrobe/items/:id/favorite` | POST | → `ClothingItem` |
| `/wardrobe/analyze` | POST (multipart `image`) | → `ClothingAnalysisResult` |
| `/wardrobe/upload` | POST (multipart `image`) | → `{ url }` |
| `/weather/current` | GET `?lat&lon&city` | → `WeatherSnapshot` |
| `/outfits/generate` | POST | `GenerateOutfitRequest` → `Outfit` |
| `/outfits/today` | GET | → `Outfit \| null` |
| `/outfits` | GET | → `Outfit[]` |
| `/outfits/:id/feedback` | POST | `{ feedback, reason? }` → `Outfit` |
| `/outfits/:id/wear` | POST | `{ note? }` → `Outfit` |
| `/assistant/chat` | POST | `AssistantRequest` → `ChatMessage` |
| `/assistant/thread` | GET / DELETE | → `ChatMessage[]` |
| `/admin/overview` | GET | → `AdminOverview` (yalnızca admin) |
| `/admin/users` | GET | `?search&role&isActive&page&pageSize` → `AdminUserListResponse` |
| `/admin/users/:id` | PATCH / DELETE | `{ role?, isActive? }` → `AdminUserSummary` / `void` |
| `/admin/settings` | GET / PATCH | `Partial<AppSettings>` → `AppSettings` |
| `/admin/models` | GET | → `AiModelOption[]` |
| `/admin/usage` | GET | → `AiUsageSummary` |

`User` tipi `role: 'user' | 'admin'` ve `isActive: boolean` alanlarını da taşır;
"Yönetim" girişinin görünürlüğü bu `role` değerine bakar.

`/outfits/today` isteğine cihazın yerel günü `?date=YYYY-MM-DD` olarak eklenir;
sunucu farklı saat diliminde olsa bile "bugünün kombini" doğru gün için sorgulanır.

**Oturum yenileme:** access token'ın süresi dolduğunda istemci 401 alır, `POST /auth/refresh`
ile yeni token çifti alıp isteği bir kez tekrarlar (`src/services/api/client.ts`).
Eşzamanlı isteklerde yenileme tek sefer çalışır; o da başarısız olursa oturum düşer.

Tip tanımlarının tamamı `src/types/` altındadır ve backend modelleri için
doğrudan referans olarak kullanılabilir.

## Bildirimler

- `src/services/notifications/notificationService.ts` her gün kullanıcının seçtiği
  saatte tekrarlayan yerel bildirim planlar.
- Metin, o anki hava durumu ve üretilen kombine göre dinamik hazırlanır:
  *"☀️ Günaydın Ayşe! Bugün hava 27°C. Senin için beyaz gömlek + bej chino kombinini hazırladık."*
- Bildirim verisi `{ screen: 'DailyOutfit' }` taşır; dokunulduğunda `RootNavigator`
  kullanıcıyı Ana Sayfa'daki "Bugünün Kombini" bölümüne götürür.
- Kullanıcı saati değiştirdiğinde veya bildirimi kapattığında plan otomatik güncellenir
  (`useDailyNotificationScheduler`).

Uzaktan push (Expo push token) altyapısı hazırdır: token backend'deki
`POST /users/me/push-token` ucuna kaydedilir. Sunucudan bildirim *gönderme* işi
(zamanlanmış görev + Expo Push API çağrısı) backend yol haritasında duruyor.

## İleriye dönük hazır yapılar

- `OutfitPlanEntry` tipi ve `date` bazlı kombin modeli → haftalık planlama
- `wearCount` / `lastWornAt` alanları ve `WardrobeStats` → kullanım istatistikleri
- `deriveLearnedPreferences` + geri bildirim kaydı → gelişmiş kişiselleştirme
- `missingCategoriesFor` → alışveriş önerileri için eksik kategori tespiti
