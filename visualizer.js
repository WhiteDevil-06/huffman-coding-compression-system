/**
 * ============================================================
 *  Huffman Tree Visualizer (visualizer.js)  — v2
 *  SVG-based binary tree renderer with step-by-step animation
 *
 *  Layout Algorithm:
 *    Post-order traversal assigns leaf nodes sequential x coords.
 *    Internal nodes are centered between their two children.
 *    This guarantees: no overlaps, correct parent-child alignment,
 *    and clean symmetric subtrees.
 * ============================================================
 */

const Visualizer = (() => {
  // ─── Constants ────────────────────────────────────────────
  const NODE_R   = 26;   // node circle radius (px)
  const H_GAP    = 75;   // horizontal gap between adjacent leaf nodes
  const V_GAP    = 88;   // vertical gap between tree levels
  const PADDING  = 50;   // SVG canvas padding on all sides

  // ─── Layout: clean 2-pass post-order ──────────────────────
  /**
   * Pass 1 (single post-order traversal):
   *   - Leaf nodes get sequential x based on a shared counter.
   *   - Internal nodes get x = midpoint of their children.
   *   - All nodes get y = depth * V_GAP.
   *
   * This is the standard algorithm for drawing ordered trees
   * and guarantees no overlapping nodes.
   */
  function layoutTree(root) {
    let leafCounter = 0;

    function postOrder(node, depth) {
      if (!node) return;

      if (!node.left && !node.right) {
        // Leaf: place at next sequential horizontal slot
        node._x = leafCounter * H_GAP;
        node._y = depth * V_GAP;
        leafCounter++;
        return;
      }

      // Recurse on children first
      postOrder(node.left,  depth + 1);
      postOrder(node.right, depth + 1);

      // Internal node: horizontally centered between its children
      node._x = (node.left._x + node.right._x) / 2;
      node._y = depth * V_GAP;
    }

    postOrder(root, 0);
  }

  // ─── Bounding box helper ───────────────────────────────────
  function getBounds(root) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    function walk(node) {
      if (!node) return;
      if (node._x < minX) minX = node._x;
      if (node._x > maxX) maxX = node._x;
      if (node._y < minY) minY = node._y;
      if (node._y > maxY) maxY = node._y;
      walk(node.left);
      walk(node.right);
    }
    walk(root);
    return { minX, maxX, minY, maxY };
  }

  // ─── Main render ──────────────────────────────────────────
  function render(root, svgEl, animated = true) {
    if (!root || !svgEl) return;

    // Step 1: compute all _x, _y positions
    layoutTree(root);

    // Step 2: get bounding box
    const { minX, maxX, minY, maxY } = getBounds(root);

    // Step 3: set up SVG canvas with generous padding
    const vbX = minX - PADDING;
    const vbY = minY - PADDING;
    const vbW = (maxX - minX) + PADDING * 2;
    const vbH = (maxY - minY) + PADDING * 2 + NODE_R * 2; // extra bottom space for leaf labels

    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    // Render at native size (scrollable container handles overflow)
    svgEl.setAttribute('width',  vbW);
    svgEl.setAttribute('height', vbH);

    // Step 4: draw edges (behind nodes)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'edges');
    svgEl.appendChild(edgeGroup);

    // Step 5: draw nodes (in front of edges)
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('id', 'nodes');
    svgEl.appendChild(nodeGroup);

    let animIdx = 0;

    function drawNode(node, parent, side) {
      if (!node) return;

      const nx = node._x;
      const ny = node._y;

      // Draw edge from parent to this node
      if (parent) {
        const px = parent._x;
        const py = parent._y;

        const dx = nx - px;
        const dy = ny - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        const x1 = px + ux * NODE_R;
        const y1 = py + uy * NODE_R;
        const x2 = nx - ux * NODE_R;
        const y2 = ny - uy * NODE_R;

        // Group edge line and text to toggle visibility easily during step mode
        const edgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgeG.setAttribute('class', 'tree-edge-group');
        edgeG.setAttribute('data-child', `n${node.id}`);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toFixed(1));
        line.setAttribute('y1', y1.toFixed(1));
        line.setAttribute('x2', x2.toFixed(1));
        line.setAttribute('y2', y2.toFixed(1));
        line.setAttribute('class', 'tree-edge');
        edgeG.appendChild(line);

        // Edge label — positioned at midpoint, offset left/right
        const lx = (px + nx) / 2 + (side === 'left' ? -14 : 14);
        const ly = (py + ny) / 2 - 5;
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', lx.toFixed(1));
        lbl.setAttribute('y', ly.toFixed(1));
        lbl.setAttribute('class', `edge-label edge-label-${side === 'left' ? '0' : '1'}`);
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('dominant-baseline', 'middle');
        lbl.textContent = side === 'left' ? '0' : '1';
        edgeG.appendChild(lbl);
        
        // Setup transition for step mode
        edgeG.style.transition = 'opacity 0.3s ease';
        edgeGroup.appendChild(edgeG);
      }

      // ── Node group ──────────────────────────────────────────
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // IMPORTANT: set transform as an ATTRIBUTE (not CSS) so it doesn't
      // conflict with any CSS animation property
      g.setAttribute('transform', `translate(${nx.toFixed(1)}, ${ny.toFixed(1)})`);
      g.setAttribute('data-id', `n${node.id}`);

      const isLeaf = node.char !== null;
      g.setAttribute('class', isLeaf ? 'tree-node tree-node-leaf' : 'tree-node tree-node-internal');

      // JS-side fade-in via opacity style (safe — doesn't touch transform)
      g.style.transition = 'opacity 0.3s ease';
      if (animated) {
        g.style.opacity = '0';
        const capturedG = g;
        const capturedDelay = animIdx * 50;
        animIdx++;
        setTimeout(() => { capturedG.style.opacity = '1'; }, capturedDelay);
      } else {
        g.style.opacity = '1';
      }

      // Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('r',  NODE_R);
      g.appendChild(circle);

      if (isLeaf) {
        const charTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        charTxt.setAttribute('x', '0');
        charTxt.setAttribute('y', '-7');
        charTxt.setAttribute('text-anchor', 'middle');
        charTxt.setAttribute('dominant-baseline', 'middle');
        charTxt.setAttribute('class', 'char-label');
        charTxt.textContent = node.char === ' ' ? '␣' : node.char;
        g.appendChild(charTxt);

        const freqTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        freqTxt.setAttribute('x', '0');
        freqTxt.setAttribute('y', '9');
        freqTxt.setAttribute('text-anchor', 'middle');
        freqTxt.setAttribute('dominant-baseline', 'middle');
        freqTxt.setAttribute('class', 'freq-label');
        freqTxt.textContent = node.freq;
        g.appendChild(freqTxt);
      } else {
        const freqTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        freqTxt.setAttribute('x', '0');
        freqTxt.setAttribute('y', '0');
        freqTxt.setAttribute('text-anchor', 'middle');
        freqTxt.setAttribute('dominant-baseline', 'middle');
        freqTxt.setAttribute('class', 'freq-label');
        freqTxt.textContent = node.freq;
        g.appendChild(freqTxt);
      }

      nodeGroup.appendChild(g);

      drawNode(node.left,  node, 'left');
      drawNode(node.right, node, 'right');
    }


    drawNode(root, null, null);
  }

  // ─── Step-by-step stepper ────────────────────────────────
  let _steps    = [];
  let _stepIdx  = 0;
  let _fullRoot = null;
  let _svgEl    = null;

  function initStepper(steps, fullRoot, svgEl) {
    _steps    = steps;
    _stepIdx  = 0;
    _fullRoot = fullRoot;
    _svgEl    = svgEl;
    
    // Render the FULL tree immediately but without the staggered animation
    render(_fullRoot, _svgEl, false);
    
    // Set up step 0 (only leaves visible)
    showStep(0);
  }
  
  function showStep(index) {
    if (!_svgEl || !_steps) return;
    
    const isTopDown = _steps.some(s => s.type === 'split');

    if (isTopDown) {
      // Top-Down (Shannon-Fano): Hide everything initially
      _svgEl.querySelectorAll('.tree-node').forEach(el => el.style.opacity = '0');
      _svgEl.querySelectorAll('.tree-edge-group').forEach(el => el.style.opacity = '0');

      // The root is always visible from the beginning
      if (_fullRoot) {
        const rootEl = _svgEl.querySelector(`g[data-id="n${_fullRoot.id}"]`);
        if (rootEl) rootEl.style.opacity = '1';
      }

      for (let i = 0; i <= index; i++) {
        const step = _steps[i];
        if (step.type === 'split') {
          if (step.left) {
            const leftEl = _svgEl.querySelector(`g[data-id="n${step.left.id}"]`);
            if (leftEl) leftEl.style.opacity = '1';
            const edgeLeft = _svgEl.querySelector(`g[data-child="n${step.left.id}"]`);
            if (edgeLeft) edgeLeft.style.opacity = '1';
          }
          if (step.right) {
            const rightEl = _svgEl.querySelector(`g[data-id="n${step.right.id}"]`);
            if (rightEl) rightEl.style.opacity = '1';
            const edgeRight = _svgEl.querySelector(`g[data-child="n${step.right.id}"]`);
            if (edgeRight) edgeRight.style.opacity = '1';
          }
        }
      }
    } else {
      // Bottom-Up (Huffman): Hide internal nodes and edges originally
      const internals = _svgEl.querySelectorAll('.tree-node-internal');
      const edges = _svgEl.querySelectorAll('.tree-edge-group');
      const leaves = _svgEl.querySelectorAll('.tree-node-leaf');
      // Ensure leaves are always visible
      leaves.forEach(el => el.style.opacity = '1');
      internals.forEach(el => el.style.opacity = '0');
      edges.forEach(el => el.style.opacity = '0');
      
      for (let i = 0; i <= index; i++) {
        const step = _steps[i];
        if (step.type === 'merge') {
          const nodeEl = _svgEl.querySelector(`g[data-id="n${step.merged.id}"]`);
          if (nodeEl) nodeEl.style.opacity = '1';
          
          const edgeLeft = _svgEl.querySelector(`g[data-child="n${step.left.id}"]`);
          if (edgeLeft) edgeLeft.style.opacity = '1';
          
          const edgeRight = _svgEl.querySelector(`g[data-child="n${step.right.id}"]`);
          if (edgeRight) edgeRight.style.opacity = '1';
        }
      }
    }
  }

  function stepForward() {
    if (_stepIdx >= _steps.length - 1) return null;
    _stepIdx++;
    showStep(_stepIdx);
    return _steps[_stepIdx];
  }

  function stepBack() {
    if (_stepIdx <= 0) return null;
    _stepIdx--;
    showStep(_stepIdx);
    return _steps[_stepIdx];
  }

  function renderFull() {
    // Reveal everything
    if (_svgEl) {
      _svgEl.querySelectorAll('.tree-node-internal').forEach(el => el.style.opacity = '1');
      _svgEl.querySelectorAll('.tree-edge-group').forEach(el => el.style.opacity = '1');
    }
    _stepIdx = _steps ? _steps.length - 1 : 0;
  }

  function currentIdx()  { return _stepIdx; }
  function totalSteps()  { return _steps.length; }

  // ─── Frequency bar chart (Canvas) ────────────────────────
  function renderFreqChart(freqMap, canvasEl) {
    const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
    const maxFreq = entries[0][1];
    const ctx     = canvasEl.getContext('2d');
    const W = canvasEl.width, H = canvasEl.height;
    const barW   = Math.max(24, Math.floor((W - 40) / entries.length) - 6);
    const startX = 20;
    const bottomY = H - 30;
    const chartH  = H - 50;

    ctx.clearRect(0, 0, W, H);

    entries.forEach(([char, freq], i) => {
      const ratio = freq / maxFreq;
      const bH = Math.max(4, ratio * chartH);
      const x  = startX + i * (barW + 6);
      const y  = bottomY - bH;

      const grad = ctx.createLinearGradient(x, y, x, bottomY);
      grad.addColorStop(0, '#00d4ff');
      grad.addColorStop(1, '#0099bb');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bH, 3);
      ctx.fill();

      ctx.fillStyle = '#8892a4';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char === ' ' ? '␣' : char, x + barW / 2, bottomY + 16);

      ctx.fillStyle = '#e8eaf6';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(freq, x + barW / 2, y - 4);
    });
  }

  return {
    render,
    initStepper,
    stepForward,
    stepBack,
    renderFull,
    currentIdx,
    totalSteps,
    renderFreqChart
  };
})();
