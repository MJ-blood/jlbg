const positions = {
  S: [-5, 0, 0], M0: [-1, 0, 0], T: [-3, 3, -4], W: [-5, 3, -4], V: [-5, 3, -0.7], C: [-2.5, 3, -0.7],
  M1: [1, 3, 0], R: [1, 5, -2], Z: [1, 5, -4], E: [3, 5, -4],
};
export const MIRROR_LEVEL = {
  id: 8, title: '镜海回廊', chapter: '第八章', titleLines: ['镜海', '回廊'],
  intro: ['此岸缺失的阶梯，', '在彼岸静静等待。'], startLabel: '步入镜海',
  help: '沿路寻找镜门 · 穿镜换岸 · 为归路搭桥', ending: '彼岸，为此岸铺路。',
  endingLine: '你在镜中移动的，成为归来时脚下的路。', center: [-0.5, 1.7, 0],
  positions, start: 'S', goal: 'E', stops: ['S', 'M0', 'C', 'M1', 'R', 'Z', 'E'], seam: [],
  initial: { realm: 'real', shifted: false },
  position: (node, state) => positions[node].map((v, i) => i === 2 && state.realm === 'mirror' ? -v : v),
  edges: (state) => state.realm === 'real'
    ? [['S', 'M0'], ['M1', 'R'], ['Z', 'E'], ...(state.shifted ? [['R', 'Z']] : [])]
    : [['M0', 'T'], ['T', 'W'], ['W', 'V'], ['V', 'C'], ...(state.shifted ? [['C', 'M1']] : [])],
  actions: {
    mirror: { nodes: ['M0', 'M1'], duration: 0.75, reducedDuration: 0.12, phase: 'crossing',
      label: (g) => g.state.realm === 'real' ? '走入镜内' : '返回现实',
      change: (s) => ({ realm: s.realm === 'real' ? 'mirror' : 'real' }),
      transformDirection: (direction) => [direction[0], direction[1], -direction[2]],
      invalid: '先走到标有 I 或 II 的镜门前，再穿过镜面', busy: '镜海之间，另一岸正在显现' },
    slide: { nodes: ['C'], available: (s) => s.realm === 'mirror', duration: 1, reducedDuration: 0.15, phase: 'sliding',
      label: (g) => g.state.shifted ? '收回屏风' : '移开屏风', change: (s) => ({ shifted: !s.shifted }),
      invalid: '沿镜内楼梯走到铜环把手，再移动屏风', busy: '屏风与顶板，正一同移向另一端' },
  },
  visuals: (s) => ({ realmMix: s.realm === 'mirror' ? 1 : 0, slideOffset: s.shifted ? -3 : 0 }),
  initialHint: '残阶通不到高处。看看低位镜门里的楼梯',
  blockedHint: '这条路还未接通。留意镜门的高度，以及屏风所在的位置',
  arrivalHint: (g) => g.node === 'M0' ? '镜门 I 通向另一岸，相同的地方，也许有不同的路'
    : g.node === 'C' ? '这面屏风连着上方的顶板。试着让它们一同移动'
      : g.node === 'M1' ? '镜门 II 的另一侧，是同样高度的落脚点' : '',
  actionHint: (g) => g.state.realm === 'mirror'
    ? g.state.shifted ? '高位镜门露出来了。顶板也随屏风移到了另一处' : '镜里的楼梯是完整的。沿着它向上看看'
    : g.node === 'M1' ? '此岸的高台，接住了你在彼岸准备的道路' : '还是低处的镜门。通往高台的归路在更高处',
  status: (g) => `${g.state.realm === 'real' ? '○ 现实' : '◇ 镜内'} / ${g.state.shifted ? '屏风已移开' : '屏风在原位'} / ${({ S: '入口', M0: '镜门 I', C: '侧廊把手', M1: '镜门 II', R: '桥头', Z: '出口回廊', E: '光门' })[g.node] || '途中'}`,
  hints: (g) => ['两座镜门连接相同高度，但两岸的道路并不相同。', '镜内可以上楼；移动屏风时，留意与它相连的顶板。',
    g.state.realm === 'real' ? ['S', 'M0'].includes(g.node) ? '走到镜门 I，进入镜内后沿完整阶梯上楼。' : '从镜门 II 沿阶梯上行，经过顶板走向光门。'
      : g.state.shifted ? '走到镜门 II 返回现实。回到镜门 I 仍然只会到低处。' : '沿阶梯到侧廊铜环，移开屏风，再走向高位镜门 II。'],
};
