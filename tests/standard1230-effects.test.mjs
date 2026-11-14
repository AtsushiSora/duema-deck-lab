import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BAJURA='dm15-s04',NORA='dm23rp1-062',DEKA='dm23rp1-025',TIDE='dm23rp1-026';
const N='dm01-108',W='dm01-083',L='dm01-075',F='dm01-097',D='dm01-090',HIGH='dm01-s01';
const LAL='dm29-001',TRAINING='dmrp22-040',ABYSS='dm23rp2-039',RUSH='dm23sp1-013',SEVEN='dmr01-066';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(17).fill(N));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const pays=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const action=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid);
function cross(s,gear,host){act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('eight official prints preserve the three canonical records and their abilities',()=>{
 const m=read('tools/support-phase-1230.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[BAJURA,NORA,DEKA]);
 assert.deepEqual(m.printAliases.map(c=>c.canonicalId),[BAJURA,BAJURA,NORA,NORA,NORA]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1230}),row.spec);
  const changed=structuredClone(parsed);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1230}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,+f.powerText,f.race,f.civilizations,1,4]);
  if(!row.canonicalId){assert.equal(CARD_IMAGES[id],row.image);assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);}
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Bajura generates and crosses for 5 mana each, then moves two cards to their owners’ graves',()=>{
 const s=field(),host=add(s,0,'battle',N),other=add(s,0,'battle',F),gear=add(s,0,'hand',BAJURA);
 const [enemyCard,ownCard]=[add(s,1,'mana',L),add(s,1,'mana',W,{cardOwner:0})];
 const power=e.power(host,false,s);
 act(s,'play',a=>a.uid===gear.uid);
 assert.equal(pays(s,0),5);
 assert.equal(e.power(host,false,s),power);
 cross(s,gear,host);
 assert.equal(pays(s,0),10);
 assert.equal(e.power(host,false,s),power+2000);
 assert.equal(e.effectiveCard(host,s).extraBreak,1);
 assert.equal(e.effectiveCard(other,s).extraBreak??0,0);
 attack(s,host.uid);pick(s,enemyCard.uid);pick(s,ownCard.uid);drain(s);
 assert.ok(has(s,1,'grave',enemyCard)&&has(s,0,'grave',ownCard));
 assert.equal(s.players[1].shields.length,3);
});

test('Bajura gives Tidal & Burn a second effect break on either player’s spell (QA43337)',()=>{
 for(const caster of [0,1]){
  const s=field(),tide=add(s,0,'battle',TIDE),gear=add(s,0,'battle',BAJURA);
  cross(s,gear,tide);s.active=caster;
  const [one,two,...rest]=s.players[1].shields;
  cast(s,'dm36-086');pick(s,1);pick(s,one.uid);pick(s,two.uid);drain(s);
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),rest.map(x=>x.uid));
  assert.ok(has(s,1,'hand',one)&&has(s,1,'hand',two));
 }
});

test('Bajura mana loss belongs to the gear and can be declined under repeated creature triggers',()=>{
 const s=field(),attacker=add(s,0,'battle','dmrp20-026'),gear=add(s,0,'battle',BAJURA);
 cross(s,gear,attacker);cast(s,TRAINING);pick(s,attacker.uid);
 const mana=s.players[1].mana.map(x=>x.uid);
 attack(s,attacker.uid);
 assert.equal(s.pendingEffects.filter(x=>x.source===BAJURA).length,1);
 assert.equal(s.pendingEffects.filter(x=>x.source===attacker.cardId).length,2);
 act(s,'orderEffect',a=>a.cardId===BAJURA);
 pick(s,null);drain(s);
 assert.deepEqual(s.players[1].mana.map(x=>x.uid),mana);
 assert.equal(s.players[0].hand.length,2);
});

test('Lal Absorber limits a crossed creature’s attack to one shield (QA35676)',()=>{
 const s=field(),attacker=add(s,0,'battle',N),gear=add(s,0,'battle',BAJURA);
 add(s,1,'battle',LAL);cross(s,gear,attacker);
 attack(s,attacker.uid);pick(s,null);
 act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Noratep slays a stronger creature in battle',()=>{
 const s=field(),nora=add(s,0,'battle',NORA),enemy=add(s,1,'battle',HIGH,{tapped:true});
 attack(s,nora.uid,enemy.uid);drain(s);
 assert.ok(has(s,0,'grave',nora)&&has(s,1,'grave',enemy));
});

test('Noratep may save the Abyss discount for a later spell or an Abyss Rush summon',()=>{
 for(const origin of ['hand','grave']){
  const s=field(),nora=add(s,0,'battle',NORA),first=add(s,0,'hand',ABYSS),x=add(s,0,origin,origin==='hand'?ABYSS:RUSH);
  const full=e.card(first).cost,c=e.card(x);
  act(s,'play',a=>a.uid===first.uid);pick(s,null);
  if(s.decision)pick(s,null);
  drain(s);assert.equal(pays(s,0),full);
  assert.equal(action(s,x)?.cost,c.cost-1);
  act(s,'play',a=>a.uid===x.uid&&(a.origin??'hand')===origin);
  pick(s,choices(s).find(v=>String(v).startsWith(nora.uid+'@')));pick(s,null);
  if(s.decision&&origin==='hand')pick(s,null);
  drain(s);
  assert.equal(pays(s,0),full+c.cost-1);
  assert.equal(action(s,add(s,0,'hand',ABYSS)).cost,full);
 }
});

test('casting Deka from hand grants the power and player restriction through the opposing turn',()=>{
 const s=field(),target=add(s,1,'battle',N),natural=add(s,0,'mana',SEVEN),power=e.power(target,false,s);
 cast(s,DEKA);pick(s,target.uid);drain(s);
 assert.ok(has(s,0,'mana',natural));
 assert.equal(e.power(target,false,s),power+4000);
 assert.equal(e.effectiveCard(target,s).noPlayerAttack,true);
 end(s);
 assert.equal(e.power(target,false,s),power+4000);
 assert.equal(e.effectiveCard(target,s).noPlayerAttack,true);
 end(s);
 assert.equal(e.power(target,false,s),power);
 assert.ok(!e.effectiveCard(target,s).noPlayerAttack);
});

for(const double of [false,true])test('Deka trigger deploys a natural cost-7 creature only on the second actual break '+double,()=>{
 const s=field(1),target=add(s,1,'battle',double?HIGH:N);
 give(s,0,'shields',[DEKA,N,N,N,N]);give(s,0,'mana',[]);
 const shield=s.players[0].shields[0],legal=add(s,0,'mana',SEVEN);
 add(s,0,'mana',HIGH);add(s,0,'mana','dmrp09-097');
 s.phase='attack';act(s,'attack',a=>a.uid===target.uid&&(double||a.shield===shield.uid));
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,target.uid);
 if(double){assert.deepEqual(choices(s),[legal.uid]);pick(s,legal.uid);}
 drain(s);
 assert.equal(has(s,0,'battle',legal),double);
 assert.equal(s.players[0].brokenThisTurn,double?2:1);
});
