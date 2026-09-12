# convert-pax

Convert glTF 2.0 or GLB assets to **PAX numeric version 0**, with reusable progressive
geometry, lossless texture tiles, and original compressed KTX2 mip streaming.
The complete output must be at most **105% of the input size**. Conversion rejects
an unfit asset instead of silently exceeding the budget.

```sh
npm ci
node bin/convert-pax.mjs input.glb output.pax
# Or after installing this package:
convert-pax input.gltf output.pax --initial-quality sharp --texture-base-size 128
```

Node.js 24 or newer is required. Local/external-resource glTF and GLB are supported.
The converter writes the `.pax` and a `.stats.json` file containing sizes, stage
counts, selected codecs, quality estimates and reconstruction hashes.

```js
import {convert} from 'convert-pax';
await convert('input.glb', 'output.pax', {
  textureBaseSize: 128,
  geometryBaseRatio: 0.015,
  initialQuality: 'balanced', // fast | balanced | sharp
  geometryCodec: 'auto',     // auto | gzip (plain comparison)
  adaptive: true,
  textureTiles: true,
  tileSize: 256,             // 128 | 256 | 512
});
```

CLI equivalents: `--texture-base-size`, `--geometry-base-ratio`,
`--initial-quality`, `--geometry-codec`, `--tile-size`, `--no-adaptive`, and
`--no-texture-tiles`. Settings affect startup/detail scheduling, not final tuples.
A small asset or aggressive preview setting can fail the strict whole-file cap.

Geometry block codecs compete by encoded size. Adaptive stages account for
position, normal, UV and vertex-color error. Texture importance and sampled error
control preview quality. Exact original-image fallback is used where progressive
image packaging would exceed the budget. Source compression is decoded before
geometry encoding; no new float quantization is applied.

[Specification](https://github.com/AndreBaltazar8/spec-pax) ·
[Three.js loader and samples](https://github.com/AndreBaltazar8/three-pax) ·
[glTF/extension matrix and custom adapter API](docs/COMPATIBILITY.md) ·
[Third-party notices](THIRD_PARTY.md)

## Verification

```sh
npm test                 # generated core/extension and binary/codec tests
npm run fixtures         # includes KTX2 fixture; one pinned CC0 texture download
npm run assets           # optional heavy original assets; see licenses below
npm run assets:optimized # optional meshopt + KTX2 helmet baseline
npm run test:full         # exact full-source reconstruction, options and mip tests
```

Heavy asset downloads include CC0 FlightHelmet/BoomBox and BrainStem under the
source's Poser EULA. They are not included in this repository; acquisition saves
provenance and licensing. Generated fixtures are MIT except their explicitly
identified CC0 source textures. Browser rendering tests live in `three-pax`.

Final fidelity means decoded source tuples/topology, animation and scene semantics,
and exact RGBA8 samples or original compressed texture data. It is not a bytewise
GLB round trip. See the specification for unsupported profiles and renderer limits.
