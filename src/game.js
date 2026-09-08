import { LEVELS, stairHeight } from './levels.js';

export const POSITIONS = Object.freeze(LEVELS[0].positions);
export const STOPS = Object.freeze(LEVELS[0].stops);
const ease = (t) => t * t * (3 - 2 * t);
export const positionOf = (node, orientation = 'A') => LEVELS[0].position(node, { orientation });
export const edgesFor = (orientation) => LEVELS[0].edges({ orientation });

export function findPath(from, to, orientation, edges = edgesFor(orientation)) {
  const queue = [[from]];
  const visited = new Set([from]);
  for (const path of queue) {
    const current = path.at(-1);
    if (current === to) return path;
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : null;
      if (next && !visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

export class Game {
  constructor(level = LEVELS[0]) { this.level = level; this.reset(); }

  get orientation() { return this.state.orientation; }
  get height() { return this.state.height; }
  get lamp() { return this.state.lamp; }
  get bridgeAngle() { return this.visuals.bridgeAngle || 0; }
  positionOf(node) { return this.level.position(node, this.state); }
  edges() { return this.level.edges(this.state); }
  canAct(id) { return this.phase === 'idle' && Boolean(this.level.actions[id]?.nodes.includes(this.node)); }

  reset() {
    this.phase = 'intro';
    this.node = this.level.start;
    this.state = { ...this.level.initial };
    this.visuals = this.level.visuals(this.state);
    this.position = this.positionOf(this.node);
    this.direction = [0, 0, 1];
    this.path = [];
    this.action = null;
    this.elapsed = 0;
    this.segmentProgress = 0;
    this.starting = false;
    this.rotations = 0;
    this.lifts = 0;
    this.lampMoves = 0;
    this.crossings = 0;
    this.finishProgress = 0;
    this.visited = new Set();
    this.hint = this.level.initialHint;
  }

  start() {
    if (this.phase !== 'intro' || this.starting) return false;
    this.starting = true;
    this.elapsed = 0;
    return true;
  }

  moveTo(target) {
    if (this.phase !== 'idle' || !this.level.stops.includes(target)) return false;
    const path = findPath(this.node, target, null, this.edges());
    if (!path) { this.hint = this.level.blockedHint; return false; }
    if (path.length === 1) return false;
    this.path = path.slice(1);
    this.phase = 'moving';
    this.segmentProgress = 0;
    return true;
  }

  rotate() { return this.act('rotate'); }

  act(id) {
    if (this.phase !== 'idle') return false;
    const rule = this.level.actions[id];
    if (!rule) return false;
    if (!rule.nodes.includes(this.node)) { this.hint = rule.invalid; return false; }
    this.action = { id, to: { ...this.state, ...rule.change(this.state) } };
    this.phase = rule.phase;
    this.elapsed = 0;
    this.hint = rule.busy;
    return true;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.phase === 'intro' && this.starting) {
      this.elapsed += dt;
      if (this.elapsed >= 0.6) { this.phase = 'idle'; this.starting = false; }
    } else if (this.action) {
      this.elapsed += dt;
      const rule = this.level.actions[this.action.id];
      const progress = Math.min(this.elapsed / rule.duration, 1);
      const t = ease(progress);
      const from = this.level.visuals(this.state), to = this.level.visuals(this.action.to);
      for (const key of Object.keys(from)) this.visuals[key] = from[key] + (to[key] - from[key]) * t;
      // A rider is carried by the same transform as the moving architecture.
      const p = this.positionOf(this.node), q = this.level.position(this.node, this.action.to);
      this.position = p.map((v, i) => v + (q[i] - v) * t);
      if (progress === 1) {
        this.state = this.action.to;
        if (this.action.id === 'rotate') this.rotations++;
        if (this.action.id === 'lift') this.lifts++;
        if (this.action.id === 'lamp') this.lampMoves++;
        this.action = null;
        this.phase = 'idle';
        this.hint = this.level.actionHint(this);
      }
    } else if (this.phase === 'moving') {
      let remaining = dt * 1.8;
      while (this.path.length && remaining > 0) {
        const next = this.path[0];
        const from = this.positionOf(this.node), to = this.positionOf(next);
        const seam = this.level.seam.includes(this.node) && this.level.seam.includes(next);
        const distance = seam ? 0 : Math.hypot(...to.map((v, i) => v - from[i]));
        if (!seam) this.direction = to.map((v, i) => v - from[i]);
        const travel = Math.min(remaining, distance - this.segmentProgress);
        this.segmentProgress += travel;
        remaining -= travel;
        const t = distance ? Math.min(this.segmentProgress / distance, 1) : 1;
        this.position = from.map((v, i) => v + (to[i] - v) * t);
        if (this.level.id === 2 && ['T', 'C'].includes(this.node) && ['T', 'C'].includes(next)) {
          this.position[1] = stairHeight(this.position[2]);
        }
        if (t < 1) break;
        this.node = next;
        this.path.shift();
        this.segmentProgress = 0;
        if (seam) this.crossings++;
      }
      if (!this.path.length) this.arrive();
    } else if (this.phase === 'finishing') {
      this.elapsed += dt;
      this.finishProgress = Math.min(this.elapsed / 1.2, 1);
      if (this.finishProgress === 1) this.phase = 'won';
    }
  }

  arrive() {
    if (this.node === this.level.goal) {
      this.phase = 'finishing';
      this.elapsed = 0;
      this.hint = '';
      return;
    }
    this.phase = 'idle';
    if (!this.visited.has(this.node)) this.hint = this.level.arrivalHint(this) || this.hint;
    this.visited.add(this.node);
  }

  snapshot() {
    return { level: this.level.id, phase: this.phase, node: this.node, ...this.state,
      position: [...this.position], rotations: this.rotations, lifts: this.lifts, lampMoves: this.lampMoves,
      crossings: this.crossings, path: [...this.path], hint: this.hint, finishProgress: this.finishProgress };
  }
}
