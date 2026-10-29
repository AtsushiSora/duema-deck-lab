import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manualModel} from '../dist/manual-ui.js';
import {UTILITY162_DECKS} from '../tools/fixtures/utility162.mjs';
const H='dm24rp2-OR1',N='dm01-108',F='dm01-097',W='dm01-075',HIGH='dmbd15-be5',SPELL='dm01-027';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&(s.decision.choices[a.choice].value===v||s.decision.choices[a.choice].value?.uid===v));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
const fixture=(other=[])=>{const s=setup();give(s,0,'battle',[H,...other]);give(s,0,'deck',Array(10).fill(N));return s;};
const beginAttack=(s,x=s.players[0].battle[0])=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const cast=(s,id)=>{s.players[0].hand.push(inst(id));act(s,'play',a=>a.cardId===id);drain(s);};

test('Bolshack Hyper Dragon is one supported name with both verified official modes, artwork and legal forty-card decks',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-162.json',import.meta.url))),r=createCatalogue(snapshot,data.cards,details),row=m.cards[0],c=e.card(H);assert.equal(m.cards.length,1);assert.equal(c.supportBatch,'phase-162');assert.equal(r.get(H).supported,true);assert.deepEqual(row.faces,details.cards.find(x=>x.id===H).faces);assert.equal(row.verification.facesMatched,true);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(row.image,CARD_IMAGES[H]);assert.equal(c.limit,m.regulationVerification.limits[H]);assert.equal(c.cost,5);assert.equal(c.power,5000);assert.equal(c.hyper.power,11000);assert.equal(c.hyper.breaker,2);assert.match(c.text,/【ハイパーモード】/);for(const d of UTILITY162_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(r.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);}
});

test('cost-five speed aura includes the source and all civilizations, but not opposing or higher-cost creatures',()=>{
 const s=fixture([N,W,HIGH]);for(const x of s.players[0].battle)x.entered=s.turn;give(s,1,'battle',[W]);s.players[1].battle[0].entered=s.turn;assert.ok(s.players[0].battle.slice(0,3).every(x=>e.effectiveCard(x,s).speedAttacker));assert.ok(!e.effectiveCard(s.players[0].battle[3],s).speedAttacker||e.card(HIGH).speedAttacker);assert.ok(!e.effectiveCard(s.players[1].battle[0],s).speedAttacker);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[0].uid));
 const t=fixture([N,'dm01-s08']);assert.ok(!e.effectiveCard(t.players[0].battle[2],t).speedAttacker);t.players[0].grave.push(t.players[0].battle.shift());assert.ok(!e.effectiveCard(t.players[0].battle[0],t).speedAttacker);
});

test('OVER hyper requires two distinct other untapped creatures, pays together, and serializes between choices',()=>{
 let s=fixture([N,F,W]);const source=s.players[0].battle[0],donors=s.players[0].battle.slice(1,3).map(x=>x.uid);act(s,'hyper');assert.equal(s.decision.task.n,2);assert.match(manualModel(s).help,/2体/);assert.ok(!s.decision.choices.some(x=>x.value===source.uid));pick(s,donors[0]);assert.ok(s.players[0].battle.every(x=>!x.tapped));assert.match(manualModel(s).progress,/1 \/ 2体/);assert.ok(!s.decision.choices.some(x=>x.value===donors[0]));s=JSON.parse(JSON.stringify(s));pick(s,donors[1]);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,2);assert.equal(s.players[0].battle[0].hyperActive,true);assert.equal(e.power(s.players[0].battle[0],false,s),11000);assert.equal(e.effectiveCard(s.players[0].battle[0],s).breaker,2);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='hyper'&&a.uid===source.uid));
});

test('OVER hyper cannot be paid with one body, tapped bodies, seeds, seals or the source, and may be cancelled',()=>{
 for(const others of [[],[N],[N,'dm22ex2-050']]){const s=fixture(others);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='hyper'));}
 for(const flag of ['tapped','sealed']){const s=fixture([N,F]);s.players[0].battle[1][flag]=true;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='hyper'));}
 const s=fixture([N,F]);act(s,'hyper');pick(s,s.players[0].battle[1].uid);pick(s,null);assert.ok(s.players[0].battle.every(x=>!x.tapped&&!x.hyperActive));assert.ok(e.getLegalActions(s).some(a=>a.kind==='hyper'));
});

test('normal one-creature hyper cards still require and tap only one other creature',()=>{
 const existing=data.cards.find(c=>c.hyperTap===true&&c.g49Hatter);assert.ok(existing);const s=setup();give(s,0,'battle',[existing.id,N]);act(s,'hyper');assert.equal(s.decision.task.n,1);pick(s,s.players[0].battle[1].uid);assert.equal(s.players[0].battle[1].tapped,true);assert.equal(s.players[0].battle[0].hyperActive,true);
});

