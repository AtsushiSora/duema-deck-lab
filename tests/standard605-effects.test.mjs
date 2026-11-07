import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-605.json',import.meta.url)));
const ZERO='dm26ex5-S008', DUMO='dmex14-050', MYOGA='dmx15-025', MOON='dmrp15-s01';
const WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', LIGHT='dm01-075', SEED='dmrp22-025', TWIN='dmrp05-002';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}

function place(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:605}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:604}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ゼロ・フェニックス counts physical cards, offers optional additional bases, and can resume base selection',()=>{
 let s=field();
 const dark=place(s,0,'battle',DARK),zero=place(s,0,'hand',ZERO);
 assert.equal(e.getLegalActions(s).some(a=>a.uid===zero.uid&&a.kind==='play'),false);
 const fire=place(s,0,'battle',FIRE);
 act(s,'play',a=>a.uid===zero.uid);
 pick(s,dark.uid);
 assert.ok(!values(s).includes(null));
 pick(s,'reset');
 pick(s,fire.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,dark.uid);
 assert.ok(values(s).includes(null));
 pick(s,null);
 assert.deepEqual(s.players[0].battle[0].under.map(x=>x.uid),[fire.uid,dark.uid]);
});

test('an existing stack with a noncreature underneath and an eligible tamaseed count for ultra evolution',()=>{
 for(const stacked of [true,false]){
  const s=field(),base=place(s,0,'battle',WATER);
  const second=inst(SEED);
  if(stacked)base.under=[second];
  else s.players[0].battle.push(second);
  const zero=play(s,ZERO);
  pick(s,base.uid);
  if(!stacked)pick(s,second.uid);
  assert.ok(values(s).includes(null));
  pick(s,null);
  assert.ok(has(s,0,'battle',zero));
  assert.ok(e.physicalCards(s).some(x=>x.uid===second.uid));
 }
});

test('ゼロ・フェニックス can return from grave only on its owner’s turn with both colors, five mana, and enough bases',()=>{
 for(const [mana,ally,stacked,valid] of [[4,'promoy11-070',true,false],[5,FIRE,true,false],[5,'promoy11-070',false,false],[5,'promoy11-070',true,true]]){
  const s=field(1),base=place(s,0,'battle',ally),zero=place(s,0,'grave',ZERO);
  give(s,0,'mana',Array(mana).fill(WATER));
  if(stacked)base.under=[inst(SEED)];
  act(s,'toAttack');
  act(s,'endTurn');
  if(valid){
   assert.equal(s.decision.player,0);
   pick(s,true);
   pick(s,base.uid);
   pick(s,null);
  }else assert.equal(s.decision,null);
  assert.equal(has(s,0,'battle',zero),valid);
  assert.equal(has(s,0,'grave',zero),!valid);
 }
});

test('ゼロ・フェニックス can destroy on entry and on leaving, and burns both shields without triggers',()=>{
 const s=field(),a=place(s,0,'battle',DARK),b=place(s,0,'battle',FIRE),entryTarget=place(s,1,'battle',WATER);
 const zero=play(s,ZERO);
 pick(s,a.uid);pick(s,b.uid);pick(s,null);
 pick(s,entryTarget.uid);
 assert.ok(has(s,1,'grave',entryTarget));
 give(s,1,'shields',['dm01-027','dm01-027']);
 const shields=[...s.players[1].shields];
 attack(s,zero.uid);act(s,'noBlock');
 assert.ok(shields.every(x=>has(s,1,'grave',x)));
 assert.ok(!s.triggers);
 const exitTarget=place(s,1,'battle',WATER);
 s.active=1;s.phase='main';
 play(s,'dm01-027');
 act(s,'effect',a=>a.targets.some(t=>t.uid===zero.uid));
 assert.equal(s.decision.player,0);
 pick(s,exitTarget.uid);
 assert.ok(has(s,0,'grave',zero)&&has(s,1,'grave',exitTarget));
});

test('filtered hand disruption shows the whole hand and recognizes both sides of a Twinpact',()=>{
 assert.ok(e.card(TWIN).spellFace);
 for(const id of [DUMO,MYOGA]){
  const s=field(),tw=place(s,1,'hand',TWIN),spell=place(s,1,'hand','dm01-027'),creature=place(s,1,'hand',WATER),seed=place(s,1,'hand',SEED);
  play(s,id);
  assert.deepEqual(s.decision.task.seen,[TWIN,spell.cardId,WATER,SEED]);
  assert.deepEqual(values(s),id===DUMO?[tw.uid,spell.uid]:[spell.uid,seed.uid]);
  pick(s,id===DUMO?tw.uid:seed.uid);
  assert.ok(has(s,1,'grave',id===DUMO?tw:seed));
  assert.ok(has(s,1,'hand',creature));
 }
});

test('filtered hand inspection remains available when there are no eligible cards',()=>{
 const s=field(),creature=place(s,1,'hand',WATER);
 play(s,DUMO);
 assert.deepEqual(s.decision.task.seen,[WATER]);
 assert.deepEqual(values(s),[null]);
 pick(s,null);
 assert.ok(has(s,1,'hand',creature));
});

test('ロンリネス taxes only the opponent’s spells and deploys an eligible blocker on shield loss',()=>{
 const s=field(1),attacker=place(s,1,'battle',WATER),spell=place(s,1,'hand','dm01-027');
 const base=e.getLegalActions(s).find(a=>a.uid===spell.uid&&a.kind==='play').cost;
 place(s,0,'battle',MOON);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===spell.uid&&a.kind==='play').cost,base+1);
 const blocker=place(s,0,'hand','dm01-076');
 place(s,0,'hand',FIRE);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.ok(values(s).includes(blocker.uid));
 assert.equal(s.decision.choices.filter(x=>x.value).length,1);
 pick(s,blocker.uid);
 assert.ok(has(s,0,'battle',blocker));
});
