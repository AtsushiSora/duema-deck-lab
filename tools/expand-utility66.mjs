import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const specs={
 'dmrp18-095':{effect:'champion',g51Effect:'LifePlan',normalCharger:true,gStrike:true},
 'dmrp18-071':{effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1}],normalCharger:true,gStrike:true},
 'dmr03-028':{effect:'champion',g54Effect:'Shrine'},
 'dm06-052':{effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'mana',to:'hand',n:3,optional:true,title:'マナから手札に戻すカードを3枚まで選ぶ'}],trigger:true},
 'dm14-015':{effect:'champion',g54Effect:'Apocalypse',trigger:true},
 'dmr01-033':{effect:'recommended',recommendRole:'scrapper',trigger:true},
 'dm02-039':{effect:'champion',g54Effect:'Cube',trigger:true},
 'dmr01-078':{effect:'champion',g54Effect:'Circle',trigger:true},
 'dmx06-010':{effect:'champion',g54Effect:'Onsen'},
 'dm39-029':{effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',title:'破壊する相手のクリーチャーを選ぶ'},{op:'Discard',n:2}]},
 'dm11-023':{effect:'champion',g54Effect:'Fortune'},
 'dm01-069':{effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',to:'mana',n:1,optional:true,title:'手札からマナゾーンに置くカードを1枚まで選ぶ'}]}
};
const path=new URL('./support-phase-66.json',import.meta.url),details=read('../dist/details.json');
if(process.argv.includes('--prepare')){
 const manifest={phase:66,checkedAt:'2026-10-26',description:'手札補充・マナ加速・呪文検索・除去に使える定番カード12種類。',rules:['https://dm.takaratomy.co.jp/rule/regulation/'],cards:Object.entries(specs).map(([id,spec])=>{const d=details.cards.find(c=>c.id===id);assert.ok(d,id);return{id,name:d.name,source:d.source,faces:d.faces,spec};})};
 fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 12 definitions; verify the manifest before expanding.');
}else{
 const manifest=read('./support-phase-66.json'),data=read('../dist/cards.json'),refs=read('./image-reference-prints.json');assert.equal(manifest.cards.length,12);
 for(const row of manifest.cards){assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,specs[row.id]);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch==='phase-66','Do not overwrite an existing definition');const def=championDefinition(row,'phase-66');if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(x=>x.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase:66,checkedAt:manifest.checkedAt,baseCount:1359,newEffectCards:12,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<66)};assert.equal(data.cards.length,1371);
 for(const[p,v]of[['../dist/cards.json',data],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(v,null,2)+'\n');console.log('Added 12 utilities: '+data.cards.length+' supported types.');
}
