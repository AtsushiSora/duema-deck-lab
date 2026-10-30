import fs from 'node:fs';
import assert from 'node:assert/strict';
import {championDefinition} from './champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const write=(f,v)=>fs.writeFileSync(new URL(f,import.meta.url),JSON.stringify(v,null,2)+'\n');
const phase=213,batch='phase-213',baseCount=3076,details=read('../dist/details.json'),data=read('../dist/cards.json');
const detail=details.cards.find(c=>c.id==='dm25ex1-010');
const expected="自分のマナゾーンにあるカードとエレメントが、合計５つ以上、種族にファイアー・バードまたはフェニックスを持っていれば、このクリーチャーを[ff03]支払って召喚してもよい。\nデッキ進化GV：このクリーチャーを、自分の山札の上から３枚の上に重ねつつ出す。（山札のカードは裏向きのまま下に重ねて出す）\nT・ブレイカー\n自分のクリーチャーすべてに「スピードアタッカー」を与える。\nメテオバーン：このクリーチャーが攻撃する時、これの下にあるカードを１枚相手に見ないで選ばせ、墓地に置いてもよい。それが火のクリーチャーなら、墓地から出す。";
assert.equal(detail.faces.length,1);assert.equal(detail.faces[0].abilityText,expected);
const spec={"evolution":{"g31":true},"g31Evolution":{"zone":"deck","count":3},"g213Mars":true,"breaker":3,"g208Auras":[{"filter":{"creature":true},"grants":{"speedAttacker":true}}]};
if(process.argv.includes('--prepare')){
 write('./support-phase-213.json',{phase,checkedAt:'2026-10-30',description:'愛銀河マーズ・シンギュラリティ：デッキ進化GV、代替3マナ、スピードアタッカー付与、相手が選ぶ非公開のメテオバーンと火クリーチャーの蘇生。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/qa/46960/','https://dm.takaratomy.co.jp/rule/qa/46942/','https://dm.takaratomy.co.jp/rule/qa/46943/','https://dm.takaratomy.co.jp/rule/qa/47055/','https://dm.takaratomy.co.jp/rule/qa/47056/','https://dm.takaratomy.co.jp/rule/qa/47078/','https://dm.takaratomy.co.jp/rule/qa/45560/','https://dm.takaratomy.co.jp/rule/qa/41664/'],cards:[{id:detail.id,name:detail.name,source:detail.detailSource||detail.source,faces:detail.faces,spec}]});
}else{
 const m=read('./support-phase-213.json'),refs=read('./image-reference-prints.json');assert.equal(m.cards.length,1);assert.ok(m.regulationVerification?.limits);
 for(const row of m.cards){assert.equal(row.id,detail.id);assert.deepEqual(row.faces,detail.faces);assert.deepEqual(row.spec,spec);assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.ok(row.image?.startsWith('https://dm.takaratomy.co.jp/'));const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch===batch);const def={...championDefinition(row,batch),limit:m.regulationVerification.limits[row.id]};if(old)data.cards[data.cards.indexOf(old)]=def;else data.cards.push(def);const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(r=>r.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;}
 const old=data.supportExpansion;data.supportExpansion={phase,checkedAt:m.checkedAt,baseCount,newEffectCards:1,newVanillaCards:0,totalCount:data.cards.length,ruleSource:m.rules,next:['未対応能力の共通処理を追加し、カード別の公式照合と対戦検証を継続する'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<phase)};
 assert.equal(data.cards.length,baseCount+1);write('../dist/cards.json',data);write('./image-reference-prints.json',refs);console.log('Added '+m.cards[0].name+'; '+data.cards.length+' supported.');
}
