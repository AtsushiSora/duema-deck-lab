import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
  "dm26rp3-040": {
    "sasage": 3,
    "g91Grave": true,
    "effect": "champion",
    "g91Effect": "Discard"
  },
  "dm26rp3-035": {
    "sasage": 3,
    "g91Al": true,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Look",
        "n": 4,
        "stages": [
          {
            "to": "hand",
            "n": 1
          }
        ]
      }
    ]
  },
  "dmrp17-092": {
    "sasage": 1,
    "effect": "sixPhoto",
    "g34Tasks": [
      {
        "op": "Ramp",
        "n": 1
      }
    ]
  }
};
const path=new URL('./support-phase-104.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:104,checkedAt:'2026-10-27',description:'画像2構成の未対応3種類。タマシードのササゲール、墓地召喚、破壊時の呪文選択防御、マナ加速。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId}:{} )};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 3 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-104.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-104','Do not overwrite an existing definition');const def=championDefinition(row,'phase-104');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:104,checkedAt:manifest.checkedAt,baseCount:1596,newEffectCards:3,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<104)};assert.equal(data.cards.length,1599);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 3 utilities: '+data.cards.length+' supported types.');
}
