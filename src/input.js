import * as THREE from 'three';

export function createInput(canvas, camera, level, game, onChange, onTarget) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function targetAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(level.colliders, false)[0];
    if (!hit?.object.userData.targets) return null;
    const targets = hit.object.userData.targets;
    if (Object.hasOwn(game.level.actions, targets[0])) return targets[0];
    return targets.reduce((best, node) => {
      const p = new THREE.Vector3(...game.positionOf(node));
      const b = new THREE.Vector3(...game.positionOf(best));
      return hit.point.distanceToSquared(p) < hit.point.distanceToSquared(b) ? node : best;
    });
  }
  function pointerMove(event) {
    canvas.style.cursor = game.phase === 'idle' && targetAt(event) ? 'pointer' : 'default';
  }
  function click(event) {
    if (event.button !== 0) return;
    const target = targetAt(event);
    if (Object.hasOwn(game.level.actions, target)) game.act(target);
    else if (target && game.phase === 'idle') onTarget(target, game.moveTo(target));
    onChange();
  }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('click', click);
  return () => {
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('click', click);
    canvas.style.cursor = 'default';
  };
}
