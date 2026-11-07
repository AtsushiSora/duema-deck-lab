import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-606.json',import.meta.url)));
const WARN='dmr02-050', BURN='dmrp12-038', FLARE='dmd24-011', DOREMI='promoy15-063';
const WATER='dm01-083', BLOCKER='dm01-076', LIGHT_TWIN='dmrp05-002', NATURE_TWIN='dm22ex1-062';
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
 assert.deepEqual(standardCardSpec(detail,{phase:606}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:605}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ワーニング・スパイク restricts only the selected creatures and expires at the end of the turn',()=>{
 const s=field(1),first=place(s,1,'battle',WATER),second=place(s,1,'battle',WATER),third=place(s,1,'battle',WATER);
 give(s,0,'shields',[WARN]);
 attack(s,first.uid);act(s,'noBlock');act(s,'useTrigger');
 pick(s,second.uid);pick(s,null);
 const attackable=()=>e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.uid);
 assert.ok(!attackable().includes(second.uid)&&attackable().includes(third.uid));
 act(s,'endTurn');
 s.phase='attack';act(s,'endTurn');
 s.phase='attack';
 assert.ok(attackable().includes(second.uid));
});

test('ワーニング・スパイク stops the selected blocker without tapping it',()=>{
 const s=field(),attacker=place(s,0,'battle',WATER),blocker=place(s,1,'battle',BLOCKER);
 play(s,WARN);
 pick(s,blocker.uid);
 if(s.decision?.type==='extended')pick(s,null);
 assert.equal(blocker.tapped,false);
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('クリスタント・バーナミア taps all enemies but only the lower-power ones miss their next untap',()=>{
 const s=field(),small=place(s,1,'battle','dm01-079'),big=place(s,1,'battle','dmrp05-002'),own=place(s,0,'battle',WATER);
 play(s,BURN);
 assert.ok(small.tapped&&big.tapped&&!own.tapped);
 const late=place(s,1,'battle',WATER);late.tapped=true;
 act(s,'toAttack');act(s,'endTurn');
 assert.ok(small.tapped&&!big.tapped&&!late.tapped);
 s.phase='attack';act(s,'endTurn');
 s.phase='attack';act(s,'endTurn');
 assert.equal(small.tapped,false);
});

test('ホワイト・フレア checks for a Bolmeteus creature before allowing both modes',()=>{
 for(const withBolmeteus of [false,true]){
  const s=field(),small=place(s,1,'battle',WATER),big=place(s,1,'battle','dmrp05-002');
  if(withBolmeteus)place(s,0,'battle','dmc27-004');
  play(s,FLARE);
  assert.deepEqual(values(s),withBolmeteus?[0,1,2]:[0,1]);
  pick(s,withBolmeteus?2:0);
  assert.deepEqual(values(s),[small.uid]);
  pick(s,small.uid);
  assert.ok(has(s,1,'grave',small));
  assert.equal(big.tapped,withBolmeteus);
 }
});

test('ドレミ団の光魂Go！ can tap the whole opposing board instead of drawing',()=>{
 const s=field(),a=place(s,1,'battle',WATER),b=place(s,1,'battle',BLOCKER),top=s.players[0].deck[0];
 play(s,DOREMI);
 pick(s,0);
 assert.ok(a.tapped&&b.tapped);
 assert.equal(s.players[0].deck[0].uid,top.uid);
});

test('ドレミ団の光魂Go！ draws before offering a free cast and checks the spell face’s colors',()=>{
 const s=field(),wrong=place(s,0,'hand',NATURE_TWIN);
 give(s,0,'deck',[LIGHT_TWIN,WATER,WATER]);
 const drawn=s.players[0].deck[0];
 play(s,DOREMI);
 const mana=s.players[0].mana.filter(x=>!x.tapped).length;
 pick(s,1);
 assert.ok(has(s,0,'hand',drawn));
 assert.deepEqual(values(s),[drawn.uid,null]);
 assert.ok(!values(s).includes(wrong.uid));
 pick(s,drawn.uid);
 drain(s);
 assert.ok(has(s,0,'grave',drawn));
 assert.equal(s.players[0].mana.filter(x=>!x.tapped).length,mana);
});
