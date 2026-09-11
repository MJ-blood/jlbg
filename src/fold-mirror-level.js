const real = {
  S: [-7, 0, 2], M0: [-4, 0, 2], M1: [5, 3, -1], E: [8, 3, -1],
};
const mirror = {
  M0: [-4, 0, -2], A: [-1, 0, -2], H: [2, 3, -2], M1: [5, 3, 1],
};
const allPositions = { ...real, ...mirror, S: real.S, E: real.E };

export const FOLD_MIRROR_LEVEL = {
  id: 11, title: '镜中折院', chapter: '第十一章', titleLines: ['镜中', '折院'],
  intro: ['先在镜中展开，', '再于现实收回。'], startLabel: '走入折院',
  help: '穿过两扇镜门 · 改变同一折页 · 寻找它的背面',
  ending: '收回的路，也在向前。', endingLine: '同一页建筑，在彼岸托起你，在此岸送你离开。',
  center: [0.5, 1.2, 0], positions: allPositions, start: 'S', goal: 'E',
  stops: ['S', 'M0', 'A', 'H', 'M1', 'E'], seam: [],
  initial: { realm: 'real', foldOpen: false },
  position(node, state) {
    const positions = state.realm === 'mirror' ? mirror : real;
    return [...(positions[node] || allPositions[node])];
  },
  edges: (state) => state.realm === 'real'
    ? [['S', 'M0'], ...(state.foldOpen ? [] : [['M1', 'E']])]
    : [['M0', 'A'], ['H', 'M1'], ...(state.foldOpen ? [['A', 'H']] : [])],
  actions: {
    mirror: {
      nodes: ['M0', 'M1'], duration: 0.75, reducedDuration: 0.12, phase: 'crossing',
      label: (g) => g.state.realm === 'real' ? '走入镜内' : '返回现实',
      change: (s) => ({ realm: s.realm === 'real' ? 'mirror' : 'real' }),
      transformDirection: (direction) => [direction[0], direction[1], -direction[2]],
      invalid: '走到标有 I 或 II 的固定镜门，再穿过镜面', busy: '镜盒翻到另一侧，原来的道路正在隐去',
    },
    fold: {
      nodes: ['A', 'M1'], duration: 0.9, reducedDuration: 0.14, phase: 'folding',
      available: (s, node) => (s.realm === 'mirror' && node === 'A') || (s.realm === 'real' && node === 'M1'),
      label: (g) => g.state.foldOpen ? '收起折页' : '展开折页',
      change: (s) => ({ foldOpen: !s.foldOpen }),
      invalid: '镜内低位把手能展开折页，现实高位把手能收回它', busy: '折页正绕固定铰链翻转',
    },
  },
  visuals: (s) => ({ realmMix: s.realm === 'mirror' ? 1 : 0, foldAngle: s.foldOpen ? 0 : Math.PI / 2 }),
  initialHint: '现实的高处没有入口。先看看镜门 I 内的折页背面',
  blockedHint: '当前空间或折态没有接通这段路。镜门和折页需要按不同顺序使用',
  arrivalHint: (g) => g.node === 'M0' ? '镜门 I 通往折页的操作侧'
    : g.node === 'A' ? '低位把手会把竖起的建筑展开成镜内楼梯'
      : g.node === 'M1' ? '镜门 II 的现实侧，能把折页收回并露出另一面' : '',
  actionHint: (g) => g.state.realm === 'mirror'
    ? g.state.foldOpen ? '折页已经接成镜内楼梯，向高位镜门前进' : '镜内楼梯收起了，回到低位把手重新展开'
    : g.state.foldOpen ? '展开的折页挡住现实出口，在高位把手处把它收回' : '折页背面已经成为现实的出口路',
  status: (g) => `${g.state.realm === 'real' ? '现实 ◇' : '镜内 ◈'} / 折页${g.state.foldOpen ? '展开' : '收起'}`,
  hints: (g) => ['两扇镜门在不同高度；先利用镜内的折页上楼。', '在镜内 A 展开折页，经 H 到镜门 II；回到现实后收起折页。',
    g.state.realm === 'real' ? '现实低位从镜门 I 进入；现实高位收起折页后去 E。' : '镜内从 A 展开，经 H 到 M1。'],
};
