// algorithms/look.js
// Like SCAN but does not go to disk edges

export default function compute(requests, head, direction = "right") {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let totalSeek = 0;

  const left = sorted.filter(r => r < head);
  const right = sorted.filter(r => r >= head);

  if (direction === "right") {
    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    left.reverse().forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

  } else {
    left.reverse().forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });
  }

  return { sequence: seq, totalSeek };
}
