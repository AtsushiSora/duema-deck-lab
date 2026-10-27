import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 "dmr09-027":{trigger:true,effect:'champion',g73Effect:'Devil'},
 "dm01-s03":{effect:'champion',g73Effect:'Sniper'},
 "dm27-024":{blocker:true,noAttack:true,effect:'champion',g73Effect:'Space'},
 "dm09-035":{normalCharger:true,effect:'champion',g73Effect:'Soil'},
 "dmex17-088":{normalCharger:true,effect:'sixPhoto',g34Tasks:[{op:'Look',n:4,stages:[{to:'grave',n:1}]}],g73Role:'slash'},
 "dm05-035":{effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'mana',n:2,optional:true,filter:{creature:true}}],g73Role:'forest'}
};
const path=new URL('./support-phase-86.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:86,checkedAt:'2026-10-27',description:'複数バウンス、文明数に応じた山札確認、選ばせる除去、墓地肥やしとマナ加速の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-86.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-86','Do not overwrite an existing definition');const def=championDefinition(row,'phase-86');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:86,checkedAt:manifest.checkedAt,baseCount:1488,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<86)};assert.equal(data.cards.length,1494);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
