import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmc39-003':{g117Role:'borgres',breaker:2,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'mana',to:'hand',n:'all',optional:true,filter:{creature:true,race:'ドラゴン'},title:'マナから手札に戻すドラゴンを好きな数選ぶ'}]},
 'dmc39-004':{g117Role:'dolzark',breaker:2,g117Dolzark:true},
 'dm10-070':{g117Role:'sunfist',blocker:true,discardDeploy:true},
 'dm24-s10':{g117Role:'curse',noPlayerAttack:true,g117GraveCreaturePower:2000},
 'dm29-025':{g117Role:'swallow',samuraiGenerate:true},
 'dm19-010':{g117Role:'satique',effect:'sixPhoto',g34Tasks:[{op:'Offer',title:'墓地のヒューマノイドとアーク・セラフィムをすべてマナに置く？',defs:[{op:'Select',origin:'grave',to:'mana',n:'all',filter:{creature:true,raceAny:['ヒューマノイド','アーク・セラフィム']},title:'墓地の対象クリーチャーをすべてマナへ'}]}]}
};
const path=new URL('./support-phase-117.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:117,checkedAt:'2026-10-28',description:'ドラゴンの回収と攻撃補助、手札破壊への防御、墓地連動のパワー、侍流ジェネレート、墓地からのマナ補充の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/img/dm_rule_20261015.pdf'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-117.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-117','Do not overwrite an existing definition');const def=championDefinition(row,'phase-117');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:117,checkedAt:manifest.checkedAt,baseCount:1667,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<117)};assert.equal(data.cards.length,1673);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
