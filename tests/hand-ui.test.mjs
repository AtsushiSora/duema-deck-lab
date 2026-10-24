import test from 'node:test';
import assert from 'node:assert/strict';
import {e,target,GEN,RS,Y,inst,give,setup} from './target-fixture.mjs';
import {handCardModel,preferredHandFace,handShelfHTML,handInspectorHTML,handEvolutionChoice} from '../dist/hand-ui.js';
import {manualBoardHTML,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
const h={art:id=>`<i data-card="${id}"></i>`,icon:n=>`<svg data-icon="${n}"></svg>`};
test('NEO summon choices identify the actual base and separate no-base from a later base selection on phone and PC',()=>{
 const s=setup();give(s,0,'hand',['dm25rp4-050']);give(s,0,'battle',['dm01-108','dm01-075','dm01-075']);s.players[0].battle[2].tapped=true;
 const ui={...newManualUI(),hand:s.players[0].hand[0].uid,mobile:true,mobilePanel:'card'},actions=handCardModel(s,ui.hand).faceActions,before=structuredClone(s);
 assert.equal(actions.length,5);assert.equal(handEvolutionChoice(s,actions[0]).mode,'choose');
 for(const html of [handInspectorHTML(s,ui,h),manualScreenHTML(s,{...ui,mobile:false},h)]){
  assert.match(html,/次に進化元・進化なしを選ぶ/);assert.match(html,/進化させずに召喚 · 2マナ/);
  for(const a of actions){const button=html.match(new RegExp('<button[^>]*data-index="'+a.id+'"[^>]*>[\\s\\S]*?<\\/button>'))?.[0];assert.ok(button);
   if(a.baseUid){const index=s.players[0].battle.findIndex(x=>x.uid===a.baseUid),x=s.players[0].battle[index];assert.ok(button.includes('進化元：場'+(index+1)+' '+e.card(x).name));assert.ok(button.includes('data-card="'+x.cardId+'"'));assert.ok(button.includes(x.tapped?'タップ中':'アンタップ'));}
  }
 }
 assert.deepEqual(s,before);
});
test('selecting either same-name evolution base still pays mana and evolves only that physical creature',()=>{
 for(const baseIndex of [0,1]){const s=setup();give(s,0,'hand',['dm25rp4-050']);give(s,0,'battle',['dm01-075','dm01-075']);
  const bases=[...s.players[0].battle],uid=s.players[0].hand[0].uid,a=handCardModel(s,uid).faceActions.find(a=>a.baseUid===bases[baseIndex].uid);assert.ok(a);
  e.step(s,a,{manualMana:true});assert.equal(s.decision.type,'manaPayment');
  for(let i=0;s.decision?.type==='manaPayment';i++){assert.ok(i<20);e.step(s,e.chooseAI(s));}
  const evolved=s.players[0].battle.find(x=>x.uid===uid);assert.ok(evolved);assert.equal(evolved.under[0].uid,bases[baseIndex].uid);assert.ok(s.players[0].battle.some(x=>x.uid===bases[1-baseIndex].uid));
 }
});
test('hand selection is pure and exposes only the selected card current legal actions and matching destination',()=>{
 const s=e.createGame([target,target],{seed:2020}),x=s.players[0].hand[0],before=structuredClone(s),m=handCardModel(s,x.uid);
 assert.deepEqual(m.destinations,['mana']);assert.ok(m.canUse);assert.ok(m.faceActions.every(a=>a.uid===x.uid&&a.kind==='charge'));assert.deepEqual(s,before);
 const html=manualBoardHTML(s,{...newManualUI(),hand:x.uid},h);assert.equal((html.match(/hand-mana-target/g)||[]).length,1);assert.ok(!html.includes('hand-summon-target'));
});
test('a twinpact starts on its playable face, switches without playing, and uses that face cost, name and text',()=>{
 const s=setup();give(s,0,'hand',[RS]);give(s,0,'mana',Array(3).fill('dm01-097'));const uid=s.players[0].hand[0].uid,before=structuredClone(s);
 assert.equal(preferredHandFace(s,uid),1);const spell=handCardModel(s,uid,1),creature=handCardModel(s,uid,0);assert.ok(spell.canUse);assert.equal(creature.canUse,false);assert.deepEqual(spell.destinations,['spell']);assert.ok(spell.faceActions.every(a=>a.face===1&&a.cost===3));
 const html=handInspectorHTML(s,{hand:uid,handFace:1},h);assert.ok(html.includes('オールイン・チャージャー'));assert.ok(html.includes('呪文を使う · 3マナ'));assert.ok(!html.includes('召喚する ·'));assert.ok(html.includes('hand-face-tabs'));assert.deepEqual(s,before);
});
test('creature placement and Mugen Crime are highlighted only when the actual legal action is available',()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);let x=s.players[0].hand[0];assert.deepEqual(handCardModel(s,x.uid).destinations,['battle']);assert.ok(manualBoardHTML(s,{hand:x.uid},h).includes('hand-summon-target'));
 give(s,0,'hand',[GEN]);give(s,0,'battle',Array(4).fill('dm01-108'));x=s.players[0].hand[0];const m=handCardModel(s,x.uid);assert.ok(m.faceActions.some(a=>a.kind==='mugenStart'));assert.ok(handInspectorHTML(s,{hand:x.uid},h).includes('ムゲンクライム4で召喚'));
 give(s,0,'battle',[]);assert.equal(handCardModel(s,x.uid).canUse,false);assert.ok(!manualBoardHTML(s,{hand:x.uid},h).includes('hand-summon-target'));
});
test('hand cards remain inspectable during opponent turns and required decisions without offering normal plays',()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);const uid=s.players[0].hand[0].uid;s.active=1;assert.equal(handCardModel(s,uid).canUse,false);assert.match(handInspectorHTML(s,{hand:uid},h),/相手の操作中/);
 s.active=0;s.players[0].hand.push(inst('dm23bd4-008'));e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'&&a.cardId==='dm23bd4-008'));assert.ok(s.decision);const before=structuredClone(s),html=handInspectorHTML(s,{hand:uid},h);assert.ok(html.includes('効果の選択に戻る'));assert.ok(!html.includes('data-action="battle-step"'));assert.deepEqual(s,before);
});
test('the scrollable shelf contains every own card in order with full accessible names and no opposing secrets',()=>{
 const s=e.createGame([target,target],{seed:2020});s.players[0].hand.push(...s.players[0].deck.splice(0,8));s.players[1].hand=[{uid:'SECRET_OPPONENT',cardId:'SECRET_OPPONENT_CARD'}];const before=structuredClone(s),html=handShelfHTML(s,{},h);
 const uids=[...html.matchAll(/data-action="hand-card" data-uid="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(uids,s.players[0].hand.map(x=>x.uid));assert.ok(!html.includes('SECRET_'));assert.ok(!html.includes('manual-hand-strip-page'));assert.ok(html.includes('左右にスワイプ'));
 for(const x of s.players[0].hand)assert.ok(html.includes(`aria-label="${e.card(x).name}を拡大`));assert.deepEqual(s,before);
});
test('unavailable spells show their restriction, stale hand ids fail closed, and metadata text is escaped',()=>{
 const s=setup();give(s,0,'hand',[RS]);give(s,1,'battle',[Y]);s.players[1].battle[0].hyperActive=true;const uid=s.players[0].hand[0].uid;assert.equal(handCardModel(s,uid,1).canUse,false);assert.match(handInspectorHTML(s,{hand:uid,handFace:1},h),/唱えられません/);
 const html=handInspectorHTML(s,{hand:uid,handFace:1},{...h,displayCard:()=>({faces:[{}, {name:'<img src=x>',abilityText:'<script>unsafe</script>'}]})});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x>'));
 assert.equal(handCardModel(s,'missing'),null);assert.ok(!handInspectorHTML(s,{hand:'missing'},h).includes('data-action="battle-step"'));
});
