// Global state
let requests = [];
let simulationResult = null;

// Initialize
function init() {
  document.getElementById('addBtn').addEventListener('click', addRequest);
  document.getElementById('loadSample').addEventListener('click', loadSampleData);
  document.getElementById('clearAll').addEventListener('click', clearAllRequests);
  document.getElementById('runSim').addEventListener('click', runSimulation);
  document.getElementById('algoSelect').addEventListener('change', loadAlgorithmDefaults);

  // Update disk size constraint on initial head
  document.getElementById('diskSize').addEventListener('input', function (e) {
    const diskSize = parseInt(e.target.value) || 200;
    document.getElementById('initialHead').max = diskSize;
    document.getElementById('requestInput').max = diskSize - 1;
  });

  renderRequestList();
  drawEmptyGraph();
}

// Add request
function addRequest() {
  const cylinder = parseInt(document.getElementById('requestInput').value);
  const diskSize = parseInt(document.getElementById('diskSize').value) || 200;

  if (isNaN(cylinder) || cylinder < 0 || cylinder >= diskSize) {
    showMessage('Invalid cylinder number. Must be between 0 and ' + (diskSize - 1), 'error');
    return;
  }

  requests.push(cylinder);
  renderRequestList();
  document.getElementById('requestInput').value = '0';
}

// Load sample data
function loadSampleData() {
  requests = [82, 170, 43, 140, 24, 16, 190];
  renderRequestList();
  showMessage('Sample data loaded successfully', 'success');
}

// Algorithm-specific defaults
function loadAlgorithmDefaults() {
  const algo = document.getElementById('algoSelect').value;

  const defaults = {
    'FCFS': {
      diskSize: 200,
      initialHead: 50,
      direction: 'right',
      requests: [82, 170, 43, 140, 24, 16, 190]
    },
    'SSTF': {
      diskSize: 200,
      initialHead: 100,
      direction: 'right',
      requests: [176, 79, 34, 60, 92, 11, 41, 114]
    },
    'SCAN': {
      diskSize: 200,
      initialHead: 53,
      direction: 'right',
      requests: [98, 183, 37, 122, 14, 124, 65, 67]
    },
    'CSCAN': {
      diskSize: 200,
      initialHead: 50,
      direction: 'right',
      requests: [86, 147, 91, 177, 94, 150, 102, 175, 130]
    },
    'LOOK': {
      diskSize: 200,
      initialHead: 50,
      direction: 'right',
      requests: [82, 170, 43, 140, 24, 16, 190]
    },
    'CLOOK': {
      diskSize: 200,
      initialHead: 50,
      direction: 'right',
      requests: [82, 170, 43, 140, 24, 16, 190]
    }
  };

  const config = defaults[algo];
  if (config) {
    document.getElementById('diskSize').value = config.diskSize;
    document.getElementById('initialHead').value = config.initialHead;
    document.getElementById('direction').value = config.direction;
    requests = [...config.requests];
    renderRequestList();
    showMessage('Loaded default configuration for ' + algo, 'success');
  }
}

// Render request list
function renderRequestList() {
  const list = document.getElementById('requestList');

  if (requests.length === 0) {
    list.innerHTML = `
      <div style="color: #9ca3af; text-align: center; padding: 20px; font-size: 13px;">
        No requests in queue<br>
        <span style="font-size: 11px; margin-top: 4px; display: inline-block;">Add cylinder requests or load sample data</span>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <div style="font-size: 12px; color: #6b7280; font-weight: 600;">Total Requests:</div>
      <div style="font-size: 14px; color: #2563eb; font-weight: 700;">${requests.length}</div>
    </div>
    <div style="font-size: 12px; color: #374151; line-height: 1.8; font-family: 'Courier New', monospace;">
      ${requests.join(', ')}
    </div>`;
}

// Clear all requests
function clearAllRequests() {
  requests = [];
  renderRequestList();
  drawEmptyGraph();
  clearMetrics();
}

// Show message
function showMessage(msg, type) {
  const log = document.getElementById('sequenceLog');
  const color = type === 'error' ? '#ef4444' : '#10b981';
  const bg = type === 'error' ? '#fee2e2' : '#d1fae5';

  log.innerHTML =
    `<div style="color:${color}; background:${bg}; padding:8px; border-radius:4px; margin-bottom:8px;">
      ${msg}
     </div>` + log.innerHTML;
}

/*───────────────────────────────────────────────
   Disk Scheduling Algorithms
────────────────────────────────────────────────*/

function fcfs(head, requests) {
  const sequence = [head].concat(requests);
  let totalSeek = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    totalSeek += Math.abs(sequence[i + 1] - sequence[i]);
  }

  return { sequence, totalSeek };
}

