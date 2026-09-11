import * as THREE from 'three';
import { makeWorld } from './world.js';
import { FOLD_LEVEL as definition } from './fold-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene), { root, box, cylinder, floor, pad, marker, support, materials: m } = world;
  const p = definition.positions;
  for (const [key, color] of Object.entries({ stone: '#f1ead8', blue: '#8c7d82', gold: '#c19a55', mint: '#bdd3c5', trim: '#c8b18d', recess: '#633f49' })) m[key].color.set(color);
  const red = new THREE.MeshStandardMaterial({ color: '#b45d58', roughness: 0.82 });
  const ink = new THREE.MeshStandardMaterial({ color: '#574253', roughness: 0.9 });
  function landing(node, size = 1.5, height = 3) {
    pad(p[node], node, size); support(p[node], height, size * 0.72);
  }
  landing('S', 1.55, 2.4); landing('H', 1.7, 4); landing('P', 1.7, 2.8); landing('E', 1.8, 3.2);
  marker(p.S, 'S'); marker(p.H, 'H'); marker(p.P, 'P');

  const lowerPieces = [];
  function steppedPath(a, b, targets) {
    const start = p[a], end = p[b];
    if (start[1] === end[1]) { lowerPieces.push(floor(start, end, targets, 1.02)); return; }
    const low = start[1] < end[1] ? start : end, high = start[1] < end[1] ? end : start;
    const count = Math.ceil((high[1] - low[1]) / 0.16), length = Math.hypot(high[0] - low[0], high[2] - low[2]);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const tread = box([1.02, 0.22, length / count + 0.015],
        [low[0] + (high[0] - low[0]) * t, low[1] + (high[1] - low[1]) * i / count - 0.11, low[2] + (high[2] - low[2]) * t], m.stone, targets);
      tread.rotation.y = Math.atan2(high[0] - low[0], high[2] - low[2]); lowerPieces.push(tread);
    }
  }
  steppedPath('H', 'D', ['H', 'P']); steppedPath('D', 'P', ['H', 'P']);
  const dPad = box([1.08, 0.22, 1.08], [p.D[0], p.D[1] - 0.11, p.D[2]], m.stone, ['H', 'P']); lowerPieces.push(dPad);

  function foldedPage(hinge, length, direction) {
    const group = new THREE.Group(); group.position.set(...hinge); root.add(group);
    const center = direction * length / 2;
    const slab = box([length, 0.22, 1.08], [center, -0.11, 0], m.stone, null, group);
    const underside = box([length - 0.14, 0.045, 0.92], [center, -0.245, 0], red, null, group);
    for (let i = 0; i < 5; i++) {
      const strip = box([0.035, 0.025, 0.78], [direction * (0.45 + i * (length - 0.9) / 4), 0.015, 0], m.gold, null, group);
      strip.rotation.y = i % 2 ? 0.16 : -0.16;
    }
    for (const z of [-0.62, 0, 0.62]) {
      const axle = cylinder(0.14, 0.48, [hinge[0], hinge[1] - 0.03, hinge[2] + z], m.gold);
      axle.rotation.x = Math.PI / 2;
    }
    const arc = new THREE.EllipseCurve(0, 0, 0.55, 0.55, direction < 0 ? Math.PI / 2 : -Math.PI / 2, 0, direction > 0, 0);
    const points = arc.getPoints(18).map(({ x, y }) => new THREE.Vector3(hinge[0] + x * direction, hinge[1] + y, hinge[2] + 0.72));
    const preview = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#c19a55', transparent: true, opacity: 0.55 }));
    root.add(preview);
    return { group, slab, underside };
  }
  const left = foldedPage(p.H, 3.5, -1);
  const right = foldedPage(p.P, 3.5, 1);
  // Hinged rooflets make the two pages read as pieces of a city, rather than plain bridges.
  for (const [page, direction] of [[left, -1], [right, 1]]) {
    box([0.18, 0.58, 0.18], [direction * 1.05, 0.18, -0.34], ink, null, page.group);
    const roof = box([0.72, 0.10, 0.72], [direction * 1.05, 0.50, -0.34], red, null, page.group);
    roof.rotation.y = Math.PI / 4;
  }
  const portal = world.portal(p.E, 'E');
  const level = { ...world, portal,
    update(game) {
      left.group.rotation.z = game.visuals.leftAngle;
      right.group.rotation.z = game.visuals.rightAngle;
      left.slab.userData.targets = game.state.leftOpen ? ['S', 'H'] : null;
      left.underside.userData.targets = null;
      right.slab.userData.targets = game.state.rightOpen ? ['P', 'E'] : null;
      right.underside.userData.targets = null;
      for (const piece of lowerPieces) piece.userData.targets = game.state.leftOpen ? null : ['H', 'P'];
    },
  };
  return level;
}
