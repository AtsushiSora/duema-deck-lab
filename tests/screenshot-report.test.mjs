import test from 'node:test';import assert from 'node:assert/strict';
import {captureScreenshotReport,screenshotReportFields,screenshotReportFormHTML,screenshotReportPreviewHTML} from '../dist/screenshot-report.js';
import {e,setup,give} from './target-fixture.mjs';
test('screenshot report freezes visible recent logs and context without game state, hidden cards or mutations',()=>{
 const state=setup();give(state,1,'hand',['dm01-108']);give(state,0,'hand',['dm01-083']);give(state,0,'battle',[]);give(state,1,'battle',[]);give(state,0,'mana',[]);give(state,1,'mana',[]);
 state.log=Array.from({length:25},(_,i)=>({type:'attack',turn:1,player:i%2,text:'処理'+i}));state.log.push({type:'draw',turn:1,player:1,text:e.card('dm01-108').name+'を1枚引いた',cardId:'dm01-108'});const before=structuredClone(state),report=captureScreenshotReport({state},'0.test');
 assert.equal(report.logs.length,20);assert.equal(report.logs[0].text,'処理6');assert.ok(!JSON.stringify(report).includes(e.card('dm01-108').name));assert.equal(report.state,undefined);assert.equal(report.players,undefined);assert.deepEqual(state,before);
 state.log.push({type:'attack',turn:1,text:'あとで進んだログ'});assert.ok(!JSON.stringify(report).includes('あとで進んだログ'));
 const spectator=captureScreenshotReport({state,spectator:true,tournamentId:'cup'},'0.test');assert.equal(spectator.mode,'トーナメント観戦');assert.ok(spectator.logs.some(x=>x.who==='CPU 1'));assert.ok(spectator.logs.some(x=>x.who==='CPU 2'));
});
test('report form preserves notes safely and preview includes selected logs, required descriptions and no form controls',()=>{
 const report={version:'0.test',turn:3,step:44,mode:'手動対戦',phase:'召喚・呪文',logs:Array.from({length:12},(_,i)=>({turn:2,who:'自分',text:'ログ'+i}))},fields={card:'<img src=x>',effect:'能力A\n使えなかった',memo:'<script>メモ</script>',logCount:5};
 const form=screenshotReportFormHTML(fields);for(const key of ['card','effect','memo','logCount'])assert.match(form,new RegExp('data-issue-field="'+key+'"'));assert.match(form,/&lt;img/);assert.ok(!form.includes('<script>'));
 const html=screenshotReportPreviewHTML(report,fields);assert.match(html,/TURN 3/);assert.match(html,/操作 44/);assert.match(html,/直近のログ（5件）/);assert.match(html,/ログ7/);assert.ok(!html.includes('>ログ6<'));assert.match(html,/能力A\n使えなかった/);assert.match(html,/&lt;script&gt;/);assert.ok(!/<(?:input|textarea|select)\b/.test(html));
 assert.equal(screenshotReportFields({card:'x'.repeat(200),effect:'x'.repeat(300),memo:'x'.repeat(500),logCount:200}).card.length,120);assert.deepEqual(screenshotReportFields().logCount,3);
});
test('normal reports retain own known information and spectator reports conceal both private draw identities',()=>{
 const state=setup();for(const p of state.players){p.battle=[];p.mana=[];p.shields=[];p.deck=[];}give(state,0,'hand',['dm01-083']);give(state,1,'hand',['dm01-108']);state.log=[0,1].map(p=>({type:'peek',turn:1,player:p,cardId:state.players[p].hand[0].cardId,text:'確認 '+e.card(state.players[p].hand[0]).name}));
 const spectator=captureScreenshotReport({state,spectator:true},'test');assert.ok(!JSON.stringify(spectator).includes(e.card('dm01-083').name));assert.ok(!JSON.stringify(spectator).includes(e.card('dm01-108').name));
});
