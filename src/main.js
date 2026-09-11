import * as THREE from 'three';
import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { createLevel as createFirst, PALETTE } from './level-01.js';
import { createLevel as createTower } from './level-02.js';
import { createLevel as createLantern } from './level-03.js';
import { createAdvanced } from './level-advanced.js';
import { createLevel as createViewpoint } from './level-07.js';
import { createLevel as createMirror } from './level-08.js';
import { createLevel as createFold } from './level-09.js';
import { createLevel as createCompanion } from './level-10.js';
import { createLevel as createFoldMirror } from './level-11.js';
import { createLevel as createFinale } from './level-12.js';
import { disposeLevel } from './world.js';
import { createInput } from './input.js';
import './style.css';

const factories = [createFirst, createTower, createLantern, ...[3, 4, 5].map((index) => (scene) => createAdvanced(scene, index)), createViewpoint, createMirror, createFold, createCompanion, createFoldMirror, createFinale];
const ui = Object.fromEntries(['scene', 'intro', 'start', 'reset', 'rotate', 'aux-control', 'hint', 'ending', 'replay', 'next', 'chapter-select', 'error', 'error-message', 'reload', 'footer-state', 'action-dock', 'action-buttons', 'mechanism-state', 'help'].map((id) => [id, document.getElementById(id)]));
ui.reload.addEventListener('click', () => location.reload());

function showError(message) {
  ui['error-message'].textContent = message;
  ui.error.hidden = false;
  for (const name of ['intro', 'ending', 'action-dock', 'reset']) ui[name].hidden = true;
  ui['chapter-select'].disabled = true;
}

