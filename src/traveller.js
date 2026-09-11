import * as THREE from 'three';

// Shared traveller: visual animation follows Game without changing navigation.
export function createTraveller(root) {
  const traveller = new THREE.Group(), body = new THREE.Group();
  root.add(traveller); traveller.add(body);
  const cloth = new THREE.MeshStandardMaterial({ color: '#fff6e5', roughness: 0.88, transparent: true });
  const lining = new THREE.MeshStandardMaterial({ color: '#9fbdb7', roughness: 0.94, transparent: true });
  const face = new THREE.MeshStandardMaterial({ color: '#566573', roughness: 1, transparent: true });
  const brass = new THREE.MeshStandardMaterial({ color: '#bd9657', roughness: 0.46, metalness: 0.35, transparent: true });
  const parts = [];
  function part(geometry, material, position, parent = body) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position); parent.add(object); parts.push(object);
    return object;
  }
  function lathe(profile, material, position, parent = body) {
    return part(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), material, position, parent);
  }
  const robe = lathe([[0, 0.18], [0.15, 0.18], [0.17, 0.20], [0.158, 0.24], [0.12, 0.34], [0.09, 0.45], [0.055, 0.47], [0, 0.47]], cloth, [0, 0, 0]);
  lathe([[0.148, 0.183], [0.169, 0.197], [0.164, 0.212]], lining, [0, 0, 0]);
  // Folded cape, open at the face, with a soft scalloped lower edge.
  const capeGeometry = new THREE.CylinderGeometry(0.063, 0.177, 0.30, 32, 6, true, 0.60, Math.PI * 2 - 1.20);
  const positions = capeGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const angle = Math.atan2(positions.getX(i), positions.getZ(i));
    const weight = (0.15 - positions.getY(i)) / 0.30;
    positions.setY(i, positions.getY(i) + Math.cos(angle * 6) * 0.009 * weight);
  }
  capeGeometry.computeVertexNormals();
  const capeMaterial = cloth.clone(); capeMaterial.side = THREE.DoubleSide;
  const cape = part(capeGeometry, capeMaterial, [0, 0.335, -0.013]);
  const head = part(new THREE.SphereGeometry(0.108, 24, 16), cloth, [0, 0.557, 0]);
  head.scale.set(0.92, 1.06, 0.95);
  const mask = part(new THREE.SphereGeometry(0.077, 24, 16), face, [0, 0.551, 0.062]);
  mask.scale.set(0.79, 0.87, 0.62);
  for (const x of [-0.026, 0.026]) {
    const eye = part(new THREE.SphereGeometry(0.009, 12, 8), cloth, [x, 0.557, 0.106]);
    eye.scale.set(0.72, 1.15, 0.65);
  }
  lathe([[0, 0], [0.159, 0], [0.165, 0.012], [0.151, 0.025], [0.097, 0.035], [0.08, 0.08], [0.043, 0.15], [0.007, 0.20], [0, 0.204]], cloth, [0, 0.631, 0]);
  lathe([[0.10, 0], [0.099, 0.02]], brass, [0, 0.661, 0]);
  part(new THREE.SphereGeometry(0.022, 16, 12), brass, [0, 0.447, 0.077]);
  const limbs = [-1, 1].map((side) => {
    const leg = new THREE.Group(); leg.position.set(side * 0.064, 0.20, 0); body.add(leg);
    part(new THREE.CapsuleGeometry(0.025, 0.11, 4, 12), lining, [0, -0.075, 0], leg);
    const foot = part(new THREE.SphereGeometry(0.036, 16, 12), cloth, [0, -0.164, 0.02], leg);
    foot.scale.set(0.78, 0.65, 1.5);
    const arm = new THREE.Group(); arm.position.set(side * 0.091, 0.422, 0); body.add(arm);
    arm.rotation.z = side * 0.18;
    part(new THREE.CapsuleGeometry(0.027, 0.11, 4, 12), cloth, [side * 0.014, -0.072, 0.017], arm);
    part(new THREE.SphereGeometry(0.024, 16, 12), lining, [side * 0.014, -0.15, 0.017], arm);
    return { leg, arm, side };
  });
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(47,61,74,0.65)'); gradient.addColorStop(1, 'rgba(47,61,74,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.47), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.011; traveller.add(shadow);
  const fadingMaterials = [...new Set(parts.map((object) => object.material))];
  let stride = 0, motion = 0, facing = 0;
  function updateTraveller(game, dt, clock, reducedMotion) {
    const moving = game.phase === 'moving';
    if (game.phase === 'intro') { stride = 0; motion = 0; facing = Math.atan2(game.direction[0], game.direction[2]); }
    const target = Math.atan2(game.direction[0], game.direction[2]);
    const turn = Math.atan2(Math.sin(target - facing), Math.cos(target - facing));
    facing += turn * (reducedMotion ? 1 : 1 - Math.exp(-dt * 16));
    motion = THREE.MathUtils.damp(motion, moving && !reducedMotion ? 1 : 0, 15, dt);
    if (moving) stride += dt * 12;
    body.rotation.y = facing;
    body.position.y = Math.abs(Math.sin(stride)) * 0.009 * motion;
    robe.scale.y = reducedMotion ? 1 : 1 + Math.sin(clock * 1.8) * 0.006 * (1 - motion);
    cape.rotation.x = Math.sin(stride) * 0.025 * motion;
    for (const { leg, arm, side } of limbs) {
      leg.rotation.x = Math.sin(stride) * 0.48 * motion * side;
      arm.rotation.x = -Math.sin(stride) * 0.23 * motion * side;
    }
    for (const material of fadingMaterials) material.opacity = 1 - game.finishProgress;
    shadow.material.opacity = 0.5 * (1 - game.finishProgress);
  }
  return { traveller, body, shadow, updateTraveller };
}
