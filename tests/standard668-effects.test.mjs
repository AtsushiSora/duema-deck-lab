import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-668.json',import.meta.url)));

test('Phase 668 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:668}));
  assert.throws(()=>standardCardSpec(detail,{phase:667}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:668}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
   deck.cards[0].count--;
   deck.cards.at(-1).count++;
   assert.deepEqual(e.validateDeck(deck),[row.name+'は1枚までです']);
  }
 }
});

const ALEX='dmr10-s02',AKA='dmr10-011',PARA='dmr10-013',GO='dmr09-070';
const NAT='dm01-108',LARGE='dm01-001',ORION='dm01-s04',HAND='dm01-027',RAMP='dm01-109',MOON='dmrp06-m02';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const addShield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

for(const mode of ['shield','decline','blocked'])test('Alexandrite orders the remaining seen cards: '+mode,()=>{
 let s=setup();
 give(s,0,'hand',[ALEX]);
 give(s,0,'battle',[GO,NAT]);
 give(s,1,'battle',[mode==='blocked'?'dmrp22-037':GO]);
 give(s,0,'deck',[NAT,GO,AKA,NAT,NAT,NAT,PARA,NAT]);
 const before=s.players[0].deck.map(x=>x.uid),[ally,plain]=s.players[0].battle;
 const hidden=addShield(s,0,GO,false);
 addShield(s,1,GO);
 play(s,ALEX);
 if(mode!=='blocked'){
  assert.deepEqual(values(s),[before[1],before[2],null]);
  pick(s,mode==='shield'?before[1]:null);
 }
 assert.equal(s.decision?.task?.op,'g34_Order');
 const bottom=before.slice(0,6).filter(uid=>mode!=='shield'||uid!==before[1]).reverse();
 s=JSON.parse(JSON.stringify(s));
 for(const uid of bottom.slice(0,-1))pick(s,uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...before.slice(6),...bottom]);
 assert.equal(s.players[0].shields.find(x=>x.uid===before[1])?.faceUp,mode==='shield'?true:undefined);
 const alex=s.players[0].battle.find(x=>x.cardId===ALEX);
 assert.equal(!!e.effectiveCard(alex,s).blocker,mode==='shield');
 assert.equal(!!e.effectiveCard(s.players[0].battle.find(x=>x.uid===ally.uid),s).blocker,mode==='shield');
 assert.equal(!!e.effectiveCard(s.players[0].battle.find(x=>x.uid===plain.uid),s).blocker,false);
 assert.equal(!!e.effectiveCard(s.players[1].battle[0],s).blocker,false);
 assert.equal(e.effectiveCard(alex,s).breaker,2);
 if(mode==='shield'){
  alex.g35Ignored=s.turn;
  assert.equal(!!e.effectiveCard(s.players[0].battle[0],s).blocker,false);
  alex.g35Ignored=undefined;
  s.players[0].shields.find(x=>x.uid===before[1]).faceUp=false;
  assert.equal(!!e.effectiveCard(alex,s).blocker,false);
 }
 assert.ok(has(s.players[0].shields,hidden.uid));
});

test('Akashic counts only face-up physical copies on a summon or cast',()=>{
 let s=setup();
 give(s,0,'hand',[NAT,RAMP]);
 give(s,0,'deck',Array(7).fill(NAT));
 const root=addShield(s,0,AKA);
 root.shieldStack=[{...inst(AKA),faceUp:true},inst(AKA)];
 addShield(s,1,AKA);
 const originalDeck=s.players[0].deck.length;
 play(s,NAT);
 assert.equal(s.decision?.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===AKA).length,2);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===AKA);
 pick(s,1);
 pick(s,0);
 assert.equal(s.players[0].deck.length,originalDeck-1);
 assert.equal(s.players[1].hand.length,0);
 s.players[0].shields.find(x=>x.uid===root.uid).shieldStack[0].faceUp=false;
 const mana=s.players[0].mana.length;
 play(s,RAMP);
 assert.deepEqual(values(s),[0,1]);
 pick(s,1);
 assert.equal(s.players[0].mana.length,mana+2);
 assert.equal(s.players[0].deck.length,originalDeck-4);
});

test('Akashic does not trigger on a creature put into battle without summoning',()=>{
 const s=setup();
 addShield(s,0,AKA);
 give(s,0,'hand',[NAT]);
 const uid=s.players[0].hand[0].uid;
 s.extTasks=[{op:'g34_Put',p:0,source:ALEX,origin:'hand',target:uid}];
 act(s,'toAttack');
 assert.ok(has(s.players[0].battle,uid));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
});

test('Akashic can draw from casting an S-Trigger during the opponent’s turn',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'shields',[HAND]);
 give(s,1,'battle',[NAT]);
 addShield(s,0,AKA);
 const [attacker]=s.players[1].battle,[top]=s.players[0].deck;
 attack(s,attacker.uid);
 noBlock(s);
 act(s,'useTrigger',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===attacker.uid);
 assert.deepEqual(values(s),[0,1]);
 pick(s,1);
 assert.ok(has(s.players[0].hand,top.uid));
 assert.ok(has(s.players[1].grave,attacker.uid));
});

test('Paranormal applies its constant penalty per face-up physical card and removes it immediately when turned down',()=>{
 const s=setup();
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[LARGE]);
 const [ally]=s.players[0].battle,[enemy]=s.players[1].battle;
 const root=addShield(s,0,PARA),stacked={...inst(PARA),faceUp:true};
 root.shieldStack=[stacked,inst(PARA)];
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.power(enemy,false,s),3000);
 enemy.g35Ignored=s.turn;
 assert.equal(e.power(enemy,false,s),3000);
 const observed=e.observation(s,1);
 assert.equal(e.power(observed.players[1].battle[0],false,observed),3000);
 root.faceUp=false;
 assert.equal(e.power(enemy,false,s),6000);
 stacked.faceUp=false;
 assert.equal(e.power(enemy,false,s),9000);
});

test('Paranormal becomes face up after destruction, destroys opposing zero-power creatures, and affects new entries',()=>{
 const s=setup();
 give(s,0,'battle',[PARA,NAT]);
 give(s,1,'battle',[NAT,LARGE]);
 give(s,1,'hand',[HAND,NAT]);
 const [paranormal,ally]=s.players[0].battle,[small,large]=s.players[1].battle;
 const upcoming=s.players[1].hand[1];
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets[0]?.uid===paranormal.uid);
 assert.equal(s.players[0].shields.find(x=>x.uid===paranormal.uid)?.faceUp,true);
 assert.ok(has(s.players[0].battle,ally.uid));
 assert.ok(has(s.players[1].grave,small.uid));
 assert.equal(e.power(large,false,s),6000);
 play(s,NAT);
 assert.ok(has(s.players[1].grave,upcoming.uid));
});

test('Paranormal does not count toward graveyard-based S-Trigger eligibility until the shield leaves',()=>{
 const s=setup();
 give(s,0,'battle',[ORION]);
 give(s,1,'shields',[]);
 give(s,0,'grave',Array(6).fill(NAT));
 give(s,1,'grave',Array(6).fill(NAT));
 const root=addShield(s,1,PARA),moon=inst(MOON);
 root.shieldStack=[moon];
 attack(s);
 noBlock(s);
 assert.equal(s.decision,null);
 assert.ok(has(s.players[1].grave,root.uid));
 assert.ok(has(s.players[1].hand,moon.uid));
 assert.equal(s.players[1].grave.length+s.players[0].grave.length,13);
});
