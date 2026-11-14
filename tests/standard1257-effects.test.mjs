import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {nameKey,createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SPLIT='dm22ex1-079',BLADE='dm25-039',VINO='dm21-023',TSU='dmrp22-030',ARC='dm19-109';
const L='dm01-075',N='dm01-108',F='dm01-097',D='dm01-090',W='dm01-083',ONI='dmrp01-041';
const FIVE=[L,N,F,D,W],STAR='dmrp18-km2',EX='dm26rp3-042';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(N));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][zone].push(x);
 return x;
}
function closeTurn(s){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');drain(s);act(s,'skipCharge');
}
const values=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const attacks=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('the three official prints resolve by name and ID with complete stats, text and art',()=>{
 const m=read('tools/support-phase-1257.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[SPLIT,BLADE,VINO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1257}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.text,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.abilityText,f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===image));
 }
});

test('Erabe Now reveals exactly five and lets the opponent divide arbitrary cards before the caster chooses',()=>{
 let s=field();
 give(s,0,'deck',[...FIVE,...Array(8).fill(N)]);
 const top=s.players[0].deck.slice(0,5),library=s.players[0].deck.slice(5).map(x=>x.uid);
 cast(s,SPLIT);
 assert.equal(s.decision.player,1);
 assert.deepEqual(e.getLegalActions(s).filter(x=>x.cardId).map(x=>x.cardId),FIVE);
 pick(s,top[0].uid);
 // A suspended split remains actionable after JSON serialization.
 s=JSON.parse(JSON.stringify(s));
 pick(s,top[3].uid);pick(s,null);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.choices[0].label,'束A：'+[L,D].map(id=>e.card(id).name).join('・'));
 pick(s,0);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top[0].uid,top[3].uid]);
 assert.deepEqual(s.players[0].grave.filter(x=>x.cardId!==SPLIT).map(x=>x.uid),[top[1].uid,top[2].uid,top[4].uid]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),library);
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Erabe Now allows a 0/5 split and either pile can be taken (QA 42367)',()=>{
 for(const choose of [0,1]){
  const s=field();
  give(s,0,'deck',[...FIVE,...Array(8).fill(N)]);
  cast(s,SPLIT);pick(s,null);
  assert.match(s.decision.choices[0].label,/0枚/);
  pick(s,choose);
  assert.deepEqual(s.players[0].hand.map(x=>x.cardId),choose===0?[]:FIVE);
  assert.deepEqual(s.players[0].grave.filter(x=>x.cardId!==SPLIT).map(x=>x.cardId),choose===0?FIVE:[]);
 }
});

test('under Tsu the caster can choose the 0 or 1 pile (QA 42370)',()=>{
 for(const choose of [0,1]){
  const s=field();
  give(s,0,'deck',[L,F,N,N,N,N]);give(s,1,'battle',[TSU]);
  cast(s,SPLIT);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.cardId).map(a=>a.cardId),[L]);
  pick(s,s.players[0].deck[0].uid);
  assert.equal(s.decision.player,0);
  assert.match(s.decision.choices[1].label,/0枚/);
  pick(s,choose);
  assert.deepEqual(s.players[0].hand.map(x=>x.cardId),choose===0?[L]:[]);
  assert.deepEqual(s.players[0].grave.filter(x=>x.cardId!==SPLIT).map(x=>x.cardId),choose===0?[]:[L]);
  assert.equal(s.players[0].deck[0].cardId,F);
 }
});

test('Blade Circle lets Light go, destroys the first qualifying attacker without choosing and is then spent',()=>{
 const s=field();
 const light=add(s,1,'battle',L),lightMulti=add(s,1,'battle','dmr02-049');
 const hidden=add(s,1,'battle',ONI),later=add(s,1,'battle',F),victim=add(s,0,'battle',N,{tapped:true});
 cast(s,BLADE);closeTurn(s);
 for(const x of [light,lightMulti]){
  attack(s,x.uid);act(s,'noBlock');drain(s);
  assert.ok(has(s,1,'battle',x));
 }
 const remaining=s.players[0].shields.length;
 attack(s,hidden.uid,victim.uid);
 assert.ok(has(s,1,'grave',hidden)&&has(s,0,'battle',victim));
 assert.equal(s.players[0].shields.length,remaining);
 assert.equal(s.attack,null);
 attack(s,later.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'battle',later));
 assert.equal(s.players[0].shields.length,remaining-1);
});

test('Blade Circle consumes the first attack even when destruction is replaced, and expires on a turn without attacks',()=>{
 for(const first of [true,false]){
  const s=field();
  const later=add(s,1,'battle',F);
  const exShield=s.players[1].shields[0];
  const x=add(s,1,'battle',EX,{exLifeShieldUid:exShield.uid});
  cast(s,BLADE);closeTurn(s);
  if(first){
   attack(s,x.uid);drain(s);
   assert.ok(has(s,1,'battle',x)&&has(s,1,'grave',exShield));
  }else{
   closeTurn(s);closeTurn(s);
  }
  attack(s,later.uid);act(s,'noBlock');drain(s);
  assert.ok(has(s,1,'battle',later));
 }
});

test('Vinogote requires an allied Arc Seraphim; it locks one attacker but expires at the caster’s next start',()=>{
 const s=field(),target=add(s,1,'battle',F),other=add(s,1,'battle',W);
 cast(s,VINO);assert.equal(s.decision,null);
 add(s,0,'battle',ARC);
 cast(s,VINO);assert.deepEqual(values(s),[target.uid,other.uid]);pick(s,target.uid);
 closeTurn(s);act(s,'toAttack');
 assert.equal(attacks(s,target),false);
 assert.equal(attacks(s,other),true);
 closeTurn(s);closeTurn(s);act(s,'toAttack');
 assert.equal(attacks(s,target),true);
});

test('Vinogote’s shield trigger affects the rest of that attack step, and the lock follows evolution',()=>{
 const s=field();give(s,1,'shields',[VINO]);add(s,1,'battle',ARC);
 const first=add(s,0,'battle',F),other=add(s,0,'battle',F);
 attack(s,first.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===VINO);
 pick(s,other.uid);
 assert.ok(s.players[1].battle.some(x=>x.cardId===VINO));
 assert.equal(attacks(s,other),false);
 closeTurn(s);closeTurn(s);
 // The shield owner started a turn, so the other side can attack again.
 act(s,'toAttack');assert.equal(attacks(s,other),true);
 const z=field();const base=add(z,1,'battle',F);
 add(z,0,'battle',ARC);cast(z,VINO);pick(z,base.uid);
 closeTurn(z);
 const star=add(z,1,'hand',STAR);
 act(z,'play',a=>a.uid===star.uid&&a.baseUid===base.uid);
 drain(z);act(z,'toAttack');
 assert.equal(attacks(z,star),false);
});


test('two Blade Circles resolve for the same first non-Light attack and leave the next attack alone',()=>{
 const s=field(),first=add(s,1,'battle',F),second=add(s,1,'battle',W);
 cast(s,BLADE);cast(s,BLADE);closeTurn(s);
 attack(s,first.uid);
 assert.equal(e.getLegalActions(s).filter(a=>a.kind==='orderEffect'&&a.cardId===BLADE).length,2);
 drain(s);assert.ok(has(s,1,'grave',first));
 attack(s,second.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'battle',second));
});