function sstf(head, requests) {
  const sequence = [head];
  const remaining = requests.slice();
  let current = head;
  let totalSeek = 0;

  while (remaining.length > 0) {
    let minDist = Infinity;
    let minIdx = -1;

    for (let i = 0; i < remaining.length; i++) {
      const dist = Math.abs(remaining[i] - current);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }

    current = remaining[minIdx];
    sequence.push(current);
    totalSeek += minDist;
    remaining.splice(minIdx, 1);
  }

  return { sequence, totalSeek };
}

function scan(head, requests, diskSize, direction) {
  const sequence = [head];
  const sorted = requests.slice().sort((a, b) => a - b);
  let totalSeek = 0;

  if (direction === "right") {
    const right = sorted.filter(r => r >= head);
    const left = sorted.filter(r => r < head).reverse();

    for (let r of right) sequence.push(r);
    if (right.length > 0) {
      sequence.push(diskSize - 1);
      totalSeek += (diskSize - 1) - head;
    }

    for (let r of left) sequence.push(r);
    if (left.length > 0 && right.length > 0) {
      totalSeek += (diskSize - 1) - left[left.length - 1];
    }

  } else {
    const left = sorted.filter(r => r <= head).reverse();
    const right = sorted.filter(r => r > head);

    for (let r of left) sequence.push(r);
    if (left.length > 0) {
      sequence.push(0);
      totalSeek += head;
    }

    for (let r of right) sequence.push(r);
    if (right.length > 0 && left.length > 0) {
      totalSeek += right[right.length - 1];
    }
  }

  return { sequence, totalSeek };
}

function cscan(head, requests, diskSize, direction) {
  const sequence = [head];
  const sorted = requests.slice().sort((a, b) => a - b);
  let totalSeek = 0;

  if (direction === "right") {
    const right = sorted.filter(r => r >= head);
    const left = sorted.filter(r => r < head);

    for (let r of right) sequence.push(r);
    if (right.length > 0) {
      sequence.push(diskSize - 1);
      sequence.push(0);
      totalSeek += (diskSize - 1) - head + (diskSize - 1);
    }

    for (let r of left) sequence.push(r);

  } else {
    const left = sorted.filter(r => r <= head).reverse();
    const right = sorted.filter(r => r > head).reverse();

    for (let r of left) sequence.push(r);
    if (left.length > 0) {
      sequence.push(0);
      sequence.push(diskSize - 1);
      totalSeek += head + (diskSize - 1);
    }

    for (let r of right) sequence.push(r);
  }

  return { sequence, totalSeek };
}

function look(head, requests, diskSize, direction) {
  const sequence = [head];
  const sorted = requests.slice().sort((a, b) => a - b);
  let totalSeek = 0;

  if (direction === "right") {
    const right = sorted.filter(r => r >= head);
    const left = sorted.filter(r => r < head).reverse();

    for (let r of right) sequence.push(r);
    if (right.length > 0) totalSeek += right[right.length - 1] - head;

    for (let r of left) sequence.push(r);

  } else {
    const left = sorted.filter(r => r <= head).reverse();
    const right = sorted.filter(r => r > head);

    for (let r of left) sequence.push(r);
    if (left.length > 0) totalSeek += head - left[left.length - 1];

    for (let r of right) sequence.push(r);
  }

  return { sequence, totalSeek };
}

function clook(head, requests, diskSize, direction) {
  const sequence = [head];
  const sorted = requests.slice().sort((a, b) => a - b);
  let totalSeek = 0;

  if (direction === "right") {
    const right = sorted.filter(r => r >= head);
    const left = sorted.filter(r => r < head);

    for (let r of right) sequence.push(r);
    for (let r of left) sequence.push(r);

  } else {
    const left = sorted.filter(r => r <= head).reverse();
    const right = sorted.filter(r => r > head).reverse();

    for (let r of left) sequence.push(r);
    for (let r of right) sequence.push(r);
  }

  return { sequence, totalSeek };
}

