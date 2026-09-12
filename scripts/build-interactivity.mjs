import {build} from 'esbuild';
await build({entryPoints:['vendor/khronos-interactivity/entry.ts'],outfile:'src/vendor/interactivity.js',bundle:true,format:'esm',platform:'neutral',external:['gl-matrix'],legalComments:'inline'});
