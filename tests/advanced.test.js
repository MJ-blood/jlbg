import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';

const ready = (id) => { const g = new Game(LEVELS[id - 1]); g.start(); g.update(1); return g; };
const settle = (g) => { g.update(100); g.update(2); };
function move(g, node) { assert.equal(g.moveTo(node), true, `move ${node}`); settle(g); }
function act(g, action) { assert.equal(g.act(action), true, `act ${action}`); settle(g); }

test('fourth chapter requires a changed ring relationship and a return through the illusion', () => {
  const g = ready(4); move(g, 'H');
  for (let i = 0; i < 4; i++) { act(g, 'rotate'); assert.equal(g.moveTo('E'), false); }
  act(g, 'rotate'); act(g, 'rotate'); move(g, 'W');
  assert.equal(g.act('rotate'), false);
  act(g, 'calibrate'); act(g, 'calibrate'); move(g, 'V'); move(g, 'H');
  assert.equal(g.crossings, 1);
  for (let i = 0; i < 3; i++) act(g, 'rotate');
  move(g, 'E'); assert.equal(g.phase, 'won');
});

test('fifth chapter needs the independent staircase before the stone can guard the exit', () => {
  const g = ready(5); move(g, 'C'); act(g, 'west'); move(g, 'P'); act(g, 'west'); move(g, 'W');
  assert.equal(g.act('west'), false);
  assert.equal(g.moveTo('E'), false);
  act(g, 'unfold'); assert.equal(g.canAct('unfold'), false);
  move(g, 'C'); act(g, 'west'); move(g, 'E'); assert.equal(g.phase, 'won');
});

test('sixth chapter needs a remote lock and then the same stone in the final gap', () => {
  const g = ready(6); move(g, 'H');
  for (let i = 0; i < 4; i++) { act(g, 'rotate'); assert.equal(g.moveTo('E'), false); }
  for (let i = 0; i < 3; i++) act(g, 'rotate');
  move(g, 'P'); act(g, 'west'); move(g, 'W');
  act(g, 'rotate'); act(g, 'rotate');
  assert.deepEqual(g.state, { outer: 1, inner: 1, dock: 1 });
  assert.equal(g.moveTo('E'), false);
  move(g, 'P'); act(g, 'east'); move(g, 'E'); assert.equal(g.phase, 'won');
});

test('carried stone, pressure gates and lock submit together only on arrival', () => {
  const g = ready(5); move(g, 'C'); act(g, 'west'); move(g, 'P');
  g.act('west'); g.update(0.525);
  assert.equal(g.state.dock, 1); assert.equal(g.position[0], 0); assert.equal(g.visuals.stoneX, 0);
  assert.equal(g.moveTo('W'), false); assert.equal(g.act('east'), false);
  settle(g); assert.equal(g.state.dock, 2); assert.equal(g.position[0], -2);
  const h = ready(6); move(h, 'H'); h.act('west'); h.update(0.5);
  assert.equal(h.state.dock, 0); assert.equal(h.canAct('rotate'), false);
  settle(h); assert.equal(h.state.dock, 1); assert.equal(h.canAct('rotate'), false);
  act(h, 'east'); assert.equal(h.canAct('rotate'), true);
});

test('ring wrap rotates one quarter turn, not three quarters', () => {
  const g = ready(4); move(g, 'H'); g.act('rotate'); g.update(0.425);
  assert.ok(Math.abs(g.visuals.innerAngle + Math.PI / 4) < 1e-8);
  assert.ok(Math.abs(g.visuals.outerAngle - Math.PI / 4) < 1e-8);
  assert.deepEqual(g.state, { outer: 0, inner: 0 });
});

test('new hints are voluntary, progressive and reset independently', () => {
  const g = ready(6), initial = g.hint;
  move(g, 'H'); assert.equal(g.hint, initial);
  assert.equal(g.requestHint(), true); const first = g.hint;
  g.requestHint(); assert.notEqual(g.hint, first);
  g.reset(); g.start(); g.update(1); g.requestHint(); assert.equal(g.hint, first);
});

// Exercise the public Game operations for every transition; reset is never a recovery edge.
for (const id of [4, 5, 6]) test(`chapter ${id}: every reachable stable state can finish without reset`, () => {
  const key = (g) => JSON.stringify([g.node, g.state]);
  const initial = ready(id), states = new Map([[key(initial), { route: [], edges: [], goal: false }]]);
  const queue = [key(initial)];
  const replay = (route) => {
    const g = ready(id);
    for (const [type, target] of route) { assert.equal(type === 'move' ? g.moveTo(target) : g.act(target), true); settle(g); }
    return g;
  };
  for (const k of queue) {
    const entry = states.get(k), g = replay(entry.route);
    entry.goal = g.phase === 'won';
    if (entry.goal) {
      if (id === 4) assert.equal((g.state.outer + g.state.inner) % 4, 2);
      if (id === 5) assert.deepEqual(g.state, { dock: 3, unfolded: true });
      if (id === 6) assert.deepEqual(g.state, { outer: 1, inner: 1, dock: 0 });
      continue;
    }
    for (const [type, target] of [...g.level.stops.map((n) => ['move', n]), ...Object.keys(g.level.actions).map((a) => ['act', a])]) {
      const next = replay(entry.route);
      if (!(type === 'move' ? next.moveTo(target) : next.act(target))) continue;
      settle(next); const nk = key(next); entry.edges.push(nk);
      if (!states.has(nk)) { states.set(nk, { route: [...entry.route, [type, target]], edges: [], goal: false }); queue.push(nk); }
    }
  }
  const winning = new Set([...states].filter(([, s]) => s.goal).map(([k]) => k));
  assert.ok(winning.size > 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, s] of states) if (!winning.has(k) && s.edges.some((n) => winning.has(n))) { winning.add(k); changed = true; }
  }
  assert.equal(winning.size, states.size, `unrecoverable states: ${[...states.keys()].filter((k) => !winning.has(k)).join('; ')}`);
  console.log(`chapter ${id}: ${states.size} reachable stable states, all recoverable`);
});

for (const id of [4, 5, 6]) test(`chapter ${id}: reset cancels every available initial mechanism`, () => {
  for (const action of Object.keys(LEVELS[id - 1].actions)) {
    const g = ready(id);
    if (id === 4) move(g, 'H');
    if (id === 6) move(g, 'H');
    if (!g.canAct(action)) continue;
    g.act(action); g.update(0.2); g.reset(); settle(g);
    assert.deepEqual(g.snapshot(), new Game(LEVELS[id - 1]).snapshot());
  }
});

test('reset cancels calibration, unfolding and an occupied stone without leaving gates or paths open', () => {
  const calibration = ready(4); move(calibration, 'H'); act(calibration, 'rotate'); act(calibration, 'rotate'); move(calibration, 'W');
  const unfold = ready(5); move(unfold, 'C'); act(unfold, 'west'); move(unfold, 'P'); act(unfold, 'west'); move(unfold, 'W');
  const rider = ready(6); move(rider, 'H'); move(rider, 'P');
  for (const [g, action] of [[calibration, 'calibrate'], [unfold, 'unfold'], [rider, 'west']]) {
    assert.equal(g.act(action), true); g.update(0.4); g.reset(); settle(g);
    assert.deepEqual(g.snapshot(), new Game(g.level).snapshot());
    assert.deepEqual(g.visuals, g.level.visuals(g.level.initial));
  }
});
