import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dmc52-003": {
    "blocker": true,
    "noPlayerAttack": true,
    "g88Lodriess": true
  },
  "dm38-025": {
    "trigger": true,
    "effect": "champion",
    "g88Effect": "Cyber"
  },
  "dmr09-055": {
    "trigger": true,
    "effect": "champion",
    "g88Effect": "Spiral"
  },
  "dmex04-071": {
    "neoEvolution": {
      "any": [
        {
          "civilization": "水"
        }
      ]
    },
    "effect": "champion",
    "g88Effect": "Squalo",
    "spellFace": {
      "name": "エナジー・ライト",
      "type": "spell",
      "civilizations": [
        "水"
      ],
      "cost": 3,
      "effect": "draw2"
    }
  },
  "dmrp07-014": {
    "noCreatureAttack": true,
    "unblockable": true,
    "g40LastBurst": true,
    "spellFace": {
      "name": "トリプル・ブレイン",
      "type": "spell",
      "civilizations": [
        "水"
      ],
      "cost": 5,
      "effect": "drawUpTo3"
    }
  },
  "dmrp06-006": {
    "effect": "champion",
    "g88Effect": "Mad",
    "g88Mad": true,
    "spellFace": {
      "name": "デーモン・ハンド",
      "type": "spell",
      "civilizations": [
        "闇"
      ],
      "cost": 6,
      "trigger": true,
      "effect": "destroy"
    }
  }
};
const path=new URL('./support-phase-101.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:101,checkedAt:'2026-10-27',description:'ブロッカー登場時の補充、墓地回収、山札への除去と同名カードのバウンス、NEO進化とラスト・バーストの6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-101.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-101','Do not overwrite an existing definition');const def=championDefinition(row,'phase-101');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:101,checkedAt:manifest.checkedAt,baseCount:1578,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<101)};assert.equal(data.cards.length,1584);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
