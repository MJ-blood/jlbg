import * as THREE from 'three';
import { makeWorld } from './world.js';
import { LEVELS } from './levels.js';
import { radial, stoneX } from './advanced-levels.js';

export function createAdvanced(scene, index) {
  const definition = LEVELS[index], world = makeWorld(scene);
  const { root, box, mesh, floor, pad, marker, support, cylinder, materials: m } = world;
  for (const [key, color] of Object.entries({ stone: '#e4d3db', blue: '#82758e', gold: '#d5ae68', mint: '#94c8c4', trim: '#b49baa', recess: '#4e455e' })) m[key].color.set(color);
  const p = definition.positions;
  function path(a, b, targets, parent = root, width = 1.05) {
    if (a[1] === b[1]) return [floor(a, b, targets, width, parent)];
    const low = a[1] < b[1] ? a : b, high = a[1] < b[1] ? b : a;
    const steps = Math.ceil((high[1] - low[1]) / 0.16), length = Math.hypot(high[0] - low[0], high[2] - low[2]);
    const pieces = [];
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const slab = box([width, 0.22, length / steps + 0.015],
        [low[0] + (high[0] - low[0]) * t, low[1] + (high[1] - low[1]) * i / steps - 0.11, low[2] + (high[2] - low[2]) * t], m.stone, targets, parent);
      slab.rotation.y = Math.atan2(high[0] - low[0], high[2] - low[2]); pieces.push(slab);
    }
    return pieces;
  }
  const route = (a, b, parent = root) => path(p[a], p[b], [a, b], parent);
  function label(text, position, color = '#55475f') {
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 80;
    const ctx = canvas.getContext('2d'); ctx.font = '30px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.fillText(text, 192, 52);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.position.set(...position); sprite.scale.set(2.8, 0.58, 1); root.add(sprite);
  }
  function landing(node, title, size = 1.5, height = 3.3) {
    pad(p[node], node, size); support(p[node], height, size * 0.75);
    if (title) { marker(p[node], node); label(title, [p[node][0], p[node][1] - 0.9, p[node][2]]); }
  }
  function torus(radius, y, material, parent = root) {
    const ring = mesh(new THREE.TorusGeometry(radius, 0.065, 8, 96), material, [0, y, 0], null, parent);
    ring.rotation.x = Math.PI / 2; return ring;
  }
  function gate(position, yaw, symbol) {
    const frame = new THREE.Group(); frame.position.set(...position); frame.rotation.y = yaw; root.add(frame);
    for (const x of [-0.67, 0.67]) box([0.14, 2.35, 0.16], [x, 1.175, 0], m.stone, null, frame);
    box([1.48, 0.14, 0.22], [0, 2.35, 0], m.gold, null, frame);
    for (const x of [-0.67, 0.67]) {
      box([0.24, 0.12, 0.28], [x, 0.08, 0], m.trim, null, frame);
      box([0.22, 0.10, 0.26], [x, 2.21, 0], m.white, null, frame);
    }
    box([1.57, 0.065, 0.30], [0, 2.45, 0], m.stone, null, frame);
    const bars = new THREE.Group(); frame.add(bars);
    for (const x of [-0.44, -0.22, 0, 0.22, 0.44]) box([0.04, 1.5, 0.055], [x, 0.79, 0], m.gold, null, bars);
    const signal = mesh(symbol === 'entry' ? new THREE.OctahedronGeometry(0.18) : new THREE.SphereGeometry(0.17, 16, 12), m.white.clone(), [0, 2.7, 0], null, frame);
    return { update(open) { bars.position.y = open * 1.55; signal.material.color.copy(m.white.color).lerp(m.mint.color, open); } };
  }
  function stone(y, z, xs, names) {
    const group = new THREE.Group(); group.position.set(0, y, z); root.add(group);
    box([1.48, 2.65, 1.48], [0, -1.605, 0], m.blue, null, group);
    box([1.85, 0.28, 1.85], [0, -0.14, 0], m.stone, ['P'], group);
    box([1.72, 0.16, 1.72], [0, -2.99, 0], m.mint, null, group);
    box([1.62, 0.10, 1.62], [0, -0.40, 0], m.trim, null, group);
    box([1.58, 0.12, 1.58], [0, -2.83, 0], m.gold, null, group);
    // The face and carved side panels move with the idol, below its flat boarding deck.
    box([1.12, 0.87, 0.085], [0, -1.03, 0.755], m.trim, null, group);
    box([0.97, 0.70, 0.055], [0, -1.03, 0.805], m.recess, null, group);
    for (const x of [-0.27, 0.27]) {
      const eye = mesh(new THREE.SphereGeometry(0.078, 20, 12), m.gold, [x, -0.94, 0.851], null, group);
      eye.scale.set(1, 0.78, 0.32);
      box([0.22, 0.035, 0.055], [x, -0.78, 0.83], m.stone, null, group);
    }
    box([0.18, 0.038, 0.045], [0, -1.22, 0.849], m.trim, null, group);
    world.insetArch([0.746, -2.56, 0], 0.59, 1.70, Math.PI / 2, group);
    world.insetArch([-0.746, -2.56, 0], 0.59, 1.70, -Math.PI / 2, group);
    const seal = mesh(new THREE.OctahedronGeometry(0.17), m.gold, [0, -1.91, 0.77], null, group);
    seal.scale.set(0.8, 1.2, 0.3);
    marker([0, 0, 0], 'P', group);
    const min = Math.min(...xs), max = Math.max(...xs);
    box([max - min + 2.3, 0.28, 2.1], [(min + max) / 2, y - 3.3, z], m.blue);
    for (const offset of [-0.52, 0.52]) box([max - min + 1.8, 0.035, 0.04], [(min + max) / 2, y - 3.135, z + offset], m.gold);
    const plates = xs.map((x, i) => {
      const plate = cylinder(0.64, 0.06, [x, y - 3.11, z], m.white.clone());
      const rim = mesh(new THREE.TorusGeometry(0.67, 0.023, 8, 48), m.gold, [x, y - 3.09, z]);
      rim.rotation.x = -Math.PI / 2;
      if (names[i]) label(names[i], [x, y - 3.9, z]);
      return plate;
    });
    return { group, update(x, dock) {
      group.position.x = x;
      plates.forEach((plate, i) => plate.material.color.copy(i === dock ? m.mint.color : m.white.color));
    } };
  }

  let portal, update;
  if (definition.id === 4 || definition.id === 6) {
    const inner = new THREE.Group(), outer = new THREE.Group(); root.add(inner, outer);
    // Narrow metallic hoops are supports, not walkable stone floors.
    torus(2.1, -0.8, m.gold, inner); torus(5, -0.8, m.mint, outer);
    for (const [group, r, mat] of [[inner, 2.1, m.gold], [outer, 5, m.mint]]) {
      const lower = torus(r, -1.02, mat, group); lower.scale.z = 0.65;
      for (let i = 0; i < 8; i++) cylinder(0.035, 0.22, radial(r, i / 2, -0.91), mat, null, group);
    }
    const innerTargets = definition.id === 4 ? ['H', 'M0', 'M1', 'M2', 'M3'] : ['M0', 'M1', 'M2', 'M3'];
    floor([definition.id === 4 ? 0.8 : 2.45, 0, 0], [3.2, 0, 0], innerTargets, 1.0, inner);
    floor([3.2, 0, 0], [6.6, 0, 0], ['M0', 'M1', 'M2', 'M3', 'B0', 'B1', 'B3', definition.id === 4 ? 'W' : 'B2'], 1.0, outer);
    for (const [group, r, mat] of [[inner, 2.1, m.gold], [outer, 5, m.mint]]) {
      for (let i = 0; i < 24; i++) {
        const tick = box([0.1, 0.18, 0.18], radial(r, i / 6, -0.78), mat, null, group);
        tick.rotation.y = i * Math.PI / 12;
      }
      for (const x of [r - 0.35, r + 0.15]) {
        const arrow = mesh(new THREE.ConeGeometry(0.10, 0.25, 3), mat, [x, 0.025, 0.28], null, group);
        arrow.rotation.z = -Math.PI / 2;
      }
    }
    landing('H', '主轮', 1.6, 3.4);
    for (let i = 0; i < 4; i++) {
      landing('M' + i, null, 1.25, 2.8);
      const position = radial(3.2, i, -2.1);
      cylinder(0.19, 0.07, position, i % 2 ? m.mint : m.gold);
    }
    for (const node of ['B0', 'B1', 'B3']) landing(node, null, 1.5, 3.5);
    landing('E', null, 1.8, 4.5); route('B1', 'E');
    portal = world.portal(p.E, 'E');
    // Paired wheels and separate colors make the coupled transmission visible.
    const wheel = world.wheel([-0.55, 0.58, 0.55], 'rotate');
    const other = world.wheel([-0.55, 0.15, 0.55], 'rotate'); other.material = m.mint;
    if (definition.id === 4) {
      route('S', 'B0'); landing('S', '入口', 1.5, 3.5); landing('W', '校准阁', 1.8, 3.6);
      for (const [a, b] of [['W', 'D'], ['D', 'F'], ['F', 'V']]) route(a, b);
      for (const node of ['D', 'F', 'V']) landing(node, null, 1.2, 1.3);
      path(p.V, p.Q, ['V']);
      // Cover both depth positions: the pier must be in front of the nearer I endpoint.
      world.pier(definition.position('I', { inner: 0 }));
      const calibration = world.wheel([-7.15, 0.6, 0.55], 'calibrate');
      label('下层回廊', [-3.4, -4.4, -5.4]);
      update = (g) => {
        inner.rotation.y = g.visuals.innerAngle; outer.rotation.y = g.visuals.outerAngle;
        wheel.rotation.z = g.visuals.outerAngle; other.rotation.z = g.visuals.innerAngle; calibration.rotation.z = g.visuals.innerAngle;
      };
    } else {
      route('S', 'H'); landing('S', null, 1.5, 3.4); landing('W', '观星台', 1.8, 3.5);
      landing('B2', null, 1.5, 3.5);
      // Fixed landing lips stop at the edges of the moving stone's head.
      floor([-5, 0, -3.6], [-5, 0, -2.5], ['W']);
      const idol = stone(0, -1.6, [0, -5], ['接驳位', '锁定压板']);
      const latch = box([0.34, 0.6, 0.34], [-3.2, -0.55, -0.7], m.gold);
      box([0.53, 0.11, 0.52], [-3.2, -0.91, -0.7], m.trim);
      for (const x of [-3.44, -2.96]) box([0.09, 0.54, 0.43], [x, -0.70, -0.7], m.stone);
      const signal = mesh(new THREE.OctahedronGeometry(0.18), m.white.clone(), [-5.7, 0.55, -3.6]);
      const remote = world.wheel([-5.55, 0.55, -3.2], 'rotate');
      update = (g) => {
        inner.rotation.y = g.visuals.innerAngle; outer.rotation.y = g.visuals.outerAngle;
        wheel.rotation.z = g.visuals.outerAngle; other.rotation.z = g.visuals.innerAngle; remote.rotation.z = g.visuals.outerAngle;
        idol.update(g.visuals.stoneX, g.state.dock); latch.position.y = -0.55 + g.visuals.locked * 0.4;
        signal.material.color.copy(m.white.color).lerp(m.mint.color, g.visuals.locked);
      };
    }
  } else {
    for (const [a, b] of [['S', 'A'], ['A', 'B'], ['B', 'T'], ['T', 'C'], ['C', 'J'], ['W', 'K'], ['K', 'Z'], ['Z', 'E']]) route(a, b);
    for (const [node, title] of [['S', '入口'], ['C', '回廊'], ['J', '接驳台'], ['W', '折梯阁'], ['K', null], ['E', null]]) landing(node, title, 1.55, node === 'S' ? 1.5 : 3.5);
    floor([2, 3, 2], [2, 3, 0.9], ['J']); floor([-2, 3, -2], [-2, 3, -0.9], ['W']);
    const idol = stone(3, 0, stoneX, ['入口压板 ◇', '接驳位', '接驳位', '出口压板 ○']);
    const entry = gate([5, 0, 4], Math.PI / 2, 'entry'), exit = gate([-6, 5, -5], 0, 'exit');
    const folded = new THREE.Group(); root.add(folded);
    for (const [a, b] of [['C', 'V'], ['V', 'U'], ['U', 'L'], ['L', 'W']]) route(a, b, folded);
    for (const node of ['U', 'V', 'L']) pad(p[node], node, 1.1, folded);
    const foldPieces = folded.children.map((piece) => ({ piece, position: piece.position.clone() }));
    // No hidden collider may intercept an unfolded landing or a different floor.
    const lever = world.wheel([-2.55, 3.6, -2.4], 'unfold');
    portal = world.portal(p.E, 'E');
    const fixedColliders = world.colliders.filter((object) => object.parent !== folded);
    update = (g) => {
      idol.update(g.visuals.stoneX, g.state.dock);
      entry.update(g.visuals.entryOpen); exit.update(g.visuals.exitOpen);
      folded.visible = g.visuals.unfolded > 0;
      for (const { piece, position } of foldPieces) {
        piece.position.copy(position); piece.position.y -= (1 - g.visuals.unfolded) * 2.4;
      }
      world.colliders.length = 0;
      world.colliders.push(...fixedColliders, ...(g.state.unfolded ? foldPieces.map((x) => x.piece) : []));
      lever.rotation.z = g.visuals.unfolded * Math.PI / 2;
    };
  }
  return { ...world, portal, update };
}
