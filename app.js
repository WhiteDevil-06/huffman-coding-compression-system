/**
 * ============================================================
 *  App Controller (app.js)
 *  Wires UI events to Huffman & Shannon-Fano + Visualizer modules
 * ============================================================
 */

// ─── Globals ─────────────────────────────────────────────────
let lastResults = { huffman: null, sf: null };
let currentAlgorithm = 'huffman';
let currentRoute = 'home';
let stepperActive = false;

// ─── Routing & Navigation ────────────────────────────────────
function initRouting() {
  document.querySelectorAll('.gn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.appRoute(btn.dataset.route);
    });
  });
}

window.appRoute = function(route) {
  currentRoute = route;
  
  // Update nav buttons
  document.querySelectorAll('.gn-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.gn-btn[data-route="${route}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Hide all routes
  document.querySelectorAll('.route-view').forEach(r => r.style.display = 'none');

  if (route === 'home') {
    document.getElementById('route-home').style.display = 'block';
  } else if (route === 'arena') {
    document.getElementById('route-arena').style.display = 'block';
  } else {
    // Engine views
    document.getElementById('route-engine').style.display = 'block';
    currentAlgorithm = route;
    renderActiveAlgorithm();
    
    // Auto-select Encoder tab when entering an engine
    document.getElementById('tab-encoder').click();
  }
}

// ─── Tab Navigation ────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + target).classList.add('active');
    });
  });
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ─── Copy to clipboard ───────────────────────────────────────
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => showToast(`✓ ${label}`));
}

// ─── ENCODER TAB ─────────────────────────────────────────────
function encodeText() {
  const text = document.getElementById('input-text').value.trim();
  if (!text) { showToast('⚠ Enter some text first!'); return; }
  if (text.length > 5000) { showToast('⚠ Text too long (max 5000 chars)'); return; }

  // Compute for both algorithms
  lastResults.huffman = Huffman.encode(text);
  lastResults.sf = ShannonFano.encode(text);

  // Render stats and comparisons
  renderActiveAlgorithm();
  renderComparisonTable(lastResults.huffman, lastResults.sf);

  // Show export buttons
  document.getElementById('btn-export-codes').style.display = '';
  document.getElementById('btn-export-bits').style.display = '';

  showToast('✓ Encoded successfully!');
  document.getElementById('results-section').style.display = 'block';
  document.getElementById('cmp-empty').style.display = 'none';
  document.getElementById('cmp-table').parentElement.style.display = 'block';
}

function renderActiveAlgorithm() {
  const isSF = currentAlgorithm === 'sf';
  
  // 1. Update UI globally based on current route, EVEN IF NO TEXT ENCODED YET
  document.querySelector('#panel-encoder h2').innerHTML = isSF ? '🔒 Shannon-Fano Encoder' : '🔒 Huffman Encoder';
  document.querySelector('#panel-tree h2').innerHTML = isSF ? '🌲 Shannon-Fano Tree Visualizer (Top-Down)' : '🌲 Huffman Tree Visualizer (Bottom-Up)';
  document.querySelector('#panel-decoder h2').innerHTML = isSF ? '🔓 Shannon-Fano Decoder' : '🔓 Huffman Decoder';

  const heroBadge = document.getElementById('engine-hero-badge');
  const heroTitle = document.getElementById('engine-hero-title');
  const heroDesc  = document.getElementById('engine-hero-desc');
  const heroTags  = document.getElementById('engine-hero-tags');

  if (isSF) {
      if (heroBadge) heroBadge.innerHTML = '<span class="dot"></span> DAA Project · Divide & Conquer';
      if (heroTitle) heroTitle.innerHTML = 'Shannon-Fano<br>Compression System';
      if (heroDesc) heroDesc.innerHTML = 'Interactive demonstration of a <strong>Divide & Conquer</strong> heuristic that builds prefix-free variable-length codes by splitting character frequencies top-down.';
      if (heroTags) heroTags.innerHTML = `
        <span class="tag tag-cyan">⏱ O(n log n) Time</span>
        <span class="tag tag-amber">💾 O(n) Space</span>
        <span class="tag tag-purple">✂️ Recursive Split</span>
        <span class="tag tag-red">⚠ Sub-Optimal Encoding</span>
      `;
  } else {
      if (heroBadge) heroBadge.innerHTML = '<span class="dot"></span> DAA Project · Greedy Algorithm';
      if (heroTitle) heroTitle.innerHTML = 'Huffman Coding<br>Compression System';
      if (heroDesc) heroDesc.innerHTML = 'Interactive demonstration of a <strong>Greedy Algorithm</strong> that builds optimal, prefix-free, variable-length codes — proved to achieve minimum expected encoding length.';
      if (heroTags) heroTags.innerHTML = `
        <span class="tag tag-cyan">⏱ O(n log n) Time</span>
        <span class="tag tag-amber">💾 O(n) Space</span>
        <span class="tag tag-purple">🌲 Min-Heap</span>
        <span class="tag tag-green">✓ Optimal Encoding</span>
      `;
  }

  applyTabIsolation();
  startFactCarousels();

  // 2. If no text has been encoded yet for this engine, stop here
  const res = lastResults[currentAlgorithm];
  if (!res) return;

  // 3. Render specific engine results
  renderFrequencyTable(res.freqMap);
  renderStats(res.stats);
  renderCodeTable(res.codes, res.freqMap, res.originalText);
  renderBitStream(res.encoded);
  renderTreeFull(res);
  updateDecoderCodebook(res);
}

