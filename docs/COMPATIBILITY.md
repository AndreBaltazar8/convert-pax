# glTF compatibility and progressive extension adapters

This is an implementation matrix, not a claim of glTF conformance certification or support for every extension. The converter fails explicitly when a declared extension has no progressive adapter. It does not wrap an unsupported asset in an opaque complete-model payload and call that progressive support.

## Core glTF 2.0

| Feature | Progressive behavior |
| --- | --- |
| GLB and JSON `.gltf`; multiple buffers; external/data URI images and buffers | Resolve resources, then build a self-contained PAX stream. Multi-file size accounting includes external resource bytes once. |
| Dense, interleaved, normalized and sparse accessors | Decode the accessor layout, preserving component values and normalization. Matrix column padding is read/written correctly. |
| POINTS, LINES, LINE_LOOP, LINE_STRIP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN | Points and segments refine by ordered prefixes; loops/strips/fans expand to equivalent indexed primitives. Triangles use simplification stages. |
| Indexed/non-indexed geometry; shared geometry; custom attributes; vertex colors and UV sets | Vertex tuples append once per unique input geometry. Repeated primitives share the stream and runtime buffers. Final primitive ordering is restored. |
| Multiple scenes, node transforms, node instances, names/extras | All meshes are loaded and updated, including meshes outside the default scene. |
| Perspective/orthographic cameras | Retained in the bootstrap; selectable in the viewer. |
| PBR metallic/roughness, alpha MASK/BLEND, double-sided materials, PNG/JPEG, samplers | Material parameters and texture roles remain attached while image pixels refine. |
| Skins, multiple joint/weight sets, inverse bind matrices | Skeleton and clips arrive in the bootstrap; all skin attributes append with geometry. Extra weight sets have shader and CPU skin-transform support. |
| Position/normal/tangent morphs, mixed target channels, mesh/node weights | Missing target channels become zero deltas. Tangents have an additional GPU morph texture. |
| Translation/rotation/scale/weight animation, STEP/LINEAR/CUBICSPLINE, multiple clips | Original sampled clips arrive in the bootstrap and animate the evolving geometry. |

Geometry simplification is not deformation-aware. Camera/scene/clip/variant controls expose supported objects; the viewer remains a comparison tool, not a complete asset-authoring application. Rendering is subject to the browser's GPU limits, including texture dimensions, attribute count and morph-layer limits.

## Extension adapters

| Extensions | Adaptation |
| --- | --- |
| `KHR_draco_mesh_compression` | Decode source geometry before constructing reusable vertex/primitive patches. Source decoding precision is retained; the PAX codec adds no quantization. |
| `EXT_meshopt_compression`, `KHR_meshopt_compression` | Decode compressed buffer views first, then progressively encode attributes/indices. |
| `KHR_mesh_quantization` | Keep integer attributes and normalized flags. Use floating-point positions only for choosing simplification topology. |
| `EXT_mesh_gpu_instancing` | Instance transforms in the bootstrap; instances reference shared evolving geometry. |
| `KHR_texture_basisu` | Small RGBA preview; original compressed GPU mips arrive smallest first with one shared codebook. Exact full-source fallback enforces the size cap. |
| `EXT_texture_webp`, `EXT_texture_avif` | Decode to progressive RGBA samples, with exact original image fallback when needed for the budget. |
| `KHR_texture_transform` | UV transforms, channels and texture aliases remain attached as their image storage changes. |
| `KHR_materials_unlit`, `clearcoat`, `sheen`, `transmission`, `volume`, `ior`, `specular`, `iridescence`, `anisotropy`, `emissive_strength`, `dispersion`; `EXT_materials_bump` | Keep material semantics and bind their texture slots to the evolving image. No whole-model fallback. |
| `KHR_materials_diffuse_transmission` | Physical diffuse BTDF, factor/color texture slots refined in place, opposite-hemisphere lighting and IBL, transmission precedence and volume attenuation. |
| `KHR_gaussian_splatting` | Reusable distributed point prefixes; exact scale, quaternion, opacity and SH bands 0–3. WebGL2 anisotropic ellipse projection and camera-distance sorting. |
| `KHR_interactivity` | Execution graph in bootstrap, persistent variables/events and live scene/property bindings. Start, ticks, flow/math/ref/pointer/variable operations, animation controls, selection and hover. |
| `KHR_materials_variants` | Preload variant material dependencies; switching variants uses the same evolving geometry and textures. `gltf.selectVariant(nameOrIndex)` / `selectVariant(null)`. |
| `KHR_lights_punctual` | Lights are available in the bootstrap and remain in their node hierarchy. |
| `KHR_animation_pointer` | Bootstrap clips bind to supported node, camera, light, material and texture-transform properties. Unsupported pointer paths are rejected. |
| `KHR_node_visibility`, `KHR_node_selectability`, `KHR_node_hoverability` | Node flags and hierarchical picking filters; `gltf.raycast(raycaster, {kind:'select'|'hover'})`. Flags can be animation-pointer targets. |
| `KHR_xmp_json_ld` | Metadata and stable object references retained in the bootstrap. |

The abbreviated material names in the table carry the `KHR_materials_` prefix.

**Not implemented:** deprecated specular/glossiness materials, arbitrary vendor codecs, float/HDR images. An unknown extension or unsupported pointer does not silently become supported because its JSON can be copied. These require additional adapters and tests.

## Authoring a progressive adapter

Converter API:

