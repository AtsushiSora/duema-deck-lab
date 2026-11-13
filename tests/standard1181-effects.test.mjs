import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const {cards,printAliases,regulationVerification}=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1181.json',import.meta.url)));
const KOJIRO='dmex08-157',GORILLA='dmex03-025',NO_DATA='dmx21-064';
const NATURE='dm01-108',LIGHT='dm01-075',WATER='dm01-083',LIFE='dm06-110';
const BIG='dm01-s01',TARGET='dm08-049';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const values=s=>(s.decision?.choices||[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const finishTurn=s=>{s.phase='attack';act(s,'endTurn');};
const save=s=>JSON.parse(JSON.stringify(s));
function field(p=0){
 const s=setup();s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(NATURE));
 return s;
}

test('the five official prints map to three names with verified stats, images and limits',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(fs.readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of [...cards,...printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1181}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(f.name)).map(x=>x.id),[id]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(c.power,Number(f.powerText));
  assert.equal(c.cost,f.cost);
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  const bad=structuredClone(row);bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec({...bad,status:'complete'},{phase:1181}));
 }
});

test('Kojiro applies ten mandatory selections at the two-shield boundary, rechecking each target',()=>{
 let s=field();
 give(s,0,'shields',[LIGHT,LIGHT]);
 const weak=add(s,1,'battle',WATER),large=add(s,1,'battle',BIG),ally=add(s,0,'battle',LIGHT);
 const seed=add(s,1,'battle','dm22ex1-086'),source=add(s,0,'hand',KOJIRO);
 play(s,source);
 assert.deepEqual(values(s),[weak.uid,large.uid]);
 pick(s,weak.uid);
 assert.ok(s.players[1].grave.includes(weak));
 s=save(s);
 const remaining=s.players[1].battle.find(x=>x.uid===large.uid);
 for(let i=1;i<=9;i++){
  assert.deepEqual(values(s),[large.uid]);
  pick(s,large.uid);
  assert.equal(e.power(remaining,false,s),9500-i*1000);
 }
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.some(x=>x.uid===ally.uid));
 assert.ok(s.players[1].battle.some(x=>x.uid===seed.uid));
 finishTurn(s);
 assert.equal(e.power(remaining,false,s),9500);
});

test('Kojiro has no trigger at three shields and completes if no target remains',()=>{
 for(const shields of [0,3]){
  const s=field(),weak=add(s,1,'battle',WATER),x=add(s,0,'hand',KOJIRO);
  give(s,0,'shields',Array(shields).fill(LIGHT));
  play(s,x);
  if(!shields)pick(s,weak.uid);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].battle.includes(weak),shields===3);
 }
});

test('Mana Gorilla selects only natural creatures in mana, including tapped ones, and adds four tapped cards',()=>{
 const s=field(),x=add(s,0,'hand',GORILLA),base=add(s,0,'mana',NATURE);
 base.tapped=true;
 const miss=[add(s,0,'mana',LIFE),add(s,0,'mana',LIGHT),add(s,0,'battle',NATURE)];
 const deck=s.players[0].deck.slice(0,4),count=s.players[0].mana.length;
 play(s,x);
 const bases=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid);
 assert.ok(bases.includes(base.uid)&&miss.every(y=>!bases.includes(y.uid)));
 act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.equal(x.tapped,false);
 assert.deepEqual(x.under.map(y=>y.uid),[base.uid]);
 assert.equal(s.players[0].mana.length,count-1+4);
 assert.ok(deck.every(y=>s.players[0].mana.includes(y)&&y.tapped));
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Mana Gorilla cannot be summoned with only natural spells and off-civilization creatures for bases',()=>{
 const s=field(),x=add(s,0,'hand',GORILLA);
 give(s,0,'mana',[LIFE,LIFE,LIFE,LIGHT,LIGHT,WATER,WATER,WATER]);
 add(s,0,'battle',NATURE);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
});

test('No Data adds one mandatory draw on its own turn only',()=>{
 const s=field(1),x=add(s,0,'battle',NO_DATA),deck=s.players[0].deck.slice(0,2);
 finishTurn(s);drain(s);
 assert.equal(s.active,0);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),deck.map(y=>y.uid));
 assert.ok(s.players[0].battle.includes(x));
});

for(const selected of ['old','new','decline']){
 test('No Data may exchange an old or new face-down shield at end of its turn '+selected,()=>{
  let s=field();
  add(s,0,'battle',NO_DATA);
  const offer=add(s,0,'hand',LIFE);
  give(s,0,'shields',[LIFE,LIGHT]);
  const old=s.players[0].shields[0];
  finishTurn(s);
  assert.equal(s.decision.source,NO_DATA);
  pick(s,selected==='decline'?null:offer.uid);
  if(selected!=='decline'){
   assert.ok(s.players[0].shields.some(y=>y.uid===offer.uid&&!y.faceUp));
   s=save(s);
   pick(s,selected==='old'?old.uid:offer.uid);
  }
  assert.ok(s.players[0].hand.some(y=>y.uid===(selected==='old'?old.uid:offer.uid)));
  assert.equal(s.players[0].shields.length,2);
  assert.equal(s.metrics[0].triggers,0);
  assert.equal(s.decision,null);
 });
}

test('No Data still recovers a shield after a prevented shield placement under QA40275',()=>{
 const s=field(),x=add(s,0,'battle',NO_DATA),offer=add(s,0,'hand',WATER);
 add(s,1,'battle','dmrp22-037');
 give(s,0,'shields',[LIFE]);give(s,1,'shields',[LIGHT]);
 const old=s.players[0].shields[0];
 assert.equal(e.canAddShield(s,0),false);
 finishTurn(s);
 assert.equal(s.decision.source,x.cardId);
 pick(s,offer.uid);pick(s,old.uid);
 assert.equal(s.players[0].shields.length,0);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),[offer.uid,old.uid]);
 assert.equal(s.metrics[0].triggers,0);
});

test('No Data skips its optional exchange with an empty hand or during the other player turn',()=>{
 const s=field(1);
 add(s,0,'battle',NO_DATA);
 finishTurn(s);assert.equal(s.decision,null);
 give(s,0,'hand',[]);
 finishTurn(s);assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,5);
});
