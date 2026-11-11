import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ARGOLUS='dm23-026',PROMO='promoy5-064',REVERSE='dm22-008',FORCE='dm28-021';
const PLAIN='dm01-108',MARINE='dm21-043',SECOND_MARINE='dm19-057';
const GALAXY='dm26rp1-S001',COPY='dmrp22-1B',STRATO='dm22rp2-048';
const PLUTO='dm19-s06',NEO='dmrp02-080',MULTI='dmr02-054';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=cards=>cards.map(x=>x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function trigger(s,id,linked){
 s.active=1;
 const [shield]=give(s,0,'shields',[id]);
 if(linked)linked.g35ShieldForce=shield.uid;
 const attacker=put(s,1,'battle',PLAIN);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 return shield;
}

test('Phase 939 verifies four complete official printings and uses one canonical ID per name',()=>{
 const m=read('tools/support-phase-939.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ARGOLUS,REVERSE,FORCE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PROMO,ARGOLUS]]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),f=row.faces[0],c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:939}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:938}));
  const extra=structuredClone(d);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:939}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],[f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-939');
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:939}),m.cards.find(x=>x.id===id).spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.equal(cat.resolveRows([{id:row.id,count:1}])[0].id,id);
 }
 const deck={id:'phase939',name:'進化元とシールド・フォース',cards:[PROMO,REVERSE,FORCE,PLAIN,MARINE,SECOND_MARINE,GALAXY,STRATO,MULTI,NEO].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Argolus privately checks the top three, deploys only one eligible Marine and orders the rest on top',async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');
 let s=field();
 const [first,second,wrong,below]=give(s,0,'deck',[MARINE,SECOND_MARINE,PLAIN,MARINE,PLAIN]);
 play(s,ARGOLUS);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
 assert.deepEqual(projectRoom(room,{uid:'a'},1).game.inspectedCards.map(x=>x.id),[MARINE,SECOND_MARINE,PLAIN]);
 assert.equal(projectRoom(room,{uid:'b'},1).game.inspectedCards,undefined);
 s=restore(s);
 pick(s,second);
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,wrong);
 assert.deepEqual(ids(s.players[0].deck.slice(0,3)),[wrong.uid,first.uid,below.uid]);
 assert.ok(has(s,0,'battle',second));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.equal(s.players[0].g34Protected.length,0);
});

test('Argolus can skip deployment, and may reorder a short deck with no eligible card',()=>{
 for(const top of [[MARINE,PLAIN,SECOND_MARINE],[PLAIN,'dm01-097']]){
  const s=field(),looked=give(s,0,'deck',top);
  play(s,ARGOLUS);
  if(s.decision.task.op==='g34_Select')pick(s,null);
  assert.equal(s.decision.task.op,'g34_Order');
  const order=[...looked].reverse();
  for(const x of order.slice(0,-1))pick(s,x);
  assert.deepEqual(ids(s.players[0].deck),ids(order));
  assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[ARGOLUS]);
 }
});

test('Argolus filters by printed cost and respects entry restrictions',()=>{
 const s=field(),large=data.cards.find(c=>c.type==='creature'&&c.race?.includes('ディープ・マリーン')&&c.cost>3);
 assert.ok(large);
 const [expensive,small]=give(s,0,'deck',[large.id,MARINE,PLAIN,PLAIN]);
 play(s,ARGOLUS);
 assert.deepEqual(values(s),[small.uid,null]);
 assert.ok(!values(s).includes(expensive.uid));
 pick(s,null);drain(s);

 const locked=field();
 const [candidate]=give(locked,0,'deck',[MARINE,PLAIN,PLAIN,PLAIN]);
 put(locked,1,'battle','dm26rp1-S008');
 play(locked,ARGOLUS);
 assert.equal(locked.decision.task.op,'g34_Select');
 assert.deepEqual(values(locked),[null]);
 pick(locked,null);
 drain(locked);
 assert.ok(has(locked,0,'deck',candidate));
});

test('Reverse Tone targets either player’s evolution and returns nested and face-down bases while leaving the top',()=>{
 let s=field();
 const nested=Object.assign(inst(PLAIN),{faceDown:true});
 const base=Object.assign(inst(NEO),{under:[nested]});
 const foreign=Object.assign(inst(MARINE),{cardOwner:0});
 const enemy=put(s,1,'battle',PLUTO,{under:[base,foreign]});
 const own=put(s,0,'battle',PLUTO);
 put(s,1,'battle',PLAIN,{under:[inst(PLAIN)]});
 const spell=play(s,REVERSE);
 assert.deepEqual(new Set(values(s)),new Set([enemy.uid,own.uid]));
 s=restore(s);
 pick(s,enemy);
 assert.ok(has(s,1,'battle',enemy)&&has(s,0,'battle',own)&&has(s,0,'grave',spell));
 assert.deepEqual(ids(s.players[1].hand),[base.uid,nested.uid]);
 assert.deepEqual(ids(s.players[0].hand),[foreign.uid]);
 assert.ok(s.players[1].hand.every(x=>!x.faceDown&&!x.under));
 assert.ok(!s.players[1].battle[0].under?.length);
 assert.ok(e.isEvolution(s.players[1].battle[0]));
});

