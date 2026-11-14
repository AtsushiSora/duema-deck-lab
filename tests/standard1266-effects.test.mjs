import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GLA='dmrp20-014',OU='dmrp20-038',KNIGHT='dmrp20-013',CORO='dmrp20-coro01';
const FIRE='dm01-097',NATURE='dm01-108',HAND='dm01-027',BLOCK='dm01-001';
const BIG='dm01-s04',TWIN='dmrp05-011',LIGHT='dm01-076',DISTAS='dmrp20-071',BOLSHACK='dm01-008';
const ALLY='dmrp20-022',GENMU='dmrp15-km1';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
const end=s=>{act(s,'toAttack');act(s,'endTurn');};

test('all abilities match their official prints, and Coro art has the same playable identity',()=>{
 const m=read('tools/support-phase-1266.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GLA,OU,KNIGHT]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[CORO,KNIGHT]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row;
  const printed={id,status:'complete',faces:row.faces},c=e.card(canonicalId);
  assert.deepEqual(row.faces,details.cards.find(x=>x.id===canonicalId).faces);
  assert.deepEqual(standardCardSpec(printed,{phase:1266}),row.spec);
  assert.throws(()=>standardCardSpec(printed,{phase:1265}));
  const extra=structuredClone(printed);extra.faces[0].abilityText+='\n未知の追加能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:1266}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

for(const accept of [true,false])test('Glarkla can draw at its own turn start in a tie (QA40661): '+accept,()=>{
 let s=field(1);
 add(s,0,'battle',GLA);add(s,1,'battle',BIG);
 const deck=s.players[0].deck.length;
 end(s);
 assert.deepEqual(options(s),[0,1]);
 s=JSON.parse(JSON.stringify(s));pick(s,Number(accept));drain(s);
 assert.equal(s.active,0);
 assert.equal(s.players[0].deck.length,deck-1-Number(accept));
});

test('Glarkla requires one own creature among the strongest, including a different ally',()=>{
 for(const ownHighest of [false,true]){
  const s=field(1);
  add(s,0,'battle',GLA);
  add(s,1,'battle',BIG,{powerModifiers:[{amount:1000}]});
  if(ownHighest)add(s,0,'battle',BLOCK);
  end(s);
  if(ownHighest){assert.deepEqual(options(s),[0,1]);pick(s,1);}
  else assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,1+Number(ownHighest));
 }
});

test('Glarkla can attack a player or creature only with more cards in hand, and breaks two',()=>{
 const s=field(),x=add(s,0,'battle',GLA),enemy=add(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 const attacks=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 assert.deepEqual(attacks(),[]);
 add(s,1,'hand',NATURE);assert.deepEqual(attacks(),[]);
 give(s,0,'hand',[NATURE,NATURE]);
 assert.deepEqual(new Set(attacks()),new Set(['player',enemy.uid]));
 attack(s,x.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
});

test('Glarkla Just Diver makes it both untargetable and unattackable through the opponent turn',()=>{
 const s=field();
 cast(s,GLA);drain(s);
 const x=s.players[0].battle[0],other=add(s,0,'battle',NATURE,{tapped:true});
 x.tapped=true;
 end(s);act(s,'skipCharge');
 cast(s,HAND);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(t=>t.uid)),[other.uid]);
 target(s,other);drain(s);
 const enemy=add(s,1,'battle',FIRE);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===x.uid));
 act(s,'endTurn');drain(s);
 assert.ok(!x.justDiverActive);
});

for(const supported of [false,true])test('Oujeno survives through two shield breaks, then dies only if no Dispector was there: '+supported,()=>{
 const s=field(),x=add(s,0,'battle',OU);
 add(s,0,'battle',DISTAS);
 if(supported)add(s,0,'battle',ALLY);
 attack(s,x.uid);
 assert.ok(inZone(s,0,'battle',x));
 act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.equal(inZone(s,0,'battle',x),supported);
 assert.equal(inZone(s,0,'grave',x),!supported);
});

test('Oujeno survives when a shield trigger removes its Dispector after the attack starts (QA40651)',()=>{
 let s=field(),x=add(s,0,'battle',OU),support=add(s,0,'battle',ALLY);
 give(s,1,'shields',[HAND,NATURE]);
 attack(s,x.uid);act(s,'noBlock');drainBreak(s);
 act(s,'useTrigger',a=>a.cardId===HAND);
 s=JSON.parse(JSON.stringify(s));target(s,support);drain(s);
 assert.ok(inZone(s,0,'grave',support)&&inZone(s,0,'battle',x));
});

