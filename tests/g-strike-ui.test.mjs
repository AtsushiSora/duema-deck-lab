import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,give,act,attack,inst} from './target-fixture.mjs';
import {manualScreenHTML,newManualUI,manualLogHTML} from '../dist/manual-ui.js';
const GS='dmsd17-014',N='dm01-108';
const h={art:id=>`<i data-card="${id}"></i>`,icon:n=>`<svg data-icon="${n}"></svg>`};
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
function ready(extra=[]){const s=setup();give(s,0,'shields',[GS]);give(s,1,'battle',[N,N,...extra]);s.active=1;attack(s);act(s,'noBlock');assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);assert.equal(s.decision.task.op,'gsTarget');return s;}
test('G Strike target choices show physical board number and actual tap state without changing the state',()=>{
 const s=ready(),before=structuredClone(s),html=manualScreenHTML(s,{...newManualUI(),mobile:true,mobilePanel:'actions'},h);
 assert.match(html,/場1 炎のたてがみ（タップ中）/);assert.match(html,/場2 炎のたてがみ（アンタップ）/);assert.match(html,/タップ・アンタップ状態は変わりません/);assert.deepEqual(s,before);
});
test('G Strike logs tapped and untapped targets accurately, never taps them and prevents attacks even after untapping',()=>{
 for(const index of [0,1]){const s=ready(),x=s.players[1].battle[index],tapped=x.tapped;pick(s,x.uid);
  assert.equal(x.tapped,tapped);assert.equal(e.attackLocked(s,1,x),true);
  const event=s.log.find(x=>x.type==='gStrike'&&x.targetUid);assert.ok(event);assert.equal(event.targetUid,x.uid);assert.equal(event.tapped,tapped);assert.ok(event.text.includes(tapped?'タップ中のまま':'アンタップのまま'));assert.match(event.text,/このターン攻撃できない/);
  const before=structuredClone(s),html=manualScreenHTML(s,newManualUI(),h);assert.match(html,/class="creature-attack-lock">攻撃不可/);assert.ok(html.includes('・'+(tapped?'タップ中':'アンタップ')+'・攻撃不可'));assert.ok(manualLogHTML(s).includes('G・ストライク'));assert.deepEqual(s,before);
  x.tapped=false;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
  act(s,'endTurn');assert.equal(e.attackLocked(s,1,x),false);assert.ok(!manualScreenHTML(s,newManualUI(),h).includes('class="creature-attack-lock"'));
 }
});
test('G Strike decline and targetless resolution are logged without creating attack locks',()=>{
 const s=setup();give(s,0,'shields',[GS]);give(s,1,'battle',[N]);s.active=1;attack(s);act(s,'noBlock');pick(s,false);assert.ok(s.log.some(x=>x.type==='gStrike'&&x.text.includes('使わない')));assert.equal(e.attackLocked(s,1,s.players[1].battle[0]),false);
 const t=ready();pick(t,null);assert.ok(t.log.some(x=>x.type==='gStrike'&&x.text.includes('対象を選ばず終了')));assert.ok(t.players[1].battle.every(x=>!e.attackLocked(t,1,x)));
});
test('attack restriction display follows incarnation, immunity and JSON restoration',()=>{
 const s=ready(),x=s.players[1].battle[1];pick(s,x.uid);const restored=JSON.parse(JSON.stringify(s));assert.equal(e.attackLocked(restored,1,restored.players[1].battle[1]),true);
 x.incarnation=(x.incarnation||0)+1;assert.equal(e.attackLocked(s,1,x),false);x.incarnation--;
 const immune=ready(['dm25rp3-DM1']),target=immune.players[1].battle[1];pick(immune,target.uid);assert.equal(e.attackLocked(immune,1,target),false);assert.ok(!manualScreenHTML(immune,newManualUI(),h).includes('class="creature-attack-lock"'));assert.ok(immune.log.some(x=>x.type==='gStrike'&&x.text.includes('攻撃制限を受けない')));
 assert.equal(e.attackLocked(s,1,{...inst(N),sealed:true}),false);
});
