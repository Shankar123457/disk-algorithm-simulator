// algorithms/scan.js
// direction = "right" or "left"

export default function compute(requests, head, direction = "right", diskSize = 200) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let totalSeek = 0;

  const left = sorted.filter(r => r < head).sort((a, b) => b - a);
  const right = sorted.filter(r => r >= head).sort((a, b) => a - b);

  if (direction === "right") {
    // go right → end → back left
    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    // go to disk end
    totalSeek += Math.abs((diskSize - 1) - seq[seq.length - 1]);
    seq.push(diskSize - 1);

    left.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

  } else {
    // go left → 0 → right
    left.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    // go to zero
    totalSeek += Math.abs(0 - seq[seq.length - 1]);
    seq.push(0);

    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });
  }

  return { sequence: seq, totalSeek };
}
