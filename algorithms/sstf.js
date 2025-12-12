// algorithms/sstf.js

export default function compute(requests, head) {
  const sequence = [head];
  const remaining = [...requests];
  let current = head;
  let totalSeek = 0;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDist = Math.abs(remaining[0] - current);

    for (let i = 1; i < remaining.length; i++) {
      const d = Math.abs(remaining[i] - current);
      if (d < minDist) {
        minDist = d;
        nearestIndex = i;
      }
    }

    current = remaining[nearestIndex];
    totalSeek += minDist;
    sequence.push(current);
    remaining.splice(nearestIndex, 1);
  }

  return { sequence, totalSeek };
}
