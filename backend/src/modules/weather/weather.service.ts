import { HttpException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  HourlyForecast,
  UserLocationSettings,
  WeatherCondition,
  WeatherSnapshot,
} from '../../common/types/domain.types';

/** Koordinat verilmediğinde kullanılan varsayılan konum */
const DEFAULT_LOCATION = { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul' };

/** Snapshot'ta dönülecek saatlik tahmin adedi */
const HOURLY_WINDOW = 12;

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface CacheEntry {
  data: WeatherSnapshot;
  expiresAt: number;
}

/** Open-Meteo geocoding yanıtının kullandığımız alanları */
interface GeocodingResponse {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
  }>;
}

/** Open-Meteo forecast yanıtının kullandığımız alanları */
interface ForecastResponse {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: Array<number | null>;
    weather_code?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  /** Basit süreç içi önbellek: aynı koordinat için tekrar tekrar dış servise gitmeyelim */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  async getCurrent(params: {
    latitude?: number;
    longitude?: number;
    city?: string;
  }): Promise<WeatherSnapshot> {
    const location = await this.resolveLocation(params);
    const cacheKey = this.buildCacheKey(location.latitude, location.longitude);

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const snapshot = await this.fetchSnapshot(location);

    const ttl = this.config.get<number>('weather.cacheTtlMs') ?? 30 * 60 * 1000;
    this.cache.set(cacheKey, { data: snapshot, expiresAt: Date.now() + ttl });

    return snapshot;
  }

  /**
   * Kullanıcının profilindeki konuma göre hava durumu döner.
   * Konum yoksa veya servis erişilemezse `undefined` döner — çağıran akış durmaz,
   * AI hava bilgisi olmadan da öneri üretebilir.
   */
  async getForUserLocation(
    location?: UserLocationSettings | null,
  ): Promise<WeatherSnapshot | undefined> {
    if (!location) return undefined;

    const hasCoordinates =
      typeof location.latitude === 'number' && typeof location.longitude === 'number';
    if (!hasCoordinates && !location.city) return undefined;

    try {
      return await this.getCurrent({
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
      });
    } catch (error) {
      this.logger.warn(
        `Hava durumu alınamadı, akış hava bilgisi olmadan sürüyor: ${String(error)}`,
      );
      return undefined;
    }
  }

  /* ------------------------------------------------------------- konum çözümü */

  private async resolveLocation(params: {
    latitude?: number;
    longitude?: number;
    city?: string;
  }): Promise<ResolvedLocation> {
    const { latitude, longitude, city } = params;

    // Koordinat çifti tamsa geocoding'e hiç gitmeyiz
    if (this.isFiniteNumber(latitude) && this.isFiniteNumber(longitude)) {
      return { latitude, longitude, city: city?.trim() || undefined };
    }

    const trimmedCity = city?.trim();
    if (trimmedCity) {
      return this.geocodeCity(trimmedCity);
    }

    return { ...DEFAULT_LOCATION };
  }

  private async geocodeCity(city: string): Promise<ResolvedLocation> {
    const geocodingUrl =
      this.config.get<string>('weather.geocodingUrl') ??
      'https://geocoding-api.open-meteo.com/v1/search';

    const url = new URL(geocodingUrl);
    url.searchParams.set('name', city);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'tr');
    url.searchParams.set('format', 'json');

    const payload = await this.fetchJson<GeocodingResponse>(url.toString());
    const match = payload.results?.[0];

    if (!match || !this.isFiniteNumber(match.latitude) || !this.isFiniteNumber(match.longitude)) {
      throw new NotFoundException(`"${city}" için konum bulunamadı.`);
    }

