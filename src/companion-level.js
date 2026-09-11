const positions = {
  S: [-5, 1, 0], A: [-2, 1, 0], B: [1, 1, 0], TE: [4, 1, 0],
  R0: [-5, -1, 3], P: [-2, -1, 3], C: [1, -1, 3], RE: [4, -1, 3],
};
const allNodes = Object.keys(positions);

export const COMPANION_LEVEL = {
  id: 10, title: '同行之桥', chapter: '第十章', titleLines: ['同行', '之桥'], actors: true,
  intro: ['一条路需要脚步，', '另一条路需要重量。'], startLabel: '唤醒同行者',
  help: '切换旅人与岩灵 · 互相准备道路 · 一同抵达', ending: '同行，才是完整的归路。',
  endingLine: '先到达的人回身守住桥，后来者也终于抵达。', center: [-0.5, -0.2, 1.5], positions,
  stops: allNodes, start: 'S', goal: 'RE', seam: [],
  initial: { active: 'traveller', travellerNode: 'S', rockNode: 'R0', gateOpen: false, bridgeLocked: false },
  position: (node) => [...positions[node]],
  edges: (s) => s.active === 'traveller'
    ? [['S', 'A'], ['B', 'TE'], ...(s.rockNode === 'P' || s.bridgeLocked ? [['A', 'B']] : [])]
    : [...(s.gateOpen ? [['R0', 'P']] : []), ...(s.bridgeLocked ? [['P', 'C'], ['C', 'RE']] : [])],
  actions: {
    switch: { nodes: allNodes, duration: 0.2, reducedDuration: 0.05, phase: 'switching', switchActor: true,
      label: (g) => g.state.active === 'traveller' ? '切换至岩灵' : '切换至旅人',
      change: (s) => ({ active: s.active === 'traveller' ? 'rock' : 'traveller' }),
      invalid: '等当前角色站稳，再切换同行者', busy: '另一位同行者正在回应' },
    gate: { nodes: ['A'], duration: 0.7, reducedDuration: 0.12, phase: 'opening',
      available: (s) => s.active === 'traveller' && !s.gateOpen, label: '打开岩灵宽门',
      change: () => ({ gateOpen: true }), invalid: '由旅人在细桥尽头开启岩灵宽门', busy: '宽门正在升起' },
    lock: { nodes: ['B'], duration: 0.8, reducedDuration: 0.12, phase: 'locking',
      available: (s) => s.active === 'traveller' && s.rockNode === 'P' && !s.bridgeLocked, label: '锁定中桥',
      change: () => ({ bridgeLocked: true }), invalid: '让岩灵先站上重板，再由旅人在对岸锁桥', busy: '黄铜桥锁正在落下' },
  },
  visuals: (s) => ({ gateLift: s.gateOpen ? 1 : 0, bridgeLift: s.rockNode === 'P' || s.bridgeLocked ? 1 : 0,
    lockDrop: s.bridgeLocked ? 1 : 0, focus: s.active === 'traveller' ? 0 : 1 }),
  initialHint: '旅人能走过细桥。先去看看桥尽头的门闩',
  blockedHint: '两条路互相影响。看看当前是谁在行动，以及另一位站在哪里',
  arrivalHint: (g) => g.node === 'A' && g.state.active === 'traveller' ? '这里能打开岩灵面前的宽门'
    : g.node === 'P' ? '岩灵的重量托起了中桥。切回旅人继续前行'
      : g.node === 'B' ? '在这里锁住中桥，岩灵才能离开重板' : '',
  actionHint: (g) => g.state.bridgeLocked ? '中桥已经固定，两条路都可以继续'
    : g.state.gateOpen ? '宽门已开。切换岩灵，让它走到重板上' : '细桥尽头的门闩属于旅人',
  status: (g) => `${g.state.active === 'traveller' ? '旅人 ◇' : '岩灵 ◆'} / 宽门${g.state.gateOpen ? '已开' : '关闭'} / 中桥${g.state.bridgeLocked ? '已锁' : g.state.rockNode === 'P' ? '被托起' : '落下'}`,
  hints: (g) => ['旅人走细桥，岩灵承受重量；切换不会移动另一位同行者。', '旅人先开宽门，岩灵压住重板；旅人过桥后要锁住它。',
    g.state.active === 'traveller' ? g.state.travellerNode === 'A' ? '打开宽门，然后切换岩灵。' : '去中桥对岸锁桥，再到旅人的光门。'
      : g.state.rockNode === 'R0' ? '宽门打开后，让岩灵走到重板 P。' : '桥锁定后，让岩灵离开重板走到自己的光门。'],
  isWon: (g) => g.state.travellerNode === 'TE' && g.state.rockNode === 'RE',
};
