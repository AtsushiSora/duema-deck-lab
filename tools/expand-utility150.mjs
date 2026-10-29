import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm37-041':{g150Role:'jaws',blocker:true,noAttack:true,effect:'champion',g61Effect:'Jaws'},
 'dm19-s10':{g150Role:'cactus',effect:'champion',g61Effect:'Cactus'},
 'dm19-026':{g150Role:'soulVice',effect:'champion',g61Effect:'SoulVice'},
 'dm32-012':{g150Role:'falken',effect:'champion',g61Effect:'Falken'},
 'dm10-058':{g150Role:'ancient',effect:'champion',g61Effect:'Ancient'},
 'dm25-015':{g150Role:'offering',effect:'champion',g62Effect:'Offering'}
};
const path=new URL('./support-phase-150.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:150,checkedAt:'2026-10-29',description:'2枚ドロー後の山札戻し、ベジーズの公開サーチ、同族数に応じた手札破棄、タップ済み相手の次回アンタップ制限、条件付き全マナアンタップとゴッドのマナ回収を持つクリーチャー6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-150.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-150','Do not overwrite an existing definition');const def=championDefinition(row,'phase-150');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:150,checkedAt:manifest.checkedAt,baseCount:1859,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<150)};assert.equal(data.cards.length,1865);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
