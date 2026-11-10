import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const DRAW='dmrp16-086',MILL='dmrp16-049',FORCE='dmrp16-048';
const SMALL='dm01-108',WATER='dm01-083',DESTROY='dm01-027',BOUNCE='dm01-086';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const endable=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function breakOwn(s,p){
 const attacker=add(s,1-p,'battle',SMALL);
 s.active=1-p;
 s.phase='attack';
 attack(s,attacker.uid);
 act(s,'noBlock');
 return attacker;
}
function destroy(s,x){
 cast(s,DESTROY);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}
function force(s,p=0){
 const host=add(s,p,'battle',FORCE),target=add(s,1-p,'battle',SMALL);
 give(s,p,'shields',[SMALL]);
 breakOwn(s,p);
 pick(s,target);
 return {host,target};
}

test('Phase 886 verifies full official abilities, art, limits and canonical identities',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-886.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DRAW,MILL,FORCE]);
 assert.deepEqual(m.printAliases,[]);
 const forty={id:'phase886',name:'月光王国',cards:[DRAW,MILL,FORCE,SMALL,WATER,DESTROY,BOUNCE,'dm01-090','dm01-097','dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);
 assert.equal(registry.coverage(forty).unsupported,0);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:886}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:885}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:886}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

for(const p of [0,1])test('Torihiki draws optionally for each physical shield card through JSON continuation '+p,()=>{
 let s=field();
 add(s,p,'battle',DRAW);
 give(s,p,'shields',[SMALL]);
 s.players[p].shields[0].shieldStack=[inst(WATER)];
 const before=s.players[p].hand.length;
 breakOwn(s,p);
 act(s,'orderEffect',a=>a.cardId===DRAW);
 s=JSON.parse(JSON.stringify(s));
 assert.equal(s.decision.player,p);
 pick(s,0);
 assert.equal(s.decision.player,p);
 pick(s,1);
 assert.equal(s.players[p].hand.length,before+3);
 assert.equal(s.players[p].deck.length,15);
 assert.equal(s.decision,null);
});

for(const p of [0,1])test('Hibana chooses an all-or-none mill of the real top three cards '+p,()=>{
 const s=field();
 add(s,p,'battle',MILL);
 give(s,p,'shields',[SMALL]);
 s.players[p].shields[0].shieldStack=[inst(WATER)];
 const top=s.players[p].deck.slice(0,3).map(x=>x.uid);
 breakOwn(s,p);
 act(s,'orderEffect',a=>a.cardId===MILL);
 pick(s,true);
 assert.deepEqual(s.players[p].grave.map(x=>x.uid),top);
 pick(s,null);
 assert.equal(s.players[p].deck.length,13);
 assert.equal(s.players[p].grave.length,3);
});

test('Hibana declining a mill avoids deck-out and accepting mills the available cards then loses',()=>{
 for(const accept of [false,true]){
  const s=field();
  add(s,0,'battle',MILL);
  give(s,0,'deck',[WATER,SMALL]);
  const top=s.players[0].deck.map(x=>x.uid);
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  pick(s,accept?true:null);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),accept?top:[]);
  assert.equal(s.players[0].deck.length,accept?0:2);
  assert.equal(s.winner,accept?1:null);
 }
});

test('Hibana death must shield a different grave card face up and conserves every physical identity',()=>{
 const s=field(),hibana=add(s,1,'battle',MILL),other=add(s,1,'grave',WATER);
 const ids=e.physicalCards(s).map(x=>x.uid).sort();
 destroy(s,hibana);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[other.uid]);
 pick(s,other);
 assert.ok(has(s,1,'grave',hibana)&&!has(s,1,'shields',hibana));
 const shield=s.players[1].shields.find(x=>x.uid===other.uid);
 assert.ok(shield&&shield.faceUp);
 assert.equal(s.players[1].shields.length,6);
 // Casting consumes its own newly-created physical spell, so remove it from this comparison.
 const spell=s.players[0].grave.find(x=>x.cardId===DESTROY);
 assert.deepEqual(e.physicalCards(s).filter(x=>x.uid!==spell.uid).map(x=>x.uid).sort(),ids);
});

test('Hibana cannot shield itself when the grave contains no other card, and bounce never triggers death',()=>{
 for(const mode of ['empty','bounce']){
  const s=field(),hibana=add(s,1,'battle',MILL);
  if(mode==='empty')destroy(s,hibana);
  else{
   add(s,1,'grave',WATER);
   cast(s,BOUNCE);
   act(s,'effect',a=>a.targets.some(t=>t.uid===hibana.uid));
  }
  assert.equal(s.players[1].shields.length,5);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,mode==='empty'?'grave':'hand',hibana));
 }
});

