import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-629.json',import.meta.url)));
const MAGICIAN='dm25rp2-015', ECHO='dm25rp3-037', FIRE='dm01-097';
const TWIN='dm23sd3-007', SEED='dm22rp1-058', CASTLE='dm26rp1-057';

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
 assert.deepEqual(standardCardSpec(detail,{phase:629}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:628}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Magician enters as a blocker and draws once when summoned without evolving',()=>{
 const s=field(),top=s.players[0].deck[0],magician=play(s,MAGICIAN);
 act(s,'evolve',a=>!a.baseUid);
 assert.ok(s.players[0].battle.includes(magician));
 assert.equal(e.effectiveCard(magician,s).blocker,true);
 assert.deepEqual(s.players[0].hand,[top]);
 assert.equal(s.decision,null);
});

test('Magician draws twice when evolved from Shield Trigger and exchanges a shield without triggering it',()=>{
 const s=field(1),own=s.players[0],attacker=put(s,1,'battle',FIRE);
 const base=put(s,0,'battle','dm01-076'),ineligible=put(s,0,'battle',FIRE);
 give(s,0,'shields',[MAGICIAN,MAGICIAN]);
 const [trigger,keep]=own.shields,[top,next]=own.deck,before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===trigger.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.baseUid===ineligible.uid));
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 assert.deepEqual(own.hand,[top,next]);
 assert.equal(own.battle.find(x=>x.uid===trigger.uid).under[0].uid,base.uid);
 pick(s,top.uid);
 pick(s,keep.uid);
 assert.ok(own.hand.includes(keep));
 assert.ok(own.shields.includes(top));
 assert.equal(s.triggers,null);
 assert.deepEqual(physical(s),before);
});

test('Magician avoids an extra draw that would empty the CPU library',()=>{
 const s=field(),base=put(s,0,'battle','dm01-076');
 give(s,0,'deck',[FIRE,FIRE]);
 play(s,MAGICIAN);
 const ranked=e.rankHeuristicActions(s);
 assert.equal(ranked.find(q=>q.a.baseUid===base.uid).value,-1000);
 assert.equal(ranked[0].a.kind,'evolve');
 assert.ok(!ranked[0].a.baseUid);
});

test('Echo draws before choosing and uses the spell face of a Twinpact without paying extra mana',()=>{
 const s=field(),own=s.players[0],ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',FIRE);
 const echo=put(s,0,'hand',ECHO),expensive=put(s,0,'hand','dm01-040');
 put(s,0,'hand',FIRE);
 give(s,0,'deck',[TWIN,FIRE,FIRE]);
 const drawn=own.deck[0],before=physical(s);
 attack(s,ally.uid);
 act(s,'declareDDD');act(s,'summonDDD',a=>a.uid===echo.uid&&a.cost===2);
 const targets=s.decision.choices.filter(q=>q.value).map(q=>q.value);
 assert.deepEqual(targets,[{uid:drawn.uid,face:1,origin:'hand'}]);
 pick(s,drawn.uid);drain(s);
 assert.ok(own.grave.includes(echo));
 assert.ok(own.grave.includes(drawn));
 assert.ok(own.hand.includes(expensive));
 assert.equal(own.mana.filter(x=>x.tapped).length,2);
 assert.deepEqual(physical(s),before);
});

test('the CPU uses Echo during an attack to deploy a cheap Tamaseed and can also skip',()=>{
 const s=field(),own=s.players[0],ally=put(s,0,'battle',FIRE);
 put(s,0,'hand',ECHO);
 const seed=put(s,0,'hand',SEED);
 attack(s,ally.uid);
 assert.equal(e.chooseHeuristicAI(s).kind,'declareDDD');
 act(s,'declareDDD');
 assert.equal(e.chooseHeuristicAI(s).kind,'summonDDD');
 act(s,'summonDDD');
 const followUp=e.chooseHeuristicAI(s);
 assert.equal(s.decision.choices[followUp.choice].value.uid,seed.uid);
 e.step(s,followUp);
 assert.ok(own.battle.includes(seed));
 assert.equal(own.mana.filter(x=>x.tapped).length,2);

 const t=field(),castle=put(t,0,'hand',CASTLE);
 play(t,ECHO);
 assert.ok(t.decision.choices.some(q=>q.value?.uid===castle.uid));
 pick(t,null);
 assert.ok(t.players[0].hand.includes(castle));

 const next=field(),fortification=put(next,0,'hand',CASTLE);
 play(next,ECHO);
 pick(next,fortification.uid);
 assert.ok(next.players[0].shields.includes(fortification));
 assert.equal(fortification.faceUp,true);
 assert.equal(next.players[0].mana.filter(x=>x.tapped).length,4);
});
