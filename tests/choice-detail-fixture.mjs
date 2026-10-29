import assert from 'node:assert/strict';
import {e,setup,give,act} from './target-fixture.mjs';
export function eringiEffectOrder(){
 const s=setup();s.active=1;give(s,1,'battle',['dm24ex2-066']);give(s,0,'shields',['dm24bd5-006','dm01-108']);s.phase='attack';
 act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');
 assert.equal(s.decision.type,'entryOrder');assert.equal(s.decision.player,0);assert.equal(e.getLegalActions(s).length,2);return s;
}
