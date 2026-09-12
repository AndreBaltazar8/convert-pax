#!/usr/bin/env node
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/convert.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit'});process.exit(result.status??1);
