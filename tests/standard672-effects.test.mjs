import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-672.json',import.meta.url)));

test('Phase 672 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:672}));
  assert.throws(()=>standardCardSpec(detail,{phase:671}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:672}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
   deck.cards[0].count--;
   deck.cards.at(-1).count++;
   assert.deepEqual(e.validateDeck(deck),[row.name+'は1枚までです']);
  }
 }
});

const ERA='dmr09-067',SHIRA='dmr12-003',CODE='dmr11-036',ZERO='dmsd01-012';
const NAT='dm01-108',ORACLE='dmr12-041',MILK='dm26rp2-033',HAND='dm01-027';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const pick=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);
const canAttack=(s,uid)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid&&a.target==='player');
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('Each Erasou ramps once for a colorless creature’s entry and ignores colored allies',()=>{
 let s=setup();
 give(s,0,'battle',[ERA,ERA]);
 give(s,0,'hand',[NAT,ZERO]);
 give(s,0,'deck',Array(5).fill(NAT));
 const [first,second]=s.players[0].deck;
 const mana=s.players[0].mana.length;
 play(s,NAT);
 assert.equal(s.players[0].mana.length,mana);
 play(s,ZERO);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===ERA).length,2);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===ERA);
 assert.equal(s.players[0].mana.length,mana+2);
 assert.ok(has(s.players[0].mana,first.uid)&&has(s.players[0].mana,second.uid));
 assert.ok(s.players[0].battle.every(x=>x.cardId!==ERA||e.effectiveCard(x,s).breaker===2));
});

test('Erasou responds to an allied deployment without summoning on the enemy turn',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'battle',[ERA]);
 give(s,0,'grave',[ZERO]);
 give(s,1,'hand',[ZERO]);
 const [deployed]=s.players[0].grave,[top]=s.players[0].deck;
 play(s,ZERO);
 assert.ok(!has(s.players[0].mana,top.uid));
 s.extTasks=[{op:'g34_Put',p:0,source:ERA,origin:'grave',target:deployed.uid}];
 act(s,'toAttack');
 assert.ok(has(s.players[0].battle,deployed.uid));
 assert.ok(has(s.players[0].mana,top.uid));
});

test('Shiranui grants Speed Attacker to itself and allied Oracles only while its ability is active',()=>{
 const s=setup();
 give(s,0,'battle',[SHIRA,ORACLE,NAT]);
 give(s,1,'battle',[ORACLE]);
 const [source,ally,plain]=s.players[0].battle,[enemy]=s.players[1].battle;
 for(const x of [source,ally,plain,enemy])x.entered=s.turn;
 s.phase='attack';
 assert.ok(canAttack(s,source.uid)&&canAttack(s,ally.uid));
 assert.ok(!canAttack(s,plain.uid));
 assert.equal(!!e.effectiveCard(enemy,s).speedAttacker,false);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 source.g35Ignored=s.turn;
 assert.ok(!canAttack(s,source.uid)&&!canAttack(s,ally.uid));
 delete source.g35Ignored;
 s.players[0].battle.shift();
 assert.ok(!canAttack(s,ally.uid));
});

for(const owner of [0,1])test('Code 777 grants Blocker to the chosen creature through the caster’s next turn start: '+owner,()=>{
 let s=setup();
 give(s,0,'hand',[CODE]);
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[NAT]);
 const uid=s.players[owner].battle[0].uid;
 play(s,CODE);
 s=JSON.parse(JSON.stringify(s));
 pick(s,uid);
 const target=s.players[owner].battle[0];
 assert.equal(e.effectiveCard(target,s).blocker,true);
 assert.equal(!!e.effectiveCard(s.players[1-owner].battle[0],s).blocker,false);
 if(owner===1){
  attack(s,s.players[0].battle[0].uid);
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===uid));
  act(s,'noBlock');
 }
 end(s);
 assert.equal(e.effectiveCard(target,s).blocker,true);
 end(s);
 assert.equal(!!e.effectiveCard(target,s).blocker,false);
});

test('Code 777 uses ordinary mandatory target priority and the grant does not follow a card leaving battle',()=>{
 const s=setup();
 give(s,0,'hand',[CODE]);
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[NAT,MILK]);
 const [,milk]=s.players[1].battle;
 play(s,CODE);
 assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[milk.uid]);
 pick(s,milk.uid);
 assert.equal(e.effectiveCard(milk,s).blocker,true);
 give(s,0,'hand',[HAND]);
 play(s,HAND);
 act(s,'effect',a=>a.targets[0]?.uid===milk.uid);
 assert.ok(s.players[1].shields.some(x=>x.uid===milk.uid&&x.faceUp));
 assert.equal(!!e.effectiveCard(milk,s).blocker,false);
});
