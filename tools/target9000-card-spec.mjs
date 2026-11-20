// Complete official faces are pinned for the 9,000-card registration campaign.
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
const rows=JSON.parse(readFileSync(new URL('./target9000-card-spec.json',import.meta.url),'utf8'));
export function target9000CardSpec(row,phase){
 const expected=rows[row?.id];if(!expected||phase<expected.phase)return null;
 if(row.status!=='complete'||!isDeepStrictEqual(row.faces,expected.faces))throw Error('追加カードの公式能力全文が一致しません: '+row.id);
 return structuredClone(expected.spec);
}
