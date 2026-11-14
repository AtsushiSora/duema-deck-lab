import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CARLY='dm23rp4-047',TYPING='dm23rp4-031',KOPA='dm23rp4-050';
const FIRE='dm01-097',GREEN='dm01-108',SMALL='dm01-083',ABYSS='dm23rp4-049';
const SEED='dm22rp2-035',BLOCKER='dm01-051',KILL='dm01-027',EVOLUTION='dmd21-001';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1291.json');

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(GREEN));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const picks=s=>s.decision?.choices?.map(({value})=>value?.uid??value);
const pick=(s,value)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets.some(target=>target.uid===value)):
 act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

function trigger(s,attacker,id,{last=true,face=0}={}){
 give(s,1-s.active,'shields',last?[id]:[id,GREEN]);
 const shield=s.players[1-s.active].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type!=='trigger'&&e.getLegalActions(s).some(a=>a.kind==='breakShields'))
  act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===face);
 return shield;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 if(s.phase==='charge')act(s,'skipCharge');
}

test('six official prints resolve to three original card IDs with matching faces and limits',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[CARLY,TYPING,KOPA]);
 assert.equal(manifest.printAliases.length,3);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[front,back]=row.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1291}),row.spec);
  assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
   [back.name,back.cost,back.civilizations,back.abilityText]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.find(x=>x.id===row.id),{id:row.id,canonicalId:id,name:row.name,image:row.image,source:row.source});
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Carly discards an existing hand card before drawing and attacks on the turn it enters',()=>{
 const s=field(),discarded=add(s,0,'hand',FIRE),spare=add(s,0,'hand',SMALL),top=s.players[0].deck[0];
 const carly=play(s,CARLY);
 assert.deepEqual(picks(s),[discarded.uid,spare.uid]);
 assert.ok(has(s,0,'deck',top));
 pick(s,discarded.uid);
 assert.ok(has(s,0,'grave',discarded)&&has(s,0,'hand',spare)&&has(s,0,'hand',top));
 attack(s,carly.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Carly draws even with no card to discard',()=>{
 const s=field(),top=s.players[0].deck[0];
 play(s,CARLY);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
 assert.equal(s.players[0].grave.length,0);
});

for(const to of ['deckTop','deck']){
 test('Carly targets a creature, then its controller chooses destination and order '+to,()=>{
  let s=field();
  const base=inst(FIRE),host=add(s,1,'battle',EVOLUTION,{under:[base]});
  const protectedCreature=add(s,1,'battle',SMALL,{justDiverActive:true});
  const seed=add(s,1,'battle',SEED),ally=add(s,0,'battle',FIRE);
  play(s,CARLY,1);
  assert.equal(s.decision.player,0);
  assert.deepEqual(picks(s),[host.uid]);
  pick(s,host.uid);
  assert.equal(s.decision.player,1);
  assert.deepEqual(picks(s),['deckTop','deck']);
  s=structuredClone(s);
  pick(s,to);
  assert.equal(s.decision.player,1);
  pick(s,base.uid);
  const {deck}=s.players[1];
  assert.deepEqual((to==='deckTop'?deck.slice(0,2):deck.slice(-2)).map(x=>x.uid),[base.uid,host.uid]);
  assert.ok(has(s,1,'battle',protectedCreature)&&has(s,1,'battle',seed)&&has(s,0,'battle',ally));
 });
}

test('Carly can cast its spell as an S-Trigger without paying mana',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE);
 const shield=trigger(s,attacker,CARLY,{face:1});
 assert.equal(s.decision.player,1);
 pick(s,attacker.uid);
 assert.equal(s.decision.player,0);
 pick(s,'deck');
 assert.equal(s.players[0].deck.at(-1).uid,attacker.uid);
 assert.ok(has(s,1,'grave',shield));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});

test('Carly’s opponent choosing the destination does not change the source of the effect',()=>{
 const s=field(),target=add(s,1,'battle',FIRE);
 s.g26Extreme=[false,true];
 play(s,CARLY,1);
 pick(s,target.uid);
 pick(s,'deckTop');
 assert.ok(has(s,1,'battle',target));
});

