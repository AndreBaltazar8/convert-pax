// Lossless nested sample lattice. Old pixels occupy even coordinates at the next
// level; only the missing odd samples are transmitted. No old pixel is resent.
export function paeth(a, b, c) { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c; }
export function unfilterRows(filtered, width, height, channels = 4) {
  const stride = width * channels;
  if (filtered.length !== (stride + 1) * height) throw new Error('Bad filtered image size');
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (stride + 1)]; if (filter > 4) throw new Error('Invalid PNG row filter');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, left = x >= channels ? out[i - channels] : 0, up = y ? out[i - stride] : 0, upperLeft = y && x >= channels ? out[i - stride - channels] : 0;
      const prediction = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0;
      out[i] = filtered[y * (stride + 1) + 1 + x] + prediction;
    }
  }
  return out;
}
export function mergeAxis(previous, pw, ph, missing, axis) {
  if (previous.length !== pw * ph * 4 || missing.length !== previous.length || !['x', 'y'].includes(axis)) throw new Error('Invalid lattice axis');
  const w = axis === 'x' ? pw * 2 : pw, h = axis === 'y' ? ph * 2 : ph, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const a = (y * pw + x) * 4, b = ((axis === 'y' ? y * 2 : y) * w + (axis === 'x' ? x * 2 : x)) * 4;
    out.set(previous.subarray(a, a + 4), b); out.set(missing.subarray(a, a + 4), b + (axis === 'x' ? 4 : w * 4));
  }
  return out;
}
