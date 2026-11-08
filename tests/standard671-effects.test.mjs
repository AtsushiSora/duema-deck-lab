import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-671.json',import.meta.url)));

test('Phase 671 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:671}));
  assert.throws(()=>standardCardSpec(detail,{phase:670}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:671}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
   deck.cards[0].count--;
   deck.cards.at(-1).count++;
   assert.deepEqual(e.validateDeck(deck),[row.name+'は1枚までです']);
  }
 }
});

const MAG='dmr09-038',TOPAZ='dmr09-013',PREP='dmr12-051',NAT='dm01-108';
const INIT='dm01-042',ZERO='dmrp07-001',RAINBOW='dmrp13-050',HAND='dm01-027',DRAW='dm06-085';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

for(const colored of [true,false])test('Magnolia has the opponent select an eligible colored creature for mana: '+colored,()=>{
 let s=setup();
 give(s,0,'hand',[MAG]);
 give(s,1,'battle',colored?[ZERO,RAINBOW,NAT]:[ZERO]);
 const [zero,rainbow,plain]=s.players[1].battle;
 play(s,MAG);
 if(colored){
  assert.equal(s.decision?.player,1);
  assert.deepEqual(values(s),[rainbow.uid,plain.uid]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,rainbow.uid);
  assert.ok(has(s.players[1].mana,rainbow.uid));
  assert.ok(has(s.players[1].battle,plain.uid));
 }
 assert.equal(s.decision,null);
 assert.ok(has(s.players[1].battle,zero.uid));
});

test('Topaz evolves only on Initiates and blocks both seats’ own-turn spells costing at least four',()=>{
 const s=setup();
 give(s,0,'hand',[TOPAZ]);
 give(s,0,'battle',[INIT,NAT]);
 const [init]=s.players[0].battle;
 play(s,TOPAZ);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[init.uid]);
 act(s,'evolve',a=>a.baseUid===init.uid);
 const topaz=s.players[0].battle.find(x=>x.cardId===TOPAZ);
 assert.equal(topaz.under[0].uid,init.uid);
 assert.equal(e.effectiveCard(topaz,s).breaker,2);
 for(const p of [0,1]){
  s.active=p;
  give(s,p,'hand',[PREP,DRAW,NAT]);
  const available=e.getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.cardId);
  assert.ok(!available.includes(PREP));
  assert.ok(available.includes(DRAW)&&available.includes(NAT));
  assert.equal(e.canCastSpell(s,1-p,e.card(HAND),'hand'),true);
 }
 topaz.g35Ignored=s.turn;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===PREP));
});

test('Topaz does not prevent an expensive Shield Trigger outside the caster’s turn',()=>{
 const s=setup();
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[TOPAZ]);
 give(s,1,'shields',[HAND]);
 const [attacker]=s.players[0].battle;
 attack(s);
 noBlock(s);
 act(s,'useTrigger',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===attacker.uid);
 assert.ok(has(s.players[0].grave,attacker.uid));
});

test('Duel Preparation selects up to two on either side and only restricts attacks against a player',()=>{
 let s=setup();
 give(s,0,'hand',[PREP]);
 give(s,0,'battle',[NAT,NAT]);
 give(s,1,'battle',[NAT,NAT]);
 const [own,other]=s.players[0].battle,[enemy,target]=s.players[1].battle;
 target.tapped=true;
 play(s,PREP);
 pick(s,own.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,enemy.uid);
 const [ownAfter,otherAfter]=s.players[0].battle,[enemyAfter]=s.players[1].battle;
 ownAfter.g35Ignored=s.turn;
 assert.equal(e.power(ownAfter,false,s),4000);
 assert.equal(e.power(enemyAfter,false,s),4000);
 assert.equal(e.power(otherAfter,false,s),2000);
 s.phase='attack';
 const actions=e.getLegalActions(s).filter(a=>a.kind==='attack');
 assert.ok(actions.some(a=>a.uid===own.uid&&a.target===target.uid));
 assert.ok(!actions.some(a=>a.uid===own.uid&&a.target==='player'));
 assert.ok(actions.some(a=>a.uid===other.uid&&a.target==='player'));
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(enemyAfter,false,s),2000);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target==='player'));
});

test('Duel Preparation may choose no creature and works as an off-turn Shield Trigger',()=>{
 for(const accept of [false,true]){
  const s=setup();
  give(s,0,'battle',[NAT]);
  give(s,1,'shields',[PREP]);
  const [attacker]=s.players[0].battle;
  attack(s);
  noBlock(s);
  act(s,'useTrigger',a=>a.cardId===PREP);
  pick(s,accept?attacker.uid:null);
  if(s.decision?.type==='extended')pick(s,null);
  assert.equal(s.players[1].shields.length,0);
  assert.equal(e.power(attacker,false,s),accept?4000:2000);
 }
});

test('Red Zone ignores the opponent’s player-attack restriction but still respects its own',()=>{
 const red='dm25rp3-DM1';
 for(const own of [true,false]){
  const s=setup();
  give(s,0,'battle',[NAT,red]);
  const [first,source]=s.players[0].battle;
  if(own){
   give(s,0,'hand',[PREP]);
   play(s,PREP);
  }else{
   give(s,1,'shields',[PREP]);
   attack(s,first.uid);
   noBlock(s);
   act(s,'useTrigger',a=>a.cardId===PREP);
  }
  pick(s,source.uid);
  if(s.decision?.type==='extended')pick(s,null);
  s.phase='attack';
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid&&a.target==='player'),!own);
 }
});
