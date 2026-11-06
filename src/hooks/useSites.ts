import { useState } from 'react';
import type { CandidateSite, Coordinates } from '../models';
import { appendSite } from '../lib/sites';
import { validCoordinates } from '../lib/coordinates';
export function useSites() {
  const [sites, setSites] = useState<CandidateSite[]>([]);
  return { sites,
    replaceSites: (next: CandidateSite[]) => setSites(next.map(site => ({ ...site }))),
    addSite: (coordinates: Coordinates) => setSites(current => appendSite(current, coordinates, crypto.randomUUID())),
    editSite: (id: string, coordinates: Coordinates) => { if (validCoordinates(coordinates)) setSites(current => current.map(site => site.id === id ? { ...site, ...coordinates } : site)); },
    removeSite: (id: string) => setSites(current => current.filter(site => site.id !== id)),
  };
}
