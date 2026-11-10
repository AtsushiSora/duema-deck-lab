import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-825.json',import.meta.url)));
const KAGE='dm34-016',MARIBEL='dm34-011',CRACK='dm33-019',KINMON='dm32-066';
const NAT='dm01-108',DARK='dm01-090',EVO='dm02-033',NEO='dmrp02-080',STRATO='dm22rp2-048';
const BIRD='dm36-063',CYBER='dm01-081',ORIGIN='dm32-076',DRAW='dm34-042',MULTI='dmr02-054';

function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

test('Phase 825 uses canonical deck IDs and resolves both verified reprints',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(cards.length,4);
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:825}));
  assert.throws(()=>standardCardSpec(detail,{phase:824}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(unknown,{phase:825}));
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.equal(printAliases.length,2);
 for(const print of printAliases){
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:825}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(regulationVerification.limits[print.id],4);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

for(const [id,baseId,wrongId] of [[KAGE,BIRD,CYBER],[MARIBEL,CYBER,BIRD]])test('paid evolution offers the printed tribe or an Origin: '+id,()=>{
 const s=setup();
 const base=put(s,0,'battle',baseId),origin=put(s,0,'battle',ORIGIN);
 put(s,0,'battle',wrongId);
 put(s,1,'battle',ORIGIN);
 cast(s,id);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([base.uid,origin.uid]));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(x=>x.cardId===id).under[0].uid,base.uid);
});

test('Kagekiri untaps immediately, completes the current attack, and can attack again',()=>{
 let s=setup();
 const source=put(s,0,'battle',KAGE),below=inst(DRAW);
 below.faceDown=true;
 source.under=[below];
 const handSize=s.players[0].hand.length;
 attack(s,source.uid);
 assert.equal(s.decision.task.op,'g31_Meteor');
 assert.ok(!s.decision.choices.find(c=>c.value===below.uid).cardId);
 s=JSON.parse(JSON.stringify(s));
 pick(s,below.uid);
 const live=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.equal(live.tapped,false);
 assert.ok(has(s,0,'grave',below));
 assert.equal(s.attack.attacker,source.uid);
 assert.equal(s.decision.task.op,'optionalDrawOne');
 pick(s,true);
 assert.equal(s.players[0].hand.length,handSize+1);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 attack(s,source.uid);
 assert.equal(s.decision.type,'block');
 assert.equal(live.tapped,true);
});

for(const mode of ['decline','untap lock','stratobag'])test('Kagekiri handles the optional payment and its destination: '+mode,()=>{
 let s=setup();
 const source=put(s,0,'battle',KAGE),below=inst(DRAW);
 source.under=[below];
 if(mode==='untap lock')source.tapLocks=[1];
 const replacement=mode==='stratobag'?put(s,1,'battle',STRATO):null;
 attack(s,source.uid);
 pick(s,mode==='decline'?null:below.uid);
 if(replacement){
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.op,'g31_Meteor825Dest');
  s=JSON.parse(JSON.stringify(s));
  pick(s,replacement.uid);
  assert.ok(has(s,0,'mana',below));
  assert.ok(!has(s,0,'grave',below));
 }else if(mode==='untap lock'){
  assert.ok(has(s,0,'grave',below));
  pick(s,null);
 }else assert.deepEqual(source.under.map(x=>x.uid),[below.uid]);
 assert.equal(s.players[0].battle.find(x=>x.uid===source.uid).tapped,mode!=='stratobag');
 assert.equal(s.decision.type,'block');
});

for(const owner of [0,1])test('Maribel pays with one attached card, then returns one target on either side: '+owner,()=>{
 const s=setup();
 const source=put(s,0,'battle',MARIBEL),below=inst(CYBER),unused=inst(ORIGIN);
 source.under=[below,unused];
 const a=put(s,0,'battle',NAT),b=put(s,1,'battle',NAT);
 attack(s,source.uid);
 pick(s,below.uid);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(new Set(values(s)),new Set([source.uid,a.uid,b.uid]));
 const target=owner===0?a:b;
 pick(s,target.uid);
 assert.ok(has(s,owner,'hand',target)&&has(s,0,'grave',below));
 assert.ok(!has(s,0,'grave',unused)&&source.under.includes(unused));
 assert.equal(s.decision.type,'block');
});

