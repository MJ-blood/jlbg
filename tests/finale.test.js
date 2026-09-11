import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { FINALE_LEVEL as level } from '../src/finale-level.js';

const ready = () => { const game = new Game(level); game.start(); game.update(1); return game; };
function settle(game) {
  for (let i = 0; i < 1200 && !['idle', 'won', 'intro'].includes(game.phase); i++) game.update(0.05);
  assert.ok(['idle', 'won', 'intro'].includes(game.phase));
}
function step(game, type, target) {
  assert.equal(type === 'move' ? game.moveTo(target) : game.act(target), true);
  settle(game);
}
function solve(g) {
  step(g, 'act', 'view'); step(g, 'move', 'H'); step(g, 'move', 'TA');
  step(g, 'act', 'switch'); step(g, 'move', 'RP'); step(g, 'act', 'wings');
  step(g, 'act', 'switch'); step(g, 'move', 'TE'); step(g, 'act', 'final');
  step(g, 'act', 'switch'); step(g, 'move', 'RE');
}

test('finale: standard solution reuses view, two actors, wings, and final bridge', () => {
  const g = ready();
  assert.equal(g.moveTo('H'), false); assert.equal(g.act('switch'), false);
  solve(g);
  assert.equal(g.phase, 'won');
  assert.deepEqual([g.state.travellerNode, g.state.rockNode], ['TE', 'RE']);
});

test('finale: both anchors are required and the first arrival cannot finish', () => {
  const g = ready(); step(g, 'act', 'view'); step(g, 'move', 'TA');
  assert.equal(g.act('wings'), false); step(g, 'act', 'switch'); step(g, 'move', 'RP');
  step(g, 'act', 'wings'); step(g, 'act', 'switch'); step(g, 'move', 'TE');
  assert.equal(g.phase, 'idle'); assert.equal(g.moveTo('RE'), false); step(g, 'act', 'final');
  assert.equal(g.phase, 'idle');
});

test('finale: mechanisms commit at the end and reject overlapping input', () => {
  const g = ready(); g.act('view'); g.update(0.4);
  assert.equal(g.state.view, 'A'); assert.equal(g.moveTo('H'), false); assert.equal(g.act('view'), false);
  settle(g); step(g, 'move', 'TA'); step(g, 'act', 'switch'); step(g, 'move', 'RP');
  g.act('wings'); g.update(0.5); assert.equal(g.state.wingsOpen, false); assert.ok(g.visuals.wingLift > 0); settle(g);
  assert.equal(g.state.wingsOpen, true);
});

test('finale: reset and reduced motion keep the same outcome', () => {
  const reset = ready(); reset.act('view'); reset.update(0.3); reset.reset(); reset.update(2);
  assert.deepEqual(reset.snapshot(), new Game(level).snapshot());
  const g = ready(); g.reducedMotion = true; solve(g); assert.equal(g.phase, 'won');
});
