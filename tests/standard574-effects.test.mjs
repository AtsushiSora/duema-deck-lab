import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD574_DECK} from '../tools/fixtures/standard574.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-574.json',import.meta.url)));
const BLACK='dmr20-030', POPPO='dm05-050', BRAIGER='dm13-027';
const LANDHEAD='dmr19-016', LEAN='dm15-021', UNKNOWN='dm25rp2-048';
const GEAR='dm28-033', ARMORED='dm05-s04', DRAGON='dm08-049', EVO='dm02-s02';
const FIRE='dm01-097', WATER='dm01-083', SEED='dmsd20-016', GENMU='dmrp15-km1';

function field(active=0){
  const state=setup();
  state.active=active;
  for(const p of [0,1])give(state,p,'deck',Array(32).fill(FIRE));
  return state;
}
function put(s,p,id){
  const x=inst(id);
  s.players[p].battle.push(x);
  return x;
}
function finish(s){
  for(let n=0;s.decision&&s.winner===null;n++){
    assert.ok(n<1000,JSON.stringify(s.decision));
    const pass=e.getLegalActions(s).find(a=>['allowLeave','noBlock'].includes(a.kind));
    e.step(s,pass??e.chooseAI(s));
  }
}
function move(s,p,x,to='grave',destroy=true){
  s.phase='main';
  s.extTasks=[destroy
    ?{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}
    :{op:'g34_Custom',name:'emrakulMove',p,source:FIRE,target:x.uid}];
  act(s,'toAttack');
}
function offered(s,x){
  return e.getLegalActions(s).some(a=>a.kind==='replaceUltra'&&a.uid===x.uid);
}
function save(s,x){
  act(s,'replaceUltra',a=>a.uid===x.uid);
}
function drawChoice(s,value){
  act(s,'extended',a=>s.decision.choices[a.choice].value===value);
}
function grantExtraTurn(s,p){
  s.phase='main';
  s.extTasks=[{op:'g5ExtraTurn',p,source:FIRE}];
  act(s,'toAttack');
}
function end(s){
  s.phase='attack';
  act(s,'endTurn');
  finish(s);
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const {id,name,spec,faces,image,verification} of manifest.cards){
  test(name+' matches the official card and can be summoned',()=>{
    const detail=details.cards.find(x=>x.id===id);
    assert.deepEqual(detail.faces,faces);
    assert.deepEqual(standardCardSpec(detail,{phase:574}),spec);
    assert.throws(()=>standardCardSpec(detail,{phase:573}));
    assert.ok(verification.facesMatched);
    assert.equal(CARD_IMAGES[id],image);
    assert.equal(e.card(id).manaValue,1);
    assert.equal(e.card(id).limit,4);
    const s=field(),x=inst(id);
    s.players[0].hand.push(x);
    act(s,'play',a=>a.uid===x.uid);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(s.players[0].mana.filter(c=>c.tapped).length,faces[0].cost);
  });
}

