import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-790.json',import.meta.url)));
const ART="dm24ex4-019",CT="dm24ex4-071",SUGOI="dm24ex4-074";
const BODY="dm01-108",SEED="dm22ex1-086",TRIPLE="dmx07-005";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 790 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:790}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:790}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:790}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const chooseEffect=(s,id)=>act(s,'orderEffect',a=>a.cardId===id);
const phaseTask=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));

test('A・R・T has Speed Attacker, Just Diver and W Breaker and stops at six draws',()=>{
 const s=setup(),art=put(s,0,'hand',ART);
 const target=put(s,1,'battle',SEED);
 s.players[0].drawsThisTurn=3;
 play(s,art);
 assert.equal(art.justDiverActive,true);
 assert.equal(e.card(art).breaker,2);
 attack(s,art.uid);
 for(let i=0;i<3;i++)pick(s,true);
 assert.equal(s.players[0].drawsThisTurn,6);
 assert.ok(has(s,1,'battle',target));
 assert.equal(s.players[1].shields.length,5);
 act(s,'noBlock');
});

test('A・R・T may skip every draw and bounce and still break one shield before the original attack',()=>{
 const s=setup(),art=put(s,0,'battle',ART);
 const seed=put(s,1,'battle',SEED);
 const shield=s.players[1].shields[1];
 s.players[0].drawsThisTurn=7;
 attack(s,art.uid);
 pick(s,null);
 phaseTask(s,'g34_Select');
 pick(s,null);
 phaseTask(s,'g34_Offer');
 pick(s,true);
 pick(s,shield.uid);
 assert.ok(has(s,1,'battle',seed));
 assert.ok(has(s,1,'hand',shield));
 assert.equal(s.attack.attacker,art.uid);
 assert.equal(s.players[1].shields.length,4);
 act(s,'noBlock');
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,2);
});

test('A・R・T can return a creature and a noncreature element while respecting Just Diver',()=>{
 const s=setup(),art=put(s,0,'battle',ART);
 const seed=put(s,1,'battle',SEED),body=put(s,1,'battle',BODY),protectedArt=put(s,1,'battle',ART);
 protectedArt.justDiverActive=true;
 s.players[0].drawsThisTurn=5;
 attack(s,art.uid);
 pick(s,true);
 pick(s,true);
 pick(s,null);
 assert.ok(!s.decision.choices.some(o=>o.value?.uid===protectedArt.uid));
 pick(s,seed.uid);
 pick(s,body.uid);
 assert.ok(has(s,1,'hand',seed));
 assert.ok(has(s,1,'hand',body));
 phaseTask(s,'g34_Offer');
 pick(s,null);
 assert.equal(s.players[1].shields.length,5);
});

test('C・T・７ declares at four draws and deploys for free after A・R・T reaches seven',()=>{
 let s=setup();
 const art=put(s,0,'battle',ART),ct=put(s,0,'hand',CT);
 s.players[0].drawsThisTurn=4;
 attack(s,art.uid);
 phaseTask(s,'g23_Declare');
 pick(s,true);
 s=restore(s);
 assert.equal(e.chooseAI(s).cardId,ART);
 chooseEffect(s,ART);
 for(let i=0;i<3;i++)pick(s,true);
 phaseTask(s,'g34_Offer');
 pick(s,null);
 phaseTask(s,'g23_CT');
 pick(s,true);
 assert.ok(has(s,0,'battle',ct));
 assert.equal(s.players[0].mana.some(x=>x.tapped),false);
 assert.equal(s.attack.attacker,art.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ct.uid));
});

test('C・T・７ drawn during the attack cannot declare for that attack',()=>{
 const s=setup(),art=put(s,0,'battle',ART),ct=inst(CT);
 s.players[0].deck.unshift(ct);
 s.players[0].drawsThisTurn=7;
 attack(s,art.uid);
 phaseTask(s,'g34_DrawUpTo');
 pick(s,true);
 pick(s,null);
 phaseTask(s,'g34_Offer');
 pick(s,null);
 assert.ok(has(s,0,'hand',ct));
 assert.equal(s.decision.type,'block');
});

test('C・T・７ cannot deploy before the seventh draw or after a same-name entry this turn',()=>{
 for(const alreadyEntered of [false,true]){
  const s=setup(),art=put(s,0,'battle',ART);
  if(alreadyEntered){
   const first=put(s,0,'hand',CT);
   play(s,first);
   s.players[0].grave.push(s.players[0].battle.pop());
  }
  const ct=put(s,0,'hand',CT);
  s.players[0].drawsThisTurn=alreadyEntered?7:4;
  attack(s,art.uid);
  phaseTask(s,'g23_Declare');
  pick(s,true);
  chooseEffect(s,CT);
  phaseTask(s,'g34_DrawUpTo');
  pick(s,null);
  if(alreadyEntered)pick(s,null);
  assert.ok(has(s,0,'hand',ct));
  assert.equal(s.decision.type,'block');
 }
});

