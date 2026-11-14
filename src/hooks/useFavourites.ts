import { useCallback, useEffect, useState } from 'react';
import { KEYS, storage, storageAvailable } from '../lib/storage';
import type { City } from '../lib/types';

export const MAX_FAVOURITES = 5;

export type AddResult = 'added' | 'exists' | 'full';

export function useFavourites() {
  const [favourites, setFavourites] = useState<City[]>(() => {
    const list = storage.get<City[]>(KEYS.favourites, []);
    return Array.isArray(list) ? list.filter((c) => c && typeof c.lat === 'number').slice(0, MAX_FAVOURITES) : [];
  });

  useEffect(() => {
    storage.set(KEYS.favourites, favourites);
  }, [favourites]);

  const isFavourite = useCallback(
    (city: City | null | undefined) => !!city && favourites.some((f) => sameCity(f, city)),
    [favourites],
  );

  const add = useCallback(
    (city: City): AddResult => {
      if (favourites.some((f) => sameCity(f, city))) return 'exists';
      if (favourites.length >= MAX_FAVOURITES) return 'full';
      setFavourites((list) => [...list, city]);
      return 'added';
    },
    [favourites],
  );

  const remove = useCallback((city: City) => {
    setFavourites((list) => list.filter((f) => !sameCity(f, city)));
  }, []);

  return { favourites, add, remove, isFavourite, persistent: storageAvailable };
}

export function sameCity(a: City, b: City) {
  return a.id === b.id || (Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02);
}
