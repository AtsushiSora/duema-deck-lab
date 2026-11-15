import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const KING='dm26rp3-018',ANDA='dm26rp3-026',PROTECT='dm25ex4-053',GHOST='dm25ex4-059',ASH='dm25ex4-065';
const BASIC='dm01-108',LIGHT='dm01-076',WATER='dm01-083',SEED='dm26rp3-061';
const PSYCHIC='dm25ex4-037',WATER_PSYCHIC='dm25ex4-040',BIG='dmrp01-s01',JOKER='dmrp01-011',DISTAS='dmrp17-092',DARK='dm01-090';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('five verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1321.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[KING,ANDA,PROTECT,GHOST,ASH]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1321}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost]),faces.map(f=>[f.name,f.cost]));
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('King reveals the last three, deploys the cost-8 Joker and orders the other two above the old top',()=>{
 const s=field(),king=add(s,0,'battle',KING,{entered:s.turn});
 add(s,1,'battle',LIGHT,{tapped:true});
 const oldTop=add(s,0,'deck',JOKER);
 s.players[0].deck.unshift(s.players[0].deck.pop());
 const joker=add(s,0,'deck',JOKER),bad=add(s,0,'deck',BIG),plain=add(s,0,'deck',BASIC);
 attack(s,king.uid);
 assert.deepEqual(choices(s),[joker.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===KING&&x.text.includes('山札の下3枚')));
 pick(s,joker.uid);
 assert.deepEqual(new Set(choices(s)),new Set([bad.uid,plain.uid]));
 pick(s,plain.uid);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(x=>x.uid),[plain.uid,bad.uid,oldTop.uid]);
 assert.ok(has(s,0,'battle',joker));
 assert.equal(s.players[0].g34Protected.length,0);
});

test('King can decline the deployment and returns every card in the selected order',()=>{
 const s=field(),king=add(s,0,'battle',KING);
 const a=add(s,0,'deck',JOKER),b=add(s,0,'deck',BASIC),c=add(s,0,'deck',BIG);
 attack(s,king.uid);
 pick(s,null);
 pick(s,c.uid);
 pick(s,a.uid);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(x=>x.uid),[c.uid,a.uid,b.uid]);
});

for(const id of [DISTAS,SEED])test('Andasterion attacks a creature on entry and revives a Distas '+id,()=>{
 const s=field();
 cast(s,ANDA);drain(s);
 assert.equal(s.players[0].shields.length,6);
 const anda=s.players[0].battle.find(x=>x.cardId===ANDA);
 const foe=add(s,1,'battle',LIGHT);
 const good=add(s,0,'grave',id);
 add(s,0,'grave',BASIC);
 add(s,1,'grave',DISTAS);
 attack(s,anda.uid,foe.uid);
 assert.deepEqual(choices(s),[good.uid,null]);
 pick(s,good.uid);
 assert.ok(has(s,0,'battle',good));
 assert.equal(s.players[0].shields.length,6);
});

