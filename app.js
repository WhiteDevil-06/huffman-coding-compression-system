/**
 * ============================================================
 *  App Controller (app.js)
 *  Wires UI events to Huffman & Shannon-Fano + Visualizer modules
 * ============================================================
 */

// ─── Globals ─────────────────────────────────────────────────
let lastResults = { huffman: null, sf: null };
let currentAlgorithm = 'huffman';
let stepperActive = false;

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

  // Algorithm Toggle
  document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentAlgorithm = e.target.value;
      renderActiveAlgorithm();
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

  showToast('✓ Encoded successfully!');
  document.getElementById('results-section').style.display = 'block';
  document.getElementById('cmp-empty').style.display = 'none';
  document.getElementById('cmp-table').parentElement.style.display = 'block';
}

function renderActiveAlgorithm() {
  const res = lastResults[currentAlgorithm];
  if (!res) return;

  renderFrequencyTable(res.freqMap);
  renderStats(res.stats);
  renderCodeTable(res.codes, res.freqMap, res.originalText);
  renderBitStream(res.encoded);
  renderTreeFull(res);
  updateDecoderCodebook(res);

  const isSF = currentAlgorithm === 'sf';
  document.querySelector('#panel-encoder h2').innerHTML = isSF ? '🔒 Shannon-Fano Encoder' : '🔒 Huffman Encoder';
  document.querySelector('#panel-tree h2').innerHTML = isSF ? '🌲 Shannon-Fano Tree Visualizer (Top-Down)' : '🌲 Huffman Tree Visualizer (Bottom-Up)';
  document.querySelector('#panel-decoder h2').innerHTML = isSF ? '🔓 Shannon-Fano Decoder' : '🔓 Huffman Decoder';

  const heroBadge = document.getElementById('hero-badge');
  const heroTitle = document.getElementById('hero-title');
  const heroDesc  = document.getElementById('hero-desc');
  const heroTags  = document.getElementById('hero-tags');

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

// ─── Sample texts ─────────────────────────────────────────────
const SAMPLES = [
  'hello world',
  'abracadabra',
  'the quick brown fox jumps over the lazy dog',
  'aaabbbcccdddeee',
  'mississippi',
  'supercalifragilisticexpialidocious',
  'A_C_G_T_A_T_C_G_A_T_C_G_A_C_G_T_A_T_C_G',
  'to be or not to be, that is the question',
  'lorem ipsum dolor sit amet consectetur adipiscing elit',
  'she sells sea shells by the sea shore'
];

function loadSample() {
  const txt = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  document.getElementById('input-text').value = txt;
  showToast(`Loaded: "${txt}"`);
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTreeTab();
  
  // Initially hide comparison table element headers till data loads
  const cmpTableEl = document.getElementById('cmp-table');
  if (cmpTableEl) cmpTableEl.parentElement.style.display = 'none';

  document.getElementById('btn-encode').addEventListener('click', encodeText);
  document.getElementById('btn-sample').addEventListener('click', loadSample);
  document.getElementById('btn-decode').addEventListener('click', decodeText);
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

  // Ctrl+Enter shortcut
  document.getElementById('input-text').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') encodeText();
  });

  // Hide results initially
  document.getElementById('results-section').style.display = 'none';
});
