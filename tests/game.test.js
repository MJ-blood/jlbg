import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, STOPS, edgesFor, findPath } from '../src/game.js';

function advance(game, seconds = 12) {
  for (let t = 0; t < seconds; t += 0.02) game.update(0.02);
}
function ready() {
  const game = new Game();
  game.start(); advance(game, 0.7);
  return game;
}
function go(game, node) {
  assert.equal(game.moveTo(node), true, `can move to ${node}`);
  advance(game);
  assert.equal(game.node, node);
}
function central() {
  const game = ready();
  go(game, 'W');
  assert.equal(game.rotate(), true);
  advance(game, 1);
  go(game, 'H');
  return game;
}

test('a new game requires start and the full intro transition', () => {
  const game = new Game();
  assert.equal(game.moveTo('W'), false);
  assert.equal(game.rotate(), false);
  assert.equal(game.start(), true);
  assert.equal(game.start(), false);
  game.update(0.3);
  assert.equal(game.phase, 'intro');
  game.update(0.3);
  assert.equal(game.phase, 'idle');
});

test('initial disconnected exit and seam nodes cannot be selected', () => {
  const game = ready();
  for (const target of ['E', 'H', 'Q', 'R2', 'unknown']) assert.equal(game.moveTo(target), false);
  assert.equal(game.node, 'S');
  assert.equal(game.phase, 'idle');
  assert.deepEqual(findPath('S', 'E', 'A'), null);
});

test('standard solution uses two rotations, one seam and one finish transition', () => {
  const game = central();
  assert.equal(game.orientation, 'B');
  assert.equal(game.moveTo('E'), false);
  game.rotate(); advance(game, 1);
  assert.equal(game.orientation, 'A');
  game.moveTo('E');
  for (let i = 0; i < 1000 && game.phase === 'moving'; i++) game.update(0.01);
  assert.equal(game.phase, 'finishing');
  assert.equal(game.node, 'E');
  assert.equal(game.rotations, 2);
  assert.equal(game.crossings, 1);
  assert.equal(game.moveTo('H'), false);
  assert.equal(game.rotate(), false);
  advance(game, 1.3);
  assert.equal(game.phase, 'won');
  assert.equal(game.crossings, 1);
});

test('orientation is committed at the end and repeat input is not queued', () => {
  const game = ready(); go(game, 'W');
  game.rotate(); game.update(0.4);
  assert.equal(game.orientation, 'A');
  assert.ok(game.bridgeAngle > 0 && game.bridgeAngle < Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    assert.equal(game.rotate(), false);
    assert.equal(game.moveTo('H'), false);
  }
  game.update(0.4);
  assert.equal(game.orientation, 'B');
  assert.equal(game.rotations, 1);
  advance(game, 3);
  assert.equal(game.rotations, 1);
  assert.equal(game.node, 'W');
});

test('bridge and entry tip do not allow rotation, but permit recovery', () => {
  const game = central();
  for (const stop of ['R1', 'I']) {
    go(game, stop);
    assert.equal(game.rotate(), false);
  }
  go(game, 'W');
  game.rotate(); advance(game, 1);
  game.rotate(); advance(game, 1);
  go(game, 'H');
  assert.equal(game.phase, 'idle');
});

test('seam traversal is instantaneous in screen space and reversible', () => {
  const game = central(); game.rotate(); advance(game, 1);
  game.moveTo('F');
  // H→R2 and Q→F measure 6u in total, so arrive in under 3.5s at 1.8u/s.
  advance(game, 3.5);
  assert.equal(game.node, 'F');
  assert.equal(game.phase, 'idle');
  assert.equal(game.crossings, 1);
  assert.equal(game.rotate(), false);
  game.moveTo('H'); advance(game, 3.5);
  assert.equal(game.node, 'H');
  assert.equal(game.phase, 'idle');
  assert.equal(game.crossings, 2);
});

test('movement cannot be interrupted or followed by queued actions', () => {
  const game = central();
  game.moveTo('W');
  game.update(0.3);
  assert.equal(game.moveTo('H'), false);
  assert.equal(game.rotate(), false);
  advance(game);
  assert.equal(game.node, 'W');
  assert.equal(game.orientation, 'B');
});

for (const phase of ['intro', 'moving', 'rotating', 'finishing', 'won']) {
  test(`reset during ${phase} removes all remaining work`, () => {
    const game = phase === 'intro' ? new Game() : central();
    if (phase === 'intro') game.start();
    if (phase === 'moving') { game.moveTo('W'); game.update(0.1); }
    if (phase === 'rotating') { game.rotate(); game.update(0.4); }
    if (phase === 'finishing' || phase === 'won') {
      game.rotate(); advance(game, 1); game.moveTo('E');
      while (game.phase === 'moving') game.update(0.02);
      if (phase === 'won') advance(game, 2);
    }
    assert.equal(game.phase, phase);
    game.reset(); advance(game);
    assert.deepEqual(game.snapshot(), new Game().snapshot());
    assert.equal(game.starting, false);
    assert.equal(game.bridgeAngle, 0);
  });
}

test('every reachable stoppable state can still win; the shortest solution rotates twice', () => {
  // Explore player-visible actions through the public model; no direct state mutation.
  const queue = [[]];
  const visited = new Set();
  let minimum = Infinity;
  const stateEdges = new Map();
  const winning = new Set();
  function replay(actions) {
    const game = ready();
    for (const action of actions) {
      const accepted = action === 'rotate' ? game.rotate() : game.moveTo(action);
      assert.equal(accepted, true);
      advance(game);
    }
    return game;
  }
  for (const actions of queue) {
    const current = replay(actions);
    const key = `${current.node}/${current.orientation}`;
    if (visited.has(key)) continue;
    visited.add(key);
    stateEdges.set(key, []);
    if (current.phase === 'won') { winning.add(key); minimum = Math.min(minimum, current.rotations); continue; }
    for (const action of [...STOPS, 'rotate']) {
      const next = replay(actions);
      if (!(action === 'rotate' ? next.rotate() : next.moveTo(action))) continue;
      advance(next);
      stateEdges.get(key).push(`${next.node}/${next.orientation}`);
      queue.push([...actions, action]);
    }
  }
  const canWin = new Set(winning);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [state, next] of stateEdges) if (!canWin.has(state) && next.some((s) => canWin.has(s))) {
      canWin.add(state); changed = true;
    }
  }
  assert.equal(visited.size, 13);
  assert.equal(canWin.size, visited.size);
  assert.equal(minimum, 2);
  assert.equal(edgesFor('A').some(([a, b]) => a === 'I' && b === 'R2'), false);
});
