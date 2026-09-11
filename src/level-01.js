import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTraveller } from './traveller.js';

export const PALETTE = { background: '#F3E9DD', stone: '#D8C3A5', shade: '#657A8D', gold: '#D5A24A', light: '#78B8A4' };

export function createLevel(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const stone = material('#dccfbf');
  const blue = material('#7b889b');
  const gold = material('#b79256');
  gold.roughness = 0.46; gold.metalness = 0.35;
  const white = material('#fff9ec');
  const mint = material(PALETTE.light);
  const trim = material('#b3a68e');
  const recess = material('#394e59');

  function mesh(geometry, mat, position, parent = root, targets = null) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.userData.targets = targets;
    parent.add(object);
    colliders.push(object);
    return object;
  }
  const box = (w, h, d, p, mat = stone, parent = root, targets = null) => mesh(
    Math.min(w, h, d) > 0.08 && !targets ? new RoundedBoxGeometry(w, h, d, 2, Math.min(0.035, h / 5)) : new THREE.BoxGeometry(w, h, d), mat, p, parent, targets);
  const cylinder = (rt, rb, h, p, mat = stone, parent = root, targets = null) => mesh(new THREE.CylinderGeometry(rt, rb, h, 48), mat, p, parent, targets);
  function archShape(width, height, base = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, base);
    shape.lineTo(width / 2, base);
    shape.lineTo(width / 2, base + height - width / 2);
    shape.absarc(0, base + height - width / 2, width / 2, 0, Math.PI, false);
    shape.lineTo(-width / 2, base);
    return shape;
  }
  function insetArch(width, height, p, yaw = 0) {
    const group = new THREE.Group();
    group.position.set(...p);
    group.rotation.y = yaw;
    root.add(group);
    mesh(new THREE.ShapeGeometry(archShape(width, height)), recess, [0, 0, 0.007], group);
    const frame = archShape(width + 0.16, height + 0.08, -0.035);
    frame.holes.push(archShape(width, height));
    mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.085, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.014, bevelThickness: 0.012, curveSegments: 20 }), stone, [0, 0, 0.014], group);
    box(width + 0.25, 0.09, 0.19, [0, -0.045, 0.075], stone, group);
    box(width + 0.14, 0.05, 0.12, [0, -0.115, 0.04], trim, group);
    box(0.035, height - width / 2, 0.03, [0, (height - width / 2) / 2, 0.027], trim, group);
    box(width * 0.92, 0.035, 0.025, [0, height * 0.37, 0.025], trim, group);
  }

  // Walkable tops are at y=0 and y=2, as defined in the level document.
  box(1.5, 0.3, 6, [0, -0.15, -7], stone, root, ['S', 'W', 'I']);
  box(1.35, 3.5, 3.5, [0, -2.05, -7.7], blue);
  box(1.58, 0.15, 3.72, [0, -3.77, -7.7], stone);
  box(1.47, 0.12, 3.63, [0, -0.4, -7.7], trim);
  for (const z of [-8.75, -7.65, -6.55]) insetArch(0.53, 1.85, [0.677, -3.28, z], Math.PI / 2);
  insetArch(0.7, 2.3, [0, -3.28, -5.947]);
  for (const z of [-8, -6]) box(1.45, 0.009, 0.02, [0, 0.005, z], trim, root, ['S', 'W', 'I']);
  cylinder(1.2, 1.2, 0.3, [0, -0.15, 0], stone, root, ['H']);
  cylinder(0.88, 0.66, 3.7, [0, -2.15, 0], blue);
  cylinder(1.23, 1.12, 0.12, [0, -0.36, 0], trim);
  cylinder(0.78, 0.86, 0.16, [0, -4, 0], stone);
  cylinder(0.78, 0.78, 0.08, [0, -3.72, 0], gold);
  cylinder(1.08, 0.89, 0.20, [0, -0.54, 0], stone);
  cylinder(0.87, 0.98, 0.16, [0, -3.81, 0], trim);
  // Slender flutes give the drum a rhythm without entering the bridge's sweep.
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const a = new THREE.Vector3(Math.sin(angle) * 0.86, -0.62, Math.cos(angle) * 0.86);
    const b = new THREE.Vector3(Math.sin(angle) * 0.69, -3.47, Math.cos(angle) * 0.69);
    const flute = cylinder(0.024, 0.018, a.distanceTo(b), a.clone().add(b).multiplyScalar(0.5).toArray(), trim);
    flute.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.sub(b).normalize());
  }
  const bridge = new THREE.Group();
  root.add(bridge);
  box(2.9, 0.28, 0.9, [2.55, -0.14, 0], stone, bridge, ['R1']);
  for (const x of [1.45, 2.3, 3.15]) box(0.018, 0.008, 0.87, [x, 0.004, 0], trim, bridge, ['R1']);
  for (const z of [-0.455, 0.455]) box(2.9, 0.035, 0.026, [2.55, -0.19, z], gold, bridge);
  box(2.7, 0.075, 0.65, [2.5, -0.32, 0], blue, bridge);
  for (const x of [1.5, 2.4, 3.3]) box(0.075, 0.11, 0.75, [x, -0.34, 0], trim, bridge);
  box(0.9, 0.26, 1, [0, -0.13, -4.5], stone, root, ['I']);
  box(4.8, 0.3, 0.9, [8.4, 1.85, 2], stone, root, ['F', 'G', 'E']);
  box(1.5, 4, 1.5, [10, -0.3, 2], blue);
  box(1.69, 0.15, 1.69, [10, -2.34, 2], stone);
  box(1.6, 0.12, 1.6, [10, 1.53, 2], trim);
  insetArch(0.74, 2.35, [10, -1.9, 2.752]);
  insetArch(0.74, 2.35, [10.752, -1.9, 2], Math.PI / 2);
  box(1.8, 0.3, 1.8, [10, 1.85, 2], stone, root, ['E']);
  for (const [x, y, z, w, d] of [[0, -3.89, -7.7, 1.72, 3.86], [10, -2.45, 2, 1.83, 1.83]]) {
    box(w, 0.12, d, [x, y, z], trim);
    box(w - 0.12, 0.06, d - 0.12, [x, y + 0.09, z], white);
  }
  for (const z of [-9.39, -5.99]) box(0.055, 3.25, 0.065, [0.69, -2.04, z], trim);
  for (const x of [9.28, 10.72]) box(0.055, 3.75, 0.065, [x, -0.27, 2.77], trim);

  // This side pier hides the depth remapping of both the traveller and its foot shadow.
  box(0.62, 2.15, 0.62, [6.8, 2.55, 2.8], stone);
  box(0.78, 0.13, 0.78, [6.8, 3.69, 2.8], gold);
  cylinder(0.3, 0.3, 0.12, [6.8, 3.81, 2.8], stone);
  mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mint, [6.8, 3.87, 2.8]);

  // A few quiet architectural details; none adds a new navigation route.
  for (const [x, z] of [[-0.56, -9.48], [-0.56, -8.52]]) {
    cylinder(0.17, 0.13, 0.16, [x, 0.08, z], trim);
    cylinder(0.035, 0.035, 0.42, [x, 0.29, z], gold);
    mesh(new THREE.SphereGeometry(0.23, 16, 12), mint, [x, 0.57, z]).scale.set(0.72, 1.65, 0.72);
  }
  for (const x of [-0.58, 0.58]) cylinder(0.06, 0.08, 0.2, [x, 0.1, -9.85], stone);
  for (const x of [7.3, 8.4]) box(0.018, 0.008, 0.87, [x, 2.004, 2], trim, root, ['F', 'G']);

  function marker(p) {
    const ring = mesh(new THREE.RingGeometry(0.25, 0.31, 48), gold, p);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.targets = [p[2] === -7 ? 'W' : 'H'];
    const center = mesh(new THREE.CircleGeometry(0.19, 48), white, [p[0], p[1] - 0.003, p[2]]);
    center.rotation.x = -Math.PI / 2;
    center.userData.targets = ring.userData.targets;
  }
  marker([0, 0.015, -7]);
  marker([0, 0.015, 0]);

  const handlePosition = new THREE.Vector3(-0.63, 0.6, 0.55);
  cylinder(0.15, 0.21, 0.6, [-0.63, 0.3, 0.55], gold, root, ['rotate']);
  const wheel = mesh(new THREE.TorusGeometry(0.24, 0.055, 12, 40), gold, handlePosition.toArray(), root, ['rotate']);
  wheel.rotation.x = Math.PI / 2;
  const hub = cylinder(0.08, 0.08, 0.055, handlePosition.toArray(), white, root, ['rotate']);
  hub.position.y += 0.025;
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const spoke = box(0.41, 0.035, 0.028, [0, 0, 0], gold, wheel, ['rotate']);
    spoke.rotation.z = angle;
  }
  cylinder(0.28, 0.32, 0.08, [-0.63, 0.04, 0.55], trim, root, ['rotate']);

  // The gate itself is a visible destination, rather than an invisible target behind it.
  const gateShape = archShape(1.05, 1.73);
  const gateHole = archShape(0.72, 1.48, 0.04);
  gateShape.holes.push(gateHole);
  mesh(new THREE.ExtrudeGeometry(gateShape, { depth: 0.19, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.022, bevelThickness: 0.018, curveSegments: 24 }), stone, [10, 2, 2.03], root, ['E']);
  const gateTrim = archShape(0.85, 1.59, 0.02);
  gateTrim.holes.push(archShape(0.76, 1.51, 0.04));
  mesh(new THREE.ExtrudeGeometry(gateTrim, { depth: 0.025, bevelEnabled: false }), gold, [10, 2, 2.243], root, ['E']);
  for (const x of [9.48, 10.52]) {
    box(0.20, 0.13, 0.36, [x, 2.09, 2.13], trim, root, ['E']);
    box(0.17, 0.10, 0.32, [x, 3.22, 2.13], white, root, ['E']);
  }
  const crest = mesh(new THREE.OctahedronGeometry(0.075), gold, [10, 3.77, 2.13], root, ['E']);
  crest.scale.set(0.75, 1.5, 0.5);
  box(1.19, 0.12, 0.4, [10, 2.02, 2.1], white, root, ['E']);
  const portalMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const portal = mesh(new THREE.ShapeGeometry(archShape(0.72, 1.48)), portalMaterial, [10, 2.04, 2.09], root, ['E']);

  const character = createTraveller(root);

  const destination = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.26, 40), new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.9, depthWrite: false }));
  destination.rotation.x = -Math.PI / 2;
  destination.visible = false;
  root.add(destination);

  // Soft, stationary shadows anchor the floating architecture without exposing seam depth.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(65,79,88,0.17)');
  gradient.addColorStop(1, 'rgba(65,79,88,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(shadowCanvas);
  for (const [x, y, z, w, d] of [[0, -4.13, 0, 5, 4], [0, -3.96, -7.7, 4, 6], [10, -2.47, 2, 4, 4]]) {
    const baseShadow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    baseShadow.position.set(x, y, z);
    baseShadow.rotation.x = -Math.PI / 2;
    root.add(baseShadow);
  }
  return { root, bridge, colliders, ...character, wheel, handlePosition, portal, destination };
}