test('Torihiki blocks and breaks two shields, while Tegami can block with ordinary power',()=>{
 for(const id of [DRAW,FORCE]){
  const s=field(),blocker=add(s,0,'battle',id),attacker=add(s,1,'battle',SMALL);
  s.active=1;
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===blocker.uid);
  drain(s);
  assert.ok(blocker.tapped&&has(s,1,'grave',attacker));
 }
 const s=field(),torihiki=add(s,0,'battle',DRAW);
 attack(s,torihiki.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const p of [0,1])test('Tegami forces only its chosen opponent now, survives its source and expires at own start '+p,()=>{
 let s=field();
 const {host,target}=force(s,p),other=add(s,1-p,'battle',WATER);
 give(s,p,'shields',[SMALL,SMALL]);
 s=JSON.parse(JSON.stringify(s));
 const forced=s.players[1-p].battle.find(x=>x.uid===target.uid);
 assert.ok(e.effectiveCard(forced,s).mustAttack);
 assert.ok(!e.effectiveCard(other,s).mustAttack);
 assert.ok(!endable(s));
 // Returning the source does not erase the resolved continuous effect.
 s.phase='main';
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===host.uid));
 assert.ok(e.effectiveCard(forced,s).mustAttack);
 attack(s,forced.uid);
 drain(s);
 assert.ok(endable(s));
 end(s);
 assert.equal(s.active,p);
 assert.ok(!e.effectiveCard(forced,s).mustAttack);
});

test('Tegami respects summoning sickness and attack prohibitions',()=>{
 const s=field(),host=add(s,0,'battle',FORCE),target=add(s,1,'battle',SMALL);
 target.entered=s.turn;
 give(s,0,'shields',[SMALL]);
 breakOwn(s,0);
 pick(s,target);
 assert.ok(e.effectiveCard(target,s).mustAttack);
 assert.ok(endable(s));
 target.entered=0;
 target.g35NoAttack=[{turn:s.turn}];
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));
 assert.ok(endable(s));
 assert.ok(has(s,0,'battle',host));
});

test('Tegami chosen during its own turn forces an attack next turn and never affects a returned incarnation',()=>{
 const s=field(),letter=add(s,0,'battle',FORCE),enemy=add(s,1,'battle',SMALL);
 give(s,0,'shields',[SMALL]);
 cast(s,'dmrp21-040');
 pick(s,s.players[0].shields[0]);
 pick(s,enemy);
 drain(s);
 end(s);
 assert.equal(s.active,1);
 assert.ok(e.effectiveCard(enemy,s).mustAttack);
 assert.ok(!endable(s));
 s.phase='main';
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 act(s,'play',a=>a.uid===enemy.uid);
 drain(s);
 const returned=s.players[1].battle.find(x=>x.uid===enemy.uid);
 assert.ok(returned&&!e.effectiveCard(returned,s).mustAttack);
 assert.ok(has(s,0,'battle',letter));
});

test('Moon does not watch the opponent shield or a sealed or ignored host',()=>{
 for(const mode of ['opponent','sealed','ignored']){
  const s=field(),host=add(s,0,'battle',DRAW);
  if(mode==='sealed'){
   host.sealed=true;
   add(s,0,'seals',SMALL,{sealOf:host.uid,faceDown:true});
  }
  if(mode==='ignored')add(s,1,'battle',GEN);
  const before=s.players[0].deck.length;
  if(mode==='opponent'){
   const attacker=add(s,0,'battle',SMALL);
   attack(s,attacker.uid);
   act(s,'noBlock');
   drain(s);
  }else{
   give(s,0,'shields',[SMALL]);
   breakOwn(s,0);
  }
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck.length,before);
 }
});

for(const id of [DRAW,MILL,FORCE])test(e.card(id).name+' charges as one multicolor tapped mana',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
 assert.equal(e.card(x).manaValue,1);
});

test('Torihiki may decline the final draw or draw it and lose normally',()=>{
 for(const accept of [false,true]){
  const s=field();
  add(s,0,'battle',DRAW);
  give(s,0,'deck',[WATER]);
  const last=s.players[0].deck[0];
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  pick(s,accept?1:0);
  assert.equal(has(s,0,'hand',last),accept);
  assert.equal(s.winner,accept?1:null);
 }
});

test('Hibana mandatory shield selection remains mandatory after a saved decision',()=>{
 let s=field();
 const hibana=add(s,1,'battle',MILL),first=add(s,1,'grave',WATER),second=add(s,1,'grave',SMALL);
 destroy(s,hibana);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(values(s),[first.uid,second.uid]);
 pick(s,second);
 const root=s.players[1].shields.find(x=>x.uid===second.uid);
 assert.ok(root&&root.faceUp&&!root.shieldStack?.length);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',hibana));
});

test('Tegami resolves without an eligible opposing creature or an optional target',()=>{
 const s=field();
 add(s,0,'battle',FORCE);
 give(s,0,'shields',[SMALL]);
 cast(s,'dmrp21-040');
 pick(s,s.players[0].shields[0]);
 drain(s);
 assert.equal(s.decision,null);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g546Force'));
});
