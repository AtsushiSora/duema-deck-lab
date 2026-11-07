import {displayTurn} from './turn-count.js';
import {aiPublicSnapshot,aiResultCues} from './ai-playback.js?v=0.667.0';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function screenshotReportFields(value={}){return {card:String(value.card||'').slice(0,120),effect:String(value.effect||'').slice(0,160),memo:String(value.memo||'').slice(0,400),logCount:[3,5,10].includes(Number(value.logCount))?Number(value.logCount):3};}
// Freeze only visible report information. Hidden cards and full game state stay out.
export function captureScreenshotReport(battle,version){
 const s=battle.state,start=Math.max(0,s.log.length-20),spectator=!!battle.spectator,cues=aiResultCues({...aiPublicSnapshot(s),logIndex:start},s,{spectator});
 const who=player=>spectator?(player===0?'CPU 1':player===1?'CPU 2':'対戦'):(player===0?'自分':player===1?'相手':'対戦');
 return {version,turn:displayTurn(s),step:s.actions,mode:battle.strongestCPU?'最強CPU戦':battle.tournamentId?(spectator?'トーナメント観戦':'トーナメント'):spectator?'CPU観戦':'手動対戦',phase:s.decision?'効果の解決中':({charge:'マナ',main:'召喚・呪文',attack:'攻撃'}[s.phase]||'対戦中'),logs:s.log.slice(start).map((e,i)=>({turn:displayTurn(e),who:who(e.player),text:cues[i]?.text||'対戦の処理'}))};
}
export function screenshotReportFormHTML(values){
 const v=screenshotReportFields(values);
 return `<div class="screenshot-report-form"><p class="small">カード名と使えなかった効果を記入すると、ログと一緒にスクショ用の画面にまとめます。</p><label>どのカード？<input class="field" id="issue-card" data-issue-field="card" maxlength="120" value="${esc(v.card)}" placeholder="例：貴布人 テブルカッケ＝エディ" required></label><label>どの効果が使えなかった？<textarea class="field" id="issue-effect" data-issue-field="effect" maxlength="160" rows="2" placeholder="例：墓地から召喚する効果が選べなかった" required>${esc(v.effect)}</textarea></label><label>状況のメモ（任意）<textarea class="field" id="issue-memo" data-issue-field="memo" maxlength="400" rows="3" placeholder="例：自分のターンで、マナも足りていた。超魂Xで得た能力を使おうとした。">${esc(v.memo)}</textarea></label><label>一緒に写す直近のログ<select class="field" id="issue-log-count" data-issue-field="logCount">${[3,5,10].map(n=>`<option value="${n}" ${n===v.logCount?'selected':''}>${n}件</option>`).join('')}</select></label><p class="small">記入内容は自動送信されません。次の画面をスクショして、LINEなどで送れます。</p></div>`;
}
export function screenshotReportPreviewHTML(report,values){
 const v=screenshotReportFields(values),logs=report.logs.slice(-v.logCount);
 return `<article class="screenshot-report-preview" aria-label="スクショ用の不具合報告"><header><strong>不具合の報告</strong><small>v${esc(report.version)} · ${esc(report.mode)}</small></header><p class="screenshot-report-context">TURN ${esc(report.turn)} · ${esc(report.phase)} · 操作 ${esc(report.step)}</p><dl><div><dt>カード</dt><dd>${esc(v.card.trim())}</dd></div><div><dt>使えなかった効果</dt><dd>${esc(v.effect.trim())}</dd></div>${v.memo.trim()?`<div><dt>状況のメモ</dt><dd>${esc(v.memo.trim())}</dd></div>`:''}</dl><section class="screenshot-report-logs" aria-label="不具合発生時の直近のログ"><h3>直近のログ${logs.length?'（'+logs.length+'件）':''}</h3>${logs.map(e=>`<div><small>T${esc(e.turn)} · ${esc(e.who)}</small><p>${esc(e.text)}</p></div>`).join('')||'<p>まだログはありません。</p>'}</section></article><p class="screenshot-report-instruction">この画面のスクショを撮って送ってください。長い場合はスクロールして数枚に分けて撮れます。</p>`;
}
