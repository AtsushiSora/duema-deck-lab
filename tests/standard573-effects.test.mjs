import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD573_DECK} from '../tools/fixtures/standard573.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-573.json',import.meta.url)));
const MOGI='dm23rp4-035', ABYSS='dm23rp4-039', WADA='dm26ex2-054';
const CHICK='dm23rp2-043', BOL='dmex16-004', SEINAN='dm31-034';
const FIRE='dm01-097', WATER='dm01-083', LIGHT='dm01-075', DARK='dm01-090', NATURE='dm01-104';
const DRAGON='dm08-049', GIANT='dm36-103', SEED='dm22ex2-050';
const byColor={'光':LIGHT,'水':WATER,'闇':DARK,'火':FIRE,'自然':NATURE};
const tribes={[MOGI]:'dmrp11-074',[ABYSS]:'dm24rp3-020',[WADA]:'dm25-035'};
const sources={...tribes,[CHICK]:DRAGON,[BOL]:DRAGON,[SEINAN]:GIANT};
const doubleMatches={
  'dm25rp4-057':'dm27-055','dm25rp4-065':'dmr04-048','dm25rp4-071':'dmr04-052',
  'dm25rp4-061':'dmrp15-086','dm25rp4-075':'dmrp13-050'
};

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
    const actions=e.getLegalActions(s);
    const pass=actions.find(a=>['allowLeave','noBlock'].includes(a.kind));
    e.step(s,pass??e.chooseAI(s));
  }
}
function play(s,p,id,face=0){
  s.phase='main';
  const x=inst(id);
  s.players[p].hand.push(x);
  act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);
  return x;
}
function move(s,p,x,to){
  s.phase='main';
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
  act(s,'toAttack');
}
function pick(s,value){
  act(s,'extended',a=>{
    const choice=s.decision.choices[a.choice].value;
    return (choice?.uid??choice)===value;
  });
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;

for(const {id,name,spec,faces,image,verification} of manifest.cards){
  test(name+' matches the official definition and is playable for printed mana',()=>{
    const detail=details.cards.find(x=>x.id===id);
    assert.deepEqual(detail.faces,faces);
    assert.deepEqual(standardCardSpec(detail,{phase:573}),spec);
    assert.throws(()=>standardCardSpec(detail,{phase:572}));
    assert.ok(verification.facesMatched);
    assert.equal(e.card(id).manaValue,1);
    assert.equal(e.card(id).limit,4);
    assert.equal(CARD_IMAGES[id],image);
    const s=field();
    const x=play(s,0,id);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(tapped(s,0),faces[0].cost);
    assert.equal(s.players[0].hand.length,0);
  });
  test(name+' saves a matching element and spends exactly one source',()=>{
    let s=field(1);
    const source=put(s,1,id),target=put(s,1,sources[id]??SEED),before=physical(s);
    move(s,1,target,spec.g571Saver.ultra?'hand':'grave');
    s=JSON.parse(JSON.stringify(s));
    act(s,'replaceUltra',a=>a.uid===source.uid);
    finish(s);
    assert.ok(s.players[1].battle.some(x=>x.uid===target.uid));
    assert.ok(s.players[1].grave.some(x=>x.uid===source.uid));
    assert.deepEqual(physical(s),before);
  });
}

for(const [id,matching] of Object.entries(tribes)){
  for(const mode of ['own','enemy','sealed','absent']){
    test(e.card(id).name+' checks for another allied tribe on entry '+mode,()=>{
      const s=field();
      if(mode!=='absent'){
        const x=put(s,mode==='enemy'?1:0,matching);
        if(mode==='sealed'){
          x.sealed=true;
          s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:x.uid});
        }
      }
      play(s,0,id);
      finish(s);
      assert.equal(s.players[0].hand.length,mode==='own'?1:0);
    });
  }
  test(e.card(id).name+' reduces an allied matching summon but not an unrelated summon',()=>{
    const s=field();
    put(s,0,id);
    assert.equal(e.summonCost(s,0,e.card(FIRE)),2);
    assert.equal(e.summonCost(s,1,e.card(matching)),e.card(matching).cost);
    const x=play(s,0,matching);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(tapped(s,0),e.card(matching).cost-1);
  });
}

