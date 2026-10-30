import fs from 'node:fs';
import assert from 'node:assert/strict';
import {championDefinition} from './champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const write=(f,v)=>fs.writeFileSync(new URL(f,import.meta.url),JSON.stringify(v,null,2)+'\n');
const phase=202,batch='phase-202',baseCount=2882,details=read('../dist/details.json'),data=read('../dist/cards.json');
const detail=details.cards.find(c=>c.id==='dm25ex2-024');
const expected='アビスラッシュ（このクリーチャーを自分の墓地から召喚してもよい。そうしたら、このターン、このクリーチャーはプレイヤーを攻撃でき、このターンの終わりに山札の下に置かれる）\nタブー・ブレイカー（このクリーチャーはシールドを13ブレイクする）\nこのクリーチャーが攻撃する時、自分の山札の上から13枚を墓地に置いてもよい。そうしたら、闇のクリーチャーを13体まで、自分の墓地から出す。';
assert.equal(detail.faces.length,1);assert.equal(detail.faces[0].abilityText,expected);
const spec={effect:'sixPhoto',abyssRush:true,breaker:13,g202TabooBreaker:true,g34Attack:[{op:'Offer',g186GraveMill:true,title:'山札の上13枚を墓地に置き、闇のクリーチャーを13体まで出す？',defs:[{op:'Mill',n:13},{op:'GraveArmy',n:13,filter:{creature:true,color:'闇'}}]}]};
if(process.argv.includes('--prepare')){
 write('./support-phase-202.json',{phase,checkedAt:'2026-10-30',description:'深淵の禁忌 アビスベル=ジャシン帝：アビスラッシュ、13枚ブレイク、任意の13枚墓地送りと最大13体の闇クリーチャー展開。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/qa_old/36972/'],cards:[{id:detail.id,name:detail.name,source:detail.detailSource||detail.source,faces:detail.faces,spec}]});
}else{
 const m=read('./support-phase-202.json'),refs=read('./image-reference-prints.json');assert.equal(m.cards.length,1);assert.ok(m.regulationVerification?.limits);
 for(const row of m.cards){assert.equal(row.id,detail.id);assert.deepEqual(row.faces,detail.faces);assert.deepEqual(row.spec,spec);assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.ok(row.image?.startsWith('https://dm.takaratomy.co.jp/'));const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch===batch);const def={...championDefinition(row,batch),limit:m.regulationVerification.limits[row.id]};if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(r=>r.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase,checkedAt:m.checkedAt,baseCount,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,ruleSource:m.rules,next:['未対応能力の共通処理を追加し、カード別の公式照合と対戦検証を継続する'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<phase)};
 assert.equal(data.cards.length,baseCount+1);write('../dist/cards.json',data);write('./image-reference-prints.json',refs);console.log('Added '+m.cards[0].name+'; '+data.cards.length+' supported.');
}
