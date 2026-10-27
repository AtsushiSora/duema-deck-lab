import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm19-036": {
    "effect": "champion",
    "g90Effect": "Radia"
  },
  "dm08-018": {
    "breaker": 2,
    "effect": "champion",
    "g90Effect": "Gamila"
  },
  "sp-009": {
    "evolution": {
      "race": "ビーストフォーク"
    },
    "attackBonus": 2000,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Ramp",
        "n": 1
      }
    ]
  },
  "dm35-033": {
    "evolution": {
      "civilization": "自然"
    },
    "manaEvolution": true,
    "breaker": 2
  },
  "dmx04-003": {
    "trigger": true,
    "effect": "champion",
    "g90Effect": "Bear"
  },
  "dmrp15-020": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Select",
        "origin": "hand",
        "to": "mana",
        "n": 2,
        "optional": true,
        "title": "手札からマナに置くカードを2枚まで選ぶ"
      }
    ]
  }
};
const path=new URL('./support-phase-103.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:103,checkedAt:'2026-10-27',description:'自然の展開・防御を支える6種類。マナ進化、手札からのマナ加速、相手が選ぶ展開、同名と小型クリーチャーのマナ送り。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-103.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-103','Do not overwrite an existing definition');const def=championDefinition(row,'phase-103');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:103,checkedAt:manifest.checkedAt,baseCount:1590,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<103)};assert.equal(data.cards.length,1596);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
