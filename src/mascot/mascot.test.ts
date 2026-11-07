import { describe, expect, test } from '@jest/globals';
import { emptyStats } from '../logic/achievements';
import { BIN_CAP, initialState, reducer, type Action, type Photo, type State } from '../store/reducer';
import { LINES, pickLine } from './lines';
import { openingReaction, reactionFor } from './react';

const photo = (id: string, source: Photo['source'] = 'gallery'): Photo => ({
  id,
  file: `${id}.jpg`,
  w: 100,
  h: 80,
  addedAt: 0,
  source,
  inBin: true,
});
const day = (d: number) => new Date(2026, 0, d, 12).getTime();
const key = (d: number) => `2026-01-${String(d).padStart(2, '0')}`;
const start = (photos: Photo[] = []) => reducer(initialState, { type: 'loaded', photos, stats: emptyStats });
const addOn = (d: number, ...photos: Photo[]): Action => ({ type: 'added', photos, now: day(d) });
const react = (prev: State, action: Action, d = 1) => reactionFor(prev, reducer(prev, action), key(d));

describe('reactionFor', () => {
  test('a first photo unlocks "First Drop"', () => {
    expect(react(start(), addOn(1, photo('a')))).toEqual({ event: 'unlocked', vars: { title: 'First Drop' } });
  });

  test('plain adds, batches and camera shots', () => {
    const s = reducer(start(), addOn(1, photo('a')));
    expect(react(s, addOn(1, photo('b')))).toEqual({ event: 'added' });
    expect(react(s, addOn(1, photo('b'), photo('c')))).toEqual({ event: 'addedMany', vars: { n: 2 } });
    const withCamera = reducer(s, addOn(1, photo('c', 'camera'))); // unlocks first-camera
    expect(react(withCamera, addOn(1, photo('d', 'camera')))).toEqual({ event: 'addedCamera' });
  });

  test('the first photo of a new day reports the streak', () => {
    const s = reducer(start(), addOn(1, photo('a')));
    expect(react(s, addOn(2, photo('b')), 2)).toEqual({ event: 'streakUp', vars: { streak: 2 } });
  });

  test('a milestone beats the streak news', () => {
    let s = reducer(start(), addOn(1, photo('a')));
    s = reducer(s, addOn(2, photo('b')));
    expect(react(s, addOn(3, photo('c')), 3)).toEqual({ event: 'unlocked', vars: { title: 'Warming Up' } });
  });

  test('overflowing the bin', () => {
    const full = reducer(start(), addOn(1, ...Array.from({ length: BIN_CAP }, (_, i) => photo(`p${i}`))));
    expect(react(full, addOn(1, photo('x')))).toEqual({ event: 'binFull' });
  });

  test('remove, undo and unarchive', () => {
    const p = photo('a');
    const s = reducer(start([p, photo('b')]), { type: 'removed', id: 'b' });
    expect(react(start([p, photo('b')]), { type: 'removed', id: 'a' })).toEqual({ event: 'removed' });
    expect(react(s, { type: 'restored', photo: photo('b') })).toEqual({ event: 'undo' });
    const archived = start([{ ...photo('old'), inBin: false }, p]);
    expect(react(archived, { type: 'unarchived', id: 'old' })).toEqual({ event: 'unarchived' });
  });
});

describe('openingReaction', () => {
  const withDays = (days: string[]): State => ({ ...start(), stats: { ...emptyStats, totalAdded: 1, days } });
  test('first launch introduces Kira', () => {
    expect(openingReaction(start(), key(1)).event).toBe('intro');
  });
  test('streak states', () => {
    expect(openingReaction(withDays([key(1), key(2)]), key(3))).toEqual({
      event: 'streakAtRisk',
      vars: { streak: 2 },
    });
    expect(openingReaction(withDays([key(1)]), key(5)).event).toBe('streakBroken');
    expect(openingReaction(withDays([key(5)]), key(5)).event).toBe('welcomeBack');
  });
});

describe('pickLine', () => {
  test('fills placeholders and leaves unknown ones visible', () => {
    expect(pickLine('addedMany', { n: 4 }, [], () => 0)).toBe("4 at once? someone's been busy~");
    expect(pickLine('addedMany', {}, [], () => 0)).toContain('{n}');
  });

  test('does not repeat until the pool runs out', () => {
    const recent: string[] = [];
    const seen = new Set(LINES.tapped.map(() => pickLine('tapped', {}, recent)));
    expect(seen.size).toBe(LINES.tapped.length);
  });

  test('every event has lines', () => {
    for (const lines of Object.values(LINES)) expect(lines.length).toBeGreaterThan(0);
  });
});
