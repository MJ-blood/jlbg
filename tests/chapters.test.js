import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS, stairHeight } from '../src/levels.js';

function advance(game, seconds = 20) {
  for (let t = 0; t < seconds; t += 0.02) game.update(0.02);
}
function ready(chapter) {
  const game = new Game(LEVELS[chapter - 1]);
  game.start(); advance(game, 0.7);
  return game;
}
function go(game, node) {
  assert.equal(game.moveTo(node), true, `walk to ${node}`);
  advance(game);
  assert.equal(game.node, node);
}
function act(game, action) {
  assert.equal(game.act(action), true, `act ${action}`);
  advance(game, 1.1);
}
function towerFarSide() {
  const game = ready(2);
  go(game, 'P'); act(game, 'lift'); go(game, 'C');
  return game;
}

test('tower requires leaving the deck and using it as a lower passage', () => {
  const game = ready(2);
  assert.equal(game.moveTo('E2'), false);
  for (const node of ['N', 'F', 'missing']) assert.equal(game.moveTo(node), false);
  go(game, 'P');
  assert.equal(game.moveTo('E2'), false);
  act(game, 'lift');
  assert.equal(game.moveTo('E2'), false);
  go(game, 'C');
  assert.equal(game.moveTo('E2'), false);
  act(game, 'lift'); go(game, 'E2');
  assert.equal(game.phase, 'won');
  assert.equal(game.lifts, 2);
  assert.equal(game.crossings, 1);
});

test('rider is carried continuously; height and roads commit only when stopped', () => {
  const game = ready(2); go(game, 'P');
  const before = game.edges();
  game.act('lift'); game.update(0.5);
  assert.equal(game.height, 'low');
  assert.deepEqual(game.edges(), before);
  assert.deepEqual(game.position, [0, 2, 0]);
  assert.equal(game.visuals.liftOffset, 2);
  assert.equal(game.moveTo('U'), false);
  assert.equal(game.act('lift'), false);
  game.update(0.5);
  assert.equal(game.height, 'high');
  assert.deepEqual(game.position, [0, 4, 0]);
  assert.equal(game.phase, 'idle');
  assert.equal(game.lifts, 1);
  go(game, 'C');
  const stationary = [...game.position];
  game.act('lift'); game.update(0.5);
  assert.deepEqual(game.position, stationary);
  advance(game); assert.deepEqual(game.position, stationary);
});

test('tower can be recalled, reversed and recovered from both landings', () => {
  const game = ready(2); go(game, 'B'); act(game, 'lift');
  assert.equal(game.moveTo('P'), false);
  act(game, 'lift'); go(game, 'P'); act(game, 'lift');
  go(game, 'U'); assert.equal(game.act('lift'), false);
  go(game, 'T'); assert.equal(game.act('lift'), false);
  go(game, 'C'); act(game, 'lift'); act(game, 'lift');
  go(game, 'P'); act(game, 'lift'); go(game, 'S2');
  assert.equal(game.phase, 'idle');
});

test('stairs keep feet at the visible tread height in both directions', () => {
  const game = towerFarSide();
  for (const target of ['T', 'C']) {
    assert.equal(game.moveTo(target), true);
    while (game.phase === 'moving') {
      game.update(0.031);
      assert.ok(Math.abs(game.position[1] - stairHeight(game.position[2])) < 1e-9);
    }
  }
});

test('tower reset cancels a carried rider and a remotely moving tower', () => {
  for (const remote of [false, true]) {
    const game = remote ? towerFarSide() : ready(2);
    if (!remote) go(game, 'P');
    game.act('lift'); game.update(0.45);
    game.reset(); advance(game);
    assert.deepEqual(game.snapshot(), new Game(LEVELS[1]).snapshot());
    assert.deepEqual(game.visuals, { liftOffset: 0 });
  }
});

test('tower lower passage supports stopping before the goal and returning across the seam', () => {
  const game = towerFarSide(); act(game, 'lift'); go(game, 'V');
  assert.equal(game.phase, 'idle'); assert.equal(game.crossings, 1);
  assert.equal(game.act('lift'), false);
  go(game, 'C'); assert.equal(game.crossings, 2);
  act(game, 'lift'); go(game, 'P');
});

test('new chapter starts independently of a previous chapter in motion', () => {
  const tower = towerFarSide(); tower.act('lift'); tower.update(0.3);
  const first = ready(1), third = ready(3);
  assert.equal(first.node, 'S'); assert.equal(first.orientation, 'A');
  assert.equal(third.node, 'S3'); assert.equal(third.orientation, 'B'); assert.equal(third.lamp, 'right');
  advance(tower);
  assert.equal(first.node, 'S'); assert.equal(third.node, 'S3');
});

function lanternCenter(order = ['lamp', 'rotate']) {
  const game = ready(3); go(game, 'C');
  for (const action of order) act(game, action);
  go(game, 'H');
  return game;
}

