# Kombin Backend

**Kombin**, kullanıcının gardırobunu tanıyan bir yapay zekâ kişisel stil asistanıdır.
Bu depo, React Native (Expo) mobil uygulamasını besleyen **NestJS 11 + TypeORM + PostgreSQL** API'sini içerir.

Ürünün kalbi yapay zekâdır: kombin önerileri, kıyafet görselinin analizi ve stil sohbeti
tamamen LLM tarafından üretilir. Backend'de renk uyumu / mevsim eşleştirme gibi
**kural tabanlı bir puanlama algoritması yoktur**; backend'in görevi bağlamı toplamak,
AI'a sunmak ve dönen sonucu doğrulayıp kalıcılaştırmaktır.

---

## 1. Mimari Özet

```
İstemci (Expo)  ──HTTPS──▶  NestJS API  ──▶  PostgreSQL
                                │
                                ├──▶ OpenRouter (LLM: kombin, analiz, asistan)
                                └──▶ Open-Meteo (hava durumu, anahtarsız)
```

| Modül         | Sorumluluk                                                                 | Ana servis        |
| ------------- | -------------------------------------------------------------------------- | ----------------- |
| `auth`        | Kayıt, giriş, JWT access/refresh üretimi ve rotasyonu, global `JwtAuthGuard` | `AuthService`     |
| `users`       | Profil, stil tercihleri, bildirim ayarları, push token, gardırop istatistiği | `UsersService`    |
| `wardrobe`    | Kıyafet CRUD, favori, görsel yükleme, AI ile kıyafet analizi                 | `WardrobeService` |
| `outfits`     | AI kombin üretimi, günün kombini, geri bildirim, "giydim" kaydı              | `OutfitsService`  |
| `weather`     | Konum/şehirden anlık hava durumu (Open-Meteo + bellek içi cache)             | `WeatherService`  |
| `assistant`   | Stil sohbeti (thread saklama, AI yanıtı)                                     | `AssistantService`|
| `ai`          | Sağlayıcıdan bağımsız AI katmanı: prompt'lar, JSON ayrıştırma, doğrulama     | `AiService`       |
| `admin`       | Yönetim uçları: genel bakış, kullanıcı yönetimi, ayarlar, model/maliyet raporu | `AdminService`   |
| `settings`    | Çalışma anında değiştirilebilen sistem ayarları (DB + kısa ömürlü önbellek)   | `SettingsService` |
| `storage`     | Dosya depolama soyutlaması (şu an `local` sürücü, ileride S3)                | `StorageService`  |
| `health`      | Ayakta olma kontrolü (`/health`) — Docker healthcheck bunu kullanır          | `HealthController`|

Ortak sözleşmeler:

- `src/common/types/domain.types.ts` — frontend ile **birebir aynı** API tipleri.
- `src/modules/ai/interfaces/ai-provider.interface.ts` — `AiProvider` arayüzü.
- `src/modules/ai/interfaces/ai.types.ts` — AI domain girdi/çıktı tipleri.

---

## 2. Hızlı Başlangıç (Docker)

### a) `.env` dosyasını oluştur

```bash
cd backend
cp .env.example .env
```

JWT secret'larını üret ve `.env` içine yaz (her biri en az 32 karakter olmalı,
aksi hâlde uygulama açılışta doğrulama hatasıyla durur):

