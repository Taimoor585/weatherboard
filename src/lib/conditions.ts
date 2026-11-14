export type Condition =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export const CONDITION_LABEL: Record<Condition, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
};

/** WMO weather interpretation codes (Open-Meteo). */
export function fromWmo(code: number): { condition: Condition; description: string } {
  const map: Record<number, [Condition, string]> = {
    0: ['clear', 'Clear sky'],
    1: ['partly', 'Mainly clear'],
    2: ['partly', 'Partly cloudy'],
    3: ['cloudy', 'Overcast'],
    45: ['fog', 'Fog'],
    48: ['fog', 'Freezing fog'],
    51: ['drizzle', 'Light drizzle'],
    53: ['drizzle', 'Drizzle'],
    55: ['drizzle', 'Dense drizzle'],
    56: ['drizzle', 'Freezing drizzle'],
    57: ['drizzle', 'Freezing drizzle'],
    61: ['rain', 'Light rain'],
    63: ['rain', 'Rain'],
    65: ['rain', 'Heavy rain'],
    66: ['rain', 'Freezing rain'],
    67: ['rain', 'Freezing rain'],
    71: ['snow', 'Light snow'],
    73: ['snow', 'Snow'],
    75: ['snow', 'Heavy snow'],
    77: ['snow', 'Snow grains'],
    80: ['rain', 'Rain showers'],
    81: ['rain', 'Rain showers'],
    82: ['rain', 'Violent showers'],
    85: ['snow', 'Snow showers'],
    86: ['snow', 'Heavy snow showers'],
    95: ['storm', 'Thunderstorm'],
    96: ['storm', 'Thunderstorm, hail'],
    99: ['storm', 'Severe thunderstorm'],
  };
  const hit = map[code];
  return hit ? { condition: hit[0], description: hit[1] } : { condition: 'cloudy', description: 'Unsettled' };
}

/** OpenWeatherMap condition ids. */
export function fromOwm(id: number, description: string): { condition: Condition; description: string } {
  const d = description.charAt(0).toUpperCase() + description.slice(1);
  if (id >= 200 && id < 300) return { condition: 'storm', description: d };
  if (id >= 300 && id < 400) return { condition: 'drizzle', description: d };
  if (id >= 500 && id < 600) return { condition: 'rain', description: d };
  if (id >= 600 && id < 700) return { condition: 'snow', description: d };
  if (id >= 700 && id < 800) return { condition: 'fog', description: d };
  if (id === 800) return { condition: 'clear', description: d };
  if (id === 801 || id === 802) return { condition: 'partly', description: d };
  return { condition: 'cloudy', description: d };
}

/** Severity used to pick the "headline" condition of a day out of several samples. */
export const SEVERITY: Record<Condition, number> = {
  clear: 0,
  partly: 1,
  cloudy: 2,
  fog: 3,
  drizzle: 4,
  rain: 5,
  snow: 6,
  storm: 7,
};
