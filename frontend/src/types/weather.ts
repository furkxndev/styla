export type WeatherCondition =
  'clear' | 'clouds' | 'rain' | 'drizzle' | 'thunderstorm' | 'snow' | 'mist';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface HourlyForecast {
  time: string; // ISO
  temperature: number;
  condition: WeatherCondition;
  precipitationProbability: number;
}

export interface WeatherSnapshot {
  city: string;
  country?: string;
  coordinates: Coordinates;
  /** Anlık sıcaklık (°C) */
  temperature: number;
  feelsLike: number;
  minTemperature: number;
  maxTemperature: number;
  condition: WeatherCondition;
  /** Kullanıcıya gösterilecek Türkçe açıklama: "Parçalı bulutlu" */
  description: string;
  humidity: number;
  windSpeed: number; // km/s
  /** 0-100 yağış ihtimali */
  precipitationProbability: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  hourly: HourlyForecast[];
  fetchedAt: string;
}