function renderFrequencyTable(freqMap) {
  const container = document.getElementById('freq-grid');
  container.innerHTML = '';
  const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([ch, freq], i) => {
    const chip = document.createElement('div');
    chip.className = 'freq-chip';
    chip.style.animationDelay = `${i * 40}ms`;
    chip.innerHTML = `
      <span class="freq-char">${ch === ' ' ? '␣' : escHtml(ch)}</span>
      <span class="freq-val">${freq}</span>
    `;
    container.appendChild(chip);
  });
}

function renderStats(stats) {
  setValue('stat-original-bits',  fmtNum(stats.originalBits));
  setValue('stat-encoded-bits',   fmtNum(stats.compressedBits));
  setValue('stat-savings',        stats.savings + '%');
  setValue('stat-avg-len',        stats.avgCodeLen + ' bits');

  // Dynamically update the 'Huffman Bits' / 'SF Bits' label
  const encodedBitsEl = document.getElementById('stat-encoded-bits');
  if (encodedBitsEl && encodedBitsEl.nextElementSibling) {
    encodedBitsEl.nextElementSibling.textContent = currentAlgorithm === 'sf' ? 'Shannon-Fano Bits' : 'Huffman Bits';
  }

  // Savings bar
  const fill = document.getElementById('savings-bar-fill');
  const label = document.getElementById('savings-bar-pct');
  if (fill) {
    setTimeout(() => { fill.style.width = Math.max(0, stats.savings) + '%'; }, 50);
  }
  if (label) label.textContent = stats.savings + '% smaller';
}

function renderCodeTable(codes, freqMap, text) {
  const tbody = document.getElementById('code-table-body');
  tbody.innerHTML = '';
  const sorted = Object.entries(codes).sort((a, b) => a[1].length - b[1].length);
  sorted.forEach(([ch, code]) => {
    const tr = document.createElement('tr');
    const codeHtml = code.split('').map(b =>
      `<span class="bit-${b}">${b}</span>`
    ).join('');
    tr.innerHTML = `
      <td>${ch === ' ' ? '<em style="color:var(--text-muted)">SPACE</em>' : escHtml(ch)}</td>
      <td>${freqMap[ch]}</td>
      <td class="code-bit" style="font-family:var(--font-mono)">${codeHtml}</td>
      <td>${code.length}</td>
    `;
    tbody.appendChild(tr);
  });

  // Update table title to reflect algorithm
  const codeCardTitle = tbody.closest('.card').querySelector('.card-title');
  if (codeCardTitle) {
      codeCardTitle.textContent = currentAlgorithm === 'sf' ? 'Generated Shannon-Fano Codes' : 'Generated Huffman Codes';
  }
}

function renderBitStream(encoded) {
  const el = document.getElementById('bit-stream');
  let html = '';
  for (let i = 0; i < encoded.length; i++) {
    html += `<span class="b${encoded[i]}">${encoded[i]}</span>`;
    if ((i + 1) % 8 === 0 && i < encoded.length - 1) html += ' ';
  }
  el.innerHTML = html;
}

