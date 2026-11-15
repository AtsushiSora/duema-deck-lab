import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const UZA='dm26ex2-068',GEKO='dm26ex2-075',DOLLAR='dm26ex2-060',GEO='dm26ex2-082';
const BASIC='dm01-108',BOLS='dm01-008',LIGHT='dm01-076',FIRE='dm01-097',WATER='dm01-083';
const DARK='dm01-090',EVO='dm26ex2-012',REMOVAL='dm01-027',POPPY='dm23rp3-011';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('four verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1318.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[UZA,GEKO,DOLLAR,GEO]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1318}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  if(faces.length===2)assert.equal(e.playFaces(c)[1].cost,faces[1].cost);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const play=(s,id,face=0)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);
 return x;
};
const top=(s,p,ids)=>{
 const xs=ids.map(inst);
 s.players[p].deck.unshift(...xs);
 return xs;
};
const order=(s,card,to)=>act(s,'extended',a=>{
 const {value}=s.decision.choices[a.choice];
 return value?.uid===card.uid&&value.to===to;
});
const tappedMana=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;

test('Wadauza can trigger from its shield and then return both creatures when it blocks',()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[UZA,BASIC,BASIC]);
 give(s,0,'mana',[]);
 const source=s.players[0].shields[0],attacker=add(s,1,'battle',BASIC),next=add(s,1,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',source));
 assert.equal(tappedMana(s,0),0);
 attack(s,next.uid);
 act(s,'block',a=>a.uid===source.uid);
 assert.ok(has(s,0,'hand',source)&&has(s,1,'hand',next));
 assert.equal(s.players[0].shields.length,2);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.ok(!choices(s).includes(null));
 drain(s);
});

test('Wadauza follows intrinsic ownership and can privately split and order a top and bottom return',()=>{
 let s=field();
 s.active=1;
 const source=add(s,0,'battle',UZA),attacker=add(s,1,'battle',BASIC,{cardOwner:0});
 const [a,b,c,d]=top(s,0,[LIGHT,FIRE,WATER,DARK]),next=s.players[0].deck[4];
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===source.uid);
 assert.ok(has(s,0,'hand',source)&&has(s,0,'hand',attacker));
 assert.deepEqual(choices(s),[a.uid,b.uid,c.uid,d.uid]);
 assert.equal(s.log.filter(l=>l.type==='reveal').length,0);
 pick(s,b.uid);
 assert.equal(s.decision.task.op,'g33_Order');
 order(s,d,'top');
 s=JSON.parse(JSON.stringify(s));
 order(s,a,'bottom');
 order(s,c,'top');
 assert.deepEqual(s.players[0].deck.slice(0,3).map(x=>x.uid),[d.uid,c.uid,next.uid]);
 assert.equal(s.players[0].deck.at(-1).uid,a.uid);
 assert.ok(has(s,0,'hand',b));
 assert.deepEqual(s.players[0].g33Protected,[]);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
});

test('Wadauza triggers when destroyed as well and can order all cards at the bottom',()=>{
 const s=field();
 s.active=1;
 const source=add(s,0,'battle',UZA),[a,b,c,d]=top(s,0,[LIGHT,FIRE,WATER,DARK]);
 play(s,REMOVAL);
 act(s,'effect',a=>a.targets[0].uid===source.uid);
 assert.ok(has(s,0,'grave',source));
 pick(s,d.uid);
 for(const x of [a,c,b])order(s,x,'bottom');
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),[a.uid,c.uid,b.uid]);
});

test('Wadageko can be normally summoned for one and cannot attack',()=>{
 const s=field();
 const source=play(s,GEKO);
 assert.ok(has(s,0,'battle',source));
 assert.equal(tappedMana(s,0),1);
 assert.equal(s.decision,null);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid));
 assert.equal(e.effectiveCard(source,s).blocker,true);
});

test('Wadageko can pay three with water, return itself, and stop the target until its next own turn',()=>{
 const s=field(),source=add(s,0,'hand',GEKO);
 give(s,0,'mana',[WATER,FIRE,BASIC]);
 const enemy=add(s,1,'battle',LIGHT),bystander=add(s,1,'battle',FIRE),own=add(s,0,'battle',BASIC);
 act(s,'play',a=>a.uid===source.uid&&a.role==='paidAlt568');
 assert.equal(tappedMana(s,0),3);
 assert.deepEqual(new Set(choices(s)),new Set([own.uid,source.uid]));
 assert.ok(!choices(s).includes(null));
 pick(s,source.uid);
 assert.ok(has(s,0,'hand',source));
 assert.deepEqual(new Set(choices(s)),new Set([enemy.uid,bystander.uid]));
 pick(s,enemy.uid);
 const freezes=()=>s.extLimits.filter(l=>l.g190Freeze&&l.ref?.uid===enemy.uid);
 assert.deepEqual(freezes().map(l=>l.kind).sort(),['attack','block']);
 attack(s,own.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));
 drain(s);
 end(s);
 assert.equal(freezes().length,2);
 end(s);
 assert.equal(freezes().length,0);
});

test('Wadageko cannot use either summon payment without water',()=>{
 const s=field(),source=add(s,0,'hand',GEKO);
 give(s,0,'mana',[FIRE,FIRE,FIRE,FIRE]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===source.uid));
});