/*───────────────────────────────────────────────
   RUN SIMULATION
────────────────────────────────────────────────*/

function runSimulation() {
  if (requests.length === 0) {
    showMessage('No requests to simulate. Add some requests first.', 'error');
    return;
  }

  const algo = document.getElementById('algoSelect').value;
  const head = parseInt(document.getElementById('initialHead').value) || 0;
  const diskSize = parseInt(document.getElementById('diskSize').value) || 200;
  const direction = document.getElementById('direction').value;

  let result;

  switch (algo) {
    case 'FCFS': result = fcfs(head, requests); break;
    case 'SSTF': result = sstf(head, requests); break;
    case 'SCAN': result = scan(head, requests, diskSize, direction); break;
    case 'CSCAN': result = cscan(head, requests, diskSize, direction); break;
    case 'LOOK': result = look(head, requests, diskSize, direction); break;
    case 'CLOOK': result = clook(head, requests, diskSize, direction); break;
    default: result = fcfs(head, requests);
  }

  simulationResult = result;
  drawGraph(result.sequence, diskSize, head);
  displayMetrics(result.totalSeek, requests.length);
  displaySequence(result.sequence);
}

/*───────────────────────────────────────────────
   GRAPH DRAWING
────────────────────────────────────────────────*/

function drawEmptyGraph() {
  const canvas = document.getElementById('diskGraph');
  const ctx = canvas.getContext('2d');

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6b7280';
  ctx.font = '14px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Run simulation to visualize disk arm movement',
               canvas.width / 2,
               canvas.height / 2);
}

function drawGraph(sequence, diskSize) {
  const canvas = document.getElementById('diskGraph');
  const ctx = canvas.getContext('2d');

  // Resize to container
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const padding = 60;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Axes
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + height);
  ctx.lineTo(padding + width, padding + height);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 5; i++) {
    const y = padding + (height / 5) * i;
    const cylinder = Math.round(diskSize - (diskSize / 5) * i);
    ctx.fillText(cylinder, padding - 10, y + 4);

    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + width, y);
    ctx.stroke();
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(sequence.length / 10));

  for (let i = 0; i < sequence.length; i += step) {
    const x = padding + (width / (sequence.length - 1)) * i;
    ctx.fillText(i, x, padding + height + 20);
  }

  // Axis text
  ctx.font = '12px Inter';
  ctx.fillStyle = '#374151';

  ctx.save();
  ctx.translate(20, padding + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Cylinder Number', 0, 0);
  ctx.restore();

  ctx.fillText('Sequence Order', padding + width / 2, canvas.height - 10);

  // Path
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < sequence.length; i++) {
    const cyl = sequence[i];
    const x = padding + (width / (sequence.length - 1)) * i;
    const y = padding + height - (cyl / diskSize) * height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Draw nodes
  for (let i = 0; i < sequence.length; i++) {
    const cyl = sequence[i];
    const x = padding + (width / (sequence.length - 1)) * i;
    const y = padding + height - (cyl / diskSize) * height;

    ctx.fillStyle = i === 0 ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, i === 0 ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, i === 0 ? 6 : 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/*───────────────────────────────────────────────
   METRICS + SEQUENCE LOG
────────────────────────────────────────────────*/

function displayMetrics(totalSeek, numRequests) {
  document.getElementById('totalSeek').textContent = totalSeek;
  document.getElementById('avgSeek').textContent = (totalSeek / numRequests).toFixed(2);
  document.getElementById('reqServed').textContent = numRequests;
}

function clearMetrics() {
  document.getElementById('totalSeek').textContent = '—';
  document.getElementById('avgSeek').textContent = '—';
  document.getElementById('reqServed').textContent = '—';
  document.getElementById('sequenceLog').innerHTML = '';
}

function displaySequence(sequence) {
  const log = document.getElementById('sequenceLog');
  let html = '<div style="margin-bottom: 8px; font-weight: 600; color: #111827;">Disk Head Movement Sequence:</div>';
  html += `<div style="margin-bottom: 8px;">${sequence.join(' → ')}</div>`;
  html += `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280;">
      Total movements: ${sequence.length - 1} steps
    </div>`;

  log.innerHTML = html;
}

// Init
init();
