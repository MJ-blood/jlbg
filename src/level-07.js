import * as THREE from 'three';
import { makeWorld } from './world.js';
import { VIEWPOINT_LEVEL as definition } from './viewpoint-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene);
  const { root, box, mesh, floor, pad, marker, cylinder, materials: m } = world;
  const p = definition.positions;
  for (const [key, color] of Object.entries({ stone: '#e4eeeb', blue: '#729598', gold: '#b98259', trim: '#aec7c2', recess: '#36565c', mint: '#c7f0df' })) m[key].color.set(color);
  for (const [a, b, targets] of [['S', 'U', ['S']], ['V', 'H', ['H']], ['L', 'K', ['K']], ['K', 'N', ['K']], ['O', 'E', ['G', 'E']]]) {
    floor(p[a], p[b], targets, 0.94);
  }
  const steps = Math.ceil((p.J[1] - p.H[1]) / 0.16);
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    box([0.94, 0.23, 2 / steps + 0.015], [1, -2 + 2 * i / steps - 0.115, 2 - 2 * t], m.stone, ['H', 'K']);
  }
  // Hollow tower: thin side walls frame a real stairwell instead of a solid column.
  for (const x of [0.25, 1.75]) {
    box([0.16, 3.6, 0.30], [x, -1.55, -0.18], m.blue);
    box([0.16, 2.0, 0.30], [x, -2.35, 2.18], m.blue);
    box([0.18, 0.14, 2.68], [x, -3.25, 1], m.trim);
  }
  box([1.82, 0.13, 0.45], [1, 0.29, -0.18], m.stone);
  box([1.82, 0.09, 0.52], [1, 0.4, -0.18], m.gold);
  box([1.82, 0.13, 0.45], [1, -2.40, 2.18], m.stone);
  // Each landing has its own silhouette and a fixed copper compass.
  for (const node of ['S', 'H', 'K', 'E']) {
    pad(p[node], node, node === 'E' ? 1.7 : 1.55);
    if (node !== 'E') marker(p[node], node);
    const [x, y, z] = p[node];
    box([1.20, 2.0, 0.22], [x, y - 1.3, z - 0.4], m.blue);
    box([1.55, 0.13, 0.48], [x, y - 2.36, z - 0.4], m.trim);
    if (node !== 'E') {
      for (const dx of [-0.47, 0.47]) {
        const needle = mesh(new THREE.ConeGeometry(0.065, 0.17, 4), m.gold, [x + dx, y + 0.02, z], [node]);
        needle.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    }
  }
  // Thin opaque screens hide the depth change at each coincident pair, in both directions.
  for (const { nodes, view } of definition.seams) {
    const sign = view === 'A' ? 1 : -1;
    const depth = (node) => p[node][0] * sign + p[node][1] + p[node][2];
    const near = depth(nodes[0]) > depth(nodes[1]) ? nodes[0] : nodes[1];
    const [x, y, z] = p[near];
    const screen = new THREE.Group();
    screen.position.set(x + sign * 0.65, y, z + 0.65);
    screen.rotation.y = view === 'A' ? Math.PI / 4 : -Math.PI / 4;
    root.add(screen);
    box([1.05, 2.1, 0.20], [0, 0.9, 0], m.blue, null, screen);
    box([1.20, 0.10, 0.30], [0, 2.0, 0], m.stone, null, screen);
    box([0.08, 1.35, 0.04], [0, 0.95, 0.13], m.gold, null, screen);
    cylinder(0.10, 0.04, [x + sign * 0.65, y + 2.13, z + 0.65], m.gold);
  }
  // Long suspended ribs echo the route without adding a second walkable surface.
  for (const [a, b] of [['S', 'U'], ['L', 'K'], ['K', 'N'], ['O', 'E']]) {
    const pa = p[a], pb = p[b];
    const rib = box([0.16, 0.52, Math.hypot(pb[0] - pa[0], pb[2] - pa[2])], [(pa[0] + pb[0]) / 2, pa[1] - 0.6, (pa[2] + pb[2]) / 2], m.blue);
    rib.rotation.y = Math.atan2(pb[0] - pa[0], pb[2] - pa[2]);
  }
  const portal = world.portal(p.E, 'E');
  return { ...world, portal, update() {} };
}
