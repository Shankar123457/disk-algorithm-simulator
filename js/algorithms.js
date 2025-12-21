// algorithms.js

export function sanitizeRequests(requests, diskSize) {
  return requests
    .map(n => parseInt(n))
    .filter(n => !isNaN(n) && n >= 0 && n < diskSize);
}

export function fcfs(head, requests) {
  const sequence = [head, ...requests];
  let totalSeek = 0;
  for (let i = 0; i < sequence.length - 1; i++)
    totalSeek += Math.abs(sequence[i + 1] - sequence[i]);

  return { sequence, totalSeek };
}

export function sstf(head, requests) {
  const seq = [head];
  const rem = [...requests];
  let curr = head;
  let seek = 0;

  while (rem.length > 0) {
    let best = 0;
    let bestDist = Math.abs(rem[0] - curr);

    for (let i = 1; i < rem.length; i++) {
      const d = Math.abs(rem[i] - curr);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }

    seek += bestDist;
    curr = rem[best];
    seq.push(curr);
    rem.splice(best, 1);
  }

  return { sequence: seq, totalSeek: seek };
}

export function scan(head, requests, diskSize, direction) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let seek = 0;

  const left = sorted.filter(r => r < head).reverse();
  const right = sorted.filter(r => r >= head);

  if (direction === "right") {
    right.forEach(r => seq.push(r));
    if (right.length) {
      seek += (diskSize - 1) - head;
      seq.push(diskSize - 1);
    }
    left.forEach(r => seq.push(r));
  } else {
    left.forEach(r => seq.push(r));
    if (left.length) {
      seek += head;
      seq.push(0);
    }
    right.forEach(r => seq.push(r));
  }

  for (let i = 0; i < seq.length - 1; i++)
    seek += Math.abs(seq[i + 1] - seq[i]);

  return { sequence: seq, totalSeek: seek };
}

export function cscan(head, requests, diskSize, direction) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let seek = 0;

  const left = sorted.filter(r => r < head);
  const right = sorted.filter(r => r >= head);

  if (direction === "right") {
    right.forEach(r => seq.push(r));
    if (right.length) {
      seq.push(diskSize - 1, 0);
      seek += (diskSize - 1) - head;
      seek += (diskSize - 1);
    }
    left.forEach(r => seq.push(r));
  } else {
    left.reverse().forEach(r => seq.push(r));
    if (left.length) {
      seq.push(0, diskSize - 1);
      seek += head;
      seek += (diskSize - 1);
    }
    right.reverse().forEach(r => seq.push(r));
  }

  for (let i = 0; i < seq.length - 1; i++)
    seek += Math.abs(seq[i + 1] - seq[i]);

  return { sequence: seq, totalSeek: seek };
}

export function look(head, requests, diskSize, direction) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let seek = 0;

  const left = sorted.filter(r => r < head).reverse();
  const right = sorted.filter(r => r >= head);

  if (direction === "right") {
    right.forEach(r => seq.push(r));
    left.forEach(r => seq.push(r));
  } else {
    left.forEach(r => seq.push(r));
    right.forEach(r => seq.push(r));
  }

  for (let i = 0; i < seq.length - 1; i++)
    seek += Math.abs(seq[i + 1] - seq[i]);

  return { sequence: seq, totalSeek: seek };
}

export function clook(head, requests, diskSize, direction) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let seek = 0;

  const left = sorted.filter(r => r < head);
  const right = sorted.filter(r => r >= head);

  if (direction === "right") {
    right.forEach(r => seq.push(r));
    left.forEach(r => seq.push(r));
  } else {
    left.reverse().forEach(r => seq.push(r));
    right.reverse().forEach(r => seq.push(r));
  }

  for (let i = 0; i < seq.length - 1; i++)
    seek += Math.abs(seq[i + 1] - seq[i]);

  return { sequence: seq, totalSeek: seek };
}
