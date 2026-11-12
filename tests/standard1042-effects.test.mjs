import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const VINE='dm23rp1-074',MIST='dm23bd7-007',PRIN='dm23ex1-027',VINYL='dm23rp1-039';
const N='dm01-108',L='dm01-075',D='dm01-090';
const ONIKAMASU='dmrp01-041',QQX='dmrp07-m01',NINGYO='dmrp22-033',TYPHOON='dm11-043',DEMON='dm01-027';
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const restore=s=>decodeBattleData(encodeBattleData(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('four official cards and two reprints preserve the original IDs, images, stats and limits',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
 const m=read('tools/support-phase-1042.json'),registry=createCatalogue(snapshot,data.cards,details),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[VINE,MIST,PRIN,VINYL]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm24bd5-017',PRIN],['dm26ex1-045',PRIN]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(registry.get(row.id).id,id);
  assert.ok(registry.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1042}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Vine Trap chooses a cost-five noncreature or allied creature and moves all layers to their owners',()=>{
 let s=setup();
 const spell=add(s,0,'hand',VINE),own=add(s,0,'battle',N),under=inst(L);
 const seed=add(s,1,'battle','dmsd20-008',{cardOwner:0,under:[under]});
 const untargetable=add(s,1,'battle',ONIKAMASU),expensive=add(s,1,'battle','dm24ex2-019');
 const hidden=add(s,1,'battle',D,{faceDown:true}),all=physical(s);
 cast(s,spell);
 assert.deepEqual(new Set(choices(s)),new Set([own.uid,seed.uid]));
 const other=restore(s);
 choose(other,own.uid);
 assert.ok(find(other,0,'mana',own));
 s=restore(s);
 choose(s,seed.uid);
 assert.ok(find(s,0,'mana',seed)&&find(s,1,'mana',under));
 assert.ok(find(s,1,'battle',untargetable)&&find(s,1,'battle',expensive)&&find(s,1,'battle',hidden));
 assert.deepEqual(physical(s),all);
});

test('Vine Trap casts as a free shield trigger and uses the ordinary mana-entry replacement',()=>{
 const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',N);
 add(s,0,'battle',NINGYO);
 give(s,0,'mana',[]);
 give(s,0,'shields',[VINE,N]);
 const spell=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 choose(s,attacker.uid);
 drain(s);
 assert.ok(find(s,1,'grave',attacker)&&!find(s,1,'mana',attacker)&&find(s,0,'grave',spell));
 assert.equal(s.players[0].mana.length,0);
});

for(const amount of [2,3,4])test('Memory Dissipation ramps exactly one tapped card only when the opponent has more mana '+amount,()=>{
 const s=setup(),spell=add(s,0,'hand',MIST);
 give(s,0,'mana',[L,L,L]);
 give(s,1,'mana',Array(amount).fill(N));
 s.players[1].mana[0].faceDown=true;
 s.players[1].mana[1].tapped=true;
 const top=s.players[0].deck[0],all=physical(s);
 cast(s,spell);
 const mana=find(s,0,'mana',top);
 assert.equal(!!mana,amount===4);
 if(mana)assert.ok(mana.tapped&&!mana.faceDown);
 else assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.deepEqual(physical(s),all);
});

test('Memory Dissipation triggers for free and respects prevention of a deck-to-mana move',()=>{
 for(const prevented of [false,true]){
  const s=Object.assign(setup(),{active:1}),attacker=add(s,1,'battle',N);
  give(s,0,'mana',[]);
  give(s,0,'shields',[MIST,N]);
  if(prevented)add(s,1,'battle','dm22ex1-086');
  const spell=s.players[0].shields[0],top=s.players[0].deck[0];
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===spell.uid);
  drain(s);
  assert.equal(!!find(s,0,'mana',top),!prevented);
  if(prevented)assert.ok(find(s,0,'grave',top));
  else assert.ok(find(s,0,'mana',top).tapped);
  assert.ok(find(s,0,'grave',spell));
 }
});

test('Prin can decline before looking, then use either private destination at the opponent start',()=>{
 let s=setup();
 const prin=add(s,0,'hand',PRIN),top=s.players[0].deck[0],all=physical(s);
 cast(s,prin);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(!s.decision.choices.some(c=>c.cardId));
 choose(s,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.decision.player,0);
 choose(s,true);
 assert.deepEqual(choices(s),['hand','mana']);
 assert.ok(s.decision.choices.every(c=>c.cardId===top.cardId));
 const hand=restore(s);
 choose(hand,'hand');
 assert.ok(find(hand,0,'hand',top));
 s=restore(s);
 choose(s,'mana');
 assert.ok(find(s,0,'mana',top).tapped);
 assert.deepEqual(physical(s),all);
});

test('Prin also offers the private look on entry, but never at its controller’s next start',()=>{
 const s=setup(),top=s.players[0].deck[0];
 cast(s,add(s,0,'hand',PRIN));
 choose(s,true);
 choose(s,'hand');
 assert.ok(find(s,0,'hand',top));
 end(s);
 choose(s,null);
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
});

test('Prin cannot move the top card under the official QQX ruling',()=>{
 const s=setup(),top=s.players[0].deck[0];
 add(s,1,'battle',QQX);
 cast(s,add(s,0,'hand',PRIN));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
});

test('Vinyl mills four on entry and a milled second Vinyl can optionally mill another card',()=>{
 let s=setup();
 give(s,0,'deck',[N,VINYL,L,D,N,N,N,N,N]);
 const [a,second,b,c,next]=s.players[0].deck,vinyl=add(s,0,'hand',VINYL),all=physical(s);
 cast(s,vinyl);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[a,second,b,c].map(x=>x.uid));
 assert.equal(s.decision.task.op,'g34_Mill');
 const declined=restore(s);
 choose(declined,null);
 assert.equal(declined.players[0].deck[0].uid,next.uid);
 s=restore(s);
 choose(s,true);
 assert.ok(find(s,0,'grave',next)&&find(s,0,'battle',vinyl));
 assert.deepEqual(physical(s),all);
});

test('Vinyl can trigger when discarded, provided a friendly Abyss remains',()=>{
 for(const ally of [false,true]){
  const s=setup(),vinyl=add(s,0,'hand',VINYL);
  if(ally)add(s,0,'battle',VINYL);
  cast(s,add(s,0,'hand',TYPHOON));
  drainUntilDiscard(s,vinyl.uid);
  assert.ok(find(s,0,'grave',vinyl));
  if(ally){assert.equal(s.decision.task.op,'g34_Mill');choose(s,null);}
  assert.equal(s.decision,null);
 }
});

function drainUntilDiscard(s,uid){
 for(let i=0;i<4&&s.decision?.task?.op!=='discard';i++)e.step(s,e.chooseAI(s));
 assert.equal(s.decision.task.op,'discard');
 choose(s,uid);
}

test('Vinyl leaving the battle zone requires another Abyss at resolution',()=>{
 for(const ally of [false,true]){
  const s=Object.assign(setup(),{active:1}),vinyl=add(s,0,'battle',VINYL);
  if(ally)add(s,0,'battle',VINYL);
  cast(s,add(s,1,'hand',DEMON));
  act(s,'effect',a=>a.targets[0].uid===vinyl.uid);
  assert.ok(find(s,0,'grave',vinyl));
  if(ally){assert.equal(s.decision.task.op,'g34_Mill');choose(s,true);}
  assert.equal(s.decision,null);
 }
});
