/**
 * ============================================================
 *  Huffman Coding — Core Algorithm (huffman.js)
 *  DAA Project | Greedy Algorithm Implementation
 * ============================================================
 *
 *  Time Complexity:  O(n log n)
 *    - Building frequency map:  O(n)
 *    - n-1 heap insertions/extractions: O(n log n)
 *    - DFS to assign codes: O(n)
 *
 *  Space Complexity: O(n)
 *    - Heap stores at most 2n-1 nodes
 *    - Code table: O(n)
 */

// ─── Min-Heap ────────────────────────────────────────────────
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() { return this.heap.length; }

  peek() { return this.heap[0]; }

  insert(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].freq <= this.heap[i].freq) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].freq < this.heap[smallest].freq) smallest = l;
      if (r < n && this.heap[r].freq < this.heap[smallest].freq) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }

  // Return snapshot of current heap array (for visualizer)
  snapshot() {
    return this.heap.map(n => ({ char: n.char, freq: n.freq }));
  }
}

// ─── Tree Node ───────────────────────────────────────────────
class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char  = char;   // null for internal nodes
    this.freq  = freq;
    this.left  = left;
    this.right = right;
    this.id    = HuffmanNode._nextId++;
  }
}
HuffmanNode._nextId = 0;

// Reset ID counter (call before each new encode)
function resetNodeIds() { HuffmanNode._nextId = 0; }

// ─── Step 1: Frequency Map — O(n) ────────────────────────────
function buildFrequencyMap(text) {
  const freq = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}

// ─── Step 2: Build Huffman Tree — O(n log n) ─────────────────
/**
 * Greedy Choice: always merge the two nodes with MINIMUM frequency.
 * This is the greedy step — at each iteration we make the locally
 * optimal choice (smallest weights merge first), which leads to the
 * globally optimal prefix-free code (proved by exchange argument).
 *
 * @returns { root, steps } where steps = array of merge snapshots
 */
function buildHuffmanTree(freqMap) {
  resetNodeIds();
  const heap = new MinHeap();
  const steps = [];   // for animation

  // Initialize heap with leaf nodes
  const initNodes = [];
  for (const [char, freq] of Object.entries(freqMap)) {
    const node = new HuffmanNode(char, freq);
    initNodes.push({ char, freq, id: node.id });
    heap.insert(node);
  }

  steps.push({
    type: 'init',
    heap: heap.snapshot(),
    description: `Initialized min-heap with ${initNodes.length} leaf node(s).`
  });

  // Greedy Merging Loop — runs n-1 times, each O(log n)
  let iteration = 0;
  while (heap.size() > 1) {
    iteration++;
    const left  = heap.extractMin();   // smallest freq
    const right = heap.extractMin();   // second smallest

    const merged = new HuffmanNode(null, left.freq + right.freq, left, right);

    steps.push({
      type: 'merge',
      iteration,
      left:  { char: left.char,  freq: left.freq,  id: left.id  },
      right: { char: right.char, freq: right.freq, id: right.id },
      merged: { freq: merged.freq, id: merged.id },
      heap: heap.snapshot(),
      description: `Merge [${nodeLabel(left)}:${left.freq}] + [${nodeLabel(right)}:${right.freq}] → internal[${merged.freq}]`
    });

    heap.insert(merged);
  }

  const root = heap.extractMin();
  steps.push({ type: 'complete', description: 'Huffman tree construction complete.' });

  return { root, steps };
}

function nodeLabel(node) {
  return node.char === null ? '∅' : (node.char === ' ' ? 'SPC' : node.char);
}

// ─── Step 3: Generate Codes — O(n) DFS ───────────────────────
function generateCodes(root) {
  const codes = {};
  function dfs(node, code) {
    if (!node) return;
    if (node.char !== null) {          // leaf node
      codes[node.char] = code || '0'; // single-char edge case
      return;
    }
    dfs(node.left,  code + '0');
    dfs(node.right, code + '1');
  }
  dfs(root, '');
  return codes;
}

// ─── Step 4: Encode ──────────────────────────────────────────
function encode(text) {
  if (!text || text.length === 0) return null;

  const freqMap = buildFrequencyMap(text);
  const { root, steps } = buildHuffmanTree(freqMap);
  const codes   = generateCodes(root);

  let encoded = '';
  for (const ch of text) {
    encoded += codes[ch];
  }

  const stats = compressionStats(text, encoded, codes);

  return { encoded, codes, freqMap, root, steps, stats, originalText: text };
}

// ─── Step 5: Decode ──────────────────────────────────────────
/**
 * Prefix-free property guarantees unambiguous decoding.
 * Walk the tree bit-by-bit; emit character when leaf is reached.
 */
function decode(bits, root) {
  if (!bits || !root) return '';

  // Single character tree
  if (root.char !== null) {
    return root.char.repeat(bits.length);
  }

  let result = '';
  let current = root;
  for (const bit of bits) {
    current = bit === '0' ? current.left : current.right;
    if (current.char !== null) {
      result += current.char;
      current = root;
    }
  }
  return result;
}

// ─── Statistics / Comparison ─────────────────────────────────
function compressionStats(text, encodedBits, codes) {
  const originalBits   = text.length * 8;          // fixed 8-bit ASCII
  const compressedBits = encodedBits.length;
  const ratio          = compressedBits / originalBits;
  const savings        = ((1 - ratio) * 100).toFixed(2);

  const avgCodeLen = Object.entries(codes).reduce((sum, [ch, code]) => {
    // weighted average code length
    return sum; // computed below
  }, 0);

  // Weighted average code length = Σ p(c) * len(c)
  const totalChars = text.length;
  const weightedAvg = Object.entries(codes).reduce((sum, [ch, code]) => {
    const freq = [...text].filter(c => c === ch).length;
    return sum + (freq / totalChars) * code.length;
  }, 0);

  return {
    originalBits,
    compressedBits,
    ratio: ratio.toFixed(4),
    savings,
    avgCodeLen: weightedAvg.toFixed(2),
    originalBytes: text.length,
    compressedBytes: (compressedBits / 8).toFixed(2)
  };
}

// ─── Fixed vs Variable Comparison Table ──────────────────────
function buildComparisonTable(text, codes, freqMap) {
  const rows = [];
  const totalChars = text.length;

  for (const [char, code] of Object.entries(codes)) {
    const freq      = freqMap[char];
    const fixedBits = 8;
    const varBits   = code.length;
    rows.push({
      char:       char === ' ' ? 'SPACE' : char,
      freq,
      prob:       (freq / totalChars * 100).toFixed(1) + '%',
      fixedCode:  char.charCodeAt(0).toString(2).padStart(8, '0'),
      fixedBits,
      huffCode:   code,
      varBits,
      fixedTotal: fixedBits * freq,
      varTotal:   varBits   * freq,
      saving:     ((fixedBits - varBits) * freq)
    });
  }

  // Sort by frequency descending
  rows.sort((a, b) => b.freq - a.freq);

  const totalFixed = rows.reduce((s, r) => s + r.fixedTotal, 0);
  const totalVar   = rows.reduce((s, r) => s + r.varTotal,   0);

  return { rows, totalFixed, totalVar, savedBits: totalFixed - totalVar };
}

// ─── Exports (global for browser use) ────────────────────────
window.Huffman = {
  encode,
  decode,
  buildComparisonTable,
  nodeLabel
};
