import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm01-008": {
    "breaker": 2,
    "g29GraveFire": true
  },
  "dm06-s08": {
    "breaker": 2,
    "shieldBurn": true
  },
  "dmd28-001": {
    "blocker": true,
    "noPlayerAttack": true,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 1,
        "optional": true
      }
    ]
  },
  "dm04-002": {
    "evolution": {
      "race": "サイバー・ウイルス"
    },
    "effect": "champion",
    "g64Effect": "Reef"
  },
  "dmrp14-067": {
    "effect": "champion",
    "g60Effect": "Kernel",
    "normalCharger": true
  },
  "dm12-026": {
    "effect": "champion",
    "g64Effect": "CloneVice"
  }
};
const path=new URL('./support-phase-76.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:76,checkedAt:'2026-10-27',description:'定番ドラゴン、ブロッカー、進化、攻撃制限、手札破壊の主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-76.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-76','Do not overwrite an existing definition');const def=championDefinition(row,'phase-76');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:76,checkedAt:manifest.checkedAt,baseCount:1428,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<76)};assert.equal(data.cards.length,1434);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
