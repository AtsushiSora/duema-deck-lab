import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-685.json',import.meta.url)));

test('Phase 685 validates one complete printed card and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:685}));
  assert.throws(()=>standardCardSpec(detail,{phase:684}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:685}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const MOAI='dmrp02-s10',GYM='dmr21-047',SPELL='dm06-110',CREATURE='dm01-108';
const FIONA='dmex12-s16',MULTI='dm22ex1-128';
const field=(p=0)=>Object.assign(setup(),{active:p});
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const playable=s=>e.getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.cardId);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Moailand keeps one catalogue ID across three verified reprints',()=>{
 const {printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-685.json',import.meta.url)));
 assert.equal(printAliases.length,3);
 for(const row of printAliases){
  assert.equal(row.canonicalId,MOAI);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:685}),cards[0].spec);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
 const card=e.card(MOAI);
 assert.deepEqual([card.type,card.cost,card.power,card.manaValue],['creature',10,18000,1]);
});

for(const p of [0,1])test('Moailand stops only opposing spell and field execution while its ability is active '+p,()=>{
 const s=field(p);
 give(s,p,'hand',[MOAI,GYM,SPELL,CREATURE]);
 give(s,1-p,'hand',[GYM,SPELL,CREATURE]);
 for(const id of [MOAI,GYM,SPELL,CREATURE])assert.ok(playable(s).includes(id),id);
 play(s,MOAI);
 const source=s.players[p].battle[0];
 assert.equal(s.players[p].mana.filter(x=>x.tapped).length,10);
 for(const id of [GYM,SPELL,CREATURE])assert.ok(playable(s).includes(id),id);
 s.active=1-p;
 assert.deepEqual(playable(s),[CREATURE]);
 for(const id of [GYM,SPELL])assert.equal(e.canCastSpell(s,1-p,e.card(id),'grave'),false);
 source.g35Ignored=s.turn;
 for(const id of [GYM,SPELL,CREATURE])assert.ok(playable(s).includes(id),id);
});

test('Fiona can put a field directly into battle under an opposing Moailand',()=>{
 const s=field(1);
 give(s,0,'battle',[MOAI]);
 give(s,1,'hand',[FIONA,GYM]);
 const gym=inst(GYM);
 s.players[1].mana.push(gym);
 assert.equal(e.canEnterCreature(s,1,e.card(GYM),{origin:'mana',execution:true}),false);
 assert.equal(e.canEnterCreature(s,1,e.card(GYM),{origin:'mana',execution:false}),true);
 assert.ok(!playable(s).includes(GYM));
 play(s,FIONA);
 assert.ok(values(s).includes(gym.uid));
 pick(s,gym.uid);
 assert.ok(s.players[1].battle.some(x=>x.uid===gym.uid));
 assert.ok(!s.players[1].mana.some(x=>x.uid===gym.uid));
});

test('Moailand breaks four selected shields without permitting a spell S Trigger',()=>{
 const s=field();
 give(s,0,'battle',[MOAI]);
 give(s,1,'shields',[CREATURE,SPELL,CREATURE,CREATURE,CREATURE]);
 const before=s.players[1].shields.map(x=>x.uid);
 attack(s);
 noBlock(s);
 assert.equal(s.decision.count,4);
 act(s,'breakShields',a=>a.shields.join()===before.slice(1).join());
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),before.slice(0,1));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),before.slice(1).sort());
 assert.equal(s.decision,null);
 assert.equal(s.metrics[1].triggers,0);
});

for(const count of [0,1,3])test('Moailand can move '+count+' selected shield groups to the owner mana after a battle victory',()=>{
 let s=field();
 give(s,0,'battle',[MOAI]);
 give(s,1,'battle',[CREATURE]);
 give(s,1,'shields',[CREATURE,SPELL,CREATURE,CREATURE,CREATURE]);
 const enemy=s.players[1].battle[0];
 enemy.tapped=true;
 const before=s.players[1].shields.map(x=>x.uid),extra=inst(MULTI);
 s.players[1].shields[1].shieldStack=[extra];
 const mana=s.players[1].mana.length,all=physical(s);
 attack(s,s.players[0].battle[0].uid,enemy.uid);
 noBlock(s);
 assert.equal(s.decision.task.op,'g34_ShieldMove685');
 assert.ok(s.players[1].grave.some(x=>x.uid===enemy.uid));
 const selected=[before[1],before[4],before[2]].slice(0,count);
 for(let i=0;i<count;i++){
  pick(s,selected[i]);
  if(i===0&&count===3){
   assert.deepEqual(s.players[1].shields.map(x=>x.uid),before);
   s=JSON.parse(JSON.stringify(s));
   assert.ok(!values(s).includes(selected[0]));
  }
 }
 if(count<3)pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),before.filter(uid=>!selected.includes(uid)));
 assert.equal(s.players[1].mana.length,mana+count+Number(count>0));
 for(const uid of selected)assert.ok(s.players[1].mana.some(x=>x.uid===uid&&!x.tapped));
 if(count>0)assert.ok(s.players[1].mana.some(x=>x.uid===extra.uid&&x.tapped));
 assert.equal(s.players[1].hand.length,0);
 assert.deepEqual(physical(s),all);
});

test('Moailand resolves with fewer than three shield groups and cannot use the effect on a tie',()=>{
 for(const [enemyId,shieldCount] of [[CREATURE,0],[CREATURE,1],[MOAI,1]]){
  const s=field();
  give(s,0,'battle',[MOAI]);
  give(s,1,'battle',[enemyId]);
  give(s,1,'shields',Array(shieldCount).fill(CREATURE));
  const enemy=s.players[1].battle[0];
  enemy.tapped=true;
  attack(s,s.players[0].battle[0].uid,enemy.uid);
  noBlock(s);
  if(shieldCount&&enemyId===CREATURE){
   assert.equal(s.decision.task.op,'g34_ShieldMove685');
   pick(s,s.players[1].shields[0].uid);
  }
  assert.equal(s.decision,null);
  assert.equal(s.players[1].shields.length,enemyId===MOAI?1:0);
 }
});
