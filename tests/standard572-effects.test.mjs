import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD572_DECKS} from '../tools/fixtures/standard572.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-572.json',import.meta.url)));
const FIRE='dm01-097', WATER='dm01-083', LIGHT='dm01-075';
const EVO='dm02-s02', SEED='dmsd20-016', DRAGON='dm05-s04', MULTI='dmrp13-084';
const HIME='dmrp22-047', PORISU='dmex11-042', JOKER='dmrp04s-085', GOCHIN='dmrp16-037';
const GACHAPIN='dmr05-075', HYPER='dm24ex1-028', REIGER='dm24rp1-055', SHIELD='dmr16s-034';
const targets={
  [HIME]:SEED, [PORISU]:FIRE, [JOKER]:'dmrp07-079', 'dmr20-065':DRAGON,
  'dmr09-090':'dmrp07-001', 'dmr13-076':'dm01-s01', 'dm14-092':'dm01-s06',
  [GOCHIN]:FIRE, 'promoy16-023':MULTI, 'dm24rp4-055':DRAGON,
  'dm33-024':'dm01-s06', 'dmr20-011':'dm10-006', 'dm26rp1-068':HYPER,
  'dmr05-013':'dm01-076', [SHIELD]:LIGHT, 'dmr04-044':MULTI,
  [GACHAPIN]:'dm01-076', 'dmr08-038':'dmrp07-001', 'dm14-107':'dm08-052',
  'dmrp06-078':'dmrp17-078', [REIGER]:HYPER, 'dm23rp3-054':'dm23rp2-054',
  'dmx15-028':'dmd09-007', 'dmex14-100':MULTI, 'dm35-022':'dm25rp3-S06',
  'dm14-075':'dm01-s01'
};

function field(active=0) {
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(35).fill(FIRE));
  return s;
}
function put(s,p,id) {
  const x=inst(id);
  s.players[p].battle.push(x);
  return x;
}
function finish(s) {
  for(let n=0;s.decision&&s.winner===null;n++){
    assert.ok(n<1000,JSON.stringify(s.decision));
    const actions=e.getLegalActions(s);
    const pass=actions.find(a=>['allowLeave','noBlock'].includes(a.kind));
    e.step(s,pass??e.chooseAI(s));
  }
}
function move(s,p,x,to) {
  s.phase='main';
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
  act(s,'toAttack');
}
function replacement(s,x) {
  return e.getLegalActions(s).find(a=>a.kind==='replaceUltra'&&a.uid===x.uid);
}
function save(s,x) {
  act(s,'replaceUltra',a=>a.uid===x.uid);
}
function pick(s,value) {
  act(s,'extended',a=>{
    const choice=s.decision.choices[a.choice].value;
    return (choice?.uid??choice)===value;
  });
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of manifest.cards){
  const {id,name,spec}=row;
  const ultra=!!spec.g571Saver.ultra;
  test(name+' verifies the official definition and a legal paid play',()=>{
    const detail=details.cards.find(x=>x.id===id);
    const card=e.card(id);
    assert.deepEqual(detail.faces,row.faces);
    assert.deepEqual(standardCardSpec(detail,{phase:572}),spec);
    assert.throws(()=>standardCardSpec(detail,{phase:571}));
    assert.ok(row.verification.facesMatched);
    assert.equal(card.manaValue,1);
    assert.equal(card.limit,4);
    assert.equal(CARD_IMAGES[id],row.image);
    const s=field();
    const x=inst(id);
    s.players[0].hand.push(x);
    act(s,'play',a=>a.uid===x.uid&&!a.alternative);
    finish(s);
    assert.ok(s.players[0].battle.includes(x));
    assert.equal(s.players[0].mana.filter(y=>y.tapped).length,card.cost);
  });
  for(const to of ['grave','hand']){
    test(name+' '+to+' checks the correct replacement window and physical moves',()=>{
      let s=field(1);
      const x=put(s,1,id);
      const y=put(s,1,targets[id]);
      const before=physical(s);
      move(s,1,y,to);
      if(to==='grave'||ultra){
        const label=ultra?'をウルトラ・セイバーで':'をセイバーで';
        assert.ok(replacement(s,x)?.label.includes(label));
        s=JSON.parse(JSON.stringify(s));
        save(s,x);
        finish(s);
        assert.ok(s.players[1].battle.some(a=>a.uid===y.uid));
        const sacrificed=s.log.some(l=>l.type==='ultraSaver'&&l.cardId===id);
        assert.ok(sacrificed);
      }else{
        assert.ok(!replacement(s,x));
        finish(s);
        assert.ok(s.players[1].battle.includes(x));
        assert.ok(s.players[1].hand.includes(y));
      }
      assert.deepEqual(physical(s),before);
    });
  }
}

