import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD583_DECK} from '../tools/fixtures/standard583.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-583.json',import.meta.url)));
const MERRY='dmx09-009', BONE='dm03-046', BONT='dmrp04m-061', ROLLER='dm36-110';
const CONTRACT='dm04-049', BLESSING='dm20-020', BOARO='dmx16-064', BLESS='dm06-066', CRUZ='dm05-037';
const PHOTO='dm26ex3-040', BARLOW='dm24bd4-009', BERSERK='dmd13-002', ARACHNE='dmr13-035';
const CALL='dmpcd01-r13', MURASAME='dm29-005';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const DRAGON='dm25rp3-S09', COUNCIL='dm26ex3-057', SAMURAI='dm36-098', GEAR='dm28-033', NINGYO='dmrp22-033';
const LOCK='dmrp22-042', SHADOW='dm19-022', TWIN='dm24ex2-096';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(26).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid);
  return x;
}
const choices=s=>s.decision?.choices??[];
const value=o=>o.value?.uid??o.value;
const targets=s=>choices(s).map(value);
const uids=rows=>rows.map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>value(choices(s)[a.choice])===v);}

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:583}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:582}));
  for(const [key,expected] of Object.entries(row.spec))assert.deepEqual(c[key],expected);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const n of [0,3])test('Contract moves '+n+' mana cards before drawing exactly that many',()=>{
  let s=field();
  const drawn=uids(s.players[0].deck.slice(0,n)),mana=s.players[0].mana.slice(0,n);
  if(n)mana[0].faceDown=true;
  play(s,CONTRACT);
  const before=physical(s);
  for(const [i,x] of mana.entries()){
    if(!i){
      const option=choices(s).find(o=>value(o)===x.uid);
      assert.match(option.label,/裏向き/);
      assert.ok(!option.cardId);
    }
    assert.ok(uids(s.players[0].mana).includes(x.uid));
    pick(s,x.uid);
    assert.equal(s.players[0].grave.length,0);
  }
  s=JSON.parse(JSON.stringify(s));
  pick(s,null);
  assert.deepEqual(uids(s.players[0].grave.slice(0,n)),uids(mana));
  assert.deepEqual(uids(s.players[0].hand),drawn);
  assert.deepEqual(physical(s),before);
});

test('a mana movement lock prevents Contract from drawing',()=>{
  const s=field();
  put(s,1,LOCK);
  const length=s.players[0].deck.length;
  play(s,CONTRACT);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck.length,length);
  assert.equal(s.players[0].mana.length,50);
});

for(const [id,eligible,all] of [[BLESSING,[DARK,TWIN],false],[BERSERK,[DARK,SHADOW,TWIN],false],[MURASAME,[SAMURAI,GEAR,TWIN],true],[PHOTO,[COUNCIL],false]])test(id+' offers only its eligible grave cards and moves the confirmed batch',()=>{
  const s=field();
  const enemy=put(s,1,FIRE),ids=[...eligible,...(id===BLESSING?[SHADOW]:[NATURE])];
  give(s,0,'grave',ids);
  const moving=s.players[0].grave.slice(0,eligible.length),left=s.players[0].grave.at(-1),beforeCount=s.players[0].mana.length;
  play(s,id);
  const offered=id===BERSERK?[...moving,left]:moving;
  assert.deepEqual(targets(s),[...uids(offered),...(all?[]:[null])]);
  for(const x of moving){
    assert.equal(s.players[0].mana.length,beforeCount);
    pick(s,x.uid);
  }
  if(s.decision)pick(s,null);
  assert.deepEqual(uids(s.players[0].mana.slice(beforeCount)),uids(moving));
  assert.ok(uids(s.players[0].grave).includes(left.uid));
  assert.equal(enemy.tapped,id===PHOTO);
  assert.equal(s.decision,null);
});

test('Bless uses its tap ability and caps recovery at three',()=>{
  const s=field(),source=put(s,0,BLESS);
  give(s,0,'grave',[DARK,SHADOW,FIRE,WATER]);
  const picked=s.players[0].grave.slice(0,3),remaining=s.players[0].grave[3];
  s.phase='attack';
  act(s,'tapAbility',a=>a.uid===source.uid);
  assert.equal(source.tapped,true);
  for(const x of picked)pick(s,x.uid);
  assert.equal(s.decision,null);
  assert.deepEqual(uids(s.players[0].mana.slice(-3)),uids(picked));
  assert.deepEqual(uids(s.players[0].grave),[remaining.uid]);
});

test('grave cards remain in place when the mana move is replaced with going to the grave',()=>{
  const s=field(),stored=put(s,0,COUNCIL,'grave'),enemy=put(s,1,NINGYO);
  play(s,PHOTO);
  pick(s,stored.uid);
  assert.deepEqual(uids(s.players[0].grave.slice(0,1)),[stored.uid]);
  assert.ok(!uids(s.players[0].mana).includes(stored.uid));
  assert.equal(enemy.tapped,true);
});

