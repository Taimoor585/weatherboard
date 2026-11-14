import { fromOwm, fromWmo, SEVERITY } from './conditions';
import { getMoonInfo } from './astronomy';
import { request } from './http';
import { AppError, type AirQuality, type City, type DayPoint, type HourPoint, type WeatherData } from './types';

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined;

/* ───────────────────────────── Open-Meteo ───────────────────────────── */

interface OMResponse {
  utc_offset_seconds: number;
  current: {
    time: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    visibility?: number;
    dew_point_2m?: number;
    uv_index?: number;
  };
  hourly: {
    time: number[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: (number | null)[];
    is_day: number[];
  };
  daily: {
    time: number[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: number[];
    sunset: number[];
    precipitation_probability_max: (number | null)[];
    uv_index_max: (number | null)[];
  };
}

async function openMeteo(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m,uv_index',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max',
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '6',
    wind_speed_unit: 'kmh',
  });
  const d = await request<OMResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal,
    service: 'Open-Meteo',
  });
  if (!d?.current || !d.hourly || !d.daily) {
    throw new AppError('bad-data', 'Open-Meteo returned incomplete data.', 'Try again in a moment.');
  }
  const c = d.current;
  const now = Date.now() / 1000;
  const startIdx = Math.max(0, d.hourly.time.findIndex((t) => t + 3600 > now));
  const allHourly: HourPoint[] = d.hourly.time.map((t, j) => ({
    time: t,
    temp: d.hourly.temperature_2m[j],
    condition: fromWmo(d.hourly.weather_code[j]).condition,
    isDay: d.hourly.is_day[j] === 1,
    pop: d.hourly.precipitation_probability[j] ?? 0,
  }));
  const hourly: HourPoint[] = d.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => {
    const j = startIdx + i;
    return {
      time: t,
      temp: d.hourly.temperature_2m[j],
      condition: fromWmo(d.hourly.weather_code[j]).condition,
      isDay: d.hourly.is_day[j] === 1,
      pop: d.hourly.precipitation_probability[j] ?? 0,
    };
  });
  const daily: DayPoint[] = d.daily.time.slice(0, 5).map((t, i) => {
    const w = fromWmo(d.daily.weather_code[i]);
    return {
      date: t,
      min: d.daily.temperature_2m_min[i],
      max: d.daily.temperature_2m_max[i],
      condition: w.condition,
      description: w.description,
      pop: d.daily.precipitation_probability_max[i] ?? 0,
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
      uvMax: d.daily.uv_index_max[i] ?? undefined,
    };
  });
  const w = fromWmo(c.weather_code);
  return {
    city,
    source: 'Open-Meteo',
    fetchedAt: Date.now(),
    utcOffsetSec: d.utc_offset_seconds,
    current: {
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windKmh: c.wind_speed_10m,
      windDeg: c.wind_direction_10m,
      gustKmh: c.wind_gusts_10m,
      pressure: c.pressure_msl,
      visibility: c.visibility,
      cloudCover: c.cloud_cover,
      dewPoint: c.dew_point_2m,
      uv: c.uv_index,
      condition: w.condition,
      description: w.description,
      isDay: c.is_day === 1,
    },
    today: {
      min: daily[0].min,
      max: daily[0].max,
      sunrise: daily[0].sunrise!,
      sunset: daily[0].sunset!,
      pop: daily[0].pop,
    },
    hourly,
    allHourly,
    daily,
    moon: getMoonInfo(now),
  };
}

/* ─────────────────────────── OpenWeatherMap ─────────────────────────── */

interface OWMCurrent {
  dt?: number;
  weather: { id: number; description: string; icon: string }[];
  main: { temp: number; feels_like: number; humidity: number; pressure: number; temp_min: number; temp_max: number };
  wind: { speed: number; deg: number; gust?: number };
  clouds?: { all: number };
  visibility?: number;
  sys: { sunrise: number; sunset: number };
  timezone: number;
}
interface OWMForecast {
  list: {
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number };
    weather: { id: number; description: string; icon: string }[];
    pop: number;
  }[];
  city: { timezone: number; sunrise: number; sunset: number };
}

