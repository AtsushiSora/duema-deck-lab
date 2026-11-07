import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-596.json',import.meta.url)));
const DICE='dmrp12-027', TREASURE='dmrp14-043', CLUB='dmrp13-043';
const XENARCH='dm23rp2-019', DOMINO='dmx19-s27', PROCHURIS='dm26rp3-069';
const SMALL='dm01-097', MEDIUM='dm01-043', LARGE='dm01-s04', ONI='dmrp01-041', STAR='promoy20-cp12';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(face===undefined||a.face===face));
 return x;
}

for(const row of cards)test(row.name+' matches the verified official printing and compiled rules',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:596}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:595}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ハヨダイス chooses a cost from 1 to 5 and does not target individual creatures',()=>{
 const s=field(),own=place(s,0,'battle',SMALL),other=place(s,1,'battle','dm01-105');
 const enemies=[place(s,1,'battle',SMALL),place(s,1,'battle',ONI)];
 play(s,DICE);
 assert.deepEqual(values(s),[1,2,3,4,5]);
 pick(s,2);
 assert.ok(enemies.every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,0,'battle',own)&&has(s,1,'battle',other));
});

test('鬼宝 checks 鬼タイム after adding its own shield and suppresses that shield’s trigger',()=>{
 for(const count of [3,4]){
  const s=field(),large=place(s,1,'battle',LARGE),cheap=place(s,1,'battle',SMALL);
  give(s,0,'shields',[TREASURE,...Array(count-1).fill(SMALL)]);
  give(s,1,'shields',Array(4).fill(SMALL));
  const shield=s.players[0].shields[0];
  play(s,TREASURE);
  pick(s,large.uid);
  pick(s,shield.uid);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',shield)&&has(s,1,'grave',large));
  assert.equal(has(s,1,'grave',cheap),count===3);
 }
});

test('黒縄棍 only takes a shield when its optional sweep is accepted',()=>{
 for(const accept of [true,false]){
  const s=field(),target=place(s,1,'battle',MEDIUM),small=place(s,1,'battle',SMALL),large=place(s,1,'battle',LARGE);
  const shield=s.players[0].shields[0];
  play(s,CLUB);
  pick(s,target.uid);
  pick(s,accept?true:null);
  if(accept)pick(s,shield.uid);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'grave',target)&&has(s,1,'battle',large));
  assert.equal(has(s,1,'grave',small),accept);
  assert.equal(has(s,0,'hand',shield),accept);
 }
});

test('XENARCH destroys only the chosen target on an ordinary S・トリガー',()=>{
 const s=field(1),attacker=place(s,1,'battle',SMALL),fresh=place(s,1,'battle',MEDIUM);
 fresh.entered=s.turn;
 s.players[0].shields=[inst(XENARCH)];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,attacker.uid);
 assert.ok(has(s,1,'grave',attacker)&&has(s,1,'battle',fresh));
 assert.equal(s.decision,null);
});

test('XENARCH’s plus checks the entry turn of the reconstructed Star Evolution base',()=>{
 for(const baseEnteredThisTurn of [true,false]){
  let s=field(1);
  const top=place(s,1,'battle',STAR),base=inst(SMALL),fresh=place(s,1,'battle',MEDIUM);
  const attacker=place(s,1,'battle',LARGE);
  top.entered=fresh.entered=s.turn;
  top.under=[base];
  if(baseEnteredThisTurn)base.entered=s.turn;
  s.players[0].shields=[inst(XENARCH),inst(SMALL),inst(SMALL)];
  const shield=s.players[0].shields[0];
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'breakShields',a=>a.shields.includes(shield.uid));
  act(s,'useTrigger');
  s=JSON.parse(JSON.stringify(s));
  pick(s,top.uid);
  drain(s);
  assert.ok(has(s,1,'grave',top)&&has(s,1,'grave',fresh));
  assert.equal(has(s,1,'grave',base),baseEnteredThisTurn);
  assert.equal(has(s,1,'battle',base),!baseEnteredThisTurn);
  assert.ok(has(s,1,'battle',attacker));
 }
});

test('カナシミドミノ chains the static power drop and destruction triggers',()=>{
 const s=field(),own=place(s,0,'battle',SMALL);
 const first=place(s,1,'battle',SMALL),second=place(s,1,'battle',SMALL),third=place(s,1,'battle',MEDIUM);
 first.powerModifiers=[{amount:-1000,expires:'end',who:0}];
 const domino=play(s,DOMINO);
 drain(s);
 assert.ok([first,second,third].every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,0,'battle',own)&&has(s,0,'battle',domino));
});

test('プロチュリス can attack immediately, and its one-mana spell uses current power',()=>{
 const s=field(),small=place(s,1,'battle',SMALL),other=place(s,1,'battle',SMALL);
 const own=place(s,0,'battle',SMALL),modifier={amount:-1000,expires:'end',who:0};
 small.powerModifiers=[modifier];
 own.powerModifiers=[modifier];
 play(s,PROCHURIS,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',other)&&has(s,0,'battle',own));
 const creature=play(s,PROCHURIS,0);
 attack(s,creature.uid);
});

test('CPU casts the one-mana sweep against weak creatures and chooses the productive cost for ハヨダイス',()=>{
 let s=field();
 give(s,0,'mana',[SMALL]);
 const spell=place(s,0,'hand',PROCHURIS),enemy=place(s,1,'battle',SMALL);
 enemy.powerModifiers=[{amount:-1000,expires:'end',who:0}];
 const cast=e.chooseAI(s);
 assert.equal(cast.kind,'play');
 assert.equal(cast.uid,spell.uid);
 assert.equal(cast.face,1);
 e.step(s,cast);
 assert.ok(has(s,1,'grave',enemy));

 s=field();
 place(s,1,'battle','dm01-105');
 const pair=[place(s,1,'battle',SMALL),place(s,1,'battle',ONI)];
 play(s,DICE);
 const choice=e.chooseAI(s);
 assert.equal(values(s)[choice.choice],2);
 e.step(s,choice);
 assert.ok(pair.every(x=>has(s,1,'grave',x)));
});
