import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MEGANE='dmrp02-058',YUNAGI='dm29-055',BAKEKO='dm33-054';
const FIRE='dm01-097',NATURE='dm01-108',NINJA='dm29-037',EVO='dm10-017';
const DESTROY='dm01-027',BOUNCE='dm01-086',FIGHT='dmrp19-085';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id,fields={})=>{const x=Object.assign(inst(id),fields);s.players[p][z].push(x);return x;};
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);
const pick=(s,x)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===x.uid);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const evo=(s,p,fields={})=>put(s,p,'battle',EVO,{under:[inst(NATURE)],...fields});

test('phase 1158 verifies three official definitions and all three reprints',()=>{
 const m=read('tools/support-phase-1158.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[MEGANE,YUNAGI,BAKEKO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmsp01-036',MEGANE],['dmex12-105',YUNAGI],['dm23ex1-081',YUNAGI]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1158}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations.filter(color=>color!=='無色'),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1158}));
 }
});

test('Megane on each side adds a break to the same first attacker',()=>{
 const s=field(),first=put(s,0,'battle',FIRE),second=put(s,0,'battle',FIRE);
 put(s,0,'battle',MEGANE);put(s,1,'battle',MEGANE);
 attack(s,first.uid);
 drain(s);
 assert.equal(e.effectiveCard(first,s).extraBreak,2);
 assert.equal(s.players[1].shields.length,2);
 attack(s,second.uid);drain(s);
 assert.equal(s.players[1].shields.length,1);
});

test('Megane counts an attack on a creature, and its grant stays with that creature',()=>{
 const s=field(),first=put(s,0,'battle','dm21-053'),second=put(s,0,'battle',FIRE);
 const weak=put(s,1,'battle',NATURE,{tapped:true});
 put(s,0,'battle',MEGANE);
 attack(s,first.uid,weak.uid);drain(s);
 assert.equal(e.effectiveCard(first,s).extraBreak,1);
 assert.equal(s.players[1].shields.length,5);
 attack(s,second.uid);drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Megane can grant another break next turn and earlier grants survive its departure',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),source=put(s,0,'battle',MEGANE);
 attack(s,attacker.uid);drain(s);
 assert.equal(e.effectiveCard(attacker,s).extraBreak,1);
 act(s,'endTurn');
 s.phase='main';
 cast(s,BOUNCE);target(s,source);
 assert.equal(e.effectiveCard(attacker,s).extraBreak,1);
 const next=put(s,1,'battle',FIRE);
 put(s,1,'battle',MEGANE);
 attack(s,next.uid);drain(s);
 assert.equal(e.effectiveCard(next,s).extraBreak,1);
});

test('Megane adds a break to the selected attack judge win',()=>{
 const s=field(),attacker=put(s,0,'battle','dm22ex1-030');
 put(s,0,'battle',MEGANE);
 give(s,0,'deck',['dm21-053',...Array(18).fill(FIRE)]);
 give(s,1,'deck',[FIRE,'dm21-053',...Array(18).fill(FIRE)]);
 attack(s,attacker.uid);
 act(s,'orderEffect',a=>a.cardId===MEGANE);
 assert.equal(s.decision.type,'judgeContinue');
 act(s,'stopJudge');
 act(s,'judgeBreak');
 pick(s,s.players[1].shields[1]);
 assert.equal(s.players[1].shields.length,3);
 drain(s);
 assert.equal(s.players[1].shields.length,1);
});

test('Yunagi optionally sends another allied Ninja to mana on bounce or destruction',()=>{
 for(const id of [BOUNCE,DESTROY]){
  const s=field(),ninja=put(s,1,'battle',NINJA),yunagi=put(s,1,'battle',YUNAGI);
  cast(s,id);target(s,ninja);
  assert.equal(legal(s,'allowLeave').length,1);
  act(s,'replaceYamata');
  assert.ok(s.players[1].mana.includes(ninja));
  assert.ok(s.players[1].battle.includes(yunagi));
 }
});

test('Yunagi does not replace its own departure or a non-Ninja departure',()=>{
 for(const id of [YUNAGI,NATURE]){
  const s=field(),x=put(s,1,'battle',id);
  if(id!==YUNAGI)put(s,1,'battle',YUNAGI);
  cast(s,BOUNCE);target(s,x);
  assert.equal(s.decision,null);
  assert.ok(s.players[1].hand.includes(x));
 }
});

test('Yunagi can move a Ninja to mana at the end of Ninja Strike',()=>{
 const s=field(),ninja=put(s,1,'battle',NINJA,{incarnation:1,uraNinja:{turn:s.turn,incarnation:1}});
 put(s,1,'battle',YUNAGI);
 s.phase='attack';
 act(s,'endTurn');
 act(s,'replaceYamata');
 assert.ok(s.players[1].mana.includes(ninja));
});

test('Bakeko must replace destruction of an allied evolution and preserves its stack',()=>{
 const s=field(),unit=evo(s,1),base=unit.under[0],bakeko=put(s,1,'battle',BAKEKO);
 assert.ok(e.isEvolution(unit));
 cast(s,DESTROY);target(s,unit);
 assert.equal(legal(s,'allowLeave').length,0);
 act(s,'replaceUltra',a=>a.uid===bakeko.uid&&a.to==='mana');
 assert.ok(s.players[1].battle.includes(unit));
 assert.deepEqual(unit.under,[base]);
 assert.ok(s.players[1].mana.includes(bakeko));
});

test('Bakeko works when it would be destroyed in the same battle',()=>{
 const s=field(),unit=evo(s,0,{powerModifiers:[{fixedPower:2000,expires:'end',who:0}]});
 const bakeko=put(s,0,'battle',BAKEKO);
 cast(s,FIGHT);pick(s,unit);pick(s,bakeko);
 act(s,'replaceUltra',a=>a.uid===bakeko.uid);
 assert.ok(s.players[0].battle.includes(unit));
 assert.ok(s.players[0].mana.includes(bakeko));
});

test('Bakeko does not replace a bounce or destruction of a non-evolution',()=>{
 for(const id of [BOUNCE,DESTROY]){
  const s=field(),unit=id===BOUNCE?evo(s,1):put(s,1,'battle',NATURE);
  put(s,1,'battle',BAKEKO);
  cast(s,id);target(s,unit);
  assert.equal(s.decision,null);
  assert.ok(s.players[1][id===BOUNCE?'hand':'grave'].includes(unit));
 }
});
