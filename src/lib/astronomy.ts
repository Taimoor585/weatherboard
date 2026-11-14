export interface MoonInfo {
  phaseName: string;
  illumination: number; // 0..100%
  ageDays: number;
  fraction: number; // 0..1
}

/**
 * Computes lunar phase based on the known New Moon epoch: Jan 6, 2000, 18:14 UTC.
 * Synodic month = 29.53058867 days.
 */
export function getMoonInfo(timestampSec = Date.now() / 1000): MoonInfo {
  const date = new Date(timestampSec * 1000);
  const epoch = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (date.getTime() - epoch) / (1000 * 60 * 60 * 24);
  const synodicPeriod = 29.53058867;
  const phaseCycle = ((diffDays % synodicPeriod) + synodicPeriod) % synodicPeriod;
  const fraction = phaseCycle / synodicPeriod;

  // Illumination calculation: 0% at New Moon (fraction = 0 or 1), 100% at Full Moon (fraction = 0.5)
  const illumination = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) * 50);

  let phaseName = 'New Moon';
  if (fraction < 0.03 || fraction > 0.97) phaseName = 'New Moon';
  else if (fraction < 0.22) phaseName = 'Waxing Crescent';
  else if (fraction < 0.28) phaseName = 'First Quarter';
  else if (fraction < 0.47) phaseName = 'Waxing Gibbous';
  else if (fraction < 0.53) phaseName = 'Full Moon';
  else if (fraction < 0.72) phaseName = 'Waning Gibbous';
  else if (fraction < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  return {
    phaseName,
    illumination,
    ageDays: Math.round(phaseCycle * 10) / 10,
    fraction,
  };
}
