# PAX file format — version 0

PAX is an experimental progressively decodable scene container. Its bootstrap uses
glTF 2.0 semantics, and later packets append original vertex tuples, patch primitive
connectivity, and refine textures on the same scene. Format version is the integer
**0**. Package release versions are separate. Legacy `PAX1` files are incompatible
and must be reconverted. A reader MUST reject unsupported numeric versions.

This document specifies the current wire format. “MUST” and “MUST NOT” define
requirements; quality heuristics and renderer implementation choices are not wire
requirements. Integers and typed payload arrays are little-endian. JSON is UTF-8.

## 1. Container

The file consists of a 32-byte header, a contiguous directory, and contiguous packet
payloads in directory order. There are no separators or inter-packet alignment
bytes. Offset and file length include the header and directory.

### Header

| Offset | Type | Meaning |
| ---: | --- | --- |
| 0 | byte[4] | Magic `50 41 58 00` hexadecimal (`PAX` and NUL) |
| 4 | uint32 | Numeric format version, MUST be `0` |
| 8 | uint32 | Directory entry count, including manifest/bootstrap/end |
| 12 | uint32 | Entry byte stride, MUST be `40` |
| 16 | uint64 | Exact whole-file byte length |
| 24 | uint64 | First payload offset, MUST equal `32 + count * 40` |

### Directory entry (40 bytes)

| Relative offset | Type | Meaning |
| ---: | --- | --- |
| 0 | uint16 | Packet type: 1 manifest, 2 bootstrap, 3 geometry, 4 texture, 5 extension, 255 end |
| 2 | uint8 | Outer compression: 0 raw, 1 a complete gzip member |
| 3 | uint8 | Flags: bit 0 final refinement hint; all other bits MUST be zero |
| 4 | uint16 | Scheduled refinement level, 0 for bootstrap dependencies |
| 6 | uint16 | Reserved, MUST be zero |
| 8 | uint32 | Resource: manifest primitive-array index for geometry, image index for textures, otherwise `0xffffffff` |
| 12 | uint32 | Tile ID or `0xffffffff` for a whole-resource packet |
| 16 | uint32 | Direct dependency entry index, or `0xffffffff` for none |
| 20 | uint32 | Exact decompressed packet length |
| 24 | uint64 | Absolute payload offset |
| 32 | uint32 | Exact stored payload length |
| 36 | uint32 | CRC-32 of the decompressed payload |

CRC-32 uses the reflected IEEE polynomial `0xedb88320`, initial value `0xffffffff`,
and final XOR `0xffffffff`. It detects corruption; it is not authentication.
Geometry CRC covers the envelope with its encoded blocks, before inner block decode.
For raw packets stored and decompressed lengths MUST be equal.

Offsets MUST be contiguous, beginning at the header's first payload offset and
ending at the declared file length. A dependency MUST reference an earlier entry.
Entry 0 MUST be manifest, entry 1 bootstrap, and the last entry end. No duplicate
manifest/bootstrap/end, trailing bytes, unknown packet types, unknown compression,
unknown flag bits, or truncated payloads are accepted. A complete streaming reader
MUST check length and CRC before applying a packet.

The reference reader limits directories to 500,000 entries, stored packets to
256 MiB and decoded packets/blocks to 512 MiB; offsets must be exactly representable
as JavaScript safe integers. Applications should additionally impose total memory,
vertex, image-size and execution limits appropriate to their environment.

The final flag is a hint, not a replacement for the payload's final marker or
completion validation. Directory levels are scheduling levels. A texture packet's
own local level can differ from its directory level.

## 2. Payload envelope

Manifest and end are plain JSON bytes. Every other packet starts with:

1. uint32 JSON byte length `N`;
2. `N` JSON bytes;
3. zero padding to the next multiple of four;
4. arrays in the order defined for that packet, each followed by zero padding to
   the next multiple of four.

