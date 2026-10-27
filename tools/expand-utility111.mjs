import fs from'node:fs';import assert from'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmsd08-007':{g111Role:'gagan',effect:'sixPhoto',g34Tasks:[{op:'Look',n:3,stages:[{to:'hand',n:1,optional:true,reveal:true,filter:{creature:true}}]}]},
 'dmr23-074':{g111Role:'yell',effect:'sixPhoto',g34Tasks:[{op:'Ramp',n:1},{op:'Target',to:'grave',filter:{blocker:true}}]},
 'dmx22b-163':{trigger:true,g111Role:'journey',effect:'sixPhoto',g34Tasks:[{op:'Draw',n:3}]},
 'dmx07-016':{trigger:true,g111Role:'onsen',effect:'champion',g92Effect:'Onsen'},
 'dmr06-014':{trigger:true,g111Role:'wedding',effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',deploy:true,n:2,optional:true,filter:{creature:true,nonEvolution:true,notColor:'光',race:'エンジェル・コマンド'},title:'手札から出す光でも進化でもないエンジェル・コマンドを2体まで選ぶ'}]},
 'dm24ex2-048':{g111Role:'portal',effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',deploy:true,n:1,filter:{creature:true,color:'闇'},title:'墓地から出す闇のクリーチャーを1体選ぶ'}]}
};
const path=new URL('./support-phase-111.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:111,checkedAt:'2026-10-28',description:'クリーチャー検索、マナ加速、手札補充と手札・墓地からの展開を支える6種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);const source=d.detailSource||d.source,printId=new URL(source).searchParams.get('id');return{id,name:d.name,source,faces:d.faces,spec,...(printId!==id?{printId,sourceNote:'初版のカードIDを維持し、能力文と画像は最新の公式再録で照合する。'}:{})};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 6 definitions; verify before expanding.');
}else{
 const manifest=read('./support-phase-111.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,6);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-111','Do not overwrite an existing definition');const def=championDefinition(row,'phase-111');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.printId||row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===ref.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:111,checkedAt:manifest.checkedAt,baseCount:1631,newEffectCards:6,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<111)};assert.equal(data.cards.length,1637);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 6 utilities: '+data.cards.length+' supported types.');
}