for(const [id,hit,miss,tapped] of [[CALL,DRAGON,FIRE,true],[BONT,DRAGON,COUNCIL,false]])for(const kind of ['match','miss','redirect'])test(id+' checks the first ramped card '+kind,()=>{
  const s=field();
  if(kind==='redirect')put(s,1,NINGYO);
  give(s,0,'deck',[kind==='miss'?miss:hit,WATER,FIRE]);
  const first=s.players[0].deck[0],second=s.players[0].deck[1];
  play(s,id);
  const rows=s.players[0][kind==='redirect'?'grave':'mana'],moved=rows.filter(x=>x.uid===first.uid||x.uid===second.uid);
  assert.deepEqual(uids(moved),uids(kind==='miss'?[first]:[first,second]));
  if(kind!=='redirect')for(const x of moved)assert.equal(x.tapped,tapped||e.manaCivilizations(e.card(x.cardId)).length>1);
});

test('Bont counts infinite printed power',()=>{
  const s=field();
  give(s,0,'deck',['dmrp15-km1',WATER,FIRE]);
  const picked=s.players[0].deck.slice(0,2);
  play(s,BONT);
  assert.deepEqual(uids(s.players[0].mana.slice(-2)),uids(picked));
});

for(const allColors of [true,false])test('Boaro checks the five civilizations after the first card '+allColors,()=>{
  const s=field();
  give(s,0,'mana',[LIGHT,WATER,DARK,NATURE,NATURE,NATURE]);
  give(s,0,'deck',[allColors?FIRE:LIGHT,WATER,FIRE]);
  const second=s.players[0].deck[1],n=s.players[0].mana.length;
  play(s,BOARO);
  assert.equal(s.players[0].mana.length,n+(allColors?2:1));
  assert.equal(uids(s.players[0].mana).includes(second.uid),allColors);
});

for(const behind of [false,true])test('Cruz checks if its controller has fewer mana cards '+behind,()=>{
  const s=field();
  if(behind)put(s,1,FIRE,'mana');
  play(s,CRUZ);
  assert.equal(s.players[0].mana.length,behind?51:50);
});

for(const n of [1,2,3])test('Barlow assigns '+n+' available cards before moving any of them',()=>{
  let s=field();
  give(s,0,'deck',[DARK,WATER,NATURE].slice(0,n));
  const [a,b,c]=s.players[0].deck;
  play(s,BARLOW);
  const before=physical(s);
  pick(s,a.uid);
  if(b){
    assert.equal(s.players[0].deck.length,n);
    assert.ok(!targets(s).includes(a.uid));
    s=JSON.parse(JSON.stringify(s));
    pick(s,b.uid);
    assert.ok(uids(s.players[0].grave).includes(b.uid));
  }
  assert.ok(uids(s.players[0].mana).includes(a.uid));
  assert.deepEqual(uids(s.players[0].deck),c?[c.uid]:[]);
  assert.deepEqual(physical(s),before);
});

test('Merry may put any own mana card on top when it attacks',()=>{
  const s=field(),source=put(s,0,MERRY),hidden=s.players[0].mana[1];
  hidden.faceDown=true;
  attack(s,source.uid);
  assert.ok(targets(s).includes(hidden.uid));
  pick(s,hidden.uid);
  assert.equal(s.players[0].deck[0].uid,hidden.uid);
});

test('Bone Pierce recovers a face-up creature, including the creature side of a twinpact',()=>{
  const s=field(1),source=put(s,0,BONE);
  give(s,0,'mana',[TWIN,SHADOW,DARK]);
  const [eligible,,hidden]=s.players[0].mana;
  hidden.faceDown=true;
  s.extTasks=[{op:'g34_ExactMove',p:1,source:FIRE,owner:0,target:source.uid,targetIncarnation:0,to:'grave'}];
  act(s,'toAttack');
  assert.deepEqual(targets(s),[eligible.uid,null]);
  pick(s,eligible.uid);
  assert.ok(uids(s.players[0].hand).includes(eligible.uid));
});

for(const id of [ROLLER,ARACHNE])for(const accept of [true,false])test(id+' ramps only after a creature was returned '+accept,()=>{
  const s=field(),first=s.players[0].deck[0],returned=s.players[0].mana[0];
  if(id===ROLLER)play(s,id);
  else{
    put(s,0,id);
    const a=put(s,0,DRAGON);
    attack(s,a.uid);
  }
  pick(s,accept?returned.uid:null);
  assert.equal(uids(s.players[0].hand).includes(returned.uid),accept);
  const ramped=s.players[0].mana.find(x=>x.uid===first.uid);
  assert.equal(!!ramped,accept);
  if(accept)assert.equal(ramped.tapped,id===ROLLER);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD583_DECK),[]);
  let s=e.createGame([STANDARD583_DECK,PRESETS[0]],{seed:58301,first:0}),saved=false;
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
