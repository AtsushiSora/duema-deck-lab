import test from 'node:test';import assert from 'node:assert/strict';
import {e,PRESETS,data,target,DOGI,VEG,GEN,GG,DREAM,ROD,Y,KIRA,RS,ONI,inst,give,act,setup,cast,attack,drain} from './target-fixture.mjs';

const conserve=s=>{const cards=e.physicalCards(s);assert.equal(cards.length,80);assert.equal(new Set(cards.map(x=>x.uid)).size,80);};
test('one thousand games of the complete unchanged forty-card list finish against itself and practice opponents with eighty unique cards at every action',()=>{
 const counts={};let decisions=0;const totals={games:0,wins:0,losses:0};
 for(let n=0;n<1000;n++){
  const opponent=n%4===0?target:PRESETS[n%PRESETS.length],s=e.createGame([target,opponent],{seed:Math.imul(n+1,100003)>>>0,first:n%2});
  while(s.winner===null&&s.actions<2500&&s.turn<160){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);conserve(s);if(s.decision)decisions++;if(s.actions%29===0){const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));assert.deepEqual(e.chooseAI(restored),e.chooseAI(s));}}
  assert.notEqual(s.winner,null,JSON.stringify({n,turn:s.turn,actions:s.actions,decision:s.decision}));for(const event of s.log)counts[event.type]=(counts[event.type]||0)+1;totals.games++;totals[s.winner===0?'wins':'losses']++;
 }
 for(const type of ['dddDeclare','dddSummon','deploy','gNeoReplace','manaGuard','escape','exLifeReplace','triggerPrevented','judgeResult','hyper'])assert.ok(counts[type]>0,type);assert.ok(decisions>1000);assert.equal(totals.games,1000);
});
test('complete-deck games replay deterministically and scoring never mutates game state or reads future deck order',()=>{
 for(const seed of [13,103,1003]){const s=e.createGame([target,target],{seed,first:seed%2});for(let n=0;n<100&&s.winner===null;n++){const before=structuredClone(s),choice=e.chooseAI(s);assert.deepEqual(s,before);const v=e.observation(s,choice.player);assert.ok(v.players[1-choice.player].hand.every(x=>x.hidden&&!x.cardId));assert.ok(v.players.every(x=>!('deck'in x)&&typeof x.shields==='number'));e.step(s,choice);}assert.deepEqual(e.runGame([target,target],{seed}),e.runGame([target,target],{seed}));}
});
test('random legal manual choices preserve cards and avoid inaccessible or non-serializable decisions',()=>{
 for(let seed=1;seed<=60;seed++){const s=e.createGame([target,target],{seed:seed*173,first:seed%2}),r={rng:seed};for(let n=0;n<600&&s.winner===null;n++){const options=e.getLegalActions(s);assert.ok(options.length);const a=options[Math.floor(e.random(r)*options.length)];e.step(s,a);conserve(s);const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));}}
});
test('the production simulation worker accepts the completed tournament list and emits usable results and statistics',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{await import('../dist/worker.js?complete-target');await self.onmessage({data:{cards:data.cards,deck:target,opponents:[target,PRESETS[0]],count:20,first:'random',seed:1313}});assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages));const done=messages.find(x=>x.type==='done');assert.ok(done);assert.equal(done.results.length,2);for(const result of done.results){assert.equal(result.games.length,20);assert.equal(result.stats.completed,20);assert.equal(result.stats.unresolved,0);assert.ok(Number.isFinite(result.stats.rate));assert.equal(result.stats.groups[0].count,10);assert.equal(result.stats.groups[1].count,10);assert.ok(result.games.every(x=>x.version===e.ENGINE_VERSION));}assert.equal(messages.filter(x=>x.type==='progress').at(-1).completed,40);}finally{delete globalThis.self;delete globalThis.postMessage;}
});
test('battle winning draws wait for destruction replacements and still resolve before Slayer kills the winner',()=>{
 const s=setup();give(s,0,'battle',[ONI,VEG]);give(s,1,'battle',['dm01-088']);const foe=s.players[1].battle[0];foe.tapped=true;attack(s,s.players[0].battle[0].uid,foe.uid);act(s,'noBlock');assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===0);assert.equal(s.decision.type,'leaveReplace');act(s,'replaceMana');for(let i=0;i<3;i++)act(s,'leaveMana');assert.ok(s.players[0].battle.some(x=>x.cardId===ONI));assert.ok(s.log.findIndex(x=>x.type==='battleWin')<s.log.findIndex(x=>x.type==='manaGuard'));
});
