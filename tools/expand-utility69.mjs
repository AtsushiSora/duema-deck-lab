import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dmr13-s02": {
    "effect": "champion",
    "g57Effect": "Cyclika",
    "breaker": 2,
    "death": "deck"
  },
  "dm29-042": {
    "effect": "champion",
    "g57Effect": "Janit",
    "ninjaStrike": true,
    "ninjaMin": 4,
    "ninjaColors": []
  },
  "dm36-058": {
    "effect": "champion",
    "g57Effect": "Deadly",
    "trigger": true
  },
  "dmd18-010": {
    "effect": "champion",
    "g57Effect": "Next",
    "normalCharger": true
  },
  "dmx11-039": {
    "effect": "champion",
    "g57Effect": "Doubletail",
    "trigger": true
  },
  "dmr15-021": {
    "effect": "champion",
    "g57Effect": "Eternal",
    "trigger": true
  }
};
const path=new URL('./support-phase-69.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:69,checkedAt:'2026-10-26',description:'墓地の呪文再利用・ニンジャ・ストライク・手札交換・防御の主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-69.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-69','Do not overwrite an existing definition');const def=championDefinition(row,'phase-69');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:69,checkedAt:manifest.checkedAt,baseCount:1387,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<69)};assert.equal(data.cards.length,1393);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
