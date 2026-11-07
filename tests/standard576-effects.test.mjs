import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD576_DECK} from '../tools/fixtures/standard576.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-576.json',import.meta.url)));
const PROPHECY='dm23rp3-001', ELLIE='dm23rp4-045', NEXT='dm24bd3-009', BOX='dmx17-037';
const COBRA='dm23-055', ASEBI='dm24bd5-001', COLORFUL='dm24-103';
const FIRE='dm01-097', WATER='dm01-083', NATURE='dm01-104', GEAR='dm14-110', SEED='dmsd20-016';
const DRAGON='dm05-s04', ZERO='dmrp07-001', LIGHT7='dm01-s01';
const UNKNOWN='dmr07-012', ZENITH='dm23ex1-021', ABYSS='promoy22-spd1002', REX='dm26rp3-068';
const SNOW='dm35-054', SNOW4='dm38-054', SNOW6='dmr18-068';

function field(){
  const s=setup();
  s.active=0;
  for(const p of [0,1])give(s,p,'deck',Array(32).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function finish(s){
  for(let n=0;s.decision&&s.winner===null;n++){
    assert.ok(n<100,JSON.stringify(s.decision));
    const pass=e.getLegalActions(s).find(a=>['allowLeave','noBlock'].includes(a.kind));
    e.step(s,pass??e.chooseAI(s));
  }
}
function play(s,id){
  const x=put(s,0,id,'hand');
  act(s,'play',a=>a.uid===x.uid&&!a.alternative);
  return x;
}
function pick(s,value){
  act(s,'extended',a=>{
    const option=s.decision.choices[a.choice].value;
    return (option?.uid??option)===value;
  });
}
function move(s,p,x,to='grave'){
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
  act(s,'toAttack');
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

for(const row of manifest.cards){
  test(row.name+' preserves the complete official definition and printing',()=>{
    const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
    assert.deepEqual(detail.faces,row.faces);
    assert.deepEqual(standardCardSpec(detail,{phase:576}),row.spec);
    assert.throws(()=>standardCardSpec(detail,{phase:575}));
    for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
    assert.ok(row.verification.facesMatched);
    assert.equal(c.limit,4);
    assert.equal(c.manaValue,1);
    assert.equal(CARD_IMAGES[row.id],row.image);
  });
}

for(const [source,victim] of [[ELLIE,GEAR],[BOX,BOX],[BOX,DRAGON],[COBRA,COBRA],
  [COBRA,'dm22-037'],[ASEBI,FIRE],[COLORFUL,WATER],[COLORFUL,FIRE]]){
  test(e.card(source).name+' allows moving a qualifying destruction to mana '+victim,()=>{
    let s=field();
    const aura=put(s,0,source),x=victim===source?aura:put(s,0,victim),before=physical(s);
    move(s,0,x);
    assert.equal(s.decision?.player,0);
    assert.equal(s.decision?.mandatory,false);
    s=JSON.parse(JSON.stringify(s));
    act(s,'replaceYamata');
    finish(s);
    assert.ok(has(s,0,'mana',x));
    assert.equal(s.players[0].mana.find(y=>y.uid===x.uid).tapped,false);
    assert.deepEqual(physical(s),before);
  });
}
for(const [source,victim,owner,to] of [[BOX,FIRE,0,'grave'],[COBRA,FIRE,0,'grave'],
  [ASEBI,SEED,0,'grave'],[COLORFUL,NATURE,0,'grave'],[COLORFUL,ZERO,0,'grave'],
  [ELLIE,GEAR,1,'grave'],[ELLIE,FIRE,0,'hand']]){
  test(e.card(source).name+' excludes an ineligible move '+victim+' '+owner+' '+to,()=>{
    const s=field();
    put(s,0,source);
    const x=put(s,owner,victim),before=physical(s);
    move(s,owner,x,to);
    assert.equal(s.decision,null);
    assert.ok(has(s,owner,to,x));
    assert.deepEqual(physical(s),before);
  });
}

test('Ellie sweeps both sides and offers independent choices for allied elements',()=>{
  const s=field(),a=put(s,0,SEED),b=put(s,0,FIRE),c=put(s,1,GEAR),d=put(s,1,DRAGON);
  const x=play(s,ELLIE),before=physical(s);
  act(s,'replaceYamata');
  act(s,'allowLeave');
  finish(s);
  assert.ok(has(s,0,'mana',a)&&has(s,0,'grave',b)&&has(s,1,'grave',c));
  assert.ok(has(s,0,'battle',x)&&has(s,1,'battle',d));
  assert.deepEqual(physical(s),before);
});

test('Prophecy sweeps only colored elements up to seven on both sides',()=>{
  const s=field(),a=put(s,0,LIGHT7),b=put(s,1,GEAR),c=put(s,1,ZERO),d=put(s,0,DRAGON);
  const x=play(s,PROPHECY),before=physical(s);
  finish(s);
  assert.ok(has(s,0,'grave',a)&&has(s,1,'grave',b));
  assert.ok(has(s,1,'battle',c)&&has(s,0,'battle',d)&&has(s,0,'battle',x));
  assert.deepEqual(physical(s),before);
});

for(const [id,baseId] of [[PROPHECY,UNKNOWN],[PROPHECY,ZENITH],[ELLIE,ABYSS]]){
  test(e.card(id).name+' exchanges with a qualifying attacker '+baseId,()=>{
    const s=field(),base=put(s,0,baseId),x=put(s,0,id,'hand'),before=physical(s);
    attack(s,base.uid);
    assert.equal(s.decision?.task?.op,'revDeclare');
    pick(s,true);
    if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===x.uid);
    assert.equal(s.decision?.task?.op,'revResolve');
    pick(s,base.uid);
    finish(s);
    assert.ok(has(s,0,'battle',x)&&has(s,0,'hand',base));
    assert.equal(s.players[0].mana.filter(y=>y.tapped).length,0);
    assert.deepEqual(physical(s),before);
  });
}

for(const invade of [false,true]){
  test('Momoking NEXT clears only opposing elements up to two '+invade,()=>{
    const s=field(),base=put(s,0,invade?REX:FIRE),a=put(s,1,WATER),b=put(s,1,GEAR),c=put(s,1,NATURE);
    let x;
    if(invade){
      x=put(s,0,NEXT,'hand');
      attack(s,base.uid);
      assert.equal(s.decision?.task?.op,'g23_Declare');
      pick(s,true);
      if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===x.uid);
      assert.equal(s.decision?.task?.op,'g23_Invade');
      pick(s,true);
    }else{
      x=play(s,NEXT);
      if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid===base.uid);
    }
    finish(s);
    assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',c));
    assert.ok(has(s,0,'battle',x)&&x.under.some(y=>y.uid===base.uid));
  });
}

