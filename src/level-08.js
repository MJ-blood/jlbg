import * as THREE from 'three';
import { makeWorld } from './world.js';
import { MIRROR_LEVEL as definition } from './mirror-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene), { root, box, mesh } = world;
  const groups = {}, colliders = {}, sliders = {}, decks = {};
  let portal;
  for (const realm of ['real', 'mirror']) {
    const group = new THREE.Group(); root.add(group); groups[realm] = group;
    const begin = world.colliders.length, sign = realm === 'mirror' ? -1 : 1;
    const m = Object.fromEntries(Object.entries(realm === 'real'
      ? { stone: '#e6e5cd', trim: '#a6c4b8', wall: '#699b91', gold: '#bf985a', dark: '#31566c', water: '#9fc8bd' }
      : { stone: '#d2e5ec', trim: '#8bb2c8', wall: '#617f9e', gold: '#bdc9eb', dark: '#263e6b', water: '#819fbb' })
      .map(([name, color]) => [name, new THREE.MeshStandardMaterial({ color, roughness: name === 'water' ? 0.3 : 0.9 })]));
    const p = (node) => definition.position(node, { realm });
    function slab(size, position, material = m.stone, targets = null, parent = group) {
      return box(size, [position[0], position[1], position[2] * sign], material, targets, parent);
    }
    function path(a, b, targets, width = 1.05) {
      const start = definition.positions[a], end = definition.positions[b];
      const low = start[1] < end[1] ? start : end, high = start[1] < end[1] ? end : start;
      const rise = high[1] - low[1], count = rise ? Math.ceil(rise / 0.16) : 1;
      const length = Math.hypot(high[0] - low[0], high[2] - low[2]);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const tread = slab([width, 0.25, length / count + 0.015],
          [low[0] + (high[0] - low[0]) * t, low[1] + rise * i / count - 0.125, low[2] + (high[2] - low[2]) * t], m.stone, targets);
        tread.rotation.y = Math.atan2(high[0] - low[0], (high[2] - low[2]) * sign);
      }
    }
    function landing(node, width = 1.6) {
      const [x, y, z] = definition.positions[node];
      slab([width, 0.28, width], [x, y - 0.14, z], m.stone, [node]);
      slab([width - 0.16, 0.16, width - 0.16], [x, y - 0.36, z], m.trim);
      if (node === 'C') {
        for (const dx of [-0.7, 0.7]) slab([0.16, y + 1.25, 0.16], [x + dx, (y - 1.25) / 2 - 0.45, z + 0.55], m.wall);
      } else slab([width * 0.65, y + 1.25, width * 0.65], [x, (y - 1.25) / 2 - 0.45, z], m.wall);
      slab([width + 0.2, 0.14, width + 0.2], [x, -1.8, z], m.trim);
    }
    function gate(node, numeral) {
      const [x, y, z] = p(node);
      for (const dx of [-0.59, 0.59]) {
        box([0.17, 1.9, 0.24], [x + dx, y + 0.95, z - 0.4], m.stone, [node], group);
        box([0.27, 0.13, 0.38], [x + dx, y + 0.09, z - 0.4], m.gold, [node], group);
      }
      box([1.42, 0.16, 0.32], [x, y + 1.92, z - 0.4], m.gold, [node], group);
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = realm === 'real' ? '#29485e' : '#1c3056'; ctx.fillRect(0, 0, 192, 256);
      ctx.strokeStyle = '#afd6d9'; ctx.lineWidth = 3; ctx.strokeRect(13, 13, 166, 230);
      ctx.fillStyle = '#e7eddf'; ctx.font = '38px serif'; ctx.textAlign = 'center'; ctx.fillText(numeral, 96, 67);
      ctx.lineWidth = 5; ctx.beginPath();
      if (node === 'M0') {
        for (let i = 0; i < 6; i++) {
          if (realm === 'mirror' && i === 3) continue;
          ctx.moveTo(30 + i * 21, 203 - i * 18); ctx.lineTo(51 + i * 21, 203 - i * 18); ctx.lineTo(51 + i * 21, 185 - i * 18);
        }
      } else { ctx.moveTo(33, 180); ctx.lineTo(159, 180); ctx.moveTo(96, 180); ctx.lineTo(96, 115); }
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      mesh(new THREE.PlaneGeometry(1.05, 1.72), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), [x, y + 0.94, z - 0.26], [node], group);
      const symbol = mesh(realm === 'real' ? new THREE.RingGeometry(0.18, 0.23, 32) : new THREE.RingGeometry(0.18, 0.25, 4),
        m.gold, [x, y + 0.016, z + 0.28], [node], group);
      symbol.rotation.x = -Math.PI / 2;
    }
    slab([10.5, 0.2, 10.3], [-0.8, -1.95, 0], m.trim);
    slab([10.2, 0.08, 10.0], [-0.8, -1.80, 0], m.water);
    for (const [x, z] of [[-4, 3.5], [3, -3], [-0.5, -2]]) {
      const ripple = mesh(new THREE.RingGeometry(0.5, 0.51, 64), m.trim, [x, -1.75, z], null, group);
      ripple.rotation.x = -Math.PI / 2;
    }
    for (const node of realm === 'real' ? ['S', 'M0', 'M1', 'R', 'Z', 'E'] : ['M0', 'C', 'M1']) landing(node, node === 'E' ? 1.8 : 1.6);
    gate('M0', 'I'); gate('M1', 'II');
    if (realm === 'real') {
      path('S', 'M0', ['S', 'M0']); path('M1', 'R', ['M1', 'R']); path('Z', 'E', ['Z', 'E']);
      // The broken real stair is deliberately a visible dead end, not an invisible walk edge.
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 19, a = definition.positions.M0, b = definition.positions.T;
        const tread = slab([1.05, 0.25, Math.hypot(b[0] - a[0], b[2] - a[2]) / 19 + 0.015],
          [a[0] + (b[0] - a[0]) * t, i * 3 / 19 - 0.125, a[2] + (b[2] - a[2]) * t], m.stone, ['M0']);
        tread.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
      }
      const first = root.children.length;
      portal = world.portal(p('E'), 'E');
      for (const object of root.children.slice(first)) group.add(object);
    } else {
      path('M0', 'T', ['M0', 'C']); path('T', 'W', ['C']); path('W', 'V', ['C']); path('V', 'C', ['C']); path('C', 'M1', ['C', 'M1']);
      for (const node of ['T', 'W', 'V']) {
        const pos = definition.positions[node]; slab([1.10, 0.25, 1.10], [pos[0], pos[1] - 0.125, pos[2]], m.stone, ['C']);
      }
      const pos = p('C');
      const ring = mesh(new THREE.RingGeometry(0.27, 0.34, 40), m.gold, [pos[0], pos[1] + 0.012, pos[2]], ['C'], group); ring.rotation.x = -Math.PI / 2;
      box([0.12, 0.5, 0.12], [pos[0] - 0.57, pos[1] + 0.25, pos[2] + 0.45], m.gold, ['slide'], group);
      box([0.34, 0.08, 0.10], [pos[0] - 0.57, pos[1] + 0.51, pos[2] + 0.45], m.gold, ['slide'], group);
    }
    const slider = new THREE.Group(); group.add(slider); sliders[realm] = slider;
    box([0.18, 2.0, 2.0], [0, 4, 0], m.wall, null, slider);
    decks[realm] = box([2.0, 0.25, 2.0], [1, 4.875, 0], m.stone, null, slider);
    for (const z of [-0.9, 0.9]) box([0.06, 1.5, 0.05], [0.10, 4, z], m.gold, null, slider);
    box([2.15, 0.09, 2.10], [1, 4.69, 0], m.trim, null, slider);
    // Rails make the shared direction and two docking positions legible.
    slab([0.28, 0.12, 5.2], [0, 2.94, -1.5], m.gold);
    for (const z of [0, -3]) slab([0.58, 0.12, 0.13], [0, 2.87, z], m.trim);
    colliders[realm] = world.colliders.slice(begin);
  }
  groups.mirror.visible = false;
  const level = { ...world, portal, colliders: colliders.real,
    update(game) {
      const realm = game.visuals.realmMix >= 0.5 ? 'mirror' : 'real';
      groups.real.visible = realm === 'real'; groups.mirror.visible = realm === 'mirror';
      level.colliders = colliders[realm];
      sliders.real.position.z = game.visuals.slideOffset;
      sliders.mirror.position.z = -game.visuals.slideOffset;
      decks.real.userData.targets = game.state.shifted ? ['R', 'Z'] : null;
    },
  };
  return level;
}
