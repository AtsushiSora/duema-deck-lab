import {card,getLegalActions,playFaces,canCastSpell,civilizations} from './engine.js';
import {pageWindow} from './board-fit.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const civs=c=>civilizations(c);
export function handCardModel(s,uid,faceIndex=0,legal=getLegalActions(s)){
 const inst=s.players[0].hand.find(x=>x.uid===uid);if(!inst)return null;
 const c=card(inst),faces=playFaces(c),index=Number.isInteger(faceIndex)&&faces[faceIndex]?faceIndex:0,face=faces[index],human=legal[0]?.player===0;
 const actions=legal.filter(a=>a.player===0&&a.uid===uid&&['charge','play','mugenStart'].includes(a.kind)&&(!a.origin||a.origin==='hand'));
 const faceActions=actions.filter(a=>a.kind==='charge'||a.kind==='mugenStart'&&index===0||a.kind==='play'&&(a.face||0)===index);
 const destinations=[...new Set(faceActions.map(a=>a.kind==='charge'?'mana':a.kind==='mugenStart'||playFaces(c)[a.face||0].type==='creature'?'battle':'spell'))];
 let status=faceActions.length?(faceActions.some(a=>a.kind==='charge')?'マナに置けます':'使用できます'):'必要なマナ・文明・進化元などの条件を満たしていません';
 if(s.winner!==null)status='対戦は終了しました。カードの情報を確認できます';
 else if(!human)status='相手の操作中です。カードの情報を確認できます';
 else if(s.decision)status='効果の選択中です。下のボタンで選択に戻れます';
 else if(s.phase==='attack')status='攻撃は盤面のクリーチャーから選びます';
 else if(!faceActions.length&&face.type==='spell'&&!canCastSpell(s,0,face))status='相手の能力で、この呪文は唱えられません';
 else if(!faceActions.length&&c.dream&&s.players[0].battle.some(x=>x.cardId===c.id))status='同名のドリーム・クリーチャーが場にいます';
 return {inst,card:c,faces,face,index,human,actions,faceActions,destinations,status,canUse:faceActions.length>0};
}
export function preferredHandFace(s,uid,legal=getLegalActions(s)){
 const model=handCardModel(s,uid,0,legal);if(!model||model.faceActions.length)return 0;
 return model.actions.find(a=>a.kind==='play')?.face||0;
}
export function handShelfHTML(s,ui,{art}){
 const legal=getLegalActions(s),pane=pageWindow(s.players[0].hand,ui.handStripPage,ui.handStripSize||5),human=legal[0]?.player===0;
 return `<section class="hand-shelf" aria-label="自分の手札"><div class="hand-shelf-head"><strong>手札 <b>${s.players[0].hand.length}</b></strong><small>${human&&!s.decision?'タップで拡大して選ぶ':'タップでカードを確認'}</small><button data-action="manual-open-hand">一覧を開く</button></div><div class="hand-shelf-row">${pane.pages>1?`<button class="hand-shelf-page" data-action="manual-hand-strip-page" data-page="${pane.index-1}" aria-label="前の手札" ${pane.index===0?'disabled':''}>‹</button>`:''}<div class="hand-shelf-cards" style="--shelf-count:${Math.max(1,pane.items.length)}">${pane.items.map(x=>{const m=handCardModel(s,x.uid,preferredHandFace(s,x.uid,legal),legal),selected=ui.hand===x.uid;return `<button class="hand-shelf-card ${m.canUse?'can-use':''} ${selected?'is-selected':''}" data-action="hand-card" data-uid="${esc(x.uid)}" data-focus-key="shelf-${esc(x.uid)}" aria-pressed="${selected}" aria-label="${esc(m.card.name)}を拡大${m.canUse?'・'+(s.phase==='charge'?'マナに置けます':'使用可能'):''}"><span class="hand-shelf-art">${art(m.card.id)}</span><span class="hand-shelf-cost">${m.faces.map(f=>esc(f.cost)).join(' / ')}</span>${m.canUse?`<span class="hand-shelf-ready">${s.phase==='charge'?'マナ':'使用可'}</span>`:''}<strong>${esc(m.card.name)}</strong></button>`;}).join('')||'<p class="hand-shelf-empty">手札はありません</p>'}</div>${pane.pages>1?`<button class="hand-shelf-page" data-action="manual-hand-strip-page" data-page="${pane.index+1}" aria-label="次の手札" ${pane.index+1>=pane.pages?'disabled':''}>›</button>`:''}</div>${pane.pages>1?`<span class="hand-shelf-page-count">${pane.index+1} / ${pane.pages}</span>`:''}</section>`;
}
export function handInspectorHTML(s,ui,{art,displayCard=card}){
 const m=handCardModel(s,ui.hand,ui.handFace);if(!m)return '<p class="small">手札からカードを選んでください。</p>';
 const rich=displayCard(m.card.id),details=rich?.faces?.[m.index],text=details?.abilityText??m.face.text??'',name=details?.name||m.face.name;
 const actionLabel=a=>a.kind==='charge'?'マナに置く':a.kind==='mugenStart'?'ムゲンクライム4で召喚':`${m.face.type==='spell'?'呪文を使う':'召喚する'} · ${a.cost??m.face.cost}マナ`;
 return `<article class="hand-inspector"><div class="hand-inspector-head"><span class="hand-inspector-art">${art(m.card.id)}</span><div><span class="hand-inspector-kind">${m.face.type==='spell'?'呪文':'クリーチャー'} · コスト ${esc(m.face.cost)}</span><h3 tabindex="-1">${esc(name)}</h3><p>${esc(civs(m.face).join(' / '))}${m.face.power?' · パワー '+esc(m.face.power):''}</p><button data-action="card-detail" data-id="${esc(m.card.id)}">カード情報を詳しく見る ↗</button></div></div>${m.faces.length>1?`<div class="hand-face-tabs" role="group" aria-label="使う面を選ぶ">${m.faces.map((f,index)=>`<button data-action="manual-hand-face" data-face="${index}" data-focus-key="hand-face-${index}" aria-pressed="${m.index===index}">${f.type==='spell'?'呪文側':'クリーチャー側'} · ${esc(f.cost)}マナ</button>`).join('')}</div>`:''}<div class="hand-inspector-ability"><strong>能力</strong><p>${esc(text||'能力文はありません。')}</p></div><p class="hand-use-status ${m.canUse?'is-available':''}" role="status">${esc(m.status)}</p><div class="hand-use-actions">${m.faceActions.map(a=>`<button class="btn primary" data-action="battle-step" data-index="${a.id}" data-focus-key="hand-use-${a.id}">${esc(actionLabel(a))}</button>`).join('')}${s.decision&&m.human?'<button class="btn" data-action="manual-open-actions">効果の選択に戻る</button>':''}<button class="btn ghost" data-action="manual-clear-hand">選択を解除</button></div></article>`;
}