// ─── Tree Visualizer TAB ─────────────────────────────────────
function renderTreeFull(result) {
  const svgEl = document.getElementById('tree-svg');
  document.getElementById('tree-placeholder').style.display = 'none';
  svgEl.style.display = 'block';

  stepperActive = false;
  Visualizer.initStepper(result.steps, result.root, svgEl);
  Visualizer.renderFull();

  updateStepperUI(-1, result.steps.length, currentAlgorithm === 'sf' ? 'Full Shannon-Fano tree rendered. Use ← Step Back to replay.' : 'Full Huffman tree rendered. Use ← Step Back to replay merges.');
}

function initTreeTab() {
  document.getElementById('btn-step-fwd').addEventListener('click', () => {
    const res = lastResults[currentAlgorithm];
    if (!res) { showToast('Encode some text first!'); return; }
    
    if (!stepperActive) {
      stepperActive = true;
      Visualizer.initStepper(res.steps, res.root, document.getElementById('tree-svg'));
    }
    const step = Visualizer.stepForward();
    if (!step) {
      Visualizer.renderFull();
      stepperActive = false;
      updateStepperUI(Visualizer.totalSteps(), Visualizer.totalSteps(), 'Tree complete!');
      return;
    }
    updateStepperUI(Visualizer.currentIdx(), Visualizer.totalSteps(), step.description);

    if (step.type === 'complete') {
      Visualizer.renderFull();
      stepperActive = false;
    }
  });

  document.getElementById('btn-step-back').addEventListener('click', () => {
    const res = lastResults[currentAlgorithm];
    if (!res) return;
    Visualizer.stepBack();
    const curr = Visualizer.currentIdx();
    updateStepperUI(curr, Visualizer.totalSteps(), curr >= 0 && res.steps[curr] ? res.steps[curr].description : 'Stepped back.');
  });

  document.getElementById('btn-tree-reset').addEventListener('click', () => {
    const res = lastResults[currentAlgorithm];
    if (!res) return;
    stepperActive = true;
    Visualizer.initStepper(res.steps, res.root, document.getElementById('tree-svg'));
    updateStepperUI(0, res.steps.length, res.steps[0].description);
  });

  document.getElementById('btn-tree-full').addEventListener('click', () => {
    const res = lastResults[currentAlgorithm];
    if (!res) return;
    Visualizer.renderFull();
    stepperActive = false;
    updateStepperUI(Visualizer.totalSteps(), Visualizer.totalSteps(), 'Full tree shown.');
  });
}

function updateStepperUI(current, total, desc) {
  const info = document.getElementById('step-info');
  if (info) info.textContent = `Step ${Math.max(0, current)} / ${total} — ${desc}`;
}

