# PAX numeric version 0 measurements

Measured on 2026-09-12. Whole-file bytes include the 32-byte header, complete packet
directory, checksums, bootstrap, all refinements and end marker. Geometry levels
include bootstrap; each primitive can have fewer stages than the global schedule.

| Input | Source bytes | PAX bytes | Change | Bootstrap bytes | Global levels |
| --- | ---: | ---: | ---: | ---: | ---: |
| FlightHelmet | 48,383,388 | 50,440,003 | +4.25% | 842,374 | 8 |
| BoomBox | 10,614,184 | 11,102,572 | +4.60% | 160,671 | 8 |
| BrainStem | 3,194,848 | 1,658,933 | -48.07% | 404,517 | 8 |
| FlightHelmetOptimized | 32,793,900 | 33,626,449 | +2.54% | 100,852 | 8 |

All outputs satisfy the strict 105% cap. The optimized helmet uses the publisher's
KTX2 variant and lossless meshopt vertex coding without an added quantize transform.
Meshopt triangle compression can cyclically rotate triangle indices; a test verifies
identical vertex values and oriented topology. PAX is converted from that same
optimized GLB, and preserves its decoded tuples and final index order.

For BrainStem, the same adaptive layout with plain gzip produces **1,988,176 bytes**;
auto block-codec selection produces **1,658,933 bytes**, saving **329,243 bytes
(16.56%)**. This comparison changes only the inner geometry codec selection.
The additional savings are exact byte prediction/entropy coding, not quantization.

Validation: 22 Node tests and 25 browser tests passed in the original integration
workspace. Tests reconstruct source vertex tuples, primitive order, animations,
skins and pixels; verify every compressed KTX2 mip/codebook; compare final rendered
scenes; and exercise independent texture tiles plus HTTP range resume without
re-fetching applied packets. Generated material/interactivity/splat/KTX fixtures
matched baseline images with measured mean absolute RGB error 0 in the final checks.

The earlier PAX1 videos are historical artifacts and do not measure this version.
GPU morph caches still rebuild for morph-bearing stages. KTX2 levels reuse decoded
CPU mips but resize GPU storage. Frame gaps measure contention in the shared tab,
not isolated per-loader CPU use. These limits must accompany performance claims.

## Repeated browser timing

Chromium headless, SwiftShader software GPU; shared tab, 8 MiB/s independently paced per stream, 80 ms per request; 3 sequential runs; not hardware GPU claims. Medians of 3 runs. First render is a useful coarse frame for PAX and full parsed scene for GLB. Timings include processing; transfer accounting excludes app/decoder resources. The frame-gap count is shared by both panes.

| Asset | GLB first | PAX first | GLB complete | PAX complete | Shared frame gaps >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| BoomBox | 1.54 s | 0.49 s | 1.54 s | 7.17 s | 8 |
| BrainStem | 0.52 s | 0.20 s | 0.53 s | 0.52 s | 0 |
| FlightHelmet | 6.97 s | 0.67 s | 6.97 s | 9.52 s | 55 |
| FlightHelmetOptimized | 4.99 s | 1.60 s | 4.99 s | 4.25 s | 19 |

These measurements show earlier visibility, not universally faster full completion. CPU/GPU contention, worker initialization and mip uploads still matter. Reproduce with `node scripts/benchmark-v0.mjs` in three-pax after preparing the four inputs.
