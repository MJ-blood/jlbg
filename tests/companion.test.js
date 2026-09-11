import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { COMPANION_LEVEL as level } from '../src/companion-level.js';

const ready = () => {
  const game = new Game(level);
  game.start();
  game.update(1);
  return game;
};

function settle(game) {
  for (let i = 0; i < 1000 && !['idle', 'won', 'intro'].includes(game.phase); i++) game.update(0.05);
  assert.ok(['idle', 'won', 'intro'].includes(game.phase));
}

function step(game, type, target) {
  assert.equal(type === 'move' ? game.moveTo(target) : game.act(target), true);
  settle(game);
}

function solve(game) {
  step(game, 'move', 'A');
  step(game, 'act', 'gate');
  step(game, 'act', 'switch');
  step(game, 'move', 'P');
  step(game, 'act', 'switch');
  step(game, 'move', 'B');
  step(game, 'act', 'lock');
  step(game, 'move', 'TE');
  step(game, 'act', 'switch');
  step(game, 'move', 'RE');
}

test('companion: traveller and rock must prepare each route', () => {
  const g = ready();
  assert.equal(g.moveTo('B'), false);
  step(g, 'move', 'A');
  step(g, 'act', 'gate');
  step(g, 'act', 'switch');
  step(g, 'move', 'P');
  step(g, 'act', 'switch');
  step(g, 'move', 'B');
  step(g, 'act', 'lock');
  step(g, 'move', 'TE');
  assert.equal(g.phase, 'idle');
  step(g, 'act', 'switch');
  step(g, 'move', 'RE');
  assert.equal(g.phase, 'won');
  assert.deepEqual([g.state.travellerNode, g.state.rockNode], ['TE', 'RE']);
});

test('companion: switching commits the active actor and keeps both positions', () => {
  const g = ready();
  step(g, 'move', 'A');
  const travellerPosition = [...g.position];
  assert.equal(g.act('switch'), true);
  g.update(0.1);
  assert.equal(g.state.active, 'traveller');
  assert.equal(g.moveTo('R0'), false);
  settle(g);
  assert.equal(g.state.active, 'rock');
  assert.equal(g.node, 'R0');
  assert.deepEqual(g.state.travellerNode, 'A');
  assert.deepEqual(g.position, level.positions.R0);
  step(g, 'act', 'switch');
  assert.equal(g.node, 'A');  assert.deepEqual(g.position, travellerPosition);
});

test('companion: gate and bridge lock enforce actor, place, and order', () => {
  const g = ready();
  assert.equal(g.act('gate'), false);
  step(g, 'move', 'A');
  step(g, 'act', 'gate');
  assert.equal(g.act('lock'), false);
  step(g, 'act', 'switch');
  assert.equal(g.act('gate'), false);
  step(g, 'move', 'P');
  assert.equal(g.moveTo('C'), false);
  step(g, 'act', 'switch');
  step(g, 'move', 'B');
  step(g, 'act', 'lock');
  step(g, 'act', 'switch');
  assert.equal(g.moveTo('C'), true);
});


test('companion: one actor at the exit does not finish the chapter', () => {
  const g = ready();
  step(g, 'move', 'A'); step(g, 'act', 'gate'); step(g, 'act', 'switch'); step(g, 'move', 'P');
  step(g, 'act', 'switch'); step(g, 'move', 'B'); step(g, 'act', 'lock'); step(g, 'move', 'TE');
  assert.equal(g.phase, 'idle');
  assert.equal(g.state.travellerNode, 'TE');
  assert.equal(g.state.rockNode, 'P');
});

test('companion: reset cancels a switch, a mechanism, and either walk', () => {
  const cases = [
    (g) => g.act('switch'),
    (g) => { step(g, 'move', 'A'); g.act('gate'); },
    (g) => g.moveTo('A'),
    (g) => { step(g, 'move', 'A'); step(g, 'act', 'gate'); step(g, 'act', 'switch'); g.moveTo('P'); },
  ];
  for (const prepare of cases) {
    const g = ready(); prepare(g); g.update(0.12); g.reset(); g.update(2);
    assert.deepEqual(g.snapshot(), new Game(level).snapshot());
  }
});

test('companion: reduced motion preserves the same solution', () => {
  const g = ready(); g.reducedMotion = true; solve(g);
  assert.equal(g.phase, 'won');
  assert.deepEqual([g.state.travellerNode, g.state.rockNode], ['TE', 'RE']);
});
