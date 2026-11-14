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
    country?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
  }[];
}

async function geoDb(query: string, signal: AbortSignal): Promise<City[]> {
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(
    query,
  )}&limit=6&sort=-population&types=CITY`;
  const json = await request<GeoDbResponse>(url, {
    signal,
    timeout: 6000,
    service: 'GeoDB Cities',
    headers: { 'X-RapidAPI-Key': GEODB_KEY!, 'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com' },
  });
  return (json.data ?? []).map((c) => ({
    id: `geodb-${c.id}`,
    name: c.name,
    region: c.region,
    country: c.country,
    countryCode: c.countryCode,
    lat: c.latitude,
    lon: c.longitude,
  }));
}

async function openMeteoGeo(query: string, signal: AbortSignal): Promise<City[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const json = await request<OpenMeteoGeoResponse>(url, { signal, timeout: 6000, service: 'the city search service' });
  return (json.results ?? []).map((c) => ({
    id: `om-${c.id}`,
    name: c.name,
    region: c.admin1,
    country: c.country ?? '',
    countryCode: c.country_code,
    lat: c.latitude,
    lon: c.longitude,
  }));
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
