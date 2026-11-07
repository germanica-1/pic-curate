import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Constraint, Query, Sleeping } = Matter;

export type BodySpec = { id: string; w: number; h: number };

const WALL = 400; // thick walls so fast flings can't tunnel through

// Plain Matter.js wrapper. Body order matches the order the UI renders them in,
// so transforms() can be indexed by render slot.
export class PhysicsWorld {
  // Fewer solver iterations than Matter's 6/4: ~25% cheaper, stacking still stable (see tests).
  readonly engine = Engine.create({ enableSleeping: true, positionIterations: 4, velocityIterations: 3 });
  private bodies: Matter.Body[] = [];
  private walls: Matter.Body[] = [];
  private drag: Matter.Constraint | null = null;
  width = 0;
  height = 0;

  setBounds(width: number, height: number) {
    this.width = width;
    this.height = height;
    Composite.remove(this.engine.world, this.walls);
    const opts = { isStatic: true, friction: 0.6 };
    this.walls = [
      Bodies.rectangle(width / 2, height + WALL / 2, width + 2 * WALL, WALL, opts),
      Bodies.rectangle(width / 2, -WALL / 2, width + 2 * WALL, WALL, opts),
      Bodies.rectangle(-WALL / 2, height / 2, WALL, height + 2 * WALL, opts),
      Bodies.rectangle(width + WALL / 2, height / 2, WALL, height + 2 * WALL, opts),
    ];
    Composite.add(this.engine.world, this.walls);
    this.wakeAll();
  }

  add({ id, w, h }: BodySpec) {
    const x = w / 2 + Math.random() * Math.max(0, this.width - w);
    const body = Bodies.rectangle(x, h / 2 + 2, w, h, {
      label: id,
      angle: (Math.random() - 0.5) * 0.6,
      restitution: 0.15,
      friction: 0.5,
      frictionAir: 0.015,
      // No chamfer: rounded corners triple the vertex count and doubled step cost on device.
    });
    this.bodies.push(body);
    Composite.add(this.engine.world, body);
  }

  remove(id: string) {
    const body = this.bodies.find((b) => b.label === id);
    if (!body) return;
    if (this.drag?.bodyB === body) this.release();
    this.bodies = this.bodies.filter((b) => b !== body);
    Composite.remove(this.engine.world, body);
    this.wakeAll();
  }

  setGravity(x: number, y: number) {
    const g = this.engine.gravity;
    // Sleeping bodies ignore gravity changes, so wake them when the phone tilts.
    if (Math.abs(g.x - x) + Math.abs(g.y - y) > 0.05) this.wakeAll();
    g.x = x;
    g.y = y;
  }

  step(ms: number) {
    Engine.update(this.engine, ms);
  }

  /** Id of the last grabbed body; the UI draws it above the rest. */
  front: string | null = null;

  /** Grabs the topmost body under (x, y). Returns its id, or null. */
  grab(x: number, y: number): string | null {
    this.release();
    const hits = Query.point(this.bodies, { x, y });
    // later bodies render on top, except the last grabbed one which is drawn above all
    const body = hits.find((b) => b.label === this.front) ?? hits[hits.length - 1];
    if (!body) return null;
    this.front = body.label;
    Sleeping.set(body, false);
    this.drag = Constraint.create({
      pointA: { x, y },
      bodyB: body,
      pointB: { x: x - body.position.x, y: y - body.position.y },
      length: 0,
      stiffness: 0.2,
      damping: 0.1,
    });
    Composite.add(this.engine.world, this.drag);
    return body.label;
  }

  moveGrab(x: number, y: number) {
    if (!this.drag?.bodyB) return;
    this.drag.pointA = { x, y };
    Sleeping.set(this.drag.bodyB, false);
  }

  /** Lets go; the body keeps its velocity, so a quick drag becomes a fling. */
  release() {
    if (!this.drag) return;
    Composite.remove(this.engine.world, this.drag);
    this.drag = null;
  }

  /** Tosses every body upward and sideways a bit. */
  shake() {
    for (const b of this.bodies) {
      Sleeping.set(b, false);
      Body.setVelocity(b, {
        x: b.velocity.x + (Math.random() - 0.5) * 16,
        y: b.velocity.y - 4 - Math.random() * 10,
      });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.3);
    }
  }

  /** Flat [x, y, angle, ...] per body, in render order. */
  transforms(): number[] {
    const out = new Array<number>(this.bodies.length * 3);
    this.bodies.forEach((b, i) => {
      out[i * 3] = b.position.x;
      out[i * 3 + 1] = b.position.y;
      out[i * 3 + 2] = b.angle;
    });
    return out;
  }

  private wakeAll() {
    this.bodies.forEach((b) => Sleeping.set(b, false));
  }
}
