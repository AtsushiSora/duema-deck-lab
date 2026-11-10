import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-799.json',import.meta.url)));
const GOLF="dm24rp4-S10",LIGER="dm24rp4-S05",DAI="dm24rp4-S04";
const TWO="dm01-108",THREE="dm01-081",FOUR="dm01-042",FIVE="dm01-025",SEVEN="dm01-s04",SPELL="dm01-027",SEED="dmrp22-076";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 799 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:799}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:799}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:799}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const task=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const move=(s,p,x,to)=>{
 s.phase='main';
 (s.extTasks??=[]).push({op:'g34_ExactMove',p:s.active,source:GOLF,owner:p,target:x.uid,to});
 act(s,'toAttack');
};
const top=(s,ids)=>{const batch=ids.map(inst);s.players[0].deck.unshift(...batch);return batch;};
const identities=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Golf can summon with Hyper Energy, use Mach Fighter on entry, and has Triple Breaker',()=>{
 const s=setup(),g=put(s,0,'hand',GOLF),a=put(s,0,'battle',TWO),b=put(s,0,'battle',THREE),enemy=put(s,1,'battle',SEVEN);
 act(s,'play',x=>x.uid===g.uid&&x.alternative==='hyperEnergy');
 pick(s,a.uid);pick(s,b.uid);pick(s,false);
 assert.ok(a.tapped&&b.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.equal(e.card(g).breaker,3);
 attack(s,g.uid,enemy.uid);
 finish(s);
 assert.ok(has(s,0,'battle',g)&&has(s,1,'grave',enemy));
});

for(const accept of [true,false])test('Golf only offers the first direct attack and can choose an effect battle '+accept,()=>{
 const s=setup();s.active=1;
 const g=put(s,0,'battle',GOLF),ally=put(s,0,'battle',SEVEN);
 const x=put(s,1,'battle',TWO),y=put(s,1,'battle',THREE),z=put(s,1,'battle',TWO);
 ally.tapped=g.tapped=true;
 attack(s,x.uid,ally.uid);
 assert.notEqual(s.decision?.task?.op,'g34_FightAttacker798');
 finish(s);
 attack(s,y.uid);
 task(s,'g34_FightAttacker798');
 pick(s,accept?true:null);
 finish(s);
 assert.equal(has(s,1,'grave',y),accept);
 assert.equal(s.players[0].shields.length,accept?5:4);
 attack(s,z.uid);
 assert.notEqual(s.decision?.task?.op,'g34_FightAttacker798');
 finish(s);
 assert.equal(s.players[0].shields.length,accept?4:3);
});

test('Golf entering after a direct attack cannot respond to a second direct attack (QA 49402)',()=>{
 const s=setup();s.active=1;
 const first=put(s,1,'battle',TWO),second=put(s,1,'battle',TWO);
 attack(s,first.uid);
 finish(s);
 put(s,0,'battle',GOLF);
 attack(s,second.uid);
 assert.notEqual(s.decision?.task?.op,'g34_FightAttacker798');
 finish(s);
 assert.equal(s.players[0].shields.length,3);
});

for(const zone of ['grave','hand','mana','deck'])test('Golf leaving during the opponent turn can deploy a creature costing up to seven from mana '+zone,()=>{
 const s=setup();s.active=1;
 const g=put(s,0,'battle',GOLF);
 give(s,0,'mana',[SEVEN,LIGER,SEED,SPELL]);
 const [eligible,high,seed,spell]=s.players[0].mana;
 move(s,0,g,zone);
 task(s,'g34_Select');
 assert.ok(choices(s).includes(eligible.uid)&&choices(s).includes(null));
 assert.ok([high,seed,spell].every(x=>!choices(s).includes(x.uid)));
 pick(s,eligible.uid);
 drain(s);
 assert.ok(has(s,0,zone,g)&&has(s,0,'battle',eligible));
});

test('Golf does not deploy on its own turn and can decline on the opponent turn',()=>{
 for(const active of [0,1]){
  const s=setup();s.active=active;const g=put(s,0,'battle',GOLF);
  give(s,0,'mana',[SEVEN]);const [x]=s.players[0].mana;
  move(s,0,g,'hand');
  if(active===1){task(s,'g34_Select');pick(s,null);}
  else assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',g)&&has(s,0,'mana',x));
 }
});

test('Daedalus reveals through the first strictly cheaper creature and grants its allies speed and Guardman',()=>{
 const s=setup(),source=put(s,0,'hand',DAI),old=put(s,0,'battle',SEVEN);
 const [equal,spell,ally]=top(s,[FIVE,SPELL,TWO]);
 play(s,source);
 task(s,'g19Yobi');
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'battle',ally));
 assert.deepEqual(new Set(s.players[0].deck.slice(-2).map(x=>x.uid)),new Set([equal.uid,spell.uid]));
 const target=put(s,0,'battle',THREE);target.tapped=true;
 const foe=put(s,1,'battle',TWO);
 s.phase='attack';
 for(const x of [source,ally])assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 s.active=1;
 attack(s,foe.uid,target.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===ally.uid));
 act(s,'guardman',a=>a.uid===old.uid);
 drain(s);
 assert.ok(has(s,0,'battle',target)&&has(s,1,'grave',foe));
});

