import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards,shieldGroup} from '../dist/shield-state.js';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const DELETE='dmx21-026',GALAXY='dm28-002',DARTS='dm12-007',DOKINDAM='dmr19-fl01';
const NATURE='dm01-108',FIRE='dm01-097',SURFER='dm05-024';
const read=file=>JSON.parse(readFileSync(new URL('../tools/'+file,import.meta.url)));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===(v?.uid??v);
});
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}

test('the print IDs from all seven official products resolve to one All Delete definition',()=>{
 const manifest=read('support-phase-1347.json'),refs=read('image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details),[primary]=manifest.cards;
 assert.equal(primary.id,DELETE);
 assert.equal(manifest.printAliases.length,7);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(primary.name)).map(c=>c.id),[DELETE]);
 const c=e.card(DELETE);
 assert.deepEqual([c.cost,c.type,c.civilizations,c.limit,c.manaValue],[11,'spell',['闇'],4,1]);
 for(const row of [primary,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:DELETE,count:1}]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
 }
});

test('All Delete sweeps hand, battle including layers, shields and grave, retaining mana and ownership',()=>{
 const s=field();
 const spell=add(s,0,'hand',DELETE),mater=add(s,1,'battle',NATURE),base=inst(FIRE);
 const stolen=add(s,1,'hand',FIRE,{cardOwner:0});
 const grave=add(s,0,'grave',FIRE,{cardOwner:1});
 const shield=s.players[0].shields[0],stack=inst(SURFER);
 mater.under=[base];
 shield.shieldStack=[stack];
 add(s,1,'battle',FIRE);
 const manaCounts=s.players.map(p=>p.mana.length),all=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'deck',stolen)&&has(s,1,'deck',grave)&&has(s,1,'deck',base)&&has(s,0,'deck',stack));
 for(const p of [0,1]){
  assert.equal(s.players[p].hand.length,0);
  assert.equal(s.players[p].battle.length,0);
  assert.equal(s.players[p].shields.length,0);
  assert.equal(s.players[p].mana.length,manaCounts[p]);
 }
 assert.ok(has(s,0,'grave',spell));
 assert.deepEqual(physical(s),all);
});

test('All Delete evaluates active Shield Force against the original shield (QA37768)',()=>{
 for(const shieldForce of [true,false]){
  const s=field(),shield=s.players[0].shields[0],opposing=add(s,1,'battle',FIRE);
  cast(s,GALAXY);
  pick(s,shieldForce?shield:null);
  const galaxy=s.players[0].battle[0];
  assert.equal(!!e.effectiveCard(galaxy,s).g1304ShieldForceActive,shieldForce);
  cast(s,DELETE);
  drain(s);
  assert.ok(has(s,0,'deck',shield)&&has(s,1,'deck',opposing));
  assert.equal(has(s,0,'battle',galaxy),shieldForce);
  assert.equal(has(s,0,'deck',galaxy),!shieldForce);
  if(shieldForce)assert.ok(!e.effectiveCard(galaxy,s).g1304ShieldForceActive);
 }
});

test('the shield-cast All Delete and the resolving Lucky Darts stay pending until resolution (QA39786)',()=>{
 const s=field(),deleteSpell=inst(DELETE),darts=add(s,0,'hand',DARTS);
 s.players[0].shields=[deleteSpell];
 const all=physical(s);
 act(s,'play',a=>a.uid===darts.uid);
 if(s.decision?.player===1)pick(s,shieldGroup(deleteSpell));
 if(s.decision?.choices.some(c=>c.value===true))pick(s,true);
 else drain(s);
 assert.equal(s.players[0].shields.flatMap(shieldCards).length,0);
 assert.ok(has(s,0,'grave',deleteSpell)&&has(s,0,'grave',darts));
 assert.ok(!has(s,0,'deck',deleteSpell)&&!has(s,0,'deck',darts));
 assert.deepEqual(physical(s),all);
});

test('All Delete moves the last seal, then releases the surviving Dokindam',()=>{
 const s=field();s.format='advance';
 const forbidden=add(s,1,'battle',DOKINDAM);
 const seal=inst(NATURE);
 seal.sealOf=forbidden.uid;
 s.players[1].seals=[seal];
 assert.ok(e.card(forbidden)?.startCard);
 cast(s,DELETE);
 drain(s);
 assert.ok(has(s,1,'deck',seal)&&has(s,1,'battle',forbidden));
 assert.equal(forbidden.startFlipped,true);
});
