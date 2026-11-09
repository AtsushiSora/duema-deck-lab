import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-729.json',import.meta.url)));

test('Phase 729 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:729}));
  assert.throws(()=>standardCardSpec(detail,{phase:728}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:729}));
 }
});

const DEATH='dm06-023', MEDUSA='dm07-s02', MINT='dm15-009';
const GHOST='dm01-055', VIRUS='dm01-049', GEAR='dm16-035', DEVICE='dm16-026';
const BEAST='dm01-108', BLOCKER='dm01-011', HAND='dm01-027', BOUNCE='dm05-024';
const HALKAS='dm01-080';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const link=(s,p,id,x)=>put(s,p,id,{crossedTo:{uid:x.uid,incarnation:x.incarnation||0}});
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const start=s=>{s.phase='attack';act(s,'endTurn');};
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('Death Specter reprint resolves to one original definition and shares the copy limit',()=>{
 const [print]=printAliases;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(print.faces,cards.find(c=>c.id===DEATH).faces);
 assert.equal(print.canonicalId,DEATH);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[DEATH]);
 assert.ok(print.verification.facesMatched);
 assert.deepEqual(catalogue.resolveRows([{id:print.id,count:2},{id:DEATH,count:2}]),[{id:DEATH,count:4}]);
 assert.ok(!data.cards.some(c=>c.id===print.id));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(refs.find(c=>c.id===print.id).image,print.image);
});

test('Death Specter evolves on an allied Ghost and shares Slayer only with allied Ghosts while present',()=>{
 const s=field(),base=put(s,0,GHOST),ally=put(s,0,GHOST),beast=put(s,0,BEAST),enemy=put(s,1,GHOST);
 const rival=put(s,1,BLOCKER,{tapped:true});
 const specter=inst(DEATH);
 s.players[0].hand.push(specter);
 act(s,'play',a=>a.uid===specter.uid);
 const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve'&&a.uid===specter.uid);
 assert.deepEqual(choices.map(a=>a.baseUid).sort(),[base.uid,ally.uid].sort());
 act(s,'evolve',a=>a.uid===specter.uid&&a.baseUid===base.uid);
 assert.equal(specter.under[0].uid,base.uid);
 assert.ok(e.effectiveCard(specter,s).slayer&&e.effectiveCard(ally,s).slayer);
 assert.ok(!e.effectiveCard(enemy,s).slayer&&!e.effectiveCard(beast,s).slayer);
 attack(s,specter.uid,rival.uid);
 drain(s);
 assert.ok(has(s,0,'grave',specter)&&has(s,1,'grave',rival));
 assert.ok(!e.effectiveCard(ally,s).slayer);
});

