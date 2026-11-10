import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const LESSON='dmr09-110',THUNDER='dmr08-003',PTA='dmr08-012';
const SMALL='dm01-108',WATER='dm01-083',MECHA='dmr08-042',MULTIRACE='dmr23-060';
const RS='dmr08-004',EATER='dmr05-037',TWIN='dm22ex1-030';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=rows=>rows.map(x=>x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function evolve(s,id,base){
 const creature=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===creature.uid&&(!a.baseUid||a.baseUid===base.uid));
 if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid===base.uid);
 return s.players[s.active].battle.find(x=>x.uid===creature.uid);
}

test('Phase 880 preserves the official original IDs, complete definitions, images and limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-880.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(row=>row.id),[LESSON,THUNDER,PTA]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const detail=details.cards.find(x=>x.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:880}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:879}));
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:880}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.civilizations,card.race,card.manaValue,card.limit],
   [row.id===LESSON?'spell':'creature',face.cost,Number(face.powerText),face.civilizations,face.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(card.name)).map(x=>x.id),[row.id]);
 }
});

test('Guard Lesson chooses an ally, draws after granting Guardman and expires at the caster’s next start',()=>{
 const s=field(),protector=add(s,0,'battle',PTA),ally=add(s,0,'battle',SMALL,{tapped:true});
 const enemy=add(s,1,'battle',SMALL),top=s.players[0].deck[0];
 cast(s,LESSON);
 assert.deepEqual(choices(s),[protector.uid,ally.uid]);
 assert.ok(!has(s,0,'hand',top));
 pick(s,protector);
 assert.ok(has(s,0,'hand',top));
 assert.ok(e.effectiveCard(protector,s).guardman);
 end(s);
 attack(s,enemy.uid,ally.uid);
 act(s,'guardman',a=>a.uid===protector.uid);
 drain(s);
 assert.ok(protector.tapped);
 assert.ok(has(s,1,'grave',enemy));
 assert.ok(has(s,0,'battle',ally));
 end(s);
 assert.ok(!e.effectiveCard(protector,s).guardman);
});

test('Guard Lesson still draws without a friendly creature and Guardman cannot stop an attack on the player',()=>{
 const empty=field(),top=empty.players[0].deck[0];
 add(empty,1,'battle',SMALL);
 cast(empty,LESSON);
 assert.ok(has(empty,0,'hand',top));
 assert.equal(empty.decision,null);

 const s=field(),protector=add(s,0,'battle',PTA),enemy=add(s,1,'battle',SMALL);
 cast(s,LESSON);
 pick(s,protector);
 end(s);
 attack(s,enemy.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='guardman'||a.kind==='block'));
});

