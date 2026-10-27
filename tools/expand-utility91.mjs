import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm25-s01": {
    "breaker": 2,
    "effect": "champion",
    "g78Effect": "Orzekia"
  },
  "dm10-005": {
    "effect": "champion",
    "g78Effect": "Gajira"
  },
  "dm02-045": {
    "g78Jelly": true
  },
  "dm07-046": {
    "g78Fly": true
  },
  "dm25-010": {
    "g78Train": true
  },
  "dm28-089": {
    "trigger": true,
    "effect": "champion",
    "g78Effect": "Alexei"
  }
};
const path=new URL('./support-phase-91.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:91,checkedAt:'2026-10-27',description:'闇の連続破壊、シールド除去、攻撃時・破壊時の手札妨害、破壊に連動する任意ドロー、サムライ・クロスギア除去の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-91.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-91','Do not overwrite an existing definition');const def=championDefinition(row,'phase-91');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:91,checkedAt:manifest.checkedAt,baseCount:1518,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<91)};assert.equal(data.cards.length,1524);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
