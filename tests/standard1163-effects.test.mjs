import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VINES='promoy15-027',BOLT='dmd31-001',WONDER='dmx23-049',PAPPI='dmex18-066';
const D2='dmr21-036',NATURE='dm01-108',SPELL='dm06-110',TWIN='dm23rp3-050';
const PHOENIX='dm22-s01',QQ='dmrp07-m01',APUL='dmrp22-042';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const put=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const table=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
};
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));

test('phase 1163 uses four distinct card IDs and resolves both Pappi reprints',()=>{
 const m=read('tools/support-phase-1163.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[VINES,BOLT,WONDER,PAPPI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm25ex1-082',PAPPI],['promoy24-027',PAPPI]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1163}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1163}));
 }
});

test('Vines destroys one opposing creature and destroys a second with its own D2 field',()=>{
 for(const owner of [null,0,1]){
  const s=table(),vines=put(s,0,'battle',VINES);
  if(owner!==null)put(s,owner,'battle',D2);
  const first=put(s,1,'battle',NATURE),second=put(s,1,'battle',NATURE);
  attack(s,vines.uid);
  pick(s,first);
  if(owner===0){assert.deepEqual(values(s),[second.uid]);pick(s,second);}
  drain(s);
  assert.deepEqual(s.players[1].grave,[first,...(owner===0?[second]:[])]);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Vines cannot select the same surviving creature for the second destruction',()=>{
 const s=table(),vines=put(s,0,'battle',VINES);
 put(s,0,'battle',D2);
 const first=put(s,1,'battle','dm01-108'),second=put(s,1,'battle',NATURE);
 first.g34Grants=[{turn:s.turn,g465DestroySafe:true}];
 attack(s,vines.uid);
 pick(s,first);
 assert.deepEqual(values(s),[second.uid]);
 pick(s,second);
 drain(s);
 assert.ok(s.players[1].battle.includes(first));
 assert.ok(s.players[1].grave.includes(second));
});

test('Boltron attacks on its entry turn and applies power reduction only with its own field',()=>{
 for(const withField of [false,true]){
  const s=table();
  if(withField)put(s,0,'battle',D2);
  const victim=put(s,1,'battle',NATURE);
  cast(s,BOLT);
  const bolt=s.players[0].battle.find(x=>x.cardId===BOLT);
  assert.equal(bolt.entered,s.turn);
  attack(s,bolt.uid);
  if(withField)pick(s,victim);
  drain(s);
  assert.equal(s.players[1].grave.includes(victim),withField);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Wonder Warp returns only creatures including a creature twinpact and draws the moved count',()=>{
 const s=table(),own=s.players[0];
 put(s,0,'battle',D2);
 give(s,0,'grave',[NATURE,SPELL,TWIN]);
 const [a,spell,b]=own.grave;
 const before=own.deck.slice();
 cast(s,WONDER);
 assert.deepEqual(own.grave,[spell]);
 assert.equal(own.hand.length,2);
 assert.deepEqual(new Set([...own.deck,...own.hand]),new Set([...before,a,b]));
 assert.equal(e.card(WONDER).blocker,true);
});

test('Wonder Warp respects the grave lock and the D2 field condition',()=>{
 for(const [withField,withLock,creature] of [[false,false,true],[true,true,true],[true,false,false]]){
  const s=table(),own=s.players[0],grave=put(s,0,'grave',creature?NATURE:SPELL);
  if(withField)put(s,0,'battle',D2);
  if(withLock)put(s,1,'battle',APUL);
  const before=own.deck.map(x=>x.uid);
  cast(s,WONDER);
  assert.deepEqual(own.grave,[grave]);
  assert.deepEqual(own.hand,[]);
  assert.equal(own.deck.map(x=>x.uid).join(',')!==before.join(','),withLock);
 }
});

test('Wonder Warp resolves the position of returned cards before drawing under Q.Q.QX.',()=>{
 const s=table(),own=s.players[0];
 put(s,0,'battle',D2);
 put(s,1,'battle',QQ);
 const creature=put(s,0,'grave',NATURE),before=own.deck.slice();
 cast(s,WONDER);
 assert.equal(s.decision.player,0);
 assert.match(s.decision.title,/位置/);
 pick(s,0);
 assert.deepEqual(own.hand,[creature]);
 assert.deepEqual(own.deck,before);
});

test('Pappi reveals only a selected Phoenix and keeps it on top after the shuffle',()=>{
 const s=table(),own=s.players[0],phoenix=put(s,0,'deck',PHOENIX);
 const before=own.deck.map(x=>x.uid);
 cast(s,PAPPI);
 assert.deepEqual(values(s),[phoenix.uid,null]);
 pick(s,phoenix);
 assert.equal(own.deck[0],phoenix);
 assert.notDeepEqual(own.deck.slice(1).map(x=>x.uid),before.slice(0,-1));
 assert.deepEqual(own.g34Protected,[]);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===PHOENIX).length,1);
});

test('Pappi shuffles when the reveal is declined or no Phoenix is present',()=>{
 for(const eligible of [false,true]){
  const s=table(),own=s.players[0];
  if(eligible)put(s,0,'deck',PHOENIX);
  const before=own.deck.map(x=>x.uid);
  cast(s,PAPPI);
  pick(s,null);
  assert.notDeepEqual(own.deck.map(x=>x.uid),before);
  assert.equal(own.deck.length,before.length);
  assert.deepEqual(own.g34Protected,[]);
 }
});

test('Pappi cannot inspect or reorder its deck under Q.Q.QX.',()=>{
 const s=table(),own=s.players[0];
 put(s,1,'battle',QQ);
 put(s,0,'deck',PHOENIX);
 const before=own.deck.slice();
 cast(s,PAPPI);
 assert.equal(s.decision,null);
 assert.deepEqual(own.deck,before);
});
