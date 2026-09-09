const turn = (n) => (n + 4) % 4;
export const radial = (radius, step, y = 0) => [Math.cos(step * Math.PI / 2) * radius, y, -Math.sin(step * Math.PI / 2) * radius];
const ringPositions = {
  H: [0, 0, 0], S: [8.2, 0, 0], W: [-6.6, 0, 0], E: [0, 0, -8.4],
  B0: [6.6, 0, 0], B1: [0, 0, -6.6], B3: [0, 0, 6.6],
  D: [-6.6, -3.4, -5.4], F: [1.2, -3.4, -5.4], V: [1.2, -3.4, -3.4], Q: [-0.8, -3.4, -3.4],
  ...Object.fromEntries([0, 1, 2, 3].map((n) => ['M' + n, radial(3.2, n)])),
};
const terminal = (outer) => ['B0', 'B1', 'W', 'B3'][outer];
const ringPosition = (p, node, state) => node === 'I' ? radial(2.6, state.inner)
  : node === 'O' ? radial(5, state.outer) : [...p[node]];
const ringEdges = (s) => [['I', 'M' + s.inner], ['M' + s.outer, 'O'], ['O', terminal(s.outer)], ['B1', 'E']];
const coupled = (s) => ({ outer: turn(s.outer + 1), inner: turn(s.inner - 1) });
const ringVisuals = (s) => ({ outerAngle: s.outer * Math.PI / 2, innerAngle: s.inner * Math.PI / 2 });
const calm = () => '点击路面继续探索；需要时可主动查看提示。';
const base = {
  initialHint: '点击路面行走。圆形标记是控制台；需要时主动查看提示。',
  blockedHint: '这条路还不连续，观察断口和机关的位置。',
  arrivalHint: () => null, actionHint: calm, angleKeys: ['outerAngle', 'innerAngle'],
};
const rotate = {
  label: '联动转桥', nodes: ['S', 'H'], duration: 0.85, phase: 'rotating', change: coupled,
  invalid: '请回到入口或中央圆台操作主轮。', busy: '桥环转动中，停稳后再走。',
};

const fourth = {
  ...base, id: 4, title: '双环庭院', chapter: '第四章', titleLines: ['双环', '庭院'],
  intro: ['相互牵引的道路，', '也有各自的方向。'], startLabel: '走入双环',
  help: '两座桥环 · 一个联动主轮 · 一处独立校准台',
  ending: '改变彼此的关系。', endingLine: '同一个转轮，终于带来了不同的道路。',
  center: [0, -0.8, -0.8], halfHeight: 9.6,
  positions: ringPositions, position: (node, state) => ringPosition(ringPositions, node, state),
  start: 'S', goal: 'E', initial: { outer: 0, inner: 0 }, seam: ['Q', 'I'],
  stops: ['S', 'H', 'W', 'B0', 'B1', 'B3', 'M0', 'M1', 'M2', 'M3', 'D', 'F', 'V', 'E'],
  edges: (s) => [...ringEdges(s), ['S', 'B0'], ['H', 'I'], ['W', 'D'], ['D', 'F'], ['F', 'V'], ['V', 'Q'],
    ...(s.inner === 0 ? [['Q', 'I']] : [])],
  actions: {
    rotate,
    calibrate: { label: '校准内环', nodes: ['W'], duration: 0.85, phase: 'rotating',
      change: (s) => ({ inner: turn(s.inner + 1) }), invalid: '独立把手在西侧校准阁的圆台上。', busy: '内环转动中，外环保持原位。' },
  },
  visuals: ringVisuals,
  status: () => '主轮让两环反向转动；侧阁把手只连接内环。',
  hints: (g) => g.visited.has('W') ? [
    '校准阁下方的回廊，还有一个面向中央的断口。',
    '独立改变内环后，可以从下层回廊返回中央。',
    '将内环接向东侧，沿下层回廊回中央；再联动两环，接向北侧光门。',
  ] : [
    '每次转动主轮，两座桥都在移动。',
    '要改变相对朝向，需要先到西侧校准阁。',
    '在中央将双桥转向西侧，进入校准阁；这里可以单独调整内环。',
  ],
};

