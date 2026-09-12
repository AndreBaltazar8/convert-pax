import sharp from 'sharp';
import { inflateSync } from 'node:zlib';
// Let libpng choose robust adaptive row filters, retaining only the filtered bytes.
// PAX's gzip envelope supplies the entropy coding, so PNG headers/IDAT are not duplicated.
export async function filteredRows(raw, width, height) {
  const png = await sharp(raw, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 1, adaptiveFiltering: true }).toBuffer();
  if (png[24] !== 8 || png[25] !== 6) throw new Error('Expected RGBA8 PNG');
  const chunks = [];
  for (let p = 8; p < png.length;) { const n = png.readUInt32BE(p), type = png.toString('ascii', p + 4, p + 8); if (type === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + n)); p += n + 12; }
  return inflateSync(Buffer.concat(chunks));
}
export function sample(raw, width, height, step) {
  const w = width / step, h = height / step, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = (y * step * width + x * step) * 4; out.set(raw.subarray(a, a + 4), (y * w + x) * 4); } return out;
}