Typed array counts are element counts, not byte lengths, unless explicitly named
`byteLength`, `filteredLength`, `templateLength`, `bytes`, or `raw`. Typed arrays use
the glTF component mapping 5120=int8, 5121=uint8, 5122=int16, 5123=uint16,
5125=uint32, 5126=float32. Numeric float bit patterns are preserved by the codec.
The metadata MUST NOT refer beyond the available payload.

## 3. Manifest (type 1)

The following fields control decoding:

| Field | Meaning |
| --- | --- |
| `version` | Integer 0, agrees with header |
| `features` | Array of required feature names; current names are `primitive-modes`, `final-order`, `extension-packets`; unknown names reject |
| `levels` | Number of scheduled geometry levels, including bootstrap 0 |
| `bootstrapExtensionPackets` | Number of level-0 extension packets required before scene exposure; default 0 |
| `primitives` | Ordered array of progressive primitive descriptions |
| `textures` | Ordered array of image descriptions, indexed by original image index |

Each primitive description contains:

- `mesh`, `primitive`: canonical bootstrap glTF mesh/primitive indices.
- `instances`: additional `{mesh, primitive}` references sharing identical geometry.
- `indexWidth`: 1 points, 2 line segments, 3 triangles.
- `originalMode`: source glTF primitive mode (0–6), for provenance.
- `baseVertices`, `finalVertices`, `baseTriangles`, `finalTriangles`: tuple and
  primitive-element counts. Historical `Triangles` names count points/segments too.
- `levels`: this primitive's own level count, including 0. Different primitives
  can have different counts; completed primitives need no further packets.
- `attributes`: ordered `{semantic, componentType, itemSize, normalized, morph?}`
  descriptions. `morph` is the zero-based morph target index. The same array order
  is used in every patch. Missing morph semantics are explicitly zero-filled.

Texture descriptions contain `image`, final `width`/`height`, `baseWidth`/
`baseHeight`, `codec`, and `levels` including the base. `tile-lattice` also has
`tileSize` and `tileCount`. Codec names are defined below. `image` agrees with the
array index. Sampler, texture-transform, color-space and material-channel semantics
come from the bootstrap glTF, not from the RGBA storage itself.

Encoder provenance fields include `name`, `sourceBytes`, `sourceSHA256`,
`conversionSettings`, `maxOverhead`, `animations`, `extensionStrategies`,
`geometryMode`, `textureMode`, `animationMode`; per-resource `quality`, `bounds`,
`roles`, `importance`, `previewError` are advisory. `sourceSHA256` hashes the original
input document; for multi-file glTF it does not hash the external resources.
Bounds retain accessor-space source min/max (apply normalization/node transforms
before using them as world-space bounds). Readers MUST NOT depend on advisory fields
for correct reconstruction. Additional advisory JSON fields can be ignored.

## 4. Bootstrap (type 2)

Envelope metadata: `{glbLength, textures:[{image,width,height}, ...]}`.
Arrays: the `glbLength` GLB bytes, then `width * height * 4` uint8 RGBA pixels for
each listed image, in list order.

The GLB is self-contained and holds the original scenes, hierarchy, transforms,
cameras, lights, materials, extension-owned stable references, animation clips,
skins/inverse-bind matrices, and coarse geometry and texture previews. Animation
samplers are complete at bootstrap; version 0 does not segment animation in time.
The pixel arrays are authoritative bootstrap decode samples. Embedded PNG previews
serve glTF parsers; the extra raw samples avoid color/premultiplication ambiguities
in subsequent lossless reconstruction. Both are counted in the file-size budget.

A renderer allocates capacity for final attributes and indices, copies bootstrap
values into their prefixes, and preserves object/material/animation identities
through refinement. Referenced attributes retain their component type,
normalization flag and morph target association. Initial primitive IDs are ordinal
positions in the bootstrap index buffer: 0, 1, 2, etc.

Scene exposure MUST wait for all declared bootstrap extension packets. Required
glTF extensions need a native progressive strategy or registered runtime adapter.
Unknown required semantics MUST NOT be silently dropped.