test('declared copies of C・T・７ independently recheck whether any copy entered',()=>{
 const s=setup(),a=put(s,0,'battle',BODY),first=put(s,0,'hand',CT),second=put(s,0,'hand',CT);
 s.players[0].drawsThisTurn=7;
 attack(s,a.uid);
 pick(s,true);
 pick(s,true);
 act(s,'orderEffect',x=>x.uid===second.uid);
 pick(s,true);
 assert.ok(has(s,0,'battle',second));
 assert.ok(has(s,0,'hand',first));
 assert.equal(s.decision.type,'block');
});

test('スゴイワン publicly reveals and adds a creature without drawing or puts a spell on the bottom',()=>{
 for(const id of [BODY,TRIPLE]){
  const s=setup(),dog=put(s,0,'hand',SUGOI),top=inst(id);
  s.players[0].deck.unshift(top);
  s.players[0].drawsThisTurn=6;
  play(s,dog);
  assert.equal(s.players[0].drawsThisTurn,6);
  if(id===BODY)assert.ok(has(s,0,'hand',top));
  else assert.equal(s.players[0].deck.at(-1).uid,top.uid);
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===SUGOI));
 }
});

test('スゴイワン replaces only the third creature in a single three-creature deployment',()=>{
 const s=setup();
 put(s,1,'battle',SUGOI);
 const spell=put(s,0,'hand',TRIPLE);
 const entries=[0,1,2].map(()=>put(s,0,'grave',BODY));
 play(s,spell);
 for(const x of entries)pick(s,x.uid);
 assert.equal(s.players[0].enteredThisTurn,2);
 assert.ok(entries.slice(0,2).every(x=>has(s,0,'battle',x)));
 assert.ok(has(s,0,'mana',entries[2]));
});

test('スゴイワン also redirects off-turn creatures and leaves noncreature entry alone',()=>{
 const s=setup();
 put(s,0,'battle',SUGOI);
 const third=put(s,1,'grave',BODY),seed=put(s,1,'grave',SEED);
 s.players[1].enteredThisTurn=2;
 s.extTasks=[{op:'putCreature',p:1,source:TRIPLE,uid:third.uid,origin:'grave'},{op:'putCreature',p:1,source:TRIPLE,uid:seed.uid,origin:'grave'}];
 act(s,'toAttack');
 assert.ok(has(s,1,'mana',third));
 assert.ok(has(s,1,'battle',seed));
 assert.equal(s.players[1].enteredThisTurn,2);
});

test('A・R・T still breaks a shield after invasion and Red Zone F suppresses its G Strike (QA46244)',()=>{
 const s=setup(),art=put(s,0,'battle',ART),red=put(s,0,'hand','dm22ex1-011');
 const shield=inst('dmrp17-025');
 s.players[1].shields[0]=shield;
 assert.equal(e.card(shield).gStrike,true);
 s.players[0].drawsThisTurn=7;
 attack(s,art.uid);
 pick(s,true);
 chooseEffect(s,red.cardId);
 pick(s,true);
 assert.equal(s.attack.attacker,red.uid);
 pick(s,null);
 phaseTask(s,'g34_Offer');
 pick(s,true);
 pick(s,shield.uid);
 assert.ok(has(s,1,'hand',shield));
 assert.equal(s.decision.type,'block');
 assert.equal(s.attack.attacker,red.uid);
});

test('C・T・７ redirected to mana does not prevent a second declaration from resolving',()=>{
 const s=setup(),art=put(s,0,'battle',ART),first=put(s,0,'hand',CT),second=put(s,0,'hand',CT);
 const dog=put(s,1,'battle',SUGOI);
 s.players[0].enteredThisTurn=2;
 s.players[0].drawsThisTurn=7;
 attack(s,art.uid);
 pick(s,true);
 pick(s,true);
 act(s,'orderEffect',x=>x.uid===first.uid);
 pick(s,true);
 assert.ok(has(s,0,'mana',first));
 chooseEffect(s,ART);
 pick(s,null);
 pick(s,dog.uid);
 phaseTask(s,'g34_Offer');
 pick(s,null);
 phaseTask(s,'g23_CT');
 pick(s,true);
 assert.ok(has(s,0,'battle',second));
});
