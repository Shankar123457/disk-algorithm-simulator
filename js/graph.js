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

function dark() {
  return document.body.classList.contains("dark");
}

export function initGraph(id) {
  canvas = document.getElementById(id);
  ctx = canvas.getContext("2d");

  window.addEventListener("resize", () => {
    if (anim.points.length) prepareStaticDrawing(anim.points.map(p => p.cyl), anim.diskSize);
    else drawEmptyGraph();
  });
}

function resize() {
  const p = canvas.parentElement;
  canvas.width = p.clientWidth;
  canvas.height = p.clientHeight;
}

export function drawEmptyGraph() {
  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = dark() ? "#9ca3af" : "#444";
  ctx.font = "14px Inter";
  ctx.textAlign="center";
  ctx.fillText("Run simulation to visualize disk arm movement", canvas.width/2, canvas.height/2);
}

export function prepareStaticDrawing(sequence, diskSize=100) {
  resize();

  anim.diskSize = diskSize;
  anim.points = [];
  const pad = 60;
  const w = canvas.width - pad*2;
  const h = canvas.height - pad*2;

  sequence.forEach((cyl,i)=>{
    const x = pad + (w/(sequence.length-1))*i;
    const y = pad + h - (cyl/diskSize)*h;
    anim.points.push({x,y,cyl});
  });

  anim.i = 0;
  anim.t = 0;
  anim.playing = false;

  drawStatic();
}

function drawStatic() {
  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const pad = 60;
  const w = canvas.width-pad*2;
  const h = canvas.height-pad*2;

  ctx.strokeStyle = dark() ? "#3a3a3a" : "#ddd";
  ctx.strokeRect(pad,pad,w,h);

  ctx.beginPath();
  ctx.strokeStyle = dark() ? "#2563eb" : "#2563eb";
  anim.points.forEach((p,i)=>{
    if(i===0) ctx.moveTo(p.x,p.y);
    else ctx.lineTo(p.x,p.y);
  });
  ctx.stroke();

  anim.points.forEach((p,i)=>{
    ctx.fillStyle = i===0 ? "#10b981" : "#ef4444";
    ctx.beginPath();
    ctx.arc(p.x,p.y,5,0,Math.PI*2);
    ctx.fill();
  });
}

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

export function setSpeed(s) { anim.speed = s; }

function animate() {
  if (!anim.playing) return;

  resize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawStatic();

  let a = anim.points[anim.i];
  let b = anim.points[anim.i+1];
  if (!b) { anim.playing=false; return; }

  anim.t += 0.02 * anim.speed;
  if (anim.t >= 1) {
    anim.t = 0;
    anim.i++;
    if (anim.i >= anim.points.length-1) { anim.playing=false; return; }
    a = anim.points[anim.i];
    b = anim.points[anim.i+1];
  }

  const x = a.x + (b.x-a.x)*anim.t;
  const y = a.y + (b.y-a.y)*anim.t;

  ctx.fillStyle = dark() ? "#10b981" : "#10b981";
  ctx.beginPath();
  ctx.arc(x,y,7,0,Math.PI*2);
  ctx.fill();

  anim.raf = requestAnimationFrame(animate);
}
