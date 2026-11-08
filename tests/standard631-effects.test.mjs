import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-631.json',import.meta.url)));
const WISDOM='dm25ex4-058', ABYSS='dm25rp4-068', FIRE='dm01-097';
const COMMAND='dm26ex2-020', CADDY='dm22rp1-049', SEED='dm22rp1-058', HIGH='dm01-s01';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(FIRE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:631}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:630}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Wisdom seals an enemy with the enemy library top and an on-color Command can remove it',()=>{
 const s=field(),own=s.players[0],enemy=s.players[1],victim=put(s,1,'battle',FIRE);
 const seed=put(s,1,'battle',SEED),top=enemy.deck[0],spell=play(s,WISDOM),before=physical(s);
 assert.ok(!s.decision.choices.some(q=>q.value?.uid===seed.uid));
 pick(s,victim.uid);
 assert.ok(enemy.battle.includes(victim));
 assert.equal(victim.sealed,true);
 assert.equal(enemy.seals[0],top);
 assert.equal(top.faceDown,true);
 assert.ok(own.grave.includes(spell));

 s.active=1;
 play(s,COMMAND);
 drain(s);
 assert.ok(!victim.sealed);
 assert.ok(enemy.grave.includes(top));
 assert.equal(physical(s).length,before.length+1);
});

test('Wisdom can use G Strike when broken and keeps the spell in hand',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE),later=put(s,1,'battle',FIRE);
 give(s,0,'shields',[WISDOM,FIRE]);
 const [spell]=s.players[0].shields;
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,later.uid);
 drain(s);
 assert.ok(s.players[0].hand.includes(spell));
 assert.ok(!later.sealed);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
});

test('Abyss destroys as a Shield Trigger and mills the chosen creature cost',()=>{
 const s=field(1),own=s.players[0],victim=put(s,1,'battle',FIRE);
 give(s,0,'mana',[]);
 give(s,0,'shields',[ABYSS,FIRE]);
 const [spell]=own.shields,top=own.deck.slice(0,2),before=physical(s);
 attack(s,victim.uid);act(s,'noBlock');
 const trigger=e.chooseHeuristicAI(s);
 assert.equal(trigger.kind,'useTrigger');
 e.step(s,trigger);
 pick(s,victim.uid);
 assert.ok(s.players[1].grave.includes(victim));
 assert.ok(own.grave.includes(spell));
 assert.ok(top.every(x=>own.grave.includes(x)));
 assert.equal(own.deck.length,14);
 assert.deepEqual(physical(s),before);
});

test('Abyss still mills when the selected creature replaces destruction and mills nothing without a target',()=>{
 const s=field(),victim=put(s,1,'battle',CADDY);
 play(s,ABYSS);
 pick(s,victim.uid);
 drain(s);
 assert.ok(s.players[1].mana.includes(victim));
 assert.equal(s.players[0].deck.length,14);

 const empty=field();
 play(empty,ABYSS);
 assert.equal(empty.decision,null);
 assert.equal(empty.players[0].deck.length,16);
});

test('Abyss CPU target selection avoids exhausting its own library',()=>{
 const s=field(),cheap=put(s,1,'battle',FIRE),expensive=put(s,1,'battle',HIGH);
 give(s,0,'deck',[FIRE,FIRE,FIRE]);
 play(s,ABYSS);
 const ranked=e.rankHeuristicActions(s);
 assert.equal(s.decision.choices[ranked[0].a.choice].value.uid,cheap.uid);
 assert.equal(ranked.find(q=>s.decision.choices[q.a.choice].value.uid===expensive.uid).value,-1000);
});
