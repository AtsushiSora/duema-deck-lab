import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeDeckTags,deckHasTag} from '../dist/deck-tags.js';import {lastMatchSetup,resolveLastMatch} from '../dist/recent-match.js';
import {makeAccountSnapshot,mergeAccountSnapshot} from '../dist/account-data.js';import {deckAccountStatus} from '../dist/deck-save-status.js';
import {createCatalogue} from '../dist/catalogue.js';import {choiceEffectSummary} from '../dist/choice-summary.js';
import {logCardReferences,linkedLogText} from '../dist/log-card-links.js';import {manualLogHTML,manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {e,PRESETS,data,details,snapshot,setup,give,inst} from './target-fixture.mjs';
test('tags normalize, travel through account backups, merge without cloning the same deck and affect save status',()=>{
 assert.deepEqual(normalizeDeckTags(' 調整中、完成,調整中\n#友達用'),['調整中','完成','友達用']);assert.equal(normalizeDeckTags(Array(20).fill(0).map((_,i)=>'タグ'+i)).length,8);assert.equal(deckHasTag({tags:['完成']},'完成'),true);
 const registry=createCatalogue(snapshot,data.cards,details),deck={...structuredClone(PRESETS[0]),tags:['調整中']},saved={decks:[deck],friends:[],selected:deck.id},remote=makeAccountSnapshot(saved,registry);remote.decks[0].tags=['完成'];
 const next=mergeAccountSnapshot(saved,remote,registry).saved;assert.equal(next.decks.length,1);assert.deepEqual(next.decks[0].tags,['調整中','完成']);assert.deepEqual(saved.decks[0].tags,['調整中']);assert.equal(deckAccountStatus(next.decks[0],'mine',{user:{uid:'one'},loaded:true,cloud:{snapshot:remote}}).kind,'pending');
});
test('recent setup stores conditions without game state and resolves current decks or a removed opponent snapshot',()=>{
 const saved={decks:structuredClone([PRESETS[0]]),friends:structuredClone([PRESETS[1]])};saved.lastMatch=lastMatchSetup({deck:saved.decks[0],opponent:saved.friends[0],mode:'manual',first:'second',practice:true});const before=structuredClone(saved.lastMatch);saved.decks[0].name='現在の構成';saved.friends=[];const last=resolveLastMatch(saved,e.validateDeck);assert.equal(last.deck.name,'現在の構成');assert.deepEqual(last.opponent.cards,PRESETS[1].cards);assert.equal(last.setup.first,'second');assert.equal(last.error,null);assert.equal(last.setup.state,undefined);assert.deepEqual(saved.lastMatch,before);saved.decks=[];assert.equal(resolveLastMatch(saved,e.validateDeck),null);
});
test('effect summaries identify selected queued abilities and keep unknown mixed abilities honest and read only',()=>{
 const s=setup(),x=inst('dm01-108');s.players[0].battle=[x];s.pendingEffects=[{source:x.cardId,uid:x.uid,player:0,effectId:1,effect:'draw1'},{source:x.cardId,uid:x.uid,player:0,effectId:2,effect:'ramp1'}];s.decision={type:'effectOrder',player:0};const before=structuredClone(s),actions=e.getLegalActions(s);assert.match(choiceEffectSummary(s,actions[0]),/1枚引く/);assert.match(choiceEffectSummary(s,actions[1]),/マナ/);const html=manualScreenHTML(s,newManualUI(),{art:()=>'',icon:()=>''});assert.match(html,/choice-effect-summary/);assert.match(html,/カードを1枚引く/);assert.deepEqual(s,before);
 s.pendingEffects[0].effect='extended';s.pendingEffects[0].task={op:'not-known'};assert.match(choiceEffectSummary(s,actions[0]),/詳細/);
});
test('log links use public identities only, escape text and validate stale or unknown indices',()=>{
 const s=setup();for(const p of s.players){p.battle=[];p.mana=[];p.shields=[];p.deck=[];}give(s,0,'battle',['dm01-108']);give(s,1,'hand',['dm01-083']);s.log=[{turn:1,type:'play',player:0,text:e.card('dm01-108').name+'が登場 <script>',cardId:'dm01-108'},{turn:1,type:'peek',player:1,text:e.card('dm01-083').name+'を確認',cardId:'dm01-083'}];const before=structuredClone(s),html=manualLogHTML(s);assert.match(html,/data-action="manual-log-card"/);assert.match(html,/data-log-index="0"/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes(e.card('dm01-083').name));assert.deepEqual(logCardReferences(s,1).ids,[]);assert.deepEqual(logCardReferences(s,100).ids,[]);assert.match(linkedLogText(s,0),/dm01-108/);assert.deepEqual(s,before);
});
