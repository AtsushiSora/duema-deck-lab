import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD575_DECK} from '../tools/fixtures/standard575.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-575.json',import.meta.url)));
const AQ='dm25rp3-074', DIS='dmrp17-036', CUTIE='dm34-041', TV='dmrp07-090';
const TONO='dmr15-031', MILK='dmr09-052', RAICHI='dmr03-033', MIA='dmr22-041';
const SELFIE='dmrp13-052', PENPEN='dmc41-002', HANA='dm25rp1-049';
const FIRE='dm01-097', WATER='dm01-083', NATURE='dm01-104', LIGHT='dm01-075';
const JOKER='dmrp07-079', JOKER_SEED='dmsd20-016', COMMAND='dmr13-103', DREAM='dm34-052';
const NEX='dm32-s08', ZERO='dmrp07-001', YAMATA='dmbd18-003', NINGYO='dmrp22-033', SAVER='dm13-027';

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
    assert.ok(n<1000,JSON.stringify(s.decision));
    const actions=e.getLegalActions(s);
    const pass=actions.find(a=>['allowLeave','noBlock'].includes(a.kind));
    e.step(s,pass??e.chooseAI(s));
  }
}
function move(s,p,x,to='grave'){
  s.phase='main';
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
  act(s,'toAttack');
}
function target(s,uid){
  act(s,'extended',a=>{
    const value=s.decision.choices[a.choice].value;
    return (value?.uid??value)===uid;
  });
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of manifest.cards){
  test(row.name+' uses the official full definition and printed summon payment',()=>{
    const detail=details.cards.find(x=>x.id===row.id);
    assert.deepEqual(detail.faces,row.faces);
    assert.deepEqual(standardCardSpec(detail,{phase:575}),row.spec);
    assert.throws(()=>standardCardSpec(detail,{phase:574}));
    assert.ok(row.verification.facesMatched);
    assert.equal(e.card(row.id).limit,4);
    assert.equal(e.card(row.id).manaValue,1);
    assert.equal(CARD_IMAGES[row.id],row.image);
    const s=field(),x=inst(row.id);
    s.players[0].hand.push(x);
    act(s,'play',a=>a.uid===x.uid);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(s.players[0].mana.filter(y=>y.tapped).length,row.faces[0].cost);
  });
}

for(const id of [AQ,RAICHI,MIA]){
  for(const use of [false,true]){
    test(e.card(id).name+' offers and can decline the mana replacement '+use,()=>{
      let s=field(1);
      const x=put(s,1,id),before=physical(s);
      move(s,1,x);
      assert.equal(s.decision?.player,1);
      assert.equal(s.decision?.mandatory,false);
      s=JSON.parse(JSON.stringify(s));
      act(s,use?'replaceYamata':'allowLeave');
      finish(s);
      const y=s.players[1][use?'mana':'grave'].find(y=>y.uid===x.uid);
      assert.ok(y);
      if(use)assert.equal(y.tapped,id!==AQ);
      assert.deepEqual(physical(s),before);
    });
  }
  test(e.card(id).name+' does not redirect a return to hand',()=>{
    const s=field(),x=put(s,0,id);
    move(s,0,x,'hand');
    assert.equal(s.decision,null);
    assert.ok(s.players[0].hand.includes(x));
  });
}

