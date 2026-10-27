import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm22ex1-081": {
    "breaker": 2,
    "effect": "champion",
    "g44Effect": "School",
    "g67School": true,
    "spellFace": {
      "name": "ゾンビ・カーニバル",
      "type": "spell",
      "civilizations": [
        "闇"
      ],
      "cost": 5,
      "trigger": true,
      "effect": "champion",
      "g67Effect": "Zombie"
    }
  },
  "dm36-086": {
    "effect": "sixPhoto",
    "g67Role": "grip",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 1
      }
    ]
  },
  "dm39-025": {
    "effect": "sixPhoto",
    "g67Role": "scramble",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 5,
        "optional": true
      },
      {
        "op": "Discard",
        "owner": "self",
        "n": 3
      }
    ]
  },
  "dm07-035": {
    "effect": "champion",
    "g67Effect": "Mobius",
    "normalCharger": true
  },
  "dm13-029": {
    "trigger": true,
    "effect": "champion",
    "g67Effect": "Castle"
  },
  "dmex02-031": {
    "trigger": true,
    "effect": "champion",
    "g67Effect": "SuperHand"
  }
};
const path=new URL('./support-phase-79.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:79,checkedAt:'2026-10-27',description:'種族を選ぶ墓地回収、手札補充、除去、自己マナ加速の主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-79.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-79','Do not overwrite an existing definition');const def=championDefinition(row,'phase-79');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:79,checkedAt:manifest.checkedAt,baseCount:1446,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<79)};assert.equal(data.cards.length,1452);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');const races=[...new Set(details.cards.flatMap(c=>c.faces.flatMap(f=>String(f.race||'').split(/[\/／]/).map(x=>x.trim()).filter(Boolean))))].sort();fs.writeFileSync(new URL('../dist/utility-recovery-races.js',import.meta.url),'// Exact race names from the official card detail catalogue.\nexport const RECOVERY_RACES='+JSON.stringify(races)+';\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
