import type { Condition } from './conditions';
import type { WeatherData } from './types';
import { temp, type Units } from './units';

/** Formats a unix timestamp in the *city's* local time (not the viewer's). */
function local(t: number, offset: number) {
  return new Date((t + offset) * 1000);
}

export function fmtTime(t: number, offset: number, opts: { hour12?: boolean } = {}) {
  const d = local(t, offset);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (opts.hour12 === false) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function fmtHour(t: number, offset: number) {
  const h = local(t, offset).getUTCHours();
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDay(t: number, offset: number, index: number) {
  if (index === 0) return 'Today';
  return DAYS[local(t, offset).getUTCDay()];
}

export function fmtDateLong(nowMs: number, offset: number) {
  const d = local(Math.floor(nowMs / 1000), offset);
  return `${DAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtDayDate(t: number, offset: number) {
  const d = local(t, offset);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function relative(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function utcLabel(offset: number) {
  const sign = offset >= 0 ? '+' : '−';
  const a = Math.abs(offset);
  const h = Math.floor(a / 3600);
  const m = Math.round((a % 3600) / 60);
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/**
 * A short, human "what does this mean for me" line generated from the data —
 * the kind of thing you'd otherwise have to infer from five different numbers.
 */
export function insight(d: WeatherData, units: Units): string {
  const c = d.current;
  const now = Date.now() / 1000;
  const next = d.hourly.filter((h) => h.time > now).slice(0, 12);
  const wet = next.find((h) => h.pop >= 50 && (['rain', 'drizzle', 'storm', 'snow'] as Condition[]).includes(h.condition));
  const hour = (t: number) => {
    const h = new Date((t + d.utcOffsetSec) * 1000).getUTCHours();
    return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const hi = temp(d.today.max, units);
  const parts: string[] = [];

  if (c.condition === 'storm') parts.push('Thunderstorms around — stay indoors if you can.');
  else if (['rain', 'drizzle'].includes(c.condition)) parts.push('Wet right now — an umbrella is a good idea.');
  else if (c.condition === 'snow') parts.push('Snow is falling — roads may be slippery.');
  else if (wet) parts.push(`${wet.condition === 'snow' ? 'Snow' : 'Rain'} likely from around ${hour(wet.time)} — plan accordingly.`);
  else if (c.condition === 'fog') parts.push('Low visibility from fog — take it slow on the roads.');
  else if (c.condition === 'clear' && c.isDay) parts.push('Clear skies — a great day to be outside.');
  else if (c.condition === 'clear') parts.push('Clear night — good for stargazing.');
  else parts.push('A calm, mostly dry day ahead.');

  if (c.uv != null && c.uv >= 6 && c.isDay) parts.push('UV is high, so wear sunscreen.');
  else if (c.windKmh >= 35) parts.push('Gusty winds — secure loose items.');
  else if (Math.abs(c.feelsLike - c.temp) >= 3)
    parts.push(`Feels ${c.feelsLike < c.temp ? 'colder' : 'warmer'} than it is (${temp(c.feelsLike, units)}°).`);
  else parts.push(`Topping out at ${hi}°.`);

  return parts.join(' ');
}
