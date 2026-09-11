import * as THREE from 'three';
import { makeWorld } from './world.js';
import { LEVELS, stairHeight } from './levels.js';

export function createLevel(scene) {
  const world = makeWorld(scene);
  const { root, box, floor, pad, marker, support, materials: m } = world;
  const p = LEVELS[1].positions;
  floor([0, 0, -6.7], [0, 0, -1], ['S2', 'B'], 1.5);
  marker(p.B, 'B');
  support([0, 0, -5], 3.5, 1.3);
  for (const z of [-5, -3]) box([1.46, 0.008, 0.025], [0, 0.005, z], m.trim, ['S2', 'B']);

  const tower = new THREE.Group();
  root.add(tower);
  pad(p.P, 'P', 2, tower);
  marker(p.P, 'P', tower);
  box([1.6, 1.72, 1.6], [0, -1.14, 0], m.blue, null, tower);
  box([1.76, 0.12, 1.76], [0, -1.98, 0], m.gold, null, tower);
  world.insetArch([0, -1.87, 0.806], 0.66, 1.16, 0, tower);
  world.insetArch([0.806, -1.87, 0], 0.66, 1.16, Math.PI / 2, tower);
  box([1.73, 0.10, 1.73], [0, -0.40, 0], m.trim, null, tower);
  for (const x of [-1.14, 1.14]) {
    box([0.24, 0.34, 0.25], [x, -0.48, 0.85], m.trim, null, tower);
    box([0.28, 0.055, 0.29], [x, -0.3, 0.85], m.gold, null, tower);
  }
  // The lower ledge is a separate floor, two units below the boarding deck.
  box([1.1, 0.28, 1.8], [0, -2.14, 1.5], m.stone, ['V'], tower);
  floor([-1, -2, 2], [0.45, -2, 2], ['V'], 1.1, tower);
  box([0.18, 1.7, 0.18], [-0.55, -1.1, 1.15], m.trim, null, tower);
  box([0.18, 1.7, 0.18], [0.55, -1.1, 1.15], m.trim, null, tower);
  for (const x of [-1.14, 1.14]) {
    box([0.13, 7.2, 0.13], [x, 0.4, 0.85], m.gold);
    box([0.26, 0.16, 0.26], [x, 4.07, 0.85], m.stone);
  }
  box([2.7, 0.25, 2.7], [0, -3.32, 0], m.blue);
  box([2.85, 0.12, 2.85], [0, -3.50, 0], m.trim);
  floor([1, 4, 0], p.T, ['U', 'T']);
  pad(p.U, 'U'); pad(p.T, 'T');
  support(p.T, 5.4);
  for (let i = 0; i < 24; i++) {
    const z = (i + 0.5) / 4;
    const top = stairHeight(z);
    box([1.1, 0.3, 0.25], [6, top - 0.15, z], m.stone, ['T', 'C']);
    box([1.09, 0.01, 0.015], [6, top + 0.005, i / 4], m.trim, ['T', 'C']);
  }
  pad(p.C, 'C'); marker(p.C, 'C'); support(p.C, 4.5);
  floor(p.C, p.N, ['C']);
  world.pier(p.N);
  floor([-1, -2, 2], [-4.7, -2, 2], ['V', 'E2']);
  box([0.02, 0.009, 1.06], [-2, -1.994, 2], m.trim, ['V']);
  pad(p.E2, 'E2', 1.8); support(p.E2, 2.8, 1.4);
  const portal = world.portal(p.E2, 'E2');
  const handlePosition = new THREE.Vector3(5.37, 2.6, 6.55);
  const wheel = world.wheel(handlePosition.toArray(), 'lift');
  return { ...world, tower, portal, handlePosition,
    update(game) { tower.position.y = game.visuals.liftOffset; wheel.rotation.z = game.visuals.liftOffset / 2; } };
}
