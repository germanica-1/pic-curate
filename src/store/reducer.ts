// Pure app state. No React Native imports, so it can be unit tested directly.
import { emptyStats, newlyUnlocked, type Stats } from '../logic/achievements';
import { dayKey, isComeback, recordDay } from '../logic/streak';

export type Photo = {
  id: string;
  /** File name inside the app's photos folder. The folder path can change between installs, so it isn't stored. */
  file: string;
  w: number;
  h: number;
  addedAt: number;
  source: 'camera' | 'gallery';
  inBin: boolean;
};

export type State = { loaded: boolean; photos: Photo[]; stats: Stats };
export type Saved = { photos: Photo[]; stats: Stats };

export type Action =
  | { type: 'loaded'; photos: Photo[]; stats: Stats }
  | { type: 'added'; photos: Photo[]; now: number }
  | { type: 'removed'; id: string }
  | { type: 'restored'; photo: Photo } // undo of a removal
  | { type: 'unarchived'; id: string };

/** Max photos simulated in the bin; older ones overflow to the Archive. */
export const BIN_CAP = 20;

export const initialState: State = { loaded: false, photos: [], stats: emptyStats };

// Array order is bin order: oldest first, last = most recently dropped in.
function capBin(photos: Photo[]): Photo[] {
  let over = photos.filter((p) => p.inBin).length - BIN_CAP;
  if (over <= 0) return photos;
  return photos.map((p) => {
    if (over <= 0 || !p.inBin) return p;
    over--;
    return { ...p, inBin: false };
  });
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { loaded: true, photos: action.photos, stats: action.stats };
    case 'added':
      return {
        ...state,
        photos: capBin([...state.photos, ...action.photos.map((p) => ({ ...p, inBin: true }))]),
        stats: recordAdded(state.stats, action.photos, action.now),
      };
    case 'removed':
      return { ...state, photos: state.photos.filter((p) => p.id !== action.id) };
    case 'restored':
      return { ...state, photos: capBin([...state.photos, { ...action.photo, inBin: true }]) };
    case 'unarchived': {
      const photo = state.photos.find((p) => p.id === action.id);
      if (!photo) return state;
      const rest = state.photos.filter((p) => p.id !== action.id);
      return { ...state, photos: capBin([...rest, { ...photo, inBin: true }]) };
    }
  }
}

// The only place stats change. Removing, undoing and unarchiving never touch them.
function recordAdded(stats: Stats, photos: Photo[], now: number): Stats {
  if (!photos.length) return stats;
  const today = dayKey(new Date(now));
  const next: Stats = {
    ...stats,
    totalAdded: stats.totalAdded + photos.length,
    cameraAdded: stats.cameraAdded + photos.filter((p) => p.source === 'camera').length,
    comebacks: stats.comebacks + (isComeback(stats.days, today) ? 1 : 0),
    days: recordDay(stats.days, today),
  };
  const unlocked = { ...next.unlocked };
  for (const id of newlyUnlocked(next)) unlocked[id] = now;
  return { ...next, unlocked };
}

/** Rebuilds stats from photos, for saves made before stats existed (M2). */
export function statsFromPhotos(photos: Photo[], now: number): Stats {
  const sorted = [...photos].sort((a, b) => a.addedAt - b.addedAt);
  let stats = emptyStats;
  for (const p of sorted) stats = recordAdded(stats, [p], p.addedAt || now);
  return stats;
}

const isStats = (s: Partial<Stats> | undefined): s is Stats =>
  typeof s?.totalAdded === 'number' &&
  typeof s.cameraAdded === 'number' &&
  typeof s.comebacks === 'number' &&
  Array.isArray(s.days) &&
  s.days.every((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) &&
  typeof s.unlocked === 'object' &&
  s.unlocked !== null;

/** Parses saved state. Throws on anything that isn't our format; drops individual bad entries. */
export function parseSaved(raw: string, now: number): Saved {
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.photos)) throw new Error('Saved data has no photos list');
  const photos: Photo[] = data.photos.filter(
    (p: Partial<Photo>) =>
      typeof p?.id === 'string' &&
      typeof p.file === 'string' &&
      typeof p.w === 'number' &&
      typeof p.h === 'number' &&
      typeof p.inBin === 'boolean',
  );
  return { photos, stats: isStats(data.stats) ? data.stats : statsFromPhotos(photos, now) };
}
