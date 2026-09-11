const positions = {
  S: [-7, 0, 0], V: [-4, 0, 0], H: [-5, 1, 1], TA: [-2, 1, 1],
  TB: [1, 2, 1], TE: [4, 2, 1], R0: [-5, -1, 4], RP: [-2, -1, 4],
  RB: [1, 0, 4], RE: [4, 2, 4],
};
const allNodes = Object.keys(positions);

export const FINALE_LEVEL = {
  id: 12, title: '归海之门', chapter: '第十二章', titleLines: ['归海', '之门'], actors: true,
  intro: ['先到达的人回身，', '整座城便成为归路。'], startLabel: '走向归海之门',
  help: '换景找路 · 交替同行 · 为后来者固定末桥',
  ending: '我们一同抵达。', endingLine: '回望时，所有走过的路都在晨光里重新相连。',
  center: [-1.5, 0.3, 2], positions, stops: allNodes, start: 'S', goal: 'RE', seam: ['V', 'H'],
  angleKeys: ['cameraYaw'],
  initial: { active: 'traveller', travellerNode: 'S', rockNode: 'R0', view: 'A', wingsOpen: false, finalBridge: false },
  position: (node) => [...positions[node]],
  edges: (s) => s.active === 'traveller'
    ? [['S', 'V'], ['H', 'TA'], ...(s.view === 'B' ? [['V', 'H']] : []), ...(s.wingsOpen ? [['TA', 'TB'], ['TB', 'TE']] : [])]
    : [['R0', 'RP'], ...(s.wingsOpen ? [['RP', 'RB']] : []), ...(s.finalBridge ? [['RB', 'RE']] : [])],
  actions: {
    view: {
      nodes: ['S', 'V'], duration: 0.9, reducedDuration: 0.12, phase: 'viewing',
      available: (s) => s.active === 'traveller', label: '转动穹顶视角',
      change: (s) => ({ view: s.view === 'A' ? 'B' : 'A' }),
      invalid: '由旅人在入口观景台转动穹顶视角', busy: '破碎穹顶正转向另一侧',
    },
    switch: {
      nodes: allNodes, duration: 0.2, reducedDuration: 0.05, phase: 'switching', switchActor: true,
      available: (s) => !['S', 'V'].includes(s.travellerNode),
      label: (g) => g.state.active === 'traveller' ? '切换至岩灵' : '切换至旅人',
      change: (s) => ({ active: s.active === 'traveller' ? 'rock' : 'traveller' }),
      invalid: '旅人先穿过穹顶到达中轴，再唤醒岩灵', busy: '远处的同行者正在回应',
    },
    wings: {
      nodes: ['TA', 'RP'], duration: 1, reducedDuration: 0.14, phase: 'folding',
      available: (s) => s.travellerNode === 'TA' && s.rockNode === 'RP' && !s.wingsOpen,
      label: '展开城门双翼', change: () => ({ wingsOpen: true }),
      invalid: '让旅人与岩灵分别站上两座锚点，再展开城门双翼', busy: '两片城门正向群岛之间展开',
    },
    final: {
      nodes: ['TE'], duration: 0.85, reducedDuration: 0.12, phase: 'locking',
      available: (s) => s.active === 'traveller' && s.wingsOpen && !s.finalBridge,
      label: '固定最后一桥', change: () => ({ finalBridge: true }),
      invalid: '旅人先走到归海门背面的把手，再为岩灵固定末桥', busy: '最后一段桥正从海雾中升起',
    },
  },
  visuals: (s) => ({ cameraYaw: s.view === 'A' ? Math.PI / 4 : -Math.PI / 4,
    wingLift: s.wingsOpen ? 1 : 0, finalLift: s.finalBridge ? 1 : 0, focus: s.active === 'traveller' ? 0 : 1 }),
  initialHint: '入口前的梁在当前角度互不相接。转动穹顶看看',
  blockedHint: '先看当前视角、两位角色所在的锚点，以及尚未固定的桥',
  arrivalHint: (g) => g.node === 'H' ? '岩灵在另一条宽路等待。现在可以切换同行者'
    : ['TA', 'RP'].includes(g.node) ? '两座锚点都有人时，城门双翼才能展开'
      : g.node === 'TE' ? '先到达不是结束。这里的把手能为岩灵固定末桥' : '',
  actionHint: (g) => g.state.finalBridge ? '末桥已固定，让岩灵走完最后一段路'
    : g.state.wingsOpen ? '双翼已展开。旅人先去远端门后固定末桥'
      : g.state.view === 'B' ? '穹顶道路已经对齐，旅人可以走向中轴' : '换一个角度，寻找穹顶之间的连续轮廓',
  status: (g) => `${g.state.active === 'traveller' ? '旅人 ◇' : '岩灵 ◆'} / 视角 ${g.state.view} / 双翼${g.state.wingsOpen ? '展开' : '收起'} / 末桥${g.state.finalBridge ? '固定' : '断开'}`,
  hints: (g) => ['先让旅人通过换景抵达 H，再交替安排两位角色。', '旅人去 TA，岩灵去 RP；两边就位后展开双翼。',
    g.state.finalBridge ? '切换岩灵，从 RP 经 RB 走到 RE。' : '双翼展开后，旅人先到 TE 固定最后一桥。'],
  isWon: (g) => g.state.travellerNode === 'TE' && g.state.rockNode === 'RE',
};
