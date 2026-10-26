import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm29-037": {
    "effect": "champion",
    "g58Effect": "Hayabusa",
    "ninjaStrike": true,
    "ninjaMin": 4,
    "ninjaColors": [],
    "limit": 1
  },
  "dm30-022": {
    "effect": "champion",
    "g58Effect": "Raiden",
    "ninjaStrike": true,
    "ninjaMin": 1,
    "ninjaColors": []
  },
  "dm11-004": {
    "effect": "champion",
    "g58Effect": "Shield"
  },
  "dm11-034": {
    "effect": "champion",
    "g58Effect": "Scorched"
  },
  "dmex08-050": {
    "effect": "champion",
    "g58Effect": "Roulette"
  }
};
const path=new URL('./support-phase-70.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:70,checkedAt:'2026-10-26',description:'ニンジャ・ストライクによる防御とシールド除去・マナ操作の主要カード5種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 5 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-70.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,5);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-70','Do not overwrite an existing definition');const def=championDefinition(row,'phase-70');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:70,checkedAt:manifest.checkedAt,baseCount:1393,newEffectCards:5,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<70)};assert.equal(data.cards.length,1398);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 5 utilities: '+data.cards.length+' supported types.');
}
