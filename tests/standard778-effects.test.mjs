import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-778.json',import.meta.url)));
const DUAL='dm24rp3-067',SUGO='dm24rp3-057',CRY='dm24rp4-046',TREE='dm24rp4-029';
const BODY='dm01-108',WATER='dm01-083',FIRE='dm01-097',BIG='dm01-007',SPELL='dm01-110',NEO='dm24ex2-068',MARU='dm24rp4-050';
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
test('Phase 778 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:778}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:778}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:778}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
function paid(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568'&&a.cost===3);
 return x;
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}
test('Marupia EX3 alias and image resolve to the previously supported card without a duplicate',()=>{
 const row=printAliases.find(x=>x.canonicalId===MARU),registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.ok(row.verification.facesMatched);
 assert.equal(regulationVerification.limits[row.id],e.card(MARU).limit);
 assert.deepEqual(row.faces,details.cards.find(x=>x.id===MARU).faces);
 assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 assert.deepEqual(registry.resolveRows([{id:MARU,count:1},{id:row.id,count:2}]),[{id:MARU,count:3}]);
});
test('Dualshock pays three and sends the selected nonleading shield group to grave without a break or Trigger',()=>{
 let s=setup();
 give(s,0,'shields',[BODY,MARU,BODY]);
 const [first,selected,third]=s.players[0].shields,top=inst(TREE);
 selected.shieldStack=[top];
 const x=paid(s,DUAL);
 assert.equal(s.decision.task.op,'g34_ShieldGrave');
 s=restore(s);
 pick(s,selected.uid);
 assert.deepEqual(ids(s,0,'shields'),[first.uid,third.uid]);
 assert.deepEqual(ids(s,0,'grave').sort(),[selected.uid,top.uid].sort());
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.triggers??null,null);
 assert.ok(!s.players[0].brokenThisTurn);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,3);
});
test('Dualshock enters normally without a shield cost and can use the alternative when there are no shields',()=>{
 for(const alternative of [false,true]){
  const s=setup();
  if(alternative)give(s,0,'shields',[]);
  const shields=ids(s,0,'shields'),x=put(s,0,'hand',DUAL);
  act(s,'play',a=>a.uid===x.uid&&(alternative?a.role==='paidAlt568':!a.alternative&&a.cost===5));
  assert.equal(s.decision,null);
  assert.deepEqual(ids(s,0,'shields'),shields);
  assert.equal(e.card(DUAL).breaker,2);
 }
});
test('Sugoronya returns a chosen mana card only after alternative entry',()=>{
 const s=setup();
 give(s,0,'mana',[WATER,FIRE,BODY]);
 const wanted=s.players[0].mana[1],x=paid(s,SUGO);
 assert.deepEqual(values(s),ids(s,0,'mana'));
 pick(s,wanted.uid);
 assert.ok(has(s,0,'hand',wanted)&&has(s,0,'battle',x));
 assert.equal(wanted.tapped,false);
 assert.equal(s.players[0].mana.length,2);
 const ordinary=setup(),before=ids(ordinary,0,'mana');
 play(ordinary,SUGO);
 assert.deepEqual(ids(ordinary,0,'mana'),before);
 assert.equal(ordinary.decision,null);
 assert.equal(e.card(SUGO).breaker,2);
});
test('Sugoronya cannot return mana under Apul',()=>{
 const s=setup(),before=ids(s,0,'mana');
 put(s,1,'battle','dmrp22-042');
 const x=paid(s,SUGO);
 assert.ok(has(s,0,'battle',x));
 assert.deepEqual(ids(s,0,'mana'),before);
 assert.equal(s.decision,null);
});
for(const [id,quote,op] of [[DUAL,3,'g34_ShieldGrave'],[SUGO,3,'g34_Select'],['dm24rp3-072',2,'g34_Offer'],['dm24rp3-062',2,'g34_Offer']])
 test(id+' alternate entry is neither replaced by Gaia nor punished by Black Bean (QA 45461)',()=>{
  const s=setup();
  put(s,1,'battle','dmrp16-s05');
  put(s,1,'battle','dmrp05-009');
  const x=put(s,0,'hand',id);
  act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568'&&a.cost===quote);
  assert.ok(has(s,0,'battle',x));
  assert.equal(s.decision.task.op,op);
  pick(s,op==='g34_Offer'?null:values(s)[0]);
  assert.ok(has(s,0,'battle',x));
  assert.equal(s.decision,null);
 });
