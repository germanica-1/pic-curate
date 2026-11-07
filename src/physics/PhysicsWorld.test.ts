import { expect, jest, test } from '@jest/globals';
import { PhysicsWorld } from './PhysicsWorld';

const STEP = 1000 / 60;
const run = (world: PhysicsWorld, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) world.step(STEP);
};
const pos = (world: PhysicsWorld, slot: number) => {
  const t = world.transforms();
  return { x: t[slot * 3], y: t[slot * 3 + 1] };
};

function makeWorld(count: number) {
  const world = new PhysicsWorld();
  world.setBounds(360, 500);
  for (let i = 0; i < count; i++) world.add({ id: `b${i}`, w: 90, h: 70 });
  return world;
}

test('30 bodies fall, stack and stay inside the bin', () => {
  const world = makeWorld(30);
  run(world, 6);
  const t = world.transforms();
  expect(t).toHaveLength(90);
  for (let i = 0; i < 30; i++) {
    expect(t[i * 3]).toBeGreaterThan(0);
    expect(t[i * 3]).toBeLessThan(360);
    expect(t[i * 3 + 1]).toBeGreaterThan(0);
    expect(t[i * 3 + 1]).toBeLessThan(500);
  }
  // something reached the floor
  expect(Math.max(...t.filter((_, i) => i % 3 === 1))).toBeGreaterThan(500 - 70);
});

test('dragging pulls the grabbed body to the finger', () => {
  const world = makeWorld(1);
  run(world, 3);
  const start = pos(world, 0);
  expect(world.grab(start.x, start.y)).toBe('b0');
  world.moveGrab(100, 150);
  run(world, 1);
  const held = pos(world, 0);
  expect(Math.hypot(held.x - 100, held.y - 150)).toBeLessThan(20);
  world.release();
  run(world, 3);
  expect(pos(world, 0).y).toBeGreaterThan(400); // falls again after release
});

test('shake keeps everything inside the bin', () => {
  const world = makeWorld(30);
  run(world, 4);
  for (let i = 0; i < 5; i++) {
    world.shake();
    run(world, 0.3);
  }
  run(world, 3);
  const t = world.transforms();
  for (let i = 0; i < 30; i++) {
    expect(t[i * 3]).toBeGreaterThan(0);
    expect(t[i * 3]).toBeLessThan(360);
    expect(t[i * 3 + 1]).toBeGreaterThan(0);
    expect(t[i * 3 + 1]).toBeLessThan(500);
  }
});

test('grab misses empty space', () => {
  const world = makeWorld(1);
  run(world, 3);
  expect(world.grab(5, 5)).toBeNull();
});

test('tilting wakes settled bodies and slides them sideways', () => {
  jest.spyOn(Math, 'random').mockReturnValue(0); // spawn at the left wall
  const world = makeWorld(1);
  jest.restoreAllMocks();
  run(world, 6); // long enough to fall asleep
  expect(world.engine.world.bodies.find((b) => b.label === 'b0')?.isSleeping).toBe(true);
  const before = pos(world, 0).x;
  world.setGravity(1, 0);
  run(world, 3);
  expect(pos(world, 0).x).toBeGreaterThan(before + 150);
});

test('remove drops the body and keeps the others in order', () => {
  const world = makeWorld(3);
  world.remove('b1');
  expect(world.transforms()).toHaveLength(6);
});