test('Medusa evolves only on Cyber Viruses and an entry draw stays at one card',()=>{
 const s=field(),base=put(s,0,VIRUS),beast=put(s,0,BEAST),enemy=put(s,1,VIRUS);
 const medusa=inst(MEDUSA);
 s.players[0].hand.push(medusa);
 act(s,'play',a=>a.uid===medusa.uid);
 const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve'&&a.uid===medusa.uid);
 assert.deepEqual(choices.map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(medusa.under[0].uid,base.uid);
 const before=s.players[0].deck.length;
 assert.equal(e.card(HALKAS).name,'アクア・ハルカス');
 play(s,HALKAS);
 act(s,'draw',a=>a.n===1);
 drain(s);
 assert.equal(s.players[0].deck.length,before-1);
 assert.ok(has(s,0,'battle',beast)&&has(s,1,'battle',enemy));
});

for(const selections of [[false],[true],[true,false],[true,true]])test('Medusa chooses separately before its normal draw '+selections.join(','),()=>{
 let s=field();
 for(const _ of selections)put(s,0,MEDUSA);
 put(s,1,MEDUSA);
 s.active=1;
 const deck=s.players[0].deck.length,rival=s.players[1].deck.length;
 start(s);
 assert.equal(s.decision.task.op,'g34_StartDraw729');
 s=restore(s);
 for(const yes of selections)pick(s,yes?true:null);
 assert.equal(s.players[0].deck.length,deck-1-selections.filter(Boolean).length);
 assert.equal(s.players[1].deck.length,rival);
 assert.equal(s.phase,'charge');
});

test('first player skips the opening draw and declining a later extra draw avoids deck-out',()=>{
 let s=e.createGame([PRESETS[0],PRESETS[1]],{seed:1313});
 put(s,0,MEDUSA);
 const deck=s.players[0].deck.length;
 act(s,'skipCharge');
 assert.equal(s.players[0].deck.length,deck);
 start(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 for(const take of [false,true]){
  const next=restore(s);
  give(next,0,'deck',[BEAST,BEAST]);
  start(next);
  pick(next,take?true:null);
  assert.equal(next.players[0].deck.length,take?0:1);
  assert.equal(next.winner,take?1:null);
 }
});

for(const crossed of [true,false])test('Mint is unblockable only while crossed '+crossed,()=>{
 const s=field(),mint=put(s,0,MINT);
 if(crossed)link(s,0,GEAR,mint);
 const defender=put(s,1,BLOCKER);
 attack(s,mint.uid);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===defender.uid),!crossed);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Mint can sacrifice its last cross gear after losing a battle, including after restore',()=>{
 let s=field();
 const mint=put(s,0,MINT),gear=link(s,0,GEAR,mint),rival=put(s,1,BLOCKER,{tapped:true});
 attack(s,mint.uid,rival.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'leaveReplace');
 s=restore(s);
 act(s,'replaceUltra',a=>a.uid===gear.uid);
 drain(s);
 assert.ok(has(s,0,'battle',mint)&&has(s,0,'grave',gear));
 assert.ok(!e.effectiveCard(s.players[0].battle.find(x=>x.uid===mint.uid),s).unblockable);
});

test('Mint can choose which cross gear to lose, or decline a spell destruction replacement',()=>{
 const s=field(),mint=put(s,0,MINT),gear=link(s,0,GEAR,mint),other=link(s,0,DEVICE,mint);
 put(s,0,GEAR,{crossedTo:{uid:mint.uid,incarnation:99}});
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===mint.uid));
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceUltra').map(a=>a.uid),[gear.uid,other.uid]);
 const declined=restore(s);
 act(declined,'allowLeave');
 assert.ok(has(declined,0,'grave',mint)&&has(declined,0,'battle',other));
 act(s,'replaceUltra',a=>a.uid===other.uid);
 assert.ok(has(s,0,'battle',mint)&&has(s,0,'grave',other)&&has(s,0,'battle',gear));
 assert.ok(e.effectiveCard(mint,s).unblockable);
});

test('Mint can use a gear already in the same destruction batch without moving it twice',()=>{
 const s=field(),mint=put(s,0,MINT),gear=link(s,0,GEAR,mint);
 s.extTasks=[{op:'g34_Sweep',p:1,source:HAND,filter:{}}];
 act(s,'toAttack');
 act(s,'replaceUltra',a=>a.uid===gear.uid);
 assert.ok(has(s,0,'battle',mint));
 assert.ok(has(s,0,'grave',gear));
 assert.equal(e.physicalCards(s).filter(x=>x.uid===gear.uid).length,1);
});

test('Mint cannot replace return to hand, and no gear is moved',()=>{
 const s=field(),mint=put(s,0,MINT),gear=link(s,0,GEAR,mint);
 s.active=1;
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===mint.uid));
 assert.ok(has(s,0,'hand',mint)&&has(s,0,'battle',gear));
 assert.equal(s.decision,null);
});

test('An ignored Medusa gives only the normal draw and an ignored Mint cannot replace destruction',()=>{
 const s=field(),mint=put(s,0,MINT);
 link(s,0,GEAR,mint);
 put(s,0,MEDUSA);
 put(s,1,'dmrp15-km1');
 s.active=1;
 const deck=s.players[0].deck.length;
 start(s);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.ok(!e.effectiveCard(mint,s).unblockable);
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===mint.uid));
 assert.ok(has(s,0,'grave',mint));
 assert.equal(s.decision,null);
});
