// main.js - Controller for Neon Cyberpunk Disk Scheduling Simulator
// Expects algorithm files in /algorithms/<lowercase>.js

/* ---------------------------
   Utilities & DOM helpers
   --------------------------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function el(tag, attrs = {}) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function showError(msg) {
  const e = $('#error-msg');
  if (!msg) { e.classList.add('hidden'); e.textContent = ''; }
  else { e.classList.remove('hidden'); e.textContent = msg; }
}

/* ---------------------------
   Explanations (built-in)
   --------------------------- */
const EXPLANATIONS = {
  FCFS: `<h4>FCFS — First Come First Serve</h4>
    <p>Processes requests in the order they arrive. Simple, fair, but can cause large seeks if requests are scattered.</p>
    <ul>
      <li><strong>How:</strong> Queue order.</li>
      <li><strong>Advantage:</strong> Simple and fair.</li>
      <li><strong>Disadvantage:</strong> Poor average seek in random workloads.</li>
    </ul>`,

  SSTF: `<h4>SSTF — Shortest Seek Time First</h4>
    <p>At each step, chooses the unserviced request closest to the current head location.</p>
    <ul>
      <li><strong>How:</strong> Repeatedly pick nearest request.</li>
      <li><strong>Advantage:</strong> Lower average seek than FCFS.</li>
      <li><strong>Disadvantage:</strong> Starvation for distant requests possible.</li>
    </ul>`,

  SCAN: `<h4>SCAN — Elevator Algorithm</h4>
    <p>The head moves in one direction servicing requests, reaches the end, then reverses direction.</p>`,

  CSCAN: `<h4>C-SCAN — Circular SCAN</h4>
    <p>The head moves in one direction only; when it reaches the end it jumps back to the start (the jump may or may not be counted).</p>`,

  LOOK: `<h4>LOOK</h4>
    <p>Like SCAN but reverses direction at the last request (not at the disk end), avoiding unnecessary travel.</p>`,

  CLOOK: `<h4>C-LOOK</h4>
    <p>Like C-SCAN but jumps between the last and first request without going to disk edges.</p>`
};

/* ---------------------------
   UI references & state
   --------------------------- */
const refs = {
  requestsInput: '#requests-input',
  headInput: '#head-input',
  diskInput: '#disk-size-input',
  algorithmSelect: '#algorithm-select',
  directionSelect: '#direction-select',
  speedSlider: '#speed-slider',

  runBtn: '#run-btn',
  resetBtn: '#reset-btn',
  playBtn: '#play-btn',
  pauseBtn: '#pause-btn',
  stepBtn: '#step-btn',

  tabs: '#algo-tabs',
  explainPane: '#algo-explain',
  codeBlock: '#code-block',
  copyCodeBtn: '#copy-code-btn',

  vizContainer: '#visualization',
  totalSeek: '#total-seek',
  avgSeek: '#avg-seek',
  processed: '#processed'
};

let appState = {
  diskSize: 200,
  currentAlg: 'FCFS',
  animation: {
    running: false,
    paused: false,
    raf: null,
    segmentIndex: 0,
    points: [],
    headEl: null,
    speed: 1
  }
};

/* ---------------------------
   Tab handling & code loading
   --------------------------- */
function initTabs() {
  const tabContainer = $(refs.tabs);
  tabContainer.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.tab');
    if (!btn) return;
    activateTab(btn.dataset.alg);
  });

  // copy code button
  $('#copy-code-btn').addEventListener('click', copyCodeToClipboard);

  // initial load
  activateTab('FCFS');
}

function activateTab(algKey) {
  appState.currentAlg = algKey;
  // tab UI
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.alg === algKey));
  // set explanation
  const explainHtml = EXPLANATIONS[algKey] || `<h4>${algKey}</h4><p>No explanation available.</p>`;
  $(refs.explainPane).innerHTML = explainHtml;

  // load code text
  loadAlgorithmFileText(algKey.toLowerCase()).then(txt => {
    $(refs.codeBlock).textContent = txt || `// ${algKey} code not found in algorithms/${algKey.toLowerCase()}.js`;
  }).catch(err => {
    $(refs.codeBlock).textContent = `// Error loading algorithm file: ${err.message}`;
  });
}

