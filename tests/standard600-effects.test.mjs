import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-600.json',import.meta.url)));
const WASH='dm25rp1-034', FLEET='dm25rp4-056', SIDIEN='dmrp02-035', BARON='dmd16-004', MOMO='dmrp19-021';
const LIGHT='dm01-075', NATURE='dm01-105', TWO='dm01-083', HIGH='dm02-002', EVO='dm02-s02', RAMP='dm01-106';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(LIGHT));
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

function deploy(s,p,id){
 const x=place(s,p,'hand',id);
 s.extTasks=[{op:'putCreature',p,source:WASH,uid:x.uid,origin:'hand'}];
 act(s,'toAttack');
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:600}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:599}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('洗打 can return an untargetable entrant on either turn, with the choice preserved across reload',()=>{
 for(const active of [0,1]){
  const s=field(active);
  give(s,0,'mana',[TWO]);
  place(s,1,'battle',WASH);
  const entrant=deploy(s,0,'dmrp01-041');
  assert.equal(s.decision.player,1);
  assert.match(s.decision.title,/手札に戻す/);
  const loaded=JSON.parse(JSON.stringify(s));
  pick(loaded,true);
  assert.ok(has(loaded,0,'hand',entrant));
  assert.ok(!has(loaded,0,'battle',entrant));
  act(s,'extended',a=>values(s)[a.choice]!==true);
  assert.ok(has(s,0,'battle',entrant));
 }
});

test('洗打 checks the number of mana cards after the opposing entry ability has resolved',()=>{
 for(const mana of [1,2,3]){
  const s=field();
  give(s,0,'mana',Array(mana).fill(NATURE));
  place(s,1,'battle',WASH);
  const entrant=deploy(s,0,RAMP);
  assert.equal(s.players[0].mana.length,mana+1);
  if(mana===1)pick(s,true);
  assert.equal(s.decision,null);
  assert.equal(has(s,0,'hand',entrant),mana===1);
  assert.equal(has(s,0,'battle',entrant),mana>1);
 }
});

test('ペナルティフリート triggers from a shield and can bottom an evolution but not equal-cost creatures',()=>{
 const s=field(1);
 give(s,1,'mana',Array(2).fill(TWO));
 give(s,0,'shields',[FLEET,LIGHT]);
 const attacker=place(s,1,'battle',HIGH),equal=place(s,1,'battle',TWO),evolved=place(s,1,'battle',EVO);
 attack(s,attacker.uid);
 act(s,'noBlock');
 const trigger=e.getLegalActions(s).find(a=>a.kind==='useTrigger'&&a.cardId===FLEET);
 assert.ok(trigger);
 e.step(s,trigger);
 assert.deepEqual(new Set(values(s)),new Set([attacker.uid,evolved.uid]));
 pick(s,evolved.uid);
 assert.equal(s.players[1].deck.at(-1).uid,evolved.uid);
 assert.ok(has(s,1,'battle',equal));
 assert.ok(s.players[0].battle.some(x=>e.card(x.cardId).blocker));
});

test('シディアン shields each eligible non-evolution without choosing it',()=>{
 const s=field();
 give(s,1,'mana',[TWO,TWO]);
 s.players[1].mana[1].faceDown=true;
 const a=place(s,1,'battle','dm23rp3-015'),b=place(s,1,'battle',NATURE),equal=place(s,1,'battle',TWO),evolved=place(s,1,'battle',EVO);
 a.justDiverActive=true;
 const count=s.players[1].shields.length;
 const spell=place(s,0,'hand',SIDIEN);
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.uid,spell.uid);
 e.step(s,action);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,count+2);
 assert.ok(has(s,1,'shields',a)&&has(s,1,'shields',b));
 assert.ok(has(s,1,'battle',equal)&&has(s,1,'battle',evolved));
});

test('バロンアルデ only ramps when behind and モモスター checks after moving the creature',()=>{
 for(const enemyMana of [3,4]){
  const s=field(),top=s.players[0].deck[0];
  give(s,0,'mana',Array(3).fill(LIGHT));
  give(s,1,'mana',Array(enemyMana).fill(TWO));
  play(s,BARON);
  assert.equal(has(s,0,'mana',top),enemyMana===4);
 }
 const s=field(),top=s.players[0].deck[0],enemy=place(s,1,'battle',HIGH);
 give(s,0,'mana',Array(5).fill(NATURE));
 give(s,1,'mana',Array(5).fill(TWO));
 const spell=play(s,MOMO);
 pick(s,enemy.uid);
 assert.ok(has(s,0,'grave',spell));
 assert.ok(has(s,1,'mana',enemy)&&has(s,0,'mana',top));
});