```js
import { registerProgressiveExtension } from '../scripts/extensions.mjs';
registerProgressiveExtension('ACME_example', {
  strategy: 'describe the actual progressive representation',
  // Optional: decode/normalize extension-owned resources. Return {json,bin}
  // when replacing either object; never discard another extension's payload.
  prepare({ json, bin, asset }) {},
  // Remap extension-owned references into bootstrap storage.
  remap({ json, source, builder, copyAccessor, copyBufferView }) {},
  // Optional typed payload after each geometry stage (including bootstrap).
  refine({ level, levels, primitives, json, bin }) {
    return { meta: { level }, arrays: [new Uint32Array([level])] };
  },
});
```

Runtime API:

```js
const loader = new PAXLoader().registerExtension('ACME_example', {
  gltfPlugin: parser => ({ name: 'ACME_example' }),
  onBase({ gltf, manifest, states, imageStates }) {},
  onPacket({ packet, gltf, states, imageStates }) {
    const values = packet.take(Uint32Array, 1);
    // Apply extension state to the existing scene/resources.
  },
  onRefine({ event, gltf, states, imageStates }) {},
  onComplete({ gltf, manifest }) {},
});
```

Bootstrap extension packets must be applied before `onScene` exposes the scene. Later packets are bound to their geometry level. Their sizes are included in the same 5% budget. The runtime rejects missing handlers and out-of-order packets. `gltfPlugin` supplies glTF parsing behavior; progressive callbacks handle evolving data. Neither side alone is a complete adapter.

For Basis texture packets configure `setKTX2Loader()` with a renderer-aware Three.js KTX2Loader. The demo does this automatically. Decoder assets are copied from the installed Three.js package by `npm run prepare:decoders` / `npm ci`.

## Size and fidelity

The **complete PAX file must remain within source bytes × 1.05**. This is checked after extension payloads are generated. A highly compressed source, tiny asset, expensive quality setting, or extension representation can fail this budget. Such conversion is rejected, not silently emitted oversized. There is no promise that every valid glTF file can satisfy both progressive representation overhead and this strict cap.

Source geometry attribute values and final topology are retained after source compression decoding. Strip/fan/loop representation and accessor layout may change. Original texture samples are lossless in the lattice path; KTX2 compressed mip data is preserved exactly, with whole-source fallback. Intermediate views are deliberately approximate. “Lossless” does not mean the PAX file is byte-identical to its source GLB.

## Reproduce

```sh
npm ci
npm run assets
npm run fixtures -- --catalog
npm test
npm run test:browser
npm run build
```

Fixtures combine core modes/scenes with material extensions, instancing, variants and animated material properties; additional fixtures cover Draco, meshopt, Basis, eight skin weights, mixed tangent/normal morphs and custom extension packets. Basis fixture texture: the pinned FlightHelmet sample, CC0; generated test geometry/code: project MIT license. Browser checks compare final baseline/progressive pixels and exercise pre-completion callbacks, scene/variant controls and animations. These targeted fixtures are not exhaustive extension conformance suites.

Specification references: [glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [Khronos extension registry](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0), [Three.js GLTFLoader](https://github.com/mrdoob/three/blob/r186/examples/jsm/loaders/GLTFLoader.js).

## Measurements

See [RESULTS.md](RESULTS.md) for current numeric-version-0 measurements. Historical videos retain their original settings and timing.

## Runtime details for the additional extensions

`gltf.interactivity.start()` arms the graph, and `gltf.interactivity.update(deltaSeconds)` advances it from the host render loop. PAX starts it only after the bootstrap is ready. `select(nodeIndex, point, rayOrigin)` and `hover(nodeIndex)` feed picking events; the comparison viewer wires these to clicks and pointer motion. `dispose()` removes event listeners, stops animations and releases graph timers. Separate assets have isolated event buses by default, so the comparison panes cannot trigger each other. The engine and object-model code are vendored from the Apache-2.0 Khronos sample implementation; see [provenance](../vendor/khronos-interactivity/NOTICE.md).

Gaussian source attributes remain full precision in PAX. Coarse splat stages spread across the original field, and every splat is reused at completion. The WebGL2 renderer supports the base extension's ellipse kernel, both declared Rec.709 color spaces, perspective projection, camera-distance sorting and all four SH bands. Unknown kernels/projections/compression extensions are rejected. Sorting runs in a coalescing worker per primitive; overlapping separate splat primitives are not globally interleaved. GPU texture-size limits apply. This is a renderer for the experiment, not a production-scale million-splat scheduler.

Diffuse transmission uses the alpha channel for its factor map and sRGB RGB for its color map. It reduces diffuse reflection without tinting transmission by base color, excludes the metallic component, and leaves the reflective specular lobe intact. Regular transmission takes precedence. Volume attenuation uses local thickness, rather than a volumetric path tracer. Texture transforms and animated factor/color properties remain attached to refining materials.

The three generated fixtures are `TestDiffuseTransmission`, `TestGaussianSplats` and `TestInteractivity`; all are available in the comparison selector after `npm run fixtures -- --catalog`. Final files obey the same 5% cap. Tests include exact reconstruction of every Gaussian attribute, first-scene interaction and persistent state during all refinements, front/back-light and metal-exclusion assertions, alpha-map channel selection, shader error checks, and final glTF/PAX image comparisons.

Reference engine tests used Khronos test-assets commit `0f24a49f2d861ac666652ce5b8e4181803db9c1f`: **116 math fixtures / 498 checks**, plus **29 behavior fixtures / 317 automated checks** passed. These exercise the imported engine/object model; they do not certify all Three.js renderer bindings. Reproduce with `node scripts/check-interactivity-reference.mjs /path/to/glTF-Test-Assets-Interactivity` and `node scripts/check-interactivity-behavior.mjs /path/to/glTF-Test-Assets-Interactivity`. Reports are in `artifacts/interactivity-reference-{math,behavior}.json`.
