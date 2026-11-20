// Preserve the original No13 seeds and assertions while running one bounded part.
import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
import{e,data,details,snapshot}from'../tests/target-fixture.mjs';import{createCatalogue,nameKey}from'../dist/catalogue.js';import{resolveStarter25Decks}from'../dist/starter25.js';import{resolveEnvironmentDecks}from'../dist/environment.js';
const registry=createCatalogue(snapshot,data.cards,details),decks=resolveStarter25Decks(registry),target=decks[12],opponents=[...decks.filter(x=>!registry.coverage(x).unsupported),...resolveEnvironmentDecks(registry)];
const hash=f=>createHash('sha256').update(fs.readFileSync(new URL('../'+f,import.meta.url))).digest('hex');
const sources=()=>Object.fromEntries(['tests/abyss-effects.test.mjs','tests/target-fixture.mjs','dist/cards.json','dist/catalogue.json','dist/details.json',...fs.readdirSync(new URL('../dist',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>'dist/'+f)].sort().map(f=>[f,hash(f)]));
const conserve=s=>{const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);};
const [mode,planPath,ordinalText]=process.argv.slice(2);assert.ok(planPath);
if(mode==='plan'){
 const cases=[];for(let opponent=0;opponent<opponents.length;opponent++)for(let seed=1;seed<=4;seed++)cases.push({kind:'ai',opponent,seed:seed*397,first:seed%2});
 for(let seed=1;seed<=28;seed++)cases.push({kind:'random',opponent:seed%opponents.length,seed:seed*401,randomSeed:seed,first:seed%2});
 for(let opponent=0;opponent<opponents.length;opponent++)for(let game=0;game<10;game++)cases.push({kind:'worker',opponent,game,seed:(4013+Math.imul(game+1,2654435761)+Math.imul(opponent,2246822519))>>>0,first:game%2});
 const plan={engineVersion:e.ENGINE_VERSION,aiVersion:e.AI_VERSION,supportedNames:new Set(data.cards.map(c=>nameKey(c.name))).size,sourceHashes:sources(),target,opponents,cases};fs.mkdirSync(path.dirname(planPath),{recursive:true});fs.writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({cases:cases.length,opponents:opponents.length,ai:opponents.length*4,random:28,worker:opponents.length*10}));
}else if(mode==='run'){
 const plan=JSON.parse(fs.readFileSync(planPath));assert.equal(plan.engineVersion,e.ENGINE_VERSION);assert.deepEqual(sources(),plan.sourceHashes);assert.deepEqual(target,plan.target);assert.deepEqual(opponents,plan.opponents);const ordinal=Number(ordinalText),row=plan.cases[ordinal];assert.ok(row);const start=Date.now(),other=opponents[row.opponent];console.log(JSON.stringify({event:'start',ordinal,...row,opponentId:other.id}));let result;
 if(row.kind==='ai'){
  const s=e.createGame([target,other],{seed:row.seed,first:row.first});while(s.winner===null&&s.actions<2500){const a=e.chooseAI(s);assert.ok(a,'deadlock '+other.id);e.step(s,a);conserve(s);}assert.notEqual(s.winner,null,other.id+' seed'+row.seed);assert.deepEqual(e.runGame([target,other],{seed:row.seed,first:row.first}),s);result={actions:s.actions,winner:s.winner,turns:s.turn};
 }else if(row.kind==='random'){
  const s=e.createGame([target,other],{seed:row.seed,first:row.first}),rng={rng:row.randomSeed};let steps=0;for(;steps<800&&s.winner===null;steps++){const actions=e.getLegalActions(s);assert.ok(actions.length);e.step(s,actions[Math.floor(e.random(rng)*actions.length)]);conserve(s);const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));assert.deepEqual(e.chooseAI(restored),e.chooseAI(s));}result={steps,actions:s.actions,winner:s.winner,turns:s.turn};
 }else{
  const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{
   await import('../dist/worker.js?abyss13-shard');
   // Count one resets worker indices. Offset its input seed to retain the exact
   // original opponent/game seed and explicitly retain the original first player.
   const seed=(row.seed-Math.imul(1,2654435761))>>>0;
   await self.onmessage({data:{cards:data.cards,deck:target,opponents:[other],count:1,first:row.first?'second':'first',seed}});
   assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages.filter(x=>x.type==='error')));const done=messages.filter(x=>x.type==='done');assert.equal(done.length,1);assert.equal(done[0].results.length,1);const r=done[0].results[0];assert.equal(r.stats.completed,1,JSON.stringify(r));assert.equal(r.stats.unresolved,0);assert.equal(r.games.length,1);assert.equal(r.games[0].seed,row.seed);assert.equal(r.games[0].first,row.first);assert.equal(r.opponent.id,other.id);result={stats:r.stats,game:r.games[0]};
  }finally{delete globalThis.self;delete globalThis.postMessage;}
 }
 console.log(JSON.stringify({event:'passed',ordinal,...row,...result,seconds:(Date.now()-start)/1000}));
}else throw Error('mode must be plan or run');