test('OVER mode persists during the opposing turn and ends at the next own start, including suppression of its other abilities',()=>{
 const s=fixture([N,F]);act(s,'hyper');pick(s,s.players[0].battle[1].uid);pick(s,s.players[0].battle[2].uid);end(s);assert.equal(s.active,1);assert.equal(e.power(s.players[0].battle[0],false,s),11000);end(s);assert.equal(s.active,0);assert.ok(!s.players[0].battle[0].hyperActive);assert.equal(e.power(s.players[0].battle[0],false,s),5000);
 const t=fixture([N,F]);t.players[0].battle[0].hyperActive=true;give(t,1,'battle',[GEN]);assert.equal(e.power(t.players[0].battle[0],false,t),11000);assert.ok(!e.effectiveCard(t.players[0].battle[0],t).breaker);assert.ok(!e.effectiveCard(t.players[0].battle[1],t).speedAttacker);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='hyper'));
});

test('attack privately looks at one top card and optionally puts its physical cost-five-or-less creature without summoning',()=>{
 let s=fixture();give(s,0,'deck',[F,N,N,N]);const uid=s.players[0].deck[0].uid,all=physical(s);beginAttack(s);assert.equal(s.decision.task.name,'hyperBolshackPut');assert.ok(s.log.some(x=>x.type==='look'&&!x.text.includes(e.card(F).name)));assert.ok(!s.log.some(x=>x.type==='reveal'));assert.ok(s.players[0].deck.some(x=>x.uid===uid));s=JSON.parse(JSON.stringify(s));pick(s,true);drain(s);const x=s.players[0].battle.find(x=>x.uid===uid);assert.ok(x);assert.ok(x.g34Delayed);assert.ok(e.effectiveCard(x,s).speedAttacker);assert.ok(!s.metrics[0].played[F]);assert.deepEqual(physical(s),all);assert.ok(!s.players[0].g34Protected?.length);
});

test('declining or revealing an ineligible spell or high creature leaves that exact card on top',()=>{
 for(const id of[F,SPELL,HIGH,'dmbd09-010']){const s=fixture();give(s,0,'deck',[id,N,N]);const uid=s.players[0].deck[0].uid;beginAttack(s);assert.equal(s.decision.task.name,'hyperBolshackPut');if(e.card(id).type!=='creature'||e.card(id).cost>5)assert.ok(!s.decision.choices.some(x=>x.value===true));pick(s,false);drain(s);assert.equal(s.players[0].deck[0].uid,uid);assert.ok(!s.players[0].g34Protected?.length);}
});

test('put creatures are destroyed at turn end even after the source leaves, while returning to hand clears the delay',()=>{
 for(const bounce of[false,true]){const s=fixture();give(s,0,'deck',[F,N,N,N]);const uid=s.players[0].deck[0].uid;beginAttack(s);pick(s,true);drain(s);const i=s.players[0].battle.findIndex(x=>x.cardId===H);s.players[0].grave.push(s.players[0].battle.splice(i,1)[0]);if(bounce){s.extTasks=[{op:'g34_ExactMove',p:0,source:H,owner:0,to:'hand',target:uid}];end(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.ok(!s.players[0].hand.find(x=>x.uid===uid).g34Delayed);}else{end(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));}}
});

test('top deployment respects entry prohibition, replacement, summon-only locks and legal evolution bases',()=>{
 const s=fixture();give(s,0,'deck',[F,N,N]);give(s,1,'battle',['dm26rp1-S008']);beginAttack(s);assert.ok(!s.decision.choices.some(x=>x.value===true));pick(s,false);drain(s);
 const t=fixture();give(t,0,'deck',[H,N,N]);give(t,1,'battle',['dmx13-s02']);const uid=t.players[0].deck[0].uid;beginAttack(t);pick(t,true);drain(t);assert.ok(t.players[0].grave.some(x=>x.uid===uid));assert.ok(!t.players[0].g34Protected?.length);
 const u=fixture(['dm01-076']);give(u,0,'deck',['dm32-072',N,N]);const base=u.players[0].battle[1].uid;beginAttack(u);pick(u,true);assert.match(u.decision.title,/進化元/);pick(u,base);drain(u);assert.ok(u.players[0].battle.some(x=>x.cardId==='dm32-072'&&x.under.some(x=>x.uid===base)));
});

test('Genmu or GG suppresses the source attack trigger, and looking is blocked by Q.Q.QX.',()=>{
 for(const stopper of[GEN,GG]){const s=fixture();give(s,1,'battle',[stopper]);if(stopper===GG)s.players[1].battle[0].under=[inst(N)];beginAttack(s);assert.notEqual(s.decision?.task?.name,'hyperBolshackPut');drain(s);assert.ok(!s.players[0].g34Protected?.length);}
 const id=data.cards.find(c=>c.qqLock)?.id;assert.ok(id);const s=fixture();give(s,1,'battle',[id]);beginAttack(s);assert.notEqual(s.decision?.task?.name,'hyperBolshackPut');drain(s);assert.ok(!s.players[0].g34Protected?.length);
});

