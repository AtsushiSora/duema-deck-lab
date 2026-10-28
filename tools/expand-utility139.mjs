import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmr19-078':{g139Role:'harite',trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{maxPower:6000}}]},
 'dmrp01-072':{g139Role:'howeiru',effect:'sixPhoto',g34Tasks:[{op:'Draw',n:3}]},
 'dmrp06-072':{g139Role:'waterClock',trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'hand',filter:{maxPower:3000}}]}
};
const path=new URL('./support-phase-139.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:139,checkedAt:'2026-10-29',description:'手札補充の王立アカデミー・ホウエイルと、S・トリガー除去の時を戻す水時計、オンソク・ハリテを追加。既存の選択・移動・ドロー処理を使用。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.detailSource||d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 3 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-139.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,3);assert.ok(manifest.regulationVerification?.allThreeUnrestricted);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-139','Do not overwrite an existing definition');const def=championDefinition(row,'phase-139');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:139,checkedAt:manifest.checkedAt,baseCount:1796,newEffectCards:3,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<139)};assert.equal(data.cards.length,1799);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 3 utilities: '+data.cards.length+' supported types.');
}
