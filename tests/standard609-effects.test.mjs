import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-609.json',import.meta.url)));
const KAREN='dmex08-046', KYOBO='dmr08s-004', SABBATH='dm23sd3-012';
const SMALL='dm01-083', BIG='dmx12b-004', SPEED='dm05-049', MACH='dmbd09-010', NEO='dm25rp3-S09';
const SEED='dm22ex1-086';
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=place(s,0,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:609}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:608}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('the two Children grant speed at opposite cost ranges only while their abilities are active',()=>{
 for(const [source,small,big] of [[KAREN,false,true],[KYOBO,true,false]]){
  const s=setup(),watcher=place(s,0,'battle',source),low=place(s,0,'battle',SMALL),high=place(s,0,'battle',BIG);
  assert.ok(e.card(high).cost>=4&&!e.card(high).speedAttacker);
  assert.equal(!!e.effectiveCard(low,s).speedAttacker,small);
  assert.equal(!!e.effectiveCard(high,s).speedAttacker,big);
  watcher.g35Ignored=s.turn;
  assert.equal(!!e.effectiveCard(low,s).speedAttacker,false);
  assert.equal(!!e.effectiveCard(high,s).speedAttacker,false);
 }
});

test('printed speed enters tapped but speed granted by a battlefield aura starts after entry',()=>{
 for(const source of [KAREN,KYOBO]){
  const s=setup();
  const watcher=place(s,1,'battle',source);
  place(s,0,'battle',KYOBO);
  assert.equal(play(s,SPEED).tapped,true);
  const ordinary=play(s,SMALL);
  assert.equal(ordinary.tapped,false);
  assert.equal(e.effectiveCard(ordinary,s).speedAttacker,true);
  watcher.g35Ignored=s.turn;
  assert.equal(!!play(s,SPEED).tapped,false);
 }
});

test('Karen taps a printed Mach Fighter while Kyobo only taps speed and evolution',()=>{
 for(const [source,tapped] of [[KAREN,true],[KYOBO,false]]){
  const s=setup();
  place(s,1,'battle',source);
  assert.equal(!!play(s,MACH).tapped,tapped);
 }
});

test('the same NEO card enters tapped only when it actually evolves',()=>{
 for(const evolve of [false,true]){
  const s=setup(),base=place(s,0,'battle','dm01-076');
  place(s,1,'battle',KAREN);
  const neo=play(s,NEO);
  act(s,'evolve',a=>(a.baseUid??null)===(evolve?base.uid:null));
  assert.equal(e.isEvolution(neo),evolve);
  assert.equal(!!neo.tapped,evolve);
 }
});

test('AQsabbath bounces a creature and its spell face removes a cheap noncreature element',()=>{
 const s=setup(),enemy=place(s,1,'battle',BIG),seed=place(s,1,'battle',SEED);
 const creature=play(s,SABBATH);
 act(s,'extended',a=>s.decision.choices[a.choice].value.uid===enemy.uid);
 assert.ok(s.players[0].battle.includes(creature));
 assert.ok(s.players[1].hand.includes(enemy));
 const high=place(s,1,'battle',BIG);
 const spell=play(s,SABBATH,1);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[seed.uid]);
 act(s,'extended');
 assert.ok(s.players[1].grave.includes(seed));
 assert.ok(s.players[1].battle.includes(high));
 assert.ok(s.players[0].grave.includes(spell));
});

test('CPU uses the guitar against a cheap D2 field with two mana',()=>{
 const s=setup(),field=place(s,1,'battle','dmrp08-005'),guitar=place(s,0,'hand',SABBATH);
 s.players[0].mana=s.players[0].mana.filter(x=>e.card(x).civ==='火').slice(0,2);
 const a=e.chooseAI(s);
 assert.equal(a.kind,'play');
 assert.equal(a.uid,guitar.uid);
 assert.equal(a.face,1);
 e.step(s,a);
 act(s,'extended');
 assert.ok(s.players[1].grave.includes(field));
});