test('Typing discounts a summon once whenever either player has no creatures',()=>{
 for(const [left,right,expected] of [['empty','empty',4],['empty','creature',4],
  ['creature','empty',4],['creature','creature',6],['creature','seed',4],['creature','sealed',4]]){
  const s=field();
  for(const [p,kind] of [left,right].entries())
   if(kind!=='empty')add(s,p,'battle',kind==='seed'?SEED:FIRE,kind==='sealed'?{sealed:true}:{});
  assert.equal(e.summonCost(s,0,e.card(TYPING)),expected,left+'/'+right);
  assert.equal(e.summonCost(s,0,e.card(TYPING).spellFace),1);
  play(s,TYPING);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,expected);
 }
});

for(const take of [true,false]){
 test('Typing mills first, can choose the milled matching creature or decline, and breaks twice '+take,()=>{
  const s=field(),typing=add(s,0,'battle',TYPING),other=add(s,0,'grave',TYPING);
  const invalid=add(s,0,'grave',ABYSS),milled=inst(TYPING);
  s.players[0].deck.unshift(milled);
  attack(s,typing.uid);
  assert.ok(has(s,0,'grave',milled));
  assert.deepEqual(new Set(picks(s)),new Set([other.uid,milled.uid,null]));
  pick(s,take?milled.uid:null);
  drain(s);
  assert.equal(has(s,0,'battle',milled),take);
  assert.ok(has(s,0,'grave',other)&&has(s,0,'grave',invalid));
  assert.equal(s.players[1].shields.length,3);
 });
}

test('Typing’s spell reduces power through the end of the turn, stacks and destroys at zero',()=>{
 const s=field(),large=add(s,1,'battle',ABYSS),small=add(s,1,'battle',FIRE);
 const spell=play(s,TYPING,1);
 pick(s,small.uid);
 assert.ok(has(s,1,'grave',small)&&has(s,0,'grave',spell));
 play(s,TYPING,1);
 pick(s,large.uid);
 assert.equal(e.power(large,false,s),1000);
 end(s);
 assert.equal(e.power(large,false,s),4000);
 end(s);
 for(let i=0;i<2;i++){
  play(s,TYPING,1);
  pick(s,large.uid);
 }
 assert.ok(has(s,1,'grave',large));
});

test('Kopa’s Just Diver prevents opposing choices and attacks until its next turn',()=>{
 const s=field(),enemy=add(s,1,'battle',FIRE),other=add(s,0,'battle',FIRE);
 const kopa=play(s,KOPA);
 assert.equal(kopa.justDiverActive,true);
 kopa.tapped=true;
 end(s);
 s.phase='main';
 play(s,KILL);
 assert.ok(!e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===kopa.uid)));
 pick(s,other.uid);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===kopa.uid));
 end(s);
 assert.equal(kopa.justDiverActive,undefined);
 kopa.tapped=true;
 end(s);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===kopa.uid));
 s.phase='main';
 const after=play(s,KILL);
 pick(s,kopa.uid);
 assert.ok(has(s,0,'grave',kopa)&&has(s,1,'grave',after));
});

test('Kopa makes a blocker unable to block this attack or attack on its turn',()=>{
 const s=field(),kopa=add(s,0,'battle',KOPA),target=add(s,1,'battle',BLOCKER);
 attack(s,kopa.uid);
 pick(s,target.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===target.uid));
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 end(s);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));
 end(s);
 assert.ok(!s.extLimits?.some(x=>x.g190Freeze&&x.ref?.uid===target.uid));

});

test('Kopa’s S-Trigger puts a creature in its physical owner’s mana',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE,{cardOwner:1});
 const shield=trigger(s,attacker,KOPA,{face:1});
 assert.equal(s.decision.player,1);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'mana',attacker)&&has(s,1,'grave',shield));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});
