import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { VIEWPOINT_LEVEL as level } from '../src/viewpoint-level.js';

const ready = () => { const game = new Game(level); game.start(); game.update(1); return game; };
function settle(game) {
  for (let i = 0; i < 1000 && !['idle', 'won', 'intro'].includes(game.phase); i++) game.update(0.05);
  assert.ok(['idle', 'won', 'intro'].includes(game.phase));
}
function step(game, type, target) {
  assert.equal(type === 'move' ? game.moveTo(target) : game.act(target), true);
  settle(game);
}

test('viewpoint: three discoveries are necessary, and each depth seam is traversed', () => {
  const g = ready();
  for (const target of ['H', 'K', 'E']) assert.equal(g.moveTo(target), false);
  for (const [target, blocked] of [['H', 'K'], ['K', 'E'], ['E', null]]) {
    step(g, 'act', 'view'); step(g, 'move', target);
    if (blocked) assert.equal(g.moveTo(blocked), false);
  }
  assert.equal(g.phase, 'won'); assert.equal(g.crossings, 3);
});

test('viewpoint: switching locks input and commits roads once, keeping the traveller fixed', () => {
  const g = ready(), position = [...g.position];
  assert.equal(g.act('view'), true); g.update(0.5);
  assert.equal(g.state.view, 'A'); assert.deepEqual(g.position, position);
  assert.ok(Math.abs(g.visuals.cameraYaw) < 1e-10);
  assert.equal(g.moveTo('H'), false); assert.equal(g.act('view'), false);
  settle(g); assert.equal(g.state.view, 'B'); assert.deepEqual(g.position, position);
  assert.equal(g.moveTo('H'), true); assert.equal(g.act('view'), false);
});

test('viewpoint: wrong turns recover at every platform and both earlier seams work backwards', () => {
  const g = ready();
  step(g, 'act', 'view'); step(g, 'move', 'H'); step(g, 'move', 'S'); step(g, 'move', 'H');
  step(g, 'act', 'view'); step(g, 'move', 'K'); step(g, 'move', 'H'); step(g, 'move', 'K');
  step(g, 'act', 'view'); step(g, 'act', 'view'); assert.equal(g.moveTo('E'), false);
  step(g, 'act', 'view'); step(g, 'move', 'G');
  assert.equal(g.act('view'), false);
  step(g, 'move', 'K'); step(g, 'move', 'E');
  assert.equal(g.crossings, 9); assert.equal(g.phase, 'won');
});

test('viewpoint: reset cancels an orbit or a walk; reduced motion uses a short transition', () => {
  for (const moving of [false, true]) {
    const g = ready(); g.act('view');
    if (moving) { settle(g); g.moveTo('H'); }
    g.update(0.35); g.reset(); g.update(2);
    assert.deepEqual(g.snapshot(), new Game(level).snapshot());
    assert.deepEqual(g.visuals, { cameraYaw: Math.PI / 4 });
  }
  const g = ready(); g.reducedMotion = true; g.act('view'); g.update(0.06);
  assert.equal(g.phase, 'viewing'); g.update(0.06);
  assert.equal(g.phase, 'idle'); assert.equal(g.state.view, 'B');
});

test('viewpoint: only the intended endpoint pairs overlap at each camera angle', () => {
  for (const seam of level.seams) {
    const delta = level.positions[seam.nodes[1]].map((v, i) => v - level.positions[seam.nodes[0]][i]);
    for (const view of ['A', 'B']) {
      const sign = view === 'A' ? 1 : -1;
      const screenX = delta[0] - sign * delta[2];
      const screenY = 2 * delta[1] - sign * delta[0] - delta[2];
      if (view === seam.view) assert.ok(Math.hypot(screenX, screenY) < 1e-10);
      else assert.ok(Math.hypot(screenX, screenY) > 3);
    }
  }
});

test('viewpoint: all reachable stable states recover without reset; minimum three switches', () => {
  const key = (g) => `${g.node}/${g.state.view}`;
  const replay = (route) => { const g = ready(); for (const [type, target] of route) step(g, type, target); return g; };
  const states = new Map([['S/A', { route: [], edges: [], cost: 0 }]]), queue = ['S/A'];
  for (const k of queue) {
    const entry = states.get(k), g = replay(entry.route);
    entry.won = g.phase === 'won'; if (entry.won) continue;
    for (const [type, target] of [...level.stops.map((node) => ['move', node]), ['act', 'view']]) {
      const next = replay(entry.route);
      if (!(type === 'move' ? next.moveTo(target) : next.act(target))) continue;
      settle(next); const nk = key(next); entry.edges.push([nk, type === 'act' ? 1 : 0]);
      if (!states.has(nk)) { states.set(nk, { route: [...entry.route, [type, target]], edges: [], cost: Infinity }); queue.push(nk); }
    }
  }
  const winning = new Set([...states].filter(([, s]) => s.won).map(([k]) => k));
  for (let pass = 0; pass < states.size; pass++) for (const [k, s] of states) {
    if (s.edges.some(([next]) => winning.has(next))) winning.add(k);
    for (const [next, cost] of s.edges) states.get(next).cost = Math.min(states.get(next).cost, s.cost + cost);
  }
  assert.equal(states.size, 8); assert.equal(winning.size, states.size);
  assert.equal(Math.min(...[...states.values()].filter((s) => s.won).map((s) => s.cost)), 3);
});
