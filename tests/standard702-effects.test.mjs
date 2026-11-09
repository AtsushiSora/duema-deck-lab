import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-702.json',import.meta.url)));

test('Phase 702 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:702}));
  assert.throws(()=>standardCardSpec(detail,{phase:701}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:702}));
 }
});

const KIRSTEIN='dm12-001',KIRSTEIN_TWIN='dm22ex1-063',LAMEER='dm22ex1-074',PEGASUS='dm12-s05';
const BODY='dm01-108',WAVE='dm11-030',TRIPLE='dm05-s04',SEED='dmsd20-016',BOUNCE='dm01-086';
const HORN='dm01-036',ANGEL='dm01-s01',EVOLUTION='dm12-s03',NEO='dm25rp2-012';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const find=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const value=x=>x.value?.uid??x.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const play=(s,id,face=0)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
};

test('Pegasus reprint and distinct Twinpacts preserve their original card IDs',()=>{
 const [row]=printAliases;
 assert.equal(row.id,'dmc42-009');
 assert.equal(row.canonicalId,PEGASUS);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:702}),cards.find(x=>x.id===PEGASUS).spec);
 assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[PEGASUS]);
 assert.ok(row.verification.facesMatched);
 assert.ok(!data.cards.some(c=>c.id===row.id));
 const deck=structuredClone(PRESETS[0]);
 for(let i=0;i<4;i++)deck.cards.pop();
 deck.cards.push({id:KIRSTEIN,count:4},{id:KIRSTEIN_TWIN,count:4},{id:'dm11-022',count:4},{id:LAMEER,count:4});
 assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);
 assert.deepEqual(e.validateDeck(deck),[]);
});

test('Wave bonuses count both sides, stack for allies, and disappear when the count falls',()=>{
 const s=setup(),kirstein=put(s,0,KIRSTEIN),ally=put(s,0,BODY),seed=put(s,0,SEED),enemy=put(s,1,WAVE);
 assert.equal(e.power(ally,false,s),2000);
 assert.ok(!e.effectiveCard(ally,s).blocker);
 const lameer=put(s,0,LAMEER);
 assert.equal(e.power(ally,false,s),8000);
 assert.equal(e.power(kirstein,false,s),11000);
 assert.equal(e.effectiveCard(ally,s).blocker,true);
 assert.equal(e.effectiveCard(ally,s).breaker,2);
 assert.ok(!e.effectiveCard(seed,s).blocker);
 assert.ok(!e.effectiveCard(enemy,s).blocker);
 const second=put(s,0,KIRSTEIN_TWIN);
 assert.equal(e.power(ally,false,s),13000);
 second.sealed=true;
 assert.equal(e.power(ally,false,s),8000);
 lameer.g35Ignored=s.turn;
 assert.equal(e.power(ally,false,s),2000);
 assert.ok(!e.effectiveCard(ally,s).blocker);
});

test('Kirstein’s granted W-Breaker coexists with T-Breaker and preserves the chosen shields',()=>{
 let s=setup();
 put(s,0,KIRSTEIN_TWIN);
 put(s,0,WAVE);
 put(s,1,WAVE);
 const attacker=put(s,0,TRIPLE);
 const shields=s.players[1].shields.map(x=>x.uid);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(value),[2,3]);
 s=restore(s);
 pick(s,2);
 const chosen=shields.slice(-2);
 act(s,'breakShields',a=>a.shields.join()===chosen.join());
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),chosen);
});

test('Mystic Pillar puts two exact cards into mana tapped before its mandatory mana selection',()=>{
 let s=setup();
 give(s,0,'deck',[BODY,WAVE,BODY]);
 const [first,second]=s.players[0].deck;
 const spell=play(s,KIRSTEIN_TWIN,1);
 assert.ok(find(s,0,'mana',first.uid).tapped);
 assert.ok(find(s,0,'mana',second.uid).tapped);
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,second.uid);
 assert.ok(find(s,0,'grave',second.uid));
 assert.ok(find(s,0,'grave',spell.uid));
 assert.ok(find(s,0,'mana',first.uid).tapped);
});

test('Master Spark uses the spell face as a shield trigger, taps all opposing creatures and draws one',()=>{
 const s=setup(),attacker=put(s,0,BODY),other=put(s,0,WAVE),own=put(s,1,BODY);
 give(s,1,'shields',[LAMEER]);
 const shield=s.players[1].shields[0],drawn=s.players[1].deck[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===1);
 assert.equal(other.tapped,true);
 assert.equal(own.tapped,false);
 assert.ok(find(s,1,'hand',drawn.uid));
 assert.ok(find(s,1,'grave',shield.uid));
});

test('Pegasus evolves on one Horn Beast and one Angel Command and inherits the tapped state',()=>{
 const s=setup(),horn=put(s,0,HORN,{tapped:true}),plain=put(s,0,BODY);
 put(s,1,ANGEL);
 const pegasus=inst(PEGASUS);
 s.players[0].hand.push(pegasus);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===pegasus.uid));
 const angel=put(s,0,ANGEL);
 act(s,'play',a=>a.uid===pegasus.uid);
 assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([horn.uid,angel.uid]));
 pick(s,angel.uid);
 pick(s,horn.uid);
 assert.deepEqual(pegasus.under.map(x=>x.uid),[angel.uid,horn.uid]);
 assert.equal(pegasus.tapped,true);
 assert.equal(e.effectiveCard(pegasus,s).breaker,3);
 assert.ok(find(s,0,'battle',plain.uid));
});

test('Pegasus reveals before blocking and sends each revealed kind to its printed destination',()=>{
 for(const [id,zone] of [[BODY,'battle'],[KIRSTEIN_TWIN,'battle'],[BOUNCE,'hand'],[EVOLUTION,'hand']]){
  const s=setup(),pegasus=put(s,0,PEGASUS);
  give(s,0,'deck',[id,BODY]);
  const top=s.players[0].deck[0];
  attack(s,pegasus.uid);
  assert.equal(s.decision.type,'block');
  assert.ok(find(s,0,zone,top.uid));
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===PEGASUS&&x.text.includes(e.card(id).name)));
 }
});

test('Pegasus leaves a prohibited non-evolution creature atop the deck without adding it to hand',()=>{
 const s=setup(),pegasus=put(s,0,PEGASUS);
 give(s,0,'deck',[BODY,BODY]);
 const [top]=s.players[0].deck;
 s.extLimits=[{kind:'entryCost',player:0,max:2}];
 attack(s,pegasus.uid);
 assert.equal(s.decision.type,'block');
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.ok(!find(s,0,'hand',top.uid));
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Pegasus uses its leave trigger and may place a revealed NEO onto a legal evolution base after restore',()=>{
 let s=setup();
 const base=put(s,0,BODY),pegasus=put(s,0,PEGASUS,{under:[inst(HORN),inst(ANGEL)]});
 give(s,0,'deck',[NEO,BODY]);
 const top=s.players[0].deck[0];
 s.active=1;
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.[0]?.uid===pegasus.uid);
 assert.ok(find(s,0,'hand',pegasus.uid));
 assert.ok(s.decision.choices.map(value).includes(base.uid));
 s=restore(s);
 pick(s,base.uid);
 assert.equal(find(s,0,'battle',top.uid).under[0].uid,base.uid);
 assert.ok(!s.players[0].g34Protected?.length);
});
