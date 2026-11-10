import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-780.json',import.meta.url)));
const MUSHROOM="dm24rp2-047",KOHAKU="dm24rp2-046",COCCO="dm24rp2-042";
const BODY="dm01-108",FIRE="dm01-097",HYPER="dm24ex1-028",RUSH="dm26rp1-S004",REDZONE="dm25rp3-DM1";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 780 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:780}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:780}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:780}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

function summon(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const targets=s=>s.decision.choices.map(x=>x.value.uid);
const playerAttacks=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');
const end=s=>{s.phase='attack';act(s,'endTurn');};
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

test('Mushroom counts itself when tapped and prevents player attacks at three, while allowing attacks on creatures',()=>{
 for(const shields of [[],[BODY]]){
  const s=setup(),m=put(s,0,'battle',MUSHROOM),a=put(s,0,'battle',BODY),b=put(s,0,'battle',FIRE);
  const attacker=put(s,1,'battle',FIRE);
  give(s,0,'shields',shields);
  s.active=1;
  s.phase='attack';
  a.tapped=b.tapped=true;
  assert.ok(playerAttacks(s,attacker));
  m.tapped=true;
  assert.ok(!playerAttacks(s,attacker));
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===m.uid));
  a.tapped=false;
  assert.ok(playerAttacks(s,attacker));
 }
});

test('Mushroom excludes seals and non-creatures from the count, ignores a muted source, and respects Red Zone',()=>{
 const s=setup(),m=put(s,0,'battle',MUSHROOM),a=put(s,0,'battle',BODY),b=put(s,0,'battle',FIRE);
 const seed=put(s,0,'battle','dm22rp1-8A'),attacker=put(s,1,'battle',FIRE);
 assert.equal(e.isCreature(s,seed),false);
 s.active=1;
 s.phase='attack';
 m.tapped=a.tapped=b.tapped=seed.tapped=true;
 b.sealed=1;
 assert.ok(playerAttacks(s,attacker));
 delete b.sealed;
 assert.ok(!playerAttacks(s,attacker));
 m.g35Ignored=s.turn;
 assert.ok(playerAttacks(s,attacker));
 delete m.g35Ignored;
 put(s,1,'battle',REDZONE);
 assert.ok(playerAttacks(s,attacker));
});

test('Kohaku must choose an allied Hyper creature, restores the selection, and releases it without tapping',()=>{
 let s=setup();
 const hyper=put(s,0,'battle',HYPER),rush=put(s,0,'battle',RUSH),sealed=put(s,0,'battle',HYPER);
 const ordinary=put(s,0,'battle',BODY),enemy=put(s,1,'battle',HYPER);
 sealed.sealed=true;
 s.players[0].seals=[{...inst(BODY),faceDown:true,sealOf:sealed.uid}];
 const kohaku=summon(s,KOHAKU);
 assert.deepEqual(targets(s),[hyper.uid,rush.uid]);
 s=restore(s);
 pick(s,hyper.uid);
 const ally=s.players[0].battle.find(x=>x.uid===hyper.uid);
 assert.equal(e.effectiveCard(ally,s).power,e.card(HYPER).hyper.power);
 assert.equal(e.effectiveCard(ally,s).breaker,2);
 assert.equal(s.decision,null);
 assert.ok([...s.players[0].battle,...s.players[1].battle].every(x=>!x.tapped));
 assert.ok(has(s,0,'battle',ordinary)&&has(s,0,'battle',kohaku)&&has(s,1,'battle',enemy));
 assert.equal(s.players[0].battle.find(x=>x.uid===rush.uid).hyperActive,undefined);
});

test('Kohaku can enter with no target and ramps when it is tapped to pay an existing Hyper activation',()=>{
 const empty=setup();
 summon(empty,KOHAKU);
 assert.equal(empty.decision,null);
 const s=setup(),ally=put(s,0,'battle',HYPER);
 const kohaku=summon(s,KOHAKU);
 assert.deepEqual(targets(s),[ally.uid]);
 pick(s,ally.uid);
 const paid=put(s,0,'battle',HYPER),first=s.players[0].deck[0];
 const options=e.getLegalActions(s).filter(a=>a.kind==='hyper');
 assert.ok(options.some(a=>a.uid===paid.uid));
 assert.ok(!options.some(a=>a.uid===ally.uid));
 act(s,'hyper',a=>a.uid===paid.uid);
 pick(s,kohaku.uid);
 assert.ok(kohaku.tapped&&paid.hyperActive);
 assert.ok(has(s,0,'mana',first));
});

test('Cocco attacks the turn it enters, releases Z Rush without a shield event, and the mode expires at its next own start',()=>{
 let s=setup();
 const rush=put(s,0,'battle',RUSH),cocco=summon(s,COCCO);
 attack(s,cocco.uid);
 assert.deepEqual(targets(s),[rush.uid]);
 s=restore(s);
 pick(s,rush.uid);
 finishAttack(s);
 const ally=s.players[0].battle.find(x=>x.uid===rush.uid);
 assert.equal(e.effectiveCard(ally,s).power,e.card(RUSH).hyper.power);
 end(s);
 assert.equal(s.active,1);
 assert.ok(ally.hyperActive);
 end(s);
 assert.equal(s.active,0);
 assert.equal(ally.hyperActive,undefined);
 assert.equal(e.effectiveCard(ally,s).power,e.card(RUSH).power);
});

test('an externally released mode keeps its power under creature ability suppression without keeping the suppressed ability',()=>{
 const s=setup(),rush=put(s,0,'battle',RUSH);
 summon(s,KOHAKU);
 pick(s,rush.uid);
 rush.g35Ignored=s.turn;
 assert.ok(e.abilitiesIgnored(s,rush));
 assert.equal(e.effectiveCard(rush,s).power,e.card(RUSH).hyper.power);
 assert.equal(e.effectiveCard(rush,s).attackExecuteHand,undefined);
 const spell=put(s,0,'hand','dm24rp1-050');
 attack(s,rush.uid);
 assert.equal(s.decision.task.op,'g34_Chance417');
 assert.equal(s.decision.source,spell.cardId);
 pick(s,null);
 finishAttack(s);
});