## 5. Geometry (type 3)

Envelope metadata:

```json
{"level":1,"primitives":[{"id":0,"start":24,"count":12,"removed":3,"added":8,"triangles":17,"order":0}]}
```

Version-0 directory-addressable geometry packets contain exactly one primitive
record; `id` MUST match the directory resource and `level` its scheduled level.
It MUST be the next level for that primitive. Arrays, in order:

1. For each manifest attribute, `count * itemSize` values of its component type.
2. `removed` uint32 primitive IDs.
3. `added` uint32 values, grouped as `(id, index_0, ..., index_(indexWidth-1))`.
4. `order` uint32 IDs (default zero), only required for final source ordering.

`start` MUST equal the number of already decoded vertices. Append arrays there;
never replace existing tuples. The new total MUST NOT exceed `finalVertices`.
Remove existing IDs, then insert new IDs. Added IDs MUST NOT already be active;
all indices MUST reference decoded vertices. The resulting active count MUST equal
`triangles`. Duplicate geometric primitives have distinct IDs and are preserved.

An order array lists every active ID once and sets the final draw order. It restores
source order and winding after vertex remapping. Before that, active draw order is
not prescribed. Source strips/fans/loops are expanded into equivalent independent
triangles or line segments. Unreferenced source tuples are appended in the final
stage. Final counts and original tuples/topology, including duplicates, are exact;
intermediate geometry is approximate.

### Optional lossless inner blocks

A geometry envelope may additionally contain `blocks`, one record per array in the
order above. Its physical arrays are encoded uint8 blocks instead of typed values.
Each record is `{codec, raw, bytes, stride}`: decoded byte length, encoded byte
length, and tuple byte stride. Decode each block before interpreting typed arrays.

- `raw`: unchanged bytes; `bytes == raw`.
- `delta`: bytewise tuple prediction. For each byte index `i`, decoded byte is
  encoded byte when `i < stride`, otherwise `(encoded[i] + decoded[i-stride]) % 256`.
  This predicts corresponding bytes of adjacent tuples without quantization.
- `meshopt`: meshoptimizer vertex-buffer bitstream, decoded with count `raw/stride`
  and byte stride `stride` (multiple of four, at most 256).
- `sequence`: meshoptimizer index-sequence bitstream, decoded as `raw/4` uint32
  values. It preserves exact element ordering; triangle index compression that
  rotates winding-equivalent triangles is not substituted here.