async function loadAlgorithmFileText(fileNameLower) {
  const path = `algorithms/${fileNameLower}.js`;
  try {
    const res = await fetch(path, {cache: 'no-cache'}); // avoid stale cached code while developing
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn('Failed to fetch algorithm file:', path, err);
    throw err;
  }
}

function copyCodeToClipboard() {
  const text = $(refs.codeBlock).textContent;
  navigator.clipboard?.writeText(text).then(() => {
    // flash a small confirmation
    const btn = $('#copy-code-btn');
    const orig = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => btn.textContent = orig, 900);
  }).catch(err => {
    alert('Copy failed: ' + err.message);
  });
}

/* ---------------------------
   Algorithm loader (dynamic import)
   --------------------------- */
async function loadAlgorithmModule(algKey) {
  const name = algKey.toLowerCase();
  const path = `./algorithms/${name}.js`;
  // dynamic import - works on servers (Live Server). Not guaranteed over file:// in some browsers.
  try {
    const module = await import(path);
    // try different export shapes
    if (module.default && typeof module.default === 'function') return module.default;
    // named function e.g. runFCFS or compute
    const candidates = Object.keys(module).filter(k => typeof module[k] === 'function');
    if (candidates.length) return module[candidates[0]];
    throw new Error('No function export found in module');
  } catch (err) {
    console.error('Dynamic import failed:', path, err);
    throw err;
  }
}

/* ---------------------------
   Parse inputs & validate
   --------------------------- */
function parseRequestsInput() {
  const raw = $(refs.requestsInput).value || '';
  return raw.split(',').map(s => parseInt(s.trim())).filter(n => !Number.isNaN(n) && Number.isFinite(n));
}

function validateInputs() {
  const disk = parseInt($(refs.diskInput).value, 10);
  const head = parseInt($(refs.headInput).value, 10);
  const reqs = parseRequestsInput();

  if (Number.isNaN(disk) || disk <= 0) { showError('Disk size must be a positive number'); return null; }
  if (Number.isNaN(head) || head < 0 || head >= disk) { showError(`Initial head must be between 0 and ${disk - 1}`); return null; }
  if (!reqs.length) { showError('Enter at least one request (comma-separated numbers)'); return null; }
  // filter requests within disk range
  const filtered = reqs.filter(r => r >= 0 && r < disk);
  if (!filtered.length) { showError('No valid requests within disk range'); return null; }
  showError('');
  appState.diskSize = disk;
  return { disk, head, requests: filtered };
}

/* ---------------------------
   Run simulation: compute sequence
   --------------------------- */
async function runSimulation() {
  if (appState.animation.running) return; // avoid multiple runs
  const valid = validateInputs();
  if (!valid) return;

  const algKey = $(refs.algorithmSelect).value || appState.currentAlg || 'FCFS';
  const dir = $(refs.directionSelect).value || 'right';
  const speed = parseFloat($(refs.speedSlider).value) || 1;

  // load algorithm module dynamically
  let computeFn;
  try {
    computeFn = await loadAlgorithmModule(algKey);
  } catch (err) {
    showError('Could not load algorithm implementation. Open console for details.');
    return;
  }

  // call compute - support variants of signature:
  // some files may export (requests, head) or (requests, head, direction)
  let result;
  try {
    // prefer (requests, head, direction) and fallback
    result = await computeFn(valid.requests, valid.head, dir);
    if (!result || !Array.isArray(result.sequence)) throw new Error('Invalid return from algorithm');
  } catch (err) {
    // try fallback signatures
    try {
      result = await computeFn(valid.requests, valid.head);
      if (!result || !Array.isArray(result.sequence)) throw new Error('Invalid return from algorithm (fallback)');
    } catch (err2) {
      console.error('Algorithm execution error', err, err2);
      showError('Algorithm execution failed. Check algorithm module signature (see console).');
      return;
    }
  }

  // Accept result.sequence and result.totalSeek
  const sequence = result.sequence;
  const totalSeek = Number.isFinite(result.totalSeek) ? result.totalSeek : computeTotalSeek(sequence);
  displayResults({ sequence, totalSeek });

  // build and animate visualization
  buildAndAnimate(sequence, algKey, speed);
}

function computeTotalSeek(sequence) {
  if (!Array.isArray(sequence) || sequence.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < sequence.length; i++) total += Math.abs(sequence[i] - sequence[i - 1]);
  return total;
}

