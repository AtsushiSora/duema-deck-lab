import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const RADON='dmrp08-s10',OCCULT='dmr14-012',AVATAR='dm26rp2-036';
const BASIC='dm01-108',DARK='dm01-090',LIGHT='dm01-075',BIRD='dmex18-029',MASH='dmrp07-093';
const GATE='dm16-007',BLOCKER='dm01-076',WAVE='dmsd11-005',GR='dmrp09-m01';
function field(){
 const s=setup();
 s.turn=3;
 s.format='advance';
 for(const p of [0,1])s.players[p].gr=[];
 return s;
}
function add(s,p,zone,id,props={}){
 const x={...inst(id),cardOwner:p,...props};
 s.players[p][zone].push(x);
 return x;
}
const plays=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const contains=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('the official definition, image and limits use the original ID exactly once',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1359.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details),c=e.card(RADON);
 const [row]=m.cards;
 assert.equal(row.id,RADON);
 assert.deepEqual(row.faces,details.cards.find(x=>x.id===RADON).faces);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1359}),row.spec);
 assert.deepEqual(registry.resolveRows([{id:RADON,count:1}]),[{id:RADON,count:1}]);
 assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).length,1);
 assert.deepEqual([c.cost,c.power,c.breaker,c.manaValue,c.limit],[10,18000,4,1,4]);
 assert.equal(CARD_IMAGES[RADON],row.image);
});

test('Radon permits the 8-mana Occult summon and rejects the sacrifice alternative before payment (QA39626)',()=>{
 const s=field();
 add(s,1,'battle',RADON);
 const occult=add(s,0,'hand',OCCULT);
 const bodies=Array.from({length:3},()=>add(s,0,'battle',BASIC));
 give(s,0,'mana',Array(7).fill(DARK));
 assert.deepEqual(plays(s,occult),[]);
 s.players[0].mana.push(inst(DARK));
 assert.deepEqual(plays(s,occult).map(x=>[x.cost,x.alternative]),[[8,undefined]]);
 act(s,'play',a=>a.uid===occult.uid);
 assert.ok(contains(s,0,'battle',occult));
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.ok(bodies.every(x=>contains(s,0,'battle',x)));
 assert.equal(s.players[0].grave.length,0);
});

