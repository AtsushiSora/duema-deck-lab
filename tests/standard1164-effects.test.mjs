import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HATA='dmrp08-024',LAB='dm22-026',FUTURE='dmex18-038',REPRINT='dmx17-020';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIFE='dm06-110',SPIRAL='dm01-086';
const DRAGON='dmr23-072',TWIN='dm23rp3-050',EVO='dm10-017',QQ='dmrp07-m01';
const NO_SPELLS='dmrp20-012',DEMON_HAND='dm01-027',FIELD='dmr21-036';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const put=(s,p,zone,id)=>{
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
};
const table=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
};
const pick=(s,match)=>act(s,'extended',a=>match(s.decision.choices[a.choice].value));
const decline=s=>pick(s,v=>v===null);
const select=s=>pick(s,v=>v!==null);
const tapped=own=>own.mana.filter(x=>x.tapped).length;

test('phase 1164 matches all four official prints and maps Dragon Lab to its original ID',()=>{
 const m=read('tools/support-phase-1164.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[HATA,LAB,FUTURE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,LAB]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1164}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.manaValue,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,f.civilizations,f.race,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1164}));
 }
});

test('Hatamochi privately offers the top creature, then pays its real summon cost',()=>{
 const s=table(),own=s.players[0];
 cast(s,HATA);
 const top=own.deck[0],paid=tapped(own);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[top.cardId]);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[{face:0,baseUid:null},null]);
 select(s);
 assert.ok(own.battle.includes(top));
 assert.equal(top.summonedTurn,s.turn);
 assert.equal(tapped(own),paid+e.card(NATURE).cost);
 assert.deepEqual(own.g34Protected,[]);
});

test('Hatamochi pays for and casts the spell face of the top twinpact after a JSON round trip',()=>{
 const s=table(),own=s.players[0],twin=inst(TWIN);
 own.deck.unshift(twin);
 cast(s,HATA);
 const restored=JSON.parse(JSON.stringify(s)),before=tapped(own);
 assert.deepEqual(restored.decision.choices.map(x=>x.value),[{face:0,baseUid:null},{face:1,baseUid:null},null]);
 pick(restored,v=>v?.face===1);
 select(restored);
 assert.equal(tapped(restored.players[0]),before+2);
 assert.ok(restored.players[0].grave.some(x=>x.uid===twin.uid));
 assert.ok(!restored.players[0].battle.some(x=>x.uid===twin.uid));
});

test('Hatamochi uses an eligible evolution base and passes the deck origin to the summon',()=>{
 const s=table(),own=s.players[0],base=put(s,0,'battle',WATER),top=inst(EVO);
 own.deck.unshift(top);
 cast(s,HATA);
 pick(s,v=>v?.baseUid===base.uid);
 assert.ok(own.battle.includes(top));
 assert.ok(top.under.includes(base));
});

test('Hatamochi leaves the top card in place if declined, unaffordable, the wrong type or locked',()=>{
 for(const [id,insufficient,locked] of [[NATURE,false,false],[LIFE,true,false],[FIELD,false,false],[NATURE,false,true]]){
  const s=table(),own=s.players[0],top=inst(id);
  own.deck.unshift(top);
  if(insufficient)give(s,0,'mana',Array(e.card(HATA).cost).fill(FIRE));
  if(locked)put(s,1,'battle',QQ);
  cast(s,HATA);
  if(locked)assert.equal(s.decision,null);
  else{
   assert.equal(s.decision.choices.length,id===NATURE?2:1);
   decline(s);
  }
  assert.equal(own.deck[0],top);
  assert.deepEqual(own.g34Protected??[],[]);
 }
});

test('Hatamochi casting the final card loses before the spell resolves',()=>{
 const s=table(),own=s.players[0];
 give(s,0,'deck',[LIFE]);
 const before=own.mana.length;
 cast(s,HATA);
 select(s);
 assert.equal(s.winner,1);
 assert.equal(own.mana.length,before);
});

test('Dragon Lab takes one Dragon and lets its caster order the other revealed cards',()=>{
 const s=table(),own=s.players[0];
 give(s,0,'deck',[NATURE,DRAGON,WATER,...Array(8).fill(NATURE)]);
 const [a,dragon,b,...rest]=own.deck;
 cast(s,LAB);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[dragon.uid]);
 select(s);
 pick(s,v=>v===b.uid);
 assert.deepEqual(own.hand,[dragon]);
 assert.deepEqual(own.deck,[...rest,b,a]);
 assert.equal(own.grave.at(-1).cardId,LAB);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===LAB));
});

test('Dragon Lab returns the same spell when no revealed creature is a Dragon',()=>{
 const s=table(),own=s.players[0];
 const [a,b,c,...rest]=own.deck,spell=put(s,0,'hand',LAB);
 act(s,'play',x=>x.uid===spell.uid);
 pick(s,v=>v===c.uid);
 pick(s,v=>v===b.uid);
 assert.deepEqual(own.deck,[...rest,c,b,a]);
 assert.deepEqual(own.hand,[spell]);
 assert.deepEqual(own.grave,[]);
});

test('Dragon Lab cannot examine the top cards or qualify for the return under Q.Q.QX.',()=>{
 const s=table(),own=s.players[0],before=own.deck.slice();
 put(s,1,'battle',QQ);
 cast(s,LAB);
 assert.deepEqual(own.deck,before);
 assert.deepEqual(own.hand,[]);
 assert.equal(own.grave.at(-1).cardId,LAB);
});

test('Future Brain lets the opponent cast a small hand spell for free instead of drawing',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],victim=put(s,0,'battle',NATURE);
 const cheap=put(s,1,'hand',SPIRAL),expensive=put(s,1,'hand',DEMON_HAND);
 const paid=tapped(opp);
 cast(s,FUTURE);
 assert.equal(own.hand.length,3);
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value),[cheap.uid,null]);
 select(s);
 act(s,'effect',a=>a.targets[0].uid===victim.uid);
 assert.deepEqual(opp.hand,[expensive]);
 assert.deepEqual(opp.grave,[cheap]);
 assert.equal(tapped(opp),paid);
 assert.ok(own.hand.includes(victim));
});

test('Future Brain forces one opponent draw when casting is prohibited, or the opponent declines',()=>{
 for(const mode of ['prohibited','declines','no spell']){
  const s=table(),own=s.players[0],opp=s.players[1],next=opp.deck[0];
  if(mode==='prohibited')put(s,0,'battle',NO_SPELLS);
  if(mode!=='no spell')put(s,1,'hand',SPIRAL);
  cast(s,FUTURE);
  if(mode==='declines')decline(s);
  assert.equal(s.decision,null);
  assert.equal(own.hand.length,3);
  assert.equal(opp.hand.at(-1),next);
 }
});
