import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-687.json',import.meta.url)));

test('Phase 687 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:687}));
  assert.throws(()=>standardCardSpec(detail,{phase:686}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:687}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const FRE='dmr23-038',MC='dmr20-064',DUEL='dmr17-s02';
const SMALL='dm01-108',LIGHT_ALLY='dm01-075',BOTH='dm12-035',THREE='dmr04-052',GYM='dmr21-047';
const SPELL='dmr15-033',LIGHT='dm01-015',MIXED_LIGHT='dm25rp2-011';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const canPlay=(s,id)=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===id);
const canAttack=(s,uid)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid&&a.target==='player');

for(const accept of [false,true])test('Fregata observes a qualifying own creature and can decline or ramp the top card '+accept,()=>{
 let s=field();
 play(s,FRE);
 assert.equal(s.decision,null);
 play(s,SMALL);
 assert.equal(s.decision,null);
 play(s,LIGHT_ALLY);
 assert.equal(s.decision,null);
 s.players[0].deck.unshift(inst(BOTH));
 const uid=s.players[0].deck[0].uid,count=s.players[0].deck.length;
 play(s,THREE);
 assert.equal(s.decision.task.op,'g34_Ramp');
 s=JSON.parse(JSON.stringify(s));
 pick(s,Number(accept));
 assert.equal(s.players[0].deck.length,count-Number(accept));
 if(accept)assert.ok(s.players[0].mana.some(x=>x.uid===uid&&x.tapped));
 else assert.equal(s.players[0].deck[0].uid,uid);
 assert.equal(s.decision,null);
});

test('Fregata does not observe the opponent or count an ignored observer',()=>{
 const s=field(1);
 put(s,0,FRE);
 play(s,BOTH);
 assert.equal(s.decision,null);
 s.active=0;
 s.players[0].battle[0].g35Ignored=s.turn;
 play(s,BOTH);
 assert.equal(s.decision,null);
});

test('Nareta counts itself, counts shield groups once and updates its attack permission live',()=>{
 const s=field(),enemy=put(s,1,SMALL);
 give(s,0,'shields',[SMALL,SMALL]);
 s.players[0].shields[0].shieldStack=[inst(SMALL)];
 play(s,MC);
 const mc=s.players[0].battle[0];
 s.phase='attack';
 assert.ok(!canAttack(s,mc.uid));
 const gym=put(s,0,GYM);
 assert.ok(!canAttack(s,mc.uid));
 assert.equal(s.players[0].battle.pop(),gym);
 const ally=put(s,0,SMALL);
 assert.ok(canAttack(s,mc.uid));
 ally.sealed=true;
 assert.ok(!canAttack(s,mc.uid));
 s.players[0].shields.pop();
 assert.ok(canAttack(s,mc.uid));
 const obs=e.observation(s,0);
 assert.equal(e.effectiveCard(obs.players[0].battle[0],obs).speedAttacker,true);
 mc.g35Ignored=s.turn;
 assert.ok(!canAttack(s,mc.uid));
 assert.ok(!enemy.tapped);
});

for(const p of [0,1])test('Duelangel stops both players’ non-light spells only at the opponent threshold '+p,()=>{
 const s=field(p);
 give(s,p,'shields',[]);
 give(s,1-p,'shields',[SMALL,SMALL,SMALL]);
 play(s,DUEL);
 const d=s.players[p].battle[0];
 assert.equal(e.effectiveCard(d,s).blocker,true);
 assert.equal(e.effectiveCard(d,s).breaker,3);
 for(const q of [0,1])give(s,q,'hand',[SPELL,LIGHT,MIXED_LIGHT,SMALL]);
 for(const q of [0,1]){
  s.active=q;
  assert.ok(canPlay(s,SPELL));
 }
 s.players[1-p].shields.pop();
 for(const q of [0,1]){
  s.active=q;
  assert.ok(!canPlay(s,SPELL));
  assert.ok(canPlay(s,LIGHT));
  assert.ok(canPlay(s,MIXED_LIGHT));
  assert.ok(canPlay(s,SMALL));
  assert.equal(e.canCastSpell(s,q,e.card(SPELL),'grave'),false);
  const obs=e.observation(s,q);
  assert.equal(e.canCastSpell(obs,q,e.card(SPELL)),false);
 }
 d.g35Ignored=s.turn;
 assert.ok(canPlay(s,SPELL));
});

for(const id of [SPELL,LIGHT])test('Duelangel evaluates the remaining shield count before S Trigger declaration '+id,()=>{
 const s=field(),attacker=put(s,0,SMALL);
 put(s,0,DUEL);
 give(s,1,'shields',[id,SMALL,SMALL]);
 const shield=s.players[1].shields[0];
 assert.equal(e.canCastSpell(s,1,e.card(id),'hand'),true);
 attack(s,attacker.uid,'player');
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,2);
 if(id===LIGHT){
  act(s,'useTrigger',a=>a.uid===shield.uid);
  assert.ok(s.players[1].grave.includes(shield));
 }else{
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
  assert.ok(s.players[1].hand.includes(shield));
 }
 assert.equal(s.decision,null);
});
