const firstPositions = {
  S: [0, 0, -9], W: [0, 0, -7], I: [0, 0, -5], H: [0, 0, 0],
  R1: [2, 0, 0], R2: [4, 0, 0], Q: [6, 2, 2],
  F: [8, 2, 2], G: [9, 2, 2], E: [10, 2, 2],
};
const towerPositions = {
  S2: [0, 0, -6], B: [0, 0, -2], P: [0, 0, 0],
  U: [2, 4, 0], T: [6, 4, 0], C: [6, 2, 6],
  N: [4, 2, 6], F: [0, -2, 2], V: [-2, -2, 2], E2: [-4, -2, 2],
};
const lanternPositions = {
  S3: [11, 0, -2], C: [11, 0, 0], X: [9, 0, 0], Y: [7, 0, 0], A: [5, 0, 0],
  H: [0, 0, 0], R1: [2, 0, 0], R2: [4, 0, 0],
  T: [2, 2, -2], Z: [2, 2, -4], K: [2, 2, -6], E3: [2, 2, -8],
};
const rotatedPosition = (positions, node, state) => state.orientation === 'B' && ['R1', 'R2'].includes(node)
  ? [0, 0, -positions[node][0]] : [...positions[node]];

export const LEVELS = [
  {
    id: 1, title: '回光庭院', chapter: '第一章', titleLines: ['回光', '庭院'],
    intro: ['路的尽头，', '也许是另一段开始。'], startLabel: '走进庭院',
    help: '点击行走 · 转动桥梁 · 抵达光门', ending: '光，一直都在。', endingLine: '有时，前行需要先回到中间。',
    center: [3.2, -0.9, -1.8], halfHeight: 7.6,
    positions: firstPositions, stops: ['S', 'W', 'I', 'H', 'R1', 'F', 'G', 'E'],
    start: 'S', goal: 'E', initial: { orientation: 'A' }, seam: ['R2', 'Q'],
    position: (node, state) => rotatedPosition(firstPositions, node, state),
    edges: (state) => [
      ['S', 'W'], ['W', 'I'], ['H', 'R1'], ['R1', 'R2'], ['Q', 'F'], ['F', 'G'], ['G', 'E'],
      state.orientation === 'A' ? ['R2', 'Q'] : ['I', 'R2'],
    ],
    actions: {
      rotate: { nodes: ['W', 'H'], duration: 0.8, phase: 'rotating',
        change: (state) => ({ orientation: state.orientation === 'A' ? 'B' : 'A' }),
        invalid: '先站到带圆形标记的平台上，再转动桥梁', busy: '等桥梁停稳，再往前走' },
    },
    visuals: (state) => ({ bridgeAngle: state.orientation === 'A' ? 0 : Math.PI / 2 }),
    initialHint: '点击圆形标记，走到前方的平台', blockedHint: '道路尚未接通，试着转动桥梁',
    arrivalHint: (game) => game.node === 'W' ? '点击金色把手，转动桥梁'
      : game.node === 'H' ? '这里不会随桥旋转。站稳，再转一次' : null,
    actionHint: (game) => game.orientation === 'B' ? '道路接上了，走到桥另一端的圆形平台'
      : game.node === 'H' ? '沿着相接的道路，走向光门' : '桥转向了远方，入口还需要一条路',
  },
  {
    id: 2, title: '浮阶之塔', chapter: '第二章', titleLines: ['浮阶', '之塔'],
    intro: ['同一座塔，', '也能成为另一条路。'], startLabel: '走近浮阶',
    help: '点击行走 · 搭乘升降塔 · 寻找另一层路', ending: '路，在起落之间。', endingLine: '离开熟悉的位置，才看见它的另一种用途。',
    center: [1, 0.2, 1], halfHeight: 7.8,
    positions: towerPositions, stops: ['S2', 'B', 'P', 'U', 'T', 'C', 'V', 'E2'],
    start: 'S2', goal: 'E2', initial: { height: 'low' }, seam: ['N', 'F'],
    position: (node, state) => {
      const p = [...towerPositions[node]];
      if (['P', 'F'].includes(node) && state.height === 'high') p[1] += 4;
      return p;
    },
    edges: (state) => [
      ['S2', 'B'], ['U', 'T'], ['T', 'C'], ['C', 'N'],
      ...(state.height === 'low' ? [['B', 'P'], ['N', 'F'], ['F', 'V'], ['V', 'E2']] : [['P', 'U']]),
    ],
    actions: {
      lift: { nodes: ['B', 'P', 'C'], duration: 1, phase: 'elevating',
        change: (state) => ({ height: state.height === 'low' ? 'high' : 'low' }),
        invalid: '到圆形控制台，或站上塔顶，再操作升降', busy: '等升降塔停稳，再迈步' },
    },
    visuals: (state) => ({ liftOffset: state.height === 'high' ? 4 : 0 }),
    initialHint: '先走到前方圆台，再站上升降塔', blockedHint: '这层道路还没接通，看看升降塔的位置',
    arrivalHint: (game) => ({ B: '塔顶是搭乘台，走上去试试', P: '站稳了，可以让塔升起来',
      U: '离开塔顶，沿着高处回廊走', T: '沿台阶走到另一侧的圆形控制台', C: '你已经离开了塔。让它降下，再看看下层侧廊' })[game.node],
    actionHint: (game) => game.height === 'high' ? '塔顶接上高处了，沿回廊走到另一侧'
      : game.node === 'C' ? '侧廊接上了，沿眼前的路走向光门' : '塔回到低处，可以重新搭乘',
  },
  {
    id: 3, title: '借光回廊', chapter: '第三章', titleLines: ['借光', '回廊'],
    intro: ['留一盏灯，', '为下一段路守候。'], startLabel: '步入回廊',
    help: '移动灯台开门 · 转桥接路 · 抵达光门', ending: '借光，继续前行。', endingLine: '三段道路，三种看见世界的方式。',
    center: [3, -0.4, -1.5], halfHeight: 8.2,
    positions: lanternPositions, stops: ['S3', 'C', 'X', 'Y', 'A', 'H', 'R1', 'Z', 'K', 'E3'],
    start: 'S3', goal: 'E3', initial: { orientation: 'B', lamp: 'right' }, seam: ['R2', 'T'],
    position: (node, state) => rotatedPosition(lanternPositions, node, state),
    edges: (state) => [
      ['S3', 'C'], ['C', 'X'], ['Y', 'A'], ['H', 'R1'], ['R1', 'R2'], ['T', 'Z'], ['K', 'E3'],
      state.lamp === 'left' ? ['X', 'Y'] : ['Z', 'K'],
      state.orientation === 'A' ? ['R2', 'A'] : ['R2', 'T'],
    ],
    actions: {
      rotate: { nodes: ['C', 'H'], duration: 0.8, phase: 'rotating',
        change: (state) => ({ orientation: state.orientation === 'A' ? 'B' : 'A' }),
        invalid: '先回到入口或中间的圆台，再转动桥梁', busy: '等桥梁停稳，再往前走' },
      lamp: { nodes: ['C', 'H'], duration: 0.65, phase: 'sliding',
        change: (state) => ({ lamp: state.lamp === 'left' ? 'right' : 'left' }),
        invalid: '先回到入口或中间的圆台，再移动灯台', busy: '灯台正在移向另一块压板' },
    },
    visuals: (state) => ({ bridgeAngle: state.orientation === 'A' ? 0 : Math.PI / 2, lampOffset: state.lamp === 'left' ? -1.2 : 1.2 }),
    initialHint: '走到入口圆台，观察灯台与两道门', blockedHint: '门和桥都要接通。看看压板，再看看桥的方向',
    arrivalHint: (game) => ({ C: '左压板守住入口门。点灯台移动，再转桥接路',
      H: '在这里重新安排灯台与桥，让出口一侧接通', Z: '出口门由右压板打开；需要时可以回到中间圆台' })[game.node],
    actionHint: (game) => game.node === 'H'
      ? game.lamp === 'right' && game.orientation === 'B' ? '门与桥都接上了，走向光门' : '出口需要右压板，也需要桥接向高处'
      : game.lamp === 'left' && game.orientation === 'A' ? '入口接通了，走到中间的圆台' : '入口需要左压板，也需要桥转向这里',
  },
];

// The visible treads and the traveller use the same staircase height profile.
export function stairHeight(z) {
  return 4 - Math.floor(Math.min(Math.max(z / 6, 0), 1) * 24 + 1e-8) / 12;
}
