import { bestStreak } from './streak';

/** Lifetime progress. Nothing here ever decreases (product rule: removals don't undo stats). */
export type Stats = {
  totalAdded: number;
  cameraAdded: number;
  /** Sorted unique local YYYY-MM-DD days with at least one photo added. */
  days: string[];
  comebacks: number;
  /** Achievement id -> unlock time (ms). */
  unlocked: Record<string, number>;
};

export const emptyStats: Stats = { totalAdded: 0, cameraAdded: 0, days: [], comebacks: 0, unlocked: {} };

export type Achievement = { id: string; title: string; description: string; done: (s: Stats) => boolean };

const total = (n: number, title: string): Achievement => ({
  id: `total-${n}`,
  title,
  description: `Add ${n} photos`,
  done: (s) => s.totalAdded >= n,
});
const streak = (n: number, title: string): Achievement => ({
  id: `streak-${n}`,
  title,
  description: `Add photos ${n} days in a row`,
  done: (s) => bestStreak(s.days) >= n,
});

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-photo', title: 'First Drop', description: 'Add your first photo', done: (s) => s.totalAdded >= 1 },
  {
    id: 'first-camera',
    title: 'Fresh Off the Lens',
    description: 'Take a photo with the camera',
    done: (s) => s.cameraAdded >= 1,
  },
  total(10, 'Small Pile'),
  total(25, 'Respectable Heap'),
  total(50, 'Curator in Training'),
  total(100, 'Century'),
  total(250, 'Archivist'),
  total(500, 'Kira Approves'),
  streak(3, 'Warming Up'),
  streak(7, 'A Whole Week'),
  streak(14, 'Fortnight of Taste'),
  streak(30, 'Monthly Ritual'),
  streak(100, 'Unshakeable'),
  { id: 'comeback', title: 'Welcome Back', description: 'Return after a missed day', done: (s) => s.comebacks >= 1 },
];

/** Ids of achievements that are now met but not yet recorded as unlocked. */
export function newlyUnlocked(stats: Stats): string[] {
  return ACHIEVEMENTS.filter((a) => !stats.unlocked[a.id] && a.done(stats)).map((a) => a.id);
}
