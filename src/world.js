import * as THREE from 'three';
import { PALETTE } from './level-01.js';

export function makeWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];
  const materials = Object.fromEntries(Object.entries({
    stone: PALETTE.stone, blue: PALETTE.shade, gold: PALETTE.gold,
    mint: PALETTE.light, white: '#fff9ec', trim: '#b3a68e', recess: '#394e59',
  }).map(([name, color]) => [name, new THREE.MeshStandardMaterial({ color, roughness: 0.95 })]));
  function mesh(geometry, material, p, targets = null, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...p);
    object.userData.targets = targets;
    parent.add(object);
    colliders.push(object);
    return object;
  }
  const box = (size, p, mat = materials.stone, targets = null, parent = root) => mesh(new THREE.BoxGeometry(...size), mat, p, targets, parent);
  const cylinder = (radius, height, p, mat = materials.stone, targets = null, parent = root) =>
    mesh(new THREE.CylinderGeometry(radius, radius, height, 40), mat, p, targets, parent);
  function floor(a, b, targets, width = 1.1, parent = root) {
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const slab = box([width, 0.28, length + 0.04], [(a[0] + b[0]) / 2, a[1] - 0.14, (a[2] + b[2]) / 2], materials.stone, targets, parent);
    slab.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
    return slab;
  }
  function pad(p, target, width = 1.5, parent = root) {
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
  function support(p, height = 3, width = 1.15) {
    box([width, height, width], [p[0], p[1] - 0.28 - height / 2, p[2]], materials.blue);
    box([width + 0.22, 0.14, width + 0.22], [p[0], p[1] - height - 0.32, p[2]], materials.stone);
    for (const yaw of [0, Math.PI / 2]) {
      const recess = mesh(new THREE.ShapeGeometry(archShape(width * 0.48, height * 0.65)), materials.recess,
        [p[0] + Math.sin(yaw) * (width / 2 + 0.006), p[1] - height + 0.1, p[2] + Math.cos(yaw) * (width / 2 + 0.006)]);
      recess.rotation.y = yaw;
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
    mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.19, bevelEnabled: false }), materials.stone, [p[0], p[1], p[2] + 0.03], [target]);
    return mesh(new THREE.ShapeGeometry(archShape(0.72, 1.48)),
      new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      [p[0], p[1] + 0.04, p[2] + 0.09], [target]);
  }
  function wheel(p, action) {
    cylinder(0.15, 0.6, [p[0], p[1] - 0.3, p[2]], materials.gold, [action]);
    const object = mesh(new THREE.TorusGeometry(0.24, 0.055, 12, 40), materials.gold, p, [action]);
    object.rotation.x = Math.PI / 2;
    return object;
  }
  const traveller = new THREE.Group(), body = new THREE.Group();
  root.add(traveller);
  traveller.add(body);
  for (const [geometry, mat, p] of [
    [new THREE.ConeGeometry(0.16, 0.36, 16), materials.white, [0, 0.27, 0]],
    [new THREE.SphereGeometry(0.1, 16, 12), materials.white, [0, 0.49, 0]],
    [new THREE.ConeGeometry(0.13, 0.16, 16), materials.gold, [0, 0.61, 0]],
    [new THREE.SphereGeometry(0.035, 8, 8), materials.blue, [0, 0.49, 0.087]],
  ]) {
    const material = mat.clone(); material.transparent = true;
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...p); body.add(part);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: '#374651', transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.011; traveller.add(shadow);
  const destination = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.26, 40), new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.9, depthWrite: false }));
  destination.rotation.x = -Math.PI / 2; destination.visible = false; root.add(destination);
  return { root, colliders, materials, mesh, box, cylinder, floor, pad, marker, support, pier, portal, wheel, traveller, body, shadow, destination };
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
