import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm08-s03": {
    "evolution": {
      "category": "ドラゴン"
    },
    "breaker": 3,
    "g86Abzo": true
  },
  "dm28-005": {
    "breaker": 2,
    "g86Fernando": true
  },
  "dmc48-023": {
    "breaker": 2,
    "g86Zangiras": true
  },
  "dm28-088": {
    "trigger": true,
    "effect": "champion",
    "g86Effect": "Sazan"
  },
  "dm21-045": {
    "g78Fly": 2
  },
  "dm31-016": {
    "trigger": true,
    "effect": "champion",
    "g85Effect": "Jack",
    "g85JackMax": 3000
  }
};
const path=new URL('./support-phase-99.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:99,checkedAt:'2026-10-27',description:'墓地のクリーチャー数による進化ドラゴン強化、墓地の呪文数による軽減・弱体化、攻撃時の蘇生、全体弱体化、死亡時の手札破壊、S・トリガー除去の6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-99.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-99','Do not overwrite an existing definition');const def=championDefinition(row,'phase-99');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:99,checkedAt:manifest.checkedAt,baseCount:1566,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<99)};assert.equal(data.cards.length,1572);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
