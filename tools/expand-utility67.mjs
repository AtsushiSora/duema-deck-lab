import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm32-108": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Select",
        "origin": "hand",
        "to": "mana",
        "n": 1,
        "optional": true,
        "title": "手札からマナゾーンに置くカードを1枚まで選ぶ"
      }
    ]
  },
  "dm14-106": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Select",
        "origin": "hand",
        "to": "mana",
        "n": 1,
        "optional": true,
        "title": "手札からマナゾーンに置くカードを1枚まで選ぶ"
      }
    ]
  },
  "dm14-027": {
    "g55ManaTap": true
  },
  "dm30-046": {
    "effect": "champion",
    "g55Effect": "ShieldHand"
  },
  "dmx05-013": {
    "effect": "champion",
    "g55Effect": "ShieldHand"
  },
  "dm17-035": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Select",
        "origin": "grave",
        "to": "mana",
        "n": 1,
        "optional": true,
        "title": "墓地からマナゾーンに置くカードを1枚まで選ぶ"
      }
    ],
    "strikeBack": true,
    "strikeBackColor": "自然"
  },
  "dmrp17-080": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Discard",
        "n": 1,
        "random": true
      }
    ],
    "gStrike": true
  },
  "dmrp01-055": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Ramp",
        "n": 1
      }
    ],
    "g55Stepple": true
  }
};
const path=new URL('./support-phase-67.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:67,checkedAt:'2026-10-26',description:'序盤のマナ加速・シールド回収・手札破壊を補う主要カード8種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 8 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-67.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,8);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-67','Do not overwrite an existing definition');const def=championDefinition(row,'phase-67');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:67,checkedAt:manifest.checkedAt,baseCount:1371,newEffectCards:8,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<67)};assert.equal(data.cards.length,1379);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 8 utilities: '+data.cards.length+' supported types.');
}