test('hyper attack-end ability counts five tapped own creatures and untaps all of them on any friendly attack',()=>{
 for(const count of[4,5]){const s=fixture(Array(5).fill(W));s.players[0].battle[0].hyperActive=true;for(const x of s.players[0].battle.slice(0,count-1))x.tapped=true;const attacker=s.players[0].battle[count-1];beginAttack(s,attacker);drain(s);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,count===5?0:4);}
 const t=fixture(Array(5).fill(W));for(const x of t.players[0].battle.slice(0,4))x.tapped=true;beginAttack(t,t.players[0].battle[4]);drain(t);assert.equal(t.players[0].battle.filter(x=>x.tapped).length,5,'normal mode does not untap');
});

test('hyper untapping excludes seeds from the threshold, respects untap locks, and observes only friendly attacks',()=>{
 const s=fixture([W,W,W,'dm22ex2-050']);s.players[0].battle[0].hyperActive=true;for(const x of s.players[0].battle)x.tapped=true;s.players[0].battle[3].tapped=false;beginAttack(s,s.players[0].battle[3]);drain(s);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,5,'a tapped non-creature seed does not make the fifth creature');
 const t=fixture(Array(5).fill(W));t.players[0].battle[0].hyperActive=true;for(const x of t.players[0].battle.slice(0,4))x.tapped=true;t.players[0].battle[1].tapLocks=[1];beginAttack(t,t.players[0].battle[4]);drain(t);assert.equal(t.players[0].battle.filter(x=>x.tapped).length,1);
 const u=fixture(Array(4).fill(W));u.players[0].battle[0].hyperActive=true;for(const x of u.players[0].battle)x.tapped=true;give(u,1,'battle',[F]);u.active=1;u.phase='attack';act(u,'attack',a=>a.target==='player');drain(u);assert.equal(u.players[0].battle.filter(x=>x.tapped).length,5);
});

test('CPU can pay OVER hyper and resolves top-deck deployment without losing physical cards',()=>{
 const s=fixture([N,F]);const before=physical(s);act(s,'hyper');drain(s);assert.equal(s.players[0].battle[0].hyperActive,true);beginAttack(s);drain(s);assert.equal(s.players[0].battle.length,4);assert.deepEqual(physical(s),before);
});

test('a last-card look can be declined safely, but putting the final card empties the library without a draw win',()=>{
 for(const use of[false,true]){const s=fixture();give(s,0,'deck',[F]);beginAttack(s);assert.equal(s.winner,null);pick(s,use);drain(s);if(use){assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);}else{assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);}}
});

test('a summon-only lock does not stop top puts, and an evolution put is still destroyed at turn end',()=>{
 const s=fixture();give(s,0,'deck',[N,F,F]);give(s,1,'battle',['dmsp02-003']);beginAttack(s);pick(s,true);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===N));
 const t=fixture(['dm01-076']);give(t,0,'deck',['dm32-072',N,N]);const uid=t.players[0].deck[0].uid,base=t.players[0].battle[1].uid;beginAttack(t);pick(t,true);pick(t,base);drain(t);end(t);assert.ok(t.players[0].grave.some(x=>x.uid===uid));assert.ok(t.players[0].grave.some(x=>x.uid===base));
});

test('GG stops attack-time deployment but not the separate attack-end untap ability',()=>{
 const s=fixture(Array(5).fill(W));s.players[0].battle[0].hyperActive=true;for(const x of s.players[0].battle.slice(0,4))x.tapped=true;give(s,1,'battle',[GG]);s.players[1].battle[0].under=[inst(N)];beginAttack(s,s.players[0].battle[4]);drain(s);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,0);assert.ok(!s.players[0].g34Protected?.length);
});

test('hyper mass-untapping notifies Miradante so the untapped creatures cannot immediately attack again',()=>{
 const s=fixture(Array(5).fill(W)),mira=data.cards.find(c=>c.g35Role==='mira').id;s.players[0].battle[0].hyperActive=true;for(const x of s.players[0].battle.slice(0,4))x.tapped=true;give(s,1,'battle',[mira]);const attacker=s.players[0].battle[4];beginAttack(s,attacker);drain(s);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,0);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[5].uid));
});

test('CPU forty-card games finish with eighty unique physical cards and a serialized continuation',()=>{
 for(const [i,deck] of UTILITY162_DECKS.entries()){
  let s=e.createGame([deck,PRESETS[0]],{seed:162001+i,first:i,maxTurns:60,maxActions:1400}),resumed=false;const before=physical(s);
  while(s.winner===null){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);assert.deepEqual(physical(s),before);assert.equal(new Set(physical(s)).size,80);if(!resumed&&s.actions>=20){const next=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(next),e.getLegalActions(s));s=next;resumed=true;}}
  assert.ok(resumed);assert.ok([0,1].includes(s.winner));assert.ok(!s.reason.includes('上限'),s.reason);
 }
});
