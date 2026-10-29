import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm34-055':{g156Role:'hustle',effect:'champion',g61Effect:'Hustle'},
 'dm08-035':{g156Role:'powerCharger',normalCharger:true,effect:'champion',g61Effect:'PowerCharger'},
 'dm10-110':{g156Role:'natural',effect:'champion',g61Effect:'NaturalBoost'},
 'dm06-006':{g156Role:'abyss',effect:'champion',g61Effect:'InvAbyss'},
 'dm06-002':{g156Role:'aura',effect:'champion',g61Effect:'InvAura'},
 'dm36-022':{g156Role:'treasury',trigger:true,effect:'champion',g61Effect:'Treasury'}
};
const path=new URL('./support-phase-156.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:156,checkedAt:'2026-10-29',description:'進化に応じた全体強化、全体強化付きチャージャー、パワーアタッカー付与、相手全体の破壊、任意のシールド追加と場の数だけの強制ドローを持つ呪文6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-156.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-156','Do not overwrite an existing definition');const def=championDefinition(row,'phase-156');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:156,checkedAt:manifest.checkedAt,baseCount:1901,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<156)};assert.equal(data.cards.length,1907);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
