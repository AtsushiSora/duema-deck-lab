import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {parseDetail} from './detail-parser.mjs';
const path=new URL('./character-balance-0.146.0.json',import.meta.url),m=JSON.parse(await fs.readFile(path));
// The official page sometimes repeats the keyword as an icon's alt text.
// Compare all fields, normalizing only adjacent duplicate keyword labels.
const normalize=faces=>faces.map(f=>({...f,abilityText:f.abilityText.replace(/(ブロッカー|S・トリガー)\s+\1/g,'$1')}));
for(const row of m.cards){
 const r=await fetch(row.source,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok,row.id);
 const html=await r.text(),detail=parseDetail(html,row);assert.deepEqual(normalize(detail.faces),normalize(row.faces),row.id);
 row.verification={checkedAt:m.checkedAt,sha256:crypto.createHash('sha256').update(html).digest('hex'),facesMatched:true,normalization:'Adjacent duplicate keyword icon labels only'};
 console.log('Verified '+row.name);
}
const source='https://dm.takaratomy.co.jp/rule/regulation/',r=await fetch(source);assert.ok(r.ok);const html=await r.text(),clean=html.replace(/<!--[\s\S]*?-->/g,''),start=clean.indexOf('<h2>プレミアム殿堂コンビカード</h2>'),end=clean.indexOf('<h2>使用禁止カード</h2>');assert.ok(start>=0&&end>start);
const norm=s=>s.replace(/[《》≪≫\s]/g,'').normalize('NFKC'),names=[...clean.slice(start,end).matchAll(/<a\b[^>]*href=["'][^"']*card\/detail\/\?[^>]*>([\s\S]*?)<\/a>/g)].map(x=>norm(x[1].replace(/<[^>]*>/g,'')));assert.ok(names.length>81);
for(const c of m.cards)for(const f of c.faces)assert.ok(!names.includes(norm(f.name)),c.name);
m.regulationVerification={source,checkedAt:m.checkedAt,sha256:crypto.createHash('sha256').update(html).digest('hex'),cardNameCount:names.length,scope:'Current restrictions, excluding announcements and HTML comments',limits:Object.fromEntries(m.cards.map(c=>[c.id,4]))};
await fs.writeFile(path,JSON.stringify(m,null,2)+'\n');console.log('Verified '+m.cards.length+' additions against '+names.length+' restricted names.');
