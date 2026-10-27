import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm27-s01": {
    "evolution": {
      "category": "サイバーロード"
    },
    "breaker": 2,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 3,
        "optional": true
      }
    ]
  },
  "dm32-049": {
    "evolution": {
      "any": [
        {
          "category": "サイバー"
        },
        {
          "race": "オリジン"
        }
      ]
    },
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 1,
        "optional": true
      }
    ]
  },
  "dm32-079": {
    "evolution": {
      "category": "サイバー"
    },
    "effect": "champion",
    "g79Effect": "Rush"
  },
  "dm04-s03": {
    "evolution": {
      "category": "デーモン・コマンド"
    },
    "breaker": 2,
    "effect": "champion",
    "g79Effect": "Barom"
  },
  "dm26-s01": {
    "evolution": {
      "category": "デーモン・コマンド"
    },
    "breaker": 2,
    "effect": "champion",
    "g79Effect": "Barom"
  },
  "dm08-s04": {
    "evolution": {
      "category": "ドラゴン"
    },
    "breaker": 3,
    "g79Bajura": true,
    "limit": 1
  }
};
const path=new URL('./support-phase-92.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:92,checkedAt:'2026-10-27',description:'進化クリーチャーの任意ドロー、シールド数に応じた補充とバウンス、闇以外の全体破壊、攻撃時のマナ妨害の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-92.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-92','Do not overwrite an existing definition');const def=championDefinition(row,'phase-92');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:92,checkedAt:manifest.checkedAt,baseCount:1524,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<92)};assert.equal(data.cards.length,1530);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
