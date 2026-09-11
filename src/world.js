import * as THREE from 'three';
import { PALETTE } from './level-01.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTraveller } from './traveller.js';

export function makeWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];
  const materials = Object.fromEntries(Object.entries({
    stone: '#dccfbf', blue: '#7b889b', gold: '#b79256',
    mint: PALETTE.light, white: '#fff9ec', trim: '#b3a68e', recess: '#394e59',
  }).map(([name, color]) => [name, new THREE.MeshStandardMaterial({ color, roughness: 0.95 })]));
  materials.gold.roughness = 0.46; materials.gold.metalness = 0.35;
  function mesh(geometry, material, p, targets = null, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...p);
    object.userData.targets = targets;
    parent.add(object);
    colliders.push(object);
    return object;
  }
  const box = (size, p, mat = materials.stone, targets = null, parent = root) => mesh(
    Math.min(...size) > 0.08 && !targets ? new RoundedBoxGeometry(...size, 2, Math.min(0.035, size[1] / 5)) : new THREE.BoxGeometry(...size), mat, p, targets, parent);
  const cylinder = (radius, height, p, mat = materials.stone, targets = null, parent = root) =>
    mesh(new THREE.CylinderGeometry(radius, radius, height, 40), mat, p, targets, parent);
  function floor(a, b, targets, width = 1.1, parent = root) {
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const slab = box([width, 0.28, length + 0.04], [(a[0] + b[0]) / 2, a[1] - 0.14, (a[2] + b[2]) / 2], materials.stone, targets, parent);
    slab.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
    const beam = box([width * 0.72, 0.075, length + 0.02], [(a[0] + b[0]) / 2, a[1] - 0.32, (a[2] + b[2]) / 2], materials.trim, null, parent);
    beam.rotation.y = slab.rotation.y;
    return slab;
  }
  function pad(p, target, width = 1.5, parent = root) {
    box([width - 0.12, 0.10, width - 0.12], [p[0], p[1] - 0.33, p[2]], materials.trim, null, parent);
    return box([width, 0.28, width], [p[0], p[1] - 0.14, p[2]], materials.stone, [target], parent);
  }
  function marker(p, target, parent = root) {
    const ring = mesh(new THREE.RingGeometry(0.25, 0.31, 40), materials.gold, [p[0], p[1] + 0.014, p[2]], [target], parent);
    ring.rotation.x = -Math.PI / 2;
    const disc = mesh(new THREE.CircleGeometry(0.19, 32), materials.white, [p[0], p[1] + 0.011, p[2]], [target], parent);
    disc.rotation.x = -Math.PI / 2;
  }
  function archShape(width, height, base = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, base);
    shape.lineTo(width / 2, base);
    shape.lineTo(width / 2, base + height - width / 2);
    shape.absarc(0, base + height - width / 2, width / 2, 0, Math.PI, false);
    shape.lineTo(-width / 2, base);
    return shape;
  }
  function insetArch(p, width, height, yaw = 0, parent = root) {
    const group = new THREE.Group(); group.position.set(...p); group.rotation.y = yaw; parent.add(group);
    mesh(new THREE.ShapeGeometry(archShape(width, height)), materials.recess, [0, 0, 0.006], null, group);
    const frame = archShape(width + 0.14, height + 0.07, -0.03);
    frame.holes.push(archShape(width, height));
    mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.075, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 20 }), materials.stone, [0, 0, 0.012], null, group);
    box([width + 0.23, 0.08, 0.16], [0, -0.04, 0.06], materials.stone, null, group);
    box([0.028, height - width / 2, 0.026], [0, (height - width / 2) / 2, 0.024], materials.trim, null, group);
    box([width * 0.94, 0.03, 0.025], [0, height * 0.36, 0.024], materials.trim, null, group);
  }
  function support(p, height = 3, width = 1.15) {
    box([width, height, width], [p[0], p[1] - 0.28 - height / 2, p[2]], materials.blue);
    box([width + 0.22, 0.14, width + 0.22], [p[0], p[1] - height - 0.32, p[2]], materials.stone);
    box([width + 0.34, 0.10, width + 0.34], [p[0], p[1] - height - 0.43, p[2]], materials.trim);
    box([width + 0.12, 0.12, width + 0.12], [p[0], p[1] - 0.42, p[2]], materials.trim);
    for (const yaw of [0, Math.PI / 2]) {
      insetArch([p[0] + Math.sin(yaw) * (width / 2 + 0.006), p[1] - height + 0.1, p[2] + Math.cos(yaw) * (width / 2 + 0.006)], width * 0.48, height * 0.65, yaw);
    }
  }
  function pier(p) {
    box([0.62, 2.15, 0.62], [p[0] + 0.8, p[1] + 0.55, p[2] + 0.8]);
    box([0.78, 0.13, 0.78], [p[0] + 0.8, p[1] + 1.69, p[2] + 0.8], materials.gold);
    mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.mint,
      [p[0] + 0.8, p[1] + 1.87, p[2] + 0.8]);
  }
  function portal(p, target) {
    const shape = archShape(1.05, 1.73);
    shape.holes.push(archShape(0.72, 1.48, 0.04));
    mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.19, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.018, bevelSegments: 3, curveSegments: 24 }), materials.stone, [p[0], p[1], p[2] + 0.03], [target]);
    const trim = archShape(0.85, 1.59, 0.02); trim.holes.push(archShape(0.76, 1.51, 0.04));
    mesh(new THREE.ExtrudeGeometry(trim, { depth: 0.025, bevelEnabled: false }), materials.gold, [p[0], p[1], p[2] + 0.243], [target]);
    for (const x of [-0.52, 0.52]) {
      box([0.20, 0.13, 0.36], [p[0] + x, p[1] + 0.09, p[2] + 0.13], materials.trim, [target]);
      box([0.17, 0.10, 0.32], [p[0] + x, p[1] + 1.22, p[2] + 0.13], materials.white, [target]);
    }
    box([1.19, 0.12, 0.4], [p[0], p[1] + 0.02, p[2] + 0.1], materials.white, [target]);
    const crest = mesh(new THREE.OctahedronGeometry(0.075), materials.gold, [p[0], p[1] + 1.77, p[2] + 0.13], [target]);
    crest.scale.set(0.75, 1.5, 0.5);
    return mesh(new THREE.ShapeGeometry(archShape(0.72, 1.48)),
      new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      [p[0], p[1] + 0.04, p[2] + 0.09], [target]);
  }
  function wheel(p, action) {
    cylinder(0.15, 0.6, [p[0], p[1] - 0.3, p[2]], materials.gold, [action]);
    const object = mesh(new THREE.TorusGeometry(0.24, 0.055, 12, 40), materials.gold, p, [action]);
    object.rotation.x = Math.PI / 2;
    cylinder(0.28, 0.08, [p[0], p[1] - 0.56, p[2]], materials.trim, [action]);
    cylinder(0.08, 0.055, [p[0], p[1] + 0.025, p[2]], materials.white, [action]);
    for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
      const spoke = box([0.41, 0.035, 0.028], [0, 0, 0], materials.gold, [action], object);
      spoke.rotation.z = angle;
    }
    return object;
  }
  const character = createTraveller(root);
  const destination = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.26, 40), new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.9, depthWrite: false }));
  destination.rotation.x = -Math.PI / 2; destination.visible = false; root.add(destination);
  return { root, colliders, materials, mesh, box, cylinder, floor, pad, marker, support, insetArch, pier, portal, wheel, ...character, destination };
}

export function disposeLevel(level) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  level.root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) {
      materials.add(mat);
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  level.root.removeFromParent();
}