// ─── COMPARISON TABLE ─────────────────────────────────────────
function renderComparisonTable(hRes, sfRes) {
  if (!hRes || !sfRes) return;
  const tbody = document.getElementById('cmp-table-body');
  tbody.innerHTML = '';
  
  const text = hRes.originalText;
  const totalChars = text.length;

  const rows = [];
  for (const [char, freq] of Object.entries(hRes.freqMap)) {
    const fixedBits = 8;
    const huffBits = hRes.codes[char].length;
    const sfBits = sfRes.codes[char].length;

    rows.push({
      char: char === ' ' ? 'SPACE' : char,
      freq,
      prob: (freq / totalChars * 100).toFixed(1) + '%',
      fixedCode: char.charCodeAt(0).toString(2).padStart(8, '0'),
      fixedTotal: fixedBits * freq,
      huffCode: hRes.codes[char],
      huffTotal: huffBits * freq,
      sfCode: sfRes.codes[char],
      sfTotal: sfBits * freq
    });
  }

  // Sort by frequency descending
  rows.sort((a, b) => b.freq - a.freq);

  let totalFixed = 0, totalHuff = 0, totalSF = 0;

  rows.forEach(row => {
    totalFixed += row.fixedTotal;
    totalHuff += row.huffTotal;
    totalSF += row.sfTotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono)">${escHtml(row.char)}</td>
      <td>${row.freq}</td>
      <td>${row.prob}</td>
      <td class="fixed-code" style="font-family:var(--font-mono);font-size:0.75rem">${row.fixedCode}</td>
      <td>${row.fixedTotal}</td>
      <td class="huff-code" style="font-size:0.82rem; color:var(--cyan);">${row.huffCode}</td>
      <td><strong>${row.huffTotal}</strong></td>
      <td class="sf-code" style="font-size:0.82rem; color:var(--purple);">${row.sfCode}</td>
      <td><strong>${row.sfTotal}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  // Total row
  const tfoot = document.getElementById('cmp-table-foot');
  if (tfoot) tfoot.innerHTML = `
    <tr class="total-row">
      <td colspan="3"><strong>TOTAL</strong></td>
      <td colspan="2" style="color:var(--text-muted)"><strong>${totalFixed} bits</strong></td>
      <td colspan="2" style="color:var(--cyan)"><strong>${totalHuff} bits</strong></td>
      <td colspan="2" style="color:var(--purple)"><strong>${totalSF} bits</strong></td>
    </tr>
  `;
}

// ─── DECODER TAB ─────────────────────────────────────────────
function updateDecoderCodebook(res) {
  // Store codes globally for decoder use
  window.currentDecoderMap = {
     root: res.root,
     codes: res.codes
  };

  const bitsInput = document.getElementById('decoder-bits');
  if (bitsInput) bitsInput.value = res.encoded;

  const codeDisplay = document.getElementById('decoder-codebook');
  if (codeDisplay) {
    const lines = Object.entries(res.codes)
      .map(([ch, code]) => `  "${ch === ' ' ? 'SPACE' : ch}": ${code}`)
      .join('\n');
    codeDisplay.textContent = '{\n' + lines + '\n}';
  }
}

function decodeText() {
  const bits = document.getElementById('decoder-bits').value.replace(/\s/g, '');
  if (!bits) { showToast('⚠ Paste encoded bits first!'); return; }
  if (!window.currentDecoderMap || !window.currentDecoderMap.root) { showToast('⚠ Encode some text first to get the tree!'); return; }

  // Validate
  if (!/^[01]+$/.test(bits)) { showToast('⚠ Only 0s and 1s allowed!'); return; }

  // Decode dynamically based on active algorithm
  const decoded = currentAlgorithm === 'sf' 
    ? ShannonFano.decode(bits, window.currentDecoderMap.root) 
    : Huffman.decode(bits, window.currentDecoderMap.root);
    
  document.getElementById('decoded-output').textContent = decoded;
  showToast(`✓ Decoded via ${currentAlgorithm === 'sf' ? 'Shannon-Fano' : 'Huffman'}!`);
}

// ─── Helpers ──────────────────────────────────────────────────
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmtNum(n) {
  return Number(n).toLocaleString();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Rotating Fact Carousels ──────────────────────────────────
const FACTS = {
  huffman: [
    {
      title: 'Key Insight: Greedy Optimality',
      text: 'Huffman assigns shorter codes to frequent characters via a Min-Heap greedy merge — provably achieving the minimum possible total encoding bits for symbol-by-symbol encoding.'
    },
    {
      title: 'Exchange Argument',
      text: 'Any optimal prefix-free tree must place the two rarest symbols as siblings at the deepest level. Huffman guarantees this by always merging the two lowest-frequency nodes first.'
    },
    {
      title: 'Entropy Bound',
      text: 'Huffman coding achieves an expected code length L* satisfying H(X) ≤ L* < H(X)+1, where H(X) is the Shannon entropy — within just 1 bit per symbol of the theoretical minimum.'
    },
    {
      title: 'Real-World Use',
      text: 'Huffman is embedded in JPEG, MP3, ZIP, and HTTP/2 HPACK. It is the entropy coding stage inside DEFLATE — the algorithm powering most of the world\'s file compression.'
    }
  ],
  sf: [
    {
      title: 'Key Insight: Divide & Conquer',
      text: 'Shannon-Fano splits characters into two groups with equal probability sums, assigning 0/1 prefixes recursively top-down — a heuristic that is fast but not always optimal.'
    },
    {
      title: 'Why It Can Fail',
      text: 'Equal-probability splitting sometimes assigns shorter codes to less frequent characters. Huffman\'s bottom-up greedy approach avoids this by irrevocably placing the rarest characters deepest.'
    },
    {
      title: 'Historical Significance',
      text: 'Shannon-Fano was proposed in Claude Shannon\'s landmark 1948 paper "A Mathematical Theory of Communication" — the founding document of information theory.'
    },
    {
      title: 'Sub-Optimality',
      text: 'Shannon-Fano\'s expected code length L always satisfies L ≥ L* (Huffman). For heavily skewed distributions, Shannon-Fano can produce significantly more bits than Huffman.'
    }
  ]
};

const DECODER_FACTS = {
  huffman: [
    {
      title: 'Why Prefix-Free Decoding Works',
      text: 'Huffman codes are prefix-free: no codeword is a prefix of another. Walk the tree bit-by-bit — Left on 0, Right on 1 — and emit a character whenever you reach a leaf. No lookahead or separators needed.'
    },
    {
      title: 'Unique Decodability',
      text: 'Because Huffman codes come from root-to-leaf paths in a binary tree, no codeword can be an ancestor of another. This structural guarantee makes decoding unambiguous and lossless.'
    },
    {
      title: 'Decoding Complexity',
      text: 'Decoding a bitstream of m bits takes O(m · depth) time, where depth ≤ n−1 (n = unique chars). In practice, average depth ≈ H(X), so decoding is extremely fast for natural text.'
    }
  ],
  sf: [
    {
      title: 'Why Prefix-Free Decoding Works',
      text: 'Shannon-Fano also produces prefix-free codes via recursive splitting. Walk the SF tree bit-by-bit — Left on 0, Right on 1 — and emit a character at every leaf. The prefix-free property holds for both algorithms.'
    },
    {
      title: 'Top-Down Tree Walk',
      text: 'Unlike Huffman trees built bottom-up, the Shannon-Fano tree is built top-down. But the decoding procedure is identical — traverse from root to leaf following each bit in the stream.'
    },
    {
      title: 'Codebook Dependency',
      text: 'Both algorithms require the receiver to have the same codebook. In practice, the tree (or code table) must be transmitted alongside the compressed data, adding a small overhead O(n log n) bits.'
    }
  ]
};

let _insightIdx = 0;
let _decoderFactIdx = 0;
let _insightTimer = null;
let _decoderTimer = null;

function renderFact(facts, idx, textId, titleId, counterId) {
  const el = document.getElementById(textId);
  const titleEl = document.getElementById(titleId);
  const counterEl = document.getElementById(counterId);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    if (titleEl) titleEl.textContent = facts[idx].title;
    el.textContent = facts[idx].text;
    if (counterEl) counterEl.textContent = `${idx + 1} / ${facts.length}`;
    el.style.opacity = '1';
  }, 400);
}

