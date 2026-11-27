// Only complete, individually verified official prints are enabled in this campaign.
import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const pins=JSON.parse(readFileSync(new URL('./target10000-card-spec.json',import.meta.url),'utf8'));
export function target10000CardSpec(row,phase){const p=pins[row?.id];if(!p||phase<p.phase)return null;if(row.status!=='complete'||!isDeepStrictEqual(row.faces,p.faces))throw Error('公式能力全文の不一致: '+row.id);return structuredClone(p.spec);}
