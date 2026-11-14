import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FREEZE='dm22rp1-034',EIN='dm22rp1-065',WYVERN='dm22rp1-018',ZWEI='dm22rp1-042',TAIL='dm22rp1-019';
const FIRE='dm01-097',WATER='dm01-083',GREEN='dm01-108',WATER_SEED='dm22rp2-035',FIRE_SEED='dm22rp1-068';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(GREEN));
 return s;
};
const add=(s,p,id,zone='battle',properties={})=>{
 const x=Object.assign(inst(id),properties);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets?.some(t=>t.uid===v)):
 act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id,alternative=false)=>{
 const x=add(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&!!a.alternative===alternative);
 return x;
};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const restore=s=>JSON.parse(JSON.stringify(s));

test('all nine official prints resolve to the five original card IDs and images',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1221.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FREEZE,EIN,WYVERN,ZWEI,TAIL]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['promoy21-043',EIN],['dm22rp1-14A',TAIL],['dm23sd1-005',TAIL],['dm23bd4-032',TAIL]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1221}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[row.id]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
 assert.ok(e.card(TAIL).text.includes('シールドゾーンから手札'));
});

test('Freezen chooses the opposing creature or Tamaseed, then its opponent chooses where it goes',()=>{
 for(const to of ['deckTop','deck']){
  let s=field();
  const creature=add(s,1,FIRE),seed=add(s,1,WATER_SEED),protectedUnit=add(s,1,FIRE,'battle',{justDiverActive:true});
  const fieldCard=add(s,1,'dmrp08-005'),ally=add(s,0,FIRE);
  play(s,FREEZE);
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(values(s)),new Set([creature.uid,seed.uid]));
  pick(s,seed.uid);
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),['deckTop','deck']);
  s=restore(s);
  pick(s,to);
  assert.equal(s.players[1].deck.at(to==='deckTop'?0:-1).uid,seed.uid);
  assert.ok([creature,protectedUnit,fieldCard].every(x=>has(s,1,'battle',x))&&has(s,0,'battle',ally));
 }
});

test('Freezen gives the opponent the order of cards moved together from an evolution',()=>{
 for(const to of ['deckTop','deck']){
  const s=field(),base=inst(FIRE),host=add(s,1,'dmd21-001','battle',{under:[base]});
  play(s,FREEZE);
  pick(s,host.uid);pick(s,to);
  assert.equal(s.decision.player,1);
  pick(s,base.uid);
  const deck=s.players[1].deck;
  assert.deepEqual((to==='deckTop'?deck.slice(0,2):deck.slice(-2)).map(x=>x.uid),[base.uid,host.uid]);
 }
});

test('Freezen remains an opposing effect when the protected creature’s controller chooses',()=>{
 for(const to of ['deckTop','deck']){
  const s=field(),creature=add(s,1,FIRE);
  s.g26Extreme=[false,true];
  play(s,FREEZE);
  pick(s,creature.uid);pick(s,to);
  assert.ok(has(s,1,'battle',creature));
 }
});

test('Freezen puts each evolution layer in the deck of its physical owner',()=>{
 for(const to of ['deckTop','deck']){
  const s=field(),base={...inst(FIRE),cardOwner:0};
  const host=add(s,1,'dmd21-001','battle',{under:[base]});
  play(s,FREEZE);
  pick(s,host.uid);pick(s,to);
  const at=to==='deckTop'?0:-1;
  assert.equal(s.players[0].deck.at(at).uid,base.uid);
  assert.equal(s.players[1].deck.at(at).uid,host.uid);
 }
});

test('Freezen gains S-Trigger from a water creature and Tamaseed belonging to its own player',()=>{
 for(const enabled of [true,false]){
  const s=field(1),enemy=add(s,1,FIRE);
  add(s,0,WATER);
  add(s,enabled?0:1,WATER_SEED);
  give(s,0,'shields',[FREEZE]);
  attack(s,enemy.uid);act(s,'noBlock');
  const trigger=e.getLegalActions(s).find(a=>a.kind==='useTrigger');
  assert.equal(!!trigger,enabled);
  if(trigger){
   e.step(s,trigger);pick(s,enemy.uid);pick(s,'deckTop');
   assert.equal(s.players[1].deck[0].uid,enemy.uid);
   assert.ok(s.players[0].mana.every(x=>!x.tapped));
  }else assert.ok(s.players[0].hand.some(x=>x.cardId===FREEZE));
 }
});

