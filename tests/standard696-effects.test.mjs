import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-696.json',import.meta.url)));

test('Phase 696 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:696}));
  assert.throws(()=>standardCardSpec(detail,{phase:695}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:696}));
 }
});

const BALHORUS='dm13-001',SHOUT='dm12-013',WAVE='dm03-032';
const BODY='dm01-108',SPARK='dm01-015',GEAR='dm14-110';
const put=(s,p,id,extra={})=>{const x=Object.assign(inst(id),extra);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;};
const choose=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);

test('Four official reprints have the same rules and limits as their canonical card',()=>{
 assert.deepEqual(printAliases.map(x=>x.id),['dmc42-016','dmc68-003','dmx12b-061','promoy3-025']);
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.ok(canonical);
  assert.equal(row.name,canonical.name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:696}),canonical.spec);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[row.canonicalId]);
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

test('Balhorus forces only opponents that can attack and can block twice in one turn',()=>{
 const s=setup(),balhorus=play(s,BALHORUS);
 const first=put(s,1,BODY),second=put(s,1,BODY),fresh=put(s,1,BODY,{entered:s.turn});
 s.phase='attack';
 assert.ok(legal(s,'endTurn').length);
 s.active=1;
 assert.ok(!legal(s,'endTurn').length);
 for(const attacker of [first,second]){
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===balhorus.uid);
  assert.ok(has(s,1,'grave',attacker));
  assert.equal(balhorus.tapped,false);
  assert.equal(s.players[0].shields.length,5);
 }
 assert.ok(!legal(s,'attack').some(a=>a.uid===fresh.uid));
 assert.ok(legal(s,'endTurn').length);
});

test('Balhorus cannot attack the player and enters mana tapped',()=>{
 const s=setup(),balhorus=put(s,0,BALHORUS),enemy=put(s,1,BODY,{tapped:true});
 s.phase='attack';
 assert.deepEqual(legal(s,'attack').filter(a=>a.uid===balhorus.uid).map(a=>a.target),[enemy.uid]);
 const t=setup();t.phase='charge';
 give(t,0,'hand',[BALHORUS]);
 act(t,'charge');
 const charged=t.players[0].mana.at(-1);
 assert.equal(charged.cardId,BALHORUS);
 assert.equal(charged.tapped,true);
});

test('Dragon Shout chooses an exact current power and destroys matches on both sides after restore',()=>{
 let s=setup();
 const first=put(s,0,BODY,{powerModifiers:[{amount:3656}]}),second=put(s,1,BODY,{powerModifiers:[{amount:3656}]}),
  lower=put(s,1,BODY),boundary=put(s,1,BALHORUS),above=put(s,0,BODY,{powerModifiers:[{amount:4001}]});
 play(s,SHOUT);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[2000,5656,6000,0]);
 s=JSON.parse(JSON.stringify(s));
 choose(s,5656);
 assert.ok(has(s,0,'grave',first));
 assert.ok(has(s,1,'grave',second));
 for(const [p,x] of [[1,lower],[1,boundary],[0,above]])assert.ok(has(s,p,'battle',x));
});

test('Dragon Shout accepts the 6000 boundary and offers an equivalent choice with no matches',()=>{
 for(const value of [0,6000]){
  const s=setup(),boundary=put(s,1,BALHORUS),below=put(s,1,BODY);
  play(s,SHOUT);
  choose(s,value);
  assert.ok(has(s,1,value===0?'battle':'grave',boundary));
  assert.ok(has(s,1,'battle',below));
 }
});

test('Scorching Wave sweeps only opponents up to 3000 before selecting a shield without revealing it',()=>{
 let s=setup();
 const own=put(s,0,BODY),low=put(s,1,BODY),boundary=put(s,1,BODY,{powerModifiers:[{amount:1000}]}),
  high=put(s,1,BODY,{powerModifiers:[{amount:1001}]}),gear=put(s,1,GEAR);
 give(s,0,'shields',[BODY,SPARK,BODY]);
 const [first,stack,last]=s.players[0].shields;
 const stacked=inst(BODY);stack.shieldStack=[stacked];
 play(s,WAVE);
 assert.ok(has(s,1,'grave',low));
 assert.ok(has(s,1,'grave',boundary));
 for(const [p,x] of [[0,own],[1,high],[1,gear]])assert.ok(has(s,p,'battle',x));
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[first.uid,stack.uid,last.uid]);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 s=JSON.parse(JSON.stringify(s));
 choose(s,stack.uid);
 assert.ok(has(s,0,'grave',stack));
 assert.ok(has(s,0,'grave',stacked));
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[first.uid,last.uid]);
 assert.equal(s.decision,null);
});

test('Scorching Wave resolves either instruction even if the other has no applicable card',()=>{
 const a=setup(),enemy=put(a,1,BODY);give(a,0,'shields',[]);
 play(a,WAVE);
 assert.ok(has(a,1,'grave',enemy));
 assert.equal(a.decision,null);
 const b=setup();give(b,0,'shields',[SPARK]);const shield=b.players[0].shields[0];
 play(b,WAVE);
 choose(b,shield.uid);
 assert.ok(has(b,0,'grave',shield));
 assert.equal(b.decision,null);
});