function displayResults({ sequence, totalSeek }) {
  $('#total-seek').textContent = String(totalSeek);
  const avg = sequence && sequence.length > 1 ? (totalSeek / (sequence.length - 1)).toFixed(2) : '0.00';
  $('#avg-seek').textContent = avg;
  $('#processed').textContent = String(Math.max(0, (sequence.length - 1)));
}

/* ---------------------------
   Visualization helpers
   --------------------------- */
function clearViz() {
  const c = $(refs.vizContainer);
  c.innerHTML = '';
  // reset animation state
  cancelAnimation();
}

function buildAndAnimate(sequence, algKey, speed = 1) {
  clearViz();
  // create SVG canvas
  const container = $(refs.vizContainer);
  const w = container.clientWidth - 32; // padding allowance
  const h = container.clientHeight - 16;
  const svg = el('svg', { viewBox: `0 0 ${Math.max(300, w)} ${Math.max(200, h)}`, preserveAspectRatio: 'none' });
  svg.style.width = '100%';
  svg.style.height = '100%';
  container.appendChild(svg);

  const padding = 24;
  const usableW = Math.max(200, svg.viewBox.baseVal.width - padding * 2);
  const yStart = 40;
  const yGap = Math.max(26, (svg.viewBox.baseVal.height - 100) / Math.max(1, sequence.length));

  // ticks along x (0 ... diskSize-1)
  const ticks = 10;
  for (let i = 0; i <= ticks; i++) {
    const track = Math.round(i * (appState.diskSize - 1) / ticks);
    const x = padding + (track / (appState.diskSize - 1)) * usableW;
    const line = el('line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', yStart - 20); line.setAttribute('y2', svg.viewBox.baseVal.height - 20);
    line.setAttribute('stroke', '#07111a'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    const txt = el('text');
    txt.setAttribute('x', x); txt.setAttribute('y', yStart - 26); txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#6f8295'); txt.setAttribute('font-size', '11');
    txt.textContent = String(track);
    svg.appendChild(txt);
  }

  // compute points
  const points = sequence.map((pos, idx) => {
    const x = padding + (pos / (appState.diskSize - 1)) * usableW;
    const y = yStart + idx * yGap;
    return { x, y, pos, idx };
  });

  // polyline
  const poly = el('polyline');
  poly.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', getAlgColor(algKey));
  poly.setAttribute('stroke-width', '2');
  poly.setAttribute('stroke-dasharray', '6 6');
  svg.appendChild(poly);

  // points + labels
  points.forEach((p, i) => {
    const circ = el('circle');
    circ.setAttribute('cx', p.x); circ.setAttribute('cy', p.y); circ.setAttribute('r', i === 0 ? 6 : 5);
    circ.setAttribute('fill', i === 0 ? '#ef4444' : getAlgColor(algKey));
    circ.setAttribute('stroke', '#0b1013'); circ.setAttribute('stroke-width', '1.5');
    svg.appendChild(circ);

    const label = el('text');
    label.setAttribute('x', p.x + 12); label.setAttribute('y', p.y + 4);
    label.setAttribute('font-size', '11'); label.setAttribute('fill', '#cfe8ff');
    label.textContent = String(p.pos);
    svg.appendChild(label);
  });

  // head element overlay (HTML) for smooth animation
  const head = el('div');
  head.style.position = 'absolute';
  head.style.width = '14px';
  head.style.height = '14px';
  head.style.borderRadius = '50%';
  head.style.background = getAlgColor(algKey);
  head.style.border = '3px solid #05060a';
  head.style.boxShadow = '0 8px 26px rgba(6,182,212,0.12)';
  head.style.transform = 'translate(-50%,-50%)';
  // place initial
  head.style.left = `${points[0].x}px`;
  head.style.top = `${points[0].y}px`;
  container.appendChild(head);

  // save animation state
  appState.animation.points = points;
  appState.animation.headEl = head;
  appState.animation.segmentIndex = 0;
  appState.animation.speed = speed;
  appState.animation.running = true;
  appState.animation.paused = false;

  // animate by segments using requestAnimationFrame
  animateSegments();
}

function getAlgColor(algKey) {
  // consistent neon palette - match styles.css
  switch (algKey) {
    case 'FCFS': return '#ef4444';
    case 'SSTF': return '#7c3aed';
    case 'SCAN': return '#ec4899';
    case 'CSCAN': return '#f59e0b';
    case 'LOOK': return '#10b981';
    case 'CLOOK': return '#06b6d4';
    default: return '#7c3aed';
  }
}

function animateSegments() {
  const anim = appState.animation;
  if (!anim.points || anim.points.length < 2) { appState.animation.running = false; return; }

  const baseDuration = 800; // ms per segment baseline
  let lastTime = null;

  function step(ts) {
    if (!lastTime) lastTime = ts;
    if (anim.paused) { anim.raf = requestAnimationFrame(step); return; }
    const curIdx = Math.min(anim.segmentIndex, anim.points.length - 2);
    const pFrom = anim.points[curIdx];
    const pTo   = anim.points[curIdx + 1];
    const duration = baseDuration / Math.max(0.25, anim.speed);

    // compute progress for this segment
    if (!anim._segmentStart) anim._segmentStart = ts;
    const elapsed = ts - anim._segmentStart;
    const t = Math.min(1, elapsed / duration);
    const x = pFrom.x + (pTo.x - pFrom.x) * t;
    const y = pFrom.y + (pTo.y - pFrom.y) * t;
    anim.headEl.style.left = `${x}px`;
    anim.headEl.style.top = `${y}px`;

    if (t >= 1 - 1e-6) {
      // move to next segment
      anim.segmentIndex++;
      anim._segmentStart = null;
      if (anim.segmentIndex >= anim.points.length - 1) {
        // finished
        anim.running = false;
        anim.raf = null;
        return;
      }
    }

    anim.raf = requestAnimationFrame(step);
  }

  cancelAnimation(); // ensure no double rafs
  anim.raf = requestAnimationFrame(step);
}

function cancelAnimation() {
  const anim = appState.animation;
  if (anim.raf) cancelAnimationFrame(anim.raf);
  anim.raf = null;
  anim.running = false;
  anim.paused = false;
  anim.segmentIndex = 0;
  anim.points = [];
  anim.headEl = null;
}

/* ---------------------------
   Control buttons (play/pause/step)
   --------------------------- */
function setupControls() {
  $(refs.runBtn).addEventListener('click', runSimulation);

  $(refs.resetBtn).addEventListener('click', () => {
    // clear inputs & viz & metrics
    $('#requests-input').value = '';
    $('#head-input').value = '50';
    $('#disk-size-input').value = '200';
    $('#total-seek').textContent = '—';
    $('#avg-seek').textContent = '—';
    $('#processed').textContent = '—';
    clearViz();
    showError('');
  });

  $(refs.playBtn).addEventListener('click', () => {
    if (!appState.animation.points || appState.animation.points.length === 0) return;
    if (!appState.animation.running) {
      appState.animation.running = true;
      appState.animation.paused = false;
      // resume animation
      animateSegments();
    } else {
      appState.animation.paused = false;
    }
  });

  $(refs.pauseBtn).addEventListener('click', () => {
    appState.animation.paused = true;
  });

  $(refs.stepBtn).addEventListener('click', () => {
    const anim = appState.animation;
    if (!anim.points || anim.points.length === 0) return;
    // if animation not started, set head to next
    if (!anim.headEl) return;
    if (!anim.running) {
      // manually step one segment
      const i = Math.min(anim.segmentIndex + 1, anim.points.length - 1);
      anim.headEl.style.left = `${anim.points[i].x}px`;
      anim.headEl.style.top = `${anim.points[i].y}px`;
      anim.segmentIndex = i;
    } else {
      // while running, pause then step
      anim.paused = true;
      const i = Math.min(anim.segmentIndex + 1, anim.points.length - 1);
      anim.headEl.style.left = `${anim.points[i].x}px`;
      anim.headEl.style.top = `${anim.points[i].y}px`;
      anim.segmentIndex = i;
    }
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { runSimulation(); }
    else if (ev.key === 'Escape') { $('#reset-btn').click(); }
    else if (ev.key === ' ') { ev.preventDefault(); if (appState.animation.running && !appState.animation.paused) $('#pause-btn').click(); else $('#play-btn').click(); }
  });
}

/* ---------------------------
   Initialize UI & load first tab
   --------------------------- */
function init() {
  initTabs();
  setupControls();

  // make the tabs clickable also set aria roles
  $$('.tab').forEach(b => {
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false');
  });

  // set initial code load for FCFS
  activateTab('FCFS');
}

// Kickoff
window.addEventListener('load', init);

