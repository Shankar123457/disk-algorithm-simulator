// algorithms/clook.js
// Circular LOOK — jumps between min and max request only

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

    if (left.length > 0) {
      totalSeek += Math.abs(right[right.length - 1] - left[0]); // jump
    }

    left.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

  } else {
    left.reverse().forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    if (right.length > 0) {
      totalSeek += Math.abs(left[0] - right[right.length - 1]); // jump
    }

    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });
  }

  return { sequence: seq, totalSeek };
}