```bash
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

`OPENROUTER_API_KEY` değerini <https://openrouter.ai/keys> adresinden alıp `.env` içine yaz.
Bu anahtar **zorunludur** — AI özellikleri buna bağlıdır.

> **Port çakışması:** Bilgisayarında zaten yerel bir PostgreSQL çalışıyorsa 5432
> doludur ve container'a bağlanmak yerine ona bağlanmaya çalışırsın (`28P01
> password authentication failed`). Bu durumda `.env` içinde `DB_PORT=5433` yap;
> compose portu `5433:5432` olarak yayınlar, compose içindeki `api` servisi
> yine 5432 kullanmaya devam eder. Bu depoda `.env` zaten 5433 ile gelir.

### b) Ayağa kaldır

```bash
docker compose up --build
```

Bu komut iki servis başlatır:

- `postgres` → PostgreSQL 17 (`kombin_pgdata` volume'ünde kalıcı veri)
- `api` → NestJS API, PostgreSQL sağlıklı olana kadar bekler (`service_healthy`)

Yalnızca veritabanını isteyenler (API'yi yerelde `npm run start:dev` ile çalıştırmak için):

```bash
docker compose up postgres -d
```

### c) Şema / migration notu

Şu an şema **TypeORM `synchronize`** ile otomatik oluşturulur (`DB_SYNCHRONIZE=true`).
Geliştirme için pratiktir, ancak **üretimde `DB_SYNCHRONIZE=false` yapılmalı** ve
migration kullanılmalıdır — `synchronize` şema farkını sessizce uygular ve veri kaybına yol açabilir.
Migration'a geçiş yol haritasında (bölüm 10) yer alıyor.

### d) Doğrula

- Sağlık kontrolü: <http://localhost:4000/api/v1/health>
- Swagger arayüzü: <http://localhost:4000/docs> (`SWAGGER_ENABLED=true` iken)

---

## 3. Docker'sız Çalıştırma

Yerel bir PostgreSQL 15+ kurulumu gerekir.

```bash
# 1) Veritabanı ve kullanıcıyı oluştur
createdb kombin
psql -c "CREATE USER kombin WITH PASSWORD 'kombin_dev_password'; \
         GRANT ALL PRIVILEGES ON DATABASE kombin TO kombin;"

# 2) .env hazırla (DB_HOST=localhost kalsın)
cp .env.example .env

# 3) Bağımlılıklar + geliştirme sunucusu
npm install
npm run start:dev
```

Diğer komutlar:

| Komut                 | Açıklama                              |
| --------------------- | ------------------------------------- |
| `npm run start:dev`   | Watch modunda geliştirme sunucusu     |
| `npm run build`       | TypeScript'i `dist/` altına derler     |
| `npm run start:prod`  | Derlenmiş çıktıyı çalıştırır           |
| `npm run lint`        | ESLint + otomatik düzeltme            |
| `npm run format`      | Prettier                              |

---

## 4. Environment Değişkenleri

Tam liste ve açıklamalar `.env.example` içindedir. Özet:

### Uygulama

| Değişken          | Açıklama                                              | Örnek                   |
| ----------------- | ----------------------------------------------------- | ----------------------- |
| `NODE_ENV`        | Çalışma ortamı                                        | `development`           |
| `PORT`            | HTTP portu                                            | `4000`                  |
| `API_PREFIX`      | Global endpoint öneki                                 | `api/v1`                |
| `CORS_ORIGINS`    | İzinli origin'ler (virgülle ayrılır)                  | `*`                     |
| `PUBLIC_URL`      | Yüklenen görsellerin mutlak URL tabanı                | `http://192.168.1.20:4000` |
| `SWAGGER_ENABLED` | `/docs` arayüzü açık mı                               | `true`                  |

### Veritabanı

