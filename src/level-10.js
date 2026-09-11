import * as THREE from 'three';
import { makeWorld } from './world.js';
import { COMPANION_LEVEL as definition } from './companion-level.js';

export function createLevel(scene) {
  const world = makeWorld(scene);
  const { root, box, cylinder, mesh, floor, pad, marker, support, materials: m } = world;
  const p = definition.positions;
  for (const [key, color] of Object.entries({ stone: '#e7e0d3', blue: '#657b7d', gold: '#c08f49', mint: '#a9c8bc', trim: '#b5a28e', recess: '#344f55' })) m[key].color.set(color);
  const coral = new THREE.MeshStandardMaterial({ color: '#bd7566', roughness: 0.86, transparent: true });
  const slate = new THREE.MeshStandardMaterial({ color: '#465b62', roughness: 0.96, transparent: true });
  const glow = new THREE.MeshBasicMaterial({ color: '#f4d78a', transparent: true, opacity: 0.82, depthWrite: false });

  function landing(node, width, height) {
    pad(p[node], node, width); support(p[node], height, width * 0.68);
  }
  for (const node of ['S', 'A', 'B']) landing(node, 1.42, node === 'A' ? 3.8 : 3.2);
  landing('TE', 1.72, 4.2);
  for (const node of ['R0', 'P', 'C']) landing(node, 1.78, node === 'P' ? 2.4 : 2.9);
  landing('RE', 1.92, 3.5);
  for (const node of ['S', 'A', 'B', 'R0', 'P', 'C']) marker(p[node], node);

  floor(p.S, p.A, ['S', 'A'], 0.76);
  floor(p.B, p.TE, ['B', 'TE'], 0.76);
  floor(p.R0, p.P, ['R0', 'P'], 1.34);
  floor(p.C, p.RE, ['C', 'RE'], 1.34);

  const travellerBridge = new THREE.Group(); root.add(travellerBridge);
  const travellerSlab = floor(p.A, p.B, ['A', 'B'], 0.78, travellerBridge);
  for (const x of [-1.55, -0.45, 0.65]) {
    box([0.07, 0.34, 0.60], [x, 0.03, 0], m.gold, null, travellerBridge);
  }
  const rockBridge = new THREE.Group(); root.add(rockBridge);
  const rockSlab = floor(p.P, p.C, ['P', 'C'], 1.36, rockBridge);
  for (const x of [-1.48, -0.5, 0.48]) {
    box([0.12, 0.18, 1.08], [x, -1.36, 3], coral, null, rockBridge);
  }

  // The traveller opens this portcullis for the wider companion route.
  const gate = new THREE.Group(); root.add(gate);
  for (const z of [2.31, 3.69]) {
    box([0.32, 2.4, 0.32], [-3.5, 0.1, z], m.blue);
    box([0.48, 0.16, 0.48], [-3.5, 1.32, z], m.gold);
  }
  box([0.34, 0.32, 1.72], [-3.5, 1.28, 3], m.gold, null, gate);
  for (const z of [2.55, 2.85, 3.15, 3.45]) box([0.14, 1.58, 0.14], [-3.5, 0.42, z], slate, null, gate);
  const gateHandle = cylinder(0.24, 0.09, [p.A[0], p.A[1] + 0.035, p.A[2]], m.gold);
  gateHandle.userData.targets = ['A'];

  // P reads as a weight plate, while B contains the permanent bridge lock.
  const pressure = cylinder(0.43, 0.10, [p.P[0], p.P[1] - 0.015, p.P[2]], coral, ['P']);
  const pressureRing = mesh(new THREE.RingGeometry(0.47, 0.53, 48), m.gold, [p.P[0], p.P[1] + 0.018, p.P[2]], ['P']);
  pressureRing.rotation.x = -Math.PI / 2;
  const lock = new THREE.Group(); lock.position.set(...p.B); root.add(lock);
  const lockRing = mesh(new THREE.TorusGeometry(0.25, 0.055, 12, 40), m.gold, [0, 0.36, 0], ['B'], lock);
  lockRing.rotation.x = Math.PI / 2;
  box([0.11, 0.62, 0.11], [0, 0.66, 0], m.gold, ['B'], lock);
  box([0.42, 0.12, 0.42], [0, 0.94, 0], m.white, ['B'], lock);

  // Two beacons clarify that both characters must finish the journey.
  const travellerPortal = world.portal(p.TE, 'TE');
  const portal = world.portal(p.RE, 'RE');
  const travellerCrest = mesh(new THREE.RingGeometry(0.13, 0.19, 3), glow, [p.TE[0], p.TE[1] + 2.06, p.TE[2]], ['TE']);
  const rockCrest = mesh(new THREE.RingGeometry(0.13, 0.20, 4), glow, [p.RE[0], p.RE[1] + 2.06, p.RE[2]], ['RE']);

  // A compact, low-poly rock spirit has a distinct mass and gait.
  const rock = new THREE.Group(), rockBody = new THREE.Group(); root.add(rock); rock.add(rockBody);
  const rockParts = [];
  function rockPart(geometry, material, position, scale = [1, 1, 1]) {
    const object = new THREE.Mesh(geometry, material); object.position.set(...position); object.scale.set(...scale);
    rockBody.add(object); rockParts.push(object); return object;
  }
  rockPart(new THREE.DodecahedronGeometry(0.48, 0), slate, [0, 0.46, 0], [1.25, 0.86, 1.02]);
  rockPart(new THREE.DodecahedronGeometry(0.33, 0), coral, [0, 0.80, 0.03], [1.12, 0.83, 0.94]);
  for (const x of [-0.13, 0.13]) rockPart(new THREE.SphereGeometry(0.035, 12, 8), m.white, [x, 0.84, 0.29], [0.8, 1.15, 0.65]);
  for (const x of [-0.30, 0.30]) rockPart(new THREE.DodecahedronGeometry(0.17, 0), slate, [x, 0.14, 0.06], [1.25, 0.62, 1.45]);
  const rockShadow = mesh(new THREE.CircleGeometry(0.58, 40), new THREE.MeshBasicMaterial({ color: '#26373a', transparent: true, opacity: 0.28, depthWrite: false }), [0, 0.012, 0], null, rock);
  rockShadow.rotation.x = -Math.PI / 2;

  const activeRing = mesh(new THREE.RingGeometry(0.48, 0.55, 48), glow, [0, 0.02, 0]);
  activeRing.rotation.x = -Math.PI / 2;
  const activeDot = mesh(new THREE.CircleGeometry(0.07, 24), glow, [0, 0.023, 0], null, activeRing);
  activeDot.position.z = -0.70;

  let bridgeLift = 0, rockFacing = 0, rockStride = 0;
  function actorPosition(game, actor, group) {
    const node = game.state[`${actor}Node`];
    const position = game.state.active === actor && game.phase === 'moving' ? game.position : definition.positions[node];
    group.position.set(...position);
  }
  const level = {
    ...world, portal, rock,
    update(game) {
      const factor = game.reducedMotion ? 1 : 0.13;
      bridgeLift += (game.visuals.bridgeLift - bridgeLift) * factor;
      travellerBridge.position.y = -1.35 * (1 - bridgeLift);
      rockBridge.position.y = -1.35 * (1 - game.visuals.lockDrop);
      gate.position.y = game.visuals.gateLift * 2.15;
      pressure.position.y = p.P[1] - 0.015 - (game.state.rockNode === 'P' ? 0.08 : 0);
      lock.position.y = -0.44 * game.visuals.lockDrop;
      travellerSlab.userData.targets = ['A', 'B'];
      rockSlab.userData.targets = ['P', 'C'];
      travellerPortal.material.opacity = 0.55 + (game.state.travellerNode === 'TE' ? 0.35 : 0.12 * Math.sin(performance.now() / 650));
      travellerCrest.rotation.z += 0.005; rockCrest.rotation.z -= 0.004;
    },
    updateActors(game, dt, clock, reducedMotion) {
      actorPosition(game, 'traveller', world.traveller);
      actorPosition(game, 'rock', rock);
      const travellerGame = Object.create(game);
      travellerGame.phase = game.state.active === 'traveller' ? game.phase : 'idle';
      world.updateTraveller(travellerGame, dt, clock, reducedMotion);
      const rockMoving = game.state.active === 'rock' && game.phase === 'moving';
      if (rockMoving) {
        const target = Math.atan2(game.direction[0], game.direction[2]);
        rockFacing += Math.atan2(Math.sin(target - rockFacing), Math.cos(target - rockFacing)) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 10));
        rockStride += dt * 7;
      }
      rockBody.rotation.y = rockFacing;
      rockBody.position.y = rockMoving && !reducedMotion ? Math.abs(Math.sin(rockStride)) * 0.035 : Math.sin(clock * 1.3) * 0.006;
      rockBody.rotation.z = rockMoving && !reducedMotion ? Math.sin(rockStride) * 0.035 : 0;
      for (const object of rockParts) object.material.opacity = 1 - game.finishProgress;
      rockShadow.material.opacity = 0.28 * (1 - game.finishProgress);
      const active = game.state.active === 'traveller' ? world.traveller.position : rock.position;
      activeRing.position.set(active.x, active.y + 0.018, active.z);
      activeRing.visible = !['intro', 'finishing', 'won'].includes(game.phase);
      activeRing.rotation.z = Math.sin(clock * 1.8) * 0.12;
      world.traveller.visible = game.phase !== 'won'; rock.visible = game.phase !== 'won';
    },
  };
  return level;
}
