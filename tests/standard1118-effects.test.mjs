import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KING='dm28-004',SHOW='dmr20-015',GATE='dmex17-056';
const ETERNAL='dm25ex2-082',BULLET='dm29-047',OPEN='dm28-085';
const LOW='dm01-108',HADES='dmex13-s06',WATER='dm01-083',BRAIN='dm01-052';
const value=x=>x.value?.uid??x.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function cast(s,id,cost){
 const x=add(s,0,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(cost===undefined||a.cost===cost));
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const castCount=(s,id)=>s.metrics[0].played[id];

test('three verified official definitions and a reprint preserve the canonical card identities',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1118.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1118}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1118}));
 }
 assert.deepEqual(registry.resolveRows([{id:'dmex13-027',count:1}]),[{id:SHOW,count:1}]);
 assert.notEqual(registry.get(SHOW).id,registry.get('dm25ex2-043').id);
});

test('standalone Show Time uses the shared thresholds and its own spell identity',()=>{
 const s=setup(),low=add(s,0,'hand',LOW),high=add(s,0,'hand',HADES),enemy=add(s,1,'hand',HADES);
 const spell=cast(s,SHOW,8);
 assert.equal(s.decision.player,1);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'battle',enemy));
 assert.ok(!choices(s).includes(low.uid));
 pick(s,high.uid);
 assert.ok(has(s,0,'battle',high)&&has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
});

test('standalone Show Time allows a free summon if the opponent puts nothing out',()=>{
 const s=setup(),low=add(s,0,'hand',LOW);
 cast(s,SHOW);
 pick(s,low.uid);
 assert.ok(has(s,0,'battle',low));
});

test('Greatest Gate revives Maximilian and then uses both additional effects (QA 40362)',()=>{
 let s=setup();
 const king=add(s,0,'grave',KING),first=add(s,0,'grave',LOW),second=add(s,0,'grave',WATER);
 const evolution=add(s,0,'grave','dm02-s01');
 const spell=cast(s,GATE,7);
 assert.ok(!choices(s).includes(evolution.uid));
 pick(s,king.uid);
 assert.ok(has(s,0,'battle',king));
 assert.match(s.decision.title,/ナイト・マジック/);
 pick(s,true);
 pick(s,first.uid);
 assert.match(s.decision.title,/マクシミリアン王/);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 pick(s,second.uid);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'battle',second)&&has(s,0,'grave',spell));
 assert.ok(has(s,0,'grave',evolution));
 assert.equal(s.decision,null);
 assert.equal(castCount(s,GATE),1);
});

test('Greatest Gate counts creatures for its discount and offers no extra use without a Knight',()=>{
 const s=setup();
 add(s,0,'battle',LOW);
 const first=add(s,0,'grave',WATER),second=add(s,0,'grave',LOW);
 cast(s,GATE,8);
 pick(s,first.uid);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'grave',second));
 assert.equal(s.decision,null);
});

test('two Maximilians add independent uses to the single normal Knight Magic repeat',()=>{
 const s=setup();
 add(s,0,'battle',KING);
 add(s,0,'battle',KING);
 add(s,1,'battle',KING);
 cast(s,OPEN);
 pick(s,1);
 assert.match(s.decision.title,/ナイト・マジック/);
 pick(s,true);
 pick(s,1);
 for(let i=0;i<2;i++){
  assert.match(s.decision.title,/マクシミリアン王/);
  pick(s,true);
  pick(s,1);
 }
 assert.equal(s.players[0].hand.length,4);
 assert.equal(castCount(s,OPEN),1);
 assert.equal(s.decision,null);
});

test('Maximilian can repeat a Knight spell without Knight Magic and can decline',()=>{
 for(const repeat of [true,false]){
  const s=setup();
  add(s,0,'battle',KING);
  const before=s.players[0].mana.length;
  const ramp='dm25ex2-104';
  cast(s,ramp);
  assert.match(s.decision.title,/マクシミリアン王/);
  pick(s,repeat?true:null);
  assert.equal(s.players[0].mana.length,before+(repeat?2:1));
  assert.equal(castCount(s,ramp),1);
 }
});

test('Maximilian stacks with King Knight Magic without repeating its multiplier',()=>{
 const s=setup();
 add(s,0,'battle',KING);
 give(s,1,'hand',Array(5).fill(LOW));
 cast(s,ETERNAL);
 pick(s,0);
 assert.match(s.decision.title,/キング・ナイト・マジック/);
 pick(s,1);
 pick(s,0);
 assert.match(s.decision.title,/マクシミリアン王/);
 pick(s,true);
 pick(s,0);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(castCount(s,ETERNAL),1);
 assert.equal(s.decision,null);
});

test('Bullet Vice is cast once through all three discards under the J Journey limit (QA 40162)',()=>{
 const s=setup();
 add(s,0,'battle',KING);
 add(s,1,'battle','dmex12-s03');
 give(s,1,'hand',Array(4).fill(LOW));
 cast(s,BULLET);
 for(let i=0;i<3;i++){
  if(i)pick(s,true);
  assert.equal(s.decision.player,1);
  pick(s,choices(s)[0]);
 }
 assert.equal(s.players[1].hand.length,1);
 assert.equal(castCount(s,BULLET),1);
 const another=add(s,0,'hand',BRAIN);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===another.uid),false);
});

test('an opposing or sealed Maximilian and a non-Knight spell offer no additional effect',()=>{
 const s=setup();
 add(s,1,'battle',KING);
 const sealed=add(s,0,'battle',KING);
 s.players[0].seals.push({...inst(LOW),sealOf:sealed.uid,faceDown:true});
 cast(s,OPEN);
 pick(s,0);
 assert.equal(s.decision,null);
 add(s,0,'battle',KING);
 cast(s,BRAIN);
 drain(s);
 assert.equal(castCount(s,BRAIN),1);
 assert.equal(s.decision,null);
});
