import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-743.json',import.meta.url)));

test('Phase 743 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:743}));
  assert.throws(()=>standardCardSpec(detail,{phase:742}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:743}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:743}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const HOOD='dmrp13-025',SKY='dmr19-002',VALHA='dmrp02-013';
const LOW='dm01-083',MED='dm01-108',BLOCK='dm01-079',LIGHT='dm01-043';
const ONI='dmrp01-041',EX='dmrp19-036',SPELL='dm01-027';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const pickCard=(s,x)=>pick(s,v=>v?.uid===x.uid);
const choices=s=>s.decision.choices.flatMap(o=>o.value?.uid?[o.value.uid]:[]);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id,base=null){
 const x=inst(id);
 s.phase='main';
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>base?a.baseUid===base.uid:!a.baseUid);
 return s.players[s.active].battle.find(y=>y.uid===x.uid);
}
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('HOOD draws exactly once on the second creature, including its own entry',()=>{
 for(const isSecond of [false,true]){
  const s=field(),own=s.players[0],top=own.deck[0];
  play(s,isSecond?MED:HOOD);
  assert.equal(own.hand.length,0);
  play(s,isSecond?HOOD:MED);
  assert.deepEqual(own.hand.map(y=>y.uid),[top.uid]);
  play(s,MED);
  assert.deepEqual(own.hand.map(y=>y.uid),[top.uid]);
 }
});

test('HOOD offers a private optional Magibomber 5 from either zone, with a cost boundary',()=>{
 for(const origin of ['hand','deck',null]){
  let s=field(),hood=put(s,0,HOOD);
  give(s,0,'hand',[EX,VALHA,SPELL]);
  give(s,0,'deck',[LOW,MED,MED]);
  const {deck,hand}=s.players[0],top=deck[0],eligible=hand[0];
  attack(s,hood.uid);
  assert.equal(s.decision.task.op,'g34_Magibomber321');
  assert.deepEqual(choices(s),[eligible.uid,top.uid]);
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(top.uid));
  assert.ok(!s.log.some(x=>x.type==='reveal'));
  s=restore(s);
  pick(s,v=>origin?v?.origin===origin:v===null);
  drain(s);
  const own=s.players[0],deployed=origin==='hand'?eligible:top;
  assert.equal(own.battle.some(y=>y.uid===deployed.uid),!!origin);
  assert.equal(own.deck.some(y=>y.uid===top.uid),origin!=='deck');
  assert.equal(own.mana.some(y=>y.tapped),false);
  assert.deepEqual(own.g34Protected,[]);
 }
});

test('HOOD can use the hand when the library cannot be looked at',()=>{
 const s=field(),hood=put(s,0,HOOD);
 put(s,1,'dmrp07-m01');
 give(s,0,'hand',[LOW]);
 const [ally]=s.players[0].hand;
 attack(s,hood.uid);
 assert.deepEqual(choices(s),[ally.uid]);
 pickCard(s,ally);
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===ally.uid));
 assert.ok(!s.log.some(x=>x.type==='look'));
});

test('HOOD keeps the looked-at top reserved during EX Life and releases it before the second-creature draw',()=>{
 const s=field(),own=s.players[0],hood=play(s,HOOD);
 hood.entered=0;
 give(s,0,'hand',[EX]);
 give(s,0,'deck',[LOW,MED,MED]);
 const [top,second]=own.deck,ex=own.hand[0];
 attack(s,hood.uid);
 pickCard(s,ex);
 assert.ok(own.shields.some(y=>y.uid===second.uid));
 assert.equal(own.battle.find(y=>y.uid===ex.uid).exLifeShieldUid,second.uid);
 assert.deepEqual(own.hand.map(y=>y.uid),[top.uid]);
 assert.deepEqual(own.g34Protected,[]);
 drain(s);
});

test('Starry Sky taps only the entrant without choosing and counts shield groups',()=>{
 for(const count of [2,3]){
  const s=field(1),other=put(s,1,MED);
  put(s,0,SKY);
  give(s,0,'shields',Array(count).fill(LOW));
  s.players[0].shields[0].shieldStack=[inst(MED)];
  const enemy=play(s,ONI);
  assert.equal(s.decision,null);
  assert.equal(enemy.tapped,count===2);
  assert.equal(other.tapped,false);
  assert.equal(play(s,'dm25ex1-054').tapped,false);
 }
});

test('Starry Sky checks Revolution 2 after the opponent resolves its own entry effect',()=>{
 const s=field(1);
 put(s,0,SKY);
 give(s,0,'shields',[LOW,LOW,LOW,LOW]);
 const enemy=play(s,'dmrp07-006');
 assert.equal(enemy.tapped,false);
 drain(s);
 assert.equal(s.players[0].shields.length,2);
 assert.equal(enemy.tapped,true);
});

test('Starry Sky ignores friendly entries, breaks two shields and untaps at its own end to block',()=>{
 const s=field(),sky=put(s,0,SKY),enemy=put(s,1,MED);
 give(s,0,'shields',[LOW,LOW]);
 assert.equal(play(s,MED).tapped,false);
 attack(s,sky.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.equal(sky.tapped,true);
 end(s);
 assert.equal(sky.tapped,false);
 attack(s,enemy.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===sky.uid));
});

test('Valha takes a light NEO base and only its evolved form freezes two chosen enemies',()=>{
 for(const neo of [false,true]){
  let s=field(),base=put(s,0,LIGHT),first=put(s,1,BLOCK),second=put(s,1,MED,{tapped:true}),oni=put(s,1,ONI);
  const valha=play(s,VALHA,neo?base:null);
  assert.equal(e.isEvolution(valha),neo);
  if(neo)assert.equal(valha.under[0].uid,base.uid);
  else valha.entered=0;
  attack(s,valha.uid);
  assert.deepEqual(choices(s),[first.uid,second.uid]);
  pickCard(s,first);
  s=restore(s);
  pickCard(s,second);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
  drain(s);
  assert.equal(s.players[1].shields.length,3);
  end(s);
  const enemies=s.players[1].battle;
  assert.equal(enemies.find(y=>y.uid===first.uid).tapped,neo);
  assert.equal(enemies.find(y=>y.uid===second.uid).tapped,neo);
  assert.equal(enemies.find(y=>y.uid===oni.uid).tapped,false);
 }
});

test('Valha can choose zero or one creature with other valid choices available',()=>{
 for(const n of [0,1]){
  const s=field(),valha=put(s,0,VALHA,{under:[inst(LIGHT)]}),a=put(s,1,MED),b=put(s,1,LOW);
  attack(s,valha.uid);
  if(n)pickCard(s,a);
  pick(s,v=>v===null);
  assert.equal(a.tapped,n===1);
  assert.equal(b.tapped,false);
  drain(s);
 }
});
