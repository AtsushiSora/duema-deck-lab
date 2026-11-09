import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-745.json',import.meta.url)));

test('Phase 745 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:745}));
  assert.throws(()=>standardCardSpec(detail,{phase:744}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:745}));
 }

});

const HEAVY='dmrp03-s07',NEZ='dmsp01-005',SPRAY='dmrp14-020';
const HOOD='dmrp13-025',DANGER='dmex11-019',LOW='dm01-083',MED='dm01-108',BLOCK='dm01-079';
const ONI='dmrp01-041',EX='dmrp19-036',SPELL='dm01-027';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const skip=s=>pick(s,v=>v===null);
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
function play(s,id,discounted=false){
 const x=inst(id);
 s.phase='main';
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(discounted?a.alternative==='bad':!a.alternative));
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('Both BAD cards can choose full or discounted cost and keep the destruction obligation across save',()=>{
 for(const id of [HEAVY,NEZ])for(const discounted of [false,true]){
  let s=field(),body=play(s,id,discounted);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost-(discounted?2:0));
  s.phase='attack';
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid));
  s=restore(s);end(s);
  assert.equal(inZone(s,0,'grave',body),discounted);
  assert.equal(inZone(s,0,'battle',body),!discounted);
 }
});

test('Heavy sweeps weaker creatures on both sides without choosing, uses attack power and spares equal power',()=>{
 const s=field(),heavy=play(s,HEAVY),ally=put(s,0,MED);
 const untargetable=put(s,1,ONI);
 const below=put(s,1,MED,{powerModifiers:[{amount:11000}]});
 const equal=put(s,1,MED,{powerModifiers:[{amount:12000}]});
 heavy.buff=2000;
 attack(s,heavy.uid);
 assert.ok(inZone(s,0,'grave',ally));
 assert.ok(inZone(s,1,'grave',untargetable));
 assert.ok(inZone(s,1,'grave',below));
 assert.ok(inZone(s,1,'battle',equal));
 assert.ok(inZone(s,0,'battle',heavy));
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Heavy uses normal destruction replacement while sweeping',()=>{
 const s=field(),heavy=put(s,0,HEAVY),shield=s.players[1].shields[0];
 const enemy=put(s,1,EX,{exLifeShieldUid:shield.uid});
 attack(s,heavy.uid);
 assert.ok(inZone(s,1,'battle',enemy));
 assert.ok(inZone(s,1,'grave',shield));
 drain(s);
});

test('Heavy retains its attack power when it leaves before its pending sweep resolves',()=>{
 let s=field();
 const heavy=put(s,0,HEAVY,{buff:2000}),watcher=put(s,0,'dmrp18-s10');
 put(s,0,'dmrp18-s10');
 const weaker=put(s,1,MED,{powerModifiers:[{amount:11000}]});
 const equal=put(s,1,MED,{powerModifiers:[{amount:12000}]});
 attack(s,heavy.uid);
 assert.equal(s.decision.type,'effectOrder');
 const move=s.pendingEffects.find(x=>x.uid===watcher.uid),sweep=s.pendingEffects.find(x=>x.uid===heavy.uid);
 move.task.defs=[{op:'ExactMove',owner:0,to:'hand',target:heavy.uid}];
 act(s,'orderEffect',a=>a.effectId===move.effectId);
 assert.ok(inZone(s,0,'hand',heavy));
 assert.equal(sweep.task.g692LastPower,14000);
 s=restore(s);
 act(s,'orderEffect',a=>a.effectId===sweep.effectId);
 assert.ok(inZone(s,1,'grave',weaker));
 assert.ok(inZone(s,1,'battle',equal));
 drain(s);
});

test('Nez mills exactly two and counts only the Beat Jockey creatures moved by the current effect',()=>{
 for(const n of [0,1,2]){
  const s=field(),nez=play(s,NEZ);
  give(s,0,'grave',[HOOD]);
  give(s,0,'deck',[[SPELL,MED],[DANGER,SPELL],[DANGER,HOOD]][n].concat([MED,MED]));
  const top=s.players[0].deck.slice(0,2);
  attack(s,nez.uid);
  assert.deepEqual(s.players[0].grave.slice(-2).map(y=>y.uid),top.map(y=>y.uid));
  drain(s);
  assert.equal(s.players[1].brokenThisTurn,n+1);
  assert.equal(s.players[0].deck.length,2);
  end(s);
  assert.ok(!s.extLimits?.some(x=>x.kind==='g412ExtraBreak'&&x.ref.uid===nez.uid));
 }
});

test('Nez stacks its new extra break with an earlier attack in the same turn',()=>{
 let s=field(),nez=put(s,0,NEZ);
 give(s,1,'shields',Array(7).fill(MED));
 give(s,0,'deck',[DANGER,MED,HOOD,MED,MED,MED]);
 attack(s,nez.uid);drain(s);
 assert.equal(s.players[1].brokenThisTurn,2);
 nez.tapped=false;
 attack(s,nez.uid);
 s=restore(s);drain(s);
 assert.equal(s.players[1].brokenThisTurn,5);
});

test('Spray can use the exact Magibomber 3 entrant from hand or deck to battle an optional legal enemy',()=>{
 for(const origin of ['hand','deck'])for(const accept of [true,false]){
  let s=field(),spray=put(s,0,SPRAY),other=put(s,0,MED);
  const target=put(s,1,LOW),protectedEnemy=put(s,1,ONI);
  give(s,0,'deck',[origin==='deck'?MED:SPELL,MED,MED]);
  give(s,0,'hand',[origin==='hand'?MED:HOOD]);
  const fighter=origin==='hand'?s.players[0].hand[0]:s.players[0].deck[0];
  attack(s,spray.uid);
  assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[fighter.uid]);
  pick(s,v=>v?.origin===origin);
  assert.equal(s.decision.task.op,'g34_FightEnemy240');
  assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[target.uid]);
  assert.equal(s.decision.task.fighter.uid,fighter.uid);
  s=restore(s);
  if(accept)pick(s,v=>v?.uid===target.uid);
  else skip(s);
  assert.equal(inZone(s,1,'grave',target),accept);
  assert.ok(inZone(s,1,'battle',protectedEnemy));
  assert.ok(inZone(s,0,'battle',other));
  drain(s);
 }
});

test('Spray can react to its own successful entry through a different Magibomber',()=>{
 const s=field(),hood=put(s,0,HOOD),enemy=put(s,1,BLOCK);
 give(s,0,'hand',[SPRAY]);
 const fighter=s.players[0].hand[0];
 attack(s,hood.uid);pick(s,v=>v?.uid===fighter.uid);
 assert.equal(s.decision.source,SPRAY);
 assert.equal(s.decision.task.fighter.uid,fighter.uid);
 pick(s,v=>v?.uid===enemy.uid);
 assert.ok(inZone(s,0,'grave',fighter));
 assert.ok(inZone(s,1,'grave',enemy));
 assert.ok(inZone(s,0,'battle',hood));
 drain(s);
});

test('Spray ignores ordinary summons and a declined Magibomber',()=>{
 const s=field(),spray=put(s,0,SPRAY),enemy=put(s,1,LOW);
 play(s,MED);
 assert.equal(s.decision,null);
 attack(s,spray.uid);
 skip(s);
 assert.notEqual(s.decision?.task?.op,'g34_FightEnemy240');
 drain(s);
 assert.ok(inZone(s,1,'battle',enemy));
});
