import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-744.json',import.meta.url)));

test('Phase 744 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:744}));
  assert.throws(()=>standardCardSpec(detail,{phase:743}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:744}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:744}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const DANGER='dmex11-019',ENERGY='dmrp14-031',ROCK='dmrp13-s04',VARI='dmrp14-s07';
const LOW='dm01-083',MED='dm01-108',BLOCK='dm01-079',SEED='dm25ex1-054';
const QQ='dmrp07-m01',EX='dmrp19-036',CLOCK='dmr09-021',SPELL='dm01-027';
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
function play(s,id){
 const x=inst(id);
 s.phase='main';
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return s.players[s.active].battle.find(y=>y.uid===x.uid);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
const shieldHas=(s,p,uid)=>s.players[p].shields.some(y=>y.uid===uid);

test('DANGER watches another friendly attack, requires a discard, and draws even when the hand is empty',()=>{
 for(const filled of [false,true]){
  const s=field(),own=s.players[0];
  put(s,0,DANGER);
  const ally=put(s,0,MED),top=own.deck[0];
  if(filled)give(s,0,'hand',[LOW,SPELL]);
  const chosen=own.hand[0];
  attack(s,ally.uid);
  if(filled){
   assert.equal(s.decision.task.op,'discard');
   assert.ok(s.decision.choices.every(x=>x.value!==null));
   pick(s,v=>v===chosen.uid);
   assert.ok(own.grave.some(y=>y.uid===chosen.uid));
  }
  assert.equal(own.hand.at(-1).uid,top.uid);
  drain(s);
  const enemy=put(s,1,MED);
  end(s);drain(s);
  const before=own.hand.map(y=>y.uid),deckCount=own.deck.length;
  attack(s,enemy.uid);drain(s);
  assert.equal(own.deck.length,deckCount);
  assert.deepEqual(own.hand.slice(0,before.length).map(y=>y.uid),before);
 }
});

test('DANGER can resolve its own discard-and-draw before or after Magibomber',()=>{
 for(const bomberFirst of [true,false]){
  const s=field(),own=s.players[0],danger=put(s,0,DANGER);
  give(s,0,'deck',[LOW,MED,MED,MED]);
  const top=own.deck[0];
  attack(s,danger.uid);
  assert.equal(s.decision.type,'effectOrder');
  const first=s.pendingEffects.find(x=>x.source===DANGER&&x.task.defs[0].op===(bomberFirst?'Magibomber321':'Discard'));
  act(s,'orderEffect',a=>a.effectId===first.effectId);
  assert.equal(s.decision.task.op,'g34_Magibomber321');
  if(bomberFirst)pick(s,v=>v?.uid===top.uid);
  else {
   assert.equal(own.hand[0].uid,top.uid);
   assert.ok(s.decision.choices.some(o=>o.value?.origin==='hand'&&o.value.uid===top.uid));
   pick(s,v=>v?.uid===top.uid);
  }
  drain(s);
  assert.ok(own.battle.some(y=>y.uid===top.uid));
  assert.equal(own.hand.length,Number(bomberFirst));
 }
});

test('Energy uses Magibomber 4 for the second entry and saves either shield orientation',()=>{
 for(const faceUp of [true,false]){
  let s=field();
  const energy=play(s,ENERGY);
  energy.entered=0;
  give(s,0,'deck',[LOW,MED,MED]);
  give(s,0,'hand',[SEED,VARI]);
  const [top,next]=s.players[0].deck;
  attack(s,energy.uid);
  assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[top.uid]);
  pick(s,v=>v?.uid===top.uid);
  drain(s);
  assert.equal(s.players[0].enteredThisTurn,2);
  end(s);
  assert.equal(s.decision.task.op,'g34_LookShield744');
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(next.uid));
  s=restore(s);
  pick(s,v=>v===faceUp);
  drain(s);
  const shield=s.players[0].shields.at(-1);
  assert.equal(s.players[0].shields.length,6);
  assert.equal(shield.uid,next.uid);
  assert.equal(!!shield.faceUp,faceUp);
  assert.equal(e.observation(s,1).players[0].publicShields.some(x=>x.uid===next.uid),faceUp);
  assert.deepEqual(s.players[0].g34Protected,[]);
 }
});

