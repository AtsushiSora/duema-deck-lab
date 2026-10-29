import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm27-025':{g154Role:'blade',effect:'champion',g61Effect:'BladeWorm'},
 'dm16-038':{g154Role:'cubic',effect:'champion',g61Effect:'Cubic'},
 'dm28-066':{g154Role:'kiyomasa',effect:'champion',g61Effect:'Kiyomasa'},
 'dm19-059':{g154Role:'medine',effect:'champion',g61Effect:'Bolzard'},
 'dm15-034':{g154Role:'hunter',effect:'champion',g62Effect:'Hunter'},
 'dm38-040':{g154Role:'north',effect:'champion',g61Effect:'Hulk'}
};
const path=new URL('./support-phase-154.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:154,checkedAt:'2026-10-29',description:'マナ文明数に応じたパワー低下、山札上の呪文回収、相手の墓地の呪文数に応じたマナ加速、相手のマナ破壊、クロスギアのマナ回収と任意ドローを持つクリーチャー6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-154.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-154','Do not overwrite an existing definition');const def=championDefinition(row,'phase-154');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:154,checkedAt:manifest.checkedAt,baseCount:1883,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<154)};assert.equal(data.cards.length,1889);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
