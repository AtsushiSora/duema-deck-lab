import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const BUSTER='dmex18-s03',XX='dmrp20-009',ZABOMBA='dmrp13-007';
const BASIC='dm01-108',DEMON='dm01-027',VAN='dmx13-s02';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const add=(s,p,z,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
};
function field(){
 const s=setup();
 s.format='advance';s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function pick(s,value){
 act(s,'extended',a=>{
  const choice=s.decision.choices[a.choice].value;
  return (choice?.uid??choice)===(value?.uid??value);
 });
}
function chooseEffect(s,op,uid){
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>
  s.pendingEffects.some(q=>q.effectId===a.effectId&&q.task?.op===op&&(!uid||q.uid===uid)));
 assert.equal(s.decision?.task?.op,op);
}
function throughAttack(s){
 for(let n=0;s.decision&&['effectOrder','extended','block','breakChoice','trigger'].includes(s.decision.type);n++){
  assert.ok(n<100);
  if(s.decision.type==='block')act(s,'noBlock');
  else if(s.decision.type==='trigger')act(s,'skipTrigger');
  else e.step(s,e.chooseAI(s));
 }
}

test('both official Psychic faces and four reprints resolve to the same restricted extra-deck card',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1349.json',import.meta.url)));
 const [row]=m.cards,registry=createCatalogue(snapshot,data.cards,details),front=e.card(BUSTER);
 assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).length,1);
 assert.deepEqual([front.name,front.cost,front.power,front.manaValue,front.limit],
  [row.faces[0].name,6,12000,0,1]);
 assert.deepEqual([front.g1085Back.name,front.g1085Back.cost,front.g1085Back.power,front.g1085Back.image],
  [row.faces[1].name,8,13000,row.backImage]);
 assert.equal(CARD_IMAGES[BUSTER],row.image);
 assert.equal(m.printAliases.length,4);
 for(const print of m.printAliases){
  const base={...PRESETS[0],format:'advance',extraCards:registry.resolveRows([{id:print.id,count:1}])};
  assert.deepEqual(e.validateDeck(base),[]);
  assert.equal(base.extraCards[0].id,BUSTER);
  assert.ok(e.validateDeck({...base,extraCards:[{id:BUSTER,count:2}]}).some(x=>/1枚/.test(x)));
 }
});

test('P Invasion has no declaration and preserves XXDDZ’s actual EX Life shield (QA40837 and QA40839)',()=>{
 let s=field();
 cast(s,XX);
 const x=s.players[0].battle[0],[life]=e.exLifeShields(s,0,x),buster=add(s,0,'extra',BUSTER);
 attack(s,x.uid);
 assert.equal(s.decision.type,'effectOrder');
 chooseEffect(s,'g23_PsychicInvasion1349',buster.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 assert.equal(s.attack.attacker,buster.uid);
 const evolved=s.players[0].battle.find(y=>y.uid===buster.uid);
 assert.ok(evolved.under.some(y=>y.uid===x.uid));
 assert.equal(e.exLifeShieldInfo(s,0,life.uid).sourceUid,x.uid);
 act(s,'orderEffect',a=>a.uid===x.uid);
 assert.equal(s.decision.task.op,'g34_ExLifeGrave1267');
 pick(s,life.uid);
 assert.ok(has(s,0,'grave',life));
 assert.equal(e.canCastSpell(s,1,e.card(DEMON)),false);
 assert.ok(!s.log.some(row=>row.type==='redDeclare'));
 throughAttack(s);
});

test('both waiting P Invasions may resolve on the same attacking creature (QA40838)',()=>{
 const s=field(),x=add(s,0,'battle',ZABOMBA);
 const a=add(s,0,'extra',BUSTER),b=add(s,0,'extra',BUSTER);
 attack(s,x.uid);
 chooseEffect(s,'g23_PsychicInvasion1349',a.uid);pick(s,true);
 chooseEffect(s,'g23_PsychicInvasion1349',b.uid);pick(s,true);
 assert.equal(s.attack.attacker,b.uid);
 assert.equal(b.under[0].uid,a.uid);
 assert.equal(a.under[0].uid,x.uid);
 throughAttack(s);
});

test('Buster sends one card to the extra zone and taps all highest-power ties, including with an empty hand (QA44663)',()=>{
 for(const withHand of [true,false]){
  const s=field(),x=add(s,0,'battle',ZABOMBA);
  add(s,0,'extra',BUSTER);
  const hand=withHand&&add(s,0,'hand',BASIC),highest=[add(s,1,'battle',XX),add(s,1,'battle',XX,{tapped:true})];
  const lower=add(s,1,'battle',BASIC);
  attack(s,x.uid);chooseEffect(s,'g23_PsychicInvasion1349');pick(s,true);
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===BUSTER);
  if(withHand)pick(s,hand);
  assert.equal(withHand&&has(s,0,'extra',hand),withHand);
  assert.ok(highest.every(y=>y.tapped&&y.skipUntap));
  assert.ok(!lower.tapped&&!lower.skipUntap);
  throughAttack(s);
  act(s,'endTurn');drain(s);
  assert.equal(s.active,1);
  assert.ok(highest.every(y=>y.tapped&&!y.skipUntap));
 }
});