test('a regular self-entry ability still sends the creature to mana under Gaia',()=>{
 const s=setup();
 put(s,1,'battle','dmrp16-s05');
 const x=play(s,MARU);
 assert.ok(has(s,0,'mana',x));
 assert.equal(s.decision,null);
});
test('Cry shuffles its own grave first, then privately chooses a creature and orders the rest below the unviewed deck',()=>{
 let s=setup();
 give(s,0,'deck',Array(5).fill(BODY));
 give(s,0,'grave',[NEO,SPELL,BODY]);
 const pool=[...ids(s,0,'deck'),...ids(s,0,'grave')].sort();
 const enemy=put(s,1,'grave',BODY);
 const spell=play(s,CRY);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.ok(has(s,1,'grave',enemy));
 assert.deepEqual(ids(s,0,'deck').sort(),pool);
 assert.deepEqual(s.log.filter(r=>r.cardId===CRY).slice(-2).map(r=>r.type),['shuffleGrave','look']);
 const [top,unviewed]=[s.players[0].deck.slice(0,4),ids(s,0,'deck').slice(4)];
 const hit=top.find(x=>x.cardId===BODY);
 pick(s,hit.uid);
 const rest=top.filter(x=>x.uid!==hit.uid).reverse().map(x=>x.uid);
 s=restore(s);
 for(const uid of rest.slice(0,-1))pick(s,uid);
 assert.deepEqual(ids(s,0,'deck'),[...unviewed,...rest]);
 assert.ok(has(s,0,'battle',hit)&&has(s,0,'grave',spell));
});
test('Cry shuffles even an empty grave and may put all four cards back in the chosen order',()=>{
 const s=setup();
 give(s,0,'deck',Array(6).fill(BODY));
 play(s,CRY);
 assert.ok(s.log.some(r=>r.cardId===CRY&&r.type==='shuffleGrave'));
 const [top,unviewed]=[ids(s,0,'deck').slice(0,4),ids(s,0,'deck').slice(4)];
 pick(s,null);
 const rest=top.reverse();
 for(const uid of rest.slice(0,-1))pick(s,uid);
 assert.deepEqual(ids(s,0,'deck'),[...unviewed,...rest]);
 assert.deepEqual(ids(s,0,'battle'),[]);
});
test('Cry can be cast with Hyper Energy and cannot inspect a locked deck',()=>{
 const s=setup();
 give(s,0,'mana',Array(9).fill(BODY));
 const ally=put(s,0,'battle',BODY),spell=put(s,0,'hand',CRY),before=ids(s,0,'deck');
 put(s,1,'battle','dmrp07-m01');
 act(s,'play',a=>a.uid===spell.uid&&a.alternative==='hyperEnergy');
 pick(s,ally.uid);
 pick(s,false);
 assert.equal(ally.tapped,true);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,9);
 assert.deepEqual(ids(s,0,'deck'),before);
 assert.equal(s.decision,null);
});
test('Tree checks its own mana count on each opposing creature’s entry and uses the controller’s deck',()=>{
 for(const [mana,accept] of [[2,null],[1,false],[1,true]]){
  const s=setup();
  s.active=1;
  give(s,0,'mana',Array(mana).fill(BODY));
  put(s,0,'battle',TREE);
  const top=s.players[0].deck[0],opponentDeck=ids(s,1,'deck');
  play(s,BODY);
  if(accept===null)assert.equal(s.decision,null);
  else{
   assert.equal(s.decision.player,0);
   assert.equal(s.decision.task.op,'g34_Offer');
   pick(s,accept?true:null);
  }
  assert.equal(has(s,0,'mana',top),accept===true);
  assert.deepEqual(ids(s,1,'deck'),opponentDeck);
 }
});
test('two Trees retain the already triggered offers when the first raises the mana count',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'mana',[BODY]);
 const first=put(s,0,'battle',TREE),second=put(s,0,'battle',TREE);
 play(s,BODY);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===first.uid);
 pick(s,true);
 assert.equal(s.players[0].mana.length,2);
 assert.equal(s.decision.task.uid,second.uid);
 pick(s,true);
 assert.equal(s.players[0].mana.length,3);
});
test('Tree’s G Strike stops the selected enemy attacker after it enters hand',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'shields',[TREE,BODY]);
 const [attacker,target]=[BODY,BODY].map(id=>put(s,1,'battle',id));
 attack(s,attacker.uid);
 finishAttack(s);
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,target.uid);
 assert.ok(s.players[0].hand.some(x=>x.cardId===TREE));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));
});
