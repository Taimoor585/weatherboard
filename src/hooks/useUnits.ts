import { useCallback, useEffect, useState } from 'react';
import { idbSet } from '../lib/idb';
import { KEYS, storage } from '../lib/storage';
import type { Units } from '../lib/units';

export function useUnits() {
  const [units, setUnits] = useState<Units>(() => {
    const u = storage.get<Units>(KEYS.units, 'metric');
    return u === 'imperial' ? 'imperial' : 'metric';
  });
  useEffect(() => {
    storage.set(KEYS.units, units);
    void idbSet('units', units); // the service worker formats reminder temperatures with this
  }, [units]);
  const toggle = useCallback(() => setUnits((u) => (u === 'metric' ? 'imperial' : 'metric')), []);
  return { units, setUnits, toggle };
}
