import { describe, expect, test } from '@jest/globals';
import { emptyStats } from '../logic/achievements';
import { BIN_CAP, initialState, parseSaved, reducer, type Photo, type State } from './reducer';

const photo = (id: string): Photo => ({
  id,
  file: `${id}.jpg`,
  w: 100,
  h: 80,
  addedAt: 0,
  source: 'gallery',
  inBin: true,
});
const many = (n: number, prefix = 'p') => Array.from({ length: n }, (_, i) => photo(`${prefix}${i}`));
const inBin = (s: State) => s.photos.filter((p) => p.inBin).map((p) => p.id);
const archived = (s: State) => s.photos.filter((p) => !p.inBin).map((p) => p.id);
const loaded = (photos: Photo[]) => reducer(initialState, { type: 'loaded', photos, stats: emptyStats });
const NOW = new Date(2026, 0, 10, 12).getTime();

describe('bin cap', () => {
  test('adding past the cap archives the oldest photos', () => {
    const s = reducer(loaded(many(BIN_CAP)), { type: 'added', photos: many(2, 'new'), now: NOW });
    expect(inBin(s)).toHaveLength(BIN_CAP);
    expect(archived(s)).toEqual(['p0', 'p1']);
    expect(inBin(s).slice(-2)).toEqual(['new0', 'new1']);
  });

  test('a big batch keeps only the newest in the bin', () => {
    const s = reducer(loaded([]), { type: 'added', photos: many(BIN_CAP + 5), now: NOW });
    expect(inBin(s)).toHaveLength(BIN_CAP);
    expect(inBin(s)[0]).toBe('p5');
  });

  test('unarchiving swaps with the oldest bin photo', () => {
    let s = reducer(loaded(many(BIN_CAP)), { type: 'added', photos: [photo('x')], now: NOW });
    expect(archived(s)).toEqual(['p0']);
    s = reducer(s, { type: 'unarchived', id: 'p0' });
    expect(archived(s)).toEqual(['p1']);
    expect(inBin(s).at(-1)).toBe('p0');
  });

  test('archived photos are not counted against the cap', () => {
    const s = reducer(loaded([...many(3, 'a').map((p) => ({ ...p, inBin: false })), ...many(BIN_CAP - 1)]), {
      type: 'added',
      photos: [photo('x')],
      now: NOW,
    });
    expect(archived(s)).toEqual(['a0', 'a1', 'a2']);
  });
});

test('remove then undo puts the photo back in the bin', () => {
  const p = photo('a');
  let s = reducer(loaded([p, photo('b')]), { type: 'removed', id: 'a' });
  expect(s.photos.map((x) => x.id)).toEqual(['b']);
  s = reducer(s, { type: 'restored', photo: p });
  expect(inBin(s)).toEqual(['b', 'a']);
});

describe('parseSaved', () => {
  test('round-trips saved photos', () => {
    const saved = { photos: [photo('a')], stats: { ...emptyStats, totalAdded: 7 } };
    expect(parseSaved(JSON.stringify(saved), NOW)).toEqual(saved);
  });
  test('drops malformed entries', () => {
    expect(parseSaved(JSON.stringify({ photos: [photo('a'), { id: 1 }, null] }), NOW).photos).toEqual([photo('a')]);
  });
  test('throws on data that is not ours, so the caller can back it up', () => {
    expect(() => parseSaved('{oops', NOW)).toThrow();
    expect(() => parseSaved('{"foo":1}', NOW)).toThrow();
  });
});

describe('stats', () => {
  const day = (d: number, h = 12) => new Date(2026, 0, d, h).getTime();
  const add = (s: State, now: number, ...photos: Photo[]) => reducer(s, { type: 'added', photos, now });

  test('adding counts photos, camera shots and the day, and unlocks achievements', () => {
    const s = add(loaded([]), day(1), photo('a'), { ...photo('b'), source: 'camera' });
    expect(s.stats.totalAdded).toBe(2);
    expect(s.stats.cameraAdded).toBe(1);
    expect(s.stats.days).toEqual(['2026-01-01']);
    expect(Object.keys(s.stats.unlocked).sort()).toEqual(['first-camera', 'first-photo']);
    expect(s.stats.unlocked['first-photo']).toBe(day(1));
  });

  test('removing, undoing and unarchiving never change stats', () => {
    const p = photo('a');
    let s = add(loaded([]), day(1), p);
    const before = s.stats;
    s = reducer(s, { type: 'removed', id: 'a' });
    expect(s.stats).toBe(before);
    s = reducer(s, { type: 'restored', photo: p });
    expect(s.stats).toBe(before);
    s = reducer(s, { type: 'unarchived', id: 'a' });
    expect(s.stats).toBe(before);
  });

  test('unlocks are recorded once and keep their first time', () => {
    let s = add(loaded([]), day(1), photo('a'));
    s = add(s, day(2), photo('b'));
    expect(s.stats.unlocked['first-photo']).toBe(day(1));
  });

  test('a 3-day streak unlocks, and survives a later break', () => {
    let s = loaded([]);
    for (const d of [1, 2, 3]) s = add(s, day(d), photo(`p${d}`));
    expect(s.stats.unlocked['streak-3']).toBe(day(3));
    s = add(s, day(9), photo('late'));
    expect(s.stats.unlocked['streak-3']).toBe(day(3));
    expect(s.stats.comebacks).toBe(1);
    expect(s.stats.unlocked['comeback']).toBe(day(9));
  });

  test('old saves without stats are rebuilt from their photos', () => {
    const photos = [
      { ...photo('a'), addedAt: day(2, 23) },
      { ...photo('b'), addedAt: day(1, 9), source: 'camera' as const },
      { ...photo('c'), addedAt: day(2, 8) },
    ];
    const { stats } = parseSaved(JSON.stringify({ photos }), NOW);
    expect(stats.totalAdded).toBe(3);
    expect(stats.cameraAdded).toBe(1);
    expect(stats.days).toEqual(['2026-01-01', '2026-01-02']);
  });
});
