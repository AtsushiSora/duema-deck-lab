import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmbd02-009':{g142Role:'anaris',effect:'champion',g51Effect:'Anaris'},
 'dm22-041':{g142Role:'rip',g142Rip:true},
 'dm08-051':{g142Role:'totto',g142AllDragonSpeed:true},
 'dmx02-004':{g142Role:'pippy',g142HunterDragonSpeed:true},
 'dmx05-010':{g142Role:'gaga',effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1,optional:true}]},
 'dm32-043':{g142Role:'fal',effect:'champion',g61Effect:'Fal'}
};
const path=new URL('./support-phase-142.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:142,checkedAt:'2026-10-29',description:'アナリスの自己破壊後の加速・ドロー選択、ドラゴン登場時の任意ドロー、両者のドラゴンまたは自分のドラゴン兼ハンターへのスピードアタッカー付与、登場時の任意ドロー・呪文回収を持つ6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/qa/38719/','https://dm.takaratomy.co.jp/rule/qa/42955/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-142.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.allSixUnrestricted);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-142','Do not overwrite an existing definition');const def=championDefinition(row,'phase-142');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:142,checkedAt:manifest.checkedAt,baseCount:1811,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<142)};assert.equal(data.cards.length,1817);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
