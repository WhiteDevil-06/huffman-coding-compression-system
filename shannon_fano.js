/**
 * ============================================================
 *  Shannon-Fano Coding — Core Algorithm (shannon_fano.js)
 *  DAA Project | Divide & Conquer Algorithm Implementation
 * ============================================================
 */

class SFNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;   // null for internal nodes
    this.freq = freq;
    this.left = left;
    this.right = right;
    this.id = SFNode._nextId++;
  }
}
SFNode._nextId = 0;

function resetSFNodeIds() { SFNode._nextId = 0; }

function buildFrequencyMapSF(text) {
  const freq = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}

function buildShannonFanoTree(freqMap) {
  resetSFNodeIds();
  const steps = [];

  const items = Object.entries(freqMap)
    .map(([char, freq]) => ({ char, freq }))
    .sort((a, b) => b.freq - a.freq);

  // Divide and conquer to build the tree
  function divide(arr) {
    if (arr.length === 0) return null;
    if (arr.length === 1) {
      return new SFNode(arr[0].char, arr[0].freq);
    }

    const totalFreq = arr.reduce((sum, item) => sum + item.freq, 0);
    let runningSum = 0;
    let minDiff = Infinity;
    let splitIdx = 0;

    // Find the split point that minimizes frequency difference
    for (let i = 0; i < arr.length - 1; i++) {
        runningSum += arr[i].freq;
        const rightSum = totalFreq - runningSum;
        const diff = Math.abs(runningSum - rightSum);
        if (diff < minDiff) {
            minDiff = diff;
            splitIdx = i;
        }
    }

    const rootNode = new SFNode(null, totalFreq);
    
    // Recursively divide
    const leftArr = arr.slice(0, splitIdx + 1);
    const rightArr = arr.slice(splitIdx + 1);
    
    rootNode.left = divide(leftArr);
    rootNode.right = divide(rightArr);
    
    return rootNode;
  }

  const root = divide(items);

  steps.push({ type: 'init', description: 'Initialized Shannon-Fano Tree. Ready to split top-down.' });

  // Generate steps using Level-Order (BFS) or Pre-order.
  // Pre-order works great for animating splits top-down.
  function recordSteps(node) {
      if (!node || node.char !== null) return;
      
      steps.push({
          type: 'split',
          parent: { id: node.id, freq: node.freq },
          left: { id: node.left.id, freq: node.left.freq, char: node.left.char },
          right: { id: node.right.id, freq: node.right.freq, char: node.right.char },
          description: `Split partition (freq: ${node.freq}) into Left (freq: ${node.left.freq}) and Right (freq: ${node.right.freq})`
      });

      recordSteps(node.left);
      recordSteps(node.right);
  }

  recordSteps(root);
  steps.push({ type: 'complete', description: 'Shannon-Fano tree construction complete.' });

  return { root, steps };
}

function generateCodesSF(root) {
  const codes = {};
  function dfs(node, code) {
    if (!node) return;
    if (node.char !== null) {
      codes[node.char] = code || '0'; // Handle edge case of single character array
      return;
    }
    dfs(node.left, code + '0');
    dfs(node.right, code + '1');
  }
  dfs(root, '');
  return codes;
}

function compressionStatsSF(text, encodedBits, codes) {
  const originalBits = text.length * 8;
  const compressedBits = encodedBits.length;
  const ratio = compressedBits / originalBits;
  const savings = ((1 - ratio) * 100).toFixed(2);

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

function encodeSF(text) {
  if (!text || text.length === 0) return null;

  const freqMap = buildFrequencyMapSF(text);
  const { root, steps } = buildShannonFanoTree(freqMap);
  const codes = generateCodesSF(root);

  let encoded = '';
  for (const ch of text) {
    encoded += codes[ch];
  }

  const stats = compressionStatsSF(text, encoded, codes);

  return { encoded, codes, freqMap, root, steps, stats, originalText: text };
}

function decodeSF(bits, root) {
  if (!bits || !root) return '';

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

window.ShannonFano = {
  encode: encodeSF,
  decode: decodeSF
};