test('Maribel can return itself after Stratobag redirects the chosen under-card',()=>{
 const s=setup(),source=put(s,0,'battle',MARIBEL),below=inst(DRAW),replacement=put(s,1,'battle',STRATO);
 source.under=[below];
 attack(s,source.uid);
 pick(s,below.uid);
 assert.equal(s.decision.player,1);
 pick(s,replacement.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,source.uid);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.player,1);
 act(s,'g47Decline');
 assert.ok(has(s,0,'mana',below)&&has(s,0,'hand',source));
 assert.ok(!has(s,0,'grave',below));
 assert.equal(s.attack,null);
});

test('Crack mana-evolves from a face-up Nature creature and ramps only on its own end if behind',()=>{
 const s=setup();
 const [base,,hidden]=give(s,0,'mana',[NAT,DARK,NAT,'dm32-070','dm32-070','dm32-070','dm32-070']);
 hidden.faceDown=true;
 const [first,second]=give(s,0,'deck',[NAT,MULTI,NAT,NAT]);
 cast(s,CRACK);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(s.players[0].battle[0].under.some(x=>x.uid===base.uid));
 assert.ok(!has(s,0,'mana',base));
 s.active=1;
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(!has(s,0,'mana',first));
 const next=s.players[0].deck.slice(0,2);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(next.every(x=>has(s,0,'mana',x)));
 assert.ok(!has(s,0,'mana',first));
 assert.ok(has(s,0,'mana',second));
 assert.equal(s.players[0].mana.find(x=>x.uid===second.uid).tapped,true);
});

for(const difference of [-1,0,1])test('Crack checks the mana count at each end-effect resolution: '+difference,()=>{
 let s=setup();
 const copies=[put(s,0,'battle',CRACK),put(s,0,'battle',CRACK)];
 for(const x of copies)x.under=[inst(NAT)];
 give(s,0,'mana',Array(5).fill(NAT));
 give(s,1,'mana',Array(5+difference).fill(NAT));
 const first=s.players[0].deck.slice(0,2);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 drain(s);
 assert.equal(s.players[0].mana.length,5+(difference>0?2:0));
 assert.equal(first.every(x=>has(s,0,'mana',x)),difference>0);
});

test('Kinmon limits the battle mode to an opposing non-evolution creature with cost at most four',()=>{
 const s=setup();
 const source=put(s,0,'battle',KINMON),friendly=put(s,0,'battle',NAT);
 const low=put(s,1,'battle','dm01-048'),high=put(s,1,'battle','dmex17-059');
 const unevolved=put(s,1,'battle',NEO);
 const evo=put(s,1,'battle',EVO),neo=put(s,1,'battle',NEO);
 evo.under=[inst(DARK)];
 neo.under=[inst(NAT)];
 attack(s,source.uid);
 assert.equal(s.decision.task.op,'g34_Choose');
 pick(s,0);
 assert.deepEqual(new Set(values(s)),new Set([low.uid,unevolved.uid]));
 pick(s,low.uid);
 assert.ok(has(s,1,'mana',low));
 assert.ok([high,evo,neo].every(x=>has(s,1,'battle',x))&&has(s,0,'battle',friendly));
 assert.equal(s.decision.type,'block');
});

for(const mode of ['hidden hand','empty hand','ignored'])test('Kinmon keeps the hand mode blind and does not interrupt a normal attack: '+mode,()=>{
 let s=setup();
 const source=put(s,0,'battle',KINMON);
 const hand=mode==='hidden hand'?give(s,1,'hand',[NAT,MULTI]):[];
 if(mode==='ignored')put(s,1,'battle',GEN);
 attack(s,source.uid);
 if(mode!=='ignored'){
  pick(s,1);
  if(hand.length){
   assert.equal(s.decision.task.op,'g34_BlindHandMana675');
   assert.deepEqual(values(s),[0,1]);
   assert.ok(s.decision.choices.every(c=>!c.cardId&&/^裏向きの手札 /.test(c.label)));
   assert.ok(e.getLegalActions(s).every(a=>!a.cardId||a.cardId===KINMON));
   s=JSON.parse(JSON.stringify(s));
   pick(s,1);
   assert.ok(has(s,1,'hand',hand[0])&&has(s,1,'mana',hand[1]));
   assert.equal(s.players[1].mana.at(-1).tapped,true);
  }
 }
 assert.equal(s.decision.type,'block');
});
