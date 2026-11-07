// Streak rules (decided by the product owner, see docs/PLAN.md):
// - a day counts if >= 1 photo was added; days are device-local calendar dates
// - missing a day resets the streak to 0; today is "at risk", not broken, until midnight
// - nothing is ever removed from `days`, so stats never go down

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Calendar arithmetic on day keys. Uses noon so DST shifts can never cross midnight. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12));
}

/** Adds today to the sorted, unique list of contribution days. */
export function recordDay(days: string[], today: string): string[] {
  if (days.includes(today)) return days;
  return [...days, today].sort(); // YYYY-MM-DD sorts correctly as text
}

/** True when today's contribution follows a gap (the user is back after a broken streak). */
export function isComeback(days: string[], today: string): boolean {
  const before = days.filter((d) => d < today);
  const last = before.at(-1);
  return last !== undefined && last < addDays(today, -1) && !days.includes(today);
}

export type StreakStatus = 'done-today' | 'at-risk' | 'none';

/** Current streak as of `today`. A streak ending yesterday is still alive but at risk. */
export function currentStreak(days: string[], today: string): { count: number; status: StreakStatus } {
  // ignore days "in the future" in case the device clock was moved back
  const past = days.filter((d) => d <= today);
  const last = past.at(-1);
  const yesterday = addDays(today, -1);
  if (last !== today && last !== yesterday) return { count: 0, status: 'none' };
  let count = 0;
  let expect = last;
  for (let i = past.length - 1; i >= 0 && past[i] === expect; i--) {
    count++;
    expect = addDays(expect, -1);
  }
  return { count, status: last === today ? 'done-today' : 'at-risk' };
}

/** Longest run of consecutive days ever. */
export function bestStreak(days: string[]): number {
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
