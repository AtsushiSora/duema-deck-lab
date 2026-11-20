import test from 'node:test';import assert from 'node:assert/strict';import {e} from './target-fixture.mjs';
const cards=['dm26rp2-011','dm24ex1-058','dm22ex1-061','dm22ex2-S15','dmrp20-009','dm01-108','dm01-083','dm01-075','dm01-090','dm01-097'].map(id=>({id,count:4}));
for(const seed of [1372,2744])test('the five requested cards use legal forties with exact JSON continuation and 80 physical cards: '+seed,()=>{
 const deck={id:'requested-1372',name:'指定5種の検証',cards};assert.deepEqual(e.validateDeck(deck),[]);let s=e.createGame([deck,deck],{seed,first:seed%2});const ids=e.physicalCards(s).map(x=>x.uid).sort();assert.equal(ids.length,80);
 for(let n=0;n<1600&&s.winner===null;n++){
  const action=e.chooseAI(s);assert.ok(action);
  if(n%19===0){const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(copy),e.getLegalActions(s));assert.deepEqual(e.chooseAI(copy),action);s=copy;}
  e.step(s,action);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);
 }
 assert.notEqual(s.winner,null,JSON.stringify(e.runSummary(s)));assert.equal(e.runSummary(s).version,'0.602.0');
});
