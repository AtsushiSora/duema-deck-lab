import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-590.json',import.meta.url)));
const GEDO='dm24rp4-S09', GOLDEN='promoy16-063', CYCLOPS='dmrp06-024', TSUNEKIN='dmex09-012';
const ORION='dmrp12-017', DAKKARU='dmrp20-048', YADOCK='dmr20-066', GUIM='dmrp10-s03';
const LIGHT='dm01-075', FIRE='dm01-097', WATER='dm01-083', DARK='dm01-090';
const BIG='dm01-001', EVO='dmx17-008', CROSSFIRE='dm23ex1-011', TROIS='dm22rp1-055';
const BOUNCE='dm01-086', MILL='dmd04-005';

function field(){
  const s=setup();
  s.active=0;
  for(const p of [0,1])give(s,p,'deck',Array(22).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id,filter=a=>!a.alternative){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid&&filter(a));
  return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=o=>o.value?.uid??o.value;
function pick(s,v){act(s,'extended',a=>value(s.decision.choices[a.choice])===v);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}

for(const row of cards)test(row.name+' matches the official printing and complete definition',()=>{
  const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:590}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:589}));
  for(const [key,val] of Object.entries(row.spec))assert.deepEqual(c[key],val);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const id of [YADOCK,TSUNEKIN])test(id+' redirects even a free summon only when printed cost exceeds the mana card count',()=>{
  for(const count of [6,7]){
    const s=field();
    put(s,1,id);
    give(s,0,'mana',Array(count).fill(FIRE));
    give(s,0,'battle',Array(4).fill(FIRE));
    const x=play(s,CROSSFIRE,a=>a.freeSummon==='G・ゼロ');
    assert.equal(has(s,0,'mana',x),count===6);
    assert.equal(has(s,0,'battle',x),count===7);
  }
});

test('Yadock also replaces an expensive entry made during its controller’s turn',()=>{
  const s=field(),attacker=put(s,0,FIRE),entrant=put(s,1,LIGHT,'hand');
  put(s,0,YADOCK);
  give(s,1,'mana',[FIRE]);
  const trigger=inst(TROIS);
  s.players[1].shields=[trigger];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  pick(s,entrant.uid);
  assert.ok(has(s,1,'mana',entrant));
});

test('Tsunekin’s entry can return either player’s creature',()=>{
  for(const p of [0,1]){
    const s=field(),x=put(s,p,LIGHT);
    play(s,TSUNEKIN);pick(s,x.uid);
    assert.ok(has(s,p,'hand',x));
  }
});

test('Orion lets the affected player order all moved physical cards, including evolution materials',()=>{
  let s=field();
  give(s,1,'mana',[FIRE,FIRE]);
  const low=put(s,1,LIGHT),big=put(s,1,BIG),evo=put(s,1,EVO),base=inst(FIRE);
  evo.under=[base];
  const before=e.physicalCards(s).length;
  play(s,ORION);
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.op,'g78_BottomOrder');
  assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([big.uid,evo.uid,base.uid]));
  pick(s,base.uid);
  s=JSON.parse(JSON.stringify(s));
  pick(s,big.uid);
  assert.deepEqual(s.players[1].deck.slice(-3).map(x=>x.uid),[base.uid,big.uid,evo.uid]);
  assert.ok(has(s,1,'battle',low));
  assert.equal(e.physicalCards(s).length,before+1);
});

test('Cyclops can use JOE, clear the field and bottom itself to draw',()=>{
  const s=field();
  give(s,1,'mana',[FIRE,FIRE]);
  const x=put(s,1,BIG),source=play(s,CYCLOPS,a=>a.alternative==='joe');
  assert.ok(has(s,1,'deck',x));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
  end(s);
  assert.equal(s.players[0].deck.at(-1).uid,source.uid);
  assert.equal(s.players[0].hand.length,1);
});

