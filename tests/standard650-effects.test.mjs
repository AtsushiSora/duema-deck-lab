import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-650.json',import.meta.url)));
const LAVA='dm25rp2-043',FUMI='dm25rp2-039',RIFFLE='dm26ex2-044';
const PLAIN='dm01-108',WEAK='dm01-097',STRONG='dm01-s01',SEED='dmsd20-016';
const GS='dmrp17-025',TRIGGER='dm26rp3-067';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 650 preserves canonical IDs and records the Lava alternate print without creating a second definition',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:650}));
  assert.throws(()=>standardCardSpec(detail,{phase:649}));
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
 const [alternate]=printAliases;
 assert.equal(alternate.canonicalId,LAVA);
 assert.ok(alternate.verification.facesMatched);
 assert.ok(!data.cards.some(x=>x.id===alternate.id));
 assert.deepEqual(alternate.spec,cards.find(x=>x.id===LAVA).spec);
});

test('Lava discards the selected card then draws two when summoned',()=>{
 const s=setup();
 give(s,0,'hand',[LAVA,PLAIN,WEAK]);
 const [lava,discard,keep]=s.players[0].hand,deck=s.players[0].deck.length;
 act(s,'play',a=>a.cardId===LAVA);
 pick(s,discard.uid);
 assert.ok(has(s.players[0].battle,lava.uid));
 assert.ok(has(s.players[0].grave,discard.uid));
 assert.ok(has(s.players[0].hand,keep.uid));
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.players[0].deck.length,deck-2);
});

test('Fumi applies only minus 3000 on entry and excludes an opposing seed',()=>{
 const s=setup();
 give(s,0,'hand',[FUMI]);
 give(s,1,'battle',[PLAIN,SEED]);
 const [weak]=s.players[1].battle;
 act(s,'play');
 assert.deepEqual(s.decision.choices.map(valueOf),[weak.uid]);
 pick(s,weak.uid);
 assert.ok(has(s.players[1].grave,weak.uid));
});

for(const [id,enemyIndex] of [[LAVA,1],[FUMI,2]])test(e.card(id).name+' attack counts the top card and nested bases and resumes the target selection',()=>{
 for(const count of [2,3]){
  let s=setup();
  give(s,0,'battle',[PLAIN]);
  give(s,1,'battle',[WEAK,SEED,STRONG]);
  const [host]=s.players[0].battle,targets=s.players[1].battle;
  host.under=[inst(id)];
  if(count===3)host.under[0].under=[{...inst(PLAIN),faceDown:true}];
  const before=s.players[0].deck.length;
  attack(s,host.uid);
  if(count===3){
   const legal=id===LAVA?[targets[0].uid,targets[1].uid]:[targets[0].uid,targets[2].uid];
   assert.equal(s.decision.task.op,'g34_Target');
   assert.deepEqual(s.decision.choices.map(valueOf),legal);
   s=JSON.parse(JSON.stringify(s));
   pick(s,targets[enemyIndex].uid);
   if(id===LAVA)assert.ok(has(s.players[1].grave,targets[enemyIndex].uid));
   else assert.equal(e.power(s.players[1].battle.find(x=>x.uid===targets[enemyIndex].uid),false,s),500);
  }else assert.ok(!s.decision?.task);
  assert.equal(s.players[0].deck.length,before);
  assert.equal(s.players[0].hand.length,0);
 }
});

for(const inherited of [false,true])test('Riffle suppresses G Strike without suppressing S Trigger on '+(inherited?'the carrier':'its own attack'),()=>{
 const s=setup();
 give(s,0,'battle',[PLAIN,PLAIN]);
 give(s,1,'shields',[TRIGGER,GS]);
 const [host,later]=s.players[0].battle,[shield]=s.players[1].shields;
 const strike=inst(GS);
 shield.shieldStack=[strike];
 let attacker=host;
 if(inherited){
  host.under=[inst(RIFFLE)];
  assert.ok(!e.effectiveCard(host,s).speedAttacker);
 }else{
  give(s,0,'hand',[RIFFLE]);
  act(s,'play');
  attacker=s.players[0].battle.find(x=>x.cardId===RIFFLE);
 }
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(has(s.players[1].hand,strike.uid));
 act(s,'useTrigger');
 pick(s,null);
 assert.ok(has(s.players[1].battle,shield.uid));
 attack(s,later.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
});

test('A pending Fumi trigger uses the last physical card count after its carrier leaves',()=>{
 const s=setup(),SACRIFICE='dm28-023';
 give(s,0,'battle',[SACRIFICE]);
 give(s,1,'battle',[STRONG]);
 const [host]=s.players[0].battle,[target]=s.players[1].battle;
 host.under=[inst(FUMI),inst(PLAIN)];
 attack(s,host.uid);
 const first=s.pendingEffects.find(x=>x.source===SACRIFICE);
 const order=e.getLegalActions(s).find(a=>a.effectId===first.effectId);
 assert.ok(order);
 e.step(s,order);
 pick(s,host.uid);
 assert.ok(has(s.players[0].grave,host.uid));
 assert.equal(s.decision.task.op,'g34_DrawUpTo');
 pick(s,null);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,target.uid);
 assert.equal(e.power(target,false,s),500);
});