export const stoneX = [6, 2, -2, -6];
const fifthPositions = {
  S: [8, 0, 4], A: [6, 0, 4], B: [4, 0, 4], T: [2, 0, 4],
  C: [2, 3, 8], J: [2, 3, 2], W: [-2, 3, -2],
  U: [0, 5, 2], L: [0, 3, -2], V: [2, 5, 2], K: [-6, 5, -2], Z: [-6, 5, -4], E: [-6, 5, -6],
};
const shuttle = (direction, nodes, max, name = '石偶') => ({
  label: direction < 0 ? `${name}向东` : `${name}向西`, nodes, duration: 1.05, phase: 'sliding',
  available: (s) => direction < 0 ? s.dock > 0 : s.dock < max,
  change: (s) => ({ dock: s.dock + direction }),
  invalid: '到接驳圆台或站上石偶后操作；石偶只能沿轨道逐站移动。', busy: '石偶正在移动，到站后再迈步。',
});
const fifth = {
  ...base, id: 5, title: '借身之塔', chapter: '第五章', titleLines: ['借身', '之塔'],
  intro: ['它为你守门，', '也愿载你过河。'], startLabel: '唤醒石偶',
  help: '移动石偶 · 站上它的头顶搭乘 · 寻找独立的归路',
  ending: '把路留给彼此。', endingLine: '有了自己的归路，才能让它去守候远方。',
  center: [0, 1.4, 1.6], halfHeight: 9.4,
  positions: fifthPositions, position: (node, s) => node === 'P' ? [stoneX[s.dock], 3, 0] : [...fifthPositions[node]],
  start: 'S', goal: 'E', initial: { dock: 0, unfolded: false }, seam: [],
  stops: [...Object.keys(fifthPositions), 'P'],
  edges: (s) => [['S', 'A'], ['B', 'T'], ['T', 'C'], ['C', 'J'], ['W', 'K'], ['K', 'Z'],
    ...(s.dock === 0 ? [['A', 'B']] : []), ...(s.dock === 1 ? [['J', 'P']] : []),
    ...(s.dock === 2 ? [['W', 'P']] : []), ...(s.dock === 3 ? [['Z', 'E']] : []),
    ...(s.unfolded ? [['C', 'V'], ['V', 'U'], ['U', 'L'], ['L', 'W']] : [])],
  actions: {
    west: shuttle(1, ['S', 'A', 'C', 'J', 'P'], 3),
    east: shuttle(-1, ['S', 'A', 'C', 'J', 'P'], 3),
    unfold: { label: '展开折梯', nodes: ['W'], duration: 1.1, phase: 'unfolding', available: (s) => !s.unfolded,
      change: () => ({ unfolded: true }), invalid: '折梯的把手在对岸圆台；展开后会保持开放。', busy: '石阶正在展开，停稳后再通行。' },
  },
  visuals: (s) => ({ stoneX: stoneX[s.dock], unfolded: Number(s.unfolded), entryOpen: Number(s.dock === 0), exitOpen: Number(s.dock === 3) }),
  status: (g) => `石偶：${['东侧入口压板', '中央接驳位', '对岸接驳位', '西侧出口压板'][g.state.dock]} · 折梯${g.state.unfolded ? '已展开' : '收起'}`,
  hints: (g) => g.state.unfolded ? [
    '折梯已经成为不依赖石偶的通路。', '现在可以把石偶留给出口压板。', '回到中央接驳台，把石偶送到最西端；沿折梯回对岸，再走向光门。',
  ] : [
    '石偶的头顶，与高处的接驳露台一样平。', '对岸的折梯可以为你留下一条归路。', '进入高台，召来石偶并站上它，向西搭乘一站；下到对岸圆台展开折梯。',
  ],
};

const sixthPositions = { ...ringPositions, S: [-2, 0, 3], W: [-5, 0, -3.6], B2: [-6.6, 0, 0] };
const sixth = {
  ...base, id: 6, title: '归光天穹', chapter: '第六章', titleLines: ['归光', '天穹'],
  intro: ['先为远方安排道路，', '再将自己交给归途。'], startLabel: '走近天穹',
  help: '联动桥环 · 搭乘石偶 · 压住锁定机关',
  ending: '世界，因你而相连。', endingLine: '从一座庭院出发，终于为自己找到归途。',
  center: [-0.6, -0.8, -0.3], halfHeight: 9.3,
  positions: sixthPositions,
  position: (node, s) => node === 'P' ? [-5 * s.dock, 0, -1.6] : ringPosition(sixthPositions, node, s),
  start: 'S', goal: 'E', initial: { outer: 0, inner: 0, dock: 0 }, seam: [],
  stops: ['S', 'H', 'W', 'P', 'B0', 'B1', 'B2', 'B3', 'M0', 'M1', 'M2', 'M3', 'E'],
  edges: (s) => [...ringEdges(s).map(([a, b]) => [a, b === 'W' ? 'B2' : b]), ['S', 'H'],
    ...(s.dock === 0 ? [['H', 'P'], ...(s.inner === 1 ? [['P', 'I']] : [])] : [['P', 'W']])],
  actions: {
    rotate: { ...rotate, nodes: ['H', 'W'],
      label: (g) => g.state.dock === 1 ? '转动外环' : '联动转桥',
      available: (s, node) => node !== 'H' || s.dock !== 1,
      change: (s) => s.dock === 1 ? { outer: turn(s.outer + 1) } : coupled(s),
      invalid: '主轮在中央和观星台。内环锁住时，需在观星台操作独立的外环把手。',
    },
    west: { ...shuttle(1, ['H', 'P', 'W'], 1), label: '驶向观星台' },
    east: { ...shuttle(-1, ['H', 'P', 'W'], 1), label: '返回中央' },
  },
  visuals: (s) => ({ ...ringVisuals(s), stoneX: -5 * s.dock, locked: Number(s.dock === 1) }),
  status: (g) => g.state.dock === 1 ? '石偶压住锁板 · 内环锁定，外环可独立转动' : '石偶在中央 · 两环联动',
  hints: (g) => [
    '观星台下的压板连接着内环的锁扣。',
    '先让内环朝向北侧，再搭乘石偶去观星台，单独校准外环。',
    '在中央把内环转向北侧；乘石偶到观星台，下到圆台后将外环也转向北侧。再搭乘石偶回中央，让它补上断口；不要再转桥。',
  ],
};

export const ADVANCED_LEVELS = [fourth, fifth, sixth];
