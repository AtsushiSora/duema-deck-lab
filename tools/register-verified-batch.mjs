// Append complete, officially verified definitions without replacing stored IDs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {nameKey} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {standardCardSpec} from './standard-card-spec.mjs';
import {championDefinition} from './champion-definition.mjs';
const path=process.argv[2];assert.match(path||'',/^tools\/support-phase-\d+\.json$/);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n');
const m=read(path),data=read('dist/cards.json'),before=structuredClone(data.cards),details=read('dist/details.json').cards,refs=read('tools/image-reference-prints.json');
assert.ok(m.phase>data.supportExpansion.phase);assert.ok(m.cards.length>=1&&m.cards.length<=5);assert.equal(before.length,m.baseCount);
const keys=new Set(before.map(c=>nameKey(c.name))),canonical=new Set(before.map(c=>canonicalCardName(c.name)));
for(const row of m.cards){
 assert.ok(!keys.has(nameKey(row.name))&&!canonical.has(canonicalCardName(row.name)),'Existing name: '+row.name);
 assert.ok(!data.cards.some(c=>c.id===row.id),'Existing ID: '+row.id);
 const detail=details.find(c=>c.id===row.id);assert.deepEqual(row.faces,detail.faces);assert.equal(detail.status,'complete');
 assert.deepEqual(row.spec,standardCardSpec(detail,{phase:m.phase}));assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);
 assert.ok(row.sameNameProducts);assert.equal(new URL(row.source).hostname,'dm.takaratomy.co.jp');assert.equal(new URL(row.image).hostname,'dm.takaratomy.co.jp');assert.ok(m.regulationVerification.limits[row.id]!==undefined);
 data.cards.push({...championDefinition(row,'phase-'+m.phase),limit:m.regulationVerification.limits[row.id],supportKind:Object.keys(row.spec).every(k=>['gr','manaValue'].includes(k))?'vanilla':'effect'});
 if(!refs.prints.some(x=>x.id===row.id))refs.prints.push({id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source});
 keys.add(nameKey(row.name));canonical.add(canonicalCardName(row.name));
}
assert.deepEqual(data.cards.slice(0,before.length),before);assert.equal(keys.size,before.length+m.cards.length);
const old=data.supportExpansion;data.supportExpansion={phase:m.phase,checkedAt:m.checkedAt,baseCount:before.length,newEffectCards:m.cards.filter(x=>Object.keys(x.spec).some(k=>!['gr','manaValue'].includes(k))).length,newVanillaCards:m.cards.filter(x=>Object.keys(x.spec).every(k=>['gr','manaValue'].includes(k))).length,totalCount:data.cards.length,ruleSource:m.rules,next:['9000種類を目標に、公式照合と固有テストを終えた3〜5種類のバッチを追加する。公開は別途指示がある時だけ。'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))]};
const file='dist/card-images.js',text=fs.readFileSync(file,'utf8'),images=JSON.parse(text.slice(text.indexOf('export const CARD_IMAGES=')+25).replace(/;\s*$/,''));
for(const row of m.cards)images[row.id]=row.image;
for(const row of m.printAliases||[]){assert.ok(data.cards.some(c=>c.id===row.canonicalId));assert.ok(row.verification?.facesMatched);assert.ok(row.image&&new URL(row.image).hostname==='dm.takaratomy.co.jp');if(!refs.prints.some(x=>x.id===row.id))refs.prints.push({id:row.id,canonicalId:row.canonicalId,name:row.name,image:row.image,source:row.source});}
write('dist/cards.json',data);write('tools/image-reference-prints.json',refs);fs.writeFileSync(file,text.slice(0,text.indexOf('export const CARD_IMAGES='))+'export const CARD_IMAGES='+JSON.stringify(images,null,2)+';\n');
console.log(JSON.stringify({phase:m.phase,added:m.cards.length,total:data.cards.length,oldDefinitionsUnchanged:true}));
