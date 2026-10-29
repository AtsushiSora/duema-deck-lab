import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm24-101':{g152Role:'roulette',trigger:true,effect:'champion',g61Effect:'Roulette'},
 'dm04-020':{g152Role:'bless',effect:'champion',g61Effect:'BlessSword'},
 'dm34-039':{g152Role:'gate',trigger:true,effect:'champion',g61Effect:'LightGate'},
 'dm22-055':{g152Role:'growth',effect:'champion',g61Effect:'LittleEyes'},
 'dm14-077':{g152Role:'law',trigger:true,effect:'champion',g61Effect:'MartialLaw'},
 'dm25-055':{g152Role:'rainbow',effect:'champion',g61Effect:'Rainbow'}
};
const path=new URL('./support-phase-152.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:152,checkedAt:'2026-10-29',description:'単色・無色の小型除去、光の味方数に応じた全体強化、小型ブロッカー蘇生、公開マナ加速、クロスギア除去と文明数に応じた強化・ドローを持つ呪文6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-152.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-152','Do not overwrite an existing definition');const def=championDefinition(row,'phase-152');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:152,checkedAt:manifest.checkedAt,baseCount:1871,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<152)};assert.equal(data.cards.length,1877);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
