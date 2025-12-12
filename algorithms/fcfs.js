// algorithms/fcfs.js

export default function compute(requests, head) {
  const sequence = [head, ...requests];
  let totalSeek = 0;

  for (let i = 1; i < sequence.length; i++) {
    totalSeek += Math.abs(sequence[i] - sequence[i - 1]);
  }

  return { sequence, totalSeek };
}