test('all new cards belong to legal forty-card fixtures',()=>{
  assert.equal(manifest.cards.length,26);
  for(const deck of STANDARD572_DECKS){
    assert.deepEqual(e.validateDeck(deck),[]);
    assert.equal(deck.cards.reduce((sum,c)=>sum+c.count,0),40);
  }
  for(const {id} of manifest.cards)assert.ok(STANDARD572_DECKS.some(d=>d.cards.some(c=>c.id===id)));
});

for(const to of ['mana','deck','shields']){
  test('Ultra Saver protects a matching tamaseed from '+to,()=>{
    const s=field(),x=put(s,0,HIME),y=put(s,0,SEED),before=physical(s);
    move(s,0,y,to);
    save(s,x);
    finish(s);
    assert.ok(s.players[0].battle.includes(y));
    assert.ok(s.players[0].grave.includes(x));
    assert.deepEqual(physical(s),before);
  });
}
test('a protected evolution retains its complete stack',()=>{
  const s=field(),x=put(s,0,HIME),y=put(s,0,EVO),base=inst(WATER);
  y.under=[base];
  const before=physical(s);
  move(s,0,y,'hand');
  save(s,x);
  finish(s);
  assert.ok(s.players[0].battle.includes(y));
  assert.deepEqual(y.under,[base]);
  assert.deepEqual(physical(s),before);
});
for(const [id,target,offered] of [
  [PORISU,LIGHT,true], [PORISU,WATER,false], [HIME,FIRE,false],
  [GOCHIN,'dm01-076',true], [GOCHIN,'dm02-038',true], [GOCHIN,EVO,false],
  ['dmr20-011',DRAGON,false], ['dmr20-011','dm01-s01',false],
  ['dmr20-065','dm08-052',false], ['dmex14-100',LIGHT,false],
  ['dmr09-090',FIRE,false], ['dm23rp3-054',DRAGON,true]
]){
  test(e.card(id).name+' checks target '+target,()=>{
    const s=field(),x=put(s,0,id),y=put(s,0,target);
    if(target===EVO)y.under=[inst(WATER)];
    move(s,0,y,'hand');
    assert.equal(!!replacement(s,x),offered);
  });
}
test('Ultra Saver can be declined and can be used on itself',()=>{
  for(const use of [false,true]){
    const s=field(),x=put(s,0,JOKER),before=physical(s);
    move(s,0,x,'hand');
    if(use)save(s,x);
    else act(s,'allowLeave');
    finish(s);
    assert.ok(s.players[0][use?'grave':'hand'].includes(x));
    assert.deepEqual(physical(s),before);
  }
});
test('the same Ultra Saver cannot pay for two simultaneous moves',()=>{
  const s=field(),x=put(s,0,HIME),a=put(s,0,SEED),b=put(s,0,SEED),before=physical(s);
  s.extTasks=[{op:'g34_Sweep',p:1,source:FIRE,filter:{g295Tamaseed:true},to:'hand'}];
  act(s,'toAttack');
  const protectedUid=s.decision.uid;
  save(s,x);
  assert.ok(!replacement(s,x));
  finish(s);
  assert.equal([a,b].filter(y=>s.players[0].battle.includes(y)).length,1);
  assert.ok(s.players[0].battle.some(y=>y.uid===protectedUid));
  assert.ok(s.players[0].grave.includes(x));
  assert.deepEqual(physical(s),before);
});
test('Ultra Saver already selected for the same sweep pays with destruction instead of the original destination',()=>{
  const s=field(),x=put(s,0,PORISU),y=put(s,0,FIRE),before=physical(s);
  s.extTasks=[{op:'g34_Sweep',p:1,source:FIRE,filter:{creature:true},to:'hand'}];
  act(s,'toAttack');
  if(s.decision.uid===x.uid)act(s,'allowLeave');
  save(s,x);
  finish(s);
  assert.ok(s.players[0].battle.includes(y));
  assert.ok(s.players[0].grave.includes(x));
  assert.deepEqual(physical(s),before);
});
test('two Ultra Savers swept together cannot replace one another’s sacrifice',()=>{
  const s=field(),a=put(s,0,JOKER),b=put(s,0,JOKER),before=physical(s);
  s.extTasks=[{op:'g34_Sweep',p:1,source:FIRE,filter:{creature:true},to:'hand'}];
  act(s,'toAttack');
  assert.equal(s.decision.uid,a.uid);
  save(s,b);
  assert.ok(!replacement(s,a));
  finish(s);
  assert.ok(s.players[0].battle.includes(a));
  assert.ok(s.players[0].grave.includes(b));
  assert.deepEqual(physical(s),before);
});
for(const queenFirst of [false,true]){
  test('Queen Lupia and Ultra Saver cannot spend the same Fire Bird '+queenFirst,()=>{
    const s=field(),queenId='dm24ex1-013',saverId='dmr20-065';
    const first=put(s,0,queenFirst?queenId:DRAGON);
    const second=put(s,0,queenFirst?DRAGON:queenId);
    const source=put(s,0,saverId),before=physical(s);
    s.extTasks=[{op:'g34_Sweep',p:1,source:FIRE,filter:{creature:true},to:'grave'}];
    act(s,'toAttack');
    assert.equal(s.decision.uid,first.uid);
    if(queenFirst)act(s,'g49Replace',a=>a.choice.target===source.uid);
    else save(s,source);
    const reused=e.getLegalActions(s).some(a=>a.kind==='replaceUltra'&&a.uid===source.uid
      ||a.kind==='g49Replace'&&a.choice.target===source.uid);
    assert.equal(reused,false);
    finish(s);
    assert.ok(s.players[0].battle.includes(first));
    assert.ok(s.players[0].grave.includes(second));
    assert.ok(s.players[0].grave.includes(source));
    assert.deepEqual(physical(s),before);
  });
}
test('a sealed or ability-muted source and an enemy source are unavailable',()=>{
  for(const mode of ['sealed','muted','enemy']){
    const s=field(),x=put(s,mode==='enemy'?1:0,HIME),y=put(s,0,SEED);
    if(mode==='sealed'){
      x.sealed=true;
      s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:x.uid});
    }
    if(mode==='muted')x.g35Ignored=s.turn;
    move(s,0,y,'hand');
    assert.ok(!replacement(s,x));
    assert.ok(s.players[0].hand.includes(y));
  }
});
test('Gochin reanimates a creature after its own replacement destruction',()=>{
  const s=field(),x=put(s,0,GOCHIN),y=put(s,0,FIRE);
  give(s,0,'grave',[WATER]);
  const z=s.players[0].grave[0];
  move(s,0,y,'hand');
  save(s,x);
  pick(s,z.uid);
  finish(s);
  assert.ok(s.players[0].battle.includes(y));
  assert.ok(s.players[0].battle.includes(z));
  assert.ok(s.players[0].grave.includes(x));
});
test('Reiger can draw or decline after saving an ally',()=>{
  for(const draw of [false,true]){
    const s=field(),x=put(s,0,REIGER),y=put(s,0,HYPER);
    move(s,0,y,'mana');
    save(s,x);
    pick(s,draw?true:null);
    finish(s);
    assert.equal(s.players[0].hand.length,Number(draw));
    assert.ok(s.players[0].battle.includes(y));
  }
});
test('Jonas may untap a tapped creature after its replacement destruction',()=>{
  const s=field(),x=put(s,0,'dm24rp4-055'),y=put(s,0,DRAGON);
  const z=put(s,1,WATER);
  z.tapped=true;
  move(s,0,y,'grave');
  save(s,x);
  pick(s,z.uid);
  finish(s);
  assert.equal(z.tapped,false);
  assert.ok(s.players[0].battle.includes(y));
});
test('Andro Saver converts its death into a shield only with three light mana',()=>{
  for(const n of [2,3]){
    const s=field(),x=put(s,0,SHIELD),y=put(s,0,LIGHT);
    give(s,0,'mana',Array(n).fill(LIGHT));
    move(s,0,y,'grave');
    save(s,x);
    if(n===3)pick(s,true);
    finish(s);
    assert.equal(s.players[0].shields.length,n===3?6:5);
  }
});
test('PORISU can deploy with Magibomber after being summoned',()=>{
  const s=field(),x=put(s,0,PORISU);
  give(s,0,'hand',[FIRE]);
  const y=s.players[0].hand[0];
  s.phase='attack';
  act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
  pick(s,y.uid);
  finish(s);
  assert.ok(s.players[0].battle.includes(y));
  assert.equal(s.players[0].mana.filter(z=>z.tapped).length,0);
});
for(const first of [0,1]){
  test('legal forty CPU game conserves all eighty identities '+first,()=>{
    let s=e.createGame([STANDARD572_DECKS[first],PRESETS[first]],{seed:57201+first,first});
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
