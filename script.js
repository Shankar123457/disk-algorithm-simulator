/* -------------------------
   Data + helpers
   ------------------------- */
let processes = []; // {pid, arrival, burst, prio, remaining}
let timeline = [];  // {pid, start, end}
let colors = {};
const colorPool = ["#2F80ED","#F2994A","#27AE60","#EB5757","#9B51E0","#56CCF2","#F2C94C","#7ED321","#50E3C2","#FF6B6B"];
let idCounter = 1;
const logEl = document.getElementById('logOut');

function log(msg){
  const ts = new Date().toLocaleTimeString();
  logEl.innerHTML += `[${ts}] ${msg}<br>`;
  logEl.scrollTop = logEl.scrollHeight;
}

function randColorFor(pid){
  if(colors[pid]) return colors[pid];
  colors[pid] = colorPool[Object.keys(colors).length % colorPool.length];
  return colors[pid];
}

function resetRuntime(){
  timeline = [];
  logEl.innerHTML = "";
  document.getElementById('metricsPre').innerText = "No data. Run a simulation.";
}

/* -------------------------
   UI actions: add/remove processes
   ------------------------- */
const processListDiv = document.getElementById('processList');
function renderProcessList(){
  if(processes.length===0){
    processListDiv.innerHTML = '<div style="text-align:center;color:#777;padding:14px">No processes</div>';
    return;
  }
  let html = `<table><thead><tr><th></th><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th></tr></thead><tbody>`;
  processes.forEach((p,i)=>{
    html += `<tr data-index="${i}">
      <td><input type="checkbox" class="proc-cb" data-index="${i}"></td>
      <td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.prio}</td></tr>`;
  });
  html += `</tbody></table>`;
  processListDiv.innerHTML = html;
}
document.getElementById('addBtn').addEventListener('click', ()=>{
  const pidVal = document.getElementById('pidInput').value.trim();
  const arrival = Number(document.getElementById('arrivalInput').value) || 0;
  const burst = Math.max(1, Number(document.getElementById('burstInput').value) || 1);
  const prio = Number(document.getElementById('priorityInput').value) || 0;
  const pid = pidVal || `P${idCounter++}`;
  processes.push({pid,arrival,burst,prio,remaining:burst});
  randColorFor(pid);
  renderProcessList();
  resetRuntime();
  log(`Added ${pid} (arr=${arrival}, burst=${burst}, pri=${prio})`);
});
document.getElementById('clearAll').addEventListener('click', ()=>{
  processes = []; idCounter = 1; colors = {}; resetRuntime(); renderProcessList();
  log("Cleared all processes.");
});
document.getElementById('removeSelected').addEventListener('click', ()=>{
  const cbs = [...document.querySelectorAll('.proc-cb')].filter(n=>n.checked);
  if(cbs.length===0){ log("No processes selected to remove."); return; }
  const idxs = cbs.map(n=>Number(n.dataset.index)).sort((a,b)=>b-a);
  idxs.forEach(i=> processes.splice(i,1));
  renderProcessList(); resetRuntime(); log("Removed selected processes.");
});
document.getElementById('loadSample').addEventListener('click', ()=>{
  processes = [
    {pid:"P1",arrival:0,burst:5,prio:2,remaining:5},
    {pid:"P2",arrival:2,burst:3,prio:1,remaining:3},
    {pid:"P3",arrival:4,burst:1,prio:3,remaining:1},
    {pid:"P4",arrival:6,burst:2,prio:2,remaining:2},
  ];
  idCounter = 5;
  colors={}; processes.forEach(p=>randColorFor(p.pid));
  renderProcessList(); resetRuntime(); log("Loaded sample processes.");
});

/* -------------------------
  Scheduling engines
   ------------------------- */

function simulateFCFS(ps){
  const sorted = ps.slice().sort((a,b)=>a.arrival - b.arrival);
  const timeline = [];
  let t = 0;
  for(const p of sorted){
    t = Math.max(t, p.arrival);
    timeline.push({pid:p.pid, start:t, end:t + p.burst});
    t += p.burst;
  }
  return timeline;
}

function simulateSJFNonPreemptive(ps){
  const arr = ps.map(p=>({...p}));
  const timeline=[]; let time=0;
  const completed = new Set();
  while(completed.size < arr.length){
    const available = arr.filter(p=>p.arrival <= time && !completed.has(p.pid));
    if(available.length===0){
      time = Math.min(...arr.filter(p=>!completed.has(p.pid)).map(p=>p.arrival));
      continue;
    }
    available.sort((a,b)=>a.burst - b.burst || a.arrival - b.arrival);
    const p = available[0];
    timeline.push({pid:p.pid, start:time, end: time + p.burst});
    time += p.burst;
    completed.add(p.pid);
  }
  return timeline;
}

