import type { Condition } from './conditions';
import type { MoonInfo } from './astronomy';

export interface City {
  id: string;
  name: string;
  region?: string;
  country: string;
  countryCode?: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  temp: number; // °C
  feelsLike: number;
  humidity: number; // %
  windKmh: number;
  windDeg: number;
  gustKmh?: number;
  pressure: number; // hPa
  visibility?: number; // metres
  cloudCover?: number; // %
  dewPoint?: number;
  uv?: number;
  condition: Condition;
  description: string;
  isDay: boolean;
}

export interface HourPoint {
  time: number; // unix seconds
  temp: number;
  condition: Condition;
  isDay: boolean;
  pop: number; // 0..100
}

export interface DayPoint {
  date: number; // unix seconds (local midnight-ish)
  min: number;
  max: number;
  condition: Condition;
  description: string;
  pop: number;
  sunrise?: number;
  sunset?: number;
  uvMax?: number;
}

export interface AirQuality {
  usAqi: number;
  pm25: number;
  pm10?: number;
}

export interface WeatherData {
  city: City;
  source: 'OpenWeatherMap' | 'Open-Meteo';
  fetchedAt: number; // ms
  utcOffsetSec: number;
  current: CurrentWeather;
  today: { min: number; max: number; sunrise: number; sunset: number; pop: number };
  hourly: HourPoint[];
  allHourly?: HourPoint[];
  daily: DayPoint[];
  air?: AirQuality;
  moon?: MoonInfo;
}

export type ErrorKind = 'offline' | 'network' | 'timeout' | 'rate-limit' | 'auth' | 'not-found' | 'server' | 'bad-data';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM" in the user's local time
  lastSent?: string; // YYYY-MM-DD
}

export class AppError extends Error {
  kind: ErrorKind;
  title: string;
  hint: string;
  constructor(kind: ErrorKind, title: string, hint: string) {
    super(title);
    this.kind = kind;
    this.title = title;
    this.hint = hint;
  }
}
