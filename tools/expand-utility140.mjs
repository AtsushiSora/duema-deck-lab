import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmrp15-036':{g140Role:'book',trigger:true,effect:'champion',g52Effect:'Book'},
 'dmrp03-086':{g140Role:'gangan',trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{blocker:true}}]},
 'dmr06-046':{g140Role:'guillotine',normalCharger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{max:6}}]},
 'dm09-008':{g140Role:'celeb',normalCharger:true,effect:'champion',g62Effect:'Celeb'},
 'dmr01-094':{g140Role:'kusari',effect:'champion',g61Effect:'Kusari'},
 'dm06-046':{g140Role:'protect',trigger:true,effect:'champion',g62Effect:'Protect'}
};
const path=new URL('./support-phase-140.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:140,checkedAt:'2026-10-29',description:'手札を整えるブレイン・ブック、S・トリガー除去、相手が選ぶアンタップ破壊、チャージャー、ブロッカーの一時強化を持つ6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-140.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.allSixUnrestricted);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-140','Do not overwrite an existing definition');const def=championDefinition(row,'phase-140');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:140,checkedAt:manifest.checkedAt,baseCount:1799,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<140)};assert.equal(data.cards.length,1805);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