test('Dollar shield trigger only executes the creature face',()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[DOLLAR,BASIC]);
 give(s,0,'mana',[]);
 const source=s.players[0].shields[0],attacker=add(s,1,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.face||0),[0]);
 act(s,'useTrigger');
 drain(s);
 assert.ok(has(s,0,'battle',source));
 assert.equal(tappedMana(s,0),0);
});

test('Dollar Smash Burst keeps its creature in battle, discards first and draws once',()=>{
 const s=field(),source=add(s,0,'battle',DOLLAR),discard=add(s,0,'hand',FIRE);
 const [a,b]=top(s,0,[DARK,WATER]);
 attack(s,source.uid);
 assert.equal(s.decision.task.op,'g34_Smash320');
 pick(s,true);
 assert.equal(s.decision.task.op,'discard');
 pick(s,discard.uid);
 assert.ok(has(s,0,'grave',discard));
 pick(s,0);
 drain(s);
 assert.ok(has(s,0,'battle',source));
 assert.ok(has(s,0,'hand',a)&&has(s,0,'hand',b));
 assert.equal(tappedMana(s,0),0);
});

test('Dollar Smash Burst can be declined and Poppy blocks casting it from the battlefield',()=>{
 for(const stopped of [true,false]){
  const s=field(),source=add(s,0,'battle',DOLLAR),keep=add(s,0,'hand',FIRE);
  if(stopped)add(s,1,'battle',POPPY);
  attack(s,source.uid);
  assert.equal(s.decision?.task?.op==='g34_Smash320',!stopped);
  if(!stopped)pick(s,null);
  drain(s);
  assert.ok(has(s,0,'hand',keep)&&has(s,0,'battle',source));
 }
});

test('Dollar can cast after Revolution Change returns it to hand under QA 44369 and 48746',()=>{
 const s=field(),source=add(s,0,'battle',DOLLAR),changer=add(s,0,'hand','promoy15-020'),
  discard=add(s,0,'hand',FIRE),[a,b]=top(s,0,[DARK,WATER]);
 add(s,1,'battle',POPPY);
 attack(s,source.uid);
 pick(s,true);
 act(s,'orderEffect',action=>action.cardId===changer.cardId);
 pick(s,source.uid);
 assert.ok(has(s,0,'battle',changer)&&has(s,0,'hand',source));
 assert.equal(s.decision.task.op,'g34_Smash320');
 pick(s,true);
 pick(s,discard.uid);
 pick(s,0);
 drain(s);
 assert.ok(has(s,0,'hand',source)&&has(s,0,'grave',discard));
 assert.ok(has(s,0,'hand',a)&&has(s,0,'hand',b));
 assert.equal(tappedMana(s,0),0);
});

test('Dollar spell still chooses a mode at zero hand and destroys at current power 7000 only',()=>{
 const s=field(),exact=add(s,1,'battle',BOLS,{powerModifiers:[{amount:1000}]}),
  beyond=add(s,1,'battle',BOLS,{powerModifiers:[{amount:1001}]});
 const spell=play(s,DOLLAR,1);
 assert.equal(s.decision.task.op,'g34_Choose');
 pick(s,1);
 assert.deepEqual(choices(s),[exact.uid]);
 pick(s,exact.uid);
 assert.ok(has(s,1,'grave',exact)&&has(s,1,'battle',beyond)&&has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),2);
});

test('Geo Mach Fighter can attack an untapped creature immediately, keeps W Breaker and offers G Strike',()=>{
 const s=field(),target=add(s,1,'battle',BASIC),source=play(s,GEO);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid&&a.target==='player'));
 assert.equal(e.effectiveCard(source,s).breaker,2);
 attack(s,source.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target));
 const t=field();
 t.active=1;
 give(t,0,'shields',[GEO,BASIC]);
 const shield=t.players[0].shields[0],a=add(t,1,'battle',BASIC),foe=add(t,1,'battle',FIRE);
 attack(t,a.uid);
 act(t,'noBlock');
 assert.equal(t.decision.task.op,'gsDeclare');
 pick(t,true);
 pick(t,foe.uid);
 assert.ok(has(t,0,'hand',shield));
 assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'&&a.uid===foe.uid));
});

for(const matching of [false,true])test('Geo spell reveals five, searches only the top five and orders the rest '+matching,()=>{
 const s=field();
 const [a,b,c,d,evo,f]=top(s,0,[BASIC,matching?EVO:BOLS,WATER,FIRE,DARK,EVO]);
 const n=s.players[0].deck.length,spell=play(s,GEO,1);
 if(matching){
  assert.deepEqual(choices(s),[b.uid]);
  pick(s,b.uid);
  assert.ok(has(s,0,'hand',b));
 }
 const rest=matching?[evo,d,a,c]:[evo,d,a,c,b];
 assert.ok(s.log.find(l=>l.type==='reveal'&&l.cardId===GEO));
 for(const x of rest.slice(0,-1))pick(s,x.uid);
 drain(s);
 assert.equal(s.players[0].deck.length,n-Number(matching));
 assert.equal(s.players[0].deck[0].uid,f.uid);
 assert.deepEqual(s.players[0].deck.slice(-rest.length).map(x=>x.uid),rest.map(x=>x.uid));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),1);
});
