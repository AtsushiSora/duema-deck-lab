import fs from 'node:fs';
import assert from 'node:assert/strict';
import {standardCardSpec} from './standard-card-spec.mjs';
import {championDefinition} from './champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const write=(f,v)=>fs.writeFileSync(new URL(f,import.meta.url),JSON.stringify(v,null,2)+'\n');
const phase=229,batch='phase-229',baseCount=3170,details=read('../dist/details.json'),data=read('../dist/cards.json');
if(process.argv.includes('--prepare')){
 const names=new Set(data.cards.filter(c=>c.supportBatch!==batch).map(c=>c.name)),cards=[],reasons={};
 // Exclude the verified current premium-hall card until a verified historical forty uses it.
 for(const row of details.cards.filter(c=>!names.has(c.name)&&c.id!=='dmr22-017'&&c.id!=='dmr07-001'))try{cards.push({id:row.id,name:row.name,source:row.detailSource||row.source,faces:row.faces,spec:standardCardSpec(row,{phase:229})});}catch(e){const reason=e.message.split(':')[0];reasons[reason]=(reasons[reason]||0)+1;}
 write('./support-phase-229.json',{phase,checkedAt:'2026-10-31',description:'相手の手札の呪文面の文明を確認して一括破棄する2種類。全能力文・印刷マナ数を公式照合する。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/','https://dm.takaratomy.co.jp/rule/rulechange/'],cards});
 console.log(JSON.stringify({candidates:cards.length,reasons}));
}else{
 const m=read('./support-phase-229.json'),refs=read('./image-reference-prints.json');assert.equal(m.cards.length,2);assert.ok(m.regulationVerification?.limits);
 for(const row of m.cards){const detail=details.cards.find(d=>d.id===row.id);assert.deepEqual(row.faces,detail.faces);assert.deepEqual(row.spec,standardCardSpec(detail,{phase:229}));assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.ok(row.image?.startsWith('https://dm.takaratomy.co.jp/'));const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch===batch,'Do not overwrite an existing definition');const def={...championDefinition(row,batch),limit:m.regulationVerification.limits[row.id],supportKind:row.faces[0].abilityText.trim()?'effect':'vanilla'};if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(r=>r.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion,vanilla=m.cards.filter(c=>!c.faces[0].abilityText.trim()).length;
 data.supportExpansion={phase,checkedAt:m.checkedAt,baseCount,newEffectCards:m.cards.length-vanilla,newVanillaCards:vanilla,totalCount:data.cards.length,ruleSource:m.rules,next:['未対応能力の共通処理を追加し、カード別の公式照合と対戦検証を継続する'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<phase)};
 assert.equal(data.cards.length,baseCount+m.cards.length);write('../dist/cards.json',data);write('./image-reference-prints.json',refs);console.log('Added '+m.cards.length+' types; '+data.cards.length+' supported.');
}
