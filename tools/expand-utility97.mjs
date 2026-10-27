import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm36-003": {
    "breaker": 2,
    "effect": "champion",
    "g84Effect": "Hogan"
  },
  "dm36-s04": {
    "breaker": 3,
    "g84Irons": true,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Draw",
        "n": 5,
        "optional": true
      }
    ]
  },
  "dm36-049": {
    "effect": "champion",
    "g84Effect": "Chain",
    "g84Jester": true
  },
  "dmd02-002": {
    "effect": "champion",
    "g84Effect": "Sonic"
  },
  "dm12-002": {
    "breaker": 2,
    "effect": "champion",
    "g84Effect": "Extreme"
  },
  "dm02-026": {
    "trigger": true,
    "effect": "champion",
    "g84Effect": "Deep"
  }
};
const path=new URL('./support-phase-97.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:97,checkedAt:'2026-10-27',description:'激流連鎖・連鎖、登場回数による補充、水の登場によるブロック回避、バウンスと相手のクリーチャー数ドローの6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-97.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-97','Do not overwrite an existing definition');const def=championDefinition(row,'phase-97');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:97,checkedAt:manifest.checkedAt,baseCount:1554,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<97)};assert.equal(data.cards.length,1560);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
