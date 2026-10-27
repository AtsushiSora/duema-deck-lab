import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dm21-039':{trigger:true,g110Role:'wizard',effect:'sixPhoto',g34Tasks:[{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,filter:{spell:true},title:'マナから手札に戻す呪文を1枚選ぶ'}]},
 'dm09-011':{normalCharger:true,g110Role:'analyze',effect:'champion',g52Effect:'Teleport'},
 'dm08-026':{g110Role:'wave',effect:'champion',g52Effect:'Wave'},
 'dmd16-006':{trigger:true,g110Role:'valhalla',effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true},{op:'Draw',n:1}]},
 'dmd27-004':{trigger:true,g110Role:'ifrit',effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{max:9}}]},
 'dmrp14-018':{trigger:true,g110Role:'unseen',effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{untapped:true}},{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true},title:'墓地から手札に戻すクリーチャーを1体選ぶ'}]}
};
const path=new URL('./support-phase-110.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:110,checkedAt:'2026-10-28',description:'手札補充、マナと墓地からの回収、バウンスと防御を支える6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-110.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-110','Do not overwrite an existing definition');const def=championDefinition(row,'phase-110');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:110,checkedAt:manifest.checkedAt,baseCount:1625,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<110)};assert.equal(data.cards.length,1631);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
