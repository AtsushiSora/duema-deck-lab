import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-658.json',import.meta.url)));
const PEGASUS='dm26rp1-049',POTEMKIN='dm26rp1-067',WHITE='dm26rp1-023';
const NATURE='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-100',HAND='dm01-027',BOUNCE='dm01-086',TOTO='dmrp17-025';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const choices=s=>s.decision.choices.map(valueOf);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const cast=(s,id)=>act(s,'play',a=>a.cardId===id);
const shield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
function target(s,id,uid){
 cast(s,id);
 act(s,'effect',a=>a.targets[0]?.uid===uid);
}
function next(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 658 keeps canonical IDs and records the official White Neowave promo without a second definition',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:658}));
  assert.throws(()=>standardCardSpec(detail,{phase:657}));
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
 const [promo]=printAliases;
 assert.equal(promo.canonicalId,WHITE);
 assert.equal(promo.id,'promoy25-030');
 assert.ok(promo.verification.facesMatched);
 assert.deepEqual(promo.faces,cards.find(x=>x.id===WHITE).faces);
});

test('Pegasus evolves on light or nature and retains its double breaker',()=>{
 const s=setup();
 give(s,0,'hand',[PEGASUS]);
 give(s,0,'battle',[LIGHT,WATER,NATURE]);
 const [light,,nature]=s.players[0].battle;
 cast(s,PEGASUS);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[light.uid,nature.uid]);
 act(s,'evolve',a=>a.baseUid===nature.uid);
 const pegasus=s.players[0].battle.find(x=>x.cardId===PEGASUS);
 assert.equal(e.effectiveCard(pegasus,s).breaker,2);
 assert.equal(pegasus.under[0].uid,nature.uid);
});

for(const mode of ['deploy','skip','spell','replacement'])test('Pegasus resolves the revealed card on attack: '+mode,()=>{
 let s=setup();
 give(s,0,'battle',[PEGASUS]);
 give(s,0,'deck',[mode==='spell'?HAND:FIRE,NATURE,NATURE]);
 if(mode==='replacement')give(s,1,'battle',[TOTO]);
 const [top,nextCard,last]=s.players[0].deck;
 attack(s);
 if(mode!=='spell'){
  assert.deepEqual(choices(s),[top.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='skip'?null:top.uid);
 }
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[nextCard.uid,last.uid,...(['skip','spell'].includes(mode)?[top.uid]:[])]);
 assert.equal(has(s.players[0].battle,top.uid),mode==='deploy');
 assert.equal(has(s.players[0].mana,top.uid),mode==='replacement');
 assert.equal(s.players[0].g34Protected?.length||0,0);
 assert.equal(s.decision?.type,'block');
});

test('Pegasus can deploy an evolution on leaving if a legal base remains',()=>{
 const s=setup();
 give(s,0,'battle',[PEGASUS,NATURE]);
 give(s,0,'deck',[PEGASUS,FIRE,FIRE]);
 give(s,1,'hand',[BOUNCE]);
 const [host,base]=s.players[0].battle,[top]=s.players[0].deck;
 s.active=1;
 target(s,BOUNCE,host.uid);
 assert.ok(has(s.players[0].hand,host.uid));
 pick(s,top.uid);
 pick(s,base.uid);
 assert.equal(s.players[0].battle[0].uid,top.uid);
 assert.equal(s.players[0].battle[0].under[0].uid,base.uid);
});

test('Pegasus bottoms an otherwise eligible evolution when it has no legal base',()=>{
 const s=setup();
 give(s,0,'battle',[PEGASUS]);
 give(s,0,'deck',[PEGASUS,FIRE,FIRE]);
 give(s,1,'hand',[BOUNCE]);
 const [host]=s.players[0].battle,[top,nextCard,last]=s.players[0].deck;
 s.active=1;
 target(s,BOUNCE,host.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[nextCard.uid,last.uid,top.uid]);
});

