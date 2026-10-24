import test from 'node:test';import assert from 'node:assert/strict';
import {e,setup,give,inst} from './target-fixture.mjs';
import {manaZoneHTML,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
const move=(s,kind,pred=()=>true,opts={manualMana:true})=>{const a=e.getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));e.step(s,a,opts);};
const select=(s,...uids)=>uids.forEach(uid=>move(s,'selectMana',a=>a.uid===uid));
const begin=(s,id='dm14-108')=>{give(s,0,'hand',[id]);move(s,'play',a=>a.cardId===id);assert.equal(s.decision.type,'manaPayment');};
const finish=s=>{for(let n=0;s.decision?.type==='manaPayment';n++){assert.ok(n<100);e.step(s,e.chooseAI(s));}};
const h={art:id=>'<span class="art-card" data-art="'+id+'"></span>',icon:()=>'',displayCard:e.card};
test('paid summon waits without tapping, moving cards, logging or advancing RNG; toggles are reversible and cancellable',()=>{
 const s=setup();give(s,0,'mana',['dm14-108','dm01-097','dm14-108']);give(s,0,'hand',['dm14-108']);const before=structuredClone(s);move(s,'play');const d=s.decision;assert.equal(d.selected.length,0);assert.deepEqual({...s,decision:null},before);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='confirmMana'));select(s,d.pool[0].uid);assert.ok(e.manaSelectionStatus(d).valid);select(s,d.pool[0].uid);assert.equal(d.selected.length,0);move(s,'cancelMana');assert.deepEqual(s,before);
});
test('only the explicitly selected physical mana are tapped; choosing a duplicate picture keeps the other copy unused',()=>{
 const s=setup();give(s,0,'mana',['dm14-108','dm14-108','dm01-097']);const [a,b]=s.players[0].mana;begin(s);select(s,b.uid);move(s,'confirmMana');assert.equal(a.tapped,false);assert.equal(b.tapped,true);assert.equal(s.players[0].mana[2].tapped,false);assert.equal(s.players[0].battle.length,1);assert.equal(s.metrics[0].played['dm14-108'],1);assert.equal(s.actions,1);
});
test('used mana cannot be selected and forged selections/confirmations fail without changing state',()=>{
 const s=setup();give(s,0,'mana',['dm14-108','dm14-108']);s.players[0].mana[0].tapped=true;begin(s);const before=structuredClone(s),a=e.getLegalActions(s)[0];assert.ok(!e.getLegalActions(s).some(a=>a.uid===s.players[0].mana[0].uid));assert.throws(()=>e.step(s,{...a,uid:s.players[0].mana[0].uid}));assert.throws(()=>e.step(s,{kind:'confirmMana',id:0,player:0}));assert.deepEqual(s,before);
});
test('mana amount alone cannot pay an absent civilization',()=>{
 const s=setup();give(s,0,'mana',['dm14-108','dm01-097','dm14-108']);begin(s,'dm01-097');select(s,s.players[0].mana[0].uid,s.players[0].mana[2].uid);assert.equal(e.manaSelectionStatus(s.decision).valid,false);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='confirmMana'));select(s,s.players[0].mana[1].uid);assert.equal(e.manaSelectionStatus(s.decision).valid,true);move(s,'confirmMana');
});
test('one multicolor card does not simultaneously pay two civilization requirements',()=>{
 const pool=[inst('dm24ex2-019'),inst('dm14-108')],d={pool,selected:pool.map(x=>x.uid),cost:1,colors:['光','火']};assert.equal(e.manaSelectionStatus(d).valid,false);pool.push(inst('dm01-097'));d.selected=pool.map(x=>x.uid);assert.equal(e.manaSelectionStatus(d).valid,true);
});
test('five-color mana supplies one civilization and zero points, including legal civilization overpayment',()=>{
 const all=e.card('dm27-055');assert.equal(e.civilizations(all).length,5);const pool=[inst(all.id),inst('dm14-108')];let d={pool,selected:pool.map(x=>x.uid),cost:2,colors:['火']};assert.equal(e.manaSelectionStatus(d).amount,1);assert.equal(e.manaSelectionStatus(d).valid,false);d.cost=1;assert.equal(e.manaSelectionStatus(d).valid,true);
 const colors=['光','水','闇','火','自然'],multi={pool:colors.map((_,i)=>inst(['dm01-075','dm01-083','dm01-090','dm01-097','dm14-108'][i])),selected:[],cost:3,colors};multi.selected=multi.pool.map(x=>x.uid);assert.equal(e.manaSelectionStatus(multi).valid,true);
});
test('cost reduction is reflected in the required payment before entry',()=>{
 const s=setup();give(s,1,'mana',['dm24ex2-019']);begin(s,'dm23ex3-S07');assert.equal(s.decision.cost,3);finish(s);assert.ok(s.players[0].battle.some(x=>x.cardId==='dm23ex3-S07'));
});
test('spell side uses its actual face civilizations and reduced cost, not the creature face',()=>{
 const s=setup();give(s,0,'hand',['dmex17-105']);move(s,'play',a=>a.face===1);assert.equal(s.decision.cost,2);assert.deepEqual(s.decision.colors,['自然']);finish(s);assert.equal(s.players[0].hand.some(x=>x.cardId==='dmex17-105'),false);
});
test('mana creatures used as payment can be selected and are tapped in battle',()=>{
 const s=setup();give(s,0,'mana',[]);give(s,0,'battle',['dmex18-029']);begin(s);assert.equal(s.decision.pool[0].paymentBird,true);select(s,s.players[0].battle[0].uid);move(s,'confirmMana');assert.equal(s.players[0].battle[0].tapped,true);assert.equal(s.players[0].battle.length,2);
});
test('payment choice survives JSON save/reload and resumes exactly one play',()=>{
 let s=setup();begin(s);select(s,s.decision.pool.find(x=>e.card(x).civ==='自然').uid);s=JSON.parse(JSON.stringify(s));move(s,'confirmMana');assert.equal(s.actions,1);assert.equal(s.players[0].battle.length,1);assert.equal(s.metrics[0].played['dm14-108'],1);
});
test('CPU and automatic simulations keep automatic payment with identical resulting states',()=>{
 const s=setup();give(s,0,'hand',['dm14-108']);const expected=structuredClone(s),action=e.getLegalActions(s).find(a=>a.kind==='play');e.step(expected,action);e.step(s,action,{manualMana:true});finish(s);assert.deepEqual(s,expected);
});
test('a nonpayment draw/random discard action consumes the secure random source once and commits its preview outcome',()=>{
 const s=setup();give(s,0,'hand',['dm01-094']);give(s,1,'hand',['dm14-108','dm01-097','dm01-075']);let calls=0;e.setRandomSource(()=>{calls++;return .8;});try{move(s,'play');assert.equal(calls,0);finish(s);assert.equal(calls,1);assert.equal(s.players[1].grave[0].cardId,'dm01-075');}finally{e.setRandomSource(null);}
});
test('zero-payment free summons bypass the picker; phase progression has no new decision',()=>{
 const s=setup();give(s,0,'hand',[]);move(s,'toAttack');assert.equal(s.decision,null);assert.equal(s.phase,'attack');
});
test('mana inspection has actual art, explicit state and horizontal cards; opposing facedown identities remain hidden',()=>{
 const rows=[inst('dm14-108'),{...inst('dm01-097'),tapped:true},{...inst('dm01-083'),faceDown:true}];const html=manaZoneHTML(rows,{...h,owner:1});assert.match(html,/mana-card-track/);assert.match(html,/is-tapped/);assert.match(html,/未使用/);assert.match(html,/使用済/);assert.ok(!html.includes('data-art="dm01-083"'));assert.ok(!html.includes(e.card('dm01-083').name));
});
test('phone payment UI shows live amount, civilization status, every physical card and disabled confirmation',()=>{
 const s=setup();give(s,0,'mana',['dm14-108','dm14-108']);begin(s);const ui={...newManualUI(),mobile:true,mobilePanel:'actions'};let html=manualScreenHTML(s,ui,h);assert.match(html,/選択 0 \/ 必要 1マナ/);assert.match(html,/mana-payment-open/);assert.match(html,/支払うマナを選ぼう/);assert.match(html,/data-index="" disabled>このマナで使う/);select(s,s.players[0].mana[1].uid);html=manualScreenHTML(s,ui,h);assert.match(html,/✓ 選択中/);assert.match(html,/✓ 自然/);assert.match(html,/選択 1 \/ 必要 1マナ/);
});
