# convert-pax

Convert glTF 2.0 and GLB to **PAX v0** with progressive geometry and textures.
The complete output is limited to **105% of the input size**; conversion fails
if the asset cannot fit.

## Usage

Requires **Node.js 24+**. Supports local glTF files with external resources and GLB.

```sh
npm ci
node bin/convert-pax.mjs input.glb output.pax --initial-quality sharp
```

Writes `.pax` and `.stats.json`. The report includes sizes, stages, codecs,
quality estimates and reconstruction hashes.

```js
import {convert} from 'convert-pax';

await convert('input.glb', 'output.pax', {
  initialQuality: 'balanced', // fast | balanced | sharp
  textureBaseSize: 128,
  geometryBaseRatio: 0.015,
  geometryCodec: 'auto',     // auto | gzip
  adaptive: true,
  textureTiles: true,
  tileSize: 256,             // 128 | 256 | 512
});
```

CLI options: `--initial-quality`, `--texture-base-size`, `--geometry-base-ratio`,
`--geometry-codec`, `--tile-size`, `--no-adaptive`, `--no-texture-tiles`.

## Quality and compatibility

Settings control previews and refinement stages. Codecs are selected by size;
adaptive stages consider geometry and texture error. Original images are retained
when progressive encoding would exceed the budget. KTX2 can stream original mip
levels. Small assets or large previews can exceed the cap and fail conversion.

Final fidelity covers decoded geometry, topology, animation and scene semantics,
and exact RGBA8 pixels or original compressed textures. Source geometry compression
is decoded without adding float quantization. This is not a byte-identical GLB
round trip; previews are approximate.

See the [compatibility and adapter API](docs/COMPATIBILITY.md) and
[format specification](https://github.com/AndreBaltazar8/spec-pax) for support limits.

## Verification

```sh
npm test                 # core, extension and codec tests
npm run fixtures         # downloads one pinned CC0 texture for KTX2 tests
npm run assets           # downloads heavy test assets
npm run assets:optimized # meshopt + KTX2 helmet baseline
npm run test:full         # reconstruction, settings and mip tests
```

Browser tests are in [three-pax](https://github.com/AndreBaltazar8/three-pax).
[blender-pax](https://github.com/AndreBaltazar8/blender-pax) provides Blender import/export.

## License

[MIT](LICENSE). Generated fixtures are MIT except identified CC0 textures.
Optional downloads include CC0 FlightHelmet/BoomBox and BrainStem under its source
Poser EULA; download scripts save provenance and licensing. See
[third-party notices](THIRD_PARTY.md).
