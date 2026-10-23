import test from 'node:test';
import assert from 'node:assert/strict';
import {battlePrimaryAction} from '../dist/battle-controls.js';
import {manualPrimaryAction,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {onlinePrimaryAction,onlinePendingMove} from '../dist/online-ui.js';
import {e,setup,give,inst,RS} from './target-fixture.mjs';
const ui=()=>({...newManualUI(),mobile:true}),html=(s,v=ui())=>manualScreenHTML(s,v,{art:()=>'',icon:()=>''});
test('primary controls move only through currently legal charge, main and attack actions',()=>{
 const s=setup();s.phase='charge';give(s,0,'hand',['dm01-108']);const v=ui(),skip=manualPrimaryAction(s,v);assert.equal(skip.label,'マナを置かずに進む');assert.equal(skip.move.kind,'skipCharge');
 v.hand=s.players[0].hand[0].uid;assert.equal(manualPrimaryAction(s,v).label,'マナに置く');assert.equal(manualPrimaryAction(s,v).move.uid,v.hand);
 e.step(s,skip.move);v.hand=null;assert.equal(manualPrimaryAction(s,v).label,'攻撃へ進む');e.step(s,manualPrimaryAction(s,v).move);assert.equal(manualPrimaryAction(s,v).label,'ターン終了');
});
test('selected twinpact uses its selected legal face, while alternative methods remain explicit',()=>{
 const s=setup();give(s,0,'hand',[RS]);give(s,0,'mana',Array(3).fill('dm01-097'));const v={...ui(),hand:s.players[0].hand[0].uid,handFace:1};
 assert.equal(manualPrimaryAction(s,v).label,'呪文を唱える');assert.equal(manualPrimaryAction(s,v).move.face,1);v.handFace=0;assert.equal(manualPrimaryAction(s,v).command,'card');assert.equal(manualPrimaryAction(s,v).move,null);
 for(const extra of [{alternative:'joe'},{requiresMethod:true},{g7Payment:{reducers:[]}}])assert.equal(battlePrimaryAction({human:true,phase:'main',selected:true,selectedType:'creature',selectedMoves:[{kind:'play',...extra}]}).command,'card');
});
test('attack selection can be cleared, confirms its target and never invents a mandatory end turn',()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);s.phase='attack';const v={...ui(),attacker:s.players[0].battle[0].uid};assert.equal(manualPrimaryAction(s,v).label,'攻撃先を選ぶ');assert.match(html(s,v),/data-action="manual-clear-attacker"/);
 v.attacker=null;assert.equal(manualPrimaryAction(s,v).label,'ターン終了');give(s,0,'battle',['dm01-100']);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));const required=manualPrimaryAction(s,v);assert.equal(required.command,'choices');assert.equal(required.move,null);
});
test('required effects supersede all normal phase actions, including during the opponent turn',()=>{
 const s=setup();give(s,0,'battle',['dm01-084']);give(s,1,'battle',['dm01-108']);s.active=1;s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'));assert.equal(s.decision.type,'block');const primary=manualPrimaryAction(s,ui());assert.equal(primary.label,'効果を選ぶ');assert.equal(primary.command,'choices');assert.equal(primary.move,null);
});
test('opponent turns disable the primary action while own cards stay inspectable',()=>{
 const s=setup();s.active=1;give(s,0,'hand',['dm01-108']);const v={...ui(),hand:s.players[0].hand[0].uid},before=structuredClone(s),primary=manualPrimaryAction(s,v);assert.equal(primary.label,'相手のターン');assert.equal(primary.disabled,true);assert.equal(primary.move,null);assert.deepEqual(s,before);
});
test('phone has one hand shelf, one contextual primary action and a header-only menu',()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);const markup=html(s);assert.equal((markup.match(/class="hand-shelf"/g)||[]).length,1);assert.ok(!markup.includes('手札一覧'));assert.ok(!markup.includes('一覧を開く'));assert.ok(!markup.includes('manual-hand-cards'));assert.ok(!markup.includes('操作する'));
 const dock=markup.split('class="manual-mobile-dock"')[1].split('</section>')[0];assert.match(dock,/manual-primary/);assert.ok(!dock.includes('manual-options'));assert.match(markup,/aria-label="対戦メニュー"/);
});
const room=()=>({phase:'playing',revision:4,seat:0,game:{actor:0,phase:'charge',decision:null,players:[{hand:[{uid:'own',type:'creature'}]},{hand:[]}],actions:[{id:0,kind:'charge',uid:'own'},{id:1,kind:'skipCharge'}]}});
test('online controls share phase labels and respect server play-face metadata',()=>{
 const r=room();assert.equal(onlinePrimaryAction(r).label,'マナを置かずに進む');assert.equal(onlinePrimaryAction(r,'own').label,'マナに置く');r.game.phase='main';r.game.actions=[{id:0,kind:'play',uid:'own',playType:'spell'},{id:1,kind:'toAttack'}];assert.equal(onlinePrimaryAction(r,'own').label,'呪文を唱える');assert.equal(onlinePrimaryAction(r).label,'攻撃へ進む');r.game.phase='attack';r.game.actions=[{id:0,kind:'endTurn'}];assert.equal(onlinePrimaryAction(r).label,'ターン終了');r.game.actor=1;assert.equal(onlinePrimaryAction(r).disabled,true);
});
test('online pending confirmations expire when revision, actor or action changes',()=>{
 const r=room();r.game.phase='attack';const action={id:0,kind:'attack',uid:'attacker',label:'相手へ攻撃'};r.game.actions=[action,{id:1,kind:'endTurn'}];const pending={revision:r.revision,action:structuredClone(action)};assert.ok(onlinePendingMove(r,pending));assert.equal(onlinePrimaryAction(r,null,pending).label,'攻撃する');r.revision++;assert.equal(onlinePendingMove(r,pending),null);r.revision--;r.game.actions[0].label='別の攻撃';assert.equal(onlinePendingMove(r,pending),null);r.game.actions[0]=action;r.game.actor=1;assert.equal(onlinePendingMove(r,pending),null);
});

test('manual context tokens never embed the source identity of an opponent pending hand ability',()=>{
 const s=setup();s.active=1;s.decision={type:'dddDeclare',player:1,uid:'hidden-card',source:'dmrp15-km1'};const markup=html(s);assert.ok(!markup.includes('dmrp15-km1'));assert.match(markup,/data-context="0:1:1:dddDeclare"/);
});