test('Daedalus destroys an opposing creature at current power 4000 and breaks two shields',()=>{
 const s=setup(),x=put(s,0,'hand',DAI),equal=put(s,1,'battle',FOUR),over=put(s,1,'battle',FOUR);
 over.powerModifiers=[{amount:1,expires:'end',who:0}];
 play(s,x);pick(s,null);
 attack(s,x.uid);
 assert.deepEqual(choices(s),[equal.uid]);
 pick(s,equal.uid);
 finish(s);
 assert.ok(has(s,1,'grave',equal)&&has(s,1,'battle',over));
 assert.equal(s.players[1].shields.length,3);
});

test('Double Yobinion reveals once through the second cheaper creature and preserves every card identity',()=>{
 let s=setup();const source=put(s,0,'hand',LIGER);
 const [equal,one,miss,two,tail]=top(s,[LIGER,TWO,SPELL,THREE,FOUR]);
 const before=identities(s);
 play(s,source);
 task(s,'g19Yobi');
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 drain(s);
 assert.ok([source,one,two].every(x=>has(s,0,'battle',x)));
 assert.deepEqual(new Set(s.players[0].deck.slice(-2).map(x=>x.uid)),new Set([equal.uid,miss.uid]));
 assert.equal(s.players[0].deck[0].uid,tail.uid);
 assert.deepEqual(identities(s),before);
 const enemy=put(s,1,'battle',SEVEN);s.phase='attack';
 for(const x of [source,one,two]){
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 }
 move(s,0,source,'hand');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===one.uid&&a.target===enemy.uid));
});

for(const hit of [false,true])test('Double Yobinion handles '+(hit?'one match':'no match')+' (QA 45937)',()=>{
 const s=setup(),source=put(s,0,'hand',LIGER);
 give(s,0,'deck',[SPELL,...hit?[TWO]:[],LIGER,SPELL]);
 const [miss,selected]=s.players[0].deck,before=identities(s);
 play(s,source);
 pick(s,true);
 drain(s);
 assert.equal(s.players[0].battle.length,hit?2:1);
 assert.ok(has(s,0,'deck',miss));
 if(hit)assert.ok(has(s,0,'battle',selected));
 assert.deepEqual(identities(s),before);
});

test('Double Yobinion stops at two matches even if a revealed evolution has no base',()=>{
 const s=setup(),source=put(s,0,'hand',LIGER),evolution='dm02-s02';
 assert.ok(e.card(evolution).evolution&&e.card(evolution).cost<10);
 const [can,cannot,tail]=top(s,['dm01-084',evolution,THREE]);
 play(s,source);pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',can)&&has(s,0,'deck',cannot));
 assert.equal(s.players[0].deck[0].uid,tail.uid);
});

test('Double Yobinion can evolve two creatures on distinct existing bases',()=>{
 const s=setup(),source=put(s,0,'hand',LIGER);
 const firstBase=put(s,0,'battle','dm01-084'),secondBase=put(s,0,'battle','dm01-050');
 const [first,second]=top(s,['dm02-s02','dm02-s02']);
 const before=identities(s);
 play(s,source);pick(s,true);
 assert.deepEqual(choices(s),[firstBase.uid,secondBase.uid]);
 pick(s,firstBase.uid);
 assert.deepEqual(choices(s),[secondBase.uid]);
 pick(s,secondBase.uid);
 drain(s);
 assert.equal(first.under[0].uid,firstBase.uid);
 assert.equal(second.under[0].uid,secondBase.uid);
 assert.deepEqual(identities(s),before);
});

for(const id of [DAI,LIGER])test(e.card(id).name+' can decline Yobinion, and placement without summoning does not trigger it',()=>{
 const s=setup(),x=put(s,0,'hand',id);
 const before=s.players[0].deck.map(x=>x.uid);
 play(s,x);pick(s,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
 const t=setup(),y=put(t,0,'hand',id);
 t.extTasks=[{op:'g34_Put',p:0,source:id,origin:'hand',target:y.uid}];
 act(t,'toAttack');
 assert.equal(t.decision,null);
 assert.ok(has(t,0,'battle',y));
});

test('Copied Double Yobinion uses the copying creature’s cost',()=>{
 const s=setup(),source=put(s,0,'battle',DAI);
 const [equal,first,second]=top(s,[FIVE,TWO,THREE]);
 const entry=e.entryAbilities(s,0,LIGER,{source:DAI,uid:source.uid,incarnation:0}).find(x=>x.task?.double799);
 assert.ok(entry);
 s.extTasks=[entry.task];
 act(s,'toAttack');
 task(s,'g19Yobi');
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'deck',equal)&&has(s,0,'battle',first)&&has(s,0,'battle',second));
});
