import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmc62-002':{g118Role:'sunburst',evolution:{race:'アーマード・ドラゴン'},breaker:2,g118LargeBattleBonus:11000,g118WinUntap:true},
 'dm27-011':{g118Role:'zalms',g118Zalms:true},
 'dmc46-012':{g118Role:'shadow',blocker:true,noAttack:true,afterBattleDie:true,g118SpellZero:true},
 'dmc46-011':{g118Role:'gregory',blocker:true,noPlayerAttack:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{anyFaceRace:'ナイト'},title:'墓地から手札に戻すナイトを1枚まで選ぶ'}]},
 'dm22-006':{g118Role:'muse',trigger:true,effect:'champion',g75Effect:'Muse'},
 'dmc34-007':{g118Role:'jams',blocker:true,noPlayerAttack:true,effect:'champion',g75Effect:'Jams'}
};
const path=new URL('./support-phase-118.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:118,checkedAt:'2026-10-28',description:'進化ドラゴンの連続攻撃、攻撃時の山札補充、G・ゼロ、ナイト回収、全体タップと種族連携の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/img/dm_rule_20261015.pdf'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-118.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-118','Do not overwrite an existing definition');const def=championDefinition(row,'phase-118');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:118,checkedAt:manifest.checkedAt,baseCount:1673,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<118)};assert.equal(data.cards.length,1679);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
