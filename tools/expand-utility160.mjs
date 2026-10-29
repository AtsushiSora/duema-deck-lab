import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
import{PHOTO160_CLASSIC_SPECS}from'./photo160-classic-specs.mjs';
import{PHOTO160_NATURE_SPECS}from'./photo160-nature-specs.mjs';
import{PHOTO160_SPELL_SPECS}from'./photo160-spell-specs.mjs';
import{PHOTO160_FIRE_SPECS}from'./photo160-fire-specs.mjs';
const specs={...PHOTO160_CLASSIC_SPECS,...PHOTO160_NATURE_SPECS,...PHOTO160_SPELL_SPECS,...PHOTO160_FIRE_SPECS};
const path=new URL('./support-phase-160.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:160,checkedAt:'2026-10-29',description:'添付画像4枚に含まれる未対応20種類の効果を追加。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 20 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-160.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,20);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-160','Do not overwrite an existing definition');const def=championDefinition(row,'phase-160');if(row.spec.hyper)def.text=row.faces.map((f,i)=>(i?'【ハイパーモード】\n':'')+f.abilityText).join('\n');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:160,checkedAt:manifest.checkedAt,baseCount:1938,newEffectCards:20,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<160)};assert.equal(data.cards.length,1958);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 20 photograph cards: '+data.cards.length+' supported types.');
}