test('a summon reduced by destroying a creature remains legal when real mana is paid',()=>{
 const s=field();
 add(s,1,'battle',RADON);
 const avatar=add(s,0,'hand',AVATAR),sacrifice=add(s,0,'battle',BASIC);
 give(s,0,'mana',Array(3).fill(DARK));
 const cost=plays(s,avatar);
 assert.deepEqual(cost.map(x=>x.cost),[3]);
 act(s,'play',a=>a.uid===avatar.uid&&a.alternative);
 pick(s,sacrifice.uid);
 assert.ok(contains(s,0,'battle',avatar)&&contains(s,0,'grave',sacrifice));
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('mana from creatures cannot satisfy Radon but a real mana card can be mixed into payment',()=>{
 const s=field();
 add(s,1,'battle',RADON);
 const birds=[add(s,0,'battle',BIRD),add(s,0,'battle',BIRD)],x=add(s,0,'hand',BASIC);
 give(s,0,'mana',[]);
 assert.deepEqual(plays(s,x),[]);
 const mana=add(s,0,'mana',BASIC);
 e.step(s,plays(s,x)[0],{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 for(const bird of birds)act(s,'selectMana',a=>a.uid===bird.uid);
 assert.equal(e.manaSelectionStatus(s.decision).valid,false);
 act(s,'selectMana',a=>a.uid===birds[1].uid);
 act(s,'selectMana',a=>a.uid===mana.uid);
 assert.equal(e.manaSelectionStatus(s.decision).valid,true);
 act(s,'confirmMana');
 assert.ok(contains(s,0,'battle',x)&&mana.tapped&&birds[0].tapped&&!birds[1].tapped);
});

test('Radon allows spells while blocking non-summon entry from a paid spell and GR entry',()=>{
 const s=field();
 add(s,1,'battle',RADON);
 const blocker=add(s,0,'hand',BLOCKER);
 assert.ok(e.card(blocker).blocker);
 const wave=add(s,0,'battle',WAVE);
 const gr=add(s,0,'gr',GR);
 cast(s,GATE);
 drain(s);
 assert.equal(s.metrics[0].played[GATE],1);
 assert.ok(contains(s,0,'hand',blocker));
 assert.ok(contains(s,0,'gr',gr));
 assert.ok(!contains(s,0,'battle',gr)&&!contains(s,0,'battle',blocker));
 assert.ok(contains(s,0,'battle',wave));
 assert.ok(s.log.some(x=>x.type==='grPrevented'&&!x.cardId));
});

test('on Radon’s turn the opponent can still use a shield trigger to put a creature out',()=>{
 const s=field();
 const attacker=add(s,1,'battle',BASIC);
 add(s,1,'battle',RADON);
 const blocker=add(s,0,'hand',BLOCKER);
 give(s,0,'shields',[GATE]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===GATE);
 const choose=e.getLegalActions(s).find(a=>a.uid===blocker.uid);
 if(choose)e.step(s,choose);
 else if(s.decision?.type==='extended')pick(s,blocker.uid);
 drain(s);
 assert.ok(contains(s,0,'battle',blocker));
});

test('Radon can battle instead of a non-Giant and choose draw and ramp independently',()=>{
 for(const [draw,ramp] of [[0,0],[0,1],[1,0],[1,1]]){
  const s=field();
  const owner=s.players[0],radon=add(s,0,'battle',RADON),ally=add(s,0,'battle',BASIC);
  const target=add(s,1,'battle',BASIC,{tapped:true});
  const hand=owner.hand.length,mana=owner.mana.length,deck=owner.deck.length;
  attack(s,ally.uid,target.uid);
  if(s.decision.type==='block')act(s,'noBlock');
  assert.equal(s.decision.task.op,'g17_BattleReplace');
  pick(s,radon.uid);
  assert.ok(contains(s,1,'grave',target));
  assert.ok(contains(s,0,'battle',ally));
  pick(s,draw);
  pick(s,ramp);
  assert.equal(owner.hand.length,hand+draw);
  assert.equal(owner.mana.length,mana+ramp);
  assert.equal(owner.deck.length,deck-draw-ramp);
 }
});

test('declining the substitute leaves the original two creatures in the battle',()=>{
 const s=field();
 const radon=add(s,0,'battle',RADON),ally=add(s,0,'battle',BASIC);
 const target=add(s,1,'battle',MASH,{tapped:true});
 attack(s,ally.uid,target.uid);
 if(s.decision.type==='block')act(s,'noBlock');
 pick(s,null);
 drain(s);
 assert.ok(contains(s,0,'grave',ally)&&contains(s,1,'battle',target));
 assert.ok(contains(s,0,'battle',radon));
 assert.ok(!s.log.some(x=>x.type==='battleReplace'));
});

test('zero-cost summons are unavailable and a paid Kirifuda Dash can still resolve',()=>{
 const s=field();
 add(s,1,'battle',RADON);
 add(s,0,'battle','dmx11-080');
 const aroma=add(s,0,'hand','dm16-042'),dash=add(s,0,'hand','promoy19-014');
 assert.ok(plays(s,aroma).some(a=>!a.freeSummon)&&!plays(s,aroma).some(a=>a.freeSummon));
 const attacker=add(s,0,'battle',BASIC);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.phase,undefined);
 assert.ok(e.getLegalActions(s).some(a=>a.cardId===dash.cardId&&a.kind!=='play'));
 const action=e.getLegalActions(s).find(a=>a.cardId===dash.cardId);
 e.step(s,action);
 drain(s);
 assert.ok(contains(s,0,'battle',dash));
});