test('Dakkaru and Yomiji can choose either effect as an evolution base',()=>{
  for(const mode of [0,1]){
    const s=field();
    give(s,1,'mana',[FIRE,FIRE]);
    const big=put(s,1,BIG),returnable=put(s,0,LIGHT,'grave'),base=put(s,0,DAKKARU);
    play(s,'dmr17-030');
    act(s,'evolve',a=>a.baseUid===base.uid);
    pick(s,mode);
    if(mode===1)pick(s,returnable.uid);
    assert.equal(has(s,1,'deck',big),mode===0);
    assert.equal(has(s,0,'hand',returnable),mode===1);
  }
});

for(const payment of [FIRE,DARK,WATER])test('Gedou S Back recognizes the shield color '+payment,()=>{
  const s=field(),attacker=put(s,0,FIRE),gedo=put(s,1,GEDO,'hand');
  give(s,1,'mana',[]);
  const shield=inst(payment);
  s.players[1].shields=[shield];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  if(payment===WATER){
    assert.notEqual(s.decision?.task?.op,'g13_SB');
    assert.ok(has(s,1,'hand',gedo)&&has(s,1,'hand',shield));
    return;
  }
  assert.equal(s.decision.task.op,'g13_SB');
  pick(s,gedo.uid);drain(s);
  assert.ok(has(s,1,'battle',gedo)&&has(s,1,'grave',shield));
  assert.equal(e.effectiveCard(gedo,s).blocker,true);
  assert.equal(e.effectiveCard(gedo,s).slayer,true);
  s.players[1].shields.push(inst(LIGHT));
  assert.equal(!!e.effectiveCard(gedo,s).blocker,false);
});

test('Golden Johnny restricts opponents to one spell each turn without restricting its controller',()=>{
  let s=field();
  put(s,1,GOLDEN);
  const creature=put(s,0,FIRE);
  play(s,BOUNCE);
  act(s,'effect',a=>a.targets.some(r=>r.uid===creature.uid));
  assert.equal(e.canCastSpell(s,0,e.card(BOUNCE),'hand'),false);
  assert.equal(e.canCastSpell(s,1,e.card(BOUNCE),'hand'),true);
  end(s);
  s=JSON.parse(JSON.stringify(s));
  assert.equal(e.canCastSpell(s,0,e.card(BOUNCE),'hand'),true);
});

test('Master Blaster uses Jokers in battle and mana and can put a noncreature card on the bottom',()=>{
  const s=field(),x=put(s,0,GOLDEN),target=put(s,1,'dmrp08-005');
  put(s,0,CYCLOPS);
  give(s,0,'mana',[CYCLOPS,CYCLOPS,FIRE]);
  attack(s,x.uid);
  pick(s,target.uid);
  passBlock(s);drain(s);
  assert.equal(s.players[1].deck.at(-1).uid,target.uid);
});

test('Guim moves the opponent grave on entry and can draw when tapped at end of turn',()=>{
  const s=field(),old=put(s,1,LIGHT,'grave'),x=play(s,GUIM);
  assert.equal(s.players[1].deck.at(-1).uid,old.uid);
  x.tapped=true;
  s.phase='attack';
  act(s,'endTurn');pick(s,true);drain(s);
  assert.equal(s.players[0].hand.length,1);
});

test('Guim milled from the deck returns its own grave to the bottom, keeping the library prefix',()=>{
  const s=field(),old=put(s,0,LIGHT,'grave');
  give(s,0,'deck',[GUIM,FIRE,...Array(20).fill(FIRE)]);
  const [guim,milled,...prefix]=s.players[0].deck;
  play(s,MILL);
  assert.equal(s.players[0].grave.length,0);
  assert.deepEqual(s.players[0].deck.slice(0,20).map(x=>x.uid),prefix.map(x=>x.uid));
  assert.deepEqual(s.players[0].deck.slice(20).map(x=>x.uid).sort(),[old,guim,milled].map(x=>x.uid).sort());
});
