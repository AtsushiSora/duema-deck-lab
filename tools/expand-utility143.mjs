import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm28-048':{g143Role:'heart',g143Heart:true,trigger:true,effect:'champion',g61Effect:'Heart'},
 'dm11-007':{g143Role:'juliana',blocker:true,noPlayerAttack:true,untargetable:true},
 'dm14-076':{g143Role:'kyubera',g143DeathTap:true,blocker:true,noPlayerAttack:true},
 'dm33-023':{g143Role:'peace',g143DeathTap:true,blocker:true,noPlayerAttack:true},
 'dmr17-040':{g143Role:'revSpiral',trigger:true,effect:'champion',g61Effect:'RevSpiral'},
 'dmr17-046':{g143Role:'revGuillotine',trigger:true,effect:'champion',g61Effect:'RevGuillotine'}
};
const path=new URL('./support-phase-143.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:143,checkedAt:'2026-10-29',description:'シールド2以下で強くなるキューティー・ハート、選ばれないユリアーナ、破壊時の任意タップを持つブロッカー2種類と、革命2で追加効果を持つS・トリガー呪文2種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-143.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.allSixUnrestricted);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-143','Do not overwrite an existing definition');const def=championDefinition(row,'phase-143');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:143,checkedAt:manifest.checkedAt,baseCount:1817,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<143)};assert.equal(data.cards.length,1823);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
