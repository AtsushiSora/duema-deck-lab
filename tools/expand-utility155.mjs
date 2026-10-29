import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm38-009':{g155Role:'frog',g155Leave:'Frog',effect:'champion',g61Effect:'Frog'},
 'dm38-028':{g155Role:'wine',g155Leave:'Wine',effect:'champion',g61Effect:'Wine'},
 'dm22-045':{g155Role:'sensing',effect:'champion',g61Effect:'Sensing'},
 'dm38-024':{g155Role:'reactor',effect:'champion',g61Effect:'Reactor'},
 'dm23-029':{g155Role:'boneblade',effect:'champion',g61Effect:'Boneblade'},
 'dm17-053':{g155Role:'gardener',effect:'champion',g61Effect:'GearMove'},
 'dm16-024':{g155Role:'wizard',effect:'champion',g61Effect:'GearMove'},
 'dm21-046':{g155Role:'goba',g155Goba:true},
 'dm15-054':{g155Role:'courage',effect:'champion',g61Effect:'Courage'},
 'dm15-039':{g155Role:'veins',effect:'champion',g61Effect:'Veins'},
 'dm10-049':{g155Role:'deadly',effect:'champion',g61Effect:'Deadly'},
 'dm10-054':{g155Role:'zalmes',effect:'champion',g61Effect:'Zalmes'}
};
const path=new URL('./support-phase-155.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:155,checkedAt:'2026-10-29',description:'登場時と離脱時の干渉、山札と手札の整理、種族蘇生、クロスギア操作と同名墓地・シールド枚数を条件とする能力のクリーチャー12種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 12 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-155.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,12);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-155','Do not overwrite an existing definition');const def=championDefinition(row,'phase-155');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:155,checkedAt:manifest.checkedAt,baseCount:1889,newEffectCards:12,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<155)};assert.equal(data.cards.length,1901);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 12 utilities: '+data.cards.length+' supported types.');
}
