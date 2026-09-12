# Shared wire algorithms

The portable modules `format.js`, `geometry-codec.js`, `textures.js`,
`texture-tiles.js`, and `ktx-mips.js` are synchronized snapshots of the reference
in `AndreBaltazar8/spec-pax/src`. Keeping small snapshots makes each repository
installable independently. Changes to these files must update the specification,
its conformance fixture/tests, and both consumers together. Current wire version: 0.

The public format is defined by SPECIFICATION.md, not by converter quality heuristics
or a Three.js internal cache layout.
