// Build-time registry: only complete, individually verified rows are enabled.
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
const rows=JSON.parse(readFileSync(new URL('./target8500-card-spec.json',import.meta.url),'utf8'));
export function target8500CardSpec(row,phase){
 const expected=rows[row?.id];if(!expected||phase<expected.phase)return null;
 if(row.status!=='complete'||!isDeepStrictEqual(row.faces,expected.faces))throw Error('追加カードの公式能力全文が一致しません: '+row.id);
 return structuredClone(expected.spec);
}