test('P Revolution Change exchanges with the extra zone, discards, and grants other multicolored creatures Slayer',()=>{
 let s=field();
 const x=add(s,0,'battle','dmr23-006'),partner=add(s,0,'battle','dmr02-054'),mono=add(s,0,'battle',BASIC);
 const back=add(s,0,'extra',BUSTER),payment=add(s,0,'hand',BASIC);
 attack(s,x.uid);chooseEffect(s,'psychicChange1349');
 s=JSON.parse(JSON.stringify(s));
 pick(s,x.uid);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(q=>
  q.effectId===a.effectId&&q.uid===back.uid&&q.task?.defs?.[0]?.op==='Discard'));
 assert.equal(s.decision.task.op,'discard');
 pick(s,payment);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(q=>
  q.effectId===a.effectId&&q.uid===back.uid&&q.task?.defs?.[0]?.op==='GroupGrant364'));
 assert.ok(has(s,0,'grave',payment));
 assert.ok(has(s,0,'extra',x)&&!has(s,0,'hand',x));
 const out=s.players[0].battle.find(y=>y.uid===back.uid);
 assert.equal(e.card(out).name,'蒼き覚醒 ドギラゴンX');
 assert.ok(e.effectiveCard(out,s).unblockable&&!e.effectiveCard(out,s).slayer);
 assert.ok(e.effectiveCard(partner,s).slayer);
 assert.ok(!e.effectiveCard(mono,s).slayer);
 throughAttack(s);act(s,'endTurn');drain(s);
 assert.ok(e.effectiveCard(partner,s).slayer);
 act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');drain(s);
 assert.ok(!e.effectiveCard(partner,s).slayer);
});

test('P Revolution Change leaves both cards in place when blocked by EX Life or an entry replacement',()=>{
 for(const mode of ['exLife','van']){
  const s=field(),buster=add(s,0,'extra',BUSTER);
  if(mode==='exLife')cast(s,XX);
  else {add(s,0,'battle',XX);add(s,1,'battle',VAN);}
  const x=s.players[0].battle[0];
  attack(s,x.uid);chooseEffect(s,'psychicChange1349');pick(s,x.uid);
  assert.ok(has(s,0,'extra',buster)&&has(s,0,'battle',x));
  assert.equal(s.attack.attacker,x.uid);
 }
});

test('P Revolution Change rechecks the new attacker after P Invasion (QA40836)',()=>{
 const s=field(),x=add(s,0,'battle',XX),front=add(s,0,'extra',BUSTER),back=add(s,0,'extra',BUSTER);
 attack(s,x.uid);chooseEffect(s,'g23_PsychicInvasion1349',front.uid);pick(s,true);
 assert.ok(s.pendingEffects.some(q=>q.uid===back.uid&&q.task?.op==='psychicChange1349'));
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.uid===back.uid&&q.task?.op==='psychicChange1349'));
 assert.notEqual(s.decision?.task?.op,'psychicChange1349');
 assert.ok(has(s,0,'extra',back));
 assert.equal(s.attack.attacker,front.uid);
});

test('P Revolution Change keeps an evolution stack’s cards but does not trigger a buried Royal (QA43244)',()=>{
 const s=field(),doom=add(s,0,'battle','dm22ex1-007'),royal=inst('dmex18-s13');
 doom.under=[royal];
 const incoming=add(s,0,'extra',BUSTER);
 attack(s,doom.uid);chooseEffect(s,'psychicChange1349');pick(s,doom.uid);
 assert.ok(has(s,0,'extra',doom)&&has(s,0,'extra',royal));
 assert.ok(has(s,0,'battle',incoming));
 assert.equal(s.players[0].hand.length,0);
 assert.ok(!s.pendingEffects.some(q=>q.uid===royal.uid));
 throughAttack(s);
 assert.equal(s.players[0].hand.length,0);
});
