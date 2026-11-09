import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-723.json',import.meta.url)));

test('Phase 723 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:723}));
  assert.throws(()=>standardCardSpec(detail,{phase:722}));
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
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:723}));
 }
});

const AVALUS='dm19-005', ASSAULT='dm19-039', KUSU='dm10-033', BROTHER='dm16-031';
const BEAST='dm01-108', ARC='dm19-011', WATER='dm01-083', DEVIL='dm19-084', MARINE='dm19-051';
const BLOCKER='dm01-011', MADO='dm23ex2-022', EX='dmx04-s05', FIRE='dm01-097';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const end=s=>{s.phase='attack';act(s,'endTurn');};

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id,pred=()=>true){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&pred(a));
 return x;
}

for(const species of [DEVIL,MARINE,null])test('Avalus allows one eligible revival or a decline before W-Breaker '+species,()=>{
 let s=field();
 const attacker=put(s,0,AVALUS);
 const graveEvolution={...e.card(DEVIL),id:'phase723-test-evolution',name:'Grand Devil evolution fixture',evolution:{race:'グランド・デビル'}};
 e.setCards([...data.cards,graveEvolution]);
 try{
  give(s,0,'grave',[DEVIL,MARINE,BEAST,graveEvolution.id]);
  const [devil,marine]=s.players[0].grave,choice=species===DEVIL?devil:species===MARINE?marine:null;
  const originalShields=s.players[1].shields.map(x=>x.uid);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_Select');
  assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[devil.uid,marine.uid,null]);
  s=restore(s);
  pick(s,choice?.uid??null);
  assert.equal(s.players[0].battle.some(x=>[devil.uid,marine.uid].includes(x.uid)),!!choice);
  if(choice)assert.ok(s.players[0].battle.some(x=>x.uid===choice.uid));
  act(s,'breakShields',a=>a.shields.join()===originalShields.slice(1,3).join());
  drain(s);
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),[originalShields[0],...originalShields.slice(3)]);
 }finally{
  e.setCards(data.cards);
 }
});

test('Avalus never revives after being blocked or after attacking a creature',()=>{
 for(const blocked of [true,false]){
  const s=field(),attacker=put(s,0,AVALUS),opponent=put(s,1,BLOCKER,{tapped:!blocked});
  give(s,0,'grave',[DEVIL]);
  const [devil]=s.players[0].grave;
  attack(s,attacker.uid,blocked?'player':opponent.uid);
  if(blocked)act(s,'block',a=>a.uid===opponent.uid);
  else if(s.decision?.type==='block')act(s,'noBlock');
  assert.equal(s.decision,null);
  assert.ok(s.players[0].grave.includes(devil));
  assert.equal(s.players[1].shields.length,5);
 }
});

test('Assault Champion grants both bonuses to existing allied tribes once, until turn end',()=>{
 const s=field(),beast=put(s,0,BEAST),arc=put(s,0,ARC),unrelated=put(s,0,WATER),enemy=put(s,1,BEAST);
 const champion=play(s,ASSAULT);
 drain(s);
 for(const x of [arc,beast]){
  assert.equal(e.power(x,false,s),e.card(x).power+3000);
  assert.equal(e.effectiveCard(x,s).breaker,2);
 }
 for(const x of [champion,unrelated,enemy]){
  assert.equal(e.power(x,false,s),e.card(x).power);
  assert.equal(e.effectiveCard(x,s).breaker??1,1);
 }
 const late=play(s,BEAST);
 assert.equal(e.power(late,false,s),e.card(BEAST).power);
 end(s);
 assert.equal(e.power(beast,false,s),e.card(BEAST).power);
 assert.equal(e.effectiveCard(arc,s).breaker??1,1);
});

test('Kusudalf blocks only its owner’s start-step mana untap and still allows later effects',()=>{
 const s=field(),kusu=put(s,0,KUSU,{tapped:true}),ally=put(s,0,BEAST,{tapped:true});
 for(const p of [0,1])s.players[p].mana[0].tapped=true;
 end(s);
 assert.equal(s.players[1].mana[0].tapped,false);
 end(s);
 assert.equal(s.players[0].mana[0].tapped,true);
 assert.equal(kusu.tapped,false);
 assert.equal(ally.tapped,false);
 assert.equal(e.power(kusu,false,s),7000);
 assert.equal(e.power(kusu,true,s),11000);
 assert.equal(e.effectiveCard(kusu,s).breaker,2);
 play(s,EX);
 drain(s);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Kusudalf forbids limited start-step untaps without leaving an expired limit behind',()=>{
 const s=field(),kusu=put(s,0,KUSU),mado=put(s,1,MADO);
 s.active=1;
 for(const x of s.players[0].mana)x.tapped=true;
 s.g43UntapLimits=[{p:0,turns:s.players[0].turns,source:MADO}];
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.deepEqual(s.g43UntapLimits,[]);
 kusu.g35Ignored=s.turn+2;
 end(s);
 end(s);
 assert.equal(s.decision?.task?.op,'g4_Untap');
 pick(s,s.players[0].mana[0].uid);
 while(s.decision?.task?.op==='g4_Untap')pick(s,null);
 assert.equal(s.players[0].mana.filter(x=>!x.tapped).length,1);
 assert.ok(s.players[1].battle.includes(mado));
});

test('Brother Lizard G-Zero accepts the exact face-up name on either side',()=>{
 const s=field(),brother=inst(BROTHER),ordinary=put(s,1,FIRE);
 s.players[0].hand.push(brother);
 const free=()=>e.getLegalActions(s).find(a=>a.uid===brother.uid&&a.freeSummon==='G・ゼロ');
 assert.ok(!free());
 ordinary.under=[inst(BROTHER)];
 assert.ok(!free());
 const witness=put(s,1,BROTHER,{sealed:1});
 s.players[1].seals.push({...inst(BEAST),faceDown:true,sealOf:witness.uid});
 assert.ok(!free());
 witness.sealed=0;
 s.players[1].seals=[];
 assert.ok(free());
 e.step(s,free());
 assert.ok(s.players[0].battle.includes(brother));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 s.players[1].battle.splice(s.players[1].battle.indexOf(witness),1);
 const next=play(s,BROTHER,a=>a.freeSummon==='G・ゼロ');
 assert.ok(s.players[0].battle.includes(next));
});