test('Potemkin does not count a bounce and triggers once per castle on the first actual destruction',()=>{
 const s=setup();
 shield(s,0,POTEMKIN);
 shield(s,0,POTEMKIN);
 shield(s,0,POTEMKIN,false);
 give(s,0,'hand',[BOUNCE,HAND,HAND]);
 give(s,1,'battle',[NATURE,NATURE,NATURE]);
 const [bounced,first,second]=s.players[1].battle;
 const [drawn]=s.players[0].deck;
 target(s,BOUNCE,bounced.uid);
 assert.equal(s.decision,null);
 target(s,HAND,first.uid);
 act(s,'orderEffect');
 pick(s,1);
 pick(s,0);
 assert.ok(has(s.players[0].hand,drawn.uid));
 target(s,HAND,second.uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,1);
});

test('Potemkin ignores earlier destructions before placement and works on the opponent turn',()=>{
 let s=setup();
 give(s,0,'hand',[POTEMKIN,HAND,HAND]);
 give(s,0,'battle',[NATURE]);
 give(s,1,'hand',[HAND]);
 give(s,1,'battle',[NATURE,NATURE]);
 const [first,second]=s.players[1].battle,[own]=s.players[0].battle;
 target(s,HAND,first.uid);
 cast(s,POTEMKIN);
 target(s,HAND,second.uid);
 assert.equal(s.decision,null);
 next(s);
 act(s,'skipCharge');
 s=JSON.parse(JSON.stringify(s));
 target(s,HAND,own.uid);
 assert.equal(s.decision.player,0);
 pick(s,1);
 assert.equal(s.players[0].hand.length,1);
});

test('An EX Life replacement leaves Potemkin available for the later real destruction',()=>{
 const s=setup();
 shield(s,0,POTEMKIN);
 const EX='dmrp19-033';
 give(s,1,'hand',[EX]);
 s.active=1;
 cast(s,EX);
 drain(s);
 const [protectedCreature]=s.players[1].battle;
 assert.ok(protectedCreature);
 give(s,0,'hand',[HAND,HAND]);
 s.active=0;
 target(s,HAND,protectedCreature.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s.players[1].battle,protectedCreature.uid));
 target(s,HAND,protectedCreature.uid);
 pick(s,1);
 assert.ok(has(s.players[1].grave,protectedCreature.uid));
 assert.equal(s.players[0].hand.length,1);
});

test('Simultaneous destruction by battle gives Potemkin only one optional draw',()=>{
 const s=setup();
 shield(s,0,POTEMKIN);
 give(s,0,'battle',[NATURE]);
 give(s,1,'battle',[NATURE]);
 const [attacker]=s.players[0].battle,[defender]=s.players[1].battle;
 defender.tapped=true;
 attack(s,attacker.uid,defender.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s.players[0].grave,attacker.uid));
 assert.ok(has(s.players[1].grave,defender.uid));
 pick(s,1);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,1);
});

test('White Neowave executes as a face-up shield and can deploy the card just drawn',()=>{
 let s=setup();
 give(s,0,'hand',[WHITE,HAND]);
 give(s,0,'deck',[FIRE,NATURE,NATURE]);
 const [white]=s.players[0].hand,[drawn]=s.players[0].deck;
 cast(s,WHITE);
 assert.equal(s.players[0].shields.find(x=>x.uid===white.uid).faceUp,true);
 assert.deepEqual(choices(s),[drawn.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,drawn.uid);
 assert.ok(has(s.players[0].battle,drawn.uid));
});

test('Only a face-up White Neowave belonging to the active player triggers before the normal turn draw',()=>{
 const s=setup();
 shield(s,0,WHITE);
 shield(s,0,WHITE,false);
 give(s,0,'deck',[FIRE,NATURE,NATURE,NATURE]);
 const [first,second]=s.players[0].deck;
 next(s);
 assert.equal(s.players[0].hand.length,0);
 act(s,'skipCharge');
 next(s);
 assert.deepEqual(choices(s),[first.uid,null]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[first.uid]);
 pick(s,null);
 assert.equal(s.phase,'charge');
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[first.uid,second.uid]);
});
