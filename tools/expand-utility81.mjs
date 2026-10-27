import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm34-040": {
    "trigger": true,
    "effect": "champion",
    "g69Effect": "Burster"
  },
  "dm15-007": {
    "trigger": true,
    "effect": "champion",
    "g69Effect": "Variant"
  },
  "dm32-022": {
    "effect": "champion",
    "g69Effect": "Spiral"
  },
  "dm07-017": {
    "effect": "champion",
    "g69Effect": "Hell"
  },
  "dm09-047": {
    "trigger": true,
    "effect": "champion",
    "g67Effect": "Zombie"
  },
  "dmex04-016": {
    "effect": "champion",
    "g66Effect": "Hurricane",
    "spellFace": {
      "name": "ブレイン・チャージャー",
      "type": "spell",
      "civilizations": [
        "水"
      ],
      "cost": 4,
      "effect": "sixPhoto",
      "g69Role": "brain",
      "normalCharger": true,
      "g34Tasks": [
        {
          "op": "Draw",
          "n": 1
        }
      ]
    }
  }
};
const path=new URL('./support-phase-81.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:81,checkedAt:'2026-10-27',description:'任意の自己破壊、メタモーフ、爆進ダブル、合計パワー除去、墓地回収とツインパクトの主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-81.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-81','Do not overwrite an existing definition');const def=championDefinition(row,'phase-81');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:81,checkedAt:manifest.checkedAt,baseCount:1458,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<81)};assert.equal(data.cards.length,1464);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
