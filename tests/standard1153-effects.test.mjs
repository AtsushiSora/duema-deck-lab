import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AREA='dmd31-003',BAKER='dmx12a-032',RESCUE='dmx18-022';
const FIRE='dm01-097',WATER='dm01-083',LIGHT='dm01-075',NATURE='dm01-108';
const HUNTER='dmd05-003',LIGHT_MULTI='dmrp13-084',THREE='dm34-052';
const GATE='dm01-086',HAND='dm01-027',QQ='dmrp07-m01';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const choiceValue=c=>c.value?.uid??c.value;
const pick=(s,value)=>act(s,'extended',a=>choiceValue(s.decision.choices[a.choice])===value);
const destroyBaker=s=>{
 s.active=1;
 cast(s,HAND);
 act(s,'effect');
};

test('phase 1153 definitions and both print aliases match official metadata',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1153.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[AREA,BAKER,RESCUE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex01-074',AREA],['promoy11-004',BAKER]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1153}),row.spec);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText||0));
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,m.regulationVerification.limits[row.id]);
  assert.deepEqual(c.civilizations,f.civilizations);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(catalogue.get(row.id).id,id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,id);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
 }
});

for(const active of [0,1])test('Area strengthens only its owner during battle, active player '+active,()=>{
 const s=setup(),ally=put(s,0,FIRE,{tapped:active===1}),enemy=put(s,1,'dm21-053',{tapped:active===0});
 cast(s,AREA);
 s.active=active;
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.matchupPower(ally,enemy,active===0,s),11999);
 assert.equal(e.matchupPower(enemy,ally,active===1,s),e.card(enemy).power);
 attack(s,active===0?ally.uid:enemy.uid,active===0?enemy.uid:ally.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(ally));
 assert.ok(s.players[1].grave.some(x=>x.uid===enemy.uid));
 assert.equal(e.power(ally,false,s),2000);
});

test('Area replaces an earlier D2 field and stops applying when another D2 field enters',()=>{
 const s=setup(),ally=put(s,0,FIRE),enemy=put(s,1,WATER);
 const first=put(s,1,'dmr21-047');
 cast(s,AREA);
 const area=s.players[0].battle.find(x=>x.cardId===AREA);
 assert.ok(s.players[1].grave.some(x=>x.uid===first.uid));
 assert.equal(e.matchupPower(ally,enemy,false,s),11999);
 s.active=1;
 cast(s,'dmr21-047');
 assert.ok(s.players[0].grave.some(x=>x.uid===area.uid));
 assert.equal(e.matchupPower(ally,enemy,false,s),2000);
});

for(const take of [true,false])test('Baker searches all cards and shuffles after choice '+take,()=>{
 let s=setup();
 const baker=put(s,0,BAKER);
 give(s,0,'deck',[NATURE,HUNTER,GATE,LIGHT,BAKER,WATER]);
 const [a,hunter,b,c,other,d]=s.players[0].deck;
 destroyBaker(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===baker.uid));
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(choiceValue),[hunter.uid,other.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[NATURE,HUNTER,GATE,LIGHT,BAKER,WATER]);
 const before=s.rng;
 s=JSON.parse(JSON.stringify(s));
 pick(s,take?hunter.uid:null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),take?[hunter.uid]:[]);
 const remaining=take?[a,b,c,other,d]:[a,hunter,b,c,other,d];
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),remaining.map(x=>x.uid).sort());
 assert.notEqual(s.rng,before);
 assert.equal(s.players[0].g34Protected.length,0);
 assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===HUNTER),take);
});

test('Baker can inspect a deck with no Hunter and still shuffles',()=>{
 const s=setup();
 put(s,0,BAKER);
 give(s,0,'deck',[FIRE,WATER,LIGHT]);
 destroyBaker(s);
 assert.deepEqual(s.decision.choices.map(choiceValue),[null]);
 assert.equal(s.decision.task.g585Peek.length,3);
 const before=s.rng;
 pick(s,null);
 assert.notEqual(s.rng,before);
 assert.equal(s.players[0].hand.length,0);
});

test('Baker CPU declines taking the last card of its deck',()=>{
 const s=setup();
 put(s,0,BAKER);
 give(s,0,'deck',[HUNTER]);
 destroyBaker(s);
 assert.equal(choiceValue(s.decision.choices[e.chooseAI(s).choice]),null);
 pick(s,null);
 assert.equal(s.players[0].deck.length,1);
 assert.equal(s.winner,null);
});

test('Baker respects a deck lock and ignores a return to hand',()=>{
 const locked=setup(),bounced=setup();
 put(locked,0,BAKER);
 put(locked,1,QQ);
 give(locked,0,'deck',[FIRE,HUNTER,WATER]);
 const before=locked.players[0].deck.map(x=>x.uid);
 destroyBaker(locked);
 assert.equal(locked.decision,null);
 assert.deepEqual(locked.players[0].deck.map(x=>x.uid),before);
 assert.equal(locked.players[0].hand.length,0);
 const baker=put(bounced,0,BAKER);
 bounced.active=1;
 cast(bounced,GATE);
 act(bounced,'effect');
 assert.equal(bounced.decision,null);
 assert.deepEqual(bounced.players[0].hand.map(x=>x.uid),[baker.uid]);
});

for(const [light,take] of [[4,false],[5,false],[5,true]])test('Rescue at '+light+' light mana, draw '+take,()=>{
 const s=setup();
 give(s,0,'mana',[...Array(light-1).fill(LIGHT),LIGHT_MULTI,NATURE,NATURE,NATURE,NATURE]);
 s.players[0].mana[light-1].tapped=true;
 give(s,0,'deck',[WATER,FIRE]);
 const top=s.players[0].deck[0];
 cast(s,RESCUE);
 assert.equal(s.decision,null);
 cast(s,THREE);
 if(light===5)pick(s,take?1:0);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),take?[top.uid]:[]);
});

test('Rescue ignores opponent summons and triggers for a shield-trigger creature during their turn',()=>{
 const s=setup();
 put(s,0,RESCUE);
 give(s,0,'deck',[WATER,FIRE]);
 give(s,0,'shields',['dmrp04m-051']);
 s.active=1;
 cast(s,THREE);
 assert.equal(s.decision,null);
 const attacker=put(s,1,FIRE);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 pick(s,1);
 drain(s);
 assert.equal(s.players[0].hand[0].cardId,WATER);
 assert.ok(s.players[0].battle.some(x=>x.cardId==='dmrp04m-051'));
});

for(const rampFirst of [true,false])test('Rescue checks mana armament at resolution, ramp first '+rampFirst,()=>{
 const s=setup(),ramp='dmrp01-055';
 put(s,0,RESCUE);
 give(s,0,'mana',[LIGHT,LIGHT,LIGHT,LIGHT,NATURE,NATURE]);
 give(s,0,'deck',[LIGHT,WATER,FIRE]);
 cast(s,ramp);
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===(rampFirst?ramp:RESCUE)));
 if(rampFirst)pick(s,1);
 drain(s);
 assert.equal(s.players[0].mana.length,7);
 assert.deepEqual(s.players[0].hand.map(x=>x.cardId),rampFirst?[WATER]:[]);
});
