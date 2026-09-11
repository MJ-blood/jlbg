import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { FOLD_MIRROR_LEVEL as level } from '../src/fold-mirror-level.js';

const ready = () => { const game = new Game(level); game.start(); game.update(1); return game; };
function settle(game) {
  for (let i = 0; i < 1000 && !['idle', 'won', 'intro'].includes(game.phase); i++) game.update(0.05);
  assert.ok(['idle', 'won', 'intro'].includes(game.phase));
}
function step(game, type, target) {
  assert.equal(type === 'move' ? game.moveTo(target) : game.act(target), true);
  settle(game);
}

test('fold mirror: solution requires both mirrors and both fold states', () => {
  const g = ready();
  assert.equal(g.moveTo('E'), false);
  step(g, 'move', 'M0'); step(g, 'act', 'mirror'); step(g, 'move', 'A');
  step(g, 'act', 'fold'); step(g, 'move', 'M1'); step(g, 'act', 'mirror');
  assert.equal(g.moveTo('E'), false);
  step(g, 'act', 'fold'); step(g, 'move', 'E');
  assert.equal(g.phase, 'won');
  assert.deepEqual(g.state, { realm: 'real', foldOpen: false });
});

test('fold mirror: actions commit only after their animation', () => {
  const g = ready(); step(g, 'move', 'M0');
  g.act('mirror'); g.update(0.3);
  assert.equal(g.state.realm, 'real'); assert.equal(g.moveTo('A'), false); assert.equal(g.act('mirror'), false);
  settle(g); step(g, 'move', 'A');
  g.act('fold'); g.update(0.45);
  assert.equal(g.state.foldOpen, false); assert.ok(g.visuals.foldAngle < Math.PI / 2); assert.equal(g.moveTo('H'), false);
  settle(g); assert.equal(g.state.foldOpen, true);
});

test('fold mirror: wrong folds and both mirror gates remain recoverable', () => {
  const g = ready();
  step(g, 'move', 'M0'); step(g, 'act', 'mirror'); step(g, 'move', 'A');
  step(g, 'act', 'fold'); step(g, 'act', 'fold'); assert.equal(g.moveTo('H'), false); step(g, 'act', 'fold');
  step(g, 'move', 'M1'); step(g, 'act', 'mirror'); step(g, 'act', 'fold'); step(g, 'act', 'fold');
  step(g, 'act', 'mirror'); step(g, 'move', 'M0'); step(g, 'act', 'mirror');
  assert.equal(g.node, 'M0'); assert.equal(g.state.realm, 'real');
});

test('fold mirror: reset and reduced motion preserve the same solution', () => {
  const reset = ready(); reset.moveTo('M0'); reset.update(0.2); reset.reset(); reset.update(2);
  assert.deepEqual(reset.snapshot(), new Game(level).snapshot());
  const g = ready(); g.reducedMotion = true;
  step(g, 'move', 'M0'); step(g, 'act', 'mirror'); step(g, 'move', 'A'); step(g, 'act', 'fold');
  step(g, 'move', 'M1'); step(g, 'act', 'mirror'); step(g, 'act', 'fold'); step(g, 'move', 'E');
  assert.equal(g.phase, 'won');
});
