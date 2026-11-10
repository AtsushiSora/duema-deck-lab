import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-774.json',import.meta.url)));
const AKA='dm23rp4-021',BANKY='dm23rp4-026',VIOLET='dm23rp3-018';
const BODY='dm01-108',FIRE='dm01-097',NEO='dm24ex2-068';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:774}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:774}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:774}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

function change(s,attacker,target='player'){
 attack(s,attacker.uid,target);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,attacker.uid);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
const live=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const draws=s=>s.decision?.task?.op==='g34_Draw';
const grants=(s,x)=>Boolean(e.effectiveCard(x,s).speedAttacker);
const deck=(s,id)=>give(s,0,'deck',Array(8).fill(id));
function passAttack(s){
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

for(const id of ['dm23rp3-064','dm23rp1-066'])test('Aka changes from the listed tribe and draws even after destroying the attack target '+id,()=>{
 let s=setup();
 const attacker=put(s,0,'battle',id),aka=put(s,0,'hand',AKA),enemy=put(s,1,'battle',BODY),large=put(s,1,'battle','dm01-001');
 enemy.tapped=true;
 change(s,attacker,enemy.uid);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,1,'battle',large)&&has(s,0,'battle',aka));
 assert.ok(draws(s));
 const n=s.players[0].hand.length;
 s=restore(s);
 pick(s,1);
 assert.equal(s.players[0].hand.length,n+1);
 assert.equal(s.decision,null);
});

test('Aka offers a draw when the declared creature target is sealed (QA 48903)',()=>{
 const s=setup(),aka=put(s,0,'battle',AKA),attacker=put(s,0,'battle','dm26rp2-OR001'),enemy=put(s,1,'battle',BODY);
 enemy.tapped=true;
 attack(s,attacker.uid,enemy.uid);
 pick(s,enemy.uid);
 assert.ok(enemy.sealed&&has(s,0,'battle',aka));
 assert.ok(draws(s));
 pick(s,0);
 assert.equal(s.decision,null);
});

test('Aka has no destruction on normal entry, and only watches its controller’s attacks',()=>{
 const s=setup(),enemy=put(s,1,'battle',BODY),ally=put(s,0,'battle',BODY);
 play(s,AKA);
 assert.equal(s.decision,null);
 attack(s,ally.uid);
 passAttack(s);
 assert.ok(draws(s));
 pick(s,0);
 s.active=1;
 attack(s,enemy.uid);
 passAttack(s);
 assert.equal(s.decision,null);
});

test('Banky shuffles, publicly reveals the new top and takes a noncreature to hand',()=>{
 const s=setup();
 deck(s,'dm01-110');
 const before=s.players[0].deck.map(x=>x.uid);
 play(s,BANKY);
 const drawn=s.players[0].hand[0];
 assert.equal(drawn.cardId,'dm01-110');
 assert.notDeepEqual([drawn.uid,...s.players[0].deck.map(x=>x.uid)],before);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===BANKY&&x.text.includes(e.card('dm01-110').name)));
 assert.ok(!s.g537Delays?.length);
});

test('Banky grants actual speed and returns the same entrant at the opponent’s start after JSON restoration',()=>{
 let s=setup();
 deck(s,BODY);
 play(s,BANKY);
 const x=s.players[0].battle[0];
 assert.ok(grants(s,x));
 assert.equal(s.g537Delays[0].uid,x.uid);
 s=restore(s);
 act(s,'toAttack');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 end(s);
 assert.equal(s.active,1);
 assert.ok(has(s,0,'hand',x));
 assert.ok(!has(s,0,'battle',x)&&!s.g537Delays.length);
});

test('Banky’s delayed return follows an entrant through evolution',()=>{
 const s=setup();
 deck(s,FIRE);
 play(s,BANKY);
 const x=s.players[0].battle[0],evolution=put(s,0,'hand',NEO);
 act(s,'play',a=>a.uid===evolution.uid);
 act(s,'evolve',a=>a.baseUid===x.uid);
 end(s);
 assert.ok(has(s,0,'hand',evolution)&&has(s,0,'hand',x));
});

test('Banky does not return a creature that left and entered again',()=>{
 const s=setup();
 deck(s,BODY);
 play(s,BANKY);
 const x=s.players[0].battle[0];
 task(s,'g34_ExactMove',0,{owner:0,target:x.uid,to:'hand'});
 s.phase='main';
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(!grants(s,live(s,0,'battle',x)));
 end(s);
 assert.ok(has(s,0,'battle',x));
});

test('Banky’s speed and delayed return are suppressed by Genmu that it puts into play (QA 44188)',()=>{
 const s=setup();
 deck(s,GEN);
 play(s,BANKY);
 const x=s.players[0].battle.find(y=>y.cardId===GEN);
 assert.ok(x&&!grants(s,x));
 end(s);
 assert.ok(has(s,0,'battle',x)&&!s.g537Delays.length);
});

test('Banky does not grant speed or schedule return for a replaced deployment',()=>{
 const s=setup();
 deck(s,GEN);
 put(s,1,'battle','dmr20-066');
 play(s,BANKY);
 assert.ok(s.players[0].mana.some(x=>x.cardId===GEN&&!x.g34Grants?.length));
 assert.ok(!s.players[0].battle.some(x=>x.cardId===GEN)&&!s.g537Delays?.length);
});

test('Banky used as a Shield Trigger waits until the opponent’s following turn',()=>{
 const s=setup();
 deck(s,BODY);
 s.active=1;
 give(s,0,'shields',[BANKY,BODY]);
 const attacker=put(s,1,'battle',BODY);
 attack(s,attacker.uid);
 passAttack(s);
 act(s,'useTrigger',a=>a.cardId===BANKY);
 const x=s.players[0].battle[0];
 assert.ok(x&&grants(s,x));
 end(s);
 assert.equal(s.active,0);
 assert.ok(has(s,0,'battle',x)&&grants(s,x));
 end(s);
 assert.equal(s.active,1);
 assert.ok(has(s,0,'hand',x));
});

test('Violet entry offers only hidden positions and discards the selected UID',()=>{
 let s=setup();
 const first=put(s,1,'hand',BODY),second=put(s,1,'hand',FIRE);
 play(s,VIOLET);
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.deepEqual(s.decision.choices.map(x=>[x.value,x.cardId]),[[0,undefined],[1,undefined]]);
 s=restore(s);
 pick(s,1);
 assert.ok(has(s,1,'grave',second)&&has(s,1,'hand',first));
});

test('Violet double breaks before its attack-end destruction',()=>{
 const s=setup(),violet=put(s,0,'battle',VIOLET);
 attack(s,violet.uid);
 assert.ok(has(s,0,'battle',violet));
 passAttack(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,0,'grave',violet));
});

test('Violet can block and survives the battle only until its attack-end destruction',()=>{
 const s=setup(),violet=put(s,0,'battle',VIOLET),attacker=put(s,1,'battle',BODY);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===violet.uid);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'grave',violet));
 assert.equal(s.players[0].shields.length,5);
});

test('Violet can be summoned from a broken shield and resolve its discard',()=>{
 const s=setup(),attacker=put(s,1,'battle',BODY),discard=put(s,1,'hand',FIRE);
 give(s,0,'shields',[VIOLET]);
 s.active=1;
 attack(s,attacker.uid);
 passAttack(s);
 act(s,'useTrigger',a=>a.cardId===VIOLET);
 pick(s,0);
 assert.ok(s.players[0].battle.some(x=>x.cardId===VIOLET));
 assert.ok(has(s,1,'grave',discard));
});
