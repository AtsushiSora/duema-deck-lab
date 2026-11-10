import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const MERMAID='dmrp15-049',DREAM='dmrp16-059',SAINT='dmrp15-012';
const SMALL='dm01-108',WATER='dm01-083',BOUNCE='dm01-086',TWIN='dm23ex1-005';
const BELL='dmr01-016',TAKE='dmrp21-040';
function field(p=0){
 const s=setup();
 s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function breakOwn(s,p,attacker){
 const enemy=attacker||add(s,1-p,'battle',SMALL);
 s.active=1-p;
 attack(s,enemy.uid);
 act(s,'noBlock');
 return enemy;
}

test('Phase 887 has complete official abilities, images, unique names and a supported forty',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-887.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MERMAID,DREAM,SAINT]);
 assert.deepEqual(m.printAliases,[]);
 const forty={id:'phase887',name:'月光王国',cards:[MERMAID,DREAM,SAINT,SMALL,WATER,BOUNCE,'dm01-027','dm01-090','dm01-097','dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);
 assert.equal(registry.coverage(forty).unsupported,0);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:887}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:886}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:887}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

for(const p of [0,1])test('Mermaid mills the actual top card on summon and returns creatures for each stacked shield card '+p,()=>{
 let s=field(p);
 const top=s.players[p].deck[0],mermaid=play(s,MERMAID);
 assert.ok(has(s,p,'grave',top));
 assert.equal(s.players[p].deck.length,19);
 const spell=add(s,p,'grave',BOUNCE),twin=add(s,p,'grave',TWIN);
 assert.equal(e.card(TWIN).type,'creature');
 give(s,p,'shields',[SMALL]);
 s.players[p].shields[0].shieldStack=[inst(WATER)];
 const enemy=add(s,1-p,'grave',WATER);
 breakOwn(s,p);
 act(s,'orderEffect',a=>a.cardId===MERMAID);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(values(s),[top.uid,twin.uid]);
 assert.equal(s.decision.player,p);
 pick(s,twin);
 assert.deepEqual(values(s),[top.uid]);
 pick(s,top);
 assert.ok(has(s,p,'hand',top)&&has(s,p,'hand',twin));
 assert.ok(has(s,p,'grave',spell)&&has(s,1-p,'grave',enemy)&&has(s,p,'battle',mermaid));
 assert.equal(s.decision,null);
});

test('Mermaid mandatory recovery resolves without creatures and milling its last card loses normally',()=>{
 const empty=field();
 add(empty,0,'battle',MERMAID);
 add(empty,0,'grave',BOUNCE);
 give(empty,0,'shields',[SMALL]);
 breakOwn(empty,0);
 assert.equal(empty.decision,null);
 assert.equal(empty.players[0].grave.length,1);

 const s=field();
 give(s,0,'deck',[WATER]);
 const last=s.players[0].deck[0];
 play(s,MERMAID);
 assert.ok(has(s,0,'grave',last));
 assert.equal(s.winner,1);
});

for(const id of [MERMAID,DREAM])test(e.card(id).name+' blocks and attacks tapped creatures but cannot attack the opponent',()=>{
 const s=field(),host=add(s,0,'battle',id),enemy=add(s,1,'battle',SMALL,{tapped:true});
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===host.uid&&a.target==='player'));
 attack(s,host.uid,enemy.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',host));

 const t=field(1),blocker=add(t,0,'battle',id),attacker=add(t,1,'battle',SMALL);
 if(id===MERMAID)add(t,0,'grave',WATER);
 attack(t,attacker.uid);
 act(t,'block',a=>a.uid===blocker.uid);
 drain(t);
 assert.ok(blocker.tapped&&has(t,1,'grave',attacker));
});

for(const p of [0,1])for(const id of [DREAM,SAINT])test(e.card(id).name+' untaps only itself on its controller shield loss '+p,()=>{
 const s=field(p),host=add(s,p,'battle',id,{tapped:true}),other=add(s,p,'battle',WATER,{tapped:true});
 give(s,p,'shields',[SMALL]);
 breakOwn(s,p);
 assert.equal(host.tapped,false);
 assert.equal(other.tapped,true);
 assert.equal(s.decision,null);
});

