import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,setup,give,inst} from './target-fixture.mjs';
import {manaZoneHTML,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {printedManaValue} from '../tools/detail-parser.mjs';
import {championDefinition} from '../tools/champion-definition.mjs';

const Q='dm25ex1-SP5',DOL='dm26ex4-019',DECISION='dm24rp4-011',OLD='dm27-055';
const colors=['光','水','闇','火','自然'];
const h={art:id=>'<span data-art="'+id+'"></span>',icon:()=>'',displayCard:e.card};
const move=(s,kind,pred=()=>true)=>{const a=e.getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind);e.step(s,a,{manualMana:true});};

test('official mana cell preserves printed zero, one and legacy dash independently of five civilizations',()=>{
 for(const [text,n] of [['0',0],['1',1],['１',1],['-',0]])assert.equal(printedManaValue("<td class='civil'>光/水/闇/火/自然</td><td class='mana'>"+text+'</td>'),n);
 for(const html of ["<td class='cost'>1</td>","<td class='mana'></td>","<td class='mana'>?</td>"])assert.throws(()=>printedManaValue(html),/マナ数/);
});
test('source manifests retain official mana on regeneration for all three corrected cards',()=>{
 for(const [phase,id] of [[52,Q],[49,DOL],[27,DECISION]]){
  const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))),row=m.cards.find(c=>c.id===id);
  assert.equal(row.spec.manaValue,1);assert.equal(championDefinition(row).manaValue,1);assert.equal(e.manaValue(e.card(id)),1);
 }
 assert.equal(e.manaValue(e.card(OLD)),0);
});
for(const id of [Q,DOL,DECISION])test(id+' pays one numerical mana and any single civilization, never multiple civilizations alone',()=>{
 const pool=[inst(id)];
 for(const color of colors){const cost={cost:1,civilizations:[color]};assert.deepEqual(e.manaPayment(pool,cost),[pool[0].uid]);assert.equal(e.manaSelectionStatus({pool,selected:[pool[0].uid],cost:1,colors:[color]}).valid,true);}
 assert.equal(e.manaPayment(pool,{cost:2,civilizations:['火']}),null);
 assert.equal(e.manaPayment(pool,{cost:1,civilizations:['火','自然']}),null);
 pool[0].tapped=true;assert.equal(e.manaPayment(pool,{cost:1,civilizations:['火']}),null);
});
test('reported position has one available mana out of two with Quasar unused and the other card tapped',()=>{
 const s=setup();give(s,0,'mana',[Q,'dm01-097']);s.players[0].mana[1].tapped=true;
 give(s,0,'hand',['dm14-108']);const q=s.players[0].mana[0],html=manaZoneHTML(s.players[0].mana,{...h,state:s});
 assert.match(html,/光\/水\/闇\/火\/自然 · 1マナ/);
 assert.match(manualScreenHTML(s,{...newManualUI(),mobile:true,mobilePanel:'actions'},h),/自分のマナを見る・使用可能1・合計2/);
 move(s,'play');assert.equal(s.decision.type,'manaPayment');move(s,'selectMana',a=>a.uid===q.uid);
 assert.equal(e.manaSelectionStatus(s.decision).amount,1);assert.equal(e.manaSelectionStatus(s.decision).valid,true);
 let saved=JSON.parse(JSON.stringify(s));move(saved,'confirmMana');assert.equal(saved.players[0].mana[0].tapped,true);
 assert.equal(saved.players[0].battle[0].cardId,'dm14-108');assert.equal(saved.actions,1);
});
test('automatic payment uses the same corrected mana as manual payment',()=>{
 for(const id of [Q,DOL,DECISION]){const s=setup();give(s,0,'mana',[id]);give(s,0,'hand',['dm14-108']);const a=e.getLegalActions(s).find(a=>a.kind==='play');assert.ok(a);e.step(s,a);assert.equal(s.players[0].mana[0].tapped,true);assert.equal(s.players[0].battle[0].cardId,'dm14-108');}
});
test('five-color one-mana cards still enter mana tapped and become available after a normal untap',()=>{
 const s=setup();give(s,0,'mana',[]);give(s,0,'hand',[Q]);s.phase='charge';move(s,'charge');assert.equal(s.players[0].mana[0].tapped,true);
 move(s,'toAttack');move(s,'endTurn');move(s,'skipCharge');move(s,'toAttack');move(s,'endTurn');
 assert.equal(s.players[0].mana[0].tapped,false);assert.equal(e.manaValueAt(s,0,s.players[0].mana[0]),1);
});
test('World Barom zero-mana effect overrides corrected values and manual/automatic payment consistently',()=>{
 const s=setup();give(s,0,'mana',[Q,DOL,DECISION]);s.g35ZeroMana=[{p:0,who:1,turns:0}];
 assert.equal(e.manaValueAt(s,0,s.players[0].mana[0]),0);
 const pool=e.paymentPool(s,0);assert.equal(e.manaPayment(pool,{cost:1,civilizations:['自然']}),null);
 assert.equal(e.manaSelectionStatus({pool,selected:pool.map(x=>x.uid),cost:1,colors:['自然']}).valid,false);
});
