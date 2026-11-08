import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-628.json',import.meta.url)));
const DEPTH='dm25rp3-036', BANANA='dm26rp2-057', FIRE='dm01-097';

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
 assert.deepEqual(standardCardSpec(detail,{phase:628}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:627}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Depth returns up to two creatures across both boards, then draws',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',FIRE);
 const unchosen=put(s,1,'battle',FIRE),top=s.players[0].deck[0];
 play(s,DEPTH);
 const before=physical(s);
 assert.match(s.decision.choices.find(q=>q.value?.uid===ally.uid).label,/^自分/);
 assert.match(s.decision.choices.find(q=>q.value?.uid===enemy.uid).label,/^相手/);
 pick(s,ally.uid);
 assert.ok(s.players[0].battle.includes(ally));
 pick(s,enemy.uid);
 assert.ok(s.players[0].hand.includes(ally));
 assert.ok(s.players[1].hand.includes(enemy));
 assert.ok(s.players[1].battle.includes(unchosen));
 assert.ok(s.players[0].hand.includes(top));
 assert.deepEqual(physical(s),before);
});

test('Depth can leave all creatures in play and still draws with Shield Trigger',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE),top=s.players[0].deck[0];
 give(s,0,'shields',[DEPTH]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 pick(s,null);
 assert.ok(s.players[1].battle.includes(attacker));
 assert.ok(s.players[0].hand.includes(top));
});

test('Depth can be cast for three with DDD before blockers are chosen',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle','dm01-076');
 const spell=put(s,0,'hand',DEPTH);
 attack(s,ally.uid);
 assert.equal(e.chooseHeuristicAI(s).kind,'declareDDD');
 act(s,'declareDDD');
 assert.equal(e.chooseHeuristicAI(s).kind,'summonDDD');
 act(s,'summonDDD',a=>a.uid===spell.uid&&a.cost===3);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 pick(s,enemy.uid);pick(s,null);
 assert.ok(s.players[1].hand.includes(enemy));
 assert.ok(s.players[0].battle.includes(ally));
 act(s,'noBlock');drain(s);
});

test('Banana untaps an ally via Shield Trigger and keeps it buffed for the remaining attacks',()=>{
 const s=field(1),ally=put(s,0,'battle',FIRE),first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 give(s,0,'shields',[BANANA]);
 ally.tapped=true;
 const base=e.power(ally,false,s),before=physical(s);
 attack(s,first.uid);act(s,'noBlock');
 const trigger=e.chooseHeuristicAI(s);
 assert.equal(trigger.kind,'useTrigger');
 e.step(s,trigger);
 pick(s,ally.uid);
 assert.equal(ally.tapped,false);
 assert.equal(e.power(ally,false,s),base+4000);
 assert.equal(e.effectiveCard(ally,s).blocker,true);
 attack(s,second.uid);act(s,'block',a=>a.uid===ally.uid);drain(s);
 assert.ok(s.players[1].grave.includes(second));
 act(s,'endTurn');drain(s);
 assert.equal(s.active,0);
 assert.equal(e.power(ally,false,s),base);
 assert.equal(!!e.effectiveCard(ally,s).blocker,false);
 assert.deepEqual(physical(s),before);
});

test('Banana can grant power and blocker even if its chosen creature cannot untap',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE);
 ally.tapped=true;ally.tapLocks=[1];
 const base=e.power(ally,false,s);
 play(s,BANANA);pick(s,ally.uid);
 assert.equal(ally.tapped,true);
 assert.equal(e.power(ally,false,s),base+4000);
 assert.equal(e.effectiveCard(ally,s).blocker,true);
});
