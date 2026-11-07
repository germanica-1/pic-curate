import { describe, expect, test } from '@jest/globals';
import { addDays, bestStreak, currentStreak, dayKey, isComeback, recordDay } from './streak';

// Runs in America/New_York (set in jest.global-setup.js): DST starts 2026-03-08, ends 2026-11-01.

describe('dayKey / addDays', () => {
  test('uses the local date, not UTC', () => {
    // 23:30 local on Mar 7 is already Mar 8 in UTC
    expect(dayKey(new Date(2026, 2, 7, 23, 30))).toBe('2026-03-07');
    expect(dayKey(new Date(2026, 2, 8, 0, 30))).toBe('2026-03-08');
    // 03:30 UTC on Mar 8 is 22:30 on Mar 7 in New York (fails if TZ isn't applied)
    expect(dayKey(new Date(Date.UTC(2026, 2, 8, 3, 30)))).toBe('2026-03-07');
  });

  test('steps across DST changes and month/year ends', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('currentStreak', () => {
  const run = ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09']; // crosses DST start

  test('counts consecutive days ending today', () => {
    expect(currentStreak(run, '2026-03-09')).toEqual({ count: 4, status: 'done-today' });
  });

  test('a streak ending yesterday is at risk, not broken', () => {
    expect(currentStreak(run, '2026-03-10')).toEqual({ count: 4, status: 'at-risk' });
  });

  test('a missed day resets to 0', () => {
    expect(currentStreak(run, '2026-03-11')).toEqual({ count: 0, status: 'none' });
  });

  test('only the latest run counts', () => {
    expect(currentStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06'], '2026-01-06').count).toBe(2);
  });

  test('no days, no streak', () => {
    expect(currentStreak([], '2026-01-01')).toEqual({ count: 0, status: 'none' });
  });

  test('ignores days after "today" if the clock was moved back', () => {
    expect(currentStreak(['2026-01-01', '2026-01-02', '2026-02-01'], '2026-01-02')).toEqual({
      count: 2,
      status: 'done-today',
    });
  });
});

describe('recordDay', () => {
  test('several photos on one day count once', () => {
    const days = recordDay(recordDay([], '2026-01-01'), '2026-01-01');
    expect(days).toEqual(['2026-01-01']);
  });

  test('keeps days sorted even if the clock jumps back', () => {
    expect(recordDay(['2026-01-05'], '2026-01-03')).toEqual(['2026-01-03', '2026-01-05']);
  });
});

test('bestStreak survives a reset', () => {
  const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-10'];
  expect(bestStreak(days)).toBe(3);
  expect(currentStreak(days, '2026-01-10').count).toBe(1);
  expect(bestStreak([])).toBe(0);
});

describe('isComeback', () => {
  test('first ever day is not a comeback', () => {
    expect(isComeback([], '2026-01-01')).toBe(false);
  });
  test('continuing a streak is not a comeback', () => {
    expect(isComeback(['2026-01-01'], '2026-01-02')).toBe(false);
  });
  test('returning after a gap is', () => {
    expect(isComeback(['2026-01-01'], '2026-01-03')).toBe(true);
  });
  test('only the first contribution of the day counts', () => {
    expect(isComeback(['2026-01-01', '2026-01-03'], '2026-01-03')).toBe(false);
  });
});