test('Thunderbird evolves on a Great Mecha King and can immediately attack to discard and topdeck a blocker',()=>{
 const s=field(),base=add(s,0,'battle',MECHA,{entered:s.turn}),wrong=add(s,0,'battle',WATER);
 const card=add(s,0,'hand',THUNDER);
 act(s,'play',a=>a.uid===card.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(ids(card.under),[base.uid]);
 const discard=add(s,0,'hand',MULTIRACE),other=add(s,0,'hand',WATER);
 const target=add(s,1,'battle','dm01-084'),oldTop=s.players[1].deck[0];
 attack(s,card.uid);
 assert.deepEqual(choices(s),[discard.uid,null]);
 pick(s,discard);
 assert.ok(has(s,0,'grave',discard));
 assert.ok(has(s,0,'hand',other));
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target);
 assert.deepEqual(ids(s.players[1].deck.slice(0,2)),[target.uid,oldTop.uid]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(s.players[1].shields.length,3);
});

test('Thunderbird permits declining the discard or discarding without an opposing creature',()=>{
 for(const accept of [false,true]){
  const s=field(),attacker=add(s,0,'battle',THUNDER,{under:[inst(MECHA)]});
  const discard=add(s,0,'hand',MECHA);
  attack(s,attacker.uid);
  pick(s,accept?discard:null);
  assert.ok(has(s,0,accept?'grave':'hand',discard));
  assert.equal(s.decision.type,'block');
 }
});

test('Thunderbird lets the deck owner choose the order of the returned evolution stack (QA 37347)',()=>{
 let s=field();
 s.active=1;
 const base=add(s,1,'battle',MECHA);
 const target=evolve(s,THUNDER,base);
 target.tapped=true;
 s.active=0;
 const attacker=add(s,0,'battle',THUNDER,{under:[inst(MECHA)]}),discard=add(s,0,'hand',MECHA);
 const oldTop=s.players[1].deck[0];
 attack(s,attacker.uid,target.uid);
 pick(s,discard);
 pick(s,target);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g78_TopOrder');
 s=JSON.parse(JSON.stringify(s));
 pick(s,base);
 assert.deepEqual(ids(s.players[1].deck.slice(0,3)),[base.uid,target.uid,oldTop.uid]);
 assert.equal(s.attack,null);
 assert.equal(s.decision,null);
});

test('Aqua PTA draws zero to the number of wins only after all judges (QA 36792 and 36793)',()=>{
 for(const amount of [0,1,2]){
  let s=field();
  const attacker=add(s,0,'battle',PTA);
  give(s,0,'deck',[PTA,PTA,SMALL,WATER]);
  give(s,1,'deck',[SMALL,SMALL,RS]);
  const before=ids(s.players[0].deck);
  attack(s,attacker.uid);
  assert.equal(s.judge.wins,1);
  assert.match(e.getLegalActions(s).find(a=>a.kind==='stopJudge').label,/ドロー/);
  act(s,'judgeAgain');
  assert.equal(s.judge.wins,2);
  assert.equal(s.players[0].hand.length,0);
  s=JSON.parse(JSON.stringify(s));
  act(s,'judgeAgain');
  assert.equal(s.log.filter(x=>x.type==='judgeResult').length,3);
  assert.deepEqual(choices(s),[0,1,2]);
  assert.deepEqual(ids(s.players[0].deck),[before[3],...before.slice(0,3)]);
  pick(s,amount);
  assert.deepEqual(ids(s.players[0].hand),[before[3],before[0]].slice(0,amount));
  assert.equal(s.players[1].shields.length,5);
  assert.equal(s.decision.type,'block');
 }
});

test('Aqua PTA judges on a creature attack and loses the draw opportunity on a first-round loss',()=>{
 const s=field(),attacker=add(s,0,'battle',PTA),target=add(s,1,'battle',SMALL,{tapped:true});
 give(s,1,'deck',[RS,SMALL]);
 attack(s,attacker.uid,target.uid);
 assert.equal(s.log.filter(x=>x.type==='judgeResult').length,1);
 assert.equal(s.decision.type,'block');
 assert.equal(s.players[0].hand.length,0);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',target));
});

test('Aqua PTA shares Twinpact cost selection and Omori replacement, then may stop and draw',()=>{
 const s=field(),attacker=add(s,0,'battle',PTA);
 add(s,0,'battle',EATER);
 give(s,0,'deck',[TWIN,WATER,SMALL]);
 const [revealed,top]=s.players[0].deck;
 attack(s,attacker.uid);
 act(s,'judgeCost',a=>a.cost===7);
 act(s,'judgeMana878',a=>a.toMana);
 assert.ok(has(s,0,'mana',revealed));
 act(s,'stopJudge');
 assert.deepEqual(choices(s),[0,1]);
 pick(s,1);
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.decision.type,'block');
});

test('Aqua PTA can decline the last card or lose by drawing it before blocking',()=>{
 for(const amount of [0,1]){
  const s=field(),attacker=add(s,0,'battle',PTA);
  give(s,0,'deck',[PTA]);
  attack(s,attacker.uid);
  assert.equal(e.chooseAI(s).kind,'stopJudge');
  act(s,'stopJudge');
  pick(s,amount);
  assert.equal(s.winner,amount?1:null);
  assert.equal(s.players[0].deck.length,1-amount);
  assert.equal(s.players[1].shields.length,5);
  if(!amount)assert.equal(s.decision.type,'block');
 }
});
