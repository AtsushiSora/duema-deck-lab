import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-733.json',import.meta.url)));

test('Phase 733 validates five complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:733}));
  assert.throws(()=>standardCardSpec(detail,{phase:732}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:733}));
 }
});


const DILGA='dm22ex1-070', BARRAGE='dm13-018', JUDGMENT='dm13-031', BRONZE='dm26ex4-079';
const LIVE='dmx15-018', TRIGGER='dmbd01-007';
const SMALL='dm01-108', EXACT='dm01-082', BIG='dm01-s04', HAND='dm01-027';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id,face=0){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face&&!a.alternative);
 return x;
}

test('Same-name reprints resolve to the original ID, while each twinpact keeps a separate identity',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.equal(printAliases.length,3);
 for(const row of printAliases){
  assert.equal(registry.get(row.id).id,row.canonicalId);
  assert.equal(refs.prints.find(x=>x.id===row.id).image,row.image);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[row.canonicalId]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:733}),cards.find(c=>c.id===row.canonicalId).spec);
 }
 assert.deepEqual(registry.resolveRows([JUDGMENT,'dmx22b-138','dmex17-w03',BRONZE,'dm01-106',DILGA,BARRAGE].map(id=>({id,count:1}))),
  [{id:JUDGMENT,count:3},{id:BRONZE,count:1},{id:'dm01-106',count:1},{id:DILGA,count:1},{id:BARRAGE,count:1}]);
});

test('Dilga creature face breaks four shields and shuffles into the deck when destroyed',()=>{
 const s=field(),dilga=play(s,DILGA);
 assert.equal(e.effectiveCard(dilga,s).breaker,4);
 assert.equal(e.power(dilga,false,s),23000);
 dilga.entered=0;
 attack(s,dilga.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
 s.active=1;
 s.phase='main';
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===dilga.uid));
 assert.ok(has(s,0,'deck',dilga));
 assert.ok(!has(s,0,'grave',dilga));
});

test('Dilga spell face resolves the existing Barrage reveal, sweep and graveyard effect',()=>{
 const s=field(),weak=put(s,1,SMALL),equal=put(s,0,BIG);
 give(s,0,'deck',[HAND,BIG,SMALL]);
 const spell=play(s,DILGA,1);
 assert.ok(has(s,0,'grave',spell)&&has(s,1,'grave',weak)&&has(s,0,'battle',equal));
 assert.deepEqual(s.players[0].deck.map(x=>x.cardId),[SMALL]);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[HAND,BIG]);
});

test('Bronze creature face puts exactly the top card into mana on entry',()=>{
 const s=field();
 give(s,0,'deck',[DILGA,BIG,SMALL]);
 const next=s.players[0].deck[0],n=s.players[0].mana.length;
 const bronze=play(s,BRONZE);
 assert.ok(has(s,0,'battle',bronze));
 assert.equal(s.players[0].mana.length,n+1);
 assert.ok(has(s,0,'mana',next));
 assert.equal(next.tapped,true);
 assert.deepEqual(s.players[0].deck.map(x=>x.cardId),[BIG,SMALL]);
});

for(const id of [DILGA,BRONZE])test('Charging '+id+' uses all three civilizations as one tapped mana card',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge');
 assert.ok(has(s,0,'mana',x));
 assert.equal(x.tapped,true);
 assert.equal(e.card(x).manaValue,1);
 assert.deepEqual(e.manaColors(e.card(x)).sort(),['水','火','自然'].sort());
});

for(const [id,face] of [[JUDGMENT,0],[BRONZE,1]])test(id+' sweeps both sides at current power 3000 or less and permits stopping after one draw',()=>{
 let s=field();
 const ally=put(s,0,EXACT),enemy=put(s,1,BIG,{powerModifiers:[{amount:-3000}]}),survivor=put(s,1,EXACT,{powerModifiers:[{amount:1000}]});
 give(s,0,'deck',[BIG,HAND,SMALL]);
 play(s,id,face);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy)&&has(s,1,'battle',survivor));
 assert.equal(s.decision.task.n,2);
 s=restore(s);
 pick(s,true);
 assert.equal(s.decision.task.n,1);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.cardId),[BIG]);
});

test('Judgment counts a creature whose destruction is replaced with a mana move',()=>{
 const s=field(),broccoli=put(s,1,'dm10-035');
 play(s,JUDGMENT);
 assert.ok(has(s,1,'mana',broccoli));
 assert.ok(!has(s,1,'grave',broccoli));
 assert.equal(s.decision.task.n,1);
 pick(s,true);
 assert.equal(s.players[0].hand.length,1);
});

test('Judgment counts only direct destruction attempts, not the later loss of power',()=>{
 const s=field(),dragon=put(s,1,'dm09-019');
 for(let i=0;i<3;i++)put(s,1,SMALL);
 assert.equal(e.power(dragon,false,s),6000);
 play(s,JUDGMENT);
 assert.equal(s.decision.task.n,3);
 pick(s,null);
 drain(s);
 assert.ok(has(s,1,'grave',dragon));
 assert.equal(s.players[0].hand.length,0);
});

test('LIVE affects only the opponent and offers no draw if no opponent creature qualifies',()=>{
 for(const targets of [false,true]){
  const s=field(),ally=put(s,0,SMALL),enemy=put(s,1,targets?SMALL:BIG);
  play(s,LIVE);
  assert.ok(has(s,0,'battle',ally));
  assert.ok(has(s,1,targets?'grave':'battle',enemy));
  if(targets){assert.equal(s.decision.task.n,1);pick(s,null);}
  assert.equal(s.decision,null);
 }
});

test('Flame and Mirage S-Trigger uses the opponent-only sweep and waits to draw until a saver is resolved',()=>{
 let s=field();
 const attacker=put(s,1,BIG),ally=put(s,0,SMALL);
 const first=put(s,1,'dm31-034'),second=put(s,1,'dm31-034');
 give(s,0,'shields',[TRIGGER]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.type,'leaveReplace');
 s=restore(s);
 const saver=e.getLegalActions(s).find(a=>a.kind==='replaceUltra'&&a.uid!==s.decision.uid);
 assert.ok(saver);
 e.step(s,saver);
 if(s.decision?.type==='leaveReplace')act(s,'allowLeave');
 assert.equal(s.decision.task.n,2);
 assert.equal(s.decision.player,0);
 assert.equal(s.players[1].battle.filter(x=>[first.uid,second.uid].includes(x.uid)).length,1);
 assert.ok(has(s,0,'battle',ally));
 pick(s,true);
 pick(s,true);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.metrics[0].triggers,1);
});
