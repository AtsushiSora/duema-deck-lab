import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BANDAM='dm20-054',KAPARA='dm36-044',WIRAPON='dm36-032';
const BODY='dm01-108',VEGETABLE='dm10-106',PON='dm36-099',KURT='dm38-020';
const LIFE='dm06-110',GATE='dm16-007';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const action=(s,kind,x,target)=>e.getLegalActions(s).find(a=>a.kind===kind&&a.uid===x.uid&&(target===undefined||a.target===target));
const pick=(s,uid)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===uid;
});
const charge=(s,x)=>{s.phase='charge';act(s,'charge',a=>a.uid===x.uid);drain(s);};
const end=(s)=>{s.phase='attack';act(s,'endTurn');drain(s);};
function move(s,p,x,to){
 s.phase='main';
 (s.extTasks??=[]).push({op:'g34_ExactMove',p:s.active,source:LIFE,owner:p,target:x.uid,to});
 act(s,'toAttack');
 drain(s);
}

test('Phase 857 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-857.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[BANDAM,KAPARA,WIRAPON]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:857}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:855}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:857}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Bandam boosts for charging and ramping friendly Wild Veggies, then expires (QA 35443)',()=>{
 const s=field();
 const bandam=add(s,0,'battle',BANDAM),enemy=add(s,1,'battle',BANDAM);
 charge(s,add(s,0,'hand',BODY));
 assert.equal(e.power(bandam,false,s),1000);
 charge(s,add(s,0,'hand',VEGETABLE));
 assert.equal(e.power(bandam,false,s),3000);
 s.players[0].deck.unshift(inst(VEGETABLE));
 play(s,add(s,0,'hand',LIFE));
 drain(s);
 assert.equal(e.power(bandam,false,s),5000);
 assert.equal(e.power(enemy,false,s),1000);
 end(s);
 assert.equal(e.power(bandam,false,s),1000);
});

test('Bandam sees a Wild Veggie moved from battle into its mana during the opponent turn',()=>{
 const s=field();
 const bandam=add(s,0,'battle',BANDAM);
 end(s);
 assert.equal(s.active,1);
 move(s,0,add(s,0,'battle',VEGETABLE),'mana');
 assert.equal(e.power(bandam,false,s),3000);
 charge(s,add(s,1,'hand',VEGETABLE));
 assert.equal(e.power(bandam,false,s),3000);
 end(s);
 assert.equal(e.power(bandam,false,s),1000);
});

test('Bandam counts each Wild Veggie in a batch and ignores face-down cards',()=>{
 const s=field(),bandam=add(s,0,'battle',BANDAM);
 s.players[0].deck.unshift(inst(VEGETABLE),inst(BODY),inst(VEGETABLE),inst(VEGETABLE));
 (s.extTasks??=[]).push({op:'g34_Ramp',p:0,source:LIFE,n:3,g809Together:true},
  {op:'g34_Ramp',p:0,source:LIFE,n:1,faceDown:true});
 act(s,'toAttack');
 drain(s);
 assert.equal(e.power(bandam,false,s),5000);
 assert.ok(s.players[0].mana.some(x=>x.cardId===VEGETABLE&&x.faceDown));
});

test('Bandam does not trigger if a replacement prevents the mana placement',()=>{
 const s=field();
 const bandam=add(s,0,'battle',BANDAM),vegetable=add(s,0,'battle',VEGETABLE);
 s.extLimits=[{kind:'g627Stay',ref:{uid:vegetable.uid,incarnation:0},expires:'start',who:0}];
 move(s,0,vegetable,'mana');
 assert.ok(s.players[0].battle.includes(vegetable));
 assert.equal(e.power(bandam,false,s),1000);
});

test('Kapara can attack creatures and block without a friendly H Soul entry (QA 35997)',()=>{
 const s=field();
 const kapara=add(s,0,'battle',KAPARA),enemy=add(s,1,'battle',BODY,{tapped:true});
 play(s,add(s,0,'hand',BODY));
 s.phase='attack';
 assert.equal(action(s,'attack',kapara,'player'),undefined);
 assert.ok(action(s,'attack',kapara,enemy.uid));
 end(s);
 attack(s,enemy.uid);
 assert.ok(action(s,'block',kapara));
 act(s,'block',a=>a.uid===kapara.uid);
 assert.ok(kapara.tapped);
});

test('Kapara counts its own entry with speed and ignores the opponent’s entries (QA 36000)',()=>{
 const s=field();
 const old=add(s,0,'battle',KAPARA);
 const newcomer=add(s,0,'hand',KAPARA);
 play(s,newcomer);
 s.phase='attack';
 assert.ok(action(s,'attack',old,'player'));
 assert.equal(action(s,'attack',newcomer,'player'),undefined);
 newcomer.g34Grants=[{turn:s.turn,speedAttacker:true}];
 assert.ok(action(s,'attack',newcomer,'player'));
 end(s);
 const enemy=add(s,1,'battle',KAPARA);
 s.phase='main';
 assert.equal(s.active,1);
 play(s,add(s,1,'hand',KURT));
 s.phase='attack';
 assert.ok(action(s,'attack',enemy,'player'));
 end(s);
 assert.equal(s.active,0);
 s.phase='attack';
 assert.equal(action(s,'attack',old,'player'),undefined);
});

test('Kapara remembers an H Soul blocker deployed by a spell after it leaves (QA 35998/35999)',()=>{
 let s=field();
 const kapara=add(s,0,'battle',KAPARA),kurt=add(s,0,'hand',KURT);
 play(s,add(s,0,'hand',GATE));
 assert.ok(s.decision);
 drain(s);
 assert.ok(s.players[0].battle.includes(kurt));
 move(s,0,kurt,'hand');
 assert.ok(s.players[0].hand.includes(kurt));
 s=structuredClone(s);
 assert.ok(action(s,'attack',kapara,'player'));
});

test('Wirapon returns another friendly K Soul creature, continues its attack and can attack again (QA 36059/36060)',()=>{
 let s=field();
 const attacker=add(s,0,'battle',WIRAPON),pon=add(s,0,'battle',PON,{g35Ignored:s.turn});
 add(s,0,'battle',KAPARA);
 add(s,1,'battle',PON);
 attack(s,attacker.uid);
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid).filter(Boolean),[pon.uid]);
 s=structuredClone(s);
 pick(s,pon.uid);
 const live=s.players[0].battle.find(x=>x.uid===attacker.uid);
 assert.ok(s.players[0].hand.some(x=>x.uid===pon.uid));
 assert.equal(live.tapped,false);
 assert.equal(s.attack.attacker,live.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(action(s,'attack',live,'player'));
 attack(s,live.uid);
 assert.equal(s.decision?.task?.op==='g34_MarshalTouch558',false);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(live.tapped);
});

test('Wirapon remains tapped after declining or when the chosen creature stays',()=>{
 for(const prevent of [false,true]){
  const s=field();
  const attacker=add(s,0,'battle',WIRAPON),pon=add(s,0,'battle',PON);
  if(prevent)s.extLimits=[{kind:'g627Stay',ref:{uid:pon.uid,incarnation:0},expires:'start',who:0}];
  attack(s,attacker.uid);
  if(prevent)pick(s,pon.uid);
  else act(s,'extended',a=>!s.decision.choices[a.choice].value);
  drain(s);
  assert.ok(attacker.tapped);
  assert.ok(s.players[0].battle.includes(pon));
  assert.equal(s.players[1].shields.length,4);
 }
});
