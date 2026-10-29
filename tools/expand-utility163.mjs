import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmsd21-011':{shinkalize:true,effect:'sixPhoto',g34Tasks:[{op:'Discard',n:1,random:true}]},
 'dm26ex4-074':{trigger:true,effect:'bounceOptional',spellFace:{name:'ボイル・チャージャー',type:'spell',civ:'火',civilizations:['火'],cost:3,effect:'destroyBattleCard2',normalCharger:true}},
 'dm14-004':{blocker:true,noAttack:true,g163Dione:true},
 'dmrp18-079':{trigger:true,effect:'champion',g68Effect:'CriticalLove'},
 'dmx15-030':{effect:'ramp1'},
 'dmr18-050':{evolution:{civilization:'水'},invasion:{anyCreature:true,colors:['水'],origins:['hand']}}
};
const path=new URL('./support-phase-163.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:163,checkedAt:'2026-10-29',description:'手札破壊のタマシード、ツインパクトの除去とチャージャー、速攻対策、双方の犠牲、マナ加速、水の侵略を持つ6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-163.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification?.limits);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);assert.equal(manifest.regulationVerification.limits[row.id],row.spec.limit??4);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-163','Do not overwrite an existing definition');const def=championDefinition(row,'phase-163');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:163,checkedAt:manifest.checkedAt,baseCount:1963,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<163)};assert.equal(data.cards.length,1969);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
