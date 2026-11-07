import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-595.json',import.meta.url)));
const FIONA='dm25ex4-S01', TANRA='dmrp17-017', LUNA='dm14-019', SCREW='dm14-030', HIZU='dmr05-039', ROCK='dmr18-002';
const WATER='dm01-049', FIRE='dm01-097', LIGHT='dm01-075';
const DRAW='dm06-085', RAMP='dm06-110', SPARK='dm01-015';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(FIRE));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const value=o=>o.value?.uid??o.value;
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function pick(s,v){act(s,'extended',a=>value(s.decision.choices[a.choice])===v);}
function end(s){s.phase='attack';act(s,'endTurn');if(!s.decision)s.phase='main';}

for(const row of cards)test(row.name+' matches the official printing and complete definition',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:595}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:594}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('タンラ reacts after the spell resolves on the caster’s turn and the bounce can be declined',()=>{
 for(const accept of [true,false]){
  const s=field(),body=place(s,0,'battle',FIRE),top=s.players[0].deck.slice(0,2);
  place(s,1,'battle',TANRA);
  play(s,DRAW);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.map(x=>x.uid));
  assert.equal(s.decision.player,1);
  pick(s,accept?body.uid:null);
  assert.equal(has(s,0,'hand',body),accept);
 }
 const s=field();
 place(s,0,'battle',TANRA);
 // An opposing S・トリガー on タンラ’s controller's turn does not trigger the bounce.
 const body=place(s,0,'battle',FIRE);
 place(s,1,'battle',FIRE);
 s.players[1].shields=[inst(SPARK)];
 s.phase='attack';act(s,'attack',a=>a.uid===body.uid&&a.target==='player');
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 act(s,'useTrigger');
 assert.equal(s.decision,null);
});

test('ルナ reacts to a matching spell and returns up to two cards from the caster’s mana',()=>{
 let s=field();
 place(s,1,'battle',LUNA);
 play(s,DRAW);
 assert.equal(s.decision,null);
 const cards=s.players[0].mana.slice(0,2);
 play(s,RAMP);
 assert.equal(s.decision.player,1);
 pick(s,cards[0].uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,cards[1].uid);
 for(const x of cards)assert.ok(has(s,0,'hand',x));
});

test('スクリューヘッド only destroys an opposing creature of the right civilization and power',()=>{
 const s=field(),small=place(s,0,'battle',WATER),large=place(s,0,'battle','dm01-s04');
 place(s,0,'battle',FIRE);
 place(s,1,'battle',SCREW);
 play(s,RAMP);
 assert.equal(s.decision,null);
 play(s,DRAW);
 assert.deepEqual(s.decision.choices.map(value),[small.uid]);
 pick(s,small.uid);
 assert.ok(has(s,0,'grave',small));
 assert.ok(has(s,0,'battle',large));
});

test('ヒズラシィ uses the spell’s card cost, even when the caster paid extra',()=>{
 const s=field();
 place(s,1,'battle',FIONA);
 place(s,1,'battle',HIZU);
 const matching=place(s,1,'hand','dm01-105');
 place(s,1,'hand',LIGHT);
 place(s,1,'hand','dm01-s04');
 const mana=s.players[0].mana.filter(x=>x.tapped).length;
 play(s,DRAW);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana+4);
 assert.deepEqual(s.decision.choices.map(value).filter(Boolean),[matching.uid]);
 pick(s,matching.uid);
 assert.ok(has(s,1,'battle',matching));
});

test('フィオナ can decline the draw and still deploy, and repeats on its controller’s turn',()=>{
 const s=field(),first=place(s,0,'hand',FIRE),second=place(s,0,'hand',LIGHT);
 play(s,FIONA);
 pick(s,null);
 pick(s,first.uid);
 assert.ok(has(s,0,'battle',first));
 assert.equal(e.summonCost(s,1,e.card(DRAW)),4);
 assert.equal(e.summonCost(s,0,e.card(DRAW)),3);
 end(s);end(s);
 pick(s,true);
 pick(s,second.uid);
 assert.ok(has(s,0,'battle',second));
 assert.equal(e.summonCost(s,1,e.card(DRAW)),5);
});

test('ロッキンスター checks its controller’s shield count and still allows light spells',()=>{
 const s=field(),rock=place(s,1,'battle',ROCK);
 give(s,1,'shields',[FIRE,FIRE,FIRE]);
 assert.equal(e.canCastSpell(s,0,e.card(DRAW),'hand'),true);
 s.players[1].shields.pop();
 assert.equal(e.canCastSpell(s,0,e.card(DRAW),'hand'),false);
 assert.equal(e.canCastSpell(s,0,e.card(SPARK),'hand'),true);
 assert.equal(e.canCastSpell(s,1,e.card(DRAW),'hand'),true);
 end(s);
 rock.tapped=true;
 end(s);
 assert.equal(rock.tapped,false);
});