for(const row of manifest.cards.filter(r=>r.spec.g468UseReduction?.colorsAny)){
  const {id,name}=row;
  const colors=row.spec.g468UseReduction.colorsAny;
  test(name+' reduces either civilization once even when both match',()=>{
    const s=field();
    put(s,0,id);
    for(const [color,target] of Object.entries(byColor)){
      const c=e.card(target);
      assert.equal(e.summonCost(s,0,c),c.cost-Number(colors.includes(color)));
    }
    const matching=e.card(doubleMatches[id]);
    assert.equal(e.summonCost(s,0,matching),matching.cost-1);
    const x=play(s,0,byColor[colors[0]]);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(tapped(s,0),e.card(x).cost-1);
  });
  test(name+' cannot save an unrelated single-color creature',()=>{
    const s=field(),source=put(s,0,id),target=put(s,0,FIRE);
    move(s,0,target,'grave');
    assert.ok(!e.getLegalActions(s).some(a=>a.kind==='replaceUltra'&&a.uid===source.uid));
    assert.ok(s.players[0].grave.includes(target));
    assert.ok(s.players[0].battle.includes(source));
  });
}

test('color reduction applies to a paid spell and to a tamaseed with both matching colors',()=>{
  for(const [id,type] of [['dm01-086','spell'],['dm25ex2-083','seed']]){
    const s=field();
    put(s,0,'dm25rp4-057');
    const x=play(s,0,id);
    finish(s);
    assert.equal(tapped(s,0),e.card(id).cost-1);
    assert.ok(s.players[0][type==='spell'?'grave':'battle'].includes(x));
  }
});
for(const [id,target] of [[MOGI,'dm23rp1-013'],[ABYSS,'dm23ex1-044']]){
  test(e.card(id).name+' discounts the played tribe spell face of a Twinpact',()=>{
    const s=field();
    put(s,0,id);
    const expected=e.card(target).spellFace.cost-1;
    const x=play(s,0,target,1);
    finish(s);
    assert.equal(tapped(s,0),expected);
    assert.ok(s.players[0].grave.includes(x));
  });
}
test('Twinpact cost reduction uses the chosen face’s color only',()=>{
  const s=field(),id='dm23ex1-017';
  put(s,0,'dm25rp4-057');
  const x=inst(id);
  s.players[0].hand.push(x);
  const actions=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
  const creature=e.card(id);
  const plain=e.civilizations(creature).some(c=>['水','自然'].includes(c));
  assert.equal(actions.find(a=>!a.face).cost,creature.cost-Number(plain));
  assert.equal(actions.find(a=>a.face===1).cost,creature.spellFace.cost-1);
});
test('multiple matching cost reductions stack down to one',()=>{
  const s=field();
  for(let i=0;i<4;i++)put(s,0,'dm25rp4-057');
  play(s,0,'dm01-086');
  finish(s);
  assert.equal(tapped(s,0),1);
});
for(const mode of ['sealed','muted','enemy','noReduction']){
  test('color reducer is unavailable '+mode,()=>{
    const s=field(),x=put(s,mode==='enemy'?1:0,'dm25rp4-057');
    if(mode==='muted')x.g35Ignored=s.turn;
    if(mode==='sealed'){
      x.sealed=true;
      s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:x.uid});
    }
    if(mode==='noReduction')put(s,1,'dmrp22-027');
    assert.equal(e.summonCost(s,0,e.card(WATER)),2);
  });
}
for(const [id,target] of [[BOL,DRAGON],[SEINAN,GIANT]]){
  for(const amount of [0,1,2]){
    test(e.card(id).name+' permits a chosen reduction of '+amount,()=>{
      let s=field();
      put(s,0,id);
      const x=play(s,0,target);
      assert.equal(s.decision?.task?.op,'g34_PayAura560');
      s=JSON.parse(JSON.stringify(s));
      pick(s,amount);
      finish(s);
      assert.equal(tapped(s,0),e.card(target).cost-amount);
      assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));
    });
  }
}
test('Chick reduces dragon summons without reducing dragon spells',()=>{
  const s=field();
  put(s,0,CHICK);
  assert.equal(e.summonCost(s,0,e.card(DRAGON)),3);
  play(s,0,'dm26ex2-038',1);
  finish(s);
  assert.equal(tapped(s,0),3);
});
test('the verification deck has forty legal cards and includes the whole batch',()=>{
  assert.equal(manifest.cards.length,11);
  assert.deepEqual(e.validateDeck(STANDARD573_DECK),[]);
  assert.equal(STANDARD573_DECK.cards.reduce((sum,c)=>sum+c.count,0),40);
  for(const {id} of manifest.cards)assert.ok(STANDARD573_DECK.cards.some(c=>c.id===id));
});
for(const first of [0,1]){
  test('legal forty CPU game preserves identities and resumes '+first,()=>{
    let s=e.createGame([STANDARD573_DECK,PRESETS[first]],{seed:57301+first,first});
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
}