    return {
      latitude: match.latitude,
      longitude: match.longitude,
      city: match.name?.trim() || city,
      country: match.country?.trim() || undefined,
    };
  }

  /* ------------------------------------------------------------ dış servisler */

  private async fetchSnapshot(location: ResolvedLocation): Promise<WeatherSnapshot> {
    const baseUrl =
      this.config.get<string>('weather.baseUrl') ?? 'https://api.open-meteo.com/v1/forecast';

    const url = new URL(baseUrl);
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    );
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code');
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '2');

    const payload = await this.fetchJson<ForecastResponse>(url.toString());
    return this.toSnapshot(payload, location);
  }

  /** Ortak fetch: timeout + hata sarmalama. Node 26 global fetch kullanılır. */
  private async fetchJson<T>(url: string): Promise<T> {
    const timeoutMs = this.config.get<number>('weather.timeoutMs') ?? 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Beklenmeyen HTTP durumu: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      // Konum bulunamadı gibi anlamlı hataları olduğu gibi yukarı taşı
      if (error instanceof HttpException) throw error;

      this.logger.error(`Hava durumu isteği başarısız: ${String(error)}`);
      throw new ServiceUnavailableException('Hava durumu servisine ulaşılamadı');
    } finally {
      clearTimeout(timer);
    }
  }

  /* ------------------------------------------------------------- dönüştürücü */

  private toSnapshot(payload: ForecastResponse, location: ResolvedLocation): WeatherSnapshot {
    const current = payload.current ?? {};
    const daily = payload.daily ?? {};
    const offsetSeconds = payload.utc_offset_seconds ?? 0;

    // Open-Meteo grid'e yuvarlanmış koordinat döner; istenen konumu korumak daha doğru
    const latitude = location.latitude;
    const longitude = location.longitude;

    const code = current.weather_code ?? 0;
    const condition = this.mapCondition(code);
    const temperature = this.round(current.temperature_2m ?? 0);

    const hourly = this.buildHourly(payload, offsetSeconds);
    const dailyPrecipitation = this.firstNumber(daily.precipitation_probability_max);

    return {
      city: location.city ?? this.deriveCityLabel(payload.timezone, latitude, longitude),
      country: location.country,
      coordinates: { latitude, longitude },
      temperature,
      feelsLike: this.round(current.apparent_temperature ?? temperature),
      minTemperature: this.round(this.firstNumber(daily.temperature_2m_min) ?? temperature),
      maxTemperature: this.round(this.firstNumber(daily.temperature_2m_max) ?? temperature),
      condition,
      description: this.describe(code),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      // Open-Meteo varsayılan rüzgâr birimi km/s
      windSpeed: this.round(current.wind_speed_10m ?? 0),
      precipitationProbability: Math.round(
        hourly[0]?.precipitationProbability ?? dailyPrecipitation ?? 0,
      ),
      uvIndex: this.firstNumber(daily.uv_index_max) ?? undefined,
      sunrise: this.toIsoString(daily.sunrise?.[0], offsetSeconds),
      sunset: this.toIsoString(daily.sunset?.[0], offsetSeconds),
      hourly,
      fetchedAt: new Date().toISOString(),
    };
  }

  /** Şu andan itibaren ilk 12 saatlik dilim */
  private buildHourly(payload: ForecastResponse, offsetSeconds: number): HourlyForecast[] {
    const times = payload.hourly?.time ?? [];
    if (times.length === 0) return [];

    const temperatures = payload.hourly?.temperature_2m ?? [];
    const probabilities = payload.hourly?.precipitation_probability ?? [];
    const codes = payload.hourly?.weather_code ?? [];

    // hourly.time ve current.time aynı yerel saat formatındadır; sözlüksel karşılaştırma yeterli
    const nowLocal = payload.current?.time ?? this.toLocalIsoMinute(new Date(), offsetSeconds);
    let startIndex = times.findIndex((time) => time >= nowLocal);
    if (startIndex < 0) startIndex = Math.max(times.length - HOURLY_WINDOW, 0);

    const result: HourlyForecast[] = [];
    for (let i = startIndex; i < times.length && result.length < HOURLY_WINDOW; i += 1) {
      const iso = this.toIsoString(times[i], offsetSeconds);
      if (!iso) continue;

      result.push({
        time: iso,
        temperature: this.round(temperatures[i] ?? 0),
        condition: this.mapCondition(codes[i] ?? 0),
        precipitationProbability: Math.round(probabilities[i] ?? 0),
      });
    }

    return result;
  }

  /* ------------------------------------------------------------ WMO eşlemesi */

  /** WMO weather code -> sözleşmedeki WeatherCondition */
  private mapCondition(code: number): WeatherCondition {
    if (code === 0) return 'clear';
    if (code >= 1 && code <= 3) return 'clouds';
    if (code === 45 || code === 48) return 'mist';
    if (code >= 51 && code <= 57) return 'drizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'clouds';
  }

  /** Kullanıcıya gösterilen Türkçe açıklama */
  private describe(code: number): string {
    switch (code) {
      case 0:
        return 'Açık ve güneşli';
      case 1:
        return 'Az bulutlu';
      case 2:
        return 'Parçalı bulutlu';
      case 3:
        return 'Çok bulutlu';
      case 45:
      case 48:
        return 'Sisli';
      case 51:
      case 53:
      case 55:
        return 'Çiseleyen yağmur';
      case 56:
      case 57:
        return 'Dondurucu çisenti';
      case 61:
        return 'Hafif yağmurlu';
      case 63:
        return 'Yağmurlu';
      case 65:
        return 'Şiddetli yağmurlu';
      case 66:
      case 67:
        return 'Dondurucu yağmur';
      case 71:
        return 'Hafif kar yağışlı';
      case 73:
        return 'Karlı';
      case 75:
        return 'Yoğun kar yağışlı';
      case 77:
        return 'Kar taneli';
      case 80:
        return 'Hafif sağanak yağışlı';
      case 81:
        return 'Sağanak yağışlı';
      case 82:
        return 'Şiddetli sağanak yağışlı';
      case 85:
      case 86:
        return 'Kar sağanaklı';
      case 95:
        return 'Gök gürültülü sağanak';
      case 96:
      case 99:
        return 'Dolulu gök gürültülü sağanak';
      default:
        return 'Değişken hava';
    }
  }

  /* ----------------------------------------------------------------- yardımcı */

  /**
   * Open-Meteo yerel saat döner (ör. "2026-08-17T14:00"). Offset'i düşerek
   * gerçek zamanlı ISO string üretiriz.
   */
  private toIsoString(localTime: string | undefined, offsetSeconds: number): string | undefined {
    if (!localTime) return undefined;

    const parsed = Date.parse(`${localTime}Z`);
    if (Number.isNaN(parsed)) return undefined;

    return new Date(parsed - offsetSeconds * 1000).toISOString();
  }

  /** current.time yoksa karşılaştırma için yerel saat üretir */
  private toLocalIsoMinute(now: Date, offsetSeconds: number): string {
    return new Date(now.getTime() + offsetSeconds * 1000).toISOString().slice(0, 16);
  }

  /**
   * Şehir adı geocoding'den gelmediyse timezone'dan türetilir
   * (ör. "Europe/Istanbul" -> "Istanbul"); o da yoksa koordinat gösterilir.
   */
  private deriveCityLabel(timezone: string | undefined, latitude: number, longitude: number): string {
    const segment = timezone?.split('/').pop()?.replace(/_/g, ' ').trim();
    if (segment && segment.toUpperCase() !== 'GMT' && segment.toUpperCase() !== 'UTC') {
      return segment;
    }

    const latLabel = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'K' : 'G'}`;
    const lonLabel = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'D' : 'B'}`;
    return `${latLabel}, ${lonLabel}`;
  }

  private buildCacheKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  }

  private firstNumber(values: Array<number | null> | undefined): number | undefined {
    const value = values?.[0];
    return this.isFiniteNumber(value) ? value : undefined;
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
