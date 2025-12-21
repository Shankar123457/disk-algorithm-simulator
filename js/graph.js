// graph.js

let canvas, ctx;

const anim = {
  points: [],
  i: 0,
  t: 0,
  playing: false,
  speed: 1,
  raf: null,
  diskSize: 100,
};

export function initGraph(id) {
  canvas = document.getElementById(id);
  ctx = canvas.getContext("2d");

  window.addEventListener("resize", () => {
    if (anim.points.length)
      prepareStaticDrawing(anim.points.map(p => p.cyl), anim.diskSize);
    else
      drawEmptyGraph();
  });
}

function resize() {
  const p = canvas.parentElement;
  canvas.width = p.clientWidth;
  canvas.height = p.clientHeight;
}

/* ===============================
   EMPTY GRAPH
================================ */
export function drawEmptyGraph() {
  resize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#444";
  ctx.font = "14px Inter";
  ctx.textAlign = "center";
  ctx.fillText(
    "Run simulation to visualize disk arm movement",
    canvas.width / 2,
    canvas.height / 2
  );
}

/* ===============================
   PREPARE STATIC GRAPH
================================ */
export function prepareStaticDrawing(sequence, diskSize = 100) {
  resize();

  anim.diskSize = diskSize;
  anim.points = [];

  const pad = 60;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  sequence.forEach((cyl, i) => {
    const x = pad + (w / (sequence.length - 1)) * i;
    const y = pad + h - (cyl / diskSize) * h;
    anim.points.push({ x, y, cyl });
  });

  anim.i = 0;
  anim.t = 0;
  anim.playing = false;

  drawStatic();
}

/* ===============================
   DRAW LABEL ABOVE DOT
================================ */
function drawLabel(text, x, y) {
  ctx.font = "11px Inter";
  ctx.textAlign = "center";
  ctx.fillStyle = "#374151";
  ctx.fillText(text, x, y - 10);
}

/* ===============================
   DRAW STATIC GRAPH
================================ */
function drawStatic() {
  resize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pad = 60;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  /* Border */
  ctx.strokeStyle = "#d1d5db";
  ctx.strokeRect(pad, pad, w, h);

  /* Path */
  ctx.beginPath();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;

  anim.points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  /* Points + Labels */
  anim.points.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? "#10b981" : "#ef4444";

    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // cylinder value above dot
    drawLabel(p.cyl, p.x, p.y);
  });
}

/* ===============================
   ANIMATION CONTROLS
================================ */
export function startAnimation() {
  if (!anim.points.length) return;
  anim.playing = true;
  animate();
}

export function pauseAnimation() {
  anim.playing = false;
  cancelAnimationFrame(anim.raf);
}

export function resetAnimation() {
  anim.i = 0;
  anim.t = 0;
  drawStatic();
}

export function setSpeed(s) {
  anim.speed = s;
}

/* ===============================
   ANIMATION LOOP
================================ */
function animate() {
  if (!anim.playing) return;

  resize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStatic();

  let a = anim.points[anim.i];
  let b = anim.points[anim.i + 1];

  if (!b) {
    anim.playing = false;
    return;
  }

  anim.t += 0.02 * anim.speed;

  if (anim.t >= 1) {
    anim.t = 0;
    anim.i++;
    if (anim.i >= anim.points.length - 1) {
      anim.playing = false;
      return;
    }
    a = anim.points[anim.i];
    b = anim.points[anim.i + 1];
  }

  const x = a.x + (b.x - a.x) * anim.t;
  const y = a.y + (b.y - a.y) * anim.t;

  /* Moving head */
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();

  /* Moving head value */
  const currentCyl = Math.round(
    a.cyl + (b.cyl - a.cyl) * anim.t
  );
  drawLabel(currentCyl, x, y);

  anim.raf = requestAnimationFrame(animate);
}
