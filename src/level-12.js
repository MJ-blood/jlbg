import * as THREE from 'three';
import { makeWorld } from './world.js';
import { FINALE_LEVEL as definition } from './finale-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene), { root, box, cylinder, mesh, materials: m } = world;
  const p = definition.positions;
  for (const [key, color] of Object.entries({ stone: '#f1e4cf', blue: '#678da0', gold: '#c79345', mint: '#9dc9c8', trim: '#c9a989', recess: '#365d6b' })) m[key].color.set(color);
  const coral = new THREE.MeshStandardMaterial({ color: '#cf8573', roughness: 0.85, transparent: true });
  const navy = new THREE.MeshStandardMaterial({ color: '#385866', roughness: 0.94, transparent: true });
  const light = new THREE.MeshBasicMaterial({ color: '#f4d88e', transparent: true, opacity: 0.82, depthWrite: false });

  function island(node, radius = 0.86, depth = 1.2) {
    const [x, y, z] = p[node];
    mesh(new THREE.CylinderGeometry(radius, radius * 0.72, depth, 8), m.blue, [x, y - depth / 2 - 0.14, z]);
    cylinder(radius + 0.08, 0.22, [x, y - 0.11, z], m.stone, [node]);
    cylinder(radius * 0.78, 0.08, [x, y - 0.26, z], m.gold);
  }
  function road(a, b, targets, width = 0.9, parent = root, local = false) {
    const start = local ? [0, 0, 0] : p[a], end = local ? p[b].map((v, i) => v - p[a][i]) : p[b];
    const rise = end[1] - start[1], length = Math.hypot(end[0] - start[0], end[2] - start[2]);
    if (!rise) {
      const slab = box([width, 0.24, length + 0.04], [(start[0] + end[0]) / 2, start[1] - 0.12, (start[2] + end[2]) / 2], m.stone, targets, parent);
      slab.rotation.y = Math.atan2(end[0] - start[0], end[2] - start[2]); return [slab];
    }
    const count = Math.ceil(Math.abs(rise) / 0.16), low = rise > 0 ? start : end, high = rise > 0 ? end : start, pieces = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const tread = box([width, 0.22, length / count + 0.02], [low[0] + (high[0] - low[0]) * t,
        low[1] + Math.abs(rise) * i / count - 0.11, low[2] + (high[2] - low[2]) * t], m.stone, targets, parent);
      tread.rotation.y = Math.atan2(high[0] - low[0], high[2] - low[2]); pieces.push(tread);
    }
    return pieces;
  }

  for (const node of Object.keys(p)) island(node, ['TA', 'RP', 'TE', 'RE'].includes(node) ? 1.0 : 0.82, node === 'TE' || node === 'RE' ? 1.8 : 1.15);
  road('S', 'V', ['S', 'V']); road('H', 'TA', ['H', 'TA']); road('R0', 'RP', ['R0', 'RP'], 1.28);
  road('TB', 'TE', ['TB', 'TE']);

  // The first seam is real in world space and continuous only from view B.
  for (const node of ['S', 'V']) {
    const ring = mesh(new THREE.RingGeometry(0.25, 0.31, 40), m.gold, [p[node][0], p[node][1] + 0.02, p[node][2]], [node]);
    ring.rotation.x = -Math.PI / 2;
  }
  const seamBeam = box([0.78, 0.22, 1.15], [(p.V[0] + p.H[0]) / 2, 0.38, 0.5], m.stone, ['V', 'H']);
  seamBeam.rotation.y = Math.PI / 4;

  const travellerWing = new THREE.Group(); travellerWing.position.set(...p.TA); root.add(travellerWing);
  const travellerWingPieces = road('TA', 'TB', ['TA', 'TB'], 0.92, travellerWing, true);
  const rockWing = new THREE.Group(); rockWing.position.set(...p.RP); root.add(rockWing);
  const rockWingPieces = road('RP', 'RB', ['RP', 'RB'], 1.28, rockWing, true);
  const finalBridge = new THREE.Group(); finalBridge.position.set(...p.RB); root.add(finalBridge);
  const finalPieces = road('RB', 'RE', ['RB', 'RE'], 1.24, finalBridge, true);

  for (const [node, material] of [['TA', coral], ['RP', navy]]) {
    const disc = cylinder(0.48, 0.10, [p[node][0], p[node][1] - 0.015, p[node][2]], material, [node]);
    disc.userData.targets = [node];
  }
  // A broken ceremonial arch frames the two permanent final islands.
  for (const node of ['TE', 'RE']) {
    for (const side of [-1, 1]) box([0.22, 2.3, 0.22], [p[node][0] + side * 0.62, p[node][1] + 1.15, p[node][2]], m.stone, [node]);
    box([1.45, 0.18, 0.34], [p[node][0], p[node][1] + 2.28, p[node][2]], m.gold, [node]);
  }
  const travellerPortal = world.portal(p.TE, 'TE');
  const portal = world.portal(p.RE, 'RE');

  const rock = new THREE.Group(), rockBody = new THREE.Group(); root.add(rock); rock.add(rockBody);
  const rockParts = [];
  function rockPart(geometry, material, position, scale = [1, 1, 1]) {
    const object = new THREE.Mesh(geometry, material); object.position.set(...position); object.scale.set(...scale);
    rockBody.add(object); rockParts.push(object); return object;
  }
  rockPart(new THREE.DodecahedronGeometry(0.48, 0), navy, [0, 0.46, 0], [1.25, 0.86, 1.02]);
  rockPart(new THREE.DodecahedronGeometry(0.33, 0), coral, [0, 0.80, 0.03], [1.12, 0.83, 0.94]);
  for (const x of [-0.13, 0.13]) rockPart(new THREE.SphereGeometry(0.035, 12, 8), m.white, [x, 0.84, 0.29], [0.8, 1.15, 0.65]);
  for (const x of [-0.30, 0.30]) rockPart(new THREE.DodecahedronGeometry(0.17, 0), navy, [x, 0.14, 0.06], [1.25, 0.62, 1.45]);
  const rockShadow = mesh(new THREE.CircleGeometry(0.58, 40), new THREE.MeshBasicMaterial({ color: '#26373a', transparent: true, opacity: 0.28, depthWrite: false }), [0, 0.012, 0], null, rock);
  rockShadow.rotation.x = -Math.PI / 2;
  const activeRing = mesh(new THREE.RingGeometry(0.48, 0.55, 48), light, [0, 0.02, 0]); activeRing.rotation.x = -Math.PI / 2;

  let rockFacing = 0, rockStride = 0;
  function place(game, actor, group) {
    const node = game.state[`${actor}Node`], position = game.state.active === actor && game.phase === 'moving' ? game.position : p[node];
    group.position.set(...position);
  }
  const level = { ...world, portal, rock,
    update(game) {
      travellerWing.rotation.z = -(1 - game.visuals.wingLift) * Math.PI / 2;
      rockWing.rotation.z = (1 - game.visuals.wingLift) * Math.PI / 2;
      finalBridge.rotation.z = (1 - game.visuals.finalLift) * Math.PI / 2;
      for (const piece of [...travellerWingPieces, ...rockWingPieces]) piece.userData.targets = game.state.wingsOpen ? piece.userData.targets || [] : null;
      for (const piece of travellerWingPieces) piece.userData.targets = game.state.wingsOpen ? ['TA', 'TB'] : null;
      for (const piece of rockWingPieces) piece.userData.targets = game.state.wingsOpen ? ['RP', 'RB'] : null;
      for (const piece of finalPieces) piece.userData.targets = game.state.finalBridge ? ['RB', 'RE'] : null;
      seamBeam.userData.targets = game.state.view === 'B' ? ['V', 'H'] : null;
      travellerPortal.material.opacity = game.state.travellerNode === 'TE' ? 0.92 : 0.68;
    },
    updateActors(game, dt, clock, reducedMotion) {
      place(game, 'traveller', world.traveller); place(game, 'rock', rock);
      const travellerGame = Object.create(game); travellerGame.phase = game.state.active === 'traveller' ? game.phase : 'idle';
      world.updateTraveller(travellerGame, dt, clock, reducedMotion);
      const moving = game.state.active === 'rock' && game.phase === 'moving';
      if (moving) {
        const target = Math.atan2(game.direction[0], game.direction[2]);
        rockFacing += Math.atan2(Math.sin(target - rockFacing), Math.cos(target - rockFacing)) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 10));
        rockStride += dt * 7;
      }
      rockBody.rotation.y = rockFacing; rockBody.position.y = moving && !reducedMotion ? Math.abs(Math.sin(rockStride)) * 0.035 : Math.sin(clock * 1.3) * 0.006;
      for (const object of rockParts) object.material.opacity = 1 - game.finishProgress;
      rockShadow.material.opacity = 0.28 * (1 - game.finishProgress);
      const active = game.state.active === 'traveller' ? world.traveller.position : rock.position;
      activeRing.position.set(active.x, active.y + 0.018, active.z); activeRing.visible = !['intro', 'finishing', 'won'].includes(game.phase);
      world.traveller.visible = game.phase !== 'won'; rock.visible = game.phase !== 'won';
    },
  };
  return level;
}