for(const [id,threshold,payment] of [[EIN,3,1],[WYVERN,5,2],[ZWEI,5,2]]){
 test(e.card(id).name+' checks total mana and fire payment, then only the alternative summon gets an end effect',()=>{
  for(const alternate of [false,true]){
   let s=field();
   give(s,0,'mana',Array(threshold-1).fill(FIRE));
   const x=add(s,0,id,'hand');
   const alt=()=>e.getLegalActions(s).find(a=>a.uid===x.uid&&a.role==='paidAlt568');
   assert.equal(alt(),undefined);
   add(s,0,FIRE,'mana');
   assert.equal(alt().cost,payment);
   for(const y of s.players[0].mana)y.tapped=true;
   s.players[0].mana[0].cardId=WATER;
   s.players[0].mana[0].tapped=false;
   assert.equal(alt(),undefined);
   s.players[0].mana[0].cardId=FIRE;
   for(const y of s.players[0].mana.slice(0,payment))y.tapped=false;
   assert.equal(alt().cost,payment);
   if(!alternate)for(const y of s.players[0].mana)y.tapped=false;
   act(s,'play',a=>a.uid===x.uid&&!!a.alternative===alternate);
   assert.ok(has(s,0,'battle',x));
   assert.equal(s.players[0].mana.filter(y=>y.tapped).length,alternate?threshold:e.card(id).cost);
   const top=s.players[0].deck[0];
   s=restore(s);end(s);
   assert.equal(has(s,0,'grave',x),alternate);
   assert.equal(has(s,0,'hand',top),alternate);
  }
 });
}

test('the alternative end effect follows evolution and remains when the original creature has left',()=>{
 for(const reenter of [false,true]){
  const s=field();
  const x=play(s,EIN,true),top=s.players[0].deck[0];
  if(reenter){
   play(s,'dm01-086');pick(s,x.uid);
   act(s,'play',a=>a.uid===x.uid&&!a.alternative);
  }else{
   play(s,'dmd21-001');act(s,'evolve',a=>a.baseUid===x.uid);
  }
  end(s);
  assert.ok(has(s,0,'hand',top));
  assert.equal(has(s,0,'grave',x),!reenter);
  assert.equal(has(s,0,'battle',x),reenter);
 }
});

test('a replaced entry leaves the delayed draw but no creature to destroy',()=>{
 const s=field();
 add(s,1,'dmrp22-024');
 give(s,0,'mana',Array(5).fill(FIRE));
 const top=s.players[0].deck[0];
 s.players[0].enteredThisTurn=2;
 const wyvern=play(s,WYVERN,true);
 assert.ok(has(s,0,'mana',wyvern));
 end(s);
 assert.ok(has(s,0,'hand',top)&&has(s,0,'mana',wyvern));
});

test('Wyvern immediately attacks for two shields and Zwei can fight on entry before its delayed draw',()=>{
 const fast=field(),w=play(fast,WYVERN,true);
 attack(fast,w.uid);act(fast,'noBlock');drain(fast);
 assert.equal(fast.players[1].shields.length,3);

 const fight=field(),enemy=add(fight,1,'dm01-001');
 const top=fight.players[0].deck[0],z=play(fight,ZWEI,true);
 pick(fight,enemy.uid);drain(fight);
 assert.ok(has(fight,0,'grave',z)&&!has(fight,0,'hand',top));
 end(fight);
 assert.ok(has(fight,0,'hand',top));
});

test('Tail Dragon enters as S-Trigger and uses its own fire count for the optional fight and W-breaker',()=>{
 for(const enabled of [false,true]){
  const s=field(1),enemy=add(s,1,WATER);
  if(enabled){add(s,0,FIRE);add(s,0,FIRE_SEED);}
  const stronger=add(s,1,WYVERN);
  give(s,0,'mana',[]);
  give(s,0,'shields',[TAIL]);
  attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger');
  const x=s.players[0].battle.find(y=>y.cardId===TAIL);
  assert.equal(e.power(x,false,s),enabled?7000:5000);
  assert.equal(e.effectiveCard(x,s).breaker===2,enabled);
  pick(s,enabled?stronger.uid:null);drain(s);
  assert.ok(has(s,0,'battle',x));
  assert.equal(has(s,1,'grave',stronger),enabled);
 }
});
