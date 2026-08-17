# Styla — AI Kişisel Stil Asistanı

Kullanıcının gardırobunu dijitalleştiren, hava durumunu ve kişisel tercihleri
analiz ederek her sabah kombin öneren mobil uygulama.

```
frontend/   React Native + Expo (SDK 54) mobil uygulama
backend/    NestJS 11 + TypeORM + PostgreSQL + Docker API
```

Ürünün kalbi yapay zekâdır: kombin önerisi, kıyafet görsel analizi ve stil sohbeti
tamamen **OpenRouter üzerinden LLM** tarafından üretilir. Backend'de kural tabanlı
bir öneri algoritması yoktur; görevi bağlamı (gardırop + hava + tercihler + geri
bildirim geçmişi) toplamak, AI'a sunmak, dönen sonucu doğrulayıp kalıcılaştırmaktır.

Uygulamanın içinde, yalnızca `admin` rolündeki kullanıcıya açılan bir **yönetim paneli**
vardır (Profil → Yönetim): kullanıcı yönetimi, AI model/parametre ayarları ve maliyet
takibi. Ayarlar veritabanında tutulur; model değiştirmek için yeniden başlatma gerekmez.
İlk yönetici backend `.env` içindeki `ADMIN_EMAIL` ile belirlenir.

## Hızlı başlangıç

```bash
# 1) Backend (PostgreSQL + API)
cd backend
cp .env.example .env          # JWT secret'ları, OPENROUTER_API_KEY ve ADMIN_EMAIL doldur
docker compose up --build     # http://localhost:4000/api/v1 · Swagger: /docs

# 2) Frontend
cd ../frontend
cp .env.example .env          # EXPO_PUBLIC_API_URL = http://<LAN-IP>:4000/api/v1
npm install
npx expo start -c
```

Backend olmadan da denemek istersen frontend `.env` içinde
`EXPO_PUBLIC_USE_MOCK_API=true` bırak — uygulama cihaz üzerindeki sahte API ile
uçtan uca çalışır (demo gardırop, hava durumu, kombin üretimi dahil).

## Dokümantasyon

| Konu | Yer |
| --- | --- |
| Mobil uygulama mimarisi, klasör yapısı, tasarım sistemi, admin ekranları, bildirim sistemi | [`frontend/README.md`](./frontend/README.md) |
| API sözleşmesi, environment değişkenleri, AI mimarisi, admin paneli ve maliyet takibi, Docker | [`backend/README.md`](./backend/README.md) |

API tipleri iki tarafta da birebir aynıdır:
`frontend/src/types/` ↔ `backend/src/common/types/domain.types.ts`.

## Gizlilik / güvenlik

`OPENROUTER_API_KEY` yalnızca backend `.env` dosyasında bulunur. Frontend'e hiçbir
biçimde gönderilmez; tüm model çağrıları kimliği doğrulanmış ve hız sınırlı backend
uçları üzerinden yapılır. `.env` dosyaları `.gitignore` ile depo dışında tutulur.
