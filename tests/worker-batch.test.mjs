import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data} from './target-fixture.mjs';

const forty=(id,ids)=>({id,name:id,format:'original',cards:ids.map(id=>({id,count:4}))});
const fire=forty('worker-batch-fire',['dmrp05-085','dmrp03-082','dmrp14-077','dmrp07-082','dmr06-050','dmrp01-081','dmr22-061','dmr20-061','dmrp11-093','dmr11-045']);
const nature=forty('worker-batch-nature',['dmrp18-093','dmrp05-088','dmrp13-083','dmr10-049','dmrp07-089','dmr12-050','dmrp11-098','dmr16s-052','dmr23-058','dmr15-052']);

test('production worker retains batch progress, opponent offsets and aggregation across multiple games',async()=>{
 for(const deck of[fire,nature])assert.deepEqual(e.validateDeck(deck),[]);
 const messages=[],seed=8291,count=21,opponents=[nature,fire];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));
 try{
  await import('../dist/worker.js?batch-contract');
  await self.onmessage({data:{cards:data.cards,deck:fire,opponents,count,first:'random',seed}});
  assert.deepEqual(messages.filter(x=>x.type==='error'),[]);
  assert.deepEqual(messages.filter(x=>x.type==='progress').map(x=>[x.completed,x.total]),[[20,42],[21,42],[41,42],[42,42]]);
  const done=messages.filter(x=>x.type==='done');assert.equal(done.length,1);assert.equal(done[0].results.length,2);
  for(const [oi,result] of done[0].results.entries()){
   assert.equal(result.opponent.id,opponents[oi].id);assert.equal(result.stats.completed,count);assert.equal(result.stats.unresolved,0);
   assert.deepEqual(result.games.map(x=>[x.first,x.seed]),Array.from({length:count},(_,i)=>[i%2,(seed+Math.imul(i+1,2654435761)+Math.imul(oi,2246822519))>>>0]));
   const last=result.games.at(-1),expected=e.runSummary(e.runGame([fire,opponents[oi]],{seed:last.seed,first:last.first}));assert.deepEqual(last,expected);
  }
 }finally{delete globalThis.self;delete globalThis.postMessage;}
});
