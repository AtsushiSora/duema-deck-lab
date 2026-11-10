import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-763.json',import.meta.url)));
const GOTT='dm24rp2-051',AMU='dmr21-008',POKER='dmr17-004';
const BODY='dm01-108',BLOCK='dm01-001',MULTI='dmx22b-041',FIVE='dmr23-072';
const TWIN='dm23rp2-045',COURTNEY='dm13-015';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const option=s.decision.choices[a.choice].value;
 return (option?.uid??option)===value;
});
const battleCard=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('three complete definitions keep their existing catalogue IDs and verified images',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:763}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:763}));
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Gott can choose zero, one or two distinct creatures including itself and preserve saved choices',()=>{
 for(const count of [0,1,2]){
  let s=setup();
  const rival=put(s,1,'battle',BODY,{tapped:true});
  cast(s,GOTT);
  const gott=s.players[0].battle.find(x=>x.cardId===GOTT);
  if(count){
   pick(s,gott.uid);
   assert.equal(gott.tapped,false);
   assert.ok(!s.decision.choices.some(o=>o.value?.uid===gott.uid));
   s=JSON.parse(JSON.stringify(s));
  }
  pick(s,count===2?rival.uid:null);
  if(count){
   assert.equal(s.decision.task.op,'g34_TapState235');
   pick(s,true);
  }
  if(count===2)pick(s,false);
  assert.equal(battleCard(s,0,gott.uid).tapped,count>0);
  assert.equal(battleCard(s,1,rival.uid).tapped,count<2);
  assert.equal(s.decision,null);
 }
});

test('a real Gott shield trigger may tap an attacking player’s other creature',()=>{
 const s=setup(),attacker=put(s,0,'battle',BODY),ally=put(s,0,'battle',BODY);
 give(s,1,'shields',[GOTT]);
 attack(s,attacker.uid);
 noBlock(s);
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 pick(s,ally.uid);
 pick(s,null);
 pick(s,true);
 assert.ok(ally.tapped&&s.players[1].battle.some(x=>x.cardId===GOTT));
});

test('Amu draws for other friendly multicolor entries and ignores own arrival, monocolor and rival entries',()=>{
 const s=setup();
 give(s,0,'deck',Array(10).fill(BODY));
 const own=s.players[0],initial=own.deck.length;
 cast(s,AMU);
 assert.equal(own.deck.length,initial);
 cast(s,BODY);
 assert.equal(own.deck.length,initial);
 cast(s,MULTI);
 drain(s);
 assert.equal(own.deck.length,initial-1);
 cast(s,AMU);
 assert.equal(own.deck.length,initial-2);
 s.active=1;
 cast(s,MULTI);
 drain(s);
 assert.equal(own.deck.length,initial-2);
});

test('Amu charges tapped and untaps only the multicolor mana card that actually entered',()=>{
 for(const mode of ['none','charge','ramp','granted','suppressed']){
  const s=setup();
  if(mode!=='none')put(s,0,'battle',AMU,mode==='suppressed'?{g35Ignored:s.turn}:{});
  if(mode==='granted')put(s,0,'battle',COURTNEY);
  const already=put(s,0,'mana',MULTI,{tapped:true});
  const rival=put(s,1,'mana',MULTI,{tapped:true});
  if(mode==='charge'||mode==='none'){
   s.phase='charge';
   put(s,0,'hand',AMU);
   act(s,'charge');
  }else{
   give(s,0,'deck',[mode==='granted'?BODY:MULTI,BODY,BODY]);
   s.extTasks=[{op:'g34_Ramp',p:0,source:AMU,n:1,tapped:true}];
   act(s,'toAttack');
  }
  drain(s);
  assert.equal(s.players[0].mana.at(-1).tapped,['none','suppressed'].includes(mode),mode);
  assert.ok(already.tapped&&rival.tapped);
 }
});

test('Poker reveals and bottoms the opposing top card, and untaps only after attacking if the cost is at least five',()=>{
 for(const id of [BODY,FIVE]){
  const s=setup(),poker=put(s,0,'battle',POKER);
  put(s,1,'battle',BLOCK);
  give(s,1,'deck',[id,BODY,BODY]);
  const original=s.players[1].deck.map(x=>x.uid);
  attack(s,poker.uid);
  assert.equal(s.decision.type,'block');
  assert.ok(poker.tapped);
  assert.deepEqual(s.players[1].deck.map(x=>x.uid),[original[1],original[2],original[0]]);
  assert.ok(s.log.some(row=>row.type==='reveal'&&JSON.stringify(row).includes(e.card(id).name)));
  noBlock(s);
  drain(s);
  assert.equal(poker.tapped,id!==FIVE);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Poker’s controller selects a twinpact cost after the reveal and can resume that choice',()=>{
 for(const high of [false,true]){
  let s=setup();
  const poker=put(s,0,'battle',POKER);
  give(s,1,'deck',[TWIN]);
  const top=s.players[1].deck[0];
  attack(s,poker.uid);
  assert.equal(s.decision.task.op,'g34_Poker763');
  assert.equal(s.decision.player,0);
  assert.deepEqual(s.decision.choices.map(o=>o.label),['コスト7','コスト3']);
  assert.equal(s.players[1].deck[0].uid,top.uid);
  assert.equal(s.winner,null);
  s=JSON.parse(JSON.stringify(s));
  pick(s,high);
  noBlock(s);
  drain(s);
  assert.equal(battleCard(s,0,poker.uid).tapped,!high);
 }
});
