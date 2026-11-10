import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-772.json',import.meta.url)));
const SIGN='dm23rp3-038',JAG='dm23rp4-041',MANK='dm23rp4-043';
const BODY='dm01-108',FIRE='dm01-097',ARMOR='dm23rp4-001',SEED='dmrp21-069',GEAR='dm23ex1-024',NEO='dm24ex2-068';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:772}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:772}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(print.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})),row.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})));
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const speed=(s,x)=>Boolean(e.effectiveCard(x,s).speedAttacker);
function finishPlayerAttack(s){
 assert.equal(s.decision?.type,'block');
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

test('Sign must put an eligible card into play and then destroy one of its controller’s elements',()=>{
 let s=setup();
 const entrant=put(s,0,'hand',ARMOR);
 const rejects=[BODY,'dmrp17-km1','dm23rp4-OR2',SEED].map(id=>put(s,0,'hand',id));
 const seed=put(s,0,'battle',SEED),gear=put(s,0,'battle',GEAR),enemy=put(s,1,'battle',BODY);
 const spell=play(s,SIGN);
 assert.deepEqual(choices(s),[entrant.uid]);
 pick(s,entrant.uid);
 assert.equal(s.decision.task.origin,'battle');
 assert.deepEqual(new Set(choices(s)),new Set([entrant.uid,seed.uid,gear.uid]));
 s=restore(s);
 pick(s,gear.uid);
 const live=s.players[0].battle.find(x=>x.uid===entrant.uid);
 assert.ok(speed(s,live)&&live.g34Grants.some(g=>g.spellSource===SIGN&&g.spellCost===5));
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'grave',gear)&&has(s,1,'battle',enemy));
 assert.ok(rejects.every(x=>has(s,0,'hand',x)));
});

test('Sign still requires destruction with no legal deployment and omits sealed cards',()=>{
 const s=setup(),seed=put(s,0,'battle',SEED),sealed=put(s,0,'battle',BODY);
 const seal=put(s,0,'seals',BODY);
 seal.sealOf=sealed.uid;
 seal.faceDown=true;
 sealed.sealed=true;
 put(s,0,'hand',BODY);
 play(s,SIGN);
 assert.equal(s.decision.task.origin,'battle');
 assert.deepEqual(choices(s),[seed.uid]);
 pick(s,seed.uid);
 assert.ok(has(s,0,'grave',seed)&&has(s,0,'battle',sealed));
});

for(const evolve of [false,true])test('Sign can play a non-evolution NEO card '+evolve,()=>{
 const s=setup(),base=put(s,0,'battle',FIRE),entrant=put(s,0,'hand',NEO),seed=put(s,0,'battle',SEED);
 play(s,SIGN);
 pick(s,entrant.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 pick(s,evolve?base.uid:null);
 pick(s,seed.uid);
 const live=s.players[0].battle.find(x=>x.uid===entrant.uid);
 assert.equal(e.isEvolution(live),evolve);
 assert.ok(speed(s,live));
});

test('Sign can destroy the creature just deployed before a separate entry effect resolves',()=>{
 const s=setup(),entrant=put(s,0,'hand','dm23rp3-065');
 const deckSize=s.players[0].deck.length;
 play(s,SIGN);
 pick(s,entrant.uid);
 assert.deepEqual(choices(s),[entrant.uid]);
 assert.equal(s.players[0].deck.length,deckSize);
 pick(s,entrant.uid);
 assert.ok(has(s,0,'grave',entrant));
 assert.equal(s.players[0].deck.length,deckSize-2);

});

test('Sign’s temporary speed loses effectiveness under spell suppression',()=>{
 const s=setup(),entrant=put(s,0,'hand',ARMOR),sacrifice=put(s,0,'battle',SEED);
 play(s,SIGN);
 pick(s,entrant.uid);
 pick(s,sacrifice.uid);
 assert.ok(speed(s,entrant));
 put(s,1,'battle',GEN);
 assert.ok(!speed(s,entrant));
});

test('Jag counts shield groups and discounts when tied or ahead',()=>{
 const s=setup(),jag=put(s,0,'hand',JAG);
 const cost=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===jag.uid).cost;
 assert.equal(cost(),5);
 s.players[0].shields.pop();
 s.players[0].shields[0].shieldStack=[inst(BODY),inst(BODY)];
 assert.equal(cost(),7);
 s.players[1].shields.pop();
 assert.equal(cost(),5);
 s.players[1].shields.pop();
 assert.equal(cost(),5);
});

test('Jag gains and loses speed with another friendly Armored element, including a tamaseed',()=>{
 const s=setup(),jag=play(s,JAG);
 put(s,1,'battle',ARMOR);
 assert.ok(!speed(s,jag));
 const seed=put(s,0,'battle',SEED);
 assert.ok(!e.isCreature(s,seed));
 assert.ok(speed(s,jag));
 act(s,'toAttack');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===jag.uid));
 s.players[0].battle.splice(s.players[0].battle.indexOf(seed),1);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===jag.uid));
});

test('Jag can block without another Armored, and double breaks with speed when enabled',()=>{
 const s=setup(),attacker=put(s,1,'battle',BODY),jag=put(s,0,'battle',JAG);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===jag.uid||a.blocker===jag.uid);
 assert.ok(has(s,1,'grave',attacker));
 assert.ok(jag.tapped);
 const t=setup();
 put(t,0,'battle',SEED);
 const live=play(t,JAG);
 attack(t,live.uid);
 finishPlayerAttack(t);
 assert.equal(t.players[1].shields.length,3);
});

test('Mank can decline entry draw, attack immediately, and draw exactly once on its own attack',()=>{
 const s=setup(),mank=play(s,MANK),before=s.players[0].hand.length;
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 assert.equal(s.players[0].hand.length,before);
 attack(s,mank.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,1);
 assert.equal(s.players[0].hand.length,before+1);
 finishPlayerAttack(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const attackerSeat of [0,1])test('Mank watches either player’s attack and draws for its own controller '+attackerSeat,()=>{
 let s=setup();
 const mank=put(s,0,'battle',MANK),attacker=put(s,attackerSeat,'battle',BODY),target=put(s,1-attackerSeat,'battle',BODY);
 target.tapped=true;
 s.active=attackerSeat;
 attack(s,attacker.uid,target.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 assert.equal(s.decision.player,0);
 const size=s.players[0].hand.length;
 s=restore(s);
 pick(s,1);
 assert.equal(s.players[0].hand.length,size+1);
 assert.ok(has(s,0,'battle',mank));
 assert.equal(s.decision?.type,'block');
});

test('Mank checks the attacking Magic’s cost and draws only for entering via Revolution Change',()=>{
 for(const [id,eligible] of [['dm23rp3-064',false],['dmrp11-074',true],['dm01-001',false]]){
  let s=setup();
  const attacker=put(s,0,'battle',id),mank=put(s,0,'hand',MANK);
  // The six-cost non-Magic attacker cannot attack a player.
  const target=put(s,1,'battle',BODY);
  target.tapped=true;
  attack(s,attacker.uid,target.uid);
  assert.equal(s.decision?.task?.op==='revDeclare',eligible);
  if(!eligible)continue;
  s=restore(s);
  pick(s,true);
  assert.equal(s.decision.task.op,'revResolve');
  pick(s,attacker.uid);
  assert.equal(s.decision.task.op,'g34_Draw');
  assert.ok(has(s,0,'battle',mank)&&has(s,0,'hand',attacker));
  const before=s.players[0].hand.length;
  pick(s,1);
  assert.equal(s.players[0].hand.length,before+1);
  assert.equal(s.decision.type,'block');
 }
});