function simulateSRTF(ps){
  const arr = ps.map(p=>({ ...p, remaining: p.burst }));
  const timeline=[]; let time=0;
  const total = arr.length;
  let finished=0;
  let lastPid = null;
  while(finished < total){
    const available = arr.filter(p=>p.arrival <= time && p.remaining>0);
    if(available.length===0){
      time++;
      continue;
    }
    available.sort((a,b)=>a.remaining - b.remaining || a.arrival - b.arrival);
    const cur = available[0];
    if(lastPid !== cur.pid){
      timeline.push({pid:cur.pid, start:time, end: time+1});
    } else {
      timeline[timeline.length-1].end = time+1;
    }
    cur.remaining -= 1;
    if(cur.remaining === 0) finished++;
    lastPid = cur.pid;
    time++;
  }
  return timeline;
}

function simulatePriorityNonPreemptive(ps){
  const arr = ps.map(p=>({...p}));
  const timeline=[]; let time=0; const completed = new Set();
  while(completed.size < arr.length){
    const available = arr.filter(p=>p.arrival <= time && !completed.has(p.pid));
    if(available.length===0){
      time = Math.min(...arr.filter(p=>!completed.has(p.pid)).map(p=>p.arrival));
      continue;
    }
    available.sort((a,b)=>a.prio - b.prio || a.arrival - b.arrival);
    const p = available[0];
    timeline.push({pid:p.pid, start:time, end: time + p.burst});
    time += p.burst;
    completed.add(p.pid);
  }
  return timeline;
}

function simulatePriorityPreemptive(ps){
  const arr = ps.map(p=>({...p, remaining: p.burst}));
  const timeline=[]; let time=0;
  const total = arr.length; let finished=0; let lastPid=null;
  while(finished < total){
    const available = arr.filter(p=>p.arrival <= time && p.remaining>0);
    if(available.length===0){ time++; continue; }
    available.sort((a,b)=>a.prio - b.prio || a.arrival - b.arrival);
    const cur = available[0];
    if(lastPid !== cur.pid){
      timeline.push({pid:cur.pid, start:time, end:time+1});
    } else {
      timeline[timeline.length-1].end = time+1;
    }
    cur.remaining -= 1;
    if(cur.remaining===0) finished++;
    lastPid = cur.pid;
    time++;
  }
  return timeline;
}

function simulateRR(ps, quantum){
  const arr = ps.map(p=>({...p, remaining: p.burst}));
  const timeline=[]; let time=0;
  const queue = [];
  const total = arr.length; let finished = 0;
  const byArrival = arr.slice().sort((a,b)=>a.arrival - b.arrival);
  let i=0;
  while(finished < total){
    while(i < byArrival.length && byArrival[i].arrival <= time){
      queue.push(byArrival[i]);
      i++;
    }
    if(queue.length===0){
      if(i < byArrival.length) {
        time = byArrival[i].arrival;
        continue;
      } else break;
    }
    const cur = queue.shift();
    const run = Math.min(cur.remaining, quantum);
    timeline.push({pid:cur.pid, start:time, end: time + run});
    time += run;
    cur.remaining -= run;
    while(i < byArrival.length && byArrival[i].arrival <= time){
      queue.push(byArrival[i]);
      i++;
    }
    if(cur.remaining > 0) queue.push(cur);
    else finished++;
  }
  return timeline;
}

/* -------------------------
  Timeline merging + drawing
   ------------------------- */
function mergeTimelineSegments(raw){
  if(!raw || raw.length===0) return [];
  const out=[];
  for(const seg of raw){
    if(out.length && out[out.length-1].pid === seg.pid && Math.abs(out[out.length-1].end - seg.start) < 1e-6){
      out[out.length-1].end = seg.end;
    } else out.push({...seg});
  }
  return out;
}

function computeMetrics(tl, ps){
  const metrics = {};
  ps.forEach(p=> metrics[p.pid] = {pid:p.pid, arrival:p.arrival, burst:p.burst, prio:p.prio, completion: null});
  tl.forEach(seg => {
    metrics[seg.pid].completion = Math.max(metrics[seg.pid].completion || 0, seg.end);
  });
  const arr = Object.values(metrics).map(m=>{
    const turnaround = m.completion - m.arrival;
    const waiting = turnaround - m.burst;
    return {...m, turnaround, waiting};
  });
  return arr.sort((a,b)=>a.pid.localeCompare(b.pid));
}