| Değişken         | Açıklama                                     | Örnek                 |
| ---------------- | -------------------------------------------- | --------------------- |
| `DB_HOST`        | PostgreSQL host (Docker'da `postgres`)       | `localhost`           |
| `DB_PORT`        | Port                                         | `5432`                |
| `DB_USERNAME`    | Kullanıcı                                    | `kombin`              |
| `DB_PASSWORD`    | Parola                                       | `kombin_dev_password` |
| `DB_DATABASE`    | Veritabanı adı                               | `kombin`              |
| `DB_SYNCHRONIZE` | Şema otomatik oluşturulsun mu (üretimde `false`) | `true`            |
| `DB_LOGGING`     | SQL logları                                  | `false`               |
| `DB_SSL`         | Yönetilen DB için TLS                        | `false`               |

### JWT

| Değişken                 | Açıklama                                   | Örnek               |
| ------------------------ | ------------------------------------------ | ------------------- |
| `JWT_ACCESS_SECRET`      | Access imza anahtarı (`openssl rand -hex 32`) | 64 hex karakter  |
| `JWT_REFRESH_SECRET`     | Refresh imza anahtarı (farklı olmalı)      | 64 hex karakter     |
| `JWT_ACCESS_EXPIRES_IN`  | Access ömrü                                | `1h`                |
| `JWT_REFRESH_EXPIRES_IN` | Refresh ömrü                               | `30d`               |

### Yönetim

| Değişken      | Açıklama                                                                 | Örnek              |
| ------------- | ------------------------------------------------------------------------ | ------------------ |
| `ADMIN_EMAIL` | Bu e-postayla kayıtlı hesap her açılışta `admin` rolüne yükseltilir; boşsa kimse otomatik yetkilendirilmez | `ben@ornek.com` |

Ayrıntı için bölüm 8 → *Admin Paneli ve Sistem Ayarları*.

### AI

| Değişken                  | Açıklama                                 | Örnek                          |
| ------------------------- | ---------------------------------------- | ------------------------------ |
| `AI_PROVIDER`             | Aktif sağlayıcı                          | `openrouter`                   |
| `OPENROUTER_API_KEY`      | OpenRouter anahtarı (**gizli**)          | `sk-or-v1-...`                 |
| `OPENROUTER_BASE_URL`     | API tabanı                               | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL`        | Metin modeli                             | `anthropic/claude-sonnet-4.5`  |
| `OPENROUTER_VISION_MODEL` | Görsel modeli                            | `anthropic/claude-sonnet-4.5`  |
| `OPENROUTER_APP_URL`      | Sıralama başlığı (opsiyonel)             | `https://kombin.app`           |
| `OPENROUTER_APP_TITLE`    | Sıralama başlığı (opsiyonel)             | `Kombin`                       |
| `OPENROUTER_TIMEOUT_MS`   | Çağrı zaman aşımı                        | `60000`                        |
| `OPENROUTER_MAX_RETRIES`  | Geçici hatalarda yeniden deneme          | `2`                            |

### Hava durumu / Depolama / Throttle

| Değişken                   | Açıklama                                  | Örnek                                        |
| -------------------------- | ----------------------------------------- | -------------------------------------------- |
| `WEATHER_BASE_URL`         | Open-Meteo forecast ucu                   | `https://api.open-meteo.com/v1/forecast`     |
| `WEATHER_GEOCODING_URL`    | Şehir → koordinat ucu                     | `https://geocoding-api.open-meteo.com/v1/search` |
| `WEATHER_CACHE_TTL_MS`     | Sonuç cache süresi                        | `1800000`                                    |
| `WEATHER_TIMEOUT_MS`       | İstek zaman aşımı                         | `10000`                                      |
| `STORAGE_DRIVER`           | Depolama sürücüsü                         | `local`                                      |
| `STORAGE_LOCAL_DIR`        | Yükleme klasörü                           | `uploads`                                    |
| `STORAGE_MAX_FILE_SIZE_MB` | Maksimum dosya boyutu                     | `8`                                          |
| `THROTTLE_TTL_MS`          | Hız sınırı penceresi                      | `60000`                                      |
| `THROTTLE_LIMIT`           | Pencere başına genel istek limiti         | `120`                                        |
| `THROTTLE_AI_LIMIT`        | AI uçları için düşük limit                | `20`                                         |

---

## 5. API Sözleşmesi

Tüm yollar `API_PREFIX` ile öneklenir → varsayılan taban: `http://localhost:4000/api/v1`.
Yanıtlar **ham gövde** olarak döner (`{ data: ... }` sarmalaması yapılmaz).
`@Public()` işaretli olanlar dışındaki tüm uçlar `Authorization: Bearer <accessToken>` ister.

| Metot    | Yol                           | Gövde / Query                          | Yanıt                    | Erişim |
| -------- | ----------------------------- | -------------------------------------- | ------------------------ | ------ |
| `POST`   | `/auth/register`              | `RegisterDto`                          | `AuthSessionResponse`    | Public |
| `POST`   | `/auth/login`                 | `LoginDto`                             | `AuthSessionResponse`    | Public |
| `POST`   | `/auth/refresh`               | `{ refreshToken }`                     | `AuthSessionResponse`    | Public |
| `POST`   | `/auth/logout`                | —                                      | `void`                   | JWT    |
| `GET`    | `/auth/me`                    | —                                      | `UserResponse`           | JWT    |
| `PATCH`  | `/users/me`                   | `UpdateUserDto`                        | `UserResponse`           | JWT    |
| `PATCH`  | `/users/me/preferences`       | `StylePreferences`                     | `UserResponse`           | JWT    |
| `PATCH`  | `/users/me/notifications`     | `NotificationSettings`                 | `UserResponse`           | JWT    |
| `POST`   | `/users/me/push-token`        | `{ token }`                            | `void`                   | JWT    |
| `GET`    | `/users/me/stats`             | —                                      | `WardrobeStats`          | JWT    |
| `GET`    | `/wardrobe/items`             | —                                      | `ClothingItemResponse[]` | JWT    |
| `POST`   | `/wardrobe/items`             | `CreateClothingItemDto`                | `ClothingItemResponse`   | JWT    |
| `PATCH`  | `/wardrobe/items/:id`         | `UpdateClothingItemDto`                | `ClothingItemResponse`   | JWT    |
| `DELETE` | `/wardrobe/items/:id`         | —                                      | `void`                   | JWT    |
| `POST`   | `/wardrobe/items/:id/favorite`| —                                      | `ClothingItemResponse`   | JWT    |
| `POST`   | `/wardrobe/analyze`           | multipart, alan `image`                | `ClothingAnalysisResult` | JWT    |
| `POST`   | `/wardrobe/upload`            | multipart, alan `image`                | `{ url: string }`        | JWT    |
| `GET`    | `/weather/current`            | `?lat&lon&city`                        | `WeatherSnapshot`        | JWT    |
| `POST`   | `/outfits/generate`           | `GenerateOutfitDto`                    | `OutfitResponse`         | JWT    |
| `GET`    | `/outfits/today`              | `?date=YYYY-MM-DD` (ops.)              | `OutfitResponse \| null` | JWT    |
| `GET`    | `/outfits`                    | —                                      | `OutfitResponse[]`       | JWT    |
| `POST`   | `/outfits/:id/feedback`       | `{ feedback, reason? }`                | `OutfitResponse`         | JWT    |
| `POST`   | `/outfits/:id/wear`           | `{ note? }`                            | `OutfitResponse`         | JWT    |
| `DELETE` | `/outfits/:id`                | —                                      | `void`                   | JWT    |
| `POST`   | `/assistant/chat`             | `{ message, history, focusItemId? }`   | `ChatMessageResponse`    | JWT    |
| `GET`    | `/assistant/thread`           | —                                      | `ChatMessageResponse[]`  | JWT    |
| `DELETE` | `/assistant/thread`           | —                                      | `void`                   | JWT    |
| `GET`    | `/admin/overview`             | —                                      | `AdminOverview`          | Admin  |
| `GET`    | `/admin/users`                | `?search&role&isActive&page&pageSize`  | `AdminUserListResponse`  | Admin  |
| `GET`    | `/admin/users/:id`            | —                                      | `AdminUserSummary`       | Admin  |
| `PATCH`  | `/admin/users/:id`            | `{ role?, isActive? }`                 | `AdminUserSummary`       | Admin  |
| `DELETE` | `/admin/users/:id`            | —                                      | `204 No Content`         | Admin  |
| `GET`    | `/admin/settings`             | —                                      | `AppSettings`            | Admin  |
| `PATCH`  | `/admin/settings`             | `UpdateSettingsDto`                    | `AppSettings`            | Admin  |
| `GET`    | `/admin/models`               | —                                      | `AiModelOption[]`        | Admin  |
| `GET`    | `/admin/usage`                | —                                      | `AiUsageSummary`         | Admin  |
| `GET`    | `/health`                     | —                                      | `{ status, uptime, timestamp }` | Public |

**Erişim = Admin** olan uçlar JWT'ye ek olarak `role === 'admin'` ister; ayrıntı bölüm 8'de.

`UserResponse` artık `role: 'user' | 'admin'` ve `isActive: boolean` alanlarını da taşır.
İstemci, "Yönetim" girişini göstermek için `/auth/me` yanıtındaki `role` değerine bakar;
ayrı bir yetki ucu çağırmaz.

`/outfits/today` tarih parametresi: kullanıcının cihazı sunucudan farklı saat
diliminde olabilir. Kombin kaydı istemcinin yerel gününe göre yazıldığı için
"bugün" sorgusu da istemcinin gününü alır; parametre verilmezse sunucu günü kullanılır.

Tam şemalar için Swagger: <http://localhost:4000/docs>

---

## 6. AI Mimarisi

### Katmanlar

```
Controller ──▶ OutfitsService / WardrobeService / AssistantService
                          │
                          ▼
                     AiService                (domain sözleşmesi + doğrulama)
                          │  AI_PROVIDER token ile enjekte edilir
                          ▼
                  AiProvider (arayüz)
                          │
                          ▼
              OpenRouterProvider (fetch tabanlı)
```

`AiService` uygulamanın tek AI giriş kapısıdır:

```ts
analyzeClothingImage(imageDataUrl: string): Promise<ClothingAnalysisResult>
generateOutfit(input: OutfitGenerationInput): Promise<AiOutfitSuggestion>
answerStyleQuestion(input: AssistantQuestionInput): Promise<AiAssistantAnswer>
```

`AiProvider` ise sağlayıcıya özgü taşıma katmanıdır: `complete`, `completeJson`,
`completeWithImage`. Prompt'lar `src/modules/ai/prompts/` altında ayrı dosyalarda durur.

### Öneri tamamen AI'a aittir

Uyum skorları (`OutfitScore`), parça seçimi ve gerekçe metinleri modelden gelir.
Backend'de renk uyumu, mevsim mesafesi veya formalite puanı hesaplayan **kural tabanlı kod yoktur.**
Tek istisna, modelin döndürdüğü `itemId`'lerin kullanıcının gardırobunda gerçekten var olup
olmadığının kontrolüdür — bu bir **halüsinasyon koruması**, bir öneri algoritması değil.

### Sağlayıcı değiştirme

1. `src/modules/ai/providers/` altında `AiProvider` arayüzünü uygulayan yeni bir sınıf yaz
   (örn. `anthropic.provider.ts`).
2. `src/config/configuration.ts` içine sağlayıcının ayar bloğunu ekle ve karşılığını
   `.env.example` içinde belgele.
3. `AiModule` içindeki `AI_PROVIDER` factory'sine `AI_PROVIDER=<yeni-ad>` durumunu ekle.
4. `.env` içinde `AI_PROVIDER` değerini değiştir.

`AiService` ve tüm modüller değişmeden çalışmaya devam eder — arayüz sözleşmesi sabittir.

### Anahtar güvenliği

`OPENROUTER_API_KEY` **yalnızca backend'de** bulunur. Frontend'e hiçbir biçimde
gönderilmez, yanıtlarda yer almaz ve `EXPO_PUBLIC_*` değişkenlerine yazılmaz
(Expo'da `EXPO_PUBLIC_` önekli her değer istemci paketine gömülür — orada tutulan bir anahtar
herkese açıktır). Tüm model çağrıları bu API üzerinden, kimliği doğrulanmış ve
hız sınırlı uçlarla yapılır.

---

## 7. Frontend'i Backend'e Bağlama

`frontend/.env` dosyasında:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1
```

> **Önemli:** Fiziksel telefon veya emülatör, bilgisayarının `localhost`'una **ulaşamaz.**
> `localhost` cihazın kendisini işaret eder. Bilgisayarının LAN IP'sini kullan:
>
> ```bash
> ipconfig getifaddr en0      # macOS (Wi-Fi)
> hostname -I | awk '{print $1}'   # Linux
> ```
>
> Aynı IP'yi backend `.env` içindeki `PUBLIC_URL` değerine de yaz; aksi hâlde yüklenen
> görsellerin URL'i `localhost` ile üretilir ve telefonda görüntülenemez.
> Telefon ve bilgisayar **aynı Wi-Fi ağında** olmalıdır.

Değişiklikten sonra Expo'yu cache temizleyerek başlat: `npx expo start -c`.

---

## 8. Admin Paneli ve Sistem Ayarları

Panel ayrı bir web uygulaması değildir: mobil uygulamanın içinde, yalnızca yönetici
rolündeki kullanıcıya açılan ekranlardan oluşur ve `/admin/*` uçlarını kullanır.

### Rol modeli

İki rol vardır: `user` (varsayılan) ve `admin`. Rol `users.role` sütununda tutulur,
yanına `users.isActive` eşlik eder — pasife alınan hesap giriş yapamaz ve mevcut
oturumu da düşer (`setActive` refresh token hash'ini temizler).

**Bootstrap:** `.env` içindeki `ADMIN_EMAIL` ile eşleşen hesap, uygulama her açılışta
otomatik olarak `admin` yapılır (`UsersService.onModuleInit → ensureAdminBootstrap`).
Böylece ilk yöneticiyi yaratmak için SQL çalıştırmak gerekmez:

1. Uygulamada normal yoldan kayıt ol.
2. `.env` içine `ADMIN_EMAIL=<o e-posta>` yaz.
3. Backend'i yeniden başlat → hesap `admin` olur.

E-posta kayıtlı değilse açılışta sessizce atlanır (log düşer), kayıt olduktan sonraki
ilk başlatmada yetki verilir. `ADMIN_EMAIL` boşsa hiçbir hesap otomatik yükseltilmez.

### RolesGuard

`@Roles('admin')` ile işaretli handler'ları `RolesGuard` korur. İki bilinçli karar:

- **Rol JWT'den değil, her istekte veritabanından okunur.** Aksi hâlde yetkisi alınan
  ya da pasife alınan bir kullanıcı, elindeki access token'ın ömrü dolana kadar
  (varsayılan 1 saat) yönetici olarak kalmaya devam ederdi.
- **Dekoratör sınıf seviyesindedir.** `AdminController`'a tek tek uç işaretlenmez;
  yarın eklenen yeni bir uç yanlışlıkla korumasız kalmasın diye.

İşaretsiz uçlar bu guard'ın konusu değildir; onlar için global `JwtAuthGuard` geçerlidir.
Guard `UsersService` yerine doğrudan `Repository<User>` enjekte eder — `common` katmanı
ile `UsersModule` arasında dairesel bağımlılık oluşmasın diye.

### Kendini-koruma kuralları

Kurallar controller'da değil `AdminService` içindedir; guard ya da uç değişse bile
sistemin kilitlenmesi mümkün olmasın diye. Hepsi `400` ve Türkçe mesaj döner:

| Deneme                                             | Sonuç                                   |
| -------------------------------------------------- | --------------------------------------- |
| Yönetici kendi rolünü `user` yapmak isterse        | `Kendi yönetici yetkini kaldıramazsın`  |
| Yönetici kendi hesabını pasife almak isterse       | `Kendi hesabını devre dışı bırakamazsın`|
| Yönetici kendi hesabını silmek isterse             | `Kendi hesabını silemezsin`             |
| Son (aktif) yöneticiyi düşüren/pasifleştiren/silen her işlem | `Sistemde en az bir yönetici kalmalı` |

"Son yönetici" sayımı **aktiflik şartıyla** yapılır: pasif bir yönetici giriş
yapamayacağı için yedek sayılmaz.

Kullanıcı silme kalıcıdır ve kişisel veriyi de götürür: `clothing_items`, `outfits`
(dolayısıyla `outfit_items`) ve `chat_messages` FK'ları `onDelete: CASCADE` tanımlı.
Tek istisna `ai_usage_logs` — maliyet kaydı gerçekleşmiş bir harcamadır ve kullanıcı
silinse de raporlardan düşmemesi için `userId` salt referans olarak, ilişkisiz tutulur.

### Çalışma anındaki ayarlar

`app_settings` tablosunda **tek satır** vardır (`DEFAULT_SETTINGS_ID`) ve ilk açılışta
env değerlerinden tohumlanır. Tohumlamadan sonra bu satır env'i **ezer**:
`OPENROUTER_MODEL` değiştirilse bile uygulama tablodaki `aiModel` değerini kullanır.
Model/parametre değiştirmek için `.env` düzenlemek ve **yeniden başlatmak gerekmez** —
`PATCH /admin/settings` yeterlidir.

| Alan                        | Etki                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `aiModel`                   | Kombin üretimi + stil asistanı için metin modeli               |
| `aiVisionModel`             | Kıyafet fotoğrafı analizi için görsel destekli model           |
| `aiTemperature`             | Model yaratıcılığı (0–2)                                       |
| `maxWardrobeItemsPerPrompt` | Prompt'a giren azami parça sayısı — doğrudan bir maliyet freni |
| `registrationEnabled`       | Kapalıyken yeni kayıt alınmaz                                  |
| `aiFeaturesEnabled`         | Kapalıyken tüm AI özellikleri durur (acil maliyet freni)       |

Ayarlar her AI çağrısında okunduğu için `SettingsService` **60 sn'lik bellek içi
önbellek** tutar; DB'ye her istekte gidilmez. Değişiklik anında görünür, çünkü
`update()` önbelleği TTL'i beklemeden düşürür. Önbellek süreç yereldir: birden fazla
instance çalışıyorsa diğerleri değişikliği en geç 60 sn içinde görür.

`getCached()` senkron erişim içindir ve önbellek bayatsa DB'ye gitmek yerine `null`
döner — çağıran taraf kendi varsayılanına düşebilsin diye.

### Maliyet takibi

İki bağımsız kaynak vardır ve panelde ikisi de gösterilir:

**1. Kendi defterimiz — `ai_usage_logs`.** Her AI çağrısı için bir satır: özellik
(`outfit` / `analysis` / `assistant`), gerçekte kullanılan model, token sayıları,
USD maliyet, başarı durumu, süre. Maliyet tahmin edilmez, ölçülür: OpenRouter
isteğinin gövdesine `"usage": { "include": true }` eklenir ve yanıtta dönen
`usage.cost` (USD) doğrudan kaydedilir. Kayıt yazımı hiçbir zaman ana akışı bozmaz —
`record()` içindeki hatalar yutulur; bir log satırı yüzünden kullanıcının kombini
kaybolmamalıdır. `GET /admin/usage` bu tablodan bugün/bu ay toplamlarını, özellik
kırılımını ve son 30 günün günlük serisini üretir (gün sınırları sunucunun yerel
takvimine göre hesaplanır).

**2. Sağlayıcı hesabı — OpenRouter.** `GET /key` (`usage`, `usage_daily`,
`usage_weekly`, `usage_monthly`, `limit`, `limit_remaining`) ve `GET /credits`
(`total_credits`, `total_usage`) uçları okunur ve `AiUsageSummary.provider` alanında
döner. Sağlayıcıya ulaşılamazsa bu alan `null` olur; panel yine de açılır.

> **Fark önemlidir:** bizim kaydımız **yalnızca bu uygulamanın** yaptığı çağrıları
> kapsar. Sağlayıcı verisi ise **API anahtarının tüm kullanımını** kapsar — aynı
> anahtarla yapılan yerel denemeler, script'ler veya başka projeler dahil. İki rakam
> birbirini tutmuyorsa aradaki fark normalde bu dış kullanımdır; ayrıca sağlayıcı
> tarafında hesaplama gecikmesi de olabilir.

`GET /admin/models` sağlayıcının model kataloğunu döner (`id`, `name`,
`contextLength`, token başına `promptPrice` / `completionPrice`, `supportsImages`).
`supportsImages`, modelin `architecture.input_modalities` listesinde `image`
bulunmasına göre belirlenir — görsel modeli seçilirken bu alan filtre olarak kullanılır.

---

## 9. Güvenlik Notları

- **JWT rotasyonu:** Refresh token'ın yalnızca hash'i (`refreshTokenHash`) veritabanında tutulur.
  Her yenilemede yeni bir çift üretilir ve eski hash geçersiz kılınır; çalınan bir refresh token
  tek kullanımlıktır. `logout` hash'i temizler.
- **Parolalar:** `bcryptjs` ile hash'lenir; düz metin parola hiçbir yerde saklanmaz veya loglanmaz.
- **helmet:** Güvenlik başlıkları (`X-Content-Type-Options`, `HSTS` vb.) global olarak eklenir.
- **Throttler:** Genel uçlar `THROTTLE_LIMIT`, maliyetli AI uçları `THROTTLE_AI_LIMIT` ile sınırlanır.
- **ValidationPipe (`whitelist` + `forbidNonWhitelisted` + `transform`):** DTO'da tanımlanmayan
  alanlar isteği reddeder — kütle atama (mass assignment) saldırılarına kapalıdır.
- **Sahiplik kontrolü:** Tüm kayıtlar `userId` üzerinden filtrelenir; başka kullanıcının
  kaydına erişim `NotFoundException` döner (varlık sızdırılmaz).
- **Rol kontrolü:** `/admin/*` uçları `RolesGuard` ile korunur ve rol her istekte
  veritabanından okunur; yetkisi alınan kullanıcı elindeki access token ile devam edemez.
  Panel uçlarının kendi (daha dar) hız sınırı vardır: dakikada 60 istek.
- **CORS:** Üretimde `CORS_ORIGINS` mutlaka daraltılmalı (`*` bırakılmamalı).
- **Sırlar:** `.env` depoya girmez (`.gitignore`), imaja kopyalanmaz (`.dockerignore`);
  tüm gizli değerler `ConfigService` üzerinden okunur.
- **Container:** İmaj non-root `node` kullanıcısıyla çalışır, dev bağımlılıkları içermez.

---

## 10. Yol Haritası

| Konu                       | Plan                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| **Migration'a geçiş**      | `DB_SYNCHRONIZE=false` + TypeORM DataSource ve `migration:generate` / `migration:run` script'leri; ilk migration mevcut şemadan üretilir |
| **S3 storage driver**      | `StorageService` arkasına `S3StorageDriver`; `STORAGE_DRIVER=s3` ile seçilir, presigned URL ile doğrudan yükleme |
| **Push notification**      | Kayıtlı Expo push token'lara Expo Push API üzerinden gönderim; günün kombini ve hava durumu uyarısı |
| **Haftalık plan**          | 7 günlük kombin planı üretimi (`/outfits/plan`), takvim ve hava durumu tahminiyle beslenir |
| Gözlemlenebilirlik         | Yapılandırılmış log; AI maliyet/token metrikleri `ai_usage_logs` ile geldi (bölüm 8), sıradaki adım dışa aktarım (Prometheus/OTLP) |
| **Bütçe alarmı**           | `ai_usage_logs` üzerinden aylık eşik aşımında otomatik uyarı ve `aiFeaturesEnabled` freni |
| Önbellek                   | Sık okunan gardırop sorguları için Redis                                                   |