test('Reverse Tone S-Trigger removes NEO status and leaves a summoning-sick creature',()=>{
 const s=field();
 const base=inst(PLAIN),neo=put(s,1,'battle',NEO,{under:[base],entered:s.turn});
 assert.ok(e.isEvolution(neo));
 const spell=trigger(s,REVERSE);
 pick(s,neo);
 assert.ok(has(s,1,'battle',neo)&&has(s,1,'hand',base)&&has(s,0,'grave',spell));
 assert.ok(!e.isEvolution(neo));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===neo.uid));
 assert.equal(s.metrics[0].triggers,1);
});

test('Reverse Tone respects selection protection and does nothing with no legal evolution',()=>{
 const s=field();
 const base=inst(PLAIN);
 const enemy=put(s,1,'battle',PLUTO,{under:[base],justDiverActive:true});
 put(s,0,'battle',PLAIN);
 const spell=play(s,REVERSE);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',enemy)&&has(s,0,'grave',spell));
 assert.deepEqual(enemy.under,[base]);
});

test('Reverse Tone lets Stratobag replace specific base moves and keeps hidden bases private',()=>{
 let s=field();
 const multi=inst(MULTI),hidden=Object.assign(inst(PLAIN),{faceDown:true});
 const target=put(s,0,'battle',PLUTO,{under:[multi,hidden]});
 put(s,1,'battle',STRATO);
 play(s,REVERSE);
 pick(s,target);
 assert.equal(s.decision.task.op,'g34_ReturnBases939');
 assert.equal(s.decision.player,1);
 assert.ok(!s.decision.choices.find(x=>x.value===hidden.uid).cardId);
 pick(s,multi);
 assert.equal(s.players[0].battle[0].under.length,2);
 s=restore(s);
 pick(s,null);
 assert.ok(has(s,0,'mana',multi)&&has(s,0,'hand',hidden)&&has(s,0,'battle',target));
 assert.equal(s.players[0].mana.find(x=>x.uid===multi.uid).tapped,true);
 assert.ok(!s.players[0].battle[0].under?.length);
});

test('Force Operation counts the ability even with no linked shield, but excludes opponents, ignored and underlying cards',()=>{
 const s=field();
 put(s,0,'battle',GALAXY);
 put(s,0,'battle',GALAXY,{g35ShieldForce:'shield-no-longer-present'});
 put(s,0,'battle',GALAXY,{g35Ignored:s.turn});
 put(s,1,'battle',GALAXY);
 put(s,0,'battle',PLUTO,{under:[inst(GALAXY)]});
 const sealed=put(s,0,'battle',GALAXY,{sealed:true});
 s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:sealed.uid});
 const expected=ids(s.players[0].deck.slice(0,2));
 const spell=play(s,FORCE);
 assert.deepEqual(ids(s.players[0].hand),expected);
 assert.ok(has(s,0,'grave',spell));
});

test('Force Operation’s S-Trigger counts a copied Shield Force once even after the linked shield breaks',()=>{
 const s=field();
 const galaxy=put(s,0,'battle',GALAXY);
 const copy=put(s,0,'battle',COPY,{g393JCopies:[
  {key:'force1',cardId:GALAXY,expiresPlayer:0},
  {key:'force2',cardId:GALAXY,expiresPlayer:0}
 ]});
 const expected=ids(s.players[0].deck.slice(0,2));
 const spell=trigger(s,FORCE,galaxy);
 assert.ok(has(s,0,'battle',copy)&&has(s,0,'grave',spell));
 assert.deepEqual(ids(s.players[0].hand),expected);
 assert.equal(s.metrics[0].triggers,1);
});

test('Force Operation with no Shield Force creatures resolves without drawing',()=>{
 const s=field();
 put(s,0,'battle',PLAIN);
 const deck=ids(s.players[0].deck);
 const spell=play(s,FORCE);
 drain(s);
 assert.deepEqual(ids(s.players[0].deck),deck);
 assert.ok(has(s,0,'grave',spell));
});
