import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GEDORA='dm17-s02',CHLORO='dmrp20-057',BRITIOURA='dmrp20-003',BABEL='dmrp20-040';
const NATURE='dm01-108',DEMON='dmrp20-071',HAND='dm01-027',SPIRAL='dm01-086',CADDY='dm22rp1-049';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function finishTurn(s){act(s,'toAttack');act(s,'endTurn');}

test('four official prints use the existing catalogue identities, full effects, art and limits',()=>{
 const m=read('tools/support-phase-1263.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GEDORA,CHLORO,BRITIOURA,BABEL]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id),detail=details.cards.find(x=>x.id===id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1263}),row.spec);
  const unknown=structuredClone(detail);unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:1263}));
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(c.text,f.abilityText);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===image));
 }
});

test('Gedora evolves only on a Demon Command and can attack at once to break two shields',()=>{
 const s=field(),base=add(s,0,'battle',DEMON),wrong=add(s,0,'battle',NATURE);
 const x=add(s,0,'hand',GEDORA),physical=ids(s),shields=s.players[1].shields.length;
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).under[0].uid,base.uid);
 attack(s,x.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,shields-2);
 assert.deepEqual(ids(s),physical);
});

test('Gedora keeps its evolution stack against an opponent spell, but the caster can return their own stack',()=>{
 for(const p of [0,1]){
  const s=field(),base=inst(DEMON),x=add(s,p,'battle',GEDORA,{under:[base]});
  cast(s,SPIRAL);target(s,x);drain(s);
  if(p===1)assert.equal(s.players[p].battle.find(y=>y.uid===x.uid)?.under[0]?.uid,base.uid);
  else assert.ok(has(s,p,'hand',x)&&has(s,p,'hand',base));
 }
});

test('Chloro offers one card of any type from its own grave at its own end only',()=>{
 for(const chosen of [true,false]){
  const s=field(),spell=add(s,0,'grave',HAND),other=add(s,1,'grave',SPIRAL);
  add(s,0,'battle',CHLORO);
  finishTurn(s);
  assert.deepEqual(options(s),[spell.uid,null]);
  pick(s,chosen?spell.uid:null);drain(s);
  assert.ok(has(s,0,chosen?'mana':'grave',spell)&&has(s,1,'grave',other));
 }
 const s=field(1);
 add(s,0,'battle',CHLORO);add(s,0,'grave',HAND);
 finishTurn(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].grave.length,1);
});

test('Chloro can use G Strike from a broken shield and remains in hand',()=>{
 const s=field(1),attacker=add(s,1,'battle',NATURE),later=add(s,1,'battle',NATURE);
 give(s,0,'shields',[CHLORO]);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,later.uid);drain(s);
 assert.ok(e.attackLocked(s,1,later));
 assert.equal(later.tapped,false);
 assert.ok(s.players[0].hand.some(x=>x.cardId===CHLORO));
});

test('Britioura can block and its linked EX Life shield replaces a battlefield departure',()=>{
 const s=field();
 cast(s,BRITIOURA);
 const x=s.players[0].battle.find(x=>x.cardId===BRITIOURA),[shield]=e.exLifeShields(s,0,x);
 assert.ok(shield&&!shield.faceUp);
 s.active=1;s.phase='main';
 cast(s,HAND);target(s,x);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',shield));
 s.phase='attack';
 const enemy=add(s,1,'battle',NATURE);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===x.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 act(s,'endTurn');drain(s);
 assert.equal(s.active,0);
 act(s,'skipCharge');
 const count=s.players[1].shields.length;
 attack(s,x.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,count-2);
});

test('Britioura responds to own Distass destruction and applies the reduction to current enemy creatures',()=>{
 const s=field(1),elder=add(s,1,'battle','dm05-s04',{justDiverActive:true}),small=add(s,1,'battle',NATURE);
 add(s,0,'battle',BRITIOURA);
 const distass=add(s,0,'battle',CHLORO),ally=add(s,0,'battle',NATURE);
 cast(s,HAND);target(s,distass);drain(s);
 assert.ok(has(s,0,'grave',distass)&&has(s,1,'grave',small));
 assert.equal(e.power(elder,false,s),12000);
 assert.equal(e.power(ally,false,s),e.card(NATURE).power);
 const late=add(s,1,'battle','dm05-s04');
 assert.equal(e.power(late,false,s),15000);
 finishTurn(s);drain(s);
 assert.equal(e.power(elder,false,s),15000);
});

