import * as THREE from 'three';
import { makeWorld } from './world.js';
import { FOLD_MIRROR_LEVEL as definition } from './fold-mirror-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene);
  const { root, box, mesh, pad, support } = world;
  const groups = {}, colliders = {}, folds = {}, foldSurfaces = {};
  let portal;

  for (const realm of ['real', 'mirror']) {
    const group = new THREE.Group(); root.add(group); groups[realm] = group;
    const begin = world.colliders.length;
    const colors = realm === 'real'
      ? { stone: '#e9dfdd', wall: '#786a83', trim: '#b99aa4', gold: '#c59b58', dark: '#493e58' }
      : { stone: '#ded9eb', wall: '#665f83', trim: '#90a8ba', gold: '#d0b675', dark: '#393956' };
    const m = Object.fromEntries(Object.entries(colors).map(([key, color]) => [key,
      new THREE.MeshStandardMaterial({ color, roughness: key === 'gold' ? 0.48 : 0.9, metalness: key === 'gold' ? 0.28 : 0 })]));
    const state = { realm, foldOpen: false };
    const p = (node) => definition.position(node, state);
    const localBox = (size, position, material = m.stone, targets = null, parent = group) => box(size, position, material, targets, parent);

    function landing(node, width = 1.6, height = 3) {
      const position = p(node);
      const first = root.children.length;
      pad(position, node, width); support(position, height, width * 0.68);
      for (const object of root.children.slice(first)) group.add(object);
    }
    function road(a, b, targets, width = 1.05) {
      const x = p(a), y = p(b), length = Math.hypot(y[0] - x[0], y[2] - x[2]);
      const slab = localBox([width, 0.26, length + 0.04], [(x[0] + y[0]) / 2, x[1] - 0.13, (x[2] + y[2]) / 2], m.stone, targets);
      slab.rotation.y = Math.atan2(y[0] - x[0], y[2] - x[2]);
      const edge = localBox([width * 0.74, 0.07, length], [(x[0] + y[0]) / 2, x[1] - 0.31, (x[2] + y[2]) / 2], m.trim);
      edge.rotation.y = slab.rotation.y;
    }
    function mirrorGate(node, numeral) {
      const [x, y, z] = p(node), frame = new THREE.Group(); frame.position.set(x, y, z); group.add(frame);
      for (const dx of [-0.58, 0.58]) localBox([0.18, 1.9, 0.25], [dx, 0.95, 0], m.stone, [node], frame);
      localBox([1.36, 0.18, 0.28], [0, 1.88, 0], m.gold, [node], frame);
      const glass = mesh(new THREE.PlaneGeometry(0.93, 1.55), new THREE.MeshBasicMaterial({ color: realm === 'real' ? '#bdd1da' : '#aeb8dc', transparent: true, opacity: 0.62, side: THREE.DoubleSide }), [0, 0.87, 0.02], [node], frame);
      const mark = mesh(new THREE.RingGeometry(0.12, 0.18, numeral === 'I' ? 3 : 4), m.gold, [0, 2.13, 0.04], [node], frame);
      glass.renderOrder = 1; mark.rotation.z = Math.PI / 4;
    }

    if (realm === 'real') {
      for (const node of ['S', 'M0', 'M1', 'E']) landing(node, node === 'E' ? 1.82 : 1.58, node === 'M1' ? 4.1 : 3.2);
      road('S', 'M0', ['S', 'M0']);
      mirrorGate('M0', 'I'); mirrorGate('M1', 'II');
      const fold = new THREE.Group(); fold.position.set(...p('M1')); group.add(fold); folds.real = fold;
      const slab = localBox([3.05, 0.25, 1.08], [1.5, -0.13, 0], m.stone, ['M1', 'E'], fold);
      localBox([2.9, 0.07, 0.84], [1.5, -0.31, 0], m.gold, null, fold);
      for (let i = 0; i < 5; i++) localBox([0.035, 0.025, 0.78], [0.45 + i * 0.53, 0.02, 0], m.trim, null, fold);
      foldSurfaces.real = [slab];
      const first = root.children.length;
      portal = world.portal(p('E'), 'E');
      for (const object of root.children.slice(first)) group.add(object);
    } else {
      for (const node of ['M0', 'A', 'H', 'M1']) landing(node, 1.58, node === 'H' || node === 'M1' ? 4 : 2.9);
      road('M0', 'A', ['M0', 'A']); road('H', 'M1', ['H', 'M1']);
      mirrorGate('M0', 'I'); mirrorGate('M1', 'II');
      const fold = new THREE.Group(); fold.position.set(...p('A')); group.add(fold); folds.mirror = fold;
      const a = p('A'), h = p('H'), rise = h[1] - a[1], dx = h[0] - a[0], dz = h[2] - a[2];
      const count = Math.ceil(rise / 0.16), length = Math.hypot(dx, dz), surfaces = [];
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const tread = localBox([1.06, 0.23, length / count + 0.02], [dx * t, rise * i / count - 0.115, dz * t], m.stone, ['A', 'H'], fold);
        tread.rotation.y = Math.atan2(dx, dz); surfaces.push(tread);
      }
      localBox([0.82, 0.08, length + 0.1], [dx / 2, rise / 2 - 0.32, dz / 2], m.gold, null, fold).rotation.x = -Math.atan2(rise, length);
      foldSurfaces.mirror = surfaces;
      localBox([0.16, 0.62, 0.16], [a[0] - 0.57, a[1] + 0.31, a[2] + 0.43], m.gold, ['fold']);
      localBox([0.46, 0.10, 0.14], [a[0] - 0.57, a[1] + 0.63, a[2] + 0.43], m.gold, ['fold']);
    }
    colliders[realm] = world.colliders.slice(begin).filter((object) => object.userData.targets);
  }

  groups.mirror.visible = false;
  const level = {
    ...world, portal, colliders: colliders.real,
    update(game) {
      const realm = game.visuals.realmMix >= 0.5 ? 'mirror' : 'real';
      groups.real.visible = realm === 'real'; groups.mirror.visible = realm === 'mirror';
      level.colliders = colliders[realm];
      folds.real.rotation.z = Math.PI / 2 - game.visuals.foldAngle;
      folds.mirror.rotation.z = game.visuals.foldAngle;
      for (const surface of foldSurfaces.real) surface.userData.targets = game.state.foldOpen ? null : ['M1', 'E'];
      for (const surface of foldSurfaces.mirror) surface.userData.targets = game.state.foldOpen ? ['A', 'H'] : null;
    },
  };
  return level;
}