for(const mode of ['entry','attack','decline']){
  test('Asebi draws then may deploy one eligible face-up Snow Fairy '+mode,()=>{
    const s=field(),a=put(s,0,SNOW,'hand'),b=put(s,0,SNOW4,'mana'),hidden=put(s,0,SNOW,'mana');
    hidden.faceDown=true;
    put(s,0,SNOW6,'mana');
    const top=s.players[0].deck[0];
    if(mode==='attack')attack(s,put(s,0,ASEBI).uid);
    else{
      play(s,ASEBI);
      if(s.decision?.type==='evolution')act(s,'evolve',a=>!a.baseUid);
    }
    assert.equal(s.players[0].deck.length,31);
    assert.ok(has(s,0,'hand',top));
    assert.deepEqual(s.decision.choices.filter(c=>c.value).map(c=>c.value.uid).sort(),[a.uid,b.uid].sort());
    pick(s,mode==='decline'?null:mode==='attack'?b.uid:a.uid);
    finish(s);
    assert.equal(has(s,0,'battle',a),mode==='entry');
    assert.equal(has(s,0,'battle',b),mode==='attack');
    assert.ok(has(s,0,'mana',hidden));
  });
}

test('legal forty CPU match finishes after JSON continuation conserving physical cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD576_DECK),[]);
  let s=e.createGame([STANDARD576_DECK,PRESETS[0]],{seed:57601,first:0}),saved=false;
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
