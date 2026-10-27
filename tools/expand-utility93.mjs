import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm32-s08": {
    "breaker": 2,
    "effect": "champion",
    "g80Effect": "Nex",
    "g80Nex": true
  },
  "dmx21-004": {
    "effect": "champion",
    "g80Effect": "Rupia"
  },
  "sp-001": {
    "breaker": 2,
    "effect": "champion",
    "g80Effect": "Valkyrie"
  },
  "sp-003": {
    "attackBonus": 1000,
    "g80Gazer": true
  },
  "dm38-003": {
    "speedAttacker": true,
    "breaker": 2,
    "g80Genji": true
  },
  "dmc36-021": {
    "speedAttacker": true,
    "noPlayerAttack": true,
    "g75Exze": true
  }
};
const path=new URL('./support-phase-93.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:93,checkedAt:'2026-10-27',description:'ドラゴンの山札検索と展開、墓地のファイアー・バードによる攻撃強化、攻撃時のブロッカー除去、終了時に手札へ戻る速攻ドラゴンの6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-93.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-93','Do not overwrite an existing definition');const def=championDefinition(row,'phase-93');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:93,checkedAt:manifest.checkedAt,baseCount:1530,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<93)};assert.equal(data.cards.length,1536);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