test('Britioura ignores enemy Distass, non-Distass deaths and non-destruction movement',()=>{
 for(const [p,id,spell] of [[1,CHLORO,HAND],[0,NATURE,HAND],[0,CHLORO,SPIRAL]]){
  const s=field(1-p),elder=add(s,1,'battle','dm05-s04');
  add(s,0,'battle',BRITIOURA);
  const victim=add(s,p,'battle',id);
  cast(s,spell);target(s,victim);drain(s);
  assert.equal(e.power(elder,false,s),15000);
 }
});

test('Babel may decline or resolve without a sacrifice choice when there is no own creature',()=>{
 for(const own of [false,true]){
  const s=field();
  if(own)add(s,0,'battle',CHLORO);
  cast(s,BABEL);
  if(own)pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck.length,24);
  assert.equal(s.players[0].battle.length,Number(own));
 }
});

test('Babel draws three before returning the exact destroyed Distass, preserving physical cards',()=>{
 let s=field();
 const victim=add(s,0,'battle',CHLORO),same=add(s,0,'grave',CHLORO),enemy=add(s,1,'battle',CHLORO),spell=add(s,0,'hand',BABEL);
 const before=ids(s),drawn=s.players[0].deck.slice(0,3).map(x=>x.uid);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(options(s),[victim.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,victim.uid);drain(s);
 const x=s.players[0].battle.find(x=>x.uid===victim.uid);
 assert.ok(x&&x.incarnation===1);
 assert.equal(x.summonedTurn,undefined);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),drawn);
 assert.ok(has(s,0,'grave',same)&&has(s,1,'battle',enemy));
 assert.deepEqual(ids(s),before);
});

test('Babel draws after a replaced destruction, without returning a different grave card or non-Distass',()=>{
 for(const id of [CADDY,NATURE,BRITIOURA]){
  const s=field(),same=add(s,0,'grave',CHLORO),victim=add(s,0,'battle',id);
  if(id===BRITIOURA)victim.exLifeShieldUid=s.players[0].shields[0].uid;
  cast(s,BABEL);pick(s,victim.uid);drain(s);
  assert.equal(s.players[0].hand.length,3);
  assert.ok(has(s,0,'grave',same));
  assert.ok(has(s,0,id===CADDY?'mana':id===BRITIOURA?'battle':'grave',victim));
 }
});

test('Babel draws after Escape replaces a Distass destruction and does not trigger Britioura',()=>{
 const s=field(),victim=add(s,0,'battle',CHLORO),enemy=add(s,1,'battle','dm05-s04');
 add(s,0,'battle','dmex13-s06');
 add(s,0,'battle',BRITIOURA);
 const shield=s.players[0].shields[0],n=s.players[0].deck.length;
 cast(s,BABEL);pick(s,victim.uid);
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 drain(s);
 assert.equal(s.players[0].deck.length,n-3);
 assert.ok(has(s,0,'battle',victim)&&has(s,0,'hand',shield));
 assert.equal(e.power(enemy,false,s),15000);
});

test('Babel draws but cannot deploy the destroyed Distass out of a locked graveyard',()=>{
 const s=field(),victim=add(s,0,'battle',CHLORO);
 add(s,1,'battle','dmrp08-014');
 cast(s,BABEL);pick(s,victim.uid);drain(s);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(has(s,0,'grave',victim));
 assert.ok(!has(s,0,'battle',victim));
});

test('Babel ignores a Distass evolution base sent to the grave together with a destroyed non-Distass',()=>{
 const s=field(),base=inst(DEMON),x=add(s,0,'battle',GEDORA,{under:[base]});
 cast(s,BABEL);pick(s,x.uid);drain(s);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(has(s,0,'grave',base)&&has(s,0,'grave',x));
 assert.equal(s.players[0].battle.length,0);
});
