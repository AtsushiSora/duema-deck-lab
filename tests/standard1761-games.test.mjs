import test from 'node:test';import assert from 'node:assert/strict';import {e,PRESETS} from './target-fixture.mjs';
const deck={id:'justice1761',name:'Justice Emperor full game',format:'original',cards:['dmrp14-km2','dm22ex1-016','dmrp14-024','dmrp14-049','dm01-075','dm01-078','dm01-079','dm01-083','dm01-084','dm01-086'].map(id=>({id,count:4}))};
for(const first of [0,1])test('Justice legal forty-card CPU match preserves all eighty physical cards through JSON saves, first '+first,()=>{
 assert.deepEqual(e.validateDeck(deck),[]);let s=e.createGame([deck,PRESETS[0]],{seed:17610+first,first});const ids=e.physicalCards(s).map(x=>x.uid).sort();
 for(let n=0;s.winner===null&&s.phase!=='rematch'&&n<700;n++){const legal=e.getLegalActions(s),a=e.chooseAI(s);assert.ok(a&&legal.some(x=>JSON.stringify(x)===JSON.stringify(a)));s=JSON.parse(JSON.stringify(s));e.step(s,a);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);}
 assert.ok(s.winner!==null||s.phase==='rematch','bounded game finishes');assert.equal(ids.length,80);
});
