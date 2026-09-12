import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
let basisPromise;
async function basis() {
  if (!basisPromise) basisPromise = (async () => {
    const filename = require.resolve('three/examples/jsm/libs/basis/basis_transcoder.js');
    const code = await fs.readFile(filename, 'utf8'), wasmBinary = await fs.readFile(path.join(path.dirname(filename),'basis_transcoder.wasm'));
    // Execute the installed Three.js UMD transcoder with its normal Node context.
    const factory = new Function('module','exports','require','__dirname','__filename',`${code}\nreturn BASIS;`)({exports:{}},{},require,path.dirname(filename),filename);
    const module = await factory({ wasmBinary }); module.initializeBasis(); return module;
  })();
  return basisPromise;
}
export async function decodeBasis(bytes) {
  const module = await basis(), file = new module.KTX2File(new Uint8Array(bytes));
  try {
    if (!file.isValid() || file.getFaces() !== 1 || file.getLayers() > 1) throw new Error('Expected a 2D Basis KTX2 texture');
    const width=file.getWidth(), height=file.getHeight();
    if (!file.startTranscoding()) throw new Error('Basis transcoding failed');
    const data = new Uint8Array(file.getImageTranscodedSizeInBytes(0,0,0,13));
    if (!file.transcodeImage(data,0,0,0,13,0,-1,-1) || data.length !== width*height*4) throw new Error('Basis RGBA decode failed');
    return { data, info: {width,height,channels:4} };
  } finally { file.close(); file.delete(); }
}
