import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const LIGER='dmx07-s01', ONIMARU='dmr04-024', AQUA='dmr04-026', GAGA='dmr02-022';
const PSYCHIC='dm36-s07', WEAK='dm01-097', ORDINARY='dm01-048';
function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[{id:PSYCHIC,count:4}]}));
 const s=e.createGame(decks,{seed:1092});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-090','dm01-075','dm01-083',...Array(6).fill(WEAK)]);
  give(s,p,'shields',Array(5).fill(WEAK));
 }
 return s;
}
function put(s,p,id,props={}){
 const x=id===PSYCHIC?s.players[p].extra.shift():inst(id);
 Object.assign(x,props);
 s.players[p].battle.push(x);
 return x;
}
function values(s){return s.decision?.choices.map(c=>c.value?.uid??c.value);}
function choose(s,value){act(s,'extended',a=>values(s)[a.choice]===value);}
function contains(s,p,zone,x){return s.players[p][zone].some(y=>y.uid===x.uid);}

test('Liger Blade clears low-cost ordinary creatures on both sides, then low-cost Psychics on both sides',()=>{
 const s=setup();
 const weak=[put(s,0,WEAK),put(s,1,WEAK)],strong=[put(s,0,ORDINARY),put(s,1,ORDINARY)];
 const front=[put(s,0,PSYCHIC),put(s,1,PSYCHIC)],awakened=put(s,1,PSYCHIC,{g1085Awakened:true});
 cast(s,LIGER);
 drain(s);
 for(const p of [0,1]){
  assert.ok(contains(s,p,'grave',weak[p]));
  assert.ok(contains(s,p,'battle',strong[p]));
  assert.ok(contains(s,p,'extra',front[p]));
 }
 assert.ok(contains(s,1,'battle',awakened));
 assert.equal(e.card(awakened).cost,14);
 const liger=s.players[0].battle.find(x=>x.cardId===LIGER);
 liger.entered=0;
 attack(s,liger.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Onimaru Boy may decline its Psychic targets or destroy multiple targets up to 8000 combined current power',()=>{
 for(const decline of [false,true]){
  const s=setup(),own=put(s,0,PSYCHIC),normal=put(s,1,WEAK);
  const first=put(s,1,PSYCHIC,{powerModifiers:[{amount:-2000}]}),
   second=put(s,1,PSYCHIC,{powerModifiers:[{amount:-2000}]}),third=put(s,1,PSYCHIC);
  cast(s,ONIMARU);
  assert.deepEqual(values(s),[first.uid,second.uid,third.uid,null]);
  if(decline)choose(s,null);
  else{
   choose(s,first.uid);
   assert.deepEqual(values(s),[second.uid,null]);
   choose(s,second.uid);
  }
  drain(s);
  for(const x of [first,second])assert.ok(contains(s,1,decline?'battle':'extra',x));
  assert.ok(contains(s,1,'battle',normal)&&contains(s,1,'battle',third)&&contains(s,0,'battle',own));
 }
});

test('Onimaru Boy can be summoned via S-Trigger and use its entry ability',()=>{
 const s=setup(),attacker=put(s,0,PSYCHIC);
 give(s,1,'shields',[ONIMARU]);
 give(s,1,'mana',[]);
 attack(s,attacker.uid);
 for(let i=0;i<20&&s.decision?.type!=='trigger';i++)e.step(s,e.chooseAI(s));
 act(s,'useTrigger',a=>a.cardId===ONIMARU);
 choose(s,attacker.uid);
 drain(s);
 assert.ok(contains(s,0,'extra',attacker));
 assert.ok(s.players[1].battle.some(x=>x.cardId===ONIMARU));
});

test('Mister Aqua returns a Psychic to its owner rather than destroying it, while Release replaces the move',()=>{
 for(const awakened of [false,true]){
  const s=setup(),psychic=put(s,1,PSYCHIC,{cardOwner:0,g1085Awakened:awakened});
  put(s,1,WEAK);
  cast(s,AQUA);
  assert.deepEqual(values(s),[psychic.uid]);
  choose(s,psychic.uid);
  drain(s);
  if(awakened){
   assert.ok(contains(s,1,'battle',psychic));
   assert.equal(e.card(psychic).cost,7);
  }else{
   assert.ok(contains(s,0,'extra',psychic));
   assert.ok(!contains(s,1,'extra',psychic));
   assert.ok(!s.players.some(p=>p.grave.includes(psychic)));
  }
 }
});

test('Mister Aqua charges tapped, has S-Trigger and blocker, and may attack creatures only',()=>{
 const s=setup(),aqua=inst(AQUA);
 s.phase='charge';
 s.players[0].hand.push(aqua);
 act(s,'charge',a=>a.uid===aqua.uid);
 assert.equal(aqua.tapped,true);
 assert.equal(e.card(AQUA).trigger,true);
 assert.equal(e.card(AQUA).blocker,true);
 const ready=put(s,0,AQUA),target=put(s,1,WEAK,{tapped:true});
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===ready.uid);
 assert.deepEqual(attacks.map(a=>a.target),[target.uid]);
});

test('Gaga Kruton can attack creatures normally but needs its own visible Psychic in play to attack the player',()=>{
 const s=setup(),gaga=put(s,0,GAGA),target=put(s,1,WEAK,{tapped:true});
 put(s,1,PSYCHIC);
 s.phase='attack';
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===gaga.uid).map(a=>a.target);
 assert.equal(e.card(GAGA).blocker,true);
 assert.deepEqual(targets(),[target.uid]);
 const ally=put(s,0,PSYCHIC,{g1085Awakened:true});
 assert.deepEqual(new Set(targets()),new Set(['player',target.uid]));
 ally.sealed=true;
 assert.deepEqual(targets(),[target.uid]);
});

test('the three verified reprints share the existing canonical IDs and copy limits',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const [alias,id] of [['promoy13-034',LIGER],['promoy10-048',ONIMARU],['promoy11-028',ONIMARU]]){
  assert.equal(catalogue.get(alias).id,id);
  assert.deepEqual(catalogue.resolveRows([{id:alias,count:1},{id,count:3}]),[{id,count:4}]);
 }
});
