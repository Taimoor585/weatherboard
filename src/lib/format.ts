import type { Condition } from './conditions';
import type { WeatherData } from './types';
import { temp, type Units, wind } from './units';

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
export interface WeatherInsight {
  headline: string;
  recommendation: string;
  badge: string;
  tone: 'rain' | 'wind' | 'temp' | 'uv' | 'pleasant';
}

/**
 * Derives actionable, human-centered insights and practical recommendations
 * strictly from the verified real-time and hourly forecast data.
 */
export function weatherInsight(d: WeatherData, units: Units): WeatherInsight {
  const c = d.current;
  const now = Date.now() / 1000;
  const next = d.hourly.filter((h) => h.time > now).slice(0, 12);
  const wet = next.find((h) => h.pop >= 45 && (['rain', 'drizzle', 'storm', 'snow'] as Condition[]).includes(h.condition));
  const hour = (t: number) => {
    const h = new Date((t + d.utcOffsetSec) * 1000).getUTCHours();
    return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const hi = temp(d.today.max, units);
  const lo = temp(d.today.min, units);

  // 1. Immediate severe or active precipitation
  if (c.condition === 'storm') {
    return {
      headline: 'Thunderstorms in your area',
      recommendation: 'Seek indoor shelter and avoid open areas until squalls subside.',
      badge: 'Storm Warning',
      tone: 'rain',
    };
  }
  if (c.condition === 'snow') {
    return {
      headline: 'Snow falling currently',
      recommendation: 'Roadways and footpaths will be slippery — travel with care.',
      badge: 'Winter Advisory',
      tone: 'rain',
    };
  }
  if (['rain', 'drizzle'].includes(c.condition)) {
    return {
      headline: 'Active rain in the area',
      recommendation: 'An umbrella and waterproof outer layer are recommended if heading out.',
      badge: 'Wet Weather',
      tone: 'rain',
    };
  }

  // 2. Upcoming precipitation in the next 12 hours
  if (wet) {
    const isSnow = wet.condition === 'snow';
    return {
      headline: `${isSnow ? 'Snow' : 'Rain'} expected around ${hour(wet.time)} (${wet.pop}% chance)`,
      recommendation: `Keep an umbrella handy — showers will develop into the ${wet.time > now + 14400 ? 'evening' : 'afternoon'}.`,
      badge: isSnow ? 'Snow Incoming' : 'Rain Incoming',
      tone: 'rain',
    };
  }

  // 3. Noticeable wind chill or humidity differential
  if (Math.abs(c.feelsLike - c.temp) >= 4) {
    if (c.feelsLike < c.temp) {
      return {
        headline: `Wind chill lowers real feel to ${temp(c.feelsLike, units)}°`,
        recommendation: `Noticeably cooler than the ${temp(c.temp, units)}° air temperature — an extra layer is advised.`,
        badge: 'Chill Factor',
        tone: 'temp',
      };
    } else {
      return {
        headline: `High humidity pushes real feel to ${temp(c.feelsLike, units)}°`,
        recommendation: 'Conditions feel warmer and muggier than actual temperature — keep hydrated.',
        badge: 'Heat Index',
        tone: 'temp',
      };
    }
  }

  // 4. Strong winds
  if (c.windKmh >= 35) {
    const w = wind(c.windKmh, units);
    return {
      headline: `Brisk winds reaching ${w.value} ${w.unit}`,
      recommendation: 'Breezy conditions throughout the area — secure loose outdoor items.',
      badge: 'Wind Notice',
      tone: 'wind',
    };
  }

  // 5. High UV Index during daytime
  if (c.uv != null && c.uv >= 6 && c.isDay) {
    return {
      headline: `Elevated UV index of ${c.uv.toFixed(1)} today`,
      recommendation: 'Sun protection (SPF 30+ and sunglasses) recommended between 11 AM and 4 PM.',
      badge: 'Sun Safety',
      tone: 'uv',
    };
  }

  // 6. Fog and low visibility
  if (c.condition === 'fog' || (c.visibility != null && c.visibility < 3000)) {
    return {
      headline: 'Reduced visibility due to mist or fog',
      recommendation: 'Allow extra travel time and use low-beam headlights on roads.',
      badge: 'Low Visibility',
      tone: 'pleasant',
    };
  }

  // 7. Pleasant & calm weather
  if (c.condition === 'clear' && c.isDay) {
    return {
      headline: 'Clear skies and favorable daylight',
      recommendation: `Daytime temperatures topping out at ${hi}° — ideal conditions for outdoor activities.`,
      badge: 'Great Conditions',
      tone: 'pleasant',
    };
  }
  if (c.condition === 'clear' && !c.isDay) {
    return {
      headline: 'Clear, crisp night with great visibility',
      recommendation: `Cooling to an overnight low of ${lo}°. Excellent conditions for stargazing.`,
      badge: 'Calm Night',
      tone: 'pleasant',
    };
  }

  return {
    headline: `${c.description.charAt(0).toUpperCase() + c.description.slice(1)} conditions today`,
    recommendation: `Expected high of ${hi}° and low of ${lo}°. Dry and settled outlook for the rest of today.`,
    badge: 'Today’s Outlook',
    tone: 'pleasant',
  };
}

export function insight(d: WeatherData, units: Units): string {
  const wi = weatherInsight(d, units);
  return `${wi.headline} — ${wi.recommendation}`;
}
