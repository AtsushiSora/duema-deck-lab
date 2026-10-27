import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmr07-012':{breaker:2,g112Role:'ore',effect:'champion',g78Effect:'Ore'},
 'dmx11-023':{breaker:2,g112Role:'congrat',effect:'champion',g78Effect:'Congrat'},
 'dmr07-s03':{breaker:2,g112Role:'black',effect:'champion',g78Effect:'Black'},
 'dmd08-018':{blocker:true,breaker:2,g112ShieldGrave:true,g112Role:'ring'},
 'dm23rp4-058':{"blocker":true,"g112Role":"aq","effect":"sixPhoto","g34Tasks":[{"op":"Target","to":"hand"}]},
 'dm01-006':{g112Role:'giga',effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'hand',n:2,optional:true,filter:{creature:true},title:'墓地から手札に戻すクリーチャーを2体まで選ぶ'}]}
};
const path=new URL('./support-phase-112.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:112,checkedAt:'2026-10-28',description:'闇のエンジェル・コマンド4種類と、バウンス・墓地回収を担うクリーチャー2種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/img/dm_rule_20261015.pdf'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-112.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-112','Do not overwrite an existing definition');const def=championDefinition(row,'phase-112');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:112,checkedAt:manifest.checkedAt,baseCount:1637,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<112)};assert.equal(data.cards.length,1643);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
