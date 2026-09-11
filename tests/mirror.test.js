import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { MIRROR_LEVEL as level } from '../src/mirror-level.js';

const ready = () => { const g = new Game(level); g.start(); g.update(1); return g; };
function settle(g) {
  for (let i = 0; i < 1500 && !['idle', 'intro', 'won'].includes(g.phase); i++) g.update(0.05);
  assert.ok(['idle', 'intro', 'won'].includes(g.phase));
}
function step(g, type, target) { assert.equal(type === 'm' ? g.moveTo(target) : g.act(target), true); settle(g); }
function atHandle() { const g = ready(); step(g, 'm', 'M0'); step(g, 'a', 'mirror'); step(g, 'm', 'C'); return g; }

test('mirror: both realms and the shared screen are necessary to finish', () => {
  const g = ready();
  for (const target of ['C', 'M1', 'R', 'E']) assert.equal(g.moveTo(target), false);
  step(g, 'm', 'M0'); step(g, 'a', 'mirror');
  assert.equal(g.moveTo('E'), false); step(g, 'm', 'C'); assert.equal(g.moveTo('M1'), false);
  step(g, 'a', 'slide'); step(g, 'm', 'M1'); assert.equal(g.moveTo('E'), false);
  step(g, 'a', 'mirror'); step(g, 'm', 'E');
  assert.equal(g.phase, 'won'); assert.deepEqual(g.state, { realm: 'real', shifted: true });
});

test('mirror: each gate preserves landing and shared state, with reversible direction reflection', () => {
  const g = atHandle(); step(g, 'a', 'slide');
  for (const node of ['M0', 'M1']) {
    step(g, 'm', node); const p = [...g.position], direction = [...g.direction];
    step(g, 'a', 'mirror'); assert.deepEqual(g.position, p); assert.equal(g.state.shifted, true);
    assert.deepEqual(g.direction, [direction[0], direction[1], -direction[2]]);
    step(g, 'a', 'mirror'); assert.deepEqual(g.position, p); assert.deepEqual(g.direction, direction);
  }
});

test('mirror: wrong screen order and a return through the low gate remain recoverable', () => {
  const g = atHandle(); step(g, 'a', 'slide'); step(g, 'a', 'slide');
  assert.equal(g.moveTo('M1'), false); step(g, 'm', 'M0'); step(g, 'a', 'mirror'); step(g, 'm', 'S');
  assert.equal(g.moveTo('E'), false); step(g, 'm', 'M0'); step(g, 'a', 'mirror'); step(g, 'm', 'C');
  step(g, 'a', 'slide'); step(g, 'm', 'M1'); step(g, 'a', 'mirror');
  step(g, 'm', 'Z'); assert.equal(g.act('slide'), false); step(g, 'm', 'M1'); step(g, 'm', 'E');
  assert.equal(g.phase, 'won');
});

test('mirror: transitions lock input and commit the realm or bridge only on arrival', () => {
  const g = ready(); assert.equal(g.act('mirror'), false); assert.equal(g.act('slide'), false);
  step(g, 'm', 'M0'); const p = [...g.position]; g.act('mirror'); g.update(0.375);
  assert.equal(g.state.realm, 'real'); assert.deepEqual(g.position, p); assert.equal(g.visuals.realmMix, 0.5);
  assert.equal(g.moveTo('C'), false); assert.equal(g.act('mirror'), false); assert.equal(g.act('slide'), false);
  settle(g); step(g, 'm', 'C'); g.act('slide'); g.update(0.5);
  assert.equal(g.state.shifted, false); assert.equal(g.visuals.slideOffset, -1.5);
  assert.equal(g.moveTo('M1'), false); assert.equal(g.act('mirror'), false); settle(g);
  assert.equal(g.state.shifted, true);
});

test('mirror: reset cancels crossing, shared structure movement and walking', () => {
  for (const action of ['mirror', 'slide', 'walk']) {
    const g = action === 'slide' ? atHandle() : ready();
    if (action === 'mirror') { step(g, 'm', 'M0'); g.act('mirror'); }
    else if (action === 'slide') g.act('slide');
    else g.moveTo('M0');
    g.update(0.3); g.reset(); g.update(2);
    assert.deepEqual(g.snapshot(), new Game(level).snapshot());
    assert.deepEqual(g.visuals, { realmMix: 0, slideOffset: 0 });
  }
});

test('mirror: reduced motion and reflected stair elevations follow the same rules', () => {
  const g = ready(); g.reducedMotion = true; step(g, 'm', 'M0'); g.act('mirror'); g.update(0.12);
  assert.equal(g.phase, 'idle'); g.moveTo('C'); g.update(0.6);
  assert.ok(g.position[2] > 0);
  const t = g.position[2] / 4;
  assert.ok(Math.abs(g.position[1] - Math.floor(t * 19 + 1e-8) * 3 / 19) < 1e-8);
  settle(g); g.act('slide'); g.update(0.15); assert.equal(g.state.shifted, true); assert.equal(g.phase, 'idle');
});

test('mirror: all reachable stable states can finish without reset; minimum three actions', () => {
  const key = (g) => JSON.stringify([g.node, g.state]);
  const replay = (route) => { const g = ready(); for (const [type, target] of route) step(g, type, target); return g; };
  const first = key(ready()), states = new Map([[first, { route: [], edges: [], cost: 0 }]]), queue = [first];
  for (const k of queue) {
    const entry = states.get(k), g = replay(entry.route); entry.won = g.phase === 'won';
    if (entry.won) { assert.deepEqual(g.state, { realm: 'real', shifted: true }); continue; }
    for (const [type, target] of [...level.stops.map((n) => ['m', n]), ['a', 'mirror'], ['a', 'slide']]) {
      const next = replay(entry.route);
      if (!(type === 'm' ? next.moveTo(target) : next.act(target))) continue;
      settle(next); const nk = key(next); entry.edges.push([nk, type === 'a' ? 1 : 0]);
      if (!states.has(nk)) { states.set(nk, { route: [...entry.route, [type, target]], edges: [], cost: Infinity }); queue.push(nk); }
    }
  }
  const winning = new Set([...states].filter(([, s]) => s.won).map(([k]) => k));
  assert.ok(winning.size > 0);
  for (let i = 0; i < states.size; i++) for (const [k, s] of states) {
    if (s.edges.some(([nk]) => winning.has(nk))) winning.add(k);
    for (const [nk, cost] of s.edges) states.get(nk).cost = Math.min(states.get(nk).cost, s.cost + cost);
  }
  assert.equal(winning.size, states.size);
  assert.equal(Math.min(...[...states.values()].filter((s) => s.won).map((s) => s.cost)), 3);
  console.log(`chapter 8: ${states.size} stable reachable states, all recoverable`);
});
