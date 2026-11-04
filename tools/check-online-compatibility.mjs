import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {ENGINE_VERSION} from '../dist/engine.js';import {ONLINE_COMPATIBILITY} from '../dist/online-compatibility.js';
const source=await readFile(new URL('../dist/cards.json',import.meta.url));
if(ONLINE_COMPATIBILITY.engineVersion!==ENGINE_VERSION||ONLINE_COMPATIBILITY.rulesHash!==createHash('sha256').update(source).digest('hex')||ONLINE_COMPATIBILITY.supportedCards!==JSON.parse(source).cards.length)throw Error('Online compatibility is stale. Run node tools/write-online-compatibility.mjs before publishing.');
console.log('Checked online and CPU use the same '+ONLINE_COMPATIBILITY.supportedCards+' card definitions and engine '+ENGINE_VERSION+'.');
