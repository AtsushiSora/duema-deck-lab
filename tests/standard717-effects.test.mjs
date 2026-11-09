import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-717.json',import.meta.url)));

test('Phase 717 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:717}));
  assert.throws(()=>standardCardSpec(detail,{phase:716}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:717}));
 }
});

const TREE='dm07-007',NAST='dm08-s01',BURNMELT='dm10-029';
const NATURE='dm01-108',TRIGGER='dm01-052',CAIN='dm09-049';
const SILENT='dm10-051',SPEED='dm05-049';
const field=()=>Object.assign(setup(),{active:0,phase:'attack'});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function hit(s,attacker){
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}

for(const id of [TREE,NAST])test(e.card(id).name+' saves the chosen shield from a W Breaker after restoring the choice',()=>{
 let s=field();
 const attacker=put(s,0,NAST),saver=put(s,1,id);
 give(s,1,'shields',[TRIGGER,TRIGGER]);
 const [broken,saved]=s.players[1].shields;
 hit(s,attacker);
 assert.equal(s.decision.type,'shieldGuard');
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.shieldBreak.uids,[broken.uid,saved.uid]);
 s=restore(s);
 act(s,'saveShield',a=>a.uid===saver.uid&&a.shield===saved.uid);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),[saved.uid]);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[saver.uid]);
 assert.equal(s.decision.type,'trigger');
 act(s,'skipTrigger');
 drain(s);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[broken.uid]);
 assert.equal(s.metrics[0].breaks,1);
});

test('Two different savers reserve separate shields and the second saver may decline',()=>{
 for(const useSecond of [false,true]){
  const s=field(),attacker=put(s,0,NAST),tree=put(s,1,TREE),nast=put(s,1,NAST);
  give(s,1,'shields',[NATURE,NATURE]);
  const [first,second]=s.players[1].shields;
  hit(s,attacker);
  act(s,'saveShield',a=>a.uid===tree.uid&&a.shield===second.uid);
  const choices=e.getLegalActions(s).filter(a=>a.kind==='saveShield');
  assert.deepEqual(choices.map(a=>[a.uid,a.shield]),[[nast.uid,first.uid]]);
  if(useSecond)act(s,'saveShield',a=>a.uid===nast.uid&&a.shield===first.uid);
  else act(s,'finishShieldGuards');
  drain(s);
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),useSecond?[first.uid,second.uid]:[second.uid]);
  assert.deepEqual(s.players[1].battle.map(x=>x.uid),useSecond?[]:[nast.uid]);
  assert.equal(s.metrics[0].breaks,useSecond?0:1);
 }
});

test('Moving a shield directly to the grave does not offer shield protection',()=>{
 const s=field(),attacker=put(s,0,CAIN),tree=put(s,0,TREE),nast=put(s,0,NAST);
 give(s,0,'shields',[NATURE,TRIGGER]);
 const [safe,removed]=s.players[0].shields;
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g34_ShieldGrave');
 act(s,'extended',a=>s.decision.choices[a.choice].value===removed.uid);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[safe.uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[removed.uid]);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[attacker.uid,tree.uid,nast.uid]);
 assert.notEqual(s.decision?.type,'shieldGuard');
});

test('An attacking Bolmeteus replaces the break before either new saver can protect the shield',()=>{
 const s=field(),attacker=put(s,0,'dm06-s08'),tree=put(s,1,TREE),nast=put(s,1,NAST);
 give(s,1,'shields',[TRIGGER]);
 const shield=s.players[1].shields[0];
 hit(s,attacker);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[shield.uid]);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[tree.uid,nast.uid]);
 assert.equal(s.metrics[0].breaks,0);
});

test('Burnmelt grants same-turn attack options only to its own Silent Skill creatures',()=>{
 const s=field(),silent=put(s,0,SILENT,{entered:s.turn});
 const ordinary=put(s,0,NATURE,{entered:s.turn}),enemy=put(s,1,SILENT,{tapped:true});
 const attacks=x=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 assert.deepEqual(attacks(silent),[]);
 const source=put(s,0,BURNMELT,{entered:s.turn});
 assert.deepEqual(new Set(attacks(silent)),new Set(['player',enemy.uid]));
 assert.deepEqual(attacks(ordinary),[]);
 assert.deepEqual(attacks(source),[]);
 assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
 assert.deepEqual(e.effectiveCard(silent,s).g496Silent,e.card(SILENT).g496Silent);
});

test('Burnmelt stops granting Speed Attacker immediately when ignored or removed',()=>{
 const s=field(),silent=put(s,0,SILENT,{entered:s.turn}),source=put(s,0,BURNMELT);
 const nativeSpeed=put(s,0,SPEED,{entered:s.turn});
 const canAttack=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');
 assert.ok(canAttack(silent));
 assert.ok(canAttack(nativeSpeed));
 source.g35Ignored=s.turn;
 assert.ok(!canAttack(silent));
 delete source.g35Ignored;
 silent.g35Ignored=s.turn;
 assert.ok(!canAttack(silent));
 delete silent.g35Ignored;
 assert.ok(canAttack(silent));
 s.players[0].battle.splice(s.players[0].battle.indexOf(source),1);
 s.players[0].grave.push(source);
 assert.ok(!canAttack(silent));
 assert.ok(canAttack(nativeSpeed));
});
