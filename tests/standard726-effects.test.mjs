import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-726.json',import.meta.url)));

test('Phase 726 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:726}));
  assert.throws(()=>standardCardSpec(detail,{phase:725}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:726}));
 }
});

const WEB='dm19-085', HELIX='dm16-035', FUSA='dm19-014', NATURE='dm01-108';
const MULTI='dm35-054', RELATED='dmr16s-052', BLOCKER='dm01-011';
const DEMON='dm01-s06', GAZARN='dmrp01-043', SURFER='dm05-024', HAND='dm01-027';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,uid)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
const attacks=(s,x)=>e.getLegalActions({...s,phase:'attack'}).filter(a=>a.kind==='attack'&&a.uid===x.uid);

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

test('verified reprints use the same battle IDs, printed stats and deck copy limits',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(printAliases.length,2);
 const stats=({abilityText,...rest})=>rest;
 for(const print of printAliases){
  const original=cards.find(x=>x.id===print.canonicalId);
  assert.deepEqual(print.faces.map(stats),original.faces.map(stats));
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:726}),original.spec);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.ok(print.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:print.id,count:3},{id:original.id,count:1}]),[{id:original.id,count:4}]);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

test('both defending Webaris die before an unblocked shield attack reveals the trigger',()=>{
 let s=field();
 const attacker=put(s,0,NATURE), a=put(s,1,WEB), b=put(s,1,WEB,{tapped:true});
 give(s,1,'shields',[SURFER]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 for(let n=0;s.decision?.type==='effectOrder';n++){
  assert.ok(n<3);
  e.step(s,e.chooseAI(s));
 }
 assert.deepEqual(s.players[1].grave.map(x=>x.uid).sort(),[a.uid,b.uid].sort());
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='useTrigger'));
 act(s,'useTrigger');
 drain(s);
 assert.ok(s.players[1].battle.some(x=>x.cardId===SURFER));
});

test('Webaris blocks normally, survives a different blocker, and cannot declare any attack',()=>{
 const s=field(), attacker=put(s,0,NATURE);
 const defender=put(s,1,WEB), guard=put(s,1,BLOCKER);
 s.active=1;
 assert.deepEqual(attacks(s,defender),[]);
 s.active=0;
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='block'&&x.uid===defender.uid));
 act(s,'block',a=>a.uid===guard.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(defender));
});

test('an unblocked attack against a creature does not destroy the defending Webaris',()=>{
 const s=field(), attacker=put(s,0,DEMON);
 const watcher=put(s,1,WEB), target=put(s,1,NATURE,{tapped:true});
 attack(s,attacker.uid,target.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(s.players[1].grave.includes(target));
 assert.ok(s.players[1].battle.includes(watcher));
});

test('Helix pays for generate and cross, boosts either side once per gear, and keeps its link on restore',()=>{
 let s=field();
 const host=put(s,0,MULTI), ally=put(s,0,NATURE), enemy=put(s,1,MULTI), other=put(s,1,RELATED);
 const gear=play(s,HELIX);
 assert.equal(e.power(enemy,false,s),e.card(enemy).power);
 cross(s,gear,host);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 s=restore(s);
 const power=x=>e.power(s.players.flatMap(y=>y.battle).find(y=>y.uid===x.uid),false,s);
 for(const x of [host,ally,enemy])assert.equal(power(x),e.card(x).power+2000);
 assert.equal(power(other),e.card(other).power);
 const second=play(s,HELIX);
 cross(s,second,ally);
 assert.equal(power(enemy),e.card(enemy).power+4000);
});

test('Helix updates when recrossed and stays on the field without a bonus after its host leaves',()=>{
 const s=field(), first=put(s,0,MULTI), second=put(s,0,DEMON), enemy=put(s,1,DEMON);
 const gear=play(s,HELIX);
 cross(s,gear,first);
 cross(s,gear,second);
 assert.equal(e.power(first,false,s),e.card(first).power);
 assert.equal(e.power(enemy,false,s),e.card(enemy).power+2000);
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===second.uid));
 assert.ok(s.players[0].grave.includes(second));
 assert.ok(s.players[0].battle.includes(gear));
 assert.equal(e.power(enemy,false,s),e.card(enemy).power);
 assert.equal(gear.crossedTo,undefined);
});

test('Me Fusa blocks, and its destruction stops the next attack until the current turn ends',()=>{
 let s=field(), attacker=put(s,0,DEMON), next=put(s,0,DEMON);
 const defender=put(s,1,FUSA), ready=put(s,1,NATURE);
 s.active=1;
 assert.ok(attacks(s,defender).every(a=>a.target!=='player'));
 s.active=0;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===defender.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(defender));
 s=restore(s);
 assert.deepEqual(attacks(s,next),[]);
 act(s,'endTurn');
 s.phase='attack';
 assert.ok(attacks(s,ready).length);
});

test('Me Fusa can die to an attack trigger without cancelling the attack already declared',()=>{
 const s=field(), attacker=put(s,0,GAZARN), source=put(s,0,FUSA), next=put(s,0,DEMON);
 const before=s.players[1].shields.length;
 attack(s,attacker.uid);
 pick(s,source.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
 assert.ok(s.players[0].grave.includes(source));
 assert.equal(s.players[1].shields.length,before-e.card(attacker).breaker);
 assert.deepEqual(attacks(s,next),[]);
});
