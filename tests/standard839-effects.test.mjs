import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const TWIN='dm23ex2-098',BELL='dm39-028',KITA='dmr01-090',PRINT='dmr01-090M';
const OLD_BODY='dm31-016',OLD_SPELL='dmr03-013',LAND='dm01-108',WATER='dm01-083',BIG='dm01-079';
const HAND='dm01-027',DEATH='dm32-057',DEATH_TWIN='dm24bd4-014',DEATH_SPELL='dm34-047';
const LOCK='dmrp08-014',BAIKEN='dm29-s02',GENMU='dmrp15-km1';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const restore=s=>JSON.parse(JSON.stringify(s));
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id,face=0){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
function destroyBell(s){
 const bell=put(s,0,'battle',BELL);
 s.active=1;play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===bell.uid));
 return bell;
}
const revealed=s=>s.log.filter(x=>x.type==='reveal'&&x.source===KITA).map(x=>x.cardId);

test('Phase 839 pins the complete official faces, the foil print and the three independent twinpact IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-839.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TWIN,BELL,KITA]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:839}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual(e.playFaces(c).map(f=>[f.cost,f.power??0,f.race??'']),d.faces.map(f=>[f.cost,Number(f.powerText),f.race]));
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(c.limit,4);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  for(let face=0;face<d.faces.length;face++){
   const unknown=structuredClone(d);
   unknown.faces[face].abilityText+='未知の能力。';
   assert.throws(()=>standardCardSpec(unknown,{phase:839}));
  }
 }
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,KITA]]);
 assert.deepEqual(catalogue.resolveRows([{id:PRINT,count:1},{id:KITA,count:3}]),[{id:KITA,count:4}]);
 assert.deepEqual(catalogue.resolveRows([TWIN,OLD_BODY,OLD_SPELL].map(id=>({id,count:4}))),
  [TWIN,OLD_BODY,OLD_SPELL].map(id=>({id,count:4})));
 assert.deepEqual(e.card(TWIN).spellFace.g34Tasks,e.card(OLD_SPELL).g34Tasks);
});

test('Dakitay destroys a mandatory opposing creature at current power 3000 or less',()=>{
 const s=field(),friend=put(s,0,'battle',WATER),large=put(s,1,'battle',BIG);
 const boundary=put(s,1,'battle',LAND,{powerModifiers:[{amount:1000,expires:'end',who:0}]});
 const buffed=put(s,1,'battle',LAND,{powerModifiers:[{amount:2000,expires:'end',who:0}]});
 const x=play(s,TWIN);
 assert.deepEqual(values(s),[boundary.uid]);pick(s,boundary.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',friend));
 assert.ok(has(s,1,'grave',boundary)&&has(s,1,'battle',buffed)&&has(s,1,'battle',large));
});

test('Dakitay can be summoned as a Shield Trigger on its creature face only',()=>{
 const s=field(1);
 give(s,0,'shields',[TWIN,LAND]);
 const x=s.players[0].shields[0],attacker=put(s,1,'battle',LAND);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.face),[0]);
 act(s,'useTrigger');pick(s,attacker.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'grave',attacker));
 assert.ok(s.players[0].mana.every(m=>!m.tapped));
});

test('The twinpact Charger face grants the restricted fresh attack and moves the physical twinpact to mana',()=>{
 let s=field();
 const fighter=put(s,0,'battle',LAND,{entered:s.turn});
 const untapped=put(s,1,'battle',WATER),tapped=put(s,1,'battle',WATER,{tapped:true});
 const spell=play(s,TWIN,1);s=restore(s);
 pick(s,fighter.uid);
 assert.ok(has(s,0,'mana',spell)&&!has(s,0,'battle',spell)&&!has(s,0,'grave',spell));
 s.phase='attack';assert.deepEqual(attacks(s,fighter),[untapped.uid]);
 assert.ok(has(s,1,'battle',tapped));
 attack(s,fighter.uid,untapped.uid);drain(s);
 assert.ok(has(s,1,'grave',untapped));
});

test('Genmu suppresses the twinpact spell without suppressing its six-cost creature face',()=>{
 const s=field(),fighter=put(s,0,'battle',LAND,{entered:s.turn});
 put(s,1,'battle',GENMU);
 const target=put(s,1,'battle',WATER),spell=play(s,TWIN,1);
 assert.ok(has(s,0,'grave',spell));
 assert.ok(!e.effectiveCard(fighter,s).attackUntapped);
 play(s,TWIN);assert.deepEqual(values(s),[target.uid]);pick(s,target.uid);drain(s);
 assert.ok(has(s,1,'grave',target));
});

