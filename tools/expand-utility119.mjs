import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm06-031':{g119Role:'bazaga',speedAttacker:true,attackUntapped:true,breaker:2,g75Exze:true},
 'dm22-052':{g119Role:'geo',effect:'champion',g75Effect:'Geo'},
 'dm15-008':{type:'gear',g119Role:'petro',g119Petro:true},
 'dm14-074':{g119Role:'malta',effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true,optional:true,title:'タップする相手クリーチャーを1体まで選ぶ'}]},
 'dm24ex4-084':{g119Role:'aventure',blocker:true,effect:'champion',g75Effect:'Aventure'},
 'dm32-045':{g119Role:'raju',g119LightEvolutionReducer:true}
};
const path=new URL('./support-phase-119.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:119,checkedAt:'2026-10-28',description:'アンタップ獣への攻撃、最小パワーのマナ移動、クロス先の対象保護、タップ、マナ差の補充、光の進化軽減の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/img/dm_rule_20261015.pdf'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-119.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-119','Do not overwrite an existing definition');const def=championDefinition(row,'phase-119');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:119,checkedAt:manifest.checkedAt,baseCount:1679,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<119)};assert.equal(data.cards.length,1685);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