function startFactCarousels() {
  const isSF = currentAlgorithm === 'sf';
  const insightFacts = isSF ? FACTS.sf : FACTS.huffman;
  const decoderFacts = isSF ? DECODER_FACTS.sf : DECODER_FACTS.huffman;

  _insightIdx = 0;
  _decoderFactIdx = 0;

  renderFact(insightFacts, _insightIdx, 'insight-text', 'insight-title', 'insight-counter');
  renderFact(decoderFacts, _decoderFactIdx, 'decoder-fact-text', 'decoder-fact-title', 'decoder-fact-counter');

  clearInterval(_insightTimer);
  clearInterval(_decoderTimer);

  _insightTimer = setInterval(() => {
    _insightIdx = (_insightIdx + 1) % insightFacts.length;
    renderFact(insightFacts, _insightIdx, 'insight-text', 'insight-title', 'insight-counter');
  }, 15000);

  _decoderTimer = setInterval(() => {
    _decoderFactIdx = (_decoderFactIdx + 1) % decoderFacts.length;
    renderFact(decoderFacts, _decoderFactIdx, 'decoder-fact-text', 'decoder-fact-title', 'decoder-fact-counter');
  }, 15000);
}

// ─── Tab Isolation ────────────────────────────────────────────
function applyTabIsolation() {
  const isSF = currentAlgorithm === 'sf';

  // Theory Cards
  document.querySelectorAll('.theory-card[data-algo]').forEach(card => {
    const algo = card.dataset.algo;
    card.style.display = (algo === 'both' || (isSF && algo === 'sf') || (!isSF && algo === 'huffman')) ? '' : 'none';
  });

  // Complexity Cards
  document.querySelectorAll('.complexity-card[data-algo]').forEach(card => {
    const algo = card.dataset.algo;
    card.style.display = (algo === 'both' || (isSF && algo === 'sf') || (!isSF && algo === 'huffman')) ? '' : 'none';
  });

  // Complexity tab heading
  const h2 = document.getElementById('complexity-h2');
  const desc = document.getElementById('complexity-desc');
  if (h2) h2.textContent = isSF ? '📈 Complexity Analysis (Shannon-Fano)' : '📈 Complexity Analysis (Huffman)';
  if (desc) desc.textContent = isSF
    ? 'Detailed breakdown of time and space complexity for each phase of Shannon-Fano Coding.'
    : 'Detailed breakdown of time and space complexity for each phase of Huffman Coding.';
}

