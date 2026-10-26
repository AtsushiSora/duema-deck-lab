import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm29-006": {
    "blocker": true,
    "noPlayerAttack": true,
    "ninjaStrike": true,
    "ninjaMin": 7,
    "ninjaColors": []
  },
  "dmbd02-008": {
    "effect": "sixPhoto",
    "ninjaStrike": true,
    "ninjaMin": 5,
    "ninjaColors": [],
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 1
      },
      {
        "op": "Discard",
        "owner": "self",
        "n": 1
      },
      {
        "op": "Select",
        "origin": "grave",
        "to": "mana",
        "n": 1,
        "optional": false,
        "title": "マナに置く自分の墓地のカードを1枚選ぶ"
      }
    ]
  },
  "dm25-s04": {
    "effect": "champion",
    "g59Effect": "Romanesque",
    "g59Romanesque": true,
    "blocker": true
  },
  "dm32-039": {
    "effect": "champion",
    "g59Effect": "Wild"
  },
  "dmrp12-021": {
    "effect": "recommended",
    "recommendRole": "dondon",
    "bounceColors": [
      "光",
      "闇"
    ],
    "trigger": true
  },
  "dmrp03-027": {
    "guardman": true,
    "noPlayerAttack": true,
    "effect": "corenReveal"
  }
};
const path=new URL('./support-phase-71.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:71,checkedAt:'2026-10-27',description:'マナ加速・墓地利用・防御・山札選択を補う主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-71.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-71','Do not overwrite an existing definition');const def=championDefinition(row,'phase-71');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:71,checkedAt:manifest.checkedAt,baseCount:1398,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<71)};assert.equal(data.cards.length,1404);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
