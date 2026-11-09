import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-712.json',import.meta.url)));

test('Phase 712 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:712}));
  assert.throws(()=>standardCardSpec(detail,{phase:711}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:712}));
 }
});

const GALA='dm07-001',SPIN='dm07-005',LIGHT_TOTEM='dm10-010';
const LIGHT='dm01-075',NATURE='dm01-108',FIRE='dm01-097',BLOCK='dm01-076',MULTI='dmr02-054';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const field=()=>{
 const s=setup();
 s.active=0;
 s.phase='attack';
 return s;
};
const restore=s=>JSON.parse(JSON.stringify(s));
const use=(s,x)=>act(s,'tapAbility',a=>a.uid===x.uid);
const pick=(s,x)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===x.uid;
});
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
function leave(s,p,x){
 const own=s.players[p];
 own.hand.push(...own.battle.splice(own.battle.indexOf(x),1));
}

test('Gala untaps eligible Light allies at end of turn even after leaving and saving',()=>{
 let s=field();
 const source=put(s,0,GALA),light=put(s,0,LIGHT,{tapped:true}),nature=put(s,0,NATURE,{tapped:true});
 const enemy=put(s,1,LIGHT,{tapped:true,tapLocks:[0]}),locked=put(s,0,LIGHT,{tapped:true,tapLocks:[0]});
 use(s,source);
 assert.ok(source.tapped&&light.tapped);
 leave(s,0,source);
 const later=put(s,0,LIGHT,{tapped:true,entered:s.turn}),multi=put(s,0,LIGHT_TOTEM,{tapped:true});
 s=restore(s);
 act(s,'endTurn');
 drain(s);
 for(const x of [light,later,multi])assert.equal(find(s,0,'battle',x).tapped,false);
 for(const [p,x] of [[0,nature],[0,locked],[1,enemy]])assert.equal(find(s,p,'battle',x).tapped,true);
 assert.ok(find(s,0,'hand',source));
});

test('Gala retains W Breaker when attacking normally',()=>{
 const s=field(),x=put(s,0,GALA);
 give(s,1,'shields',[NATURE,FIRE]);
 attack(s,x.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,2);
});

test('Spin breaks the chosen shield before the blocked battle, even after its source leaves',()=>{
 let s=field();
 const source=put(s,0,SPIN),blocker=put(s,1,BLOCK);
 use(s,source);
 leave(s,0,source);
 const later=put(s,0,MULTI),shield=s.players[1].shields[2];
 attack(s,later.uid);
 s=restore(s);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.ok(find(s,1,'battle',blocker));
 s=restore(s);
 pick(s,shield);
 drain(s);
 assert.ok(find(s,1,'hand',shield));
 assert.ok(find(s,1,'grave',blocker));
 assert.ok(find(s,0,'battle',later));
 assert.equal(s.players[1].shields.length,4);
});

test('Spin effects from two sources resolve independently',()=>{
 const s=field(),a=put(s,0,SPIN),b=put(s,0,SPIN);
 const attacker=put(s,0,NATURE),blocker=put(s,1,BLOCK);
 use(s,a);
 use(s,b);
 attack(s,attacker.uid);
 act(s,'block',x=>x.uid===blocker.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 const shieldA=s.players[1].shields[1],shieldB=s.players[1].shields[3];
 pick(s,shieldA);
 pick(s,shieldB);
 drain(s);
 assert.ok(find(s,1,'hand',shieldA)&&find(s,1,'hand',shieldB));
 assert.equal(s.players[1].shields.length,3);
});

test('Spin ignores attacks on creatures, other civilizations, empty shields and later turns',()=>{
 for(const mode of ['creature','fire','empty','expired']){
  const s=field(),source=put(s,0,SPIN),attacker=put(s,0,mode==='fire'?FIRE:NATURE);
  const blocker=put(s,1,BLOCK),target=put(s,1,FIRE,{tapped:true});
  use(s,source);
  if(mode==='expired'){
   for(let i=0;i<2;i++){s.phase='attack';act(s,'endTurn');drain(s);}
  }
  if(mode==='empty')give(s,1,'shields',[]);
  const shields=s.players[1].shields.length;
  attack(s,attacker.uid,mode==='creature'?target.uid:'player');
  act(s,'block',a=>a.uid===blocker.uid);
  assert.notEqual(s.decision?.task?.op,'g34_Break497');
  drain(s);
  assert.equal(s.players[1].shields.length,shields);
  assert.equal(s.winner,null);
 }
});

test('Light Totem taps an opposing creature and grants attack-only power to other allies',()=>{
 const s=field(),source=put(s,0,LIGHT_TOTEM),ally=put(s,0,NATURE),enemy=put(s,1,FIRE);
 const bonus=x=>e.power(x,true,s)-e.power(x,false,s);
 assert.equal(bonus(ally),0);
 use(s,source);
 assert.ok(source.tapped);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[enemy.uid]);
 assert.equal(bonus(ally),1500);
 pick(s,enemy);
 assert.ok(enemy.tapped);
 assert.equal(bonus(source),0);
 assert.equal(bonus(enemy),0);
 assert.equal(bonus(put(s,0,LIGHT)),1500);
 const second=put(s,0,LIGHT_TOTEM,{tapped:true});
 assert.equal(bonus(ally),3000);
 source.tapped=false;
 assert.equal(bonus(ally),1500);
 second.g35Ignored=s.turn;
 assert.equal(bonus(ally),0);
 delete second.g35Ignored;
 leave(s,0,second);
 assert.equal(bonus(ally),0);
});

test('Light Totem enters mana tapped as a multicolored card',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[LIGHT_TOTEM]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(find(s,0,'mana',x).tapped);
 assert.equal(e.manaValue(e.card(x)),1);
});
