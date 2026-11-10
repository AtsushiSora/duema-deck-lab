import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PRIN='dmr06-017',SCREAM='dmr09-007',YARA='dmr06-020';
const SMALL='dm01-108',WATER='dm01-083',SEED='dmsd20-016';
const GUARD='dm02-038',EVO='dm02-021',BLOCKER='dm01-076',APOC='dm14-015';
const BOUNCE='dm01-086',DEMON='dm01-027',FUJIN='dmrp22-037',BIG='dm01-s01';
const REPRINTS=['dmx25-033','dmx12b-080','promoy11-034'];

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 877 uses three verified original card IDs and full official definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-877.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PRIN,SCREAM,YARA]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),REPRINTS.map(id=>[id,PRIN]));
 assert.deepEqual(registry.resolveRows([{id:PRIN,count:1},...REPRINTS.map(id=>({id,count:1}))]),[{id:PRIN,count:4}]);
 for(const row of m.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:877}),m.cards[0].spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:877}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:876}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:877}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});




test('Princess Prin grants both races only to allied creatures and the grants end when she leaves',()=>{
 const s=field(),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',WATER);
 const seed=add(s,0,'battle',SEED),prin=add(s,0,'hand',PRIN);
 const reserve=add(s,0,'hand',SMALL);
 act(s,'play',a=>a.uid===prin.uid);
 assert.deepEqual(e.effectiveCard(ally,s).race.split('/'),['ビーストフォーク','ハンター','エイリアン']);
 assert.equal(e.effectiveCard(prin,s).race,'ハンター/エイリアン');
 for(const x of [enemy,seed,reserve])assert.doesNotMatch(e.effectiveCard(x,s).race,/ハンター|エイリアン/);
 s.active=1;
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets[0].uid===prin.uid);
 assert.ok(has(s,0,'hand',prin));
 assert.equal(e.effectiveCard(ally,s).race,'ビーストフォーク');
});

test('Princess Prin counts herself and the allied Hunter she grants for Hunting only during a battle',()=>{
 for(const boosted of [false,true]){
  const s=field(),prin=add(s,0,'battle',PRIN),enemy=add(s,1,'battle',BIG,{tapped:true,
   powerModifiers:[{amount:-3000,expires:'end',who:0}]});
  assert.equal(e.power(enemy,false,s),6500);
  if(boosted)add(s,0,'battle',SMALL);
  add(s,1,'battle',YARA);
  assert.equal(e.power(prin,true,s),5000);
  attack(s,prin.uid,enemy.uid);
  act(s,'noBlock');
  assert.equal(has(s,0,'battle',prin),boosted);
  assert.equal(has(s,1,'grave',enemy),boosted);
 }
});

test('Scream mills three and destroys the actual unblocked attacker before it breaks shields',()=>{
 for(const shields of [0,5]){
  const s=field(),scream=add(s,1,'battle',SCREAM);
  const attacker=add(s,0,'battle',SMALL,{justDiverActive:true});
  give(s,1,'shields',Array(shields).fill(SMALL));
  const milled=s.players[1].deck.slice(0,3).map(x=>x.uid);
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.deepEqual(s.players[1].grave.map(x=>x.uid),milled);
  assert.ok(has(s,0,'grave',attacker)&&has(s,1,'battle',scream));
  assert.equal(s.players[1].shields.length,shields);
  assert.equal(s.attack,null);
  assert.equal(s.winner,null);
 }
});

test('Scream uses normal destruction replacements before a surviving attacker breaks shields',()=>{
 const s=field(),attacker=add(s,0,'battle','dm23ex2-016');
 add(s,1,'battle',SCREAM);
 const life=s.players[0].shields[0];
 attacker.exLifeShieldUid=life.uid;
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',life)&&has(s,0,'battle',attacker));
 assert.equal(s.players[1].deck.length,9);
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
});

test('Scream does not react to a blocked attack or an attack against a creature',()=>{
 for(const target of ['player','creature']){
  const s=field(),attacker=add(s,0,'battle',SMALL);
  const defender=add(s,1,'battle',BLOCKER,{tapped:target==='creature'});
  add(s,1,'battle',SCREAM);
  attack(s,attacker.uid,target==='player'?'player':defender.uid);
  if(target==='player')act(s,'block',a=>a.uid===defender.uid);
  else act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].deck.length,12);
 }
});

test('Scream still mills for each trigger after a previous copy destroys the attacker',()=>{
 let s=field();
 add(s,1,'battle',SCREAM);
 add(s,1,'battle',SCREAM);
 const attacker=add(s,0,'battle',SMALL);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===SCREAM);
 drain(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.equal(s.players[1].deck.length,6);
 assert.equal(s.players[1].shields.length,5);
});

test('Yara replaces only destruction of other allied non-evolution Guardians',()=>{
 const s=field(),yara=add(s,0,'battle',YARA),guard=add(s,0,'battle',GUARD);
 const evo=add(s,0,'battle',EVO,{under:[inst(GUARD)]}),other=add(s,0,'battle',SMALL);
 const enemy=add(s,1,'battle',GUARD);
 s.active=1;
 for(const [spell,target] of [[BOUNCE,guard],[DEMON,evo],[DEMON,other],[DEMON,yara]]){
  cast(s,spell);
  act(s,'effect',a=>a.targets[0].uid===target.uid);
 }
 assert.ok(has(s,0,'hand',guard));
 for(const x of [evo,other,yara])assert.ok(has(s,0,'grave',x));
 assert.ok(has(s,1,'battle',enemy));
 assert.equal(s.players[0].shields.length,5);
});

test('Yara shields each eligible Guardian face down in the same destruction batch',()=>{
 const s=field(),yara=add(s,0,'battle',YARA);
 const first=add(s,0,'battle',GUARD),second=add(s,0,'battle',BLOCKER);
 add(s,1,'battle',SMALL);
 const enemy=add(s,1,'battle',GUARD);
 add(s,1,'battle',WATER);
 s.active=1;
 cast(s,APOC);
 assert.ok(has(s,0,'grave',yara)&&has(s,1,'grave',enemy));
 for(const x of [first,second]){
  const shield=s.players[0].shields.find(y=>y.uid===x.uid);
  assert.ok(shield&&!shield.faceUp);
  assert.ok(!has(s,0,'grave',x));
 }
 assert.equal(s.players[0].shields.length,7);
});

test('Yara cannot create a shield when adding shields is prohibited',()=>{
 const s=field(),yara=add(s,0,'battle',YARA),guard=add(s,0,'battle',GUARD);
 const fujin=add(s,1,'battle',FUJIN,{tapped:true});
 const target=add(s,1,'battle',BIG,{tapped:true});
 attack(s,guard.uid,target.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'grave',guard)&&has(s,0,'battle',yara));
 assert.equal(s.players[0].shields.length,5);
 assert.ok(has(s,1,'battle',fujin));
});

test('Yara and Scream use their printed breakers',()=>{
 for(const [id,count] of [[YARA,2],[SCREAM,3]]){
  const s=field(),source=add(s,0,'battle',id);
  attack(s,source.uid);
  act(s,'noBlock');
  act(s,'breakShields',a=>a.shields.length===count);
  drain(s);
  assert.equal(s.metrics[0].breaks,count);
 }
});
