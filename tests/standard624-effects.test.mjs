import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-624.json',import.meta.url)));
const MATTE='dm22rp1-044', COOL='dm26ex4-083', PANDA='dmr02-054', NATURE='dm01-108', CLOCK='dmr09-021';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(NATURE));
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
function deploy(s,p,id){
 const x=put(s,p,'hand',id);
 s.extTasks=[{op:'putCreature',p,source:COOL,uid:x.uid,origin:'hand'}];
 act(s,'toAttack');
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:624}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:623}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Matte fights the multicolor entrant on a paid summon, with its bonus only in battle',()=>{
 const s=field(1),matte=put(s,0,'battle',MATTE);
 const panda=play(s,PANDA),before=physical(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.source,MATTE);
 assert.equal(e.power(matte,false,s),2000);
 assert.equal(e.matchupPower(matte,panda,false,s),5000);
 const ai=e.chooseHeuristicAI(s);
 assert.equal(s.decision.choices[ai.choice].value,true);
 pick(s,true);drain(s);
 assert.ok(s.players[0].battle.includes(matte));
 assert.ok(s.players[1].grave.includes(panda));
 assert.deepEqual(physical(s),before);
});

test('Matte ignores allied or single-color entries and may decline a battle',()=>{
 const s=field();
 const matte=put(s,0,'battle',MATTE);
 play(s,PANDA);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,NATURE);
 assert.equal(s.decision,null);
 const panda=play(s,PANDA);
 pick(s,null);
 assert.ok(s.players[0].battle.includes(matte));
 assert.ok(s.players[1].battle.includes(panda));
});

test('Cool distinguishes paid summons from effect deployment and shields the exact entrant',()=>{
 const s=field(1),cool=put(s,0,'battle',COOL);
 const paid=play(s,PANDA);
 assert.equal(s.decision,null);
 const entrant=deploy(s,1,PANDA),before=physical(s);
 assert.equal(s.decision.source,COOL);
 assert.equal(s.decision.player,0);
 assert.match(s.decision.title,/シールド化/);
 pick(s,true);drain(s);
 assert.ok(s.players[0].battle.includes(cool));
 assert.ok(s.players[1].battle.includes(paid));
 assert.ok(s.players[1].shields.includes(entrant));
 assert.deepEqual(physical(s),before);
});

test('Cool also reacts to a free summon by Shield Trigger and can decline',()=>{
 const s=field(),attacker=put(s,0,'battle',NATURE);
 put(s,0,'battle',COOL);
 give(s,1,'shields',[CLOCK]);
 const shield=s.players[1].shields[0],before=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');act(s,'useTrigger');
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===COOL);
 assert.equal(s.decision.source,COOL);
 pick(s,null);drain(s);
 assert.ok(s.players[1].battle.includes(shield));
 assert.deepEqual(physical(s),before);
});

test('Cool ignores allies deployed without tapping mana',()=>{
 const s=field();
 put(s,0,'battle',COOL);
 const ally=deploy(s,0,NATURE);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.includes(ally));
});

test('CPU deploys its first entry response before a competing two-mana play',()=>{
 const s=field(1);
 give(s,1,'mana',['dm01-075','dm01-097']);
 const cool=put(s,1,'hand',COOL);
 put(s,1,'hand','dm23ex3-021');
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.kind,'play');
 assert.equal(action.uid,cool.uid);
});
