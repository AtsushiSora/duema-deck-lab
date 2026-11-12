import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const OLIVE='dm23ex3-058',APOCALYPSE='dm23ex3-002',GRATITUDE='dm24bd6-010';
const W='dm01-083',N='dm01-108',D='dm01-090',L='dm01-075';
const COLORLESS='dm24bd6-008',ONIKAMASU='dmrp01-041',SEED='dmrp22-056',COURTNEY='dm13-015';
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x,face=0)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(a.face||0)===face);
const cast=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const restore=s=>decodeBattleData(encodeBattleData(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('official metadata and reprint retain the canonical battle definitions',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
 const m=read('tools/support-phase-1041.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[OLIVE,APOCALYPSE,GRATITUDE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm24bd6-017',APOCALYPSE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(registry.get(row.id).id,id);
  assert.ok(registry.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>x!=='無色'),1,m.regulationVerification.limits[row.id]]);
  if(row.faces.length===2)assert.deepEqual([c.spellFace.name,c.spellFace.cost,e.civilizations(c.spellFace)],
   [row.faces[1].name,row.faces[1].cost,row.faces[1].civilizations]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1041}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const draws of [0,1,2])test('Olive Oil draws one at a time and discards exactly once after drawing '+draws,()=>{
 let s=setup();
 const olive=add(s,0,'hand',OLIVE),discard=add(s,0,'hand',D),top=s.players[0].deck.slice(0,2);
 add(s,0,'mana',COLORLESS,{tapped:true});
 s.players[0].mana.at(-2).faceDown=true;
 const all=physical(s);
 cast(s,olive);
 assert.equal(s.decision.task.n,2);
 for(let i=0;i<draws;i++){
  choose(s,true);
  assert.ok(find(s,0,'hand',top[i]));
  s=restore(s);
 }
 if(draws<2)choose(s,null);
 if(draws){
  assert.equal(s.decision.task.op,'discard');
  choose(s,discard.uid);
  assert.ok(find(s,0,'grave',discard));
 }else assert.ok(find(s,0,'hand',discard));
 assert.equal(s.players[0].hand.length,draws||1);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Olive Oil checks current mana civilizations and does not discard when it can draw nothing',()=>{
 const s=setup(),olive=add(s,0,'hand',OLIVE),keep=add(s,0,'hand',N),first=s.players[0].deck[0];
 add(s,0,'mana',COLORLESS);
 s.players[0].mana[0].faceDown=true;
 add(s,0,'battle',COURTNEY);
 cast(s,olive);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'hand',keep));
 assert.equal(s.players[0].deck[0].uid,first.uid);
});

test('Abracatabura requires a face-up mana card to be flipped without changing its tapped state',()=>{
 let s=setup();
 give(s,0,'mana',[W,N,COLORLESS]);
 const [paid,untapped,hidden]=s.players[0].mana;
 hidden.faceDown=true;
 cast(s,add(s,0,'hand',OLIVE),1);
 assert.deepEqual(new Set(choices(s)),new Set([paid.uid,untapped.uid]));
 assert.equal(paid.tapped,true);
 const loaded=restore(s);
 choose(loaded,paid.uid);
 assert.ok(find(loaded,0,'mana',paid).faceDown&&find(loaded,0,'mana',paid).tapped);
 choose(s,untapped.uid);
 assert.ok(find(s,0,'mana',untapped).faceDown&&!find(s,0,'mana',untapped).tapped);
});

test('Abracatabura resolves with an empty mana zone when a free cast pays no cost',()=>{
 const s=setup();
 give(s,0,'mana',[]);
 const spell=add(s,0,'hand',OLIVE);
 s.extTasks=[{op:'g34_Execute',p:0,source:APOCALYPSE,origin:'hand',max:1,spellOnly:true}];
 act(s,'toAttack');
 choose(s,spell.uid);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'grave',spell));
});

test('Apocalypse spends three per crystal only for its cast and draws after the sweep',()=>{
 let s=setup();
 give(s,0,'mana',[N,N,N,N]);
 const [a,b,c,ordinary]=s.players[0].mana,spell=add(s,0,'hand',APOCALYPSE),top=s.players[0].deck.slice(0,3);
 for(const x of [a,b,c])x.faceDown=true;
 assert.equal(play(s,spell).cost,10);
 assert.deepEqual(e.paymentPool(s,0,[],e.card(APOCALYPSE)).map(x=>x.paymentValue),[3,3,3,undefined]);
 assert.ok(e.paymentPool(s,0).every(x=>x.paymentValue===undefined));
 ordinary.tapped=true;
 assert.equal(play(s,spell),undefined);
 ordinary.tapped=false;
 e.step(s,play(s,spell),{manualMana:true});
 s=restore(s);
 for(const x of [a,b,c,ordinary])act(s,'selectMana',q=>q.uid===x.uid);
 act(s,'confirmMana');
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.map(x=>x.uid));
 assert.ok(find(s,0,'grave',spell));
});

