export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface GeocodeResult {
  name: string;
  formattedName: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  postcode?: string;
  timezone?: string;
  elevation?: number;
}

export interface GeocodeSuggestion {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  displayText: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  surfacePressure: number;
  uvIndex: number;
  precipitation: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  cloudCover?: number;
  visibility?: number;
  updatedAt: string;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  condition: string;
  precipitationSum: number;
  precipitationProbability?: number;
  windSpeedMax: number;
  uvIndexMax?: number;
  sunrise?: string;
  sunset?: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitationProbability: number;
  isDay: boolean;
}

export interface WeatherData {
  location: GeocodeResult;
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  timezone: string;
}

export interface DailyRangeItem {
  date: string;
  dayName: string;
  maxTemp?: number;
  minTemp?: number;
  meanTemp?: number;
  weatherCode?: number;
  condition?: string;
  precipitation?: number;
  windSpeedMax?: number;
  source: 'historical' | 'forecast' | 'unsupported_future';
  note?: string;
}

export interface RangeWeatherResult {
  location: GeocodeResult;
  startDate: string;
  endDate: string;
  totalDays: number;
  daily: DailyRangeItem[];
  summary: {
    avgMaxTemp: number;
    avgMinTemp: number;
    avgMeanTemp: number;
    maxRecordedTemp: number;
    minRecordedTemp: number;
    totalPrecipitation: number;
    dominantCondition: string;
    hasHistorical: boolean;
    hasForecast: boolean;
    hasUnsupportedFuture: boolean;
  };
}

export interface WeatherLogRecord {
  id?: string;
  rawLocation: string;
  resolvedPlace: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  startDate: string;
  endDate: string;
  dailyData: DailyRangeItem[];
  summary: {
    avgMaxTemp: number;
    avgMinTemp: number;
    avgMeanTemp: number;
    maxRecordedTemp: number;
    minRecordedTemp: number;
    totalPrecipitation: number;
    dominantCondition: string;
    hasHistorical: boolean;
    hasForecast: boolean;
    hasUnsupportedFuture: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BonusMedia {
  mapEmbedUrl: string;
  videos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt?: string;
    videoUrl: string;
  }>;
  photo?: {
    imageUrl: string;
    photographerName: string;
    photographerUrl?: string;
    description?: string;
  };
}
