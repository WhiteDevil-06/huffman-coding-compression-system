/**
 * ============================================================
 *  Huffman Tree Visualizer (visualizer.js)
 *  SVG-based binary tree renderer with step-by-step animation
 * ============================================================
 */

const Visualizer = (() => {
  const NODE_R    = 28;      // node circle radius
  const LEVEL_H   = 90;      // vertical spacing between levels
  const MIN_SEP   = 72;      // minimum horizontal separation

  // ─── Layout: assign x/y to each node via post-order ───────
  function layoutTree(root) {
    let counter = 0;

    function getLeafCount(node) {
      if (!node) return 0;
      if (!node.left && !node.right) return 1;
      return getLeafCount(node.left) + getLeafCount(node.right);
    }

    function assignCoords(node, depth, leftBound) {
      if (!node) return null;

      const leaves = getLeafCount(node);

      // Leaf
      if (!node.left && !node.right) {
        const pos = { x: leftBound + NODE_R + 10, y: depth * LEVEL_H + NODE_R + 20 };
        node._pos = pos;
        node._width = MIN_SEP;
        return node;
      }

      const leftLeaves  = getLeafCount(node.left);
      const rightLeaves = getLeafCount(node.right);
      const leftWidth   = Math.max(leftLeaves * MIN_SEP, MIN_SEP);
      const rightWidth  = Math.max(rightLeaves * MIN_SEP, MIN_SEP);

      assignCoords(node.left,  depth + 1, leftBound);
      assignCoords(node.right, depth + 1, leftBound + leftWidth);

      const lx = node.left  ? node.left._pos.x  : leftBound;
      const rx = node.right ? node.right._pos.x : leftBound + leftWidth;
      node._pos = { x: (lx + rx) / 2, y: depth * LEVEL_H + NODE_R + 20 };
      node._width = leftWidth + rightWidth;

      return node;
    }

    assignCoords(root, 0, 0);
  }

  // ─── Render all nodes + edges into SVG ────────────────────
  function render(root, svgEl) {
    if (!root || !svgEl) return;
    layoutTree(root);

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    function bounds(node) {
      if (!node) return;
      minX = Math.min(minX, node._pos.x);
      maxX = Math.max(maxX, node._pos.x);
      maxY = Math.max(maxY, node._pos.y);
      bounds(node.left);
      bounds(node.right);
    }
    bounds(root);

    const padding  = 50;
    const svgW = maxX - minX + padding * 2;
    const svgH = maxY + padding * 2;

    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', `${minX - padding} 0 ${svgW} ${svgH}`);
    svgEl.setAttribute('width',  svgW);
    svgEl.setAttribute('height', svgH);

    // Draw edges first (below nodes)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'edges');
    svgEl.appendChild(edgeGroup);

    // Draw nodes on top
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('id', 'nodes');
    svgEl.appendChild(nodeGroup);

    let delay = 0;
    function drawNode(node, parent, side) {
      if (!node) return;

      const { x, y } = node._pos;

      // Draw edge from parent to this node
      if (parent) {
        const px = parent._pos.x, py = parent._pos.y;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', px); line.setAttribute('y1', py + NODE_R);
        line.setAttribute('x2', x);  line.setAttribute('y2', y  - NODE_R);
        line.setAttribute('class', 'tree-edge');
        line.style.animationDelay = `${delay * 60}ms`;
        edgeGroup.appendChild(line);

        // Edge label 0/1
        const mx = (px + x) / 2;
        const my = (py + NODE_R + y - NODE_R) / 2;
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', mx + (side === 'left' ? -10 : 10));
        lbl.setAttribute('y', my);
        lbl.setAttribute('class', `edge-label edge-label-${side === 'left' ? '0' : '1'}`);
        lbl.setAttribute('dominant-baseline', 'middle');
        lbl.textContent = side === 'left' ? '0' : '1';
        edgeGroup.appendChild(lbl);
      }

      // Node group (for transform-origin animation)
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x}, ${y})`);
      const isLeaf = node.char !== null;
      g.setAttribute('class', isLeaf ? 'tree-node tree-node-leaf' : 'tree-node tree-node-internal');
      g.style.animationDelay = `${delay * 60}ms`;
      delay++;

      // Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', 0); circle.setAttribute('cy', 0);
      circle.setAttribute('r', NODE_R);
      g.appendChild(circle);

      if (isLeaf) {
        // Character label
        const charTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        charTxt.setAttribute('y', -6);
        charTxt.setAttribute('class', 'char-label');
        charTxt.setAttribute('dominant-baseline', 'middle');
        charTxt.textContent = node.char === ' ' ? '␣' : node.char;
        g.appendChild(charTxt);

        // Frequency label
        const freqTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        freqTxt.setAttribute('y', 10);
        freqTxt.setAttribute('class', 'freq-label');
        freqTxt.setAttribute('dominant-baseline', 'middle');
        freqTxt.textContent = node.freq;
        g.appendChild(freqTxt);
      } else {
        // Internal node — only frequency
        const freqTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        freqTxt.setAttribute('y', 0);
        freqTxt.setAttribute('class', 'freq-label');
        freqTxt.setAttribute('dominant-baseline', 'middle');
        freqTxt.textContent = node.freq;
        g.appendChild(freqTxt);
      }

      nodeGroup.appendChild(g);

      drawNode(node.left,  node, 'left');
      drawNode(node.right, node, 'right');
    }

    drawNode(root, null, null);
  }

  // ─── Step-by-step animation (rebuild tree after each merge) ─
  let _steps = [];
  let _stepIdx = 0;
  let _fullRoot = null;
  let _svgEl = null;

  function initStepper(steps, fullRoot, svgEl) {
    _steps   = steps;
    _stepIdx = 0;
    _fullRoot = fullRoot;
    _svgEl    = svgEl;
  }

  function stepForward() {
    if (_stepIdx >= _steps.length) return null;
    const step = _steps[_stepIdx++];
    return step;
  }

  function stepBack() {
    if (_stepIdx <= 0) return null;
    return _steps[--_stepIdx];
  }

  function renderFull() {
    render(_fullRoot, _svgEl);
  }

  function currentIdx() { return _stepIdx; }
  function totalSteps() { return _steps.length; }

  // ─── Frequency bar chart (Canvas) ────────────────────────
  function renderFreqChart(freqMap, canvasEl) {
    const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
    const maxFreq = entries[0][1];
    const ctx = canvasEl.getContext('2d');
    const W = canvasEl.width, H = canvasEl.height;
    const barW = Math.max(24, Math.floor((W - 40) / entries.length) - 6);
    const startX = 20;
    const bottomY = H - 30;
    const chartH = H - 50;

    ctx.clearRect(0, 0, W, H);

    entries.forEach(([char, freq], i) => {
      const ratio = freq / maxFreq;
      const bH = Math.max(4, ratio * chartH);
      const x = startX + i * (barW + 6);
      const y = bottomY - bH;

      // Bar
      const grad = ctx.createLinearGradient(x, y, x, bottomY);
      grad.addColorStop(0, '#00d4ff');
      grad.addColorStop(1, '#0099bb');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bH, 3);
      ctx.fill();

      // Character label
      ctx.fillStyle = '#8892a4';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char === ' ' ? '␣' : char, x + barW / 2, bottomY + 16);

      // Freq label
      ctx.fillStyle = '#e8eaf6';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(freq, x + barW / 2, y - 4);
    });
  }

  return { render, initStepper, stepForward, stepBack, renderFull, currentIdx, totalSteps, renderFreqChart };
})();