test('lantern and bridge independently block entry and exit; both action orders work', () => {
  for (const order of [['lamp', 'rotate'], ['rotate', 'lamp']]) {
    const game = ready(3);
    assert.equal(game.moveTo('E3'), false);
    assert.equal(game.act('lamp'), false);
    go(game, 'C'); act(game, order[0]);
    assert.equal(game.moveTo('H'), false);
    act(game, order[1]); go(game, 'H');
    act(game, order[0]); assert.equal(game.moveTo('E3'), false);
    act(game, order[1]); go(game, 'E3');
    assert.equal(game.phase, 'won');
    assert.equal(game.rotations, 2); assert.equal(game.lampMoves, 2); assert.equal(game.crossings, 1);
  }
});

test('closed exit permits returning from its gate to repair the lantern state', () => {
  const game = lanternCenter(); act(game, 'rotate'); go(game, 'Z');
  assert.equal(game.moveTo('E3'), false);
  assert.equal(game.act('lamp'), false);
  assert.equal(game.rotate(), false);
  go(game, 'H'); assert.equal(game.crossings, 2);
  act(game, 'lamp'); go(game, 'E3');
  assert.equal(game.phase, 'won');
});

test('lantern commits only after arrival and cannot overlap or queue bridge actions', () => {
  const game = ready(3); go(game, 'C');
  const before = game.edges();
  game.act('lamp'); game.update(0.325);
  assert.equal(game.lamp, 'right'); assert.deepEqual(game.edges(), before);
  assert.ok(Math.abs(game.visuals.lampOffset) < 1e-9);
  for (let i = 0; i < 8; i++) {
    assert.equal(game.act('lamp'), false); assert.equal(game.rotate(), false); assert.equal(game.moveTo('H'), false);
  }
  game.update(0.325); advance(game);
  assert.equal(game.lamp, 'left'); assert.equal(game.lampMoves, 1); assert.equal(game.rotations, 0);
  assert.equal(game.orientation, 'B');
  assert.equal(game.node, 'C');
});

for (const phase of ['intro', 'moving', 'sliding', 'rotating', 'finishing', 'won']) {
  test(`third chapter reset during ${phase} clears every action`, () => {
    const game = phase === 'intro' ? new Game(LEVELS[2]) : lanternCenter();
    if (phase === 'intro') game.start();
    if (phase === 'moving') { game.moveTo('C'); game.update(0.3); }
    if (phase === 'sliding') { game.act('lamp'); game.update(0.3); }
    if (phase === 'rotating') { game.rotate(); game.update(0.3); }
    if (phase === 'finishing' || phase === 'won') {
      act(game, 'lamp'); act(game, 'rotate'); game.moveTo('E3');
      while (game.phase === 'moving') game.update(0.02);
      if (phase === 'won') advance(game);
    }
    assert.equal(game.phase, phase); game.reset(); advance(game);
    assert.deepEqual(game.snapshot(), new Game(LEVELS[2]).snapshot());
    assert.equal(game.action, null);
  });
}

for (const chapter of [2, 3]) {
  test(`chapter ${chapter}: every reachable player state can win without reset`, () => {
    const spec = LEVELS[chapter - 1];
    const key = (game) => JSON.stringify([game.node, game.state]);
    const replay = (actions) => {
      const game = ready(chapter);
      for (const action of actions) {
        assert.equal(Object.hasOwn(spec.actions, action) ? game.act(action) : game.moveTo(action), true);
        advance(game);
      }
      return game;
    };
    const queue = [[]], states = new Map(), wins = new Set();
    for (const actions of queue) {
      const game = replay(actions), id = key(game);
      if (states.has(id)) continue;
      states.set(id, []);
      if (game.phase === 'won') { wins.add(id); continue; }
      for (const action of [...spec.stops, ...Object.keys(spec.actions)]) {
        const next = replay(actions);
        if (!(Object.hasOwn(spec.actions, action) ? next.act(action) : next.moveTo(action))) continue;
        advance(next);
        states.get(id).push({ to: key(next), cost: Object.hasOwn(spec.actions, action) ? 1 : 0 });
        queue.push([...actions, action]);
      }
    }
    const canWin = new Set(wins);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, edges] of states) if (!canWin.has(id) && edges.some(({ to }) => canWin.has(to))) {
        canWin.add(id); changed = true;
      }
    }
    assert.equal(canWin.size, states.size);
    assert.equal(states.size, chapter === 2 ? 14 : 30);
    const costs = new Map([[key(ready(chapter)), 0]]);
    changed = true;
    while (changed) {
      changed = false;
      for (const [id, edges] of states) if (costs.has(id)) for (const { to, cost } of edges) {
        if (!costs.has(to) || costs.get(to) > costs.get(id) + cost) {
          costs.set(to, costs.get(id) + cost); changed = true;
        }
      }
    }
    assert.equal(Math.min(...[...wins].map(id => costs.get(id))), chapter === 2 ? 2 : 4);
  });
}
