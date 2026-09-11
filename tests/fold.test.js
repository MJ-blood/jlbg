import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { FOLD_LEVEL as level } from '../src/fold-level.js';

const ready = () => { const g = new Game(level); g.start(); g.update(1); return g; };
function settle(g) { for (let i = 0; i < 1200 && !['idle', 'won', 'intro'].includes(g.phase); i++) g.update(0.05); assert.ok(['idle', 'won', 'intro'].includes(g.phase)); }
function step(g, type, target) { assert.equal(type === 'm' ? g.moveTo(target) : g.act(target), true); settle(g); }

test('fold: the solution needs open left, close left, then open right', () => {
  const g = ready(); assert.equal(g.moveTo('H'), false); assert.equal(g.act('right'), false);
  step(g, 'a', 'left'); assert.equal(g.moveTo('P'), false); step(g, 'm', 'H');
  assert.equal(g.moveTo('P'), false); step(g, 'a', 'left'); step(g, 'm', 'P');
  assert.equal(g.moveTo('E'), false); step(g, 'a', 'right'); step(g, 'm', 'E');
  assert.equal(g.phase, 'won'); assert.deepEqual(g.state, { leftOpen: false, rightOpen: true });
});

test('fold: both pages commit only after rotating and reject overlapping input', () => {
  const g = ready(); g.act('left'); g.update(0.45);
  assert.equal(g.state.leftOpen, false); assert.ok(Math.abs(g.visuals.leftAngle - Math.PI / 4) < 1e-10);
  assert.deepEqual(g.position, level.positions.S); assert.equal(g.moveTo('H'), false); assert.equal(g.act('left'), false);
  settle(g); step(g, 'm', 'H'); step(g, 'a', 'left'); step(g, 'm', 'P');
  g.act('right'); g.update(0.45); assert.equal(g.state.rightOpen, false); assert.ok(Math.abs(g.visuals.rightAngle + Math.PI / 4) < 1e-10);
  settle(g); assert.equal(g.state.rightOpen, true);
});

test('fold: wrong folds and every route remain reversible', () => {
  const g = ready(); step(g, 'a', 'left'); step(g, 'a', 'left'); step(g, 'a', 'left');
  step(g, 'm', 'H'); step(g, 'a', 'left'); step(g, 'm', 'P');
  step(g, 'a', 'right'); step(g, 'a', 'right'); assert.equal(g.moveTo('E'), false);
  step(g, 'm', 'H'); step(g, 'a', 'left'); step(g, 'm', 'S'); step(g, 'm', 'H');
  step(g, 'a', 'left'); step(g, 'm', 'P'); step(g, 'a', 'right'); step(g, 'm', 'E');
  assert.equal(g.phase, 'won');
});

test('fold: reset cancels either page and a crossing', () => {
  const cases = [
    (g) => g.act('left'),
    (g) => { step(g, 'a', 'left'); step(g, 'm', 'H'); step(g, 'a', 'left'); step(g, 'm', 'P'); g.act('right'); },
    (g) => { step(g, 'a', 'left'); g.moveTo('H'); },
  ];
  for (const prepare of cases) {
    const g = ready(); prepare(g); g.update(0.3); g.reset(); g.update(2);
    assert.deepEqual(g.snapshot(), new Game(level).snapshot());
    assert.deepEqual(g.visuals, { leftAngle: Math.PI / 2, rightAngle: -Math.PI / 2 });
  }
});

test('fold: reduced motion keeps the same final states', () => {
  const g = ready(); g.reducedMotion = true; g.act('left'); g.update(0.15);
  assert.equal(g.phase, 'idle'); assert.equal(g.state.leftOpen, true);
  step(g, 'm', 'H'); g.act('left'); g.update(0.15); step(g, 'm', 'P'); g.act('right'); g.update(0.15);
  assert.equal(g.state.rightOpen, true); assert.equal(g.phase, 'idle');
});

test('fold: all reachable stable states can finish without reset; minimum three folds', () => {
  const key = (g) => JSON.stringify([g.node, g.state]);
  const replay = (route) => { const g = ready(); for (const [type, target] of route) step(g, type, target); return g; };
  const first = key(ready()), states = new Map([[first, { route: [], edges: [], cost: 0 }]]), queue = [first];
  for (const k of queue) {
    const entry = states.get(k), g = replay(entry.route); entry.won = g.phase === 'won'; if (entry.won) continue;
    for (const [type, target] of [...level.stops.map((n) => ['m', n]), ['a', 'left'], ['a', 'right']]) {
      const next = replay(entry.route); if (!(type === 'm' ? next.moveTo(target) : next.act(target))) continue;
      settle(next); const nk = key(next); entry.edges.push([nk, type === 'a' ? 1 : 0]);
      if (!states.has(nk)) { states.set(nk, { route: [...entry.route, [type, target]], edges: [], cost: Infinity }); queue.push(nk); }
    }
  }
  const winning = new Set([...states].filter(([, s]) => s.won).map(([k]) => k));
  for (let i = 0; i < states.size; i++) for (const [k, s] of states) {
    if (s.edges.some(([next]) => winning.has(next))) winning.add(k);
    for (const [next, cost] of s.edges) states.get(next).cost = Math.min(states.get(next).cost, s.cost + cost);
  }
  assert.equal(winning.size, states.size);
  assert.equal(Math.min(...[...states.values()].filter((s) => s.won).map((s) => s.cost)), 3);
  console.log(`chapter 9: ${states.size} stable reachable states, all recoverable`);
});
