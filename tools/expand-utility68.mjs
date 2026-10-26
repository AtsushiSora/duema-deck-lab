import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm25-023": {
    "effect": "champion",
    "g56Effect": "Emeral",
    "blocker": true
  },
  "dm13-039": {
    "effect": "champion",
    "g56Effect": "Parpi",
    "blocker": true,
    "noAttack": true
  },
  "dm27-041": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 1,
        "optional": true
      }
    ]
  },
  "dm22-025": {
    "g56SpellTax": 2
  },
  "dmx05-011": {
    "effect": "champion",
    "g56Effect": "Sev"
  },
  "dmr08-029": {
    "effect": "sixPhoto",
    "blocker": true,
    "noAttack": true,
    "g34Tasks": [
      {
        "op": "Offer",
        "title": "山札の上3枚を墓地へ置き、墓地からクリーチャー1体を手札へ戻す？",
        "defs": [
          {
            "op": "Mill",
            "n": 3
          },
          {
            "op": "Select",
            "origin": "grave",
            "to": "hand",
            "n": 1,
            "optional": false,
            "filter": {
              "creature": true
            },
            "title": "墓地から手札に戻すクリーチャーを1体選ぶ"
          }
        ]
      }
    ]
  },
  "dm32-075": {
    "effect": "champion",
    "g56Effect": "Sol"
  },
  "dmd20-013": {
    "effect": "champion",
    "g56Effect": "Johnny"
  }
};
const path=new URL('./support-phase-68.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:68,checkedAt:'2026-10-26',description:'シールド交換・山札操作・墓地回収・呪文のコスト増加を補う主要カード8種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 8 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-68.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,8);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-68','Do not overwrite an existing definition');const def=championDefinition(row,'phase-68');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:68,checkedAt:manifest.checkedAt,baseCount:1379,newEffectCards:8,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<68)};assert.equal(data.cards.length,1387);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 8 utilities: '+data.cards.length+' supported types.');
}