// ─── Export ───────────────────────────────────────────────────
function exportCodebook() {
  const res = lastResults[currentAlgorithm];
  if (!res) { showToast('Encode something first!'); return; }
  const algo = currentAlgorithm === 'sf' ? 'shannon_fano' : 'huffman';
  const obj = { algorithm: algo, codes: res.codes, stats: res.stats };
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${algo}_codebook.json`;
  a.click();
  showToast('✓ Codebook downloaded!');
}

function exportBits() {
  const res = lastResults[currentAlgorithm];
  if (!res) { showToast('Encode something first!'); return; }
  const algo = currentAlgorithm === 'sf' ? 'shannon_fano' : 'huffman';
  const blob = new Blob([res.encoded], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${algo}_encoded_bits.txt`;
  a.click();
  showToast('✓ Bits downloaded!');
}

// ─── Sample texts ─────────────────────────────────────────────
const SAMPLES = [
  'hello world',
  'abracadabra',
  'the quick brown fox jumps over the lazy dog',
  'mississippi',
  'supercalifragilisticexpialidocious',
  'to be or not to be, that is the question',
  // Heavily skewed distribution that mathematically breaks Shannon-Fano's heuristic
  'A'.repeat(35) + 'B'.repeat(17) + 'C'.repeat(17) + 'D'.repeat(16) + 'E'.repeat(15),
  // Another mathematical edge case where greedy optimal beats top-down split
  'X'.repeat(15) + 'Y'.repeat(7) + 'Z'.repeat(6) + 'W'.repeat(6) + 'V'.repeat(5)
];

function loadSample() {
  const txt = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  document.getElementById('input-text').value = txt;
  showToast(`Loaded: "${txt}"`);
}

