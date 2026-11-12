import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GRAN='dm24-035',THUNDER='dm25-s05',ZEPHYR='promoy4-011';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-095',MIXED='dmrp13-090';
const BLOCKER='dm01-076',SIX='dm01-s04',HIGH='dm01-s06',KAISER='dmr02-s03';
const BIRD='dm16-050',GEAR='dm14-110',HIDDEN='dmrp09-s02';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}
function finishAttack(s,count){
 noBlock(s);
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===count);
 drain(s);
}
function evolve(s,source,base){
 act(s,'play',a=>a.uid===source.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
}

test('Six official prints resolve to the three canonical battle IDs',()=>{
 const manifest=read('tools/support-phase-1078.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 const ids=[GRAN,THUNDER,ZEPHYR];
 assert.deepEqual(manifest.cards.map(c=>c.id),ids);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dmc44-030','dmc55-026','dmc66-023']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],main=manifest.cards.find(c=>c.id===id);
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1078}),main.spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(images.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
 for(const id of ids)assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(e.card(id).name)).map(c=>c.id),[id]);
});

test('Gran Belze names a civilization before the reveal, discards every matching card and privately inspects exact shield groups',()=>{
 let s=field();
 const gran=add(s,0,'battle',GRAN),[kept,first,mixed]=give(s,1,'hand',[WATER,FIRE,MIXED]);
 const [shield]=give(s,0,'shields',[HIDDEN,NATURE,NATURE]);
 shield.shieldStack=[inst(WATER)];
 const second=s.players[0].shields[1],all=physical(s);
 attack(s,gran.uid);
 noBlock(s);
 assert.deepEqual(s.decision.choices.map(o=>o.value),['光','水','闇','火','自然']);
 assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===GRAN));
 pick(s,'火');
 assert.ok(s.log.some(l=>l.type==='reveal'&&l.cardId===GRAN));
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',mixed)&&has(s,1,'hand',kept));
 assert.equal(s.decision.task.n,2);
 assert.ok(!JSON.stringify(s.decision).includes(HIDDEN));
 pick(s,shield.uid);
 assert.ok(!s.decision.choices.some(o=>o.value===shield.uid||o.value===null));
 assert.ok(!JSON.stringify(s.decision).includes(HIDDEN));
 s=JSON.parse(JSON.stringify(s));
 pick(s,second.uid);
 assert.deepEqual(s.decision.task.g585Peek.map(o=>o.id),[HIDDEN,WATER,NATURE]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(HIDDEN));
 pick(s,null);
 finishAttack(s,2);
 assert.equal(s.metrics[0].breaks,2);
 assert.deepEqual(physical(s),all);
});

test('Gran Belze counts actual discards after a replacement and can decline the shield inspection',()=>{
 const s=field(),gran=add(s,0,'battle',GRAN);
 const [kaiser,fire]=give(s,1,'hand',[KAISER,FIRE]);
 attack(s,gran.uid);
 noBlock(s);
 pick(s,'火');
 if(s.decision?.task?.op==='discardChosen')pick(s,true);
 assert.ok(has(s,1,'battle',kaiser)&&has(s,1,'grave',fire));
 assert.equal(s.decision.task.n,1);
 pick(s,null);
 finishAttack(s,2);
 assert.ok(!s.log.some(l=>l.type==='look'&&l.cardId===GRAN));
});

test('Violence Thunder uses the optional sequence as a whole and discards only the original hand before breaking',()=>{
 for(const accept of [false,true]){
  const s=field(),source=add(s,0,'hand',THUNDER),base=add(s,0,'battle',MIXED);
  add(s,0,'battle',NATURE);
  const target=add(s,1,'battle',SIX),large=add(s,1,'battle',HIGH);
  const oldHand=[...give(s,1,'hand',[WATER,FIRE,NATURE])],oldDeck=s.players[0].deck.length;
  const all=physical(s);
  evolve(s,source,base);
  attack(s,source.uid);
  noBlock(s);
  assert.equal(s.decision.task.op,'g34_Offer');
  pick(s,accept?true:null);
  if(accept){
   assert.equal(s.players[0].deck.length,oldDeck-3);
   assert.ok(oldHand.every(x=>has(s,1,'grave',x)));
   assert.equal(s.players[1].shields.length,5);
   assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[target.uid]);
   pick(s,target.uid);
  }else{
   assert.equal(s.players[0].deck.length,oldDeck);
   assert.ok(oldHand.every(x=>has(s,1,'hand',x)));
  }
  assert.equal(has(s,1,'grave',target),accept);
  assert.ok(has(s,1,'battle',large));
  finishAttack(s,3);
  assert.equal(s.metrics[0].breaks,3);
  assert.equal(s.players[1].hand.length,accept?3:6);
  assert.deepEqual(physical(s),all);
 }
});

test('Violence Thunder completes the draw and available discards even when no creature can be destroyed',()=>{
 const s=field(),source=add(s,0,'battle',THUNDER,{under:[inst(MIXED)]});
 const large=add(s,1,'battle',HIGH),hand=[...give(s,1,'hand',[WATER,FIRE])];
 attack(s,source.uid);
 noBlock(s);
 pick(s,true);
 finishAttack(s,3);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(hand.every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,1,'battle',large));
 assert.equal(s.metrics[0].breaks,3);
});

test('Zephyr grants speed only to its controller’s creatures present when its Accel ability resolves',()=>{
 for(const mode of ['crossed','no gear','blocked']){
  const s=field(),source=add(s,0,'hand',ZEPHYR),base=add(s,0,'battle',BIRD);
  const ally=add(s,0,'battle',NATURE,{entered:s.turn}),gear=add(s,0,'battle',GEAR);
  const enemy=add(s,1,'battle',BLOCKER);
  evolve(s,source,base);
  if(mode!=='no gear')act(s,'crossGear',a=>a.uid===gear.uid&&a.target===source.uid);
  attack(s,source.uid);
  if(mode==='blocked')act(s,'block',a=>a.uid===enemy.uid);
  finishAttack(s,mode==='blocked'?0:2);
  assert.equal(!!e.effectiveCard(ally,s).speedAttacker,mode==='crossed',mode);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ally.uid),mode==='crossed',mode);
  assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
  const later=add(s,0,'battle',NATURE,{entered:s.turn});
  assert.ok(!e.effectiveCard(later,s).speedAttacker);
  act(s,'endTurn');
  drain(s);
  assert.ok(!e.effectiveCard(ally,s).speedAttacker);
 }
});
