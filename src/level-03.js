import * as THREE from 'three';
import { makeWorld } from './world.js';
import { LEVELS } from './levels.js';

export function createLevel(scene) {
  const world = makeWorld(scene);
  const { root, mesh, box, cylinder, floor, pad, marker, support, materials: m } = world;
  const p = LEVELS[2].positions;
  floor([11, 0, -2.6], p.C, ['S3', 'C'], 1.5);
  floor(p.C, [4, 0, 0], ['C', 'X', 'Y', 'A']);
  pad(p.C, 'C', 1.8); marker(p.C, 'C'); support(p.C, 3.2, 1.4);
  support(p.A, 3.2);
  for (const x of [6, 7, 9, 10]) box([0.02, 0.01, 1.06], [x, 0.005, 0], m.trim, ['X', 'Y', 'A', 'C']);

  cylinder(1.2, 0.3, [0, -0.15, 0], m.stone, ['H']);
  cylinder(0.88, 3.6, [0, -2.1, 0], m.blue);
  cylinder(1.02, 0.14, [0, -3.92, 0], m.stone);
  cylinder(0.91, 0.08, [0, -3.65, 0], m.gold);
  cylinder(1.08, 0.12, [0, -0.38, 0], m.trim);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    cylinder(0.023, 2.8, [Math.sin(angle) * 0.89, -2.05, Math.cos(angle) * 0.89], m.trim);
  }
  marker(p.H, 'H');
  const bridge = new THREE.Group(); root.add(bridge);
  floor([1.1, 0, 0], [4, 0, 0], ['R1'], 1.1, bridge);
  for (const x of [1.6, 2.5, 3.4]) box([0.02, 0.01, 1.06], [x, 0.005, 0], m.trim, ['R1'], bridge);
  floor(p.T, [2, 2, -8.7], ['Z', 'K', 'E3']);
  pad(p.E3, 'E3', 1.8); support(p.E3, 3.7, 1.4);
  support([2, 2, -3], 3.7);
  world.pier(p.T);
  const portal = world.portal(p.E3, 'E3');

  function gate(position, yaw, symbol) {
    const group = new THREE.Group(); group.position.set(...position); group.rotation.y = yaw; root.add(group);
    for (const x of [-0.68, 0.68]) box([0.15, 2.8, 0.18], [x, 1.4, 0], m.stone, null, group);
    box([1.54, 0.17, 0.23], [0, 2.78, 0], m.gold, null, group);
    for (const x of [-0.68, 0.68]) {
      box([0.25, 0.12, 0.30], [x, 0.08, 0], m.trim, null, group);
      box([0.23, 0.09, 0.28], [x, 2.63, 0], m.white, null, group);
    }
    box([1.62, 0.07, 0.31], [0, 2.9, 0], m.stone, null, group);
    const bars = new THREE.Group(); group.add(bars);
    for (const x of [-0.45, -0.225, 0, 0.225, 0.45]) box([0.045, 1.28, 0.065], [x, 0.67, 0], m.gold, null, bars);
    box([1.08, 0.075, 0.07], [0, 0.12, 0], m.gold, null, bars);
    const signal = mesh(symbol === 'leaf' ? new THREE.OctahedronGeometry(0.19) : new THREE.SphereGeometry(0.16, 16, 12), m.white.clone(), [0, 3.12, 0], null, group);
    if (symbol === 'leaf') signal.scale.set(0.7, 1.3, 0.7);
    return { bars, signal };
  }
  const entryGate = gate([8, 0, 0], Math.PI / 2, 'leaf');
  const exitGate = gate([2, 2, -5], 0, 'sun');

  const track = new THREE.Group(); track.position.set(1, 0, 3); root.add(track);
  box([4.2, 0.3, 1.75], [0, -0.15, 0], m.stone, ['lamp'], track);
  box([3.8, 2.8, 1.4], [0, -1.7, 0], m.blue, ['lamp'], track);
  box([4.1, 0.15, 1.7], [0, -3.15, 0], m.stone, ['lamp'], track);
  box([4.22, 0.10, 1.82], [0, -3.28, 0], m.trim, ['lamp'], track);
  for (const x of [-1.25, 0, 1.25]) world.insetArch([x, -2.85, 0.706], 0.56, 1.95, 0, track);
  for (const z of [-0.2, 0.2]) box([2.4, 0.04, 0.045], [0, 0.025, z], m.gold, ['lamp'], track);
  const plates = [];
  for (const x of [-1.2, 1.2]) {
    const plate = cylinder(0.48, 0.09, [x, 0.055, 0], m.white.clone(), ['lamp'], track);
    plates.push(plate);
    const ring = mesh(new THREE.TorusGeometry(0.43, 0.022, 8, 40), m.gold, [x, 0.109, 0], ['lamp'], track);
    ring.rotation.x = Math.PI / 2;
    const symbol = mesh(x < 0 ? new THREE.OctahedronGeometry(0.19) : new THREE.SphereGeometry(0.16, 16, 12), m.gold, [x, 0.15, 0.56], ['lamp'], track);
    if (x < 0) symbol.scale.set(0.7, 1.3, 0.7);
  }
  const lamp = new THREE.Group(); track.add(lamp);
  cylinder(0.22, 0.12, [0, 0.15, 0], m.gold, ['lamp'], lamp);
  cylinder(0.08, 0.55, [0, 0.45, 0], m.gold, ['lamp'], lamp);
  mesh(new THREE.SphereGeometry(0.26, 20, 16), new THREE.MeshBasicMaterial({ color: '#ecf5d8' }), [0, 0.89, 0], ['lamp'], lamp);
  for (const x of [-0.20, 0.20]) for (const z of [-0.20, 0.20]) box([0.033, 0.5, 0.033], [x, 0.87, z], m.gold, ['lamp'], lamp);
  cylinder(0.32, 0.055, [0, 1.11, 0], m.gold, ['lamp'], lamp);
  mesh(new THREE.ConeGeometry(0.34, 0.23, 8), m.gold, [0, 1.25, 0], ['lamp'], lamp);
  mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 24), m.gold, [0, 1.44, 0], ['lamp'], lamp);
  cylinder(0.26, 0.08, [0, 0.62, 0], m.gold, ['lamp'], lamp);

  const handlePosition = new THREE.Vector3(-0.63, 0.6, 0.55);
  const wheel = world.wheel(handlePosition.toArray(), 'rotate');
  const auxPosition = new THREE.Vector3(1, 1.8, 3);
  return { ...world, bridge, portal, handlePosition, auxPosition,
    update(game) {
      bridge.rotation.y = game.bridgeAngle;
      wheel.rotation.z = game.bridgeAngle;
      lamp.position.x = game.visuals.lampOffset;
      const right = (game.visuals.lampOffset + 1.2) / 2.4;
      entryGate.bars.position.y = (1 - right) * 1.45;
      exitGate.bars.position.y = right * 1.45;
      entryGate.signal.material.color.copy(m.white.color).lerp(m.mint.color, 1 - right);
      exitGate.signal.material.color.copy(m.white.color).lerp(m.mint.color, right);
      plates[0].material.color.copy(m.white.color).lerp(m.mint.color, 1 - right);
      plates[1].material.color.copy(m.white.color).lerp(m.mint.color, right);
      plates[0].position.y = 0.055 - (1 - right) * 0.035;
      plates[1].position.y = 0.055 - right * 0.035;
    } };
}
