export type Units = 'metric' | 'imperial';

export const toF = (c: number) => (c * 9) / 5 + 32;

export function temp(c: number, units: Units): number {
  return Math.round(units === 'metric' ? c : toF(c));
}

/** wind is stored in km/h */
export function wind(kmh: number, units: Units): { value: number; unit: string } {
  return units === 'metric'
    ? { value: Math.round(kmh), unit: 'km/h' }
    : { value: Math.round(kmh * 0.621371), unit: 'mph' };
}

/** visibility stored in metres */
export function distance(m: number, units: Units): { value: string; unit: string } {
  if (units === 'metric') {
    const km = m / 1000;
    return { value: km >= 10 ? km.toFixed(0) : km.toFixed(1), unit: 'km' };
  }
  const mi = m / 1609.34;
  return { value: mi >= 10 ? mi.toFixed(0) : mi.toFixed(1), unit: 'mi' };
}

export function compass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function beaufort(kmh: number): string {
  const scale: [number, string][] = [
    [1, 'Calm'],
    [6, 'Light air'],
    [12, 'Light breeze'],
    [20, 'Gentle breeze'],
    [29, 'Moderate breeze'],
    [39, 'Fresh breeze'],
    [50, 'Strong breeze'],
    [62, 'Near gale'],
    [75, 'Gale'],
    [89, 'Strong gale'],
    [103, 'Storm'],
  ];
  for (const [max, label] of scale) if (kmh < max) return label;
  return 'Violent storm';
}
