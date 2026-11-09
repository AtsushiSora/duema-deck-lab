import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-703.json',import.meta.url)));

test('Phase 703 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:703}));
  assert.throws(()=>standardCardSpec(detail,{phase:702}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:703}));
 }
});

const PUMPKIN='dm22ex1-119',EARTH='dm22ex1-101',GRANDO='dm22ex1-088';
const BODY='dm01-108',WAVE='dm11-024',SEED='dmsd20-016',BLOCKER='dm01-076';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const play=(s,id,face=0)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
};
const trigger=(s,id,attacker)=>{
 give(s,1,'shields',[id]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===1);
 return shield;
};

for(const [twin,single] of [[PUMPKIN,'dm11-053'],[EARTH,'dm11-038'],[GRANDO,'dm11-016']])test(twin+' matches the original front effect and remains a separate deck identity',()=>{
 const row=cards.find(x=>x.id===twin),original=details.cards.find(x=>x.id===single);
 const {spellFace,...front}=row.spec;
 assert.deepEqual(front,standardCardSpec(original,{phase:702}));
 const deck=structuredClone(PRESETS[0]);
 deck.cards.splice(0,2,{id:single,count:4},{id:twin,count:4});
 assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);
 assert.deepEqual(e.validateDeck(deck),[]);
 const unknown=structuredClone(details.cards.find(x=>x.id===twin));
 unknown.faces[1].abilityText+='\nカードを１枚引く。';
 assert.throws(()=>standardCardSpec(unknown,{phase:703}));
});

test('Pumpkin’s active Wave condition excludes a 5000-power blocker and allows a 5001-power blocker',()=>{
 const s=setup(),pumpkin=play(s,PUMPKIN);
 assert.equal(e.power(pumpkin,false,s),2000);
 pumpkin.entered=0;
 put(s,0,WAVE);
 put(s,1,WAVE);
 assert.equal(e.power(pumpkin,false,s),6000);
 const exact=put(s,1,BLOCKER,{powerModifiers:[{amount:5000-e.card(BLOCKER).power}]});
 const above=put(s,1,BLOCKER,{powerModifiers:[{amount:5001-e.card(BLOCKER).power}]});
 attack(s,pumpkin.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),[above.uid]);
 act(s,'block',a=>a.uid===above.uid);
 assert.ok(has(s,1,'battle',exact));
 assert.ok(has(s,1,'grave',above));
});

test('Glory Muscle targets one own creature, resumes its choice, and wears off at turn end',()=>{
 let s=setup();
 const ally=put(s,0,BODY),enemy=put(s,1,BODY),seed=put(s,0,SEED);
 const spell=play(s,PUMPKIN,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 const targets=e.getLegalActions(s).filter(a=>a.kind==='extended').map(a=>s.decision.choices[a.choice].value?.uid);
 assert.deepEqual(targets,[ally.uid]);
 assert.ok(!targets.includes(enemy.uid)&&!targets.includes(seed.uid));
 s=restore(s);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===ally.uid);
 assert.equal(e.power(s.players[0].battle.find(x=>x.uid===ally.uid),false,s),6000);
 assert.ok(has(s,0,'grave',spell));
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(s.players[0].battle.find(x=>x.uid===ally.uid),false,s),2000);
});

test('Earthra gains its power and can block while the third Wave creature is present',()=>{
 const s=setup(),earth=put(s,1,EARTH),attacker=put(s,0,BODY);
 const peer=put(s,1,WAVE);
 assert.equal(e.power(earth,false,s),2000);
 assert.ok(!e.effectiveCard(earth,s).blocker);
 put(s,0,WAVE);
 assert.equal(e.power(earth,false,s),6000);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===earth.uid);
 assert.ok(has(s,0,'grave',attacker));
 peer.sealed=true;
 assert.equal(e.power(earth,false,s),2000);
 assert.ok(!e.effectiveCard(earth,s).blocker);
});

test('Glory Stone uses S-Trigger and only ramps with strictly fewer mana cards',()=>{
 for(const opponentMana of [1,2,3]){
  const s=setup(),attacker=put(s,0,BODY);
  give(s,0,'mana',Array(opponentMana).fill(BODY));
  give(s,1,'mana',[BODY,BODY]);
  give(s,1,'deck',[BODY,BODY]);
  const top=s.players[1].deck[0];
  const spell=trigger(s,EARTH,attacker);
  assert.ok(has(s,1,'grave',spell));
  assert.equal(has(s,1,'mana',top),opponentMana===3);
  assert.equal(has(s,1,'deck',top),opponentMana!==3);
  if(opponentMana===3)assert.equal(s.players[1].mana.find(x=>x.uid===top.uid).tapped,false);
 }
});

test('Grando enters without a sweep below the Wave threshold and includes itself at the 2000 boundary',()=>{
 for(const ready of [false,true]){
  const s=setup(),ally=put(s,0,BODY),enemy=put(s,1,BODY),large=put(s,1,BODY,{powerModifiers:[{amount:1}]});
  put(s,0,WAVE);
  if(ready)put(s,1,WAVE);
  const source=play(s,GRANDO);
  for(const [p,x] of [[0,source],[0,ally],[1,enemy]])assert.ok(has(s,p,ready?'grave':'battle',x));
  assert.ok(has(s,1,'battle',large));
 }
});

test('Burst One Shot destroys only opponents at 3000 or less and checks 6000 after the sweep',()=>{
 for(const dynamic of [false,true]){
  const s=setup(),attacker=put(s,0,BODY,{powerModifiers:[{amount:1000}]}),strong=put(s,0,BODY,{powerModifiers:[{amount:1001}]});
  const ally=dynamic?put(s,1,EARTH):put(s,1,BODY,{powerModifiers:[{amount:4000}]});
  const smallAlly=put(s,1,BODY);
  if(dynamic){put(s,0,WAVE);put(s,1,WAVE);}
  const top=s.players[1].deck[0];
  assert.equal(e.power(ally,false,s),6000);
  const spell=trigger(s,GRANDO,attacker);
  assert.ok(has(s,0,'grave',attacker));
  assert.ok(has(s,0,'battle',strong));
  assert.ok(has(s,1,'battle',smallAlly));
  assert.ok(has(s,1,'battle',ally));
  assert.ok(has(s,1,'grave',spell));
  assert.equal(has(s,1,'hand',top),!dynamic);
  if(dynamic)assert.equal(e.power(ally,false,s),2000);
 }
});
