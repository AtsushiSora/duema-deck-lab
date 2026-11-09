import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-720.json',import.meta.url)));

test('Phase 720 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:720}));
  assert.throws(()=>standardCardSpec(detail,{phase:719}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:720}));
 }
});

const RAPHARM='dm19-011', MEDICAL='dm19-051', BIND='dm16-047', SVEN='dm35-010';
const FIRE='dm01-097', NATURE='dm01-108', DARK='dm01-090', WATER='dm01-083';
const DEVIL='dm19-084', MULTI='dmex14-108', ARC_EVO='dmrp19-020', GIANT='dm09-s05';
const HAND='dm01-027', CRUISER='dm05-s03', BLOCKER='dm01-011';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));

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

function destroy(s,x){
 play(s,HAND);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}

test('both verified Bind Shadow printings reuse the same battle ID',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details),original=cards.find(x=>x.id===BIND);
 assert.equal(printAliases.length,2);
 for(const print of printAliases){
  assert.equal(print.canonicalId,BIND);
  assert.deepEqual(print.faces.map(({abilityText,...face})=>face),original.faces.map(({abilityText,...face})=>face));
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:720}),original.spec);
  assert.ok(print.verification.facesMatched);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[BIND]);
  assert.equal(catalogue.get(print.id).id,BIND);
  assert.deepEqual(catalogue.resolveRows([{id:print.id,count:2},{id:BIND,count:2}]),[{id:BIND,count:4}]);
  assert.ok(!data.cards.some(c=>c.id===print.id));
 }
});

test('Rapharm taps opposing Fire and Nature entries, including evolution onto an untapped base',()=>{
 const s=field(),rapharm=play(s,RAPHARM),ownFire=play(s,FIRE);
 const base=put(s,1,NATURE);
 assert.ok(!ownFire.tapped);
 s.active=1;
 assert.ok(play(s,FIRE).tapped);
 assert.ok(play(s,NATURE).tapped);
 assert.ok(!play(s,WATER).tapped);
 assert.ok(!base.tapped);
 const evolved=play(s,ARC_EVO);
 act(s,'evolve',a=>a.base===base.uid||a.baseUid===base.uid);
 drain(s);
 assert.ok(evolved.tapped);
 assert.deepEqual(evolved.under.map(x=>x.uid),[base.uid]);
 rapharm.g35Ignored=s.turn;
 assert.ok(!play(s,FIRE).tapped);
});

test('Rapharm also taps a Fire creature deployed without payment during the other turn',()=>{
 const s=field();
 put(s,0,RAPHARM);
 give(s,1,'hand',[FIRE,WATER]);
 const [fire,water]=s.players[1].hand;
 play(s,GIANT);
 for(const x of [fire,water])act(s,'extended',a=>s.decision.choices[a.choice].value===x.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(fire));
 assert.ok(s.players[1].battle.includes(water));
 assert.ok(fire.tapped);
 assert.ok(!water.tapped);
});

test('Bind Shadow enters tapped and applies only to Dark creatures on either side',()=>{
 const s=field(),existing=put(s,0,DARK);
 const bind=play(s,BIND);
 assert.ok(bind.tapped);
 assert.ok(!existing.tapped);
 assert.ok(play(s,DARK).tapped);
 assert.ok(!play(s,WATER).tapped);
 s.active=1;
 assert.ok(play(s,DARK).tapped);
 assert.ok(play(s,MULTI).tapped);
 assert.ok(!play(s,FIRE).tapped);
 bind.g35Ignored=s.turn;
 assert.ok(!play(s,DARK).tapped);
});

test('Svengali taps enemy entries and prohibits its own side from declaring creature attacks',()=>{
 const s=field(),sven=put(s,0,SVEN),attacker=put(s,0,FIRE);
 assert.ok(!play(s,WATER).tapped);
 s.active=1;
 assert.ok(play(s,WATER).tapped);
 assert.ok(play(s,NATURE).tapped);
 const target=put(s,1,FIRE,{tapped:true}),enemy=put(s,1,DARK),blocker=put(s,1,BLOCKER);
 s.active=0;
 s.phase='attack';
 const attacks=uid=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===uid);
 for(const source of [sven,attacker]){
  assert.ok(attacks(source.uid).length>0);
  assert.ok(attacks(source.uid).every(a=>a.target==='player'));
 }
 sven.g35Ignored=s.turn;
 assert.ok(attacks(attacker.uid).some(a=>a.target===target.uid));
 delete sven.g35Ignored;
 attacker.tapped=true;
 s.active=1;
 assert.ok(attacks(enemy.uid).some(a=>a.target===attacker.uid));
 s.active=0;
 attacker.tapped=false;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,5);
});

for(const use of [true,false])test('Medical Alnile lets a Grand Devil '+(use?'return to hand':'go to the graveyard')+' after restoration',()=>{
 let s=field();
 put(s,1,MEDICAL);
 const target=put(s,1,DEVIL);
 destroy(s,target);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.mandatory,false);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['replaceOmega','allowLeave']);
 s=restore(s);
 act(s,use?'replaceOmega':'allowLeave');
 drain(s);
 assert.ok(s.players[1][use?'hand':'grave'].some(x=>x.uid===target.uid));
 assert.ok(!s.players[1][use?'grave':'hand'].some(x=>x.uid===target.uid));
 assert.ok(!s.players[1].battle.some(x=>x.uid===target.uid));
});

test('Medical Alnile does not protect the wrong race or player and can be disabled',()=>{
 for(const mode of ['otherRace','self','opponent','sealed','ignored']){
  const s=field(),provider=put(s,mode==='opponent'?0:1,MEDICAL);
  const target=mode==='self'?provider:put(s,1,mode==='otherRace'?DARK:DEVIL);
  if(mode==='sealed'){
   provider.sealed=1;
   s.players[1].seals.push({...inst(NATURE),faceDown:true,sealOf:provider.uid});
  }
  if(mode==='ignored')provider.g35Ignored=s.turn;
  destroy(s,target);
  assert.notEqual(s.decision?.type,'leaveReplace',mode);
  drain(s);
  assert.ok(s.players[1].grave.some(x=>x.uid===target.uid),mode);
 }
});

test('Medical Alnile applies to an allied Grand Devil in the same destruction batch',()=>{
 const s=field(),medical=put(s,0,MEDICAL),target=put(s,0,DEVIL);
 play(s,CRUISER);
 assert.equal(s.decision.type,'leaveReplace');
 act(s,'replaceOmega');
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===medical.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===target.uid));
});
