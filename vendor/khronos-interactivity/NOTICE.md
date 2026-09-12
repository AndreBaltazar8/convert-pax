# Khronos interactivity sample engine

Source: https://github.com/KhronosGroup/glTF-InteractivityGraph-AuthoringTool
Revision: 65c4ad429413240b16e16fda6cbf83c82e6a67c1
License: Apache-2.0, included in LICENSE.

Vendored BasicBehaveEngine, objectModel and diagnostics sources retain upstream
code and notices. entry.ts selects the exports used by this project. Run
`npm run build:interactivity` to regenerate src/vendor/interactivity.js with
esbuild. Three.js bindings and isolated event buses live in src/interactivity.js.
The asset converter includes graph JSON; it does not embed the engine in PAX.

Reference test assets: https://github.com/KhronosGroup/glTF-Test-Assets-Interactivity
Revision: 0f24a49f2d861ac666652ce5b8e4181803db9c1f
These are downloaded separately for verification and are not redistributed here.
