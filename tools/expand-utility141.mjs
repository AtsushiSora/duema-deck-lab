import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm25rp2-061':{g141Role:'doll',noAttack:true,effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1},{op:'Discard',owner:'self',n:1}]},
 'dmrp16-041':{g141Role:'hammer',effect:'destroyBattleCard3'},
 'dmrp02-049':{g141Role:'socket',trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Sweep',to:'grave',filter:{creature:true,maxPower:1000}}]},
 'dmr17-067':{g141Role:'notoshigo',blocker:true,noAttack:true,effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1}]},
 'dmr21-032':{g141Role:'pmomy',effect:'shieldTop1'},
 'dmrp20-026':{g141Role:'kuchiku',speedAttacker:true,effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true,lock:true}],g34Attack:[{op:'Draw',n:1}]}
};
const path=new URL('./support-phase-141.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:141,checkedAt:'2026-10-29',description:'手札交換、コスト3以下のカード除去、小型一掃、ブロッカーとドロー、シールド追加、タップとアンタップ制限・攻撃時ドローを持つクリーチャー6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/qa/45800/','https://dm.takaratomy.co.jp/rule/rulechange/316687/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-141.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.allSixUnrestricted);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-141','Do not overwrite an existing definition');const def=championDefinition(row,'phase-141');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:141,checkedAt:manifest.checkedAt,baseCount:1805,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<141)};assert.equal(data.cards.length,1811);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