function drawGantt(tl){
  const svg = document.getElementById('gantt');
  svg.innerHTML = '';
  if(tl.length===0){
    svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" fill="#0b0b0b"></rect>`;
    document.getElementById('timelineScale').innerText = '';
    return;
  }
  const merged = mergeTimelineSegments(tl);
  const minT = 0;
  const maxT = Math.max(...merged.map(s=>s.end));
  const width = 980, height=220;
  const left=10, right=10, top=12;
  const innerW = width - left - right;
  const svgNS = "http://www.w3.org/2000/svg";
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const bg = document.createElementNS(svgNS,'rect'); bg.setAttribute('x',0); bg.setAttribute('y',0);
  bg.setAttribute('width',width); bg.setAttribute('height',height); bg.setAttribute('fill','#070707');
  svg.appendChild(bg);

  const tickStep = innerW / Math.max(1, maxT - minT);
  for(let t = 0; t<=maxT; t++){
    const x = left + (t - minT) * tickStep;
    const line = document.createElementNS(svgNS,'line');
    line.setAttribute('x1',x); line.setAttribute('x2',x); line.setAttribute('y1',top+140); line.setAttribute('y2',top+144);
    line.setAttribute('stroke','#333'); svg.appendChild(line);
    const txt = document.createElementNS(svgNS,'text');
    txt.setAttribute('x', x); txt.setAttribute('y', top+158); txt.setAttribute('font-size',11);
    txt.setAttribute('fill','#999'); txt.setAttribute('text-anchor','middle'); txt.textContent = t;
    svg.appendChild(txt);
  }

  const rowY = top + 30;
  const rowH = 48;
  merged.forEach((seg, idx)=>{
    const x = left + (seg.start - minT) * tickStep;
    const w = Math.max(2, (seg.end - seg.start) * tickStep);
    const rect = document.createElementNS(svgNS,'rect');
    rect.setAttribute('x',x); rect.setAttribute('y',rowY); rect.setAttribute('width',w); rect.setAttribute('height',rowH);
    rect.setAttribute('rx',6); rect.setAttribute('ry',6);
    rect.setAttribute('fill', randColorFor(seg.pid) );
    rect.setAttribute('class','gantt-block');
    rect.setAttribute('data-pid',seg.pid);
    svg.appendChild(rect);

    const label = document.createElementNS(svgNS,'text');
    label.setAttribute('x', x + w/2); label.setAttribute('y', rowY + rowH/2 + 4);
    label.setAttribute('text-anchor','middle'); label.setAttribute('font-size',12); label.setAttribute('fill','#fff');
    label.textContent = `${seg.pid} (${seg.start}→${seg.end})`;
    svg.appendChild(label);
  });

  document.getElementById('timelineScale').innerText = `0 — ${maxT.toFixed(2)}`;
}

/* -------------------------
  Driver: run simulation and compute metrics
   ------------------------- */
document.getElementById('runSim').addEventListener('click', ()=>{
  if(processes.length===0){ alert("Add processes first."); return; }
  const algo = document.getElementById('algoSelect').value;
  const quantum = Math.max(1, Math.floor(Number(document.getElementById('quantum').value) || 1));
  const ps = processes.map(p=>({...p, remaining: p.burst}));
  log(`Running simulation: ${algo}${algo==='RR' ? " (Q="+quantum+")":''}`);
  let rawTl = [];
  try{
    if(algo==='FCFS') rawTl = simulateFCFS(ps);
    else if(algo==='SJF_NR') rawTl = simulateSJFNonPreemptive(ps);
    else if(algo==='SJF_PR') rawTl = simulateSRTF(ps);
    else if(algo==='PRIORITY_NR') rawTl = simulatePriorityNonPreemptive(ps);
    else if(algo==='PRIORITY_PR') rawTl = simulatePriorityPreemptive(ps);
    else if(algo==='RR') rawTl = simulateRR(ps, quantum);
    else rawTl = [];
  } catch(e){
    console.error(e); alert("Simulation failed: "+e.message);
  }
  timeline = mergeTimelineSegments(rawTl);
  drawGantt(timeline);
  const metrics = computeMetrics(timeline, processes);
  const metricsTxt = ["PID  Arrival  Burst  Prio  Completion  Turnaround  Waiting",
    "-----------------------------------------------------------",
    ...metrics.map(m=>`${m.pid.padEnd(4)} ${String(m.arrival).padStart(7)} ${String(m.burst).padStart(6)} ${String(m.prio).padStart(6)} ${String(m.completion).padStart(11)} ${String(m.turnaround).padStart(11)} ${String(m.waiting).padStart(8)}`)
  ].join("\n");
  document.getElementById('metricsPre').innerText = metricsTxt;
  metrics.forEach(m=> log(`${m.pid}: completion=${m.completion}, turnaround=${m.turnaround}, waiting=${m.waiting}`));
  log("Simulation computed. Press Play to animate.");
});