test('Energy does not add a shield with only one creature entry or when the top cannot be seen',()=>{
 for(const locked of [false,true]){
  const s=field(),energy=play(s,ENERGY);
  const seed=play(s,SEED);
  assert.ok(energy&&seed);
  if(locked){play(s,MED);put(s,1,QQ);}
  assert.equal(s.players[0].enteredThisTurn,locked?2:1);
  const top=s.players[0].deck[0];
  end(s);drain(s);
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.ok(!s.log.some(x=>x.type==='look'&&x.cardId===ENERGY));
 }
});

test('Energy fires the existing shield-entry trigger when it places a face-up shield',()=>{
 const s=field(),target=put(s,1,MED);
 put(s,0,'dm26rp1-S002');
 play(s,ENERGY);play(s,LOW);
 end(s);pick(s,v=>v===true);
 assert.equal(s.decision.effect,'shieldEntryTapLock');
 act(s,'effect',a=>a.targets[0].uid===target.uid);
 assert.ok(target.tapped);
 assert.ok(s.players[0].shields.at(-1).faceUp);
 drain(s);
});

test('Rock untaps when it wins a blocked attack without a break, but stops after either side lost a shield to a break',()=>{
 for(const previous of [null,0,1]){
  const s=field(),rock=play(s,ROCK),blocker=put(s,1,BLOCK);
  if(previous!==null){
   s.extTasks=[{op:'g34_Sequence',p:1-previous,source:ROCK,defs:[{op:'Break497',n:1}]}];
   act(s,'toAttack');drain(s);
   assert.equal(s.players[previous].brokenThisTurn,1);
  }
  attack(s,rock.uid);skip(s);
  act(s,'block',a=>a.uid===blocker.uid);drain(s);
  assert.equal(rock.tapped,previous!==null);
  assert.ok(s.players[1].grave.some(x=>x.uid===blocker.uid));
  if(previous===null){
   attack(s,rock.uid);skip(s);drain(s);
   assert.equal(s.players[1].brokenThisTurn,2);
   assert.equal(rock.tapped,true);
  }
 }
});

test('Vari pays five without an allied creature and eight with one, and attacks immediately',()=>{
 for(const board of [null,SEED,MED]){
  const s=field();
  if(board)put(s,0,board);
  put(s,1,MED);
  const vari=play(s,VARI);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,board===MED?8:5);
  attack(s,vari.uid);
  assert.equal(s.decision.task.op,'g34_Magibomber321');
 }
});

test('Vari may add a blind shield after the attack and does not consume the viewed top for EX Life',()=>{
 for(const accept of [true,false]){
  let s=field(),own=s.players[0],vari=play(s,VARI);
  give(s,0,'deck',[SPELL,MED,MED,MED]);
  give(s,0,'hand',[EX,VARI]);
  const [top,second]=own.deck,ex=own.hand[0];
  attack(s,vari.uid);
  assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[ex.uid]);
  pick(s,v=>v?.uid===ex.uid);
  assert.ok(shieldHas(s,0,second.uid));
  assert.equal(own.deck[0].uid,top.uid);
  act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields');
  assert.equal(s.decision.task.op,'g34_Offer');
  assert.ok(!s.decision.choices.some(o=>o.cardId===top.cardId));
  s=restore(s);
  pick(s,v=>v===(accept?true:null));
  drain(s);
  assert.equal(shieldHas(s,0,top.uid),accept);
  assert.equal(s.players[1].shields.length,3);
  if(accept)assert.ok(!s.players[0].shields.find(y=>y.uid===top.uid).faceUp);
 }
});

test('Vari does not add a shield after it loses a battle',()=>{
 const s=field(),vari=put(s,0,VARI),enemy=put(s,1,'dm05-s04',{tapped:true});
 attack(s,vari.uid,enemy.uid);
 skip(s);drain(s);
 assert.ok(s.players[0].grave.some(y=>y.uid===vari.uid));
 assert.equal(s.players[0].shields.length,5);
});


test('Vari does not reach attack end after The Clock skips the turn',()=>{
 const s=field(),vari=put(s,0,VARI);
 give(s,1,'shields',[CLOCK,LOW]);
 attack(s,vari.uid);skip(s);
 act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.equal(s.active,1);
 assert.equal(s.players[0].shields.length,5);
});
