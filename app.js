/**
 * ============================================================
 *  App Controller (app.js)
 *  Wires UI events to Huffman + Visualizer modules
 * ============================================================
 */

// ─── Globals ─────────────────────────────────────────────────
let lastResult = null;   // last encode() result, shared between tabs

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

  const result = Huffman.encode(text);
  lastResult = result;

  renderFrequencyTable(result.freqMap);
  renderStats(result.stats);
  renderCodeTable(result.codes, result.freqMap, text);
  renderBitStream(result.encoded);
  renderComparisonTable(result);

  // Auto-render tree
  renderTreeFull(result);

  // Update decoder codebook silently
  updateDecoderCodebook(result);

  showToast('✓ Encoded successfully!');
  document.getElementById('results-section').style.display = 'block';
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
}

function renderBitStream(encoded) {
  const el = document.getElementById('bit-stream');
  // Colour-code bits in groups of 8
  let html = '';
  for (let i = 0; i < encoded.length; i++) {
    html += `<span class="b${encoded[i]}">${encoded[i]}</span>`;
    if ((i + 1) % 8 === 0 && i < encoded.length - 1) html += ' ';
  }
  el.innerHTML = html;
}

// ─── Tree Visualizer TAB ─────────────────────────────────────
let stepperActive = false;

function renderTreeFull(result) {
  const svgEl = document.getElementById('tree-svg');
  document.getElementById('tree-placeholder').style.display = 'none';
  svgEl.style.display = 'block';

  Visualizer.initStepper(result.steps, result.root, svgEl);
  Visualizer.renderFull();

  stepperActive = false;
  updateStepperUI(-1, result.steps.length, 'Full tree rendered. Use ← Step Back to replay merges.');
}

function initTreeTab() {
  document.getElementById('btn-step-fwd').addEventListener('click', () => {
    if (!lastResult) { showToast('Encode some text first!'); return; }
    if (!stepperActive) {
      // Start step mode — reset
      stepperActive = true;
      Visualizer.initStepper(lastResult.steps, lastResult.root, document.getElementById('tree-svg'));
      document.getElementById('tree-svg').innerHTML = '';
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
    if (!lastResult) return;
    Visualizer.stepBack();
    updateStepperUI(Visualizer.currentIdx(), Visualizer.totalSteps(), 'Stepped back.');
  });

  document.getElementById('btn-tree-reset').addEventListener('click', () => {
    if (!lastResult) return;
    renderTreeFull(lastResult);
  });

  document.getElementById('btn-tree-full').addEventListener('click', () => {
    if (!lastResult) return;
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
function renderComparisonTable(result) {
  if (!result) return;
  const { rows, totalFixed, totalVar, savedBits } =
    Huffman.buildComparisonTable(result.originalText, result.codes, result.freqMap);

  const tbody = document.getElementById('cmp-table-body');
  tbody.innerHTML = '';

  rows.forEach(row => {
    const savedBitsRow = row.fixedTotal - row.varTotal;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono)">${escHtml(row.char)}</td>
      <td>${row.freq}</td>
      <td>${row.prob}</td>
      <td class="fixed-code" style="font-family:var(--font-mono);font-size:0.75rem">${row.fixedCode}</td>
      <td>${row.fixedBits} × ${row.freq} = <strong>${row.fixedTotal}</strong></td>
      <td class="huff-code" style="font-size:0.82rem">${row.huffCode}</td>
      <td>${row.varBits} × ${row.freq} = <strong>${row.varTotal}</strong></td>
      <td class="${savedBitsRow > 0 ? 'saving-positive' : savedBitsRow < 0 ? 'saving-negative' : 'saving-zero'}">
        ${savedBitsRow > 0 ? '+' : ''}${savedBitsRow}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Total row
  const tfoot = document.getElementById('cmp-table-foot');
  if (tfoot) tfoot.innerHTML = `
    <tr class="total-row">
      <td colspan="3"><strong>TOTAL</strong></td>
      <td colspan="2" style="color:var(--text-muted)"><strong>${totalFixed} bits</strong></td>
      <td colspan="2" style="color:var(--cyan)"><strong>${totalVar} bits</strong></td>
      <td class="saving-positive"><strong>+${savedBits}</strong></td>
    </tr>
  `;
}

// ─── DECODER TAB ─────────────────────────────────────────────
function updateDecoderCodebook(result) {
  // Store root on window for decoder use
  window._huffRoot = result.root;
  window._huffCodes = result.codes;

  // Auto-populate bits
  const bitsInput = document.getElementById('decoder-bits');
  if (bitsInput) bitsInput.value = result.encoded;

  const codeDisplay = document.getElementById('decoder-codebook');
  if (codeDisplay) {
    const lines = Object.entries(result.codes)
      .map(([ch, code]) => `  "${ch === ' ' ? 'SPACE' : ch}": ${code}`)
      .join('\n');
    codeDisplay.textContent = '{\n' + lines + '\n}';
  }
}

function decodeText() {
  const bits = document.getElementById('decoder-bits').value.replace(/\s/g, '');
  if (!bits) { showToast('⚠ Paste encoded bits first!'); return; }
  if (!window._huffRoot) { showToast('⚠ Encode some text first to get the tree!'); return; }

  // Validate
  if (!/^[01]+$/.test(bits)) { showToast('⚠ Only 0s and 1s allowed!'); return; }

  const decoded = Huffman.decode(bits, window._huffRoot);
  document.getElementById('decoded-output').textContent = decoded;
  showToast('✓ Decoded!');
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
  'mississippi'
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
