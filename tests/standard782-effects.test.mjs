import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-782.json',import.meta.url)));
const PROOF="dm24rp2-041",DAIDAI="dm24rp2-049",AKANE="dm24rp2-024";
const BODY="dm01-108",FIRE="dm01-097",SPELL="dm01-110",LOW="dmr05-081",EQUAL="dm01-001";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 782 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:782}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:782}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:782}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const attackActions=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const activate=(s,x,donor)=>{act(s,'hyper',a=>a.uid===x.uid);pick(s,donor.uid);};
const finishAttack=s=>{
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
};

test('Proof is a Blocker and requires five graveyard cards of any type to attack',()=>{
 const s=setup(),proof=put(s,0,'battle',PROOF);
 assert.equal(e.effectiveCard(proof,s).blocker,true);
 give(s,0,'grave',Array(4).fill(SPELL));
 s.phase='attack';
 assert.equal(attackActions(s,proof).length,0);
 put(s,0,'grave',SPELL);
 assert.ok(attackActions(s,proof).some(a=>a.target==='player'));
 s.players[0].grave.pop();
 const victim=put(s,1,'battle',BODY);
 victim.tapped=true;
 assert.equal(attackActions(s,proof).length,0);
});

test('Proof fixes the count before revealing cards, can mill fewer than the maximum, and restores the decision',()=>{
 for(const amount of [0,2,3]){
  let s=setup();
  const proof=put(s,0,'battle',PROOF),donor=put(s,0,'battle',BODY),friend=put(s,0,'battle',FIRE);
  const nonCreature=put(s,0,'battle','dmsd20-016'),enemy=put(s,1,'battle',FIRE);
  const sealed=put(s,0,'battle',BODY);
  sealed.sealed=true;
  s.players[0].seals=[{...inst(BODY),faceDown:true,sealOf:sealed.uid}];
  assert.equal(e.isCreature(s,nonCreature),false);
  activate(s,proof,donor);
  proof.tapped=friend.tapped=nonCreature.tapped=enemy.tapped=sealed.tapped=true;
  const deck=s.players[0].deck.map(x=>x.uid);
  end(s);
  assert.equal(s.decision.task.op,'g34_MillTapped782');
  assert.deepEqual(values(s),[0,1,2,3]);
  assert.ok(s.decision.choices.every(x=>!x.cardId));
  assert.deepEqual(s.players[0].grave,[]);
  s=restore(s);
  pick(s,amount);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),deck.slice(0,amount));
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(amount));
  assert.equal(s.active,1);
 }
});

test('Proof has no end step mill in normal mode and checks deck loss after moving the chosen group',()=>{
 for(const active of [false,true]){
  const s=setup(),proof=put(s,0,'battle',PROOF),donor=put(s,0,'battle',BODY);
  give(s,0,'deck',[BODY,SPELL]);
  const expected=s.players[0].deck.map(x=>x.uid);
  if(active)activate(s,proof,donor);
  proof.tapped=donor.tapped=true;
  end(s);
  if(active){
   assert.deepEqual(values(s),[0,1,2]);
   pick(s,2);
   assert.deepEqual(s.players[0].grave.map(x=>x.uid),expected);
   assert.equal(s.winner,1);
  }else{
   assert.equal(s.active,1);
   assert.deepEqual(s.players[0].grave,[]);
  }
 }
});

test('Daidai normally attacks a player, but its 14000 mode may only attack creatures',()=>{
 const s=setup(),daidai=put(s,0,'battle',DAIDAI),donor=put(s,0,'battle',BODY);
 const victim=put(s,1,'battle',FIRE);
 victim.tapped=true;
 s.phase='attack';
 assert.ok(attackActions(s,daidai).some(a=>a.target==='player'));
 s.phase='main';
 activate(s,daidai,donor);
 s.phase='attack';
 assert.equal(e.power(daidai,false,s),14000);
 assert.ok(!attackActions(s,daidai).some(a=>a.target==='player'));
 assert.ok(attackActions(s,daidai).some(a=>a.target===victim.uid));
 end(s);
 end(s);
 s.phase='attack';
 assert.equal(e.power(daidai,false,s),3000);
 assert.ok(attackActions(s,daidai).some(a=>a.target==='player'));
});

test('Daidai Guardman redirects an attack on another allied creature and uses its current power',()=>{
 const s=setup(),daidai=put(s,0,'battle',DAIDAI),ally=put(s,0,'battle',BODY),attacker=put(s,1,'battle','dm01-007');
 activate(s,daidai,ally);
 end(s);
 attacker.tapped=false;
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===daidai.uid);
 assert.ok(daidai.tapped&&has(s,0,'battle',ally)&&has(s,1,'grave',attacker));
});

test('Akane uses S-Trigger without paying mana and sends the selected enemy creature to its owner’s mana',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE),target=put(s,1,'battle',BODY),friend=put(s,0,'battle',BODY);
 s.active=1;
 give(s,0,'shields',[AKANE]);
 attack(s,attacker.uid);
 finishAttack(s);
 act(s,'useTrigger');
 assert.deepEqual(values(s),[attacker.uid,target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'mana',target)&&has(s,0,'battle',friend));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.ok(s.players[0].battle.some(x=>x.cardId===AKANE&&!x.hyperActive));
});

test('Akane can be blocked at equal power in Hyper Mode, but not by a weaker blocker',()=>{
 for(const active of [false,true]){
  const s=setup(),akane=put(s,0,'battle',AKANE),donor=put(s,0,'battle',BODY);
  const weak=put(s,1,'battle',LOW),equal=put(s,1,'battle',EQUAL);
  if(active)activate(s,akane,donor);
  attack(s,akane.uid);
  const blockers=e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
  assert.deepEqual(blockers,active?[equal.uid]:[weak.uid,equal.uid]);
  assert.equal(e.effectiveCard(akane,s).breaker,active?2:undefined);
 }
});

test('evolving a released Daidai keeps neither its Hyper power nor its player-attack restriction (QA 44836)',()=>{
 const s=setup(),daidai=put(s,0,'battle',DAIDAI),donor=put(s,0,'battle',FIRE);
 activate(s,daidai,donor);
 const neo=put(s,0,'hand','dmrp01-087');
 act(s,'play',a=>a.uid===neo.uid);
 act(s,'evolve',a=>a.baseUid===daidai.uid);
 assert.equal(neo.under[0].uid,daidai.uid);
 assert.equal(e.power(neo,false,s),6000);
 s.phase='attack';
 assert.ok(attackActions(s,neo).some(a=>a.target==='player'));
});
