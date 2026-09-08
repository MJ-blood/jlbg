import * as THREE from 'three';
import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { createLevel as createFirst, PALETTE } from './level-01.js';
import { createLevel as createTower } from './level-02.js';
import { createLevel as createLantern } from './level-03.js';
import { disposeLevel } from './world.js';
import { createInput } from './input.js';
import './style.css';

const factories = [createFirst, createTower, createLantern];
const ui = Object.fromEntries(['scene', 'intro', 'start', 'reset', 'rotate', 'aux-control', 'hint', 'ending', 'replay', 'next', 'chapter-select', 'error', 'error-message', 'reload', 'footer-state'].map((id) => [id, document.getElementById(id)]));
ui.reload.addEventListener('click', () => location.reload());

function showError(message) {
  ui['error-message'].textContent = message;
  ui.error.hidden = false;
  for (const name of ['intro', 'ending', 'rotate', 'aux-control', 'hint', 'reset']) ui[name].hidden = true;
  ui['chapter-select'].disabled = true;
}

function boot() {
  const context = ui.scene.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) { showError('需要支持 WebGL2 的浏览器。请检查浏览器图形加速设置，或使用较新的 Chrome、Edge、Safari。'); return; }
  const renderer = new THREE.WebGLRenderer({ canvas: ui.scene, context, alpha: true, antialias: true });
  renderer.setClearColor(PALETTE.background, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff7e9', '#899cad', 2.4));
  const sun = new THREE.DirectionalLight('#fff5db', 2.4);
  sun.position.set(-4, 10, 8);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 100);
  let level, game, removeInput;
  let index = 0, last = performance.now(), clock = 0, previousUI = '', targetUntil = 0;
  let contextLost = false;

  function project(position) {
    const p = new THREE.Vector3(...position).project(camera);
    return { x: (p.x + 1) * window.innerWidth / 2, y: (1 - p.y) * window.innerHeight / 2 };
  }
  function positionControl() {
    for (const [button, position] of [[ui.rotate, level.handlePosition], [ui['aux-control'], level.auxPosition]]) {
      if (!position) continue;
      const p = project(position.toArray());
      button.style.left = `${p.x - (button === ui['aux-control'] ? 70 : 12)}px`;
      button.style.top = `${p.y - (button === ui['aux-control'] ? 60 : 45)}px`;
    }
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    const halfHeight = w < 760 ? Math.max(9, game.level.halfHeight) : game.level.halfHeight;
    const halfWidth = halfHeight * w / h;
    const offset = w >= 1000 ? halfWidth * 0.23 : 0;
    camera.left = -halfWidth - offset;
    camera.right = halfWidth - offset;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    positionControl();
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
    for (const [button, action] of [[ui.rotate, Object.keys(game.level.actions)[0]], [ui['aux-control'], 'lamp']]) {
      button.hidden = inactive || !game.level.actions[action];
      const ready = game.canAct(action);
      button.classList.toggle('ready', ready);
      button.setAttribute('aria-disabled', String(!ready));
      button.classList.toggle('turning', Boolean(game.action));
    }
    const primaryText = game.level.id === 2 ? game.height === 'low' ? '升起塔台' : '降下塔台' : '转动桥梁';
    ui.rotate.setAttribute('aria-label', primaryText);
    ui.rotate.querySelector('span').textContent = primaryText;
    ui.rotate.querySelector('path').setAttribute('d', game.level.id === 2 ? 'M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5' : 'M19 8a8 8 0 1 0 1 7M19 3v5h-5');
    ui['aux-control'].querySelector('span').textContent = game.lamp === 'left' ? '移向右板' : '移向左板';
    ui.hint.hidden = inactive;
    ui.hint.textContent = game.hint;
    ui['footer-state'].textContent = game.phase === 'won' ? '每一步，都有新的可能' : game.phase === 'intro' ? '慢一点，换个角度看' : '点击路面行走';
    document.body.dataset.phase = game.phase;
    document.body.dataset.level = game.level.id;
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
    document.querySelector('.footer span').textContent = game.level.chapter + ' / 三章 · ' + game.level.title;
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
    resize(); syncUI();
  }
  for (let i = 0; i < factories.length; i++) {
    const option = document.createElement('option');
    option.value = String(i); option.textContent = LEVELS[i].chapter + ' · ' + LEVELS[i].title;
    ui['chapter-select'].append(option);
  }
  ui['chapter-select'].addEventListener('change', () => loadChapter(Number(ui['chapter-select'].value)));
  ui.next.addEventListener('click', () => { if (game.phase === 'won') loadChapter(index + 1); });
  ui.start.addEventListener('click', () => { game.start(); syncUI(); });
  ui.rotate.addEventListener('click', () => { game.act(Object.keys(game.level.actions)[0]); syncUI(); });
  ui['aux-control'].addEventListener('click', () => { game.act('lamp'); syncUI(); });
  for (const button of [ui.reset, ui.replay]) button.addEventListener('click', reset);
  window.addEventListener('resize', resize);
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
    game.update(dt);
    if (level.update) level.update(game);
    else { level.bridge.rotation.y = game.bridgeAngle; level.wheel.rotation.z = game.bridgeAngle; }
    level.traveller.position.set(...game.position);
    level.body.position.y = game.phase === 'moving' ? Math.abs(Math.sin(clock * 11)) * 0.025 : 0;
    level.body.rotation.y = Math.atan2(game.direction[0], game.direction[2]);
    for (const part of level.body.children) part.material.opacity = 1 - game.finishProgress;
    level.shadow.material.opacity = 0.22 * (1 - game.finishProgress);
    level.traveller.visible = game.phase !== 'won';
    if (clock > targetUntil || ['intro', 'finishing', 'won'].includes(game.phase) || game.action) level.destination.visible = false;
    level.portal.material.opacity = 0.7 + game.finishProgress * 0.3;
    syncUI();
    renderer.render(scene, camera);
  });
  if (import.meta.env.DEV) window.__courtyard = {
    snapshot: () => game.snapshot(),
    project: (node) => project(game.positionOf(node)),
    seam: () => ({ near: project(game.positionOf(game.level.seam[0])), far: project(game.positionOf(game.level.seam[1])) }),
    renderer: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      version: renderer.getContext().getParameter(renderer.getContext().VERSION) }),
  };
}

try { boot(); } catch (error) {
  console.error(error);
  showError('场景未能加载，请重新打开。如果仍无法加载，请保留浏览器错误信息以便检查。');
}
