import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-667.json',import.meta.url)));

test('Phase 667 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:667}));
  assert.throws(()=>standardCardSpec(detail,{phase:666}));
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

const IKARI='dmr09-019',LOXO='dmr09-070',STONE='dmr11-009',NAT='dm01-108',BIG='dm01-001',HAND='dm01-027';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const pick=(s,value)=>act(s,'extended',a=>{
 const chosen=s.decision.choices[a.choice].value;
 return (chosen?.uid??chosen)===value;
});

test('Ikari can return a creature of either player or decline on entry',()=>{
 for(const owner of [0,1,null]){
  const s=setup();
  give(s,0,'hand',[IKARI]);
  give(s,0,'battle',[NAT]);
  give(s,1,'battle',[BIG]);
  const [own]=s.players[0].battle,[enemy]=s.players[1].battle;
  act(s,'play',a=>a.cardId===IKARI);
  const ikari=s.players[0].battle.find(x=>x.cardId===IKARI);
  assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value),[own.uid,ikari.uid,enemy.uid,null]);
  pick(s,owner===0?own.uid:owner===1?enemy.uid:null);
  assert.equal(has(s.players[0].hand,own.uid),owner===0);
  assert.equal(has(s.players[1].hand,enemy.uid),owner===1);
 }
});

test('Ikari waits until face up and each physical copy offers its own draw on an allied attack',()=>{
 let s=setup();
 give(s,0,'battle',[IKARI,NAT,NAT]);
 give(s,1,'hand',[HAND]);
 const [ikari,first,second]=s.players[0].battle;
 s.active=1;
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===ikari.uid);
 const root=s.players[0].shields.find(x=>x.uid===ikari.uid);
 assert.equal(root?.faceUp,true);
 const stacked={...inst(IKARI),faceUp:false};
 root.shieldStack=[stacked];
 s.active=0;
 give(s,0,'deck',[NAT,NAT,NAT]);
 attack(s,first.uid);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[0,1]);
 pick(s,0);
 noBlock(s);
 assert.equal(s.players[0].hand.length,0);
 stacked.faceUp=true;
 attack(s,second.uid);
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===IKARI);
 pick(s,1);
 pick(s,1);
 noBlock(s);
 assert.equal(s.players[0].hand.length,2);
});

test('Loxodonta guards another creature and becomes a face-up shield when it loses the battle',()=>{
 const s=setup();
 give(s,0,'battle',['dm01-s04']);
 give(s,1,'battle',[LOXO,NAT]);
 give(s,1,'shields',[NAT,NAT]);
 const [attacker]=s.players[0].battle,[guard,ally]=s.players[1].battle;
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='guardman'));
 noBlock(s);
 attacker.tapped=false;
 ally.tapped=true;
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 assert.ok(has(s.players[1].battle,ally.uid));
 assert.equal(s.players[1].shields.find(x=>x.uid===guard.uid)?.faceUp,true);
});

function startStone(){
 const s=setup();
 give(s,0,'hand',[STONE]);
 give(s,0,'battle',[IKARI,LOXO,NAT]);
 give(s,0,'grave',[IKARI,NAT]);
 give(s,1,'grave',[LOXO]);
 const [max,outrage]=s.players[0].battle;
 act(s,'play',a=>a.cardId===STONE);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[max.uid,outrage.uid]);
 act(s,'evolve',a=>a.baseUid===max.uid);
 const stone=s.players[0].battle.find(x=>x.cardId===STONE);
 assert.equal(stone.under[0].uid,max.uid);
 return {s,stone};
}

for(const accept of [true,false])test('Stonegold can add one own graveyard Shield Go creature face up before its double break: '+accept,()=>{
 let {s,stone}=startStone();
 const [ikari]=s.players[0].grave;
 give(s,1,'shields',[NAT,NAT]);
 attack(s,stone.uid);
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value),[ikari.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?ikari.uid:null);
 noBlock(s);
 assert.equal(s.players[0].shields.find(x=>x.uid===ikari.uid)?.faceUp,accept?true:undefined);
 assert.equal(has(s.players[0].grave,ikari.uid),!accept);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[0].hand.length,0);
});

test('Stonegold cannot take a Shield Go creature from a locked graveyard',()=>{
 const {s,stone}=startStone();
 give(s,1,'battle',['dmrp22-042']);
 attack(s,stone.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 drain(s);
 assert.equal(s.players[0].shields.length,5);
 assert.ok(s.players[0].grave.some(x=>x.cardId===IKARI));
});
