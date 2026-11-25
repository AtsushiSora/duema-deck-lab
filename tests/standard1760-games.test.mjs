import test from 'node:test';import assert from 'node:assert/strict';import {e,PRESETS} from './target-fixture.mjs';import {STANDARD1760_DECK} from '../tools/fixtures/standard1760.mjs';
for(const first of [0,1])test('phase1760 forty-card CPU game conserves all eighty identities across every JSON save, first '+first,()=>{
 let s=e.createGame([STANDARD1760_DECK,PRESETS[0]],{seed:17600+first,first});const ids=e.physicalCards(s).map(x=>x.uid).sort();
 for(let n=0;s.winner===null&&s.phase!=='rematch'&&n<700;n++){const legal=e.getLegalActions(s),a=e.chooseAI(s);assert.ok(a&&legal.some(x=>JSON.stringify(x)===JSON.stringify(a)));s=JSON.parse(JSON.stringify(s));e.step(s,a);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);}
 assert.ok(s.winner!==null||s.phase==='rematch','bounded game finishes');assert.equal(ids.length,80);
});
