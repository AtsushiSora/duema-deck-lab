import fs from 'node:fs';
import assert from 'node:assert/strict';
import {championDefinition} from './champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const id='dm24rp2-OR1',details=read('../dist/details.json'),path=new URL('./support-phase-162.json',import.meta.url);
const spec={g35Role:'hyperBolshack',hyperTap:2,hyper:{power:11000,breaker:2},limit:4};
if(process.argv.includes('--prepare')){
 const d=details.cards.find(c=>c.id===id);assert.ok(d);
 fs.writeFileSync(path,JSON.stringify({phase:162,checkedAt:'2026-10-29',description:'終炎の竜皇 ボルシャック・ハイパードラゴン：通常・ハイパーモードの全能力に対応。',rules:[d.source,'https://dm.takaratomy.co.jp/rule/qa/44824/','https://dm.takaratomy.co.jp/rule/regulation/'],cards:[{id,name:d.name,source:d.source,faces:d.faces,spec}]},null,2)+'\n');
}else{
 const manifest=read('./support-phase-162.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,1);const row=manifest.cards[0];assert.equal(row.id,id);assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(manifest.regulationVerification?.limits[id],4);assert.deepEqual(row.faces,details.cards.find(c=>c.id===id).faces);assert.deepEqual(row.spec,spec);
 const old=data.cards.find(c=>c.id===id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-162');const def=championDefinition(row,'phase-162');def.text=row.faces.map((f,i)=>(i?'【ハイパーモード】\n':'')+f.abilityText).join('\n');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);
 const ref={id,canonicalId:id,name:row.name,image:row.image,source:row.source},index=refs.prints.findIndex(x=>x.id===id);if(index<0)refs.prints.push(ref);else refs.prints[index]=ref;
 const previous=data.supportExpansion;data.supportExpansion={phase:162,checkedAt:manifest.checkedAt,baseCount:1962,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(previous.history||[]),Object.fromEntries(Object.entries(previous).filter(([k])=>k!=='history'))].filter(x=>x.phase<162)};assert.equal(data.cards.length,1963);
 for(const [p,value] of [['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(value,null,2)+'\n');console.log('Added Bolshack Hyper Dragon; '+data.cards.length+' supported cards.');
}
