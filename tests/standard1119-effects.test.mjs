import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TREBOL='dm30-047',BULLET_TWIN='dmex17-083',FRANZ_TWIN='dmex17-112';
const OPEN='dm28-085',BULLET='dm29-047',GATE='dmex17-056',ETERNAL='dm25ex2-082';
const NATURE='dm01-108',WATER='dm01-083',BRAIN='dm01-052',KING='dm28-004';
const values=s=>s.decision.choices.map(c=>c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const face=(id,i=1)=>e.playFaces(e.card(id))[i];
const spent=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;

function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,i=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===i);
 return x;
}

test('three official full definitions and two reprints resolve to the existing canonical IDs',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1119.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1119}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces.at(-1).abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1119}));
 }
 assert.deepEqual(registry.resolveRows([{id:'dmpcd02-b15',count:1},{id:'dm23bd6-055',count:1}]),
  [{id:TREBOL,count:1},{id:FRANZ_TWIN,count:1}]);
});

test('both Trebol creature prints reduce only ordinary Knight Magic for their controller',()=>{
 for(const id of [TREBOL,BULLET_TWIN]){
  const s=setup();
  play(s,id);
  assert.equal(spent(s,0),2);
  assert.equal(e.summonCost(s,0,e.card(OPEN)),4);
  assert.equal(e.summonCost(s,0,e.card(GATE)),7);
  assert.equal(e.summonCost(s,0,face(FRANZ_TWIN)),4);
  assert.equal(e.summonCost(s,0,e.card(BRAIN)),4);
  assert.equal(e.summonCost(s,0,e.card('dm25ex2-104')),2);
  assert.equal(e.summonCost(s,0,e.card(ETERNAL)),5);
  assert.equal(e.summonCost(s,1,e.card(OPEN)),5);
  assert.equal(e.summonCost(s,0,e.card(TREBOL)),2);
 }
});

test('Trebol accepts or declines its reduction and counts as a Knight for the resolved spell',()=>{
 for(const amount of [0,1]){
  const s=setup();
  add(s,0,'battle',TREBOL);
  give(s,1,'hand',Array(3).fill(NATURE));
  play(s,BULLET);
  assert.equal(s.decision.task.op,'g34_PaySpell485');
  assert.deepEqual(values(s),[1,0,false]);
  pick(s,amount);
  pick(s,values(s)[0]);
  pick(s,true);
  pick(s,values(s)[0]);
  assert.equal(s.players[1].hand.length,1);
  assert.equal(spent(s,0),4-amount);
 }
});

test('Trebol and Franz reductions stack, retain the minimum one, and respect ability suppression',()=>{
 const s=setup();
 const providers=[TREBOL,BULLET_TWIN,FRANZ_TWIN].map(id=>add(s,0,'battle',id));
 assert.equal(e.summonCost(s,0,e.card(BULLET)),1);
 assert.equal(e.summonCost(s,0,e.card('dm28-057')),1);
 assert.equal(e.summonCost(s,0,e.card(BRAIN)),3);
 for(const x of providers)x.g35Ignored=s.turn;
 assert.equal(e.summonCost(s,0,e.card(BULLET)),4);
 assert.equal(e.summonCost(s,0,e.card(BRAIN)),4);
});

test('the Bullet Vice twinpact face discards twice with an ally and once without one',()=>{
 for(const knight of [false,true]){
  const s=setup();
  give(s,1,'hand',Array(3).fill(NATURE));
  if(knight)add(s,0,'battle',KING);
  const card=play(s,BULLET_TWIN,1);
  assert.equal(s.decision.player,1);
  pick(s,values(s)[0]);
  if(knight){
   assert.match(s.decision.title,/ナイト・マジック/);
   pick(s,true);
   pick(s,values(s)[0]);
   assert.match(s.decision.title,/マクシミリアン王/);
   pick(s,null);
  }
  assert.equal(s.players[1].hand.length,knight?1:2);
  assert.equal(s.metrics[0].played[BULLET_TWIN],1);
  assert.ok(s.players[0].grave.some(x=>x.uid===card.uid));
 }
});

test('Franz twinpact discounts a regular spell and casts its Open Brain face with independent draw counts',()=>{
 const s=setup();
 const franz=play(s,FRANZ_TWIN);
 assert.equal(spent(s,0),3);
 assert.equal(e.summonCost(s,0,e.card(BRAIN)),3);
 const spell=play(s,FRANZ_TWIN,1);
 pick(s,1);
 assert.equal(spent(s,0),7);
 pick(s,1);
 pick(s,true);
 pick(s,2);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(s.players[0].battle.some(x=>x.uid===franz.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===spell.uid));
 assert.equal(s.players[0].shields.length,5);
});

test('the Open Brain twinpact shield trigger costs no mana and uses the spell face',()=>{
 const s=setup();
 const attacker=add(s,0,'battle',NATURE);
 add(s,1,'battle',TREBOL);
 give(s,1,'shields',[FRANZ_TWIN]);
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===FRANZ_TWIN);
 pick(s,1);
 pick(s,true);
 pick(s,2);
 drain(s);
 assert.equal(s.players[1].hand.length,3);
 assert.equal(spent(s,1),0);
 assert.ok(s.players[1].grave.some(x=>x.cardId===FRANZ_TWIN));
});

test('Knight Magic on the twinpact Open Brain fires the spell-cast observer once (QA 40393)',()=>{
 const s=setup(),watcher=add(s,0,'battle','dm31-053');
 assert.ok(e.effectiveCard(watcher,s).g204SpellWatch);
 const count=s.players[0].mana.length;
 play(s,FRANZ_TWIN,1);
 pick(s,0);
 pick(s,true);
 pick(s,0);
 assert.equal(s.decision.source,watcher.cardId);
 pick(s,true);
 assert.equal(s.players[0].mana.length,count+1);
 assert.equal(s.decision,null);
 assert.equal(s.metrics[0].played[FRANZ_TWIN],1);
});
