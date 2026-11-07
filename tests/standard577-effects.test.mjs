import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD577_DECK} from '../tools/fixtures/standard577.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-577.json',import.meta.url)));
const LUNA='dm10-047', PIERRE='dm10-052', BEL='dm12-038', PERFECT='dmx08-006';
const PREMIUM='dmx19-s09', LILY='dmr10-009', MEDAROS='dmr15-008', COFFIN='dmrp16-031';
const LIGHT='dm01-075', FIRE='dm01-097', DRAGON='dm05-s04';
const AURA='dm23rp4-045';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(32).fill(FIRE));
  return s;
}
function put(s,p,id){
  const x=inst(id);
  s.players[p].battle.push(x);
  return x;
}
function finish(s){
  for(let n=0;s.decision&&s.winner===null;n++){
    assert.ok(n<100,JSON.stringify(s.decision));
    const pass=e.getLegalActions(s).find(a=>a.kind==='noBlock');
    e.step(s,pass??e.chooseAI(s));
  }
}
function move(s,p,x,to='grave'){
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
  act(s,'toAttack');
}
function pick(s,uid){
  act(s,'extended',a=>{
    const value=s.decision.choices[a.choice].value;
    return (value?.uid??value)===uid;
  });
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

for(const row of manifest.cards){
  test(row.name+' uses the officially verified full card definition',()=>{
    const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
    assert.deepEqual(detail.faces,row.faces);
    assert.deepEqual(standardCardSpec(detail,{phase:577}),row.spec);
    assert.throws(()=>standardCardSpec(detail,{phase:576}));
    for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
    assert.ok(row.verification.facesMatched);
    assert.equal(c.limit,4);
    assert.equal(c.manaValue,1);
    assert.equal(CARD_IMAGES[row.id],row.image);
  });
}

for(const id of [PERFECT,LILY,COFFIN]){
  for(const to of ['grave','hand','mana'])test(id+' stays in the battle zone instead of moving to '+to,()=>{
    const s=field(),x=put(s,0,id),before=physical(s);
    move(s,0,x,to);
    assert.equal(s.decision,null);
    assert.ok(has(s,0,'battle',x));
    assert.deepEqual(physical(s),before);
  });
  test(id+' is destroyed by zero power',()=>{
    const s=field(),x=put(s,0,id);
    x.powerModifiers=[{amount:-e.card(id).power}];
    act(s,'toAttack');
    assert.ok(has(s,0,'grave',x));
  });
}

for(const active of [0,1])test('Premium Madonna only stays during the opposing turn '+active,()=>{
  const s=field(active),x=put(s,0,PREMIUM);
  move(s,0,x,'hand');
  assert.ok(has(s,0,active===0?'hand':'battle',x));
});

for(const n of [4,5])test('Medaros requires five face-up light mana for staying '+n,()=>{
  const s=field(),x=put(s,0,MEDAROS);
  give(s,0,'mana',Array(n+1).fill(LIGHT));
  s.players[0].mana.at(-1).faceDown=true;
  s.players[0].mana[0].tapped=true;
  move(s,0,x,'mana');
  assert.ok(has(s,0,n===5?'battle':'mana',x));
});

for(const n of [2,3])test('Medaros can tap on attack with three light cards in mana '+n,()=>{
  const s=field(),x=put(s,0,MEDAROS),target=put(s,1,FIRE);
  give(s,0,'mana',Array(n).fill(LIGHT));
  attack(s,x.uid);
  if(n===3)pick(s,target.uid);
  assert.equal(target.tapped,n===3);
  finish(s);
});

for(const action of ['replaceStay577','replaceYamata'])test('stay and mana replacement can be chosen separately '+action,()=>{
  let s=field();
  put(s,0,AURA);
  const x=put(s,0,COFFIN),before=physical(s);
  move(s,0,x);
  assert.equal(s.decision.mandatory,true);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='allowLeave'));
  s=JSON.parse(JSON.stringify(s));
  act(s,action);
  assert.ok(has(s,0,action==='replaceStay577'?'battle':'mana',x));
  assert.deepEqual(physical(s),before);
});

test('positive power survives losing a battle, while ability suppression disables staying',()=>{
  for(const ignored of [false,true]){
    const s=field(),a=put(s,0,DRAGON),x=put(s,1,PERFECT);
    if(ignored){x.g35Ignored=s.turn;x.tapped=true;}
    attack(s,a.uid,ignored?x.uid:'player');
    act(s,ignored?'noBlock':'block');
    finish(s);
    assert.ok(has(s,1,ignored?'grave':'battle',x));
  }
});

for(const id of [LUNA,PIERRE,BEL])test(id+' must block when eligible and may pass when tapped',()=>{
  for(const tapped of [false,true]){
    const s=field(),a=put(s,0,DRAGON),x=put(s,1,id);
    x.tapped=tapped;
    attack(s,a.uid);
    const legal=e.getLegalActions(s);
    assert.equal(legal.some(q=>q.kind==='noBlock'),tapped);
    assert.equal(legal.some(q=>q.kind==='block'&&q.uid===x.uid),!tapped);
    if(!tapped){
      act(s,'block');
      finish(s);
      assert.ok(has(s,1,'grave',x));
      assert.equal(has(s,0,'grave',a),id===PIERRE);
    }
  }
});

for(const last of [LUNA,PIERRE])test('all required blockers tap but only the last blocks and battles '+last,()=>{
  let s=field();
  const a=put(s,0,DRAGON),x=put(s,1,LUNA),y=put(s,1,PIERRE),before=physical(s);
  const final=last===LUNA?x:y,first=final===x?y:x;
  attack(s,a.uid);
  assert.deepEqual(e.getLegalActions(s).map(q=>q.kind),['defendMany']);
  act(s,'defendMany');
  pick(s,first.uid);
  assert.ok(!s.decision.choices.some(c=>c.value===null));
  s=JSON.parse(JSON.stringify(s));
  pick(s,final.uid);
  pick(s,null);
  finish(s);
  assert.ok(has(s,1,'grave',final));
  assert.ok(s.players[1].battle.find(z=>z.uid===first.uid)?.tapped);
  assert.equal(has(s,0,'grave',a),last===PIERRE);
  assert.deepEqual(s.log.filter(x=>x.type==='block').map(x=>x.cardId),[last]);
  assert.deepEqual(physical(s),before);
});

test('optional blockers can join a forced defense and resolve last',()=>{
  const s=field(),a=put(s,0,DRAGON),x=put(s,1,LUNA),y=put(s,1,PERFECT);
  attack(s,a.uid);
  assert.ok(!e.getLegalActions(s).some(q=>q.kind==='block'&&q.uid===y.uid));
  act(s,'defendMany');
  pick(s,x.uid);
  pick(s,y.uid);
  pick(s,null);
  finish(s);
  assert.ok(x.tapped&&y.tapped);
  assert.ok(has(s,1,'battle',x)&&has(s,1,'battle',y));
  assert.deepEqual(s.log.filter(x=>x.type==='block').map(x=>x.cardId),[PERFECT]);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD577_DECK),[]);
  let s=e.createGame([STANDARD577_DECK,PRESETS[0]],{seed:57701,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