test('Dream can block again after an intervening shield loss, while an already untapped Moon does not retap it',()=>{
 const s=field(1),host=add(s,0,'battle',DREAM);
 const first=add(s,1,'battle',SMALL),second=add(s,1,'battle',SMALL),third=add(s,1,'battle',SMALL);
 give(s,0,'shields',[SMALL,SMALL]);
 attack(s,first.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(host.tapped);
 attack(s,second.uid);
 act(s,'noBlock');
 assert.equal(host.tapped,false);
 attack(s,third.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===host.uid));
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(host.tapped&&has(s,1,'grave',third));

 const t=field(),dream=add(t,0,'battle',DREAM);
 give(t,0,'shields',[SMALL]);
 breakOwn(t,0);
 assert.equal(dream.tapped,false);
});

for(const p of [0,1])test('Saint enters tapped, stays tapped at ordinary own starts, then untaps from a start-step Moon (QA 34209) '+p,()=>{
 const s=field(p),saint=play(s,SAINT);
 assert.ok(saint.tapped);
 assert.equal(e.power(saint,false,s),8500);
 end(s);
 end(s);
 assert.equal(s.active,p);
 assert.ok(saint.tapped);
 s.phase='main';
 play(s,BELL);
 drain(s);
 end(s);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,p);
 assert.ok(saint.tapped);
 assert.equal(s.decision.task.op,'g55_ShieldHand');
 const [a,b]=s.players[p].shields;
 pick(s,a);
 pick(s,b);
 drain(s);
 assert.equal(saint.tapped,false);
 s.phase='attack';
 attack(s,saint.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1-p].shields.length,3);
});

test('Saint start-only restriction permits ordinary spell untaps and does not grant blocker',()=>{
 const s=field(),saint=play(s,SAINT);
 cast(s,'dmr19-029');
 pick(s,1);
 drain(s);
 assert.equal(saint.tapped,false);
 s.active=1;
 const enemy=add(s,1,'battle',SMALL);
 attack(s,enemy.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===saint.uid));
 act(s,'noBlock');
 drain(s);
});

for(const id of [DREAM,SAINT])test(e.card(id).name+' ignores an opposing shield',()=>{
 const s=field(),host=add(s,0,'battle',id,{tapped:true});
 const attacker=add(s,0,'battle',SMALL);
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(host.tapped);
});

for(const id of [MERMAID,DREAM,SAINT])test(e.card(id).name+' has no Moon while sealed or ignored, and the printed tapped entry is suppressed',()=>{
 for(const mode of ['sealed','ignored']){
  const s=field(),host=add(s,0,'battle',id,{tapped:true}),grave=add(s,0,'grave',WATER);
  if(mode==='sealed'){
   host.sealed=true;
   add(s,0,'seals',SMALL,{sealOf:host.uid,faceDown:true});
  }else add(s,1,'battle',GEN);
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  assert.ok(host.tapped&&has(s,0,'grave',grave));
  assert.equal(s.decision,null);
 }
 const t=field();
 add(t,1,'battle',GEN);
 const before=t.players[0].deck.length,host=play(t,id);
 assert.equal(host.tapped,false);
 assert.equal(t.players[0].deck.length,before);
});

test('Pending self-untap cannot affect the same physical card after it leaves and reenters',()=>{
 for(const id of [DREAM,SAINT]){
  const s=field(),first=add(s,0,'battle',id,{tapped:true}),second=add(s,0,'battle',id,{tapped:true});
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  assert.equal(s.decision.type,'effectOrder');
  // Resume a trigger captured before the source left and returned as a new incarnation.
  s.players[0].battle.splice(s.players[0].battle.indexOf(first),1);
  first.incarnation=(first.incarnation||0)+1;
  s.players[0].battle.push(first);
  drain(s);
  assert.ok(first.tapped);
  assert.equal(second.tapped,false);
 }
});

for(const id of [MERMAID,DREAM,SAINT])test(e.card(id).name+' charges with its actual mana value and color orientation',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x));
 assert.equal(x.tapped,id===MERMAID);
 assert.equal(e.card(x).manaValue,1);
});
