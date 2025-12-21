// main.js
import * as alg from "./algorithms.js";
import {
  initGraph,
  prepareStaticDrawing,
  drawEmptyGraph,
  startAnimation,
  pauseAnimation,
  resetAnimation,
  setSpeed
} from "./graph.js";

const $ = id => document.getElementById(id);

let requests = [];
let simulation = null;

function randomRequests(n, max) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * max));
}

function init() {

  /* Theme Load */
  const saved = localStorage.getItem("ds_theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    $("themeToggle").textContent = "☀️ Light Mode";
  } else $("themeToggle").textContent = "🌙 Dark Mode";

  /* Default Values */
  $("diskSize").value = 100;
  $("initialHead").value = 50;
  $("initialHead").max = 100;
  $("requestInput").max = 99;
  $("requestInput").value = 50;

  requests = randomRequests(30, 100);
  renderRequests();

  /* Graph */
  initGraph("diskGraph");
  drawEmptyGraph();

  $("addBtn").onclick = addRequest;
  $("loadSample").onclick = loadSample;
  $("clearAll").onclick = clearAll;
  $("runSim").onclick = runSim;

  $("playBtn").onclick = () => simulation && startAnimation();
  $("pauseBtn").onclick = pauseAnimation;
  $("resetBtn").onclick = () => resetAnimation();

  $("speedRange").oninput = e => {
    $("speedLabel").textContent = e.target.value + "x";
    setSpeed(parseFloat(e.target.value));
  };

  $("themeToggle").onclick = () => {
    const dark = document.body.classList.toggle("dark");
    $("themeToggle").textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
    localStorage.setItem("ds_theme", dark ? "dark" : "light");

    simulation
      ? prepareStaticDrawing(simulation.sequence, parseInt($("diskSize").value))
      : drawEmptyGraph();
  };
}

function renderRequests() {
  $("requestList").innerHTML = requests.length
    ? `<div>Total: ${requests.length}</div><div>${requests.join(", ")}</div>`
    : `<div>No Requests</div>`;
}

function addRequest() {
  const val = parseInt($("requestInput").value);
  const max = parseInt($("diskSize").value);
  if (isNaN(val) || val < 0 || val >= max) return alert("Invalid request");

  requests.push(val);
  renderRequests();
}

function loadSample() {
  const max = parseInt($("diskSize").value);
  requests = randomRequests(30, max);
  renderRequests();
}

function clearAll() {
  requests = [];
  simulation = null;
  renderRequests();
  drawEmptyGraph();
  $("totalSeek").textContent = "—";
  $("avgSeek").textContent = "—";
  $("reqServed").textContent = "—";
  $("sequenceLog").textContent = "";
}

function runSim() {
  const algo = $("algoSelect").value;
  const head = parseInt($("initialHead").value);
  const max = parseInt($("diskSize").value);
  const dir = $("direction").value;

  const reqs = alg.sanitizeRequests(requests, max);
  if (!reqs.length) return alert("No valid requests");

  if (algo === "FCFS") simulation = alg.fcfs(head, reqs);
  else if (algo === "SSTF") simulation = alg.sstf(head, reqs);
  else if (algo === "SCAN") simulation = alg.scan(head, reqs, max, dir);
  else if (algo === "CSCAN") simulation = alg.cscan(head, reqs, max, dir);
  else if (algo === "LOOK") simulation = alg.look(head, reqs, max, dir);
  else simulation = alg.clook(head, reqs, max, dir);

  prepareStaticDrawing(simulation.sequence, max);

  $("totalSeek").textContent = simulation.totalSeek;
  $("avgSeek").textContent = (simulation.totalSeek / reqs.length).toFixed(2);
  $("reqServed").textContent = reqs.length;
  $("sequenceLog").textContent = simulation.sequence.join(" → ");
}

window.onload = init;