for(const [id,target,wrong] of [[POPPO,ARMORED,DRAGON],[LEAN,GEAR,SEED]]){
  for(const destroy of [false,true]){
    test(e.card(id).name+' protects the right card going to grave '+destroy,()=>{
      let s=field(1);
      const source=put(s,1,id),victim=put(s,1,target),before=physical(s);
      move(s,1,victim,'grave',destroy);
      assert.ok(offered(s,source));
      s=JSON.parse(JSON.stringify(s));
      save(s,source);
      finish(s);
      assert.ok(s.players[1].battle.some(x=>x.uid===victim.uid));
      assert.ok(s.players[1].grave.some(x=>x.uid===source.uid));
      assert.deepEqual(physical(s),before);
    });
  }
  for(const [candidate,to] of [[wrong,'grave'],[target,'hand'],[target,'mana']]){
    test(e.card(id).name+' filters the protected card and destination '+candidate+' '+to,()=>{
      const s=field(),source=put(s,0,id),victim=put(s,0,candidate);
      move(s,0,victim,to);
      assert.ok(!offered(s,source));
      finish(s);
      assert.ok(s.players[0][to].includes(victim));
      assert.ok(s.players[0].battle.includes(source));
    });
  }
}
test('Braiger saves another creature regardless of tribe but cannot save itself or a noncreature',()=>{
  for(const [id,expected] of [[null,false],[SEED,false],[UNKNOWN,true],[FIRE,true]]){
    const s=field(),source=put(s,0,BRAIGER),victim=id?put(s,0,id):source;
    move(s,0,victim);
    assert.equal(offered(s,source),expected);
    if(expected)save(s,source);
    finish(s);
    assert.equal(s.players[0].battle.includes(victim),expected);
  }
});
test('Braiger can save one ally in a simultaneous sweep that also destroys Braiger',()=>{
  const s=field(),a=put(s,0,FIRE),b=put(s,0,WATER),source=put(s,0,BRAIGER),before=physical(s);
  s.extTasks=[{op:'g34_Sweep',p:1,source:FIRE,filter:{creature:true}}];
  act(s,'toAttack');
  assert.equal(s.decision.uid,a.uid);
  save(s,source);
  assert.ok(!offered(s,source));
  finish(s);
  assert.ok(s.players[0].battle.includes(a));
  assert.ok(s.players[0].grave.includes(b));
  assert.ok(s.players[0].grave.includes(source));
  assert.deepEqual(physical(s),before);
});
test('Braiger charges tapped as a multicolor card',()=>{
  const s=field(),x=inst(BRAIGER);
  s.phase='charge';
  s.players[0].hand.push(x);
  act(s,'charge',a=>a.uid===x.uid);
  assert.ok(s.players[0].mana.includes(x));
  assert.equal(x.tapped,true);
});
for(const [mana,accept] of [[2,false],[3,false],[3,true],[4,true]]){
  test('Blackmini protects an evolution and checks Water mana on death '+mana+' '+accept,()=>{
    const s=field(),source=put(s,0,BLACK),victim=put(s,0,EVO),base=inst(WATER);
    victim.under=[base];
    give(s,0,'mana',Array(mana).fill(WATER));
    s.players[0].mana[0].tapped=true;
    const before=physical(s);
    move(s,0,victim,'hand');
    save(s,source);
    if(mana>=3)drawChoice(s,accept?true:null);
    else assert.equal(s.decision,null);
    finish(s);
    assert.ok(s.players[0].battle.includes(victim));
    assert.deepEqual(victim.under,[base]);
    assert.ok(s.players[0].grave.includes(source));
    assert.equal(s.players[0].hand.length,Number(accept));
    assert.deepEqual(physical(s),before);
  });
}
test('Blackmini cannot protect a non-evolution creature',()=>{
  const s=field(),x=put(s,0,BLACK),y=put(s,0,WATER);
  move(s,0,y,'hand');
  assert.ok(!offered(s,x));
  assert.ok(s.players[0].hand.includes(y));
});
test('Landhead protects a ??? element from movement and filters other races',()=>{
  for(const [id,expected] of [[UNKNOWN,true],[FIRE,false]]){
    const s=field(),source=put(s,0,LANDHEAD),victim=put(s,0,id);
    move(s,0,victim,'mana');
    assert.equal(offered(s,source),expected);
    if(expected)save(s,source);
    finish(s);
    assert.equal(s.players[0].battle.includes(victim),expected);
  }
});
for(const active of [0,1]){
  for(const owner of [0,1]){
    test('Landhead skips consecutive turns for either player while it is present '+active+' '+owner,()=>{
      let s=field(active);
      put(s,owner,LANDHEAD);
      grantExtraTurn(s,active);
      grantExtraTurn(s,active);
      assert.equal(s.extraTurns.length,2);
      const serial=s.turn,turns=s.players[active].turns;
      s=JSON.parse(JSON.stringify(s));
      end(s);
      assert.equal(s.active,1-active);
      assert.equal(s.turn,serial+1);
      assert.equal(s.players[active].turns,turns);
      assert.equal(s.extraTurns.length,0);
      assert.equal(s.log.filter(x=>x.type==='skipNextTurn'&&x.cardId===LANDHEAD).length,2);
    });
  }
}
for(const mode of ['removed','sealed','genmu']){
  test('a turn already earned can start after Landhead stops applying '+mode,()=>{
    const s=field(),x=put(s,0,LANDHEAD);
    grantExtraTurn(s,0);
    assert.equal(s.extraTurns.length,1);
    if(mode==='removed')move(s,0,x);
    if(mode==='sealed'){
      x.sealed=true;
      s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:x.uid});
    }
    if(mode==='genmu')put(s,1,GENMU);
    end(s);
    assert.equal(s.active,0);
    assert.equal(s.g31ExtraTurn,true);
    assert.ok(!s.log.some(l=>l.type==='skipNextTurn'&&l.cardId===LANDHEAD));
  });
}
test('Landhead allows an extra turn for the other player and skips only their consecutive follow-up',()=>{
  const s=field();
  put(s,0,LANDHEAD);
  grantExtraTurn(s,1);
  grantExtraTurn(s,1);
  end(s);
  assert.equal(s.active,1);
  assert.equal(s.g31ExtraTurn,true);
  assert.equal(s.extraTurns.length,1);
  end(s);
  assert.equal(s.active,0);
  assert.equal(s.extraTurns.length,0);
});
test('verification deck contains all five cards and forty legal cards',()=>{
  assert.equal(manifest.cards.length,5);
  assert.deepEqual(e.validateDeck(STANDARD574_DECK),[]);
  assert.equal(STANDARD574_DECK.cards.reduce((sum,c)=>sum+c.count,0),40);
  for(const {id} of manifest.cards)assert.ok(STANDARD574_DECK.cards.some(c=>c.id===id));
});
test('legal forty CPU game preserves all cards after saving and resuming',()=>{
  let s=e.createGame([STANDARD574_DECK,PRESETS[0]],{seed:57401,first:0});
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
