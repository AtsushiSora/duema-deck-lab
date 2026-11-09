import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-700.json',import.meta.url)));

test('Phase 700 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:700}));
  assert.throws(()=>standardCardSpec(detail,{phase:699}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:700}));
 }
});

const AGIRA='dm12-016',ROMEEL='dm12-017',STAR='dm12-s02';
const BODY='dm01-108',GLADIATOR='dm06-073',EARTH='dm06-048';
const CYBER='dm34-024',HEDRIAN='dm12-032',LIGHT='dm01-075';
const BLOCKER='dm01-076',BOUNCE='dm01-086',PEACAP='dm06-032';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const find=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const value=x=>x.value?.uid??x.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);
const play=(s,id)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};

test('Reprints have the same abilities and restrictions without registering a second battle ID',()=>{
 assert.deepEqual(printAliases.map(x=>x.id),['dmc55-045','dmx12b-045']);
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:700}),canonical.spec);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

for(const [id,a,b] of [[AGIRA,GLADIATOR,EARTH],[ROMEEL,CYBER,HEDRIAN]])test(id+' evolves only on its two allied races and boosts other allies',()=>{
 const s=setup(),first=put(s,0,a),second=put(s,0,b),plain=put(s,0,BODY),enemy=put(s,1,b);
 const base=id===AGIRA?first:second;
 const x=play(s,id);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[first.uid,second.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(x.under[0].uid,base.uid);
 const ally=base===first?second:first;
 assert.equal(e.power(x,false,s),e.card(id).power);
 assert.equal(e.power(ally,false,s),e.card(ally.cardId).power+2000);
 assert.equal(e.power(plain,false,s),e.card(BODY).power);
 assert.equal(e.power(enemy,false,s),e.card(b).power);
 assert.equal(!!e.effectiveCard(x,s).blocker,false);
});

test('Agira draws before battle even if the attacker skips the battle after being blocked',()=>{
 let s=setup();
 const attacker=put(s,0,PEACAP),watcher=put(s,1,AGIRA),blocker=put(s,1,EARTH);
 const top=s.players[1].deck[0].uid;
 attack(s,attacker.uid);
 block(s,blocker);
 assert.equal(s.decision.task.source,AGIRA);
 assert.equal(s.decision.player,1);
 assert.ok(find(s,1,'battle',watcher.uid));
 assert.ok(!s.log.some(x=>x.type==='battle'));
 s=restore(s);
 pick(s,1);
 assert.ok(find(s,1,'hand',top));
 assert.ok(!s.log.some(x=>x.type==='battle'));
 assert.equal(s.players[1].shields.length,5);
});

test('Agira can decline a draw, and an unrelated blocker never triggers it',()=>{
 for(const id of [GLADIATOR,BLOCKER]){
  const s=setup(),attacker=put(s,0,BODY),blocker=put(s,1,id);
  put(s,1,AGIRA);
  attack(s,attacker.uid);
  block(s,blocker);
  if(id===GLADIATOR)pick(s,0);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].hand.length,0);
  assert.ok(s.log.some(x=>x.type==='battle'));
 }
});

test('Two Agiras each trigger once when a dual-race Agira gains blocker',()=>{
 let s=setup();
 const attacker=put(s,0,BODY),first=put(s,1,AGIRA),second=put(s,1,AGIRA);
 first.g34Grants=[{turn:s.turn,blocker:true}];
 assert.equal(e.power(first,false,s),7500);
 attack(s,attacker.uid);
 block(s,first);
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 const chosen=e.getLegalActions(s).find(a=>a.effectId===s.pendingEffects.find(x=>x.uid===second.uid).effectId);
 e.step(s,chosen);
 pick(s,1);
 pick(s,1);
 assert.equal(s.players[1].hand.length,2);
 assert.ok(find(s,0,'grave',attacker.uid));
});

test('Romeel prevents blocking itself and both allied races while its source is on the field',()=>{
 const s=setup(),romeel=put(s,0,ROMEEL),cyber=put(s,0,CYBER),hedrian=put(s,0,HEDRIAN),plain=put(s,0,BODY),enemy=put(s,1,CYBER);
 const blocker=put(s,1,BLOCKER);
 for(const x of [romeel,cyber,hedrian]){
  assert.equal(e.effectiveCard(x,s).unblockable,true);
  attack(s,x.uid);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
  if(s.decision?.type==='block')act(s,'noBlock');
 }
 assert.ok(!e.effectiveCard(enemy,s).unblockable);
 attack(s,plain.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 act(s,'noBlock');
 s.active=1;s.phase='main';
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.[0]?.uid===romeel.uid);
 assert.ok(!e.effectiveCard(cyber,s).unblockable);
 assert.equal(e.power(cyber,false,s),e.card(CYBER).power);
});

test('Starman requires two distinct race bases, resumes their selection, and shields before breaking twice',()=>{
 let s=setup();
 const cyber=put(s,0,CYBER),plain=put(s,0,BODY),enemy=put(s,1,LIGHT);
 const star=inst(STAR);
 s.players[0].hand.push(star);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===star.uid));
 const light=put(s,0,LIGHT);
 act(s,'play',a=>a.uid===star.uid);
 assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([light.uid,cyber.uid]));
 pick(s,cyber.uid);
 s=restore(s);
 assert.deepEqual(s.decision.choices.map(value),[light.uid]);
 pick(s,light.uid);
 const evolved=find(s,0,'battle',star.uid);
 assert.deepEqual(evolved.under.map(x=>x.uid),[cyber.uid,light.uid]);
 assert.ok(find(s,0,'battle',plain.uid));
 assert.ok(find(s,1,'battle',enemy.uid));
 const top=s.players[0].deck[0].uid;
 give(s,1,'shields',[BODY,BODY]);
 attack(s,star.uid);
 assert.equal(s.decision.type,'block');
 assert.equal(find(s,0,'shields',top)?.faceUp??false,false);
 assert.ok(find(s,0,'shields',top));
 assert.equal(s.players[1].shields.length,2);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
});

test('Starman adds one new face-down shield when it is bounced with both bases',()=>{
 const s=setup();
 const bases=[inst(CYBER),inst(LIGHT)],star=put(s,0,STAR,{under:bases});
 const top=s.players[0].deck[0].uid;
 s.active=1;
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.[0]?.uid===star.uid);
 for(const x of [star,...bases])assert.ok(find(s,0,'hand',x.uid));
 assert.equal(s.players[0].shields.length,6);
 const shield=find(s,0,'shields',top);
 assert.ok(shield&&!shield.faceUp&&!shield.shieldStack?.length);
});