for(const [source,victim,to,tapped] of [
  [TV,JOKER,'mana',false],[TV,JOKER_SEED,'mana',false],
  [TONO,COMMAND,'mana',false],[TONO,TONO,'mana',false],
  [SELFIE,WATER,'mana',true],[SELFIE,NATURE,'mana',true],[SELFIE,SELFIE,'mana',true],
  [PENPEN,DREAM,'mana',false],[CUTIE,NEX,'hand',false],[MILK,ZERO,'hand',false],
  [HANA,HANA,'mana',true]
]){
  test(e.card(source).name+' replaces qualifying destruction to '+to+' '+victim,()=>{
    const s=field(),a=put(s,0,source),x=victim===source?a:put(s,0,victim),before=physical(s);
    move(s,0,x);
    finish(s);
    assert.ok(s.players[0][to].includes(x));
    assert.ok(!s.players[0].grave.includes(x));
    if(to==='mana')assert.equal(x.tapped,tapped);
    assert.deepEqual(physical(s),before);
  });
}
for(const source of [TV,TONO,SELFIE,PENPEN,CUTIE,MILK]){
  test(e.card(source).name+' excludes unrelated elements and the other player',()=>{
    const s=field(),own=put(s,0,FIRE),enemy=put(s,1,FIRE);
    put(s,0,source);
    move(s,0,own);
    finish(s);
    move(s,1,enemy);
    finish(s);
    assert.ok(s.players[0].grave.includes(own));
    assert.ok(s.players[1].grave.includes(enemy));
  });
}
test('Penpen boosts and redirects other Dreammates, while its own destruction uses the grave',()=>{
  const s=field(),a=put(s,0,PENPEN),x=put(s,0,DREAM);
  assert.equal(e.power(x,false,s),e.card(x).power+1000);
  assert.equal(e.power(a,false,s),e.card(a).power);
  move(s,0,a);
  finish(s);
  assert.ok(s.players[0].grave.includes(a));
  assert.equal(e.power(x,false,s),e.card(x).power);
});
test('Selfie grants Blocker to Water and Nature and keeps the mana move external to the target',()=>{
  const s=field(),source=put(s,0,SELFIE),water=put(s,0,WATER),nature=put(s,0,NATURE),fire=put(s,0,FIRE);
  assert.ok(e.effectiveCard(water,s).blocker);
  assert.ok(e.effectiveCard(nature,s).blocker);
  assert.ok(!e.effectiveCard(fire,s).blocker);
  water.g35Ignored=s.turn;
  move(s,0,water);
  finish(s);
  assert.ok(s.players[0].mana.includes(water));
  assert.equal(water.tapped,true);
  source.g35Ignored=s.turn;
  move(s,0,nature);
  finish(s);
  assert.ok(s.players[0].grave.includes(nature));
});
for(const power of [5999,6000,6001]){
  test('Dis Penter checks current allied power at '+power,()=>{
    const s=field(),x=put(s,0,DIS),y=put(s,0,FIRE);
    y.powerModifiers=[{amount:power-e.card(y).power,expires:'end',who:0}];
    move(s,0,x);
    finish(s);
    assert.ok(s.players[0][power>=6000?'hand':'grave'].includes(x));
  });
}
test('Selfie and an optional AQ replacement give two distinct choices and no bare destruction',()=>{
  for(const tapped of [false,true]){
    let s=field();
    put(s,0,SELFIE);
    const x=put(s,0,AQ);
    move(s,0,x);
    const choices=e.getLegalActions(s);
    assert.equal(choices.filter(a=>a.kind==='replaceYamata').length,2);
    assert.ok(!choices.some(a=>a.kind==='allowLeave'));
    s=JSON.parse(JSON.stringify(s));
    act(s,'replaceYamata',a=>!!a.tapped===tapped);
    finish(s);
    const mana=s.players[0].mana.find(y=>y.uid===x.uid);
    assert.ok(mana);
    assert.equal(mana.tapped,tapped);
  }
});
test('a competing mandatory mana replacement can be replaced by a separate Saver choice',()=>{
  const s=field(),x=put(s,0,WATER),source=put(s,0,SAVER);
  put(s,0,SELFIE);
  move(s,0,x);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='allowLeave'));
  act(s,'replaceUltra',a=>a.uid===source.uid);
  finish(s);
  assert.ok(s.players[0].battle.includes(x));
  assert.ok(s.players[0].grave.includes(source));
});
test('Ningyo does not apply another replacement to a redirected mana move',()=>{
  const s=field(),x=put(s,0,WATER);
  put(s,0,SELFIE);
  put(s,1,NINGYO);
  move(s,0,x);
  finish(s);
  assert.ok(s.players[0].mana.includes(x));
  assert.ok(!s.players[0].grave.includes(x));
});
test('Hanaguruma locks a different enemy when tapped to block',()=>{
  const s=field(1),blocker=put(s,0,HANA),a=put(s,1,FIRE),b=put(s,1,WATER);
  s.phase='attack';
  act(s,'attack',x=>x.uid===a.uid&&x.target==='player');
  act(s,'block',x=>x.uid===blocker.uid);
  target(s,b.uid);
  finish(s);
  assert.ok(s.extLimits.some(x=>x.g190Freeze&&x.uid===b.uid&&x.kind==='attack'));
  assert.ok(s.extLimits.some(x=>x.g190Freeze&&x.uid===b.uid&&x.kind==='block'));
});
test('verification deck contains all eleven new cards and forty legal cards',()=>{
  assert.equal(manifest.cards.length,11);
  assert.deepEqual(e.validateDeck(STANDARD575_DECK),[]);
  assert.equal(STANDARD575_DECK.cards.reduce((sum,c)=>sum+c.count,0),40);
  for(const {id} of manifest.cards)assert.ok(STANDARD575_DECK.cards.some(c=>c.id===id));
});
test('legal forty CPU game preserves all physical cards after saving and resuming',()=>{
  let s=e.createGame([STANDARD575_DECK,PRESETS[0]],{seed:57501,first:0});
  const before=physical(s);
  let saved=false;
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){
      s=JSON.parse(JSON.stringify(s));
      saved=true;
    }
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
