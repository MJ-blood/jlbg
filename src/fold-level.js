const positions = {
  S: [-4.75, 0, 0], A: [-2.5, 0, 0], H: [-0.5, 0, 0], D: [-2.5, -2, 0],
  P: [0.5, -2, 2], Q: [2.25, -2, 2], E: [4.25, -2, 2],
};

export const FOLD_LEVEL = {
  id: 9, title: '折页之城', chapter: '第九章', titleLines: ['折页', '之城'],
  intro: ['合上的建筑，', '也会露出新的道路。'], startLabel: '翻开城页',
  help: '转动两片建筑 · 寻找页下楼梯 · 抵达光门', ending: '城页合拢，归路展开。',
  endingLine: '有些道路在展开时出现，有些藏在收起之后。', center: [0, -0.8, 1],
  positions, stops: ['S', 'H', 'P', 'E'], start: 'S', goal: 'E', seam: [],
  initial: { leftOpen: false, rightOpen: false }, position: (node) => [...positions[node]],
  edges: (s) => [
    ...s.leftOpen ? [['S', 'A'], ['A', 'H']] : [['H', 'D'], ['D', 'P']],
    ...s.rightOpen ? [['P', 'Q'], ['Q', 'E']] : [],
  ],
  actions: {
    left: { nodes: ['S', 'H'], duration: 0.9, reducedDuration: 0.15, phase: 'folding',
      label: (g) => g.state.leftOpen ? '收起左页' : '展开左页', change: (s) => ({ leftOpen: !s.leftOpen }),
      invalid: '先走到入口或中轴的黄铜铰链旁', busy: '左页正沿铰链转动' },
    right: { nodes: ['P'], duration: 0.9, reducedDuration: 0.15, phase: 'folding',
      label: (g) => g.state.rightOpen ? '收起右页' : '展开右页', change: (s) => ({ rightOpen: !s.rightOpen }),
      invalid: '先沿页下楼梯到固定侧台', busy: '右页正沿铰链转动' },
  },
  visuals: (s) => ({ leftAngle: s.leftOpen ? 0 : Math.PI / 2, rightAngle: s.rightOpen ? 0 : -Math.PI / 2 }),
  angleKeys: ['leftAngle', 'rightAngle'], initialHint: '入口前的城页立着。试着从铰链旁将它展开',
  blockedHint: '当前折态没有连成道路。留意页板盖住了什么，又连接了什么',
  arrivalHint: (g) => ({ H: '中轴下方似乎还有阶梯。试着把走过的左页收起', P: '出口仍在断桥另一侧。侧台的铰链控制右页' })[g.node],
  actionHint: (g) => g.node === 'H' && !g.state.leftOpen ? '页板离开地面，下层楼梯露出来了'
    : g.node === 'P' && g.state.rightOpen ? '右页已经铺平，通向光门' : '观察页板转动前后，哪一层道路被露出？',
  status: (g) => `左页${g.state.leftOpen ? '展开' : '收起'} / 右页${g.state.rightOpen ? '展开' : '收起'} / ${({ S: '入口', H: '中轴', P: '固定侧台', E: '光门' })[g.node] || '途中'}`,
  hints: (g) => ['展开并不总是答案；走过的页板也许盖住了下一层。', '先用左页到中轴，再收起左页下楼；右页负责最后一段。',
    g.node === 'S' ? '在入口展开左页，走到中轴。' : g.node === 'H' ? '在中轴收起左页，沿露出的楼梯到侧台。' : '在侧台展开右页，再点击光门。'],
};
