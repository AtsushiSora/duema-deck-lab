import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dmd24-001": {
    "breaker": 2,
    "shieldBurn": true,
    "effect": "destroy"
  },
  "dmr13-101": {
    "effect": "sixPhoto",
    "g66Role": "meteor",
    "normalCharger": true,
    "g34Tasks": [
      {
        "op": "Target",
        "to": "grave",
        "filter": {
          "blocker": true
        },
        "title": "破壊する相手のブロッカーを1体選ぶ"
      }
    ]
  },
  "dmr23-039": {
    "trigger": true,
    "effect": "champion",
    "g66Effect": "Rainbow"
  },
  "dm28-043": {
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Look",
        "n": 3,
        "public": true,
        "stages": [
          {
            "to": "hand",
            "n": "all",
            "optional": true,
            "filter": {
              "spell": true
            }
          }
        ]
      }
    ]
  },
  "dm25-007": {
    "trigger": true,
    "effect": "tapAll",
    "g66Role": "spark"
  },
  "dm10-s03": {
    "effect": "champion",
    "g66Effect": "Hurricane"
  }
};
const path=new URL('./support-phase-78.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:78,checkedAt:'2026-10-27',description:'除去、チャージャー、防御、呪文補充、手札とマナの入れ替えの主要カード6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-78.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-78','Do not overwrite an existing definition');const def=championDefinition(row,'phase-78');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:78,checkedAt:manifest.checkedAt,baseCount:1440,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<78)};assert.equal(data.cards.length,1446);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