for(const supported of [false,true])test('Oujeno can block, wins the battle, and checks its ally at block time: '+supported,()=>{
 const s=field(1),x=add(s,0,'battle',OU),enemy=add(s,1,'battle',FIRE);
 if(supported)add(s,0,'battle',ALLY);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===x.uid);drain(s);
 assert.ok(inZone(s,1,'grave',enemy));
 assert.equal(inZone(s,0,'battle',x),supported);
});

test('Oujeno can be summoned from a broken shield and block a later attack',()=>{
 const s=field(1),first=add(s,1,'battle',FIRE),second=add(s,1,'battle',NATURE);
 give(s,0,'shields',[OU]);give(s,0,'mana',[]);
 const [shield]=s.players[0].shields;
 attack(s,first.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(inZone(s,0,'battle',shield));
 attack(s,second.uid);act(s,'block',a=>a.uid===shield.uid);drain(s);
 assert.ok(inZone(s,1,'grave',second)&&inZone(s,0,'grave',shield));
});

test('Knight taps on its own entry and later allied entries, can block, and cannot attack the player',()=>{
 const s=field(),a=add(s,1,'battle',FIRE),b=add(s,1,'battle',FIRE);
 cast(s,KNIGHT);
 const knight=s.players[0].battle[0];
 pick(s,a.uid);assert.ok(a.tapped&&!b.tapped);
 cast(s,LIGHT);pick(s,b.uid);assert.ok(b.tapped);
 s.active=1;s.phase='main';cast(s,NATURE);assert.equal(s.decision,null);
 const c=add(s,1,'battle',NATURE);
 attack(s,c.uid);act(s,'block',a=>a.uid===knight.uid);drain(s);
 assert.ok(inZone(s,1,'grave',c));
 s.active=0;s.phase='attack';knight.tapped=false;knight.entered=s.turn-1;
 const choices=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===knight.uid).map(a=>a.target);
 assert.ok(choices.includes(a.uid)&&!choices.includes('player'));
});

test('Knight from a shield cannot grant a trigger to the other shield in the same break',()=>{
 const s=field(1),attacker=add(s,1,'battle',BOLSHACK);
 give(s,0,'shields',[KNIGHT,LIGHT]);give(s,0,'mana',[]);
 const [knight,light]=s.players[0].shields;
 attack(s,attacker.uid);act(s,'noBlock');drainBreak(s);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.uid),[knight.uid]);
 act(s,'useTrigger',a=>a.uid===knight.uid);pick(s,attacker.uid);drain(s);
 assert.ok(inZone(s,0,'battle',knight)&&inZone(s,0,'hand',light));
});

test('Knight grants S Trigger only to Mixels creature face, including while resuming a declaration (QA40662)',()=>{
 let s=field(1),attacker=add(s,1,'battle',FIRE),later=add(s,1,'battle',FIRE);
 add(s,0,'battle',KNIGHT);
 give(s,0,'shields',[TWIN]);give(s,0,'mana',[]);
 const [shield]=s.players[0].shields;
 attack(s,attacker.uid);act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>[a.uid,a.face]),[[shield.uid,0]]);
 const before=physical(s);
 s=JSON.parse(JSON.stringify(s));act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,later.uid);drain(s);
 assert.ok(inZone(s,0,'battle',shield)&&s.players[1].battle.find(y=>y.uid===later.uid).tapped);
 assert.deepEqual(physical(s),before);
});

test('Knight grants S Trigger to a Light creature at the inclusive cost limit',()=>{
 const s=field(1),attacker=add(s,1,'battle',FIRE);
 add(s,0,'battle',KNIGHT);
 give(s,0,'shields',['dm01-014']);give(s,0,'mana',[]);
 const [shield]=s.players[0].shields;
 attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,attacker.uid);drain(s);
 assert.ok(inZone(s,0,'battle',shield));
});

test('Knight excludes non-Light, expensive, spell, enemy, and ability-suppressed shield grants',()=>{
 for(const [id,controller,ignored] of [[FIRE,0,false],[BLOCK,0,false],['dm01-046',0,false],[LIGHT,1,false],[LIGHT,0,true]]){
  const s=field(1),attacker=add(s,1,'battle',FIRE);
  add(s,controller,'battle',KNIGHT);
  if(ignored)add(s,1,'battle',GENMU);
  give(s,0,'shields',[id]);
  const [shield]=s.players[0].shields;
  attack(s,attacker.uid);act(s,'noBlock');
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid),id);
  drain(s);assert.ok(inZone(s,0,'hand',shield),id);
 }
});

function drainBreak(s){
 while(s.decision?.type==='selectShield'||s.decision?.type==='shieldBreak')e.step(s,e.chooseAI(s));
}
