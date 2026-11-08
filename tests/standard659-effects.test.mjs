import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-659.json',import.meta.url)));
const INCA='dm26rp2-075',COTTON='dm26rp2-055',CALEIL='dm26rp2-066';
const NATURE='dm01-108',HAND='dm01-027',BOUNCE='dm01-086',TRAP='dm01-039',APUL='dmrp22-042',SPARK='dm01-015',POTEMKIN='dm26rp1-067';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const cast=(s,id)=>act(s,'play',a=>a.cardId===id);
const target=(s,id,uid)=>{cast(s,id);act(s,'effect',a=>a.targets[0]?.uid===uid);};

test('Phase 659 adds three verified Shield Go definitions with canonical IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:659}));
  assert.throws(()=>standardCardSpec(detail,{phase:658}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

for(const tapped of [true,false])test('Inca enters in the chosen state and only forces a legal attack: '+tapped,()=>{
 const s=setup();
 give(s,0,'hand',[INCA]);
 give(s,1,'battle',[NATURE]);
 const [inca]=s.players[0].hand,[attacker]=s.players[1].battle;
 cast(s,INCA);
 assert.equal(s.players[0].battle.length,0);
 pick(s,tapped);
 assert.equal(s.players[0].battle[0].tapped,tapped);
 s.active=1;
 s.turn++;
 s.phase='attack';
 const actions=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===attacker.uid);
 assert.ok(actions.length);
 assert.deepEqual([...new Set(actions.map(a=>a.target))],[tapped?inca.uid:'player']);
});

test('Cotton blocks, enters the shields face up after battle destruction and counts as a break when it leaves',()=>{
 const s=setup();
 give(s,0,'battle',[NATURE,NATURE]);
 give(s,1,'battle',[COTTON]);
 give(s,1,'shields',[]);
 const [first,second]=s.players[0].battle,[cotton]=s.players[1].battle;
 // A single unrelated shield prevents the first attack from winning outright.
 const normal=inst(NATURE);
 s.players[1].shields.push(normal);
 attack(s,first.uid);
 act(s,'block',a=>a.uid===cotton.uid);
 assert.equal(s.players[1].shields.length,2);
 assert.equal(s.players[1].shields[1].uid,cotton.uid);
 assert.equal(s.players[1].shields[1].faceUp,true);
 assert.equal(has(s.players[1].grave,cotton.uid),false);
 const action=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===second.uid&&a.shield===cotton.uid);
 assert.ok(action);
 e.step(s,action);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s.players[1].grave,cotton.uid));
 assert.ok(has(s.players[1].shields,normal.uid));
 assert.ok(!has(s.players[1].hand,cotton.uid));
 assert.equal(s.metrics[0].breaks,1);
});

test('Caleil selects its own shield without activating its Shield Trigger',()=>{
 const s=setup();
 give(s,0,'hand',[CALEIL]);
 give(s,0,'shields',[NATURE,SPARK]);
 give(s,1,'battle',[NATURE]);
 const [,chosen]=s.players[0].shields;
 cast(s,CALEIL);
 pick(s,chosen.uid);
 assert.ok(has(s.players[0].hand,chosen.uid));
 assert.equal(s.decision,null);
 assert.ok(!s.players[1].battle[0].tapped);
});

test('Face-up Shield Go is sent to the grave by ordinary shield recovery, while a face-down copy goes to hand',()=>{
 for(const faceUp of [true,false]){
  const s=setup();
  give(s,0,'hand',[CALEIL]);
  give(s,0,'shields',[COTTON,NATURE]);
  const [cotton]=s.players[0].shields;
  cotton.faceUp=faceUp;
  cast(s,CALEIL);
  pick(s,cotton.uid);
  assert.ok(has(s.players[0][faceUp?'grave':'hand'],cotton.uid));
  assert.equal(s.players[0].shields.length,1);
  assert.equal(s.decision,null);
 }
});

test('Shield Go follows the destroyed physical card across a saved trigger order',()=>{
 let s=setup();
 give(s,0,'battle',[INCA]);
 give(s,1,'hand',[HAND]);
 give(s,0,'shields',[POTEMKIN]);
 s.players[0].shields[0].faceUp=true;
 const [inca]=s.players[0].battle;
 s.active=1;
 target(s,HAND,inca.uid);
 assert.ok(has(s.players[0].grave,inca.uid));
 assert.equal(s.decision?.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId).source===INCA);
 assert.ok(s.players[0].shields.some(x=>x.uid===inca.uid&&x.faceUp));
 pick(s,0);
 assert.equal(s.decision,null);
});

for(const mode of ['bounce','mana','grave lock','ignored'])test('Shield Go creates no shield after '+mode,()=>{
 const s=setup();
 const spell=mode==='bounce'?BOUNCE:mode==='mana'?TRAP:HAND;
 give(s,0,'battle',[COTTON]);
 give(s,1,'hand',[spell]);
 if(mode==='grave lock')give(s,1,'battle',[APUL]);
 const [cotton]=s.players[0].battle;
 if(mode==='ignored')cotton.g35Ignored=s.turn;
 s.active=1;
 target(s,spell,cotton.uid);
 assert.equal(s.players[0].shields.length,5);
 assert.ok(has(s.players[0][mode==='bounce'?'hand':mode==='mana'?'mana':'grave'],cotton.uid));
 assert.equal(s.decision,null);
});
