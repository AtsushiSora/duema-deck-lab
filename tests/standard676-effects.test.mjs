import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-676.json',import.meta.url)));

test('Phase 676 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:676}));
  assert.throws(()=>standardCardSpec(detail,{phase:675}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:676}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const FUWATTO='dmr08-023',SPARK='dmr09-077',TERRA='dmr11-032';
const NAT='dm01-108',ZERO='dmr08-022',BOUNCE='dm01-086',DRAW='dm06-085';
const HEAVY='dmex17-033',METAL='dmex17-059';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);

for(const muted of [false,true])test('Fuwatto protects colorless allies from opposing choices only, muted='+muted,()=>{
 const s=setup();
 s.active=1;
 give(s,0,'battle',[FUWATTO,ZERO,NAT]);
 give(s,1,'battle',[ZERO,NAT]);
 give(s,1,'hand',[BOUNCE]);
 const [source,ally,colored]=s.players[0].battle,[ownZero]=s.players[1].battle;
 if(muted)source.g35Ignored=s.turn;
 play(s,BOUNCE);
 const uids=e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(x=>x.uid));
 assert.ok(uids.includes(source.uid)&&uids.includes(colored.uid)&&uids.includes(ownZero.uid));
 assert.equal(uids.includes(ally.uid),muted);
});

test('Fuwatto does not prohibit attacks against its colorless ally or blocks by it',()=>{
 for(const target of ['player','creature']){
  const s=setup();
  s.active=1;
  give(s,0,'battle',[FUWATTO,ZERO]);
  give(s,1,'battle',[NAT]);
  const ally=s.players[0].battle[1],a=s.players[1].battle[0];
  if(target==='creature')ally.tapped=true;
  attack(s,a.uid,target==='creature'?ally.uid:'player');
  if(target==='creature')assert.equal(s.attack.target,ally.uid);
  else assert.ok(e.getLegalActions(s).some(q=>q.kind==='block'&&q.uid===ally.uid));
 }
});

test('Spark applies all names of the chosen linked God to both battle zones',()=>{
 let s=setup();
 give(s,0,'hand',[SPARK]);
 give(s,0,'battle',[HEAVY,METAL,NAT]);
 give(s,1,'battle',[HEAVY,METAL,NAT]);
 const [ownHeavy,ownMetal,ownOther]=s.players[0].battle,[god,enemyMetal,enemyOther]=s.players[1].battle;
 god.godLinks=[inst(METAL)];
 enemyMetal.g35Ignored=s.turn;
 play(s,SPARK);
 assert.deepEqual(values(s),[god.uid,enemyMetal.uid,enemyOther.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,god.uid);
 const tapped=s.players.flatMap(p=>p.battle.filter(x=>x.tapped).map(x=>x.uid));
 assert.deepEqual(tapped,[ownHeavy.uid,ownMetal.uid,god.uid,enemyMetal.uid]);
 assert.ok(!tapped.includes(ownOther.uid));
});

test('Spark can use S-Trigger to tap a matching creature on each side',()=>{
 const s=setup();
 give(s,0,'battle',[NAT,NAT,ZERO]);
 give(s,1,'battle',[NAT]);
 give(s,1,'shields',[SPARK]);
 const [attacker,other,unrelated]=s.players[0].battle,[own]=s.players[1].battle;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(values(s).includes(other.uid));
 pick(s,other.uid);
 assert.ok(attacker.tapped&&other.tapped&&own.tapped&&!unrelated.tapped);
 assert.equal(s.metrics[1].triggers,1);
});

for(const owner of [0,1])test('Terraform triggers separately per opposing draw, even with JSON restore, side '+owner,()=>{
 let s=setup();
 const opponent=1-owner;
 s.active=opponent;
 give(s,owner,'battle',[TERRA]);
 give(s,owner,'deck',[TERRA,NAT,ZERO]);
 give(s,opponent,'hand',[DRAW]);
 const old=s.players[owner].mana.length,target=s.players[owner].deck[0].uid;
 play(s,DRAW);
 assert.equal(s.players[opponent].hand.length,2);
 for(const n of [1,0]){
  if(s.decision.type==='effectOrder')e.step(s,e.getLegalActions(s)[0]);
  assert.equal(s.decision.player,owner);
  assert.equal(s.decision.task.op,'g34_Ramp');
  s=JSON.parse(JSON.stringify(s));
  pick(s,n);
 }
 assert.equal(s.decision,null);
 assert.equal(s.players[owner].mana.length,old+1);
 assert.equal(s.players[owner].mana.at(-1).uid,target);
 assert.equal(s.players[owner].mana.at(-1).tapped,true);
});

for(const mode of ['self draw','muted','hand add'])test('Terraform does not trigger on '+mode,()=>{
 const s=setup();
 give(s,0,'battle',[TERRA]);
 s.active=mode==='self draw'?0:1;
 const mana=s.players[0].mana.length;
 if(mode==='hand add'){
  give(s,1,'grave',[NAT]);
  s.extTasks=[{op:'g34_Select',p:1,source:NAT,origin:'grave',to:'hand',n:1}];
  act(s,'toAttack');
  pick(s,s.players[1].grave[0].uid);
 }else{
  if(mode==='muted')s.players[0].battle[0].g35Ignored=s.turn;
  give(s,s.active,'hand',[DRAW]);
  play(s,DRAW);
 }
 assert.equal(s.decision,null);
 assert.equal(s.players[0].mana.length,mana);
});
