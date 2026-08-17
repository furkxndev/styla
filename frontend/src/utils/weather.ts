import type { Ionicons } from '@expo/vector-icons';
import { weatherGradients } from '../theme/colors';
import type { Season } from '../types/clothing';
import type { WeatherCondition, WeatherSnapshot } from '../types/weather';

type IconName = keyof typeof Ionicons.glyphMap;

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Açık',
  clouds: 'Bulutlu',
  rain: 'Yağmurlu',
  drizzle: 'Çiseleyen yağmur',
  thunderstorm: 'Gök gürültülü',
  snow: 'Karlı',
  mist: 'Sisli',
};

export const CONDITION_ICONS: Record<WeatherCondition, IconName> = {
  clear: 'sunny',
  clouds: 'cloud',
  rain: 'rainy',
  drizzle: 'rainy-outline',
  thunderstorm: 'thunderstorm',
  snow: 'snow',
  mist: 'cloudy-outline',
};

export const getConditionIcon = (condition: WeatherCondition): IconName =>
  CONDITION_ICONS[condition] ?? 'partly-sunny';

export const getWeatherGradient = (condition?: WeatherCondition) =>
  weatherGradients[condition ?? 'default'] ?? weatherGradients.default;

/** Sıcaklığa göre giyim katmanı ipucu */
export const getLayerHint = (temperature: number): string => {
  if (temperature <= 0) return 'Kalın mont ve katmanlı giyinme şart';
  if (temperature <= 8) return 'Kalın dış giyim öneriyoruz';
  if (temperature <= 15) return 'İnce bir ceket iyi gider';
  if (temperature <= 22) return 'Katmanlı ve rahat bir kombin';
  if (temperature <= 28) return 'Hafif ve nefes alan kumaşlar';
  return 'Mümkün olduğunca ince ve açık renkler';
};

/** Sıcaklığa karşılık gelen mevsim (gardırop filtresi için) */
export const temperatureToSeason = (temperature: number): Season => {
  if (temperature <= 10) return 'winter';
  if (temperature <= 18) return 'autumn';
  if (temperature <= 25) return 'spring';
  return 'summer';
};

export interface WeatherAdvice {
  needsOuterwear: boolean;
  needsRainProtection: boolean;
  needsWindProtection: boolean;
  suggestedSeason: Season;
  headline: string;
  details: string[];
}

/** Hava durumundan kombin kurallarını çıkarır (mock AI ve arayüz ipuçları için) */
export const buildWeatherAdvice = (weather: WeatherSnapshot): WeatherAdvice => {
  const details: string[] = [];
  const needsRainProtection =
    weather.precipitationProbability >= 40 ||
    ['rain', 'drizzle', 'thunderstorm'].includes(weather.condition);
  const needsWindProtection = weather.windSpeed >= 25;
  const needsOuterwear = weather.feelsLike <= 17;

  if (needsRainProtection) details.push('Yağmur ihtimali var, su geçirmez bir parça ekle');
  if (needsWindProtection)
    details.push('Rüzgâr kuvvetli, rüzgâr kesen bir dış giyim iyi olur');
  if (weather.maxTemperature - weather.minTemperature >= 10) {
    details.push('Gün içi sıcaklık farkı yüksek, katmanlı giyin');
  }
  if (weather.condition === 'snow') details.push('Kar var, su geçirmez ayakkabı tercih et');
  if (!details.length) details.push(getLayerHint(weather.temperature));

  return {
    needsOuterwear,
    needsRainProtection,
    needsWindProtection,
    suggestedSeason: temperatureToSeason(weather.feelsLike),
    headline: `${Math.round(weather.temperature)}°C · ${weather.description}`,
    details,
  };
};

export const formatTemperature = (value: number) => `${Math.round(value)}°`;

export const formatWind = (kmh: number) => `${Math.round(kmh)} km/s`;
