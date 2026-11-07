import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-607.json',import.meta.url)));
const YAMA='dm25rp2-022', MELTEO='dm25rp4-072', FLASH='dm24ex2-056', SHADOW='dm25ex4-S15';
const WATER='dm01-083', FIRE='dm01-097', SEED='dmrp22-025', REVIVE='dmc44-001';
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
 assert.deepEqual(standardCardSpec(detail,{phase:607}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:606}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('GO-YAMA-58 prevents an opposing grave deployment and allows the opponent to play cards from hand',()=>{
 const s=field(1),gate=place(s,0,'battle',YAMA),target=place(s,1,'grave',WATER);
 play(s,REVIVE);
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.decision,null);
 for(const origin of ['deck','mana','grave','extra']){
  assert.equal(e.canEnterCreature(s,1,e.card(SEED),{origin,execution:false}),false);
  assert.equal(e.canEnterCreature(s,0,e.card(SEED),{origin,execution:false}),true);
 }
 assert.ok(has(s,1,'battle',play(s,WATER)));
 assert.ok(has(s,1,'battle',play(s,SEED)));
 s.players[0].battle.splice(s.players[0].battle.indexOf(gate),1);
 play(s,REVIVE);
 pick(s,target.uid);
 assert.ok(has(s,1,'battle',target));
});

test('the GO-YAMA-58 Super Soul grants stack power and a breaker without inheriting the entry lock',()=>{
 const s=field(),host=place(s,0,'battle',WATER);
 host.under=[inst(YAMA)];
 assert.equal(e.power(host,false,s),1000);
 host.under.push(inst(SEED));
 assert.equal(e.power(host,false,s),7000);
 assert.equal(e.effectiveCard(host,s).poweredBreaker,true);
 assert.equal(e.canEnterCreature(s,1,e.card(WATER),{origin:'grave',execution:false}),true);
 const yama=place(s,0,'battle',YAMA);
 yama.under=[inst(WATER),inst(SEED)];
 assert.equal(e.power(yama,false,s),9000);
});

test('a GO-YAMA-58 on the opposing board allows a creature’s shield trigger from hand',()=>{
 const s=field(1),gate=place(s,1,'battle',YAMA),seed=place(s,1,'battle',SEED);
 give(s,0,'shields',[MELTEO]);
 const trigger=s.players[0].shields[0];
 attack(s,gate.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.deepEqual(values(s),[seed.uid]);
 pick(s,seed.uid);
 assert.ok(has(s,0,'battle',trigger)&&has(s,1,'grave',seed));
 assert.equal(e.power(trigger,false,s),1000);
 assert.equal(e.matchupPower(trigger,gate,false,s),4000);
});

test('a host inherits the Melteo battle bonus without the entry effect',()=>{
 const s=field(),host=place(s,0,'battle',WATER),enemy=place(s,1,'battle',FIRE);
 host.under=[inst(MELTEO)];
 assert.equal(e.power(host,false,s),1000);
 assert.equal(e.matchupPower(host,enemy,false,s),4000);
 assert.equal(e.effectiveCard(host,s).g34Tasks,undefined);
});

test('邪閃光 returns an element to the deck and gains its second mode from an Abyss',()=>{
 for(const withAbyss of [false,true]){
  const s=field(),target=place(s,1,'battle',SEED),enemy=place(s,1,'battle',WATER);
  if(withAbyss)place(s,0,'battle',MELTEO);
  play(s,FLASH);
  assert.deepEqual(values(s),withAbyss?[0,1,2]:[0,1]);
  pick(s,withAbyss?2:0);pick(s,target.uid);
  assert.equal(s.players[1].deck.at(-1).uid,target.uid);
  assert.equal(enemy.tapped,withAbyss);
 }
});

test('リュウセイ・シャドウ enters without an optional prompt when an enemy spell or seed discards it',()=>{
 for(const source of ['dm01-094','dmsd21-011']){
  const s=field(),shadow=place(s,1,'hand',SHADOW),small=place(s,0,'battle',WATER);
  play(s,source);
  assert.ok(has(s,1,'battle',shadow)&&!has(s,1,'grave',shadow));
  assert.equal(s.decision.player,1);
  pick(s,0);
  assert.ok(has(s,0,'grave',small));
 }
});

test('リュウセイ・シャドウ can place a large creature in mana when played normally',()=>{
 const s=field(),large=place(s,1,'battle','dmrp05-002');
 play(s,SHADOW);
 pick(s,1);pick(s,large.uid);
 assert.ok(has(s,1,'mana',large));
});

test('リュウセイ・シャドウ stays a normal discard when discarded by its own player’s spell',()=>{
 const s=field(),shadow=place(s,0,'hand',SHADOW);
 play(s,'dm11-043');
 pick(s,0);pick(s,shadow.uid);
 assert.ok(has(s,0,'grave',shadow)&&!has(s,0,'battle',shadow));
});