test('Fushigibirth reaches its two-mana floor, requires both colors and produces EX Life on the grave summon',()=>{
 const s=field(),base=add(s,0,'battle',BIG),anda=add(s,0,'grave',ANDA);
 give(s,0,'mana',[BASIC,BASIC]);
 const isFushi=a=>a.alternative==='fushigibirth'&&a.uid===anda.uid;
 assert.ok(!e.getLegalActions(s).some(isFushi));
 add(s,0,'mana',DARK);
 act(s,'play',a=>isFushi(a)&&a.fushiBase===base.uid&&a.cost===2);
 drain(s);
 assert.ok(has(s,0,'battle',anda));
 assert.ok(s.players[0].mana.find(x=>x.uid===base.uid)?.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.equal(s.players[0].shields.length,6);
});

test('Protection shields the deck top and summons from extra with only the spell mana tapped',()=>{
 const s=field(),top=s.players[0].deck[0];
 give(s,0,'mana',[LIGHT,LIGHT]);
 const target=add(s,0,'extra',PSYCHIC),wrong=add(s,0,'extra',WATER_PSYCHIC);
 const tooBig=add(s,0,'extra',BIG),nonCreature=add(s,0,'extra',GHOST);
 cast(s,PROTECT);
 assert.ok(has(s,0,'shields',top));
 assert.deepEqual(choices(s),[target.uid,null]);
 const resumed=JSON.parse(JSON.stringify(s));
 pick(resumed,target.uid);
 assert.ok(has(resumed,0,'battle',target));
 assert.equal(resumed.players[0].battle.find(x=>x.uid===target.uid).summonedTurn,resumed.turn);
 for(const x of [wrong,tooBig,nonCreature])assert.ok(has(resumed,0,'extra',x));
 assert.equal(resumed.players[0].mana.filter(x=>x.tapped).length,2);
 assert.equal(resumed.noManaUse[0],true);
 assert.notEqual(resumed.g1315UnpaidEntryTurns?.[0],resumed.turn);
});

test('Ghost lets the opponent choose the mandatory discard before the optional summon',()=>{
 const s=field(),kept=add(s,1,'hand',BASIC),discard=add(s,1,'hand',LIGHT),target=add(s,0,'extra',PSYCHIC);
 cast(s,GHOST);
 assert.equal(s.decision.player,1);
 pick(s,discard.uid);
 assert.ok(has(s,1,'hand',kept));
 assert.ok(has(s,1,'grave',discard));
 assert.deepEqual(choices(s),[target.uid,null]);
 pick(s,null);
 assert.ok(has(s,0,'extra',target));
});

for(const ramp of [true,false])test('Ashidake checks civilizations after the optional hand ramp '+ramp,()=>{
 const s=field(),water=add(s,0,'hand',WATER);
 give(s,0,'mana',[BASIC,BASIC]);
 const target=add(s,0,'extra',WATER_PSYCHIC);
 cast(s,ASH);
 pick(s,ramp?water.uid:null);
 if(ramp){assert.deepEqual(choices(s),[target.uid,null]);pick(s,target.uid);}
 assert.equal(has(s,0,'mana',water),ramp);
 assert.equal(has(s,0,'battle',target),ramp);
 assert.equal(has(s,0,'extra',target),!ramp);
});

test('Kyokutsuufuu replaces King’s bottom reveal with one card from the top',()=>{
 const s=field(),king=add(s,0,'battle',KING);
 add(s,1,'battle','dmrp22-030');
 const top=inst(JOKER);
 s.players[0].deck.unshift(top);
 const bottom=add(s,0,'deck',JOKER);
 attack(s,king.uid);
 assert.deepEqual(choices(s),[top.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===KING&&x.text.includes('山札の上1枚')));
 pick(s,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].deck.at(-1).uid,bottom.uid);
});

test('teleport requires every civilization and does not count the printed color of face-down mana',()=>{
 const s=field(),dual=add(s,0,'extra','dmrp13-084');
 give(s,0,'mana',[LIGHT,LIGHT]);
 const source=add(s,0,'mana',WATER,{faceDown:true});
 cast(s,PROTECT);
 assert.ok(!choices(s).includes(dual.uid));
 drain(s);
 for(const x of s.players[0].mana)x.tapped=false;
 source.faceDown=false;
 cast(s,PROTECT);
 assert.deepEqual(choices(s),[dual.uid,null]);
 pick(s,dual.uid);
 assert.ok(has(s,0,'battle',dual));
});

test('King uses G Strike from a broken shield and leaves its target untapped',()=>{
 const s=field();
 give(s,0,'shields',[KING]);
 s.active=1;
 const attacker=add(s,1,'battle',BASIC),target=add(s,1,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,target.uid);
 assert.ok(e.attackLocked(s,1,target));
 assert.equal(target.tapped,false);
 assert.equal(s.players[0].hand[0].cardId,KING);
});

test('Andasterion’s EX Life uses the actual top card to replace its first departure',()=>{
 const s=field(),shield=s.players[0].deck[0];
 cast(s,ANDA);drain(s);
 const anda=s.players[0].battle.find(x=>x.cardId===ANDA);
 assert.deepEqual(e.exLifeShields(s,0,anda).map(x=>x.uid),[shield.uid]);
 s.active=1;
 cast(s,'dm01-027');
 act(s,'effect',a=>a.targets[0].uid===anda.uid);
 drain(s);
 assert.ok(has(s,0,'battle',anda)&&has(s,0,'grave',shield));
 cast(s,'dm01-027');
 act(s,'effect',a=>a.targets[0].uid===anda.uid);
 drain(s);
 assert.ok(has(s,0,'grave',anda));
});