async function openWeatherMap(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const q = `lat=${city.lat}&lon=${city.lon}&units=metric&appid=${OWM_KEY}`;
  const [cur, fc] = await Promise.all([
    request<OWMCurrent>(`https://api.openweathermap.org/data/2.5/weather?${q}`, { signal, service: 'OpenWeatherMap' }),
    request<OWMForecast>(`https://api.openweathermap.org/data/2.5/forecast?${q}`, { signal, service: 'OpenWeatherMap' }),
  ]);
  const offset = cur.timezone;
  const localDay = (t: number) => Math.floor((t + offset) / 86400);

  const allHourly: HourPoint[] = fc.list.map((p) => ({
    time: p.dt,
    temp: p.main.temp,
    condition: fromOwm(p.weather[0].id, p.weather[0].description).condition,
    isDay: p.weather[0].icon.endsWith('d'),
    pop: Math.round((p.pop ?? 0) * 100),
  }));
  const hourly: HourPoint[] = allHourly.slice(0, 24);

  const groups = new Map<number, OWMForecast['list']>();
  for (const p of fc.list) {
    const k = localDay(p.dt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const daily: DayPoint[] = [...groups.entries()].slice(0, 5).map(([day, items]) => {
    // headline condition: the sample nearest local noon, unless something more severe happens in daytime
    const noon = day * 86400 + 12 * 3600 - offset;
    const nearest = items.reduce((a, b) => (Math.abs(b.dt - noon) < Math.abs(a.dt - noon) ? b : a));
    let pick = fromOwm(nearest.weather[0].id, nearest.weather[0].description);
    for (const it of items) {
      const w = fromOwm(it.weather[0].id, it.weather[0].description);
      if (SEVERITY[w.condition] >= SEVERITY.rain && SEVERITY[w.condition] > SEVERITY[pick.condition] && it.pop > 0.4) pick = w;
    }
    return {
      date: day * 86400 - offset,
      min: Math.min(...items.map((i) => i.main.temp_min)),
      max: Math.max(...items.map((i) => i.main.temp_max)),
      condition: pick.condition,
      description: pick.description,
      pop: Math.round(Math.max(...items.map((i) => i.pop ?? 0)) * 100),
    };
  });

  const w = fromOwm(cur.weather[0].id, cur.weather[0].description);
  const today = daily[0];
  return {
    city,
    source: 'OpenWeatherMap',
    fetchedAt: Date.now(),
    utcOffsetSec: offset,
    current: {
      temp: cur.main.temp,
      feelsLike: cur.main.feels_like,
      humidity: cur.main.humidity,
      windKmh: cur.wind.speed * 3.6,
      windDeg: cur.wind.deg,
      gustKmh: cur.wind.gust != null ? cur.wind.gust * 3.6 : undefined,
      pressure: cur.main.pressure,
      visibility: cur.visibility,
      cloudCover: cur.clouds?.all,
      condition: w.condition,
      description: w.description,
      isDay: cur.weather[0].icon.endsWith('d'),
    },
    today: {
      min: Math.min(today?.min ?? cur.main.temp_min, cur.main.temp),
      max: Math.max(today?.max ?? cur.main.temp_max, cur.main.temp),
      sunrise: cur.sys.sunrise,
      sunset: cur.sys.sunset,
      pop: today?.pop ?? 0,
    },
    hourly,
    allHourly,
    daily,
    moon: getMoonInfo(cur.dt || Date.now() / 1000),
  };
}

/* ─────────────────────────────── Air ─────────────────────────────── */

async function airQuality(city: City, signal?: AbortSignal): Promise<AirQuality | undefined> {
  try {
    const d = await request<{ current: { us_aqi: number; pm2_5: number; pm10: number } }>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm2_5,pm10`,
      { signal, timeout: 6000, service: 'Open-Meteo Air Quality' },
    );
    if (d?.current?.us_aqi == null) return undefined;
    return { usAqi: d.current.us_aqi, pm25: d.current.pm2_5, pm10: d.current.pm10 };
  } catch {
    return undefined; // optional enrichment — never block the dashboard on it
  }
}

/**
 * Weather for a city. OpenWeatherMap is primary when a key is configured; any failure
 * (rate-limit, bad key, outage) falls back to Open-Meteo so the user still gets real data.
 */
export async function fetchWeather(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const airP = airQuality(city, signal);
  let data: WeatherData;
  if (OWM_KEY) {
    try {
      data = await openWeatherMap(city, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof AppError && err.kind === 'offline') throw err;
      data = await openMeteo(city, signal);
    }
  } else {
    data = await openMeteo(city, signal);
  }
  data.air = await airP;
  return data;
}

export const hasOwmKey = Boolean(OWM_KEY);
