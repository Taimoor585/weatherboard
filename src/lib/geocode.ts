import { request } from './http';
import { AppError, type City } from './types';

const GEODB_KEY = import.meta.env.VITE_GEODB_API_KEY as string | undefined;

interface GeoDbResponse {
  data: {
    id: number;
    name: string;
    region?: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  }[];
}

interface OpenMeteoGeoResponse {
  results?: {
    id: number;
    name: string;
    admin1?: string;
    admin2?: string;
    country?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
    population?: number;
  }[];
}

/**
 * Deduplicate search suggestions without eliminating legitimate different locations.
 * Merges entries with identical names in the same country that share coordinates or regions,
 * and refines redundant regional names for clarity (e.g. distinguishing Islamabad, PK vs others).
 */
export function deduplicateCities(cities: City[]): City[] {
  const deduped: City[] = [];

  for (const item of cities) {
    const normName = item.name.trim().toLowerCase();
    const normCountry = (item.countryCode || item.country).trim().toLowerCase();

    // Clean up redundant region if it exactly repeats the city name
    let cleanRegion = item.region?.trim();
    if (cleanRegion && cleanRegion.toLowerCase() === normName) {
      if (item.countryCode === 'PK' && normName === 'islamabad') {
        cleanRegion = 'Federal Capital Territory';
      } else {
        cleanRegion = undefined;
      }
    }

    const candidate: City = {
      ...item,
      region: cleanRegion,
    };

    // Find if an essentially duplicate location already exists in our deduped list
    const existingIdx = deduped.findIndex((existing) => {
      const exName = existing.name.trim().toLowerCase();
      const exCountry = (existing.countryCode || existing.country).trim().toLowerCase();
      if (exName !== normName || exCountry !== normCountry) return false;

      // Same city name and country: check proximity (within ~25km, 0.22 degrees)
      const latDiff = Math.abs(existing.lat - candidate.lat);
      const lonDiff = Math.abs(existing.lon - candidate.lon);
      const nearSameCoords = latDiff < 0.22 && lonDiff < 0.22;

      // Or identical administrative region
      const exRegion = (existing.region || '').trim().toLowerCase();
      const canRegion = (candidate.region || '').trim().toLowerCase();
      const sameRegion = exRegion === canRegion;

      return nearSameCoords || sameRegion;
    });

    if (existingIdx >= 0) {
      // Keep the one with a more detailed region or canonical metadata
      const current = deduped[existingIdx];
      const currentRegionLen = (current.region || '').length;
      const candidateRegionLen = (candidate.region || '').length;

      if (candidateRegionLen > currentRegionLen) {
        deduped[existingIdx] = candidate;
      }
    } else {
      deduped.push(candidate);
    }
  }

  return deduped.slice(0, 6);
}

async function geoDb(query: string, signal: AbortSignal): Promise<City[]> {
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(
    query,
  )}&limit=10&sort=-population&types=CITY`;
  const json = await request<GeoDbResponse>(url, {
    signal,
    timeout: 6000,
    service: 'GeoDB Cities',
    headers: { 'X-RapidAPI-Key': GEODB_KEY!, 'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com' },
  });
  const raw = (json.data ?? []).map((c) => ({
    id: `geodb-${c.id}`,
    name: c.name,
    region: c.region,
    country: c.country,
    countryCode: c.countryCode,
    lat: c.latitude,
    lon: c.longitude,
  }));
  return deduplicateCities(raw);
}

const geocodeCache = new Map<string, City[]>();

async function openMeteoGeo(query: string, signal: AbortSignal): Promise<City[]> {
  const norm = query.toLowerCase().trim();
  if (geocodeCache.has(norm)) {
    return geocodeCache.get(norm)!;
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;

  let lastErr: unknown;
  // Retry once on timeout or transient network blip
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = await request<OpenMeteoGeoResponse>(url, {
        signal,
        timeout: 9000,
        service: 'the city search service',
      });
      const raw = (json.results ?? []).map((c) => ({
        id: `om-${c.id}`,
        name: c.name,
        region: c.admin1 || c.admin2,
        country: c.country ?? '',
        countryCode: c.country_code,
        lat: c.latitude,
        lon: c.longitude,
      }));
      const deduped = deduplicateCities(raw);
      geocodeCache.set(norm, deduped);
      return deduped;
    } catch (err) {
      if (signal.aborted) throw err;
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
  throw lastErr;
}

export interface SearchResult {
  cities: City[];
  source: 'GeoDB Cities' | 'Open-Meteo Geocoding';
}

/**
 * City autocomplete. GeoDB (RapidAPI) is the primary source as required; its free tier is
 * limited to ~1 request/second, so on rate-limit / auth / network failure we transparently
 * fall back to Open-Meteo's free geocoder rather than leaving the user without suggestions.
 */
export async function searchCities(query: string, signal: AbortSignal): Promise<SearchResult> {
  const q = query.trim();
  if (GEODB_KEY) {
    try {
      return { cities: await geoDb(q, signal), source: 'GeoDB Cities' };
    } catch (err) {
      if (signal.aborted) throw err;
      if (err instanceof AppError && err.kind === 'offline') throw err;
      // fall through to Open-Meteo
    }
  }
  return { cities: await openMeteoGeo(q, signal), source: 'Open-Meteo Geocoding' };
}

/** Reverse lookup for "use my location" — Open-Meteo has no reverse geocoder, so use BigDataCloud's free client endpoint. */
export async function reverseGeocode(lat: number, lon: number): Promise<City> {
  try {
    const json = await request<{ city?: string; locality?: string; principalSubdivision?: string; countryName?: string; countryCode?: string }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { timeout: 5000, service: 'the location service' },
    );
    return {
      id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
      name: json.city || json.locality || 'Your location',
      region: json.principalSubdivision,
      country: json.countryName ?? '',
      countryCode: json.countryCode,
      lat,
      lon,
    };
  } catch {
    return { id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`, name: 'Your location', country: '', lat, lon };
  }
}