function boot() {
  const context = ui.scene.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) { showError('需要支持 WebGL2 的浏览器。请检查浏览器图形加速设置，或使用较新的 Chrome、Edge、Safari。'); return; }
  const renderer = new THREE.WebGLRenderer({ canvas: ui.scene, context, alpha: true, antialias: true });
  renderer.setClearColor(PALETTE.background, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const sky = new THREE.HemisphereLight('#fff7e9', '#899cad', 1.8);
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff5db', 2.7);
  sun.position.set(-4, 10, 8);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 100);
  let level, game, removeInput, viewBounds;
  let index = 0, last = performance.now(), clock = 0, previousUI = '', targetUntil = 0;
  let contextLost = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const actionButtons = [ui.rotate, ui['aux-control']];

  function project(position) {
    const p = new THREE.Vector3(...position).project(camera);
    const rect = ui.scene.getBoundingClientRect();
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
  }
  function aimCamera(yaw) {
    const center = new THREE.Vector3(...game.level.center);
    camera.position.copy(center).add(new THREE.Vector3(Math.sin(yaw) * Math.SQRT2 * 14, 14, Math.cos(yaw) * Math.SQRT2 * 14));
    camera.lookAt(center);
    camera.updateMatrixWorld();
  }
  function resize() {
    if (!game || contextLost) return;
    const top = document.querySelector('.header').getBoundingClientRect().bottom + 12;
    const bottom = ui['action-dock'].getBoundingClientRect().top - 12;
    const w = window.innerWidth, h = Math.max(160, bottom - top);
    ui.scene.style.top = `${top}px`;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    const halfHeight = Math.max((viewBounds.maxY - viewBounds.minY) / 2 + 0.65, ((viewBounds.maxX - viewBounds.minX) / 2 + 0.8) / (w / h));
    const halfWidth = halfHeight * w / h;
    const offset = w >= 1000 ? Math.min(halfWidth * 0.16, halfWidth - (viewBounds.maxX - viewBounds.minX) / 2 - 0.4) : 0;
    const cx = (viewBounds.minX + viewBounds.maxX) / 2 - offset, cy = (viewBounds.minY + viewBounds.maxY) / 2;
    camera.left = cx - halfWidth;
    camera.right = cx + halfWidth;
    camera.top = cy + halfHeight;
    camera.bottom = cy - halfHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function syncUI() {
    if (contextLost) return;
    const key = `${game.phase}/${game.node}/${JSON.stringify(game.state)}/${game.hint}/${game.starting}`;
    if (key === previousUI) return;
    previousUI = key;
    ui.intro.hidden = game.phase !== 'intro';
    ui.intro.classList.toggle('leaving', game.starting);
    ui.start.disabled = game.starting;
    ui.reset.hidden = game.phase === 'intro';
    ui.ending.hidden = game.phase !== 'won';
    ui.next.hidden = game.phase !== 'won' || index === factories.length - 1;
    const inactive = ['intro', 'finishing', 'won'].includes(game.phase);
    const actions = Object.keys(game.level.actions);
    for (let i = 0; i < actionButtons.length; i++) {
      const button = actionButtons[i], action = actions[i];
      button.hidden = inactive || !game.level.actions[action];
      if (!action) continue;
      button.dataset.action = action;
      const ready = game.canAct(action);
      button.classList.toggle('ready', ready);
      button.setAttribute('aria-disabled', String(!ready));
      button.classList.toggle('turning', Boolean(game.action));
      const rule = game.level.actions[action];
      const fallback = action === 'lamp' ? game.lamp === 'left' ? '移向右板' : '移向左板'
        : game.level.id === 2 ? game.height === 'low' ? '升起塔台' : '降下塔台' : '转动桥梁';
      const label = typeof rule.label === 'function' ? rule.label(game) : rule.label || fallback;
      button.querySelector('span').textContent = label;
      button.setAttribute('aria-label', label);
      button.title = ready ? label : rule.invalid;
    }
    ui.rotate.querySelector('path').setAttribute('d', game.level.id === 7 ? 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
      : game.level.id === 2 ? 'M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5' : 'M19 8a8 8 0 1 0 1 7M19 3v5h-5');
    ui.help.hidden = inactive || !game.level.hints;
    ui.help.disabled = game.phase !== 'idle';
    ui.help.textContent = game.hintStep ? '进一步提示' : '查看提示';
    ui['mechanism-state'].textContent = inactive ? '' : game.level.status?.(game) || '到圆形控制台操作机关';
    ui.hint.hidden = inactive;
    ui.hint.textContent = game.hint;
    ui['footer-state'].textContent = game.phase === 'won' ? '每一步，都有新的可能' : game.phase === 'intro' ? '慢一点，换个角度看' : '点击路面行走';
    document.body.dataset.phase = game.phase;
    document.body.dataset.level = game.level.id;
    document.body.dataset.realm = game.state.realm || '';
    document.body.dataset.actor = game.state.active || '';
  }
  function reset() {
    game.reset(); targetUntil = 0; level.destination.visible = false;
    syncUI();
  }
  function loadChapter(nextIndex) {
    if (contextLost || !factories[nextIndex]) return;
    removeInput?.();
    if (level) disposeLevel(level);
    index = nextIndex;
    game = new Game(LEVELS[index]);
    level = factories[index](scene);
    const center = new THREE.Vector3(...game.level.center);
    camera.position.copy(center).add(new THREE.Vector3(14, 14, 14));
    camera.lookAt(center);
    camera.updateMatrixWorld(); level.root.updateMatrixWorld(true);
    viewBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    // Fit the entire orbit once; changing angle never pumps the orthographic zoom.
    const angles = game.visuals.cameraYaw === undefined ? [Math.PI / 4]
      : Array.from({ length: 13 }, (_, i) => -Math.PI / 4 + i * Math.PI / 24);
    for (const angle of angles) {
      if (game.visuals.cameraYaw !== undefined) aimCamera(angle);
      level.root.traverse((object) => {
        if (!object.isMesh || object === level.destination || !object.visible) return;
        object.geometry.computeBoundingBox(); const { min, max } = object.geometry.boundingBox;
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
          const v = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
          viewBounds.minX = Math.min(viewBounds.minX, v.x); viewBounds.maxX = Math.max(viewBounds.maxX, v.x);
          viewBounds.minY = Math.min(viewBounds.minY, v.y); viewBounds.maxY = Math.max(viewBounds.maxY, v.y);
        }
      });
    }
    if (game.visuals.cameraYaw !== undefined) aimCamera(game.visuals.cameraYaw);
    const title = document.getElementById('intro-title');
    title.replaceChildren(document.createTextNode(game.level.titleLines[0]), document.createElement('br'), document.createTextNode(game.level.titleLines[1]));
    ui.intro.querySelector('.chapter').textContent = game.level.chapter;
    const line = ui.intro.querySelector('.intro-line');
    line.replaceChildren(document.createTextNode(game.level.intro[0]), document.createElement('br'), document.createTextNode(game.level.intro[1]));
    ui.start.firstChild.textContent = game.level.startLabel + ' ';
    ui.intro.querySelector('.intro-help').textContent = game.level.help;
    ui.ending.querySelector('.chapter').textContent = game.level.chapter + ' · 已抵达';
    document.getElementById('ending-title').textContent = game.level.ending;
    ui.ending.querySelector('p').textContent = game.level.endingLine;
    document.querySelector('.footer span').textContent = game.level.chapter + ' / ' + factories.length + '章 · ' + game.level.title;
    ui.next.firstChild.textContent = index + 1 < factories.length ? '下一关 · ' + LEVELS[index + 1].title + ' ' : '';
    ui['chapter-select'].value = String(index);
    ui.scene.setAttribute('aria-label', game.level.title + '游戏场景，点击路面移动旅人');
    document.title = game.level.title + ' · 回光庭院';
    previousUI = ''; targetUntil = 0; last = performance.now();
    removeInput = createInput(ui.scene, camera, level, game, syncUI, (target, accepted) => {
      level.destination.position.set(...game.positionOf(target));
      level.destination.position.y += 0.02;
      level.destination.material.color.set(accepted ? PALETTE.light : PALETTE.gold);
      level.destination.visible = true;
      targetUntil = clock + (accepted ? 10 : 0.7);
    });
    while (actionButtons.length < Object.keys(game.level.actions).length) {
      const button = ui['aux-control'].cloneNode(true); button.removeAttribute('id');
      ui['action-buttons'].insertBefore(button, ui.help); actionButtons.push(button);
    }
    syncUI(); resize();
  }
  for (let i = 0; i < factories.length; i++) {
    const option = document.createElement('option');
    option.value = String(i); option.textContent = LEVELS[i].chapter + ' · ' + LEVELS[i].title;
    ui['chapter-select'].append(option);
  }
  ui['chapter-select'].addEventListener('change', () => loadChapter(Number(ui['chapter-select'].value)));
  ui.next.addEventListener('click', () => { if (game.phase === 'won') loadChapter(index + 1); });
  ui.start.addEventListener('click', () => { game.start(); syncUI(); });
  ui['action-buttons'].addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button) { game.act(button.dataset.action); syncUI(); }
  });
  ui.help.addEventListener('click', () => { game.requestHint(); syncUI(); });
  for (const button of [ui.reset, ui.replay]) button.addEventListener('click', reset);
  window.addEventListener('resize', resize);
  const layoutObserver = new ResizeObserver(resize);
  layoutObserver.observe(ui['action-dock']);
  layoutObserver.observe(document.querySelector('.header'));
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  ui.scene.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); contextLost = true;
    showError('图形连接已中断。重新加载后会从庭院入口开始。');
  });
  loadChapter(0);
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    if (document.hidden || contextLost) return;
    clock += dt;
    game.reducedMotion = reducedMotion.matches;
    game.update(dt);
    ui.scene.style.opacity = game.action?.id === 'mirror' ? Math.abs(1 - game.visuals.realmMix * 2) : 1;
    if (game.visuals.cameraYaw !== undefined) {
      const yaw = reducedMotion.matches && game.action ? game.level.visuals(game.action.to).cameraYaw : game.visuals.cameraYaw;
      aimCamera(yaw);
    }
    if (level.update) level.update(game);
    else { level.bridge.rotation.y = game.bridgeAngle; level.wheel.rotation.z = game.bridgeAngle; }
    if (level.updateActors) level.updateActors(game, dt, clock, reducedMotion.matches);
    else {
      level.traveller.position.set(...game.position);
      level.updateTraveller(game, dt, clock, reducedMotion.matches);
      level.traveller.visible = game.phase !== 'won';
    }
    if (clock > targetUntil || ['intro', 'finishing', 'won'].includes(game.phase) || game.action) level.destination.visible = false;
    level.portal.material.opacity = 0.7 + game.finishProgress * 0.3;
    syncUI();
    renderer.render(scene, camera);
  });
  if (import.meta.env.DEV) window.__courtyard = {
    snapshot: () => game.snapshot(),
    project: (node) => project(game.positionOf(node)),
    seam: () => game.level.seam.length ? ({ near: project(game.positionOf(game.level.seam[0])), far: project(game.positionOf(game.level.seam[1])) }) : null,
    seams: () => (game.level.seams || []).map(({ nodes, view }) => ({ nodes, view, points: nodes.map((node) => project(game.positionOf(node))) })),
    stops: () => game.level.stops.map((node) => ({ node, ...project(game.positionOf(node)) })),
    pick: (x, y) => removeInput.pick(x, y),
    renderer: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      version: renderer.getContext().getParameter(renderer.getContext().VERSION) }),
  };
}

try { boot(); } catch (error) {
  console.error(error);
  showError('场景未能加载，请重新打开。如果仍无法加载，请保留浏览器错误信息以便检查。');
}
