const positions = {
  S: [-5, 0, 4], U: [-3, 0, 4], V: [-1, -2, 2], H: [1, -2, 2], J: [1, 0, 0],
  L: [3, 2, 2], K: [3, 2, -0.5], N: [3, 2, -2.5], O: [1, 4, -0.5], G: [0, 4, -0.5], E: [-1, 4, -0.5],
};
const fixedEdges = [['S', 'U'], ['V', 'H'], ['H', 'J'], ['L', 'K'], ['K', 'N'], ['O', 'G'], ['G', 'E']];
const seams = [{ nodes: ['U', 'V'], view: 'B' }, { nodes: ['J', 'L'], view: 'A' }, { nodes: ['N', 'O'], view: 'B' }];

export const VIEWPOINT_LEVEL = {
  id: 7, title: '换景之庭', chapter: '第七章', titleLines: ['换景', '之庭'],
  intro: ['山与墙之间，', '藏着另一条归路。'], startLabel: '步入新篇',
  help: '站在铜环观景台 · 改变视角 · 发现道路',
  ending: '视线，成为道路。', endingLine: '同一座庭院，藏着不止一种相逢。',
  center: [0, 0.7, 1.5], positions, stops: ['S', 'H', 'K', 'G', 'E'], start: 'S', goal: 'E',
  initial: { view: 'A' }, seam: [], seams, fixedEdges,
  position: (node) => [...positions[node]],
  edges: (state) => [...fixedEdges, ...seams.filter((seam) => seam.view === state.view).map((seam) => seam.nodes)],
  actions: {
    view: { nodes: ['S', 'H', 'K'], duration: 1, reducedDuration: 0.12, phase: 'viewing',
      label: (game) => game.state.view === 'A' ? '转向西侧' : '转向东侧',
      change: (state) => ({ view: state.view === 'A' ? 'B' : 'A' }),
      invalid: '站稳在铜环观景台，再改变视角', busy: '视线转过，等道路重新相逢' },
  },
  visuals: (state) => ({ cameraYaw: state.view === 'A' ? Math.PI / 4 : -Math.PI / 4 }),
  angleKeys: ['cameraYaw'],
  initialHint: '观察悬梁的断口，从观景台转向另一侧',
  blockedHint: '这个角度还没有连成道路。回到观景台，看看另一侧',
  arrivalHint: (game) => ({ H: '塔墙后面，还有一段向上的阶梯', K: '光门近在眼前。找找回廊与它相遇的角度' })[game.node],
  actionHint: () => '沿建筑的边缘看，哪两段路接在了一起？',
  status: (game) => `${game.state.view === 'A' ? '东侧 · ◇' : '西侧 · ◈'} / ${({ S: '入口观景台', H: '塔前观景台', K: '高处观景台', G: '门前回廊', E: '光门' })[game.node] || '途中'}`,
  hints: (game) => ['先看断口两端，不必一次走到光门。', '站在铜环上换景；同一座塔的另一面可能是一条路。',
    ({ S: '在入口转向西侧，沿悬梁走到塔前的铜环。', H: '在塔前转向东侧，沿楼梯走到高处的铜环。', K: '在高处转向西侧，再点击光门前的路面。' })[game.node] || '沿路走到光门。'],
};
