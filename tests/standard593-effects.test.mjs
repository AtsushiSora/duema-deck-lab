import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-593.json',import.meta.url)));
const COTTON='dm23ex3-012', BANNO='dm24rp3-052', CONTRADICTION='dm25rp2-023';
const CANNON='dmrp19-070', CAMP='dmrp10-103', MANDRAKE='dmr21-084';
const FAST='dmrp08-083', LOW='dm01-097', MID='dm01-066', HIGH='dm01-s04';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(LOW));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,filter=()=>true){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&filter(a));
 return x;
}
function pick(s,uid){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
}
function attacks(s,x,target='player'){
 s.phase='attack';
 return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
}
function end(s){s.phase='attack';act(s,'endTurn');s.phase='main';}
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

for(const row of cards)test(row.name+' matches the official printing and complete definition',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:593}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:592}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('entry watchers restrict only the actual entrant and keep the resolved lock after removal',()=>{
 for(const id of [COTTON,BANNO,CONTRADICTION]){
  const s=field(),existing=place(s,0,'battle',FAST);
  const watcher=place(s,1,'battle',id);
  const stopped=play(s,FAST);
  assert.ok(attacks(s,existing));
  assert.ok(!attacks(s,stopped));
  s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==watcher.uid);
  assert.ok(!attacks(s,stopped));
  s.phase='main';
  const unstopped=play(s,FAST);
  assert.ok(attacks(s,unstopped));
  end(s);end(s);
  assert.ok(attacks(s,stopped));
 }
});

test('万能バンノー draws, and ～驚異的な矛盾～ retaliates when selected',()=>{
 const s=field(),top=s.players[0].deck[0];
 play(s,BANNO);
 assert.ok(inZone(s,0,'hand',top));
 const r=field(),target=place(r,0,'battle',LOW),guard=place(r,1,'battle',CONTRADICTION);
 play(r,'dm01-086');
 act(r,'effect',a=>a.targets.some(x=>x.uid===guard.uid));
 pick(r,target.uid);
 assert.ok(inZone(r,0,'grave',target));
 assert.ok(inZone(r,1,'hand',guard));
});

test('ジャッジ・水晶チャージャー moves an eligible enemy element and becomes face-down mana',()=>{
 const s=field(),small=place(s,1,'battle',LOW),large=place(s,1,'battle',HIGH);
 give(s,1,'mana',Array(2).fill(LOW));
 const source=play(s,COTTON,a=>a.face===1);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[large.uid]);
 pick(s,large.uid);
 assert.equal(s.players[1].deck.at(-1).uid,large.uid);
 assert.ok(inZone(s,1,'battle',small));
 const mana=s.players[0].mana.find(x=>x.uid===source.uid);
 assert.equal(mana.faceDown,true);
 assert.equal(mana.tapped,false);
});

test('龍素砲 prevents opposing attacks by current power, including late arrivals, until the caster’s turn',()=>{
 let s=field();
 const own=place(s,0,'battle',LOW);
 own.tapped=true;
 const high=place(s,1,'battle',HIGH);
 const top=s.players[0].deck[0];
 play(s,CANNON);
 assert.ok(inZone(s,0,'hand',top));
 end(s);
 const low=play(s,FAST);
 s=JSON.parse(JSON.stringify(s));
 assert.ok(!attacks(s,low));
 assert.ok(!attacks(s,low,own.uid));
 assert.ok(attacks(s,high));
 const attacker=s.players[1].battle.find(x=>x.uid===low.uid);
 attacker.powerModifiers=[{amount:4000,expires:'end',who:1}];
 assert.ok(attacks(s,low));
 attacker.powerModifiers=[];
 end(s);
 assert.ok(!(s.extLimits||[]).some(l=>l.kind==='g593AttackPower'));
});

test('ホホホイ can trigger during an attack and still allows attacks on creatures',()=>{
 const s=field(),active=place(s,0,'battle',LOW),other=place(s,0,'battle',MID),target=place(s,1,'battle',LOW);
 target.tapped=true;
 const shield=inst(CAMP);
 s.players[1].shields=[shield];
 attack(s,active.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.ok(!attacks(s,other));
 assert.ok(attacks(s,other,target.uid));
});

test('マンドレイカー applies to both players and leaves higher power free to attack',()=>{
 const s=field(),own=place(s,0,'battle',LOW),other=place(s,1,'battle',LOW),mid=place(s,1,'battle',MID);
 play(s,MANDRAKE);
 assert.ok(!attacks(s,own));
 end(s);
 assert.ok(!attacks(s,other));
 assert.ok(attacks(s,mid));
});
