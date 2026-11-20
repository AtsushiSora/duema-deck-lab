import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,give,setup} from './target-fixture.mjs';
import {manualLogHTML,manualModel,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {aiPublicSnapshot,aiResultCues} from '../dist/ai-playback.js';
import {logCardReferences} from '../dist/log-card-links.js';
const CHAOS='dm23rp2-OR01',KAREN='dm25ex1-SP3',DOGI='dm25rp4-DM1',N='dm01-108',W='dm01-083';
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
function pending(){
 const s=setup();s.active=1;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(N));
 give(s,0,'battle',[KAREN]);give(s,0,'hand',[CHAOS]);give(s,0,'shields',[]);
 give(s,1,'battle',[N,W]);give(s,1,'hand',[DOGI]);
 const attacker=s.players[1].battle[0],base=s.players[0].battle[0];
 attack(s,attacker.uid);act(s,'declareDDD');act(s,'skipDDDSummon');
 const before=aiPublicSnapshot(s);pick(s,true);pick(s,base.uid);
 return {s,attacker,before};
}
test('all-tap log and playback explain the already declared attack using its public card name',()=>{
 const {s,before,attacker}=pending();
 const event=s.log.findLast(x=>x.cardId===CHAOS&&x.type==='effect');
 assert.ok(event.text.includes(e.card(attacker).name));assert.match(event.text,/攻撃宣言済み/);assert.match(event.text,/タップだけでは中止されません/);
 assert.ok(aiResultCues(before,s).some(c=>c.text===event.text));
 const html=manualLogHTML(s);assert.match(html,/タップだけでは中止されません/);assert.match(html,/data-id="dm01-108"/);
});
for(const mobile of [false,true])test('the defense screen explains continuation while preserving all legal block actions: mobile '+mobile,()=>{
 const {s}=pending(),ui={...newManualUI(),mobile},before=JSON.stringify(s),actions=e.getLegalActions(s);
 assert.equal(s.decision.type,'block');assert.match(manualModel(s,ui).title,/全タップ後も、宣言済みの攻撃は続行中/);assert.match(manualModel(s,ui).help,/攻撃はすでに宣言/);assert.match(manualModel(s,ui).help,/攻撃中にタップしても、この攻撃は止まりません/);
 const html=manualScreenHTML(s,ui,{art:()=>'<span></span>',icon:()=>'<span></span>'});assert.match(html,/攻撃中にタップしても、この攻撃は止まりません/);
 assert.deepEqual(e.getLegalActions(s),actions);assert.equal(JSON.stringify(s),before);
});
test('a direct attack log identifies its attacker with a clickable public card and preserves the saved result reason',()=>{
 const {s,attacker}=pending(),before=aiPublicSnapshot(s);act(s,'noBlock');drain(s);
 assert.equal(s.winner,1);assert.equal(s.reason,'ダイレクトアタックが成立');
 const event=s.log.at(-1);assert.equal(event.type,'finish');assert.equal(event.cardId,attacker.cardId);assert.equal(event.text,e.card(attacker).name+'のダイレクトアタックが成立');
 const cue=aiResultCues(before,s).at(-1);assert.equal(cue.cardId,attacker.cardId);assert.equal(cue.text,event.text);
 const html=manualLogHTML(s,{filter:'attack'});assert.match(html,/ダイレクトアタックが成立/);assert.match(html,/data-id="dm01-108"/);assert.equal(logCardReferences(s,s.log.length-1).text,event.text);
});
test('all-tap outside an attack does not falsely claim that an attack continues',()=>{
 const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(N));give(s,1,'battle',[N,W]);cast(s,CHAOS);drain(s);
 const event=s.log.findLast(x=>x.cardId===CHAOS&&x.type==='effect');assert.match(event.text,/すべてをタップ/);assert.ok(!event.text.includes('攻撃宣言済み'));assert.ok(!event.text.includes('中止されません'));
});
test('older saved logs without attacker metadata remain readable and unchanged',()=>{
 const s=setup();s.winner=1;s.reason='ダイレクトアタックが成立';s.log.push({type:'finish',player:1,turn:1,text:s.reason});const before=JSON.stringify(s);
 for(const spectator of [false,true])assert.match(manualLogHTML(s,{filter:'attack',spectator}),/ダイレクトアタックが成立/);
 assert.equal(JSON.stringify(s),before);
});
