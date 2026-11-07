import { ACHIEVEMENTS } from '../logic/achievements';
import { currentStreak } from '../logic/streak';
import type { State } from '../store/reducer';
import type { KiraEvent } from './lines';

export type Reaction = { event: KiraEvent; vars?: Record<string, string | number> };

const archivedCount = (s: State) => s.photos.filter((p) => !p.inBin).length;

/** What Kira says when the app opens. */
export function openingReaction(state: State, today: string): Reaction {
  if (!state.stats.totalAdded) return { event: 'intro' };
  const streak = currentStreak(state.stats.days, today);
  if (streak.status === 'at-risk') return { event: 'streakAtRisk', vars: { streak: streak.count } };
  if (streak.status === 'none') return { event: 'streakBroken' };
  return { event: 'welcomeBack' };
}

/** What Kira says about a state change, most important news first. Null if nothing worth saying. */
export function reactionFor(prev: State, next: State, today: string): Reaction | null {
  const added = next.stats.totalAdded - prev.stats.totalAdded;
  if (added > 0) {
    // the last match in table order is the bigger milestone (totals and streaks come after "first" ones)
    const unlocked = ACHIEVEMENTS.filter((a) => next.stats.unlocked[a.id] && !prev.stats.unlocked[a.id]).at(-1);
    if (unlocked) return { event: 'unlocked', vars: { title: unlocked.title } };
    const streak = currentStreak(next.stats.days, today).count;
    if (next.stats.days.length > prev.stats.days.length && streak >= 2) {
      return { event: 'streakUp', vars: { streak } };
    }
    if (archivedCount(next) > archivedCount(prev)) return { event: 'binFull' };
    if (next.stats.cameraAdded > prev.stats.cameraAdded) return { event: 'addedCamera' };
    return added > 1 ? { event: 'addedMany', vars: { n: added } } : { event: 'added' };
  }
  if (next.photos.length < prev.photos.length) return { event: 'removed' };
  if (next.photos.length > prev.photos.length) return { event: 'undo' };
  // unarchiving moves a photo to the end of the list (and may archive another)
  if (next.photos.at(-1)?.id !== prev.photos.at(-1)?.id) return { event: 'unarchived' };
  return null;
}
