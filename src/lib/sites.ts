import type { CandidateSite, Coordinates } from '../models.ts';
import { validCoordinates } from './coordinates.ts';
export const SITE_COLORS = ['#c0f578', '#79caff', '#f4ad68', '#c39cff', '#ff7b9f', '#55e1cc', '#f1dc70', '#a2adff'];
export const MAX_SITES = 8;
export function appendSite(sites: CandidateSite[], coordinates: Coordinates, id: string): CandidateSite[] {
  if (sites.length >= MAX_SITES || !validCoordinates(coordinates)) return sites;
  const slot = SITE_COLORS.findIndex((_, i) => !sites.some(site => site.slot === i));
  return [...sites, { ...coordinates, id, slot, color: SITE_COLORS[slot] }];
}
