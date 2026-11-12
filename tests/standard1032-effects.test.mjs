import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ADO='dmrp07-031',VAL='dmx19-s05',ALEX='dm23ex3-032',WHITE='dmex16-021';
const N='dm01-108',RAGE='dmrp06-065',EYE='dmbd04-008',REDIRECT='dm22ex1-086';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('four official definitions and three alternate prints retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1032.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ADO,VAL,ALEX,WHITE]);
 assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=registry.get(row.id),f=row.faces[0];
  assert.equal(c.id,id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(CARD_IMAGES[id],m.cards.find(r=>r.id===id).image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1032}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

test('Adomani may enter when a Crest is placed, blocks, and attacks only creatures',()=>{
 const s=setup(),hand=add(s,0,'hand',ADO),crest=add(s,0,'hand',RAGE);
 const root=s.players[0].shields[0],enemy=add(s,1,'battle',N,{tapped:true});
 cast(s,crest);
 choose(s,root.uid);
 assert.equal(s.decision.task.uid,hand.uid);
 const mana=s.players[0].mana.filter(x=>x.tapped).length;
 choose(s,true);
 assert.ok(s.players[0].battle.includes(hand));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);
 assert.equal(e.effectiveCard(hand,s).blocker,true);
 end(s);
 const attacker=add(s,1,'battle',N);
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===hand.uid));
 act(s,'noBlock');
 drain(s);
 end(s);
 enemy.tapped=true;
 act(s,'skipCharge');
 act(s,'toAttack');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===hand.uid).map(a=>a.target),[enemy.uid,attacker.uid]);
});

for(const accept of [false,true])test('Paladin has two independent optional abilities, with a one-start freeze '+accept,()=>{
 const s=setup(),paladin=add(s,0,'hand',VAL);
 const enemy=add(s,1,'battle',N,{tapped:true}),unselected=add(s,1,'battle',N,{tapped:true});
 const top=s.players[0].deck[0],before=s.players[0].shields.length;
 cast(s,paladin);
 assert.equal(e.effectiveCard(paladin,s).breaker,2);
 assert.equal(e.effectiveCard(paladin,s).blocker,true);
 choose(s,accept?true:null);
 assert.equal(s.players[0].shields.length,before+Number(accept));
 if(accept){
  assert.equal(s.players[0].shields.at(-1).uid,top.uid);
  assert.ok(!s.players[0].shields.at(-1).faceUp);
  assert.deepEqual(values(s),[enemy.uid,unselected.uid,null]);
  choose(s,enemy.uid);
 }
 end(s);
 assert.equal(enemy.tapped,accept);
 assert.equal(unselected.tapped,false);
 end(s);
 end(s);
 assert.equal(enemy.tapped,false);
});

test('Paladin may pass the freeze even when an existing shield gains a face-up card',()=>{
 const s=setup(),paladin=add(s,0,'battle',VAL),crest=add(s,0,'hand',RAGE);
 const enemy=add(s,1,'battle',N);
 cast(s,crest);
 choose(s,s.players[0].shields[0].uid);
 assert.equal(s.decision.task.uid,paladin.uid);
 assert.deepEqual(values(s),[enemy.uid,null]);
 choose(s,null);
 assert.equal(enemy.tapped,false);
});

test('Alexandrite shields the first card, draws the second and offers a crystal mana at this turn end',()=>{
 let s=setup();
 const alex=add(s,0,'hand',ALEX),mana=s.players[0].mana.at(-1),[first,second]=s.players[0].deck;
 const all=physical(s);
 cast(s,alex);
 assert.equal(s.players[0].shields.at(-1).uid,first.uid);
 assert.ok(s.players[0].hand.includes(second));
 end(s);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 s=restore(s);
 choose(s,mana.uid);
 const crystal=s.players[0].mana.find(x=>x.uid===mana.uid);
 assert.ok(crystal.faceDown);
 assert.equal(e.manaValueAt(s,0,crystal),1);
 assert.deepEqual(e.manaPayment([crystal],{cost:1,civilizations:['自然']}),null);
 assert.deepEqual(physical(s),all);
 end(s);
 assert.equal(s.decision,null);
});

test('Alexandrite may turn mana down after a shield attachment on the opponent turn only for its owner',()=>{
 const s=Object.assign(setup(),{active:1});
 give(s,0,'shields',[EYE,N]);
 const [broken,keep]=s.players[0].shields,enemy=add(s,1,'battle',N);
 const own=add(s,0,'battle',ALEX);
 add(s,1,'battle',ALEX);
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===broken.uid);
 choose(s,enemy.uid);
 choose(s,keep.uid);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,own.uid);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 choose(s,null);
 assert.ok(s.players.every(p=>p.mana.every(x=>!x.faceDown)));
});

test('Alexandrite still draws when the shield is redirected and does not trigger at end',()=>{
 const s=setup(),alex=add(s,0,'hand',ALEX),[first,second]=s.players[0].deck;
 const before=s.players[0].shields.length;
 add(s,1,'battle',REDIRECT);
 cast(s,alex);
 assert.equal(s.players[0].shields.length,before);
 assert.ok(s.players[0].grave.includes(first));
 assert.ok(s.players[0].hand.includes(second));
 end(s);
 assert.equal(s.decision,null);
});

test('White Wisdom creates one shield from two face-down cards, triggers twice and freezes the same target once',()=>{
 let s=setup();
 const white=add(s,0,'hand',WHITE),enemy=add(s,1,'battle',N,{tapped:true});
 const [first,second]=s.players[0].deck,before=s.players[0].shields.length,all=physical(s);
 cast(s,white);
 assert.equal(e.effectiveCard(white,s).blocker,true);
 assert.equal(e.effectiveCard(white,s).breaker,3);
 choose(s,true);
 assert.equal(s.players[0].shields.length,before+1);
 const root=s.players[0].shields.at(-1);
 assert.deepEqual([root.uid,root.shieldStack[0].uid],[first.uid,second.uid]);
 assert.ok(!root.faceUp&&!root.shieldStack[0].faceUp);
 const pending=s.pendingEffects.filter(x=>x.uid===white.uid);
 assert.equal(pending.length,2);
 s=restore(s);
 act(s,'orderEffect',a=>a.effectId===pending[0].effectId);
 assert.deepEqual(values(s),[enemy.uid]);
 choose(s,enemy.uid);
 choose(s,enemy.uid);
 const current=s.players[1].battle.find(x=>x.uid===enemy.uid);
 end(s);
 assert.equal(current.tapped,true);
 end(s);
 end(s);
 assert.equal(current.tapped,false);
 assert.deepEqual(physical(s),all);
});

for(const replaced of [false,true])test('White Wisdom adds no second card when the first placement does not happen '+replaced,()=>{
 const s=setup(),white=add(s,0,'hand',WHITE),enemy=add(s,1,'battle',N);
 const [first,second]=s.players[0].deck,before=s.players[0].shields.length;
 if(replaced)add(s,1,'battle',REDIRECT);
 cast(s,white);
 choose(s,replaced?true:null);
 assert.equal(s.players[0].shields.length,before);
 assert.equal(s.players[0].deck[0],replaced?second:first);
 assert.equal(s.players[0].grave.includes(first),replaced);
 assert.equal(s.decision,null);
 assert.equal(enemy.tapped,false);
});