for(const targetId of [DEATH,DEATH_TWIN,BELL])test('Bell bottoms itself and revives a different eligible creature '+targetId,()=>{
 let s=field();
 const target=put(s,0,'grave',targetId),spell=put(s,0,'grave',DEATH_SPELL);
 const other=put(s,0,'grave',LAND),foreign=put(s,1,'grave',DEATH);
 const bell=destroyBell(s);assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[true,null]);s=restore(s);
 pick(s,true);
 assert.deepEqual(values(s),[target.uid]);pick(s,target.uid);drain(s);
 assert.equal(s.players[0].deck.at(-1).uid,bell.uid);
 assert.ok(has(s,0,'battle',target)&&has(s,0,'grave',spell)&&has(s,0,'grave',other)&&has(s,1,'grave',foreign));
});

test('Bell can decline and may bottom itself even without a resurrection target',()=>{
 for(const accept of [false,true]){
  const s=field(),bell=destroyBell(s);
  pick(s,accept?true:null);drain(s);
  assert.equal(has(s,0,'grave',bell),!accept);
  assert.equal(s.players[0].deck.at(-1).uid===bell.uid,accept);
 }
});

test('Bell stays in grave when opposing grave movement is forbidden',()=>{
 const s=field();put(s,1,'battle',LOCK);
 const target=put(s,0,'grave',DEATH),bell=destroyBell(s);drain(s);
 assert.equal(s.decision,null);
 assert.ok([bell,target].every(x=>has(s,0,'grave',x)));
});

test('Bell does not use a later grave visit by the same physical card',()=>{
 let s=field();
 put(s,0,'grave',DEATH);
 const bell=destroyBell(s);s=restore(s);
 const x=s.players[0].grave.find(x=>x.uid===bell.uid);x.zoneSerial++;
 pick(s,true);drain(s);
 assert.ok(has(s,0,'grave',bell)&&!has(s,0,'deck',bell));
 assert.equal(s.players[0].battle.length,0);
});

for(const active of [0,1])test('Kitaro lets the opponent privately choose exactly two and the controller choose one after reveal '+active,()=>{
 let s=field(active);
 const owner=1-active,first=put(s,owner,'hand',WATER),second=put(s,owner,'hand',BIG);
 const privateCard=put(s,owner,'hand',HAND),other=put(s,owner,'hand',LAND);
 play(s,KITA);
 assert.equal(s.decision.player,owner);assert.deepEqual(values(s),[first.uid,second.uid,privateCard.uid,other.uid]);
 assert.ok(e.observation(s,active).players[owner].hand.every(x=>x.hidden));
 pick(s,first.uid);assert.deepEqual(revealed(s),[]);
 assert.equal(s.decision.player,owner);assert.deepEqual(values(s),[second.uid,privateCard.uid,other.uid]);
 s=restore(s);pick(s,second.uid);
 assert.equal(s.decision.player,active);assert.deepEqual(values(s),[first.uid,second.uid]);
 assert.deepEqual(revealed(s),[WATER,BIG]);
 s=restore(s);pick(s,second.uid);drain(s);
 assert.ok(has(s,owner,'grave',second));
 assert.ok([first,privateCard,other].every(x=>has(s,owner,'hand',x)));
});

for(const size of [0,1,2])test('Kitaro reveals the whole opposing hand when at most two remain '+size,()=>{
 const s=field(),ids=[WATER,HAND].slice(0,size),cards=ids.map(id=>put(s,1,'hand',id));
 play(s,KITA);assert.deepEqual(revealed(s),ids);
 if(size===2){assert.equal(s.decision.player,0);assert.deepEqual(values(s),cards.map(x=>x.uid));pick(s,cards[1].uid);}
 drain(s);
 assert.equal(s.players[1].grave.length,size?1:0);
 if(size)assert.ok(has(s,1,'grave',cards.at(-1)));
});

test('Kitaro honors a discard replacement after revealing the only card',()=>{
 const s=field(),x=put(s,1,'hand',BAIKEN);
 const kitaro=play(s,KITA);
 assert.deepEqual(revealed(s),[BAIKEN]);
 pick(s,true);
 assert.ok(has(s,1,'battle',x)&&!has(s,1,'grave',x));
 pick(s,kitaro.uid);drain(s);
 assert.ok(has(s,0,'hand',kitaro));
});

test('Chain Slash uses Dakitay’s creature name for both a twinpact and its standalone namesake',()=>{
 const s=field(),twin=put(s,1,'battle',TWIN),body=put(s,1,'battle',OLD_BODY);
 play(s,'dmr01-058');pick(s,twin.uid);drain(s);
 assert.ok([twin,body].every(x=>has(s,1,'grave',x)));
});
