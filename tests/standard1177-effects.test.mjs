import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KUNO='dm23sd2-001',HEX='dmd33-003',KOB='dm22rp2-056',SIRIES='dm23rp1-011';
const FIRE='dm01-097',LIGHT='dm01-075',WATER='dm01-083';
const SEED='dmrp22-048',DORAN='dm22rp1-2B',SEGARE='dmrp19-044';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(FIRE));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const hasOffer=(s,source,op)=>s.decision?.task?.source===source&&s.decision.task.op===op;

test('phase 1177 official prints map to three distinct canonical battle definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1177.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KUNO,HEX,KOB]);
 assert.equal(m.printAliases.length,1);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.limit],['creature',f.cost,f.race,+f.powerText,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1177}),row.spec);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1177}));
 }
});

test('Segare prevents the entire Kunoichi swap and stays on the field (QA43301)',()=>{
 const s=field();
 const attacker=put(s,0,'battle',FIRE),segare=put(s,0,'battle',SEGARE);
 const source=put(s,1,'battle',SIRIES),incoming=put(s,1,'hand',KUNO);
 give(s,1,'mana',[LIGHT,LIGHT,LIGHT]);
 attack(s,attacker.uid);
 assert.ok(hasOffer(s,KUNO,'ninjaDeclare'));
 pick(s,true);
 assert.ok(hasOffer(s,KUNO,'ninjaResolve'));
 pick(s,source.uid);
 assert.ok(s.players[0].battle.includes(segare));
 assert.ok(s.players[1].battle.includes(source));
 assert.ok(s.players[1].hand.includes(incoming));
 assert.equal(s.players[1].mana.length,3);
});

test('Kunoichi arrives summoning-sick when exchanged for Siries on its own turn (QA43300)',()=>{
 const s=field(),own=s.players[0];
 const attacker=put(s,0,'battle',FIRE),source=put(s,0,'battle',SIRIES);
 const incoming=put(s,0,'hand',KUNO),blocker=put(s,1,'battle',KUNO);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(hasOffer(s,KUNO,'ninjaDeclare'));
 pick(s,true);
 pick(s,source.uid);
 drain(s);
 assert.ok(own.hand.includes(source));
 assert.ok(own.battle.includes(incoming));
 assert.equal(incoming.entered,s.turn);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===incoming.uid),false);
});

test('Kunoichi redirects the attack to itself on swapping with the attacked Ninja',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),source=put(s,1,'battle',SIRIES,{tapped:true});
 const incoming=put(s,1,'hand',KUNO);
 attack(s,attacker.uid,source.uid);
 pick(s,true);
 pick(s,source.uid);
 assert.equal(s.attack.target,incoming.uid);
 assert.ok(incoming.tapped);
 act(s,'noBlock');
 assert.ok(s.players[0].grave.includes(attacker));
});

test('Kunoichi boosts other current creatures until its next turn start',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE);
 cast(s,KUNO);
 const body=s.players[0].battle.find(x=>x.cardId===KUNO);
 const newcomer=put(s,0,'battle',FIRE);
 assert.equal(e.power(ally,false,s),5000);
 assert.equal(e.power(body,false,s),7000);
 assert.equal(e.power(newcomer,false,s),2000);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(ally,false,s),5000);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(ally,false,s),2000);
});

test('Kunoichi can declare under Genmu and the battlefield entry ability is ignored (QA43298)',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE);
 const source=put(s,1,'battle',SIRIES),ally=put(s,1,'battle',FIRE);
 const incoming=put(s,1,'hand',KUNO);
 put(s,0,'battle',GEN);
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,source.uid);
 assert.ok(s.players[1].battle.includes(incoming));
 assert.equal(e.power(ally,false,s),2000);
});

test('Hex Pain privately routes the chosen top cards to grave, tapped mana and hand',()=>{
 const s=field(),own=s.players[0],top=[inst(LIGHT),inst(HEX),inst(WATER)];
 own.deck.unshift(...top);
 cast(s,HEX);
 assert.equal(e.observation(s,1).deck,undefined);
 pick(s,top[0].uid);
 pick(s,top[1].uid);
 if(s.decision)pick(s,top[2].uid);
 assert.ok(own.grave.includes(top[0]));
 assert.ok(own.mana.includes(top[1])&&top[1].tapped);
 assert.ok(own.hand.includes(top[2]));
});

test('Hex Pain also charges tapped from hand and offers a W-break',()=>{
 const s=field(),own=s.players[0],mana=put(s,0,'hand',HEX);
 s.phase='charge';
 act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(mana.tapped&&own.mana.includes(mana));
 const attacker=put(s,0,'battle',HEX);
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const id of [SEED,DORAN,'dm06-085'])test('Kobayashi draws on entry and can return itself after using '+id,()=>{
 const s=field(),own=s.players[0];
 cast(s,KOB);
 assert.equal(own.hand.length,1);
 const body=own.battle.find(x=>x.cardId===KOB);
 cast(s,id);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===KOB);
 assert.ok(hasOffer(s,KOB,'g34_Offer'));
 pick(s,true);
 drain(s);
 assert.ok(own.hand.includes(body));
});

test('Kobayashi offers no return for a tamaseed put into play without use',()=>{
 const s=field(),body=put(s,0,'battle',KOB),momo=put(s,0,'battle','dmsd20-001'),seed=put(s,0,'hand',SEED);
 attack(s,momo.uid);
 pick(s,seed.uid);
 assert.ok(!hasOffer(s,KOB,'g34_Offer'));
 drain(s);
 assert.ok(s.players[0].battle.includes(body));
});

for(const strikeFirst of [false,true])test('Kunoichi and Hayabusamaru declare together, and Strike first prevents Change (QA43303): '+strikeFirst,()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),source=put(s,1,'battle',SIRIES);
 const kuno=put(s,1,'hand',KUNO),strike=put(s,1,'hand','dm29-037');
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,true);
 const first=strikeFirst?strike:kuno;
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.uid===first.uid);
 if(strikeFirst)pick(s,'strike');
 else{
  pick(s,source.uid);
  while(s.decision?.task?.op==='g34_Offer')pick(s,null);
  if(s.decision?.type==='effectOrder')
   act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.uid===strike.uid);
  if(hasOffer(s,strike.cardId,'ninjaResolve'))pick(s,'strike');
 }
 drain(s);
 assert.equal(s.players[1].battle.includes(kuno),!strikeFirst);
 assert.equal(s.players[1].hand.includes(kuno),strikeFirst);
 assert.ok(s.players[1].battle.includes(strike));
});

test('Kunoichi enters by Change while its cost is restricted for summons (QA43302)',()=>{
 const s=field(),deal=put(s,0,'hand','dmrp05-003');
 const attacker=put(s,0,'battle',FIRE),source=put(s,1,'battle',SIRIES);
 const kuno=put(s,1,'hand',KUNO);
 act(s,'play',a=>a.uid===deal.uid&&a.face===1);
 pick(s,5);
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,source.uid);
 assert.ok(s.players[1].battle.includes(kuno));
 assert.equal(kuno.summonedTurn,undefined);
});
