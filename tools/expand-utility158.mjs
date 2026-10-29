import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm37-028':{g158Role:'twist',trigger:true,effect:'champion',g61Effect:'GunveetTwist'},
 'dm14-093':{g158Role:'toxic',trigger:true,effect:'champion',g61Effect:'ToxicPipe'},
 'dm07-047':{g158Role:'vacuum',trigger:true,effect:'champion',g61Effect:'VacuumGel'},
 'dm13-044':{g158Role:'nightmare',trigger:true,effect:'champion',g61Effect:'NightmareMachine'},
 'dm14-101':{g158Role:'turbo',effect:'champion',g61Effect:'TwinTurbo'},
 'dm06-008':{g158Role:'fortress',effect:'champion',g61Effect:'InvFortress'}
};
const path=new URL('./support-phase-158.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:158,checkedAt:'2026-10-29',description:'手札破壊とパワー低下、タップ状態・文明条件の除去、双方の犠牲、スピードアタッカーとパワーアタッカー付与、3枚までのシールド焼却を持つ呪文6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-158.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-158','Do not overwrite an existing definition');const def=championDefinition(row,'phase-158');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:158,checkedAt:manifest.checkedAt,baseCount:1913,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<158)};assert.equal(data.cards.length,1919);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
