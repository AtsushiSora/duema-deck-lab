import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-693.json',import.meta.url)));

test('Phase 693 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:693}));
  assert.throws(()=>standardCardSpec(detail,{phase:692}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:693}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const THORN='dm11-052',SCOUT='dm09-041',MESSA='dm10-074',KUZU='dm04-028';
const SMALL='dm01-108',RAIJIN='dm28-063',BIKE='dm08-027',GEAR='dm14-110',HAND='dm01-027';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id,tapped=false)=>{const x=inst(id);x.tapped=tapped;s.players[p].battle.push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===value;
});
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function moveWith(s,defs){
 s.phase='main';
 s.extTasks=[{op:'g34_Sequence',p:s.active,source:HAND,defs}];
 act(s,'toAttack');
}

test('Verified reprints have the same effects and limits without a second battle definition',()=>{
 const {printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-693.json',import.meta.url)));
 assert.deepEqual(printAliases.map(x=>x.canonicalId),[MESSA,KUZU]);
 for(const row of printAliases){
  assert.ok(row.verification.facesMatched);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[row.canonicalId]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:693}),cards.find(x=>x.id===row.canonicalId).spec);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
 assert.deepEqual(data.cards.filter(c=>c.name.startsWith('怪力の化身')).map(c=>c.id),['dm09-034']);
});

test('Thorn boosts against the creature declared, keeps the boost after battle and loses it at turn end',()=>{
 const s=field(),a=put(s,0,THORN),defender=put(s,1,SMALL,true);
 defender.powerModifiers=[{amount:e.card(THORN).power-e.card(SMALL).power}];
 attack(s,a.uid,defender.uid);
 noBlock(s);
 assert.ok(has(s,1,'grave',defender));
 assert.equal(e.power(a,false,s),e.card(THORN).power+3000);
 act(s,'endTurn');
 assert.equal(e.power(a,false,s),e.card(THORN).power);
});

test('Thorn attacking a player gains no boost even when blocked',()=>{
 const s=field(),a=put(s,0,THORN),b=put(s,1,BIKE);
 attack(s,a.uid);
 assert.equal(e.power(a,true,s),e.card(THORN).power);
 act(s,'block',x=>x.uid===b.uid);
 assert.ok(has(s,0,'grave',a));
 assert.ok(has(s,1,'battle',b));
});

for(const p of [0,1])test('Scout can attack and returns to hand only when another allied creature enters '+p,()=>{
 const s=field(p),x=play(s,SCOUT);
 assert.ok(has(s,p,'battle',x));
 s.phase='attack';
 x.entered=0;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 play(s,GEAR);
 assert.ok(has(s,p,'battle',x));
 s.active=1-p;
 play(s,SMALL);
 assert.ok(has(s,p,'battle',x));
 s.active=p;
 const ally=play(s,SMALL);
 assert.ok(has(s,p,'battle',ally));
 assert.ok(has(s,p,'hand',x));
});

test('Scout may block when no allied creature has entered',()=>{
 const s=field(),a=put(s,0,RAIJIN),x=put(s,1,SCOUT);
 attack(s,a.uid);
 assert.ok(e.getLegalActions(s).some(q=>q.kind==='noBlock'));
 act(s,'block',q=>q.uid===x.uid);
 assert.ok(has(s,0,'grave',a));
 assert.equal(s.players[1].shields.length,5);
});

for(const tapped of [false,true])test('Messa must block when eligible and may pass when tapped '+tapped,()=>{
 const s=field(),a=put(s,0,RAIJIN),x=put(s,1,MESSA,tapped);
 attack(s,a.uid);
 assert.equal(e.getLegalActions(s).some(q=>q.kind==='noBlock'),tapped);
 if(tapped)noBlock(s);
 else act(s,'block',q=>q.uid===x.uid);
 assert.equal(s.players[1].shields.length,tapped?4:5);
});

test('Messa can attack a tapped creature but cannot attack a player',()=>{
 const s=field(),x=put(s,0,MESSA),y=put(s,1,RAIJIN,true);
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(q=>q.kind==='attack'&&q.uid===x.uid).map(q=>q.target),[y.uid]);
});

test('Both required Messa blockers tap and the defender chooses which one battles',()=>{
 let s=field(),a=put(s,0,RAIJIN),first=put(s,1,MESSA),last=put(s,1,MESSA),all=physical(s);
 a.powerModifiers=[{amount:e.card(MESSA).power}];
 attack(s,a.uid);
 assert.deepEqual(e.getLegalActions(s).map(q=>q.kind),['defendMany']);
 act(s,'defendMany');
 pick(s,first.uid);
 assert.ok(!s.decision.choices.some(c=>c.value===null));
 s=JSON.parse(JSON.stringify(s));
 pick(s,last.uid);
 pick(s,null);
 assert.ok(s.players[1].battle.find(y=>y.uid===first.uid)?.tapped);
 assert.ok(has(s,1,'grave',last));
 assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(physical(s),all);
});

test('Surviving Kuzu gets an independent optional draw for each other creature that goes to either grave',()=>{
 let s=field(),x=put(s,0,KUZU),own=put(s,0,RAIJIN),enemy=put(s,1,RAIJIN),gear=put(s,1,GEAR);
 x.powerModifiers=[{amount:1000}];
 const all=physical(s);
 moveWith(s,[{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:1000}}]);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'battle',gear));
 assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',enemy));
 assert.equal(s.pendingEffects.filter(q=>q.uid===x.uid).length,2);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect');
 pick(s,1);
 pick(s,0);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[1].hand.length,0);
 assert.deepEqual(physical(s),all);
});

test('Kuzu does not draw when leaving with another creature, when a victim returns to hand, or when a noncreature goes to grave',()=>{
 const s=field(),x=put(s,0,KUZU),y=put(s,0,RAIJIN),gear=put(s,1,GEAR),enemy=put(s,1,RAIJIN);
 moveWith(s,[{op:'ExactMove',owner:1,to:'hand',target:enemy.uid}]);
 assert.ok(has(s,1,'hand',enemy));
 assert.equal(s.decision,null);
 moveWith(s,[{op:'ExactMove',owner:1,to:'grave',target:gear.uid}]);
 assert.ok(has(s,1,'grave',gear));
 assert.equal(s.decision,null);
 moveWith(s,[{op:'Sweep',both:true,to:'grave',filter:{creature:true}}]);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'grave',y));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
});