Normative external codec: [meshoptimizer buffer compression](https://github.com/zeux/meshoptimizer#vertex-buffer-compression).
The reference implementation pins meshoptimizer 1.2.0. `delta` and `raw` require
`bytes == raw`; meshopt decoded lengths must match their stride. Unknown inner
codecs reject. Outer gzip wraps the complete envelope, including encoded blocks.

Codec choice is an encoder decision: candidates compete by compressed byte size,
then the full block envelope competes against plain typed arrays under gzip.
No float quantization, octahedral filter or changed vertex value is introduced.

## 6. Textures (type 4)

Every texture packet names `image`, which MUST match the directory resource.
`level` is the local image/tile refinement level; `final` describes resource or tile
completion. Bootstrap material textures and their aliases retain their sampler,
channel, color-space and transform semantics while storage changes.

### `lattice`

Metadata: `{codec:"lattice", image, width, height, axis, level, final, filteredLength}`.
Array: `filteredLength` uint8 bytes. Each step doubles only `axis`, `"x"` or `"y"`.
Let the old grid be W×H. Decode a W×H RGBA missing-sample grid using PNG row filters
with four bytes per pixel. Each row starts with a filter byte 0–4 (None, Sub, Up,
Average, Paeth), followed by W×4 filtered bytes. No PNG wrapper or zlib stream is
present here; the packet's outer codec supplies entropy compression.

For x, old pixels occupy even columns and missing pixels odd columns. For y, old
pixels occupy even rows and missing pixels odd rows. These are exact spatial
samples, not averaged mips. Final pixels equal the source RGBA8 decode. Base and
intermediate previews can alias.

### `tile-lattice`

Metadata additionally names `tile`, `x`, `y`, `tileWidth`, `tileHeight`. These bounds
are measured in the full-resolution image; `width` and `height` are the current
local grid dimensions after this step. The directory tile MUST match `tile`.

Tiles partition the full image into `tileSize` squares, clipped at the right and
bottom edges, assigned row-major IDs. Tile size is a multiple of the bootstrap
sample step; clipped dimensions must divide exactly by that step. Tile 0 starts
at (0,0). A tile's initial grid is the corresponding rectangle of exact bootstrap
samples. Its local levels begin at 1 and apply the same alternating-axis algorithm
as `lattice`. Each tile depends on its own previous packet, or bootstrap for level 1.
Each original sample belongs to one tile and is transmitted once.

Tiles can refine independently. A full image completes only when every tile reaches
its declared full dimensions and final marker. The reference renderer reserves one
full-resolution RGBA8 texture, expands the currently known local sample grid by
nearest-neighbor replication for display, and updates only affected rows. Expansion
is presentation-only; authoritative tile samples are retained unchanged. Final
sampling uses the original material magnification/minification rules where available;
the current streaming tile renderer uses linear minification while loading, then
restores the original sampler and generates final mips in one final storage rebuild.

### `source`

Metadata: `{codec:"source", image, width, height, level, final:true, mimeType, byteLength}`.
Array: the unchanged encoded image bytes. PNG/JPEG/WebP/AVIF source decoding follows
the renderer's supported image codecs. The coarse preview is replaced. Its bytes
are counted as overhead and are not reused by the final source decoder.

### `ktx2`

Same fields as `source`, with `codec:"ktx2"`. The array is the entire unchanged
KTX2 texture. A compatible GPU transcoder/decoder must be configured. This is a
whole-texture fallback when mip packaging cannot fit the budget.

### `ktx2-mip`

Metadata: `{codec:"ktx2-mip", image, mip, level, width, height, final, templateLength, byteLength}`.
Arrays: optional `templateLength` template bytes first, then the original compressed
level's `byteLength` bytes. The first packet contains the template; subsequent ones
set `templateLength` to 0. Mips arrive smallest first (largest mip index), ending
with mip 0, and local `level` increments from 1. `width` and `height` are
`max(1, fullDimension >> mip)`.

The template is a KTX2 container with original metadata, data-format descriptors,
key/value data, level uncompressed lengths, and shared supercompression global data,
but empty `levelData` arrays. Codebooks are transmitted once. To decode one level,
construct a one-level KTX2 using that level's bytes and uncompressed length, its
mip dimensions, and, for BasisLZ, the corresponding `globalData.imageDescs[mip]`
entry while retaining shared endpoints/selectors/tables. Keep already transcoded
mip data for reuse with subsequently arriving larger levels. Every original
compressed level is carried unchanged. Whole-file KTX2 byte identity is not claimed
because its directory/serialization are reconstructed.

The implemented profile is 2D, one face, at most one array layer. Non-mip/unsupported
layouts use whole-source fallback or reject if the underlying decoder cannot handle
them. The converter's preview decoder supports RGBA8 output; arbitrary HDR/float
and video texture support is not implied. Current Three.js mip upgrades reuse
transcoded CPU data but reallocate GPU mip storage when dimensions grow.

## 7. Extensions (type 5)

Metadata: `{extension, level, data}`. Remaining arrays are extension-defined.
`extension` is the glTF extension name. The registered adapter defines array schema,
validation and update behavior. Its runtime handler MUST exist for type-5 packets.
Level 0 packets run after GLB parsing and before the initial scene callback. Later
extension packets run after all geometry refinements through their scheduled level
(each primitive is capped at its own final level). This is a scene-wide barrier.

Converter adapters provide `prepare`, `remap`, and optional `refine`. Stable scene,
material and animation references remain in bootstrap. Accessor/bufferView-owned
references are explicitly remapped; compression extensions are decoded before
progressive encoding. Runtime adapters can register a GLTFLoader plugin and
`onBase`, `onPacket`, `onRefine`, `onComplete` hooks. Unknown vendor extension
semantics require an explicit adapter; keeping unknown JSON is not equivalent to
support. See [COMPATIBILITY.md](docs/COMPATIBILITY.md) for the full implemented matrix.

## 8. End and completion (type 255)

Payload is `{"complete":true}`. A reader MUST have completed bootstrap and required
extension initialization, all per-primitive levels, final vertex/primitive counts,
final texture dimensions/tiles, and the declared geometry schedule before reporting
full completion. The streaming transport also requires EOF at the exact file length.
A partially loaded range session MUST NOT claim completion merely because it has
received a renderable scene or reached the requested LOD.

## 9. Random access and resume

Read bytes 0–31, then the directory. Fetch manifest/bootstrap and selected entries
using byte offsets. The reference HTTP transport requires correct `206` and
`Content-Range`, checks ETag continuity when supplied, and rejects servers ignoring
Range. Cross-origin hosts need CORS exposure for Content-Range and ETag.

Selection supports a maximum scheduled level, primitive IDs, image IDs, and tile
IDs. Recursively include dependency entries and bootstrap extension packets. An
extension barrier additionally includes all geometry needed for its level.
Apply packets in directory order. Entry IDs successfully applied in a session are
remembered, so later calls fetch only missing packets. Fetch end only when every
other entry has been applied or selected. This is an in-memory session, not a
persistent on-disk cache or automatic view-dependent scheduler. Default full
streaming uses one HTTP request and avoids per-range request latency.

## 10. Encoder profile and fidelity

The reference converter MUST refuse to write if the entire file exceeds
`floor(sourceBytes * 1.05)`. For multi-file glTF, source bytes include the document
and unique external resources once; data URIs are already included in the document.
There is no guarantee every input can satisfy this budget. Tiles/mips are preferred
where eligible; exact original-image fallback frees budget for expensive outliers.
Geometry compression savings can pay for texture packet overhead.

Adaptive geometry stages use source positions plus normal/UV/color error and
estimated benefit per byte. Their number is not fixed. `initialQuality`,
`geometryBaseRatio`, `textureBaseSize`, `geometryCodec`, `adaptive`, `textureTiles`
and `tileSize` are converter settings, recorded in provenance. They affect startup,
packet counts and intermediate quality, not final source tuples. This is discrete
progressive refinement, not continuous geomorphing or a vertex-split surface format.
Skin/morph tuples are exact; simplification is not a guarantee of optimal quality
under every possible deformation.

“Lossless” means exact decoded source tuples, equivalent expanded topology in
source order, original animation data, preserved scene/material semantics, and
exact final RGBA8 samples or unchanged source compressed texture levels. It does
not mean byte-for-byte round-trip of the input GLB, identical intermediate visuals,
or universal equality between different browser/GPU texture decoders.

## 11. Reference implementation and conformance

`spec-pax` owns this specification and portable decoding reference. `convert-pax`
owns conversion and size/fidelity tests. `three-pax` owns rendering, streaming and
browser comparison samples. All carry numeric wire version 0; package semantic
versions do not select a wire format. Future incompatible revisions must increment
the numeric version and define migration/reconversion rules.

Conformance checks include arbitrary byte fragmentation, invalid header/directory,
truncation/CRC rejection, exact mixed-type geometry codec round trips, original
vertex/topology/pixel reconstruction, complete KTX mip/codebook equality, bootstrap
extension gating, range selection/resume without duplicate bytes, and final rendered
comparison against the same source glTF. Reference limits and unimplemented codecs
are explicit; this research decoder is not a sandbox for hostile interactivity graphs.
