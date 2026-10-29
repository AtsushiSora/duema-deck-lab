import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup} from './target-fixture.mjs';
import {eringiEffectOrder} from './choice-detail-fixture.mjs';
import {newManualUI,manualModel,manualScreenHTML,choiceDetailCard} from '../dist/manual-ui.js';
const h={art:id=>`<span data-art="${id}"></span>`,icon:()=>''};

test('each Eringi effect has a separate inspect button, while the actual resolution buttons retain their legal ids',()=>{
 const s=eringiEffectOrder(),before=structuredClone(s),actions=e.getLegalActions(s);
 for(const mobile of [false,true]){
  const html=manualScreenHTML(s,{...newManualUI(),mobile},h),rows=[...html.matchAll(/<div class="choice-row">(.*?)<\/div>/g)].map(m=>m[1]);assert.equal(rows.length,2);
  for(const [i,row] of rows.entries()){
   assert.match(row,new RegExp(`data-action="battle-step" data-index="${actions[i].id}"`));
   assert.match(row,/<\/button><button type="button" class="btn choice-detail" data-action="manual-choice-detail"/);
   assert.match(row,new RegExp(`data-action="manual-choice-detail" data-index="${actions[i].id}"`));
   assert.ok(row.includes(`data-context="${manualModel(s).context}"`));assert.ok(row.includes(actions[i].label+'の詳細を見る'));
  }
 }
 assert.deepEqual(s,before);
});
test('details use the selected card or resolving source and inspect the original ability of a copied card',()=>{
 const s=setup();s.decision={type:'effect',player:0,source:'dm01-027'};
 assert.equal(choiceDetailCard(s,{cardId:'dm24bd5-006'}).id,'dm24bd5-006');
 assert.equal(choiceDetailCard(s,{}).id,'dm01-027');
 assert.equal(choiceDetailCard(s,{cardId:e.copySource('dm24bd5-006','dm01-108')}).id,'dm24bd5-006');
 s.decision=null;assert.equal(choiceDetailCard(s,{}),null);
});