// ─── The Arena (Phase 3) ──────────────────────────────────────
function calculateEntropy(freqMap, totalChars) {
  let entropy = 0;
  for (const freq of Object.values(freqMap)) {
    const p = freq / totalChars;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

function compareInArena() {
  const text = document.getElementById('arena-input-text').value.trim();
  if (!text) { showToast('⚠ Enter some text to compare!'); return; }
  if (text.length > 5000) { showToast('⚠ Text too long (max 5000 chars)'); return; }

  // 1. Execute & Time Huffman
  const t0Huff = performance.now();
  const hRes = Huffman.encode(text);
  const t1Huff = performance.now();
  const timeHuff = t1Huff - t0Huff;

  // 2. Execute & Time Shannon-Fano
  const t0SF = performance.now();
  const sfRes = ShannonFano.encode(text);
  const t1SF = performance.now();
  const timeSF = t1SF - t0SF;

  // Show Results Section
  document.getElementById('arena-results').style.display = 'grid';
  document.getElementById('arena-winner-container').style.display = 'block';
  document.getElementById('arena-entropy-section').style.display = 'block';

  // 3. Populate Stats
  // Huffman
  setValue('arena-huff-bits', fmtNum(hRes.stats.compressedBits));
  setValue('arena-huff-time', timeHuff.toFixed(2) + ' ms');
  setValue('arena-huff-savings', hRes.stats.savings + '%');

  // Shannon-Fano
  setValue('arena-sf-bits', fmtNum(sfRes.stats.compressedBits));
  setValue('arena-sf-time', timeSF.toFixed(2) + ' ms');
  setValue('arena-sf-savings', sfRes.stats.savings + '%');

  // 4. Code Map Snippets (First 8 chars sorted by freq)
  const renderArenaTable = (tbodyId, codes, freqMap) => {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    const sortedChars = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]).slice(0, 8);
    sortedChars.forEach(ch => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:var(--font-mono)">${ch === ' ' ? 'SPACE' : escHtml(ch)}</td>
        <td style="font-family:var(--font-mono); font-size: 0.75rem;">${codes[ch]}</td>
        <td>${codes[ch].length}</td>
      `;
      tbody.appendChild(tr);
    });
  };
  renderArenaTable('arena-huff-codes', hRes.codes, hRes.freqMap);
  renderArenaTable('arena-sf-codes', sfRes.codes, sfRes.freqMap);

  // 5. Determine Winner
  const wName = document.getElementById('arena-winner-name');
  const wReason = document.getElementById('arena-winner-reason');
  const wBadge = document.getElementById('arena-winner-badge');
  
  const diff = sfRes.stats.compressedBits - hRes.stats.compressedBits;
  if (diff > 0) {
    wName.textContent = 'Huffman Coding';
    wName.style.color = 'var(--cyan)';
    wReason.textContent = `Generated ${fmtNum(diff)} fewer bits than Shannon-Fano`;
    wBadge.style.borderColor = 'rgba(0, 212, 255, 0.4)';
  } else if (diff < 0) {
    wName.textContent = 'Shannon-Fano';
    wName.style.color = 'var(--purple)';
    wReason.textContent = `Generated ${fmtNum(Math.abs(diff))} fewer bits than Huffman`;
    wBadge.style.borderColor = 'rgba(179, 136, 255, 0.4)';
  } else {
    wName.textContent = 'TIE (Equal Bits)';
    wName.style.color = 'var(--text-primary)';
    wReason.textContent = `Both generated ${fmtNum(hRes.stats.compressedBits)} bits`;
    wBadge.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  }

  // 6. Entropy Calculation
  const entropy = calculateEntropy(hRes.freqMap, text.length);
  setValue('arena-entropy-val', entropy.toFixed(3));

  showToast('✓ Comparison complete!');
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initRouting();
  initTabs();
  initTreeTab();
  applyTabIsolation();
  startFactCarousels();

  // Load home route initially
  window.appRoute('home');

  // Initially hide comparison table element headers till data loads
  const cmpTableEl = document.getElementById('cmp-table');
  if (cmpTableEl) cmpTableEl.parentElement.style.display = 'none';

  document.getElementById('btn-encode').addEventListener('click', encodeText);
  document.getElementById('btn-sample').addEventListener('click', loadSample);
  document.getElementById('btn-decode').addEventListener('click', decodeText);

  // Arena event listeners
  document.getElementById('btn-arena-compare').addEventListener('click', compareInArena);
  document.getElementById('btn-arena-sample').addEventListener('click', () => {
    const txt = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    document.getElementById('arena-input-text').value = txt;
    showToast(`Loaded Sample: "${txt.substring(0, 20)}..."`);
  });
  document.getElementById('btn-arena-edgecase').addEventListener('click', () => {
    const edgeCase = 'A'.repeat(35) + 'B'.repeat(17) + 'C'.repeat(17) + 'D'.repeat(16) + 'E'.repeat(15);
    document.getElementById('arena-input-text').value = edgeCase;
    showToast('Loaded Edge Case! Huffman is guaranteed to win.');
    // Automatically trigger comparison so it's a 1-click demo
    compareInArena();
  });

  document.getElementById('btn-export-codes').addEventListener('click', exportCodebook);
  document.getElementById('btn-export-bits').addEventListener('click', exportBits);

  document.getElementById('btn-copy-bits').addEventListener('click', () => {
    const bits = document.getElementById('bit-stream').textContent.replace(/\s/g, '');
    if (bits) copyText(bits, 'Bits copied!');
    else showToast('Nothing to copy yet!');
  });
  document.getElementById('btn-copy-decoded').addEventListener('click', () => {
    const txt = document.getElementById('decoded-output').textContent;
    if (txt) copyText(txt, 'Text copied!');
    else showToast('Nothing to copy yet!');
  });

  // Ctrl+Enter shortcut for encoder and arena
  document.getElementById('input-text').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') encodeText();
  });
  document.getElementById('arena-input-text').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') compareInArena();
  });

  // Hide results initially
  document.getElementById('results-section').style.display = 'none';
});

