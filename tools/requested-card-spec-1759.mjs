// Full official faces are pinned, including the printed no-cost King-Cell face.
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
const pins=JSON.parse(readFileSync(new URL('./requested-card-spec-1759.json',import.meta.url),'utf8'));
export function requestedCardSpec1759(row,phase){const p=pins[row?.id];if(!p||phase<p.phase)return null;if(!isDeepStrictEqual(row.faces,p.faces))throw Error('公式能力全文の不一致: '+row.id);return structuredClone(p.spec);}
