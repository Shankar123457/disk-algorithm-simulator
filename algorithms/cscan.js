// algorithms/cscan.js
// Always moves in one direction, jumps to zero without servicing

export default function compute(requests, head, direction = "right", diskSize = 200) {
  const seq = [head];
  const sorted = [...requests].sort((a, b) => a - b);
  let totalSeek = 0;

  const right = sorted.filter(r => r >= head);
  const left = sorted.filter(r => r < head);

  if (direction === "right") {
    // go right
    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    // go to last track
    totalSeek += Math.abs((diskSize - 1) - seq[seq.length - 1]);
    seq.push(diskSize - 1);

    // jump to zero
    totalSeek += (diskSize - 1);
    seq.push(0);

    // service left
    left.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

  } else {
    // direction left
    left.sort((a, b) => b - a).forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });

    // go to zero
    totalSeek += Math.abs(seq[seq.length - 1] - 0);
    seq.push(0);

    // jump to end
    totalSeek += (diskSize - 1);
    seq.push(diskSize - 1);

    // service right
    right.forEach(r => {
      totalSeek += Math.abs(r - seq[seq.length - 1]);
      seq.push(r);
    });
  }

  return { sequence: seq, totalSeek };
}