test('Apocalypse still uses crystal soul under zero mana values',()=>{
 const s=setup();
 give(s,0,'mana',[N,N,N,N,N]);
 s.g35ZeroMana=[{p:0}];
 for(const x of s.players[0].mana.slice(0,4))x.faceDown=true;
 const spell=add(s,0,'hand',APOCALYPSE);
 assert.deepEqual(e.paymentPool(s,0,[],e.card(APOCALYPSE)).map(x=>x.paymentValue),[3,3,3,3,0]);
 cast(s,spell);
 assert.deepEqual(s.players[0].mana.map(x=>x.tapped),[true,true,true,true,false]);
});

test('Apocalypse makes the opponent order colored low-cost elements, including an unselectable creature',()=>{
 let s=setup();
 const spell=add(s,0,'hand',APOCALYPSE),ally=add(s,0,'battle',L);
 const creature=add(s,1,'battle',ONIKAMASU),seed=add(s,1,'battle',SEED);
 const colorless=add(s,1,'battle',COLORLESS),large=add(s,1,'battle','dm24ex2-019'),all=physical(s);
 assert.ok(e.civilizations(e.card(SEED)).length);
 assert.equal(s.players[0].hand.length,1);
 cast(s,spell);
 assert.equal(s.decision.task.op,'g78_BottomOrder');
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(choices(s)),new Set([creature.uid,seed.uid]));
 assert.equal(s.players[0].hand.length,0);
 s=restore(s);
 choose(s,seed.uid);
 assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[seed.uid,creature.uid]);
 assert.ok(find(s,1,'battle',colorless)&&find(s,1,'battle',large)&&find(s,0,'battle',ally));
 assert.equal(s.players[0].hand.length,3);
 assert.deepEqual(physical(s),all);
});

for(const flip of [false,true])test('Gratitude moves a chosen element to its owner and lets the caster decide on both mana cards '+flip,()=>{
 let s=setup();
 const spell=add(s,0,'hand',GRATITUDE),target=add(s,1,'battle',SEED,{cardOwner:0});
 const untargetable=add(s,1,'battle',ONIKAMASU);
 const hiddenBattleCard=add(s,1,'battle',N,{faceDown:true}),all=physical(s);
 const own=s.players[0].mana[0],other=s.players[1].mana[0],hidden=s.players[1].mana[1];
 other.tapped=true;
 hidden.faceDown=true;
 cast(s,spell);
 assert.deepEqual(choices(s),[target.uid]);
 choose(s,target.uid);
 assert.equal(s.players[0].deck.at(-1).uid,target.uid);
 assert.ok(find(s,1,'battle',untargetable)&&find(s,1,'battle',hiddenBattleCard));
 assert.equal(s.decision.player,0);
 choose(s,own.uid);
 assert.equal(s.decision.player,1);
 assert.ok(choices(s).includes(hidden.uid));
 assert.equal(s.decision.choices.find(c=>c.value.uid===hidden.uid).cardId,undefined);
 s=restore(s);
 choose(s,other.uid);
 assert.equal(s.decision.player,0);
 assert.ok(!find(s,0,'mana',own).faceDown&&!find(s,1,'mana',other).faceDown);
 choose(s,flip?true:null);
 assert.equal(!!find(s,0,'mana',own).faceDown,flip);
 assert.equal(!!find(s,1,'mana',other).faceDown,flip);
 assert.ok(find(s,1,'mana',other).tapped&&find(s,1,'mana',hidden).faceDown);
 assert.deepEqual(physical(s),all);
});

test('Gratitude S-Trigger starts mana choices from the turn player when no enemy element can be selected',()=>{
 const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',ONIKAMASU);
 give(s,0,'shields',[GRATITUDE,N]);
 give(s,0,'mana',[]);
 const spell=s.players[0].shields[0],other=s.players[1].mana[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 assert.equal(s.decision.player,1);
 choose(s,other.uid);
 assert.equal(s.decision.player,0);
 choose(s,true);
 drain(s);
 assert.ok(find(s,1,'mana',other).faceDown&&find(s,1,'battle',attacker)&&find(s,0,'grave',spell));
});