/* -------------------------
  Playback: animate the timeline
   ------------------------- */
let animState = {playing:false, paused:false, tick:0, startTime:0, speed:1, animId:null};
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
document.getElementById('speed').addEventListener('input', (e)=> animState.speed = Number(e.target.value));

function highlightAtTime(t){
  const svg = document.getElementById('gantt');
  [...svg.querySelectorAll('rect.gantt-block')].forEach(r=> r.setAttribute('opacity', '0.8'));
  const seg = timeline.find(s=> s.start <= t && t < s.end);
  if(seg){
    const rects = [...svg.querySelectorAll('rect.gantt-block')].filter(r=>r.dataset.pid === seg.pid);
    rects.forEach(r=> r.setAttribute('opacity','1.0'));
  }
}

function animateFromStart(){
  if(!timeline || timeline.length===0){ log("No timeline to play."); return; }
  animState.playing = true; animState.paused = false;
  const totalEnd = Math.max(...timeline.map(s=>s.end));
  const startTS = performance.now();
  animState.startTime = startTS - animState.tick*1000/animState.speed;
  function step(now){
    if(!animState.playing) return;
    if(animState.paused){ animState.animId = requestAnimationFrame(step); return; }
    const elapsed = (now - animState.startTime) * animState.speed;
    const tSec = elapsed / 1000;
    animState.tick = tSec;
    highlightAtTime(tSec);
    drawPlayMarker(tSec);
    if(tSec >= totalEnd + 0.001){
      log("Animation finished.");
      animState.playing = false;
      cancelAnimationFrame(animState.animId);
      return;
    }
    animState.animId = requestAnimationFrame(step);
  }
  animState.animId = requestAnimationFrame(step);
  log("Playing animation.");
}

function drawPlayMarker(t){
  const svg = document.getElementById('gantt');
  [...svg.querySelectorAll('.play-marker')].forEach(n=>n.remove());
  if(!timeline || timeline.length===0) return;
  const merged = mergeTimelineSegments(timeline);
  const maxT = Math.max(...merged.map(s=>s.end));
  const width = 980; const left=10; const right=10; const innerW = width - left - right;
  const x = left + (t / maxT) * innerW;
  const svgNS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(svgNS,'line'); line.setAttribute('x1',x); line.setAttribute('x2',x);
  line.setAttribute('y1',10); line.setAttribute('y2',210); line.setAttribute('stroke','#fff'); line.setAttribute('stroke-width',1.2);
  line.setAttribute('class','play-marker'); svg.appendChild(line);
}

playBtn.addEventListener('click', ()=>{
  if(animState.playing && animState.paused){
    animState.paused = false;
    log("Resumed.");
    return;
  }
  if(!animState.playing){
    animState.tick = 0;
    animateFromStart();
  }
});
pauseBtn.addEventListener('click', ()=>{
  if(!animState.playing) return;
  animState.paused = true;
  log("Paused.");
});
stopBtn.addEventListener('click', ()=>{
  if(animState.animId) cancelAnimationFrame(animState.animId);
  animState.playing = false; animState.paused=false; animState.tick=0;
  [...document.querySelectorAll('.play-marker')].forEach(n=>n.remove());
  const svg = document.getElementById('gantt'); [...svg.querySelectorAll('rect.gantt-block')].forEach(r=> r.setAttribute('opacity','0.8'));
  log("Stopped.");
});

/* -------------------------
  Export log
   ------------------------- */
document.getElementById('exportLog').addEventListener('click', ()=>{
  const content = logEl.innerText;
  const blob = new Blob([content], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'simulation_log.txt'; a.click();
  URL.revokeObjectURL(url);
});

/* -------------------------
  Init
   ------------------------- */
renderProcessList();
log("Ready. Add processes or load sample, choose algorithm, and Run Simulation.");
