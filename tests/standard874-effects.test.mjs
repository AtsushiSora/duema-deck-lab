import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const KERO='dmr04-014',FORMULA='dmr06-010',PRINT='dmex08-074',TWIN='dm22ex1-059',ONI='dmr06-048';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',DARK='dm01-090';
const MULTI='dmr04-012',ALT_MULTI='dmr04-048',EVO='dmr05-017',RAMP='dmr01-040',DRAW='dmex13-067';
const SEED='dmsd20-016',KALEIKO='dm22ex1-086';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
  give(s,p,'mana',[...Array(7).fill(WATER),LIGHT,DARK,FIRE,SMALL]);
 }
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
const restore=s=>JSON.parse(JSON.stringify(s));
function charge(s,id){
 const x=add(s,s.active,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 874 verifies three full definitions and aliases only the single-face Formula reprint',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-874.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KERO,FORMULA,ONI]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[PRINT,FORMULA]]);
 assert.deepEqual(registry.resolveRows([{id:PRINT,count:1},{id:FORMULA,count:3},{id:TWIN,count:1}]),
  [{id:FORMULA,count:4},{id:TWIN,count:1}]);
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:874}),m.cards[1].spec);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:874}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:873}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:874}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Kerodis enters mana tapped and can block normally',()=>{
 const s=field(),kerodis=charge(s,KERO);
 assert.equal(s.players[0].mana.at(-1).uid,kerodis.uid);
 assert.equal(s.players[0].mana.at(-1).tapped,true);
 const blocker=add(s,1,'battle',KERO),attacker=add(s,0,'battle',FIRE);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.equal(s.players[1].battle[0].tapped,true);
});

test('Kerodis chooses a non-evolution creature from either side before choosing its destination',()=>{
 for(const [owner,destination] of [[1,'grave'],[0,'hand'],[1,'shields']]){
  let s=field();
  const source=add(s,0,'battle',KERO),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',FIRE);
  add(s,1,'battle',EVO);
  add(s,1,'battle',SEED);
  const charged=charge(s,MULTI);
  assert.ok(charged.tapped);
  assert.equal(s.decision.task.op,'g34_SpaceCharge454');
  act(s,'extended',a=>Array.isArray(values(s)[a.choice]));
  assert.deepEqual(new Set(values(s)),new Set([source.uid,ally.uid,enemy.uid]));
  const target=owner===0?ally:enemy;
  pick(s,target);
  assert.deepEqual(values(s),['grave','hand','shields']);
  s=restore(s);
  pick(s,destination);
  assert.ok(has(s,owner,destination,target)&&!has(s,owner,'battle',target));
  if(destination==='shields')assert.ok(!s.players[owner].shields.at(-1).faceUp);
 }
});

test('Kerodis reacts once per actual multicolor mana addition and can decline each trigger',()=>{
 const s=field(),kerodis=add(s,0,'battle',KERO);
 charge(s,SMALL);
 assert.equal(s.decision,null);
 give(s,0,'deck',[MULTI,ALT_MULTI,SMALL,SMALL]);
 cast(s,RAMP);
 const charged=s.players[0].mana.slice(-2);
 assert.deepEqual(charged.map(x=>x.cardId),[MULTI,ALT_MULTI]);
 pick(s,kerodis);
 for(let i=0;i<2;i++){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===kerodis.cardId);
  assert.equal(s.decision.task.op,'g34_SpaceCharge454');
  pick(s,null);
 }
 assert.equal(s.decision,null);

 const redirected=field();
 add(redirected,0,'battle',KERO);
 add(redirected,1,'battle',KALEIKO);
 give(redirected,0,'deck',[MULTI,ALT_MULTI,SMALL,SMALL]);
 cast(redirected,RAMP);
 assert.ok(redirected.players[0].grave.some(x=>x.cardId===MULTI));
 assert.equal(redirected.decision,null);
});

test('Formula wins only on its own end with at least ten cards and a tapped live source',()=>{
 for(const [tapped,count,active,won] of [[true,10,0,true],[true,11,0,true],[false,10,0,false],[true,9,0,false],[true,10,1,false]]){
  const s=field();
  s.active=active;
  add(s,0,'battle',FORMULA,{tapped});
  give(s,0,'hand',Array(count).fill(SMALL));
  end(s);
  drain(s);
  assert.equal(s.winner,won?0:null);
 }
});

test('Formula checks the hand after a preceding end effect draws the tenth card (QA 36638)',()=>{
 for(const drawFirst of [true,false]){
  let s=field();
  add(s,0,'battle',FORMULA,{tapped:true});
  add(s,0,'battle',DRAW);
  give(s,0,'hand',Array(9).fill(SMALL));
  end(s);
  assert.equal(s.decision.type,'effectOrder');
  s=restore(s);
  act(s,'orderEffect',a=>a.cardId===(drawFirst?DRAW:FORMULA));
  drain(s);
  assert.equal(s.players[0].hand.length,10);
  assert.equal(s.winner,drawFirst?0:null);
 }
});

test('Formula breaks two shields and wins at end when its attack leaves it tapped',()=>{
 const s=field(),source=add(s,0,'battle',FORMULA);
 give(s,0,'hand',Array(10).fill(SMALL));
 attack(s,source.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.winner,null);
 end(s);
 assert.equal(s.winner,0);
});

test('Oninobushi destroys one opposing creature strictly below its current power',()=>{
 for(const boosted of [false,true]){
  const s=field();
  const oni=add(s,0,'hand',ONI);
  const lower=add(s,1,'battle','dm01-055',{powerModifiers:[{amount:500,expires:'end',who:0}]});
  const equal=add(s,1,'battle',SMALL);
  const higher=add(s,1,'battle',FIRE,{powerModifiers:[{amount:500,expires:'end',who:0}]});
  add(s,0,'battle',SMALL);
  add(s,1,'battle',SEED);
  if(boosted)add(s,0,'battle','dmx12b-002');
  act(s,'play',a=>a.uid===oni.uid);
  assert.deepEqual(values(s),boosted?[lower.uid,equal.uid]:[lower.uid]);
  const target=boosted?equal:lower;
  pick(s,target);
  assert.ok(has(s,1,'grave',target)&&has(s,1,'battle',higher));
 }
});
