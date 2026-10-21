import {getLegalActions,card,power,effectiveCard,isEvolution,canUntap,abilitiesIgnored,genmuActive,selfTriggersStopped,manaValue,exLifeShieldInfo,exLifeShields,shieldGuardSources,playFaces} from './engine.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=x=>x===Infinity||x==='∞'?'∞':Number(x).toLocaleString('ja-JP');
const quietKinds=new Set(['skipDDD','skipDDDSummon','cancelEvolution','cancelDeploy','cancelMugen','cancelLeaveMana','skipDeploy','skipDragonTap','skipTrigger','skipFight','skipRamp','skipEffect','finishShieldGuards','allowLeave','noBlock','stopJudge']);
const titles={leaveReplace:'残す方法を選ぼう',leaveMana:'墓地に置くマナを3枚選ぼう',deploy:'手札・マナから出すカードを選ぼう',deployEvolution:'進化元を選ぼう',mugen:'タップする4体を選ぼう',infinityCount:'ブレイクする数を選ぼう',infinityShields:'ブレイクするシールドを選ぼう',dddDeclare:'D・D・Dを使うか選ぼう',dddSummon:'召喚する方法を選ぼう',block:'ブロックするか選ぼう',trigger:'S・トリガーを使うか選ぼう',breakChoice:'ブレイクするシールドを選ぼう',judgeCost:'参照するコストを選ぼう',judgeContinue:'ジャッジを続けるか選ぼう',judgeBreak:'効果で割るシールドを選ぼう',shieldGuard:'シールドを守るか選ぼう',triggerOrder:'先に使うS・トリガーを選ぼう',entryOrder:'先に解決する能力を選ぼう',effectOrder:'先に解決する能力を選ぼう',dragonTap:'タップする相手を選ぼう',revealEvolution:'公開したカードの出し方を選ぼう',evolution:'進化するか選ぼう',optionalRamp:'マナを増やすか選ぼう',manaTop:'山札に戻すカードを選ぼう',fight:'バトルする相手を選ぼう',battleWinOrder:'先に解決するドローを選ぼう',draw:'引く枚数を選ぼう',effect:'効果の対象を選ぼう',search:'手札に加えるカードを選ぼう',untap:'アンタップするか選ぼう'};

export const newManualUI=()=>({hand:null,attacker:null,confirm:null,handOpen:false,logOpen:false,fast:false,filter:'',context:''});
export function manualModel(s,ui={}){
 const actions=getLegalActions(s),human=actions[0]?.player===0,hand=s.players[0].hand.find(x=>x.uid===ui.hand)||null;
 const attacker=human&&!s.decision&&actions.some(a=>a.kind==='attack'&&a.uid===ui.attacker)?ui.attacker:null;
 const source=s.decision?.source||s.resolvingSpell?.source||s.judge?.source;
 const chosen=s.decision?.chosen?.length||0;
 const progress=s.decision?.type==='leaveMana'?`${chosen} / 3枚`:s.decision?.type==='mugen'?`${chosen} / 4体`:s.decision?.type==='manaTop'?`${chosen} / ${s.decision.count}枚`:s.decision?.type==='infinityShields'?`${chosen} / ${s.decision.count}つ`:s.decision?.type==='shieldGuard'?`${s.shieldBreak.protections.length}つ保護`:null;
 let title=s.winner!==null?(s.winner===0?'勝利！':'対戦終了'):!human?'相手の行動を待っています':s.decision?(titles[s.decision.type]||'行動を選ぼう'):s.phase==='charge'?'マナに置くカードを選ぼう':s.phase==='main'?hand?'このカードをどう使う？':'使うカードを手札から選ぼう':attacker?'攻撃先を選ぼう':'攻撃するクリーチャーを選ぼう';
 let help=s.winner!==null?s.reason:!human?'相手の手札や山札は非公開です。':s.decision?decisionHelp(s):s.phase==='charge'?'手札をタップしてから「マナに置く」。1ターンに1枚です。':s.phase==='main'?'選んだカードの能力を確認して、召喚・呪文を使えます。':attacker?'光っている相手のカードか、プレイヤーへの攻撃をタップ。':'「攻撃可」のカードをタップ。対象を選んでから攻撃します。';
 return {actions,human,hand,attacker,source,progress,title,help,context:`${s.actions}:${s.decision?.type||s.phase}:${s.decision?.source||''}`};
}
function decisionHelp(s){
 const d=s.decision;
 if(['mugen','leaveMana','manaTop'].includes(d.type))return '必要な数をすべて選ぶと確定します。選択中のカードにはチェックが付きます。';
 if(d.type==='shieldGuard')return 'シールド1つにつき、選んだクリーチャーの下のカードすべてを墓地へ置きます。';
 if(d.type==='dddDeclare')return 'この攻撃で使うカードを先に宣言します。マナを支払うのは解決するときです。';
 if(d.type==='dddSummon')return card(d.source).ddd.attackDiscount?'光・火・自然がマナにあれば、攻撃中のコスト分だけ軽減。支払いは無色・最低1です。':'光・火・自然を含む7マナ。進化させずに出すこともできます。';
 if(['effectOrder','entryOrder','triggerOrder'].includes(d.type))return '解決する順番を選べます。先の効果で、次の選択肢が変わることがあります。';
 if(d.type==='leaveReplace')return '適用する保護を1つ選びます。複数体が離れる場合、選択後にまとめて移動します。';
 if(d.type==='infinityCount')return '0枚も選べます。数を決めた後、割るシールドを選びます。';
 if(d.type==='deploy')return '出せるカードだけを表示しています。手札とマナのどちらから出すかも確認できます。';
 if(['effect','fight','dragonTap','block','evolution','revealEvolution'].includes(d.type))return '候補から選んでください。緑の枠があるカードは、盤面からも選べます。';
 return '使える選択肢から選んでください。能力の処理は自動で進みます。';
}
// A board tap resolves only an unambiguous legal choice. Multi-target abilities stay in the picker.
export function boardChoice(s,ui,player,zone,uid){return boardChoiceModel(s,ui,player,zone,uid,manualModel(s,ui));}
function boardChoiceModel(s,ui,player,zone,uid,m){
 if(!m.human)return null;
 let matches=[];
 if(zone==='battle'){
  if(m.attacker&&player===1)matches=m.actions.filter(a=>a.kind==='attack'&&a.uid===m.attacker&&a.target===uid);
  else if(s.decision)matches=m.actions.filter(a=>
   (a.kind==='effect'&&a.targets?.length===1&&a.targets[0].player===player&&a.targets[0].uid===uid&&s.decision.effect!=='tapTwo')||
   (player===0&&['block','mugenTap'].includes(a.kind)&&a.uid===uid)||
   (player===1&&['fight','dragonTap'].includes(a.kind)&&(a.target||a.uid)===uid)||
   (player===0&&['evolve','revealEvolve','deployEvolve','summonDDD'].includes(a.kind)&&a.baseUid===uid));
 }
 if(zone==='shields'&&player===1)matches=m.actions.filter(a=>(m.attacker&&a.kind==='attack'&&a.uid===m.attacker&&a.shield===uid)||(['judgeBreak','infinityShield'].includes(a.kind)&&a.shield===uid)||(a.kind==='breakShields'&&a.shields.length===1&&a.shields[0]===uid));
 return matches.length===1?matches[0]:null;
}
export function confirmEndTurn(s,a){return a?.kind==='endTurn'&&getLegalActions(s).some(x=>x.kind==='attack'&&x.player===a.player);}
export function selectionHint(s,inst){
 const actions=getLegalActions(s).filter(a=>a.player===0&&a.uid===inst.uid);
 if(s.phase==='charge'&&!s.decision)return 'マナに置けます';
 if(actions.some(a=>a.kind==='play'||a.kind==='mugenStart'))return '使用できます';
 const c=card(inst),p=s.players[0];
 if(c.dream&&p.battle.some(x=>x.cardId===c.id))return '同名ドリームが場にあります';
 if(c.type==='creature'&&p.entryLimitThisTurn&&(p.enteredThisTurn||0)>=1)return 'このターンの登場上限です';
 if(c.mugenCrime)return 'ムゲンクライム：4体と水・闇の4マナが必要です';
 return '必要なマナ・文明や条件が揃っていません';
}
const actionCard=(s,a)=>a.cardId?card(a.cardId):null;
const sourceZone=(s,a)=>a.origin==='mana'?'マナ':a.origin==='grave'?'墓地':a.origin==='hand'?'手札':s.decision?.type==='search'?'山札':s.players[0].hand.some(x=>x.uid===a.uid)?'手札':s.players[0].mana.some(x=>x.uid===a.uid)?'マナ':null;

export function manualBoardHTML(s,ui,{art,icon}){
 const m=manualModel(s,ui);
 const resources=(p,who)=>{
  const ready=p.mana.filter(x=>!x.tapped).reduce((n,x)=>n+manaValue(card(x)),0),total=p.mana.reduce((n,x)=>n+manaValue(card(x)),0);
  return `<div class="play-resources"><span><b>${p.deck.length}</b> 山札</span><span><b>${p.hand.length}</b> 手札${who?'・非公開':''}</span><button data-action="zone-detail" data-player="${who}" data-zone="mana" aria-label="${who?'相手':'自分'}のマナを見る"><b>${ready}<small> / ${total}</small></b> マナ ${icon('chevron',12)}</button><button data-action="zone-detail" data-player="${who}" data-zone="grave" aria-label="${who?'相手':'自分'}の墓地を見る"><b>${p.grave.length}</b> 墓地 ${icon('chevron',12)}</button></div>`;
 };
 const shields=(p,who)=>`<div class="play-shields" aria-label="${who?'相手':'自分'}のシールド"><span class="zone-caption">${icon('shield',13)} <b>${p.shields.length}</b></span><div class="shield-tiles">${p.shields.map((x,i)=>{const a=boardChoiceModel(s,ui,who,'shields',x.uid,m),ex=exLifeShieldInfo(s,who,x.uid);return `<button class="shield-tile ${a?'is-target':''} ${ex?'is-ex':''}" ${a?`data-action="battle-step" data-index="${a.id}"`:'disabled'} aria-label="${who?'相手':'自分'}のシールド${i+1}${ex?'・EXライフ':''}${a?'を選ぶ':''}"><span>${i+1}</span>${ex?'<small>EX</small>':''}</button>`;}).join('')||'<span class="no-shields">シールドなし</span>'}</div></div>`;
 const creatures=(p,who)=>`<div class="play-creatures" aria-label="${who?'相手':'自分'}のバトルゾーン">${p.battle.map(x=>{
  const c=card(x),data=effectiveCard(x,s),ready=m.human&&who===0&&m.actions.some(a=>a.kind==='attack'&&a.uid===x.uid),a=boardChoiceModel(s,ui,who,'battle',x.uid,m),chosen=s.decision?.type==='mugen'&&s.decision.chosen.includes(x.uid);
  const flags=[abilitiesIgnored(s,x)?'能力無効':null,exLifeShields(s,who,x).length?'EXライフ':null,data.blocker?'ブロッカー':null,isEvolution(x)?data.gNeo?'G-NEO':'進化':null,!canUntap(x)?'アンタップ制限':null].filter(Boolean);
  return `<article class="play-creature ${x.tapped?'is-tapped':''} ${ready?'is-ready':''} ${a?'is-target':''} ${m.attacker===x.uid?'is-selected':''} ${chosen?'is-chosen':''}"><button class="creature-tap" data-action="manual-creature" data-uid="${esc(x.uid)}" data-player="${who}" data-focus-key="creature-${esc(x.uid)}" aria-label="${esc(c.name)}${a?'を選ぶ':ready?'で攻撃先を選ぶ':'の詳細'}" aria-pressed="${m.attacker===x.uid||chosen}">${art(x.cardId)}<span class="creature-current-power">${number(power(x,x.uid===s.attack?.attacker,s))}</span>${chosen?`<span class="chosen-check">${icon('check',16)}</span>`:''}</button><strong class="creature-name">${esc(c.name)}</strong><div class="creature-tags">${ready?'<span class="ready-tag">攻撃可</span>':x.tapped?'<span>タップ中</span>':x.entered===s.turn&&!isEvolution(x)&&!data.speedAttacker?'<span>出たターン</span>':''}${flags.slice(0,2).map(v=>`<span>${esc(v)}</span>`).join('')}</div><div class="creature-tools"><button data-action="card-detail" data-id="${esc(x.cardId)}" aria-label="${esc(c.name)}の能力を見る">詳細</button>${x.under?.length?`<button data-action="evolution-stack" data-uid="${esc(x.uid)}" data-player="${who}">下 ${flatten(x).length}枚</button>`:''}</div></article>`;
 }).join('')||`<div class="play-empty">${icon('decks',22)}<span>クリーチャーはまだいません</span></div>`}</div>`;
 const playerAttack=m.attacker?m.actions.find(a=>a.kind==='attack'&&a.uid===m.attacker&&a.target==='player'&&!a.shield):null;
 const policies=[];
 if(genmuActive(s))policies.push('ゲンム：両者のコスト5以下のクリーチャー能力・呪文効果を無視');
 for(const who of [0,1]){
  if(selfTriggersStopped(s,who))policies.push(`${who?'相手':'自分'}のクリーチャー自身の登場時・攻撃時能力はトリガーしない`);
  if(s.players[1-who].battle.some(x=>effectiveCard(x,s).entryGate))policies.push(`${who?'相手':'自分'}は手札からの実行でのみ登場できる`);
  if(s.players[1-who].battle.some(x=>effectiveCard(x,s).spellLockMaxCost))policies.push(`${who?'相手':'自分'}はコスト5以下の呪文を唱えられない`);
  if(s.players[who].entryLimitThisTurn)policies.push(`${who?'相手':'自分'}のこのターンの登場：${Math.min(s.players[who].enteredThisTurn||0,1)} / 1体`);
 }
 return `<div class="play-board"><section class="opponent-field"><div class="play-player"><span class="player-avatar">AI</span><strong>${esc(s.players[1].name)}</strong><small>相手</small>${playerAttack?`<button class="direct-attack" data-action="battle-step" data-index="${playerAttack.id}">${icon('battle',14)} ${s.players[1].shields.length?'相手へ攻撃':'ダイレクトアタック'}</button>`:''}</div>${resources(s.players[1],1)}${shields(s.players[1],1)}${creatures(s.players[1],1)}</section><div class="board-divider"><span>DUEL MASTERS</span><b>VS</b><span>DECK LAB</span></div><section class="own-field">${creatures(s.players[0],0)}${shields(s.players[0],0)}<div class="play-player"><span class="player-avatar mine">YOU</span><strong>${esc(s.players[0].name)}</strong><small>自分</small></div>${resources(s.players[0],0)}</section></div>${policies.length?`<details class="play-policies"><summary>${icon('info',14)} 適用中の制限・効果 <b>${policies.length}</b></summary><ul>${policies.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}`;
}
const flatten=c=>(c.under||[]).flatMap(x=>[x,...flatten(x)]);
function button(a,{primary=false,quiet=false,label=null}={}){return `<button class="btn ${primary?'primary':quiet?'ghost':''}" data-action="battle-step" data-index="${a.id}" data-focus-key="action-${a.kind}-${a.id}">${esc(label||a.label)}</button>`;}
function handHTML(s,ui,m,{art,icon}){
 const open=(!s.decision&&s.phase!=='attack')||ui.handOpen;
 return `<div class="manual-hand"><div class="hand-heading"><strong>手札 <b>${s.players[0].hand.length}</b></strong><small>${m.human&&!s.decision?'カードをタップして操作':'自分だけが見られます'}</small>${s.decision||s.phase==='attack'?`<button data-action="manual-hand-toggle" aria-expanded="${open}">${open?'閉じる':'手札を見る'} ${icon('chevron',12)}</button>`:''}</div>${open?`<div class="manual-hand-cards">${s.players[0].hand.map(x=>{const selectable=m.human&&m.actions.some(a=>a.uid===x.uid&&(a.kind==='play'||a.kind==='charge'||a.kind==='mugenStart'));return `<button class="manual-hand-card ${ui.hand===x.uid?'is-selected':''} ${selectable?'is-playable':''}" data-action="hand-card" data-uid="${esc(x.uid)}" data-focus-key="hand-${esc(x.uid)}" aria-pressed="${ui.hand===x.uid}" aria-label="手札の${esc(card(x).name)}${selectable?'・選択可能':''}">${art(x.cardId)}${selectable?`<span class="hand-can-use">${s.phase==='charge'?'マナ候補':'使用可'}</span>`:''}<strong>${esc(card(x).name)}</strong></button>`;}).join('')||'<div class="empty-hand">手札はありません</div>'}</div>`:''}</div>`;
}
function choicesHTML(s,ui,m,h){
 const positive=m.actions.filter(a=>!quietKinds.has(a.kind)&&!(a.kind==='draw'&&a.n===0)),quiet=m.actions.filter(a=>quietKinds.has(a.kind)||(a.kind==='draw'&&a.n===0));
 const query=(ui.filter||'').normalize('NFKC').toLowerCase(),filtered=positive.filter(a=>a.label.normalize('NFKC').toLowerCase().includes(query));
 return `${m.source?`<div class="resolving-card"><span class="choice-source-art">${h.art(m.source)}</span><div><small>解決中のカード</small><strong>${esc(card(m.source).name)}</strong></div><button class="icon-btn" data-action="card-detail" data-id="${esc(m.source)}" aria-label="解決中の能力を見る">${h.icon('info',18)}</button></div>`:''}${positive.length>8?`<label class="choice-search">${h.icon('search',16)}<input id="manual-choice-search" type="search" value="${esc(ui.filter||'')}" placeholder="選択肢をカード名で絞り込む" aria-label="選択肢を絞り込む"></label>`:''}<div class="manual-choices">${filtered.map(a=>{const c=actionCard(s,a),zone=sourceZone(s,a);return `<button class="choice-card" data-action="battle-step" data-index="${a.id}" data-focus-key="action-${a.kind}-${a.id}">${c?`<span class="choice-thumb">${h.art(c.id)}</span>`:`<span class="choice-symbol">${h.icon(['judgeAgain','useRamp','useTrigger','declareDDD'].includes(a.kind)?'bolt':'check',19)}</span>`}<span class="choice-copy">${zone?`<small>${zone}${a.cost!=null?' · '+a.cost+'マナ':''}</small>`:''}<strong>${esc(a.label)}</strong></span>${h.icon('chevron',14)}</button>`;}).join('')||(!query?'':`<p class="small">一致する選択肢がありません。<button class="details-link" data-action="manual-clear-filter">絞り込みを解除</button></p>`)}</div>${quiet.length?`<div class="manual-secondary">${quiet.map(a=>button(a,{quiet:true})).join('')}</div>`:''}`;
}
function mainActions(s,ui,m,h){
 if(s.winner!==null)return `<div class="manual-result"><strong>${s.winner===0?'勝利！':'対戦終了'}</strong><p>${esc(s.reason)}</p><div class="manual-secondary"><button class="btn primary" data-action="battle-again">もう一度対戦</button><button class="btn" data-action="manual-replay">記録を見返す</button></div></div>`;
 if(!m.human)return `<div class="manual-wait"><span class="running-dot"></span><div><strong>相手AIが考えています</strong><small>盤面を見ながら待ちましょう。</small></div></div>`;
 if(ui.confirm!==null){const a=m.actions.find(a=>a.id===ui.confirm&&a.kind==='endTurn');if(a)return `<div class="end-turn-review"><strong>まだ攻撃できるクリーチャーがいます</strong><p>このままターンを終えますか？</p><div class="manual-secondary"><button class="btn" data-action="manual-cancel-end">対戦に戻る</button><button class="btn primary" data-action="manual-confirm-end" data-index="${a.id}">ターンを終える</button></div></div>`;}
 if(s.decision)return choicesHTML(s,ui,m,h);
 if(s.phase==='charge'){
  const a=m.actions.find(a=>a.kind==='charge'&&a.uid===ui.hand),skip=m.actions.find(a=>a.kind==='skipCharge');
  return `${selectedHandHTML(s,m,h)}<div class="manual-primary"><button class="btn primary" data-action="battle-step" data-index="${a?.id??''}" ${a?'':'disabled'}>${h.icon('bolt',17)} マナに置く</button>${button(skip,{quiet:true,label:'置かずに進む'})}</div>`;
 }
 if(s.phase==='main'){
  const plays=m.actions.filter(a=>a.uid===ui.hand&&(a.kind==='play'||a.kind==='mugenStart')),extra=m.actions.filter(a=>(a.kind==='play'&&a.origin==='mana')||(a.kind==='mugenStart'&&a.uid!==ui.hand)),next=m.actions.find(a=>a.kind==='toAttack');
  return `${selectedHandHTML(s,m,h)}<div class="manual-primary">${plays.map(a=>button(a,{primary:true,label:a.kind==='mugenStart'?'ムゲンクライム4で召喚':`${playFaces(card(a.cardId))[a.face||0].type==='spell'?'呪文を使う':'召喚する'} · ${a.cost??4}マナ${card(a.cardId).spellFace?`（${a.face===1?'呪文側':'クリーチャー側'}）`:''}`})).join('')}${button(next,{quiet:true,label:'攻撃へ進む →'})}</div>${extra.length?`<details class="manual-extra"><summary>マナ・墓地などから使う <b>${extra.length}</b></summary><div class="manual-secondary">${extra.map(a=>button(a)).join('')}</div></details>`:''}`;
 }
 const attacks=m.actions.filter(a=>a.kind==='attack'&&a.uid===m.attacker),end=m.actions.find(a=>a.kind==='endTurn');
 return `${m.attacker?`<div class="selected-attacker"><span>${h.icon('battle',20)}</span><div><small>攻撃するクリーチャー</small><strong>${esc(card(s.players[0].battle.find(x=>x.uid===m.attacker)).name)}</strong></div><button class="btn ghost" data-action="manual-clear-attacker">選び直す</button></div><div class="manual-attack-targets">${attacks.map(a=>button(a,{primary:a.target==='player'})).join('')}</div>`:`<p class="manual-instruction">${m.actions.some(a=>a.kind==='attack')?'盤面の「攻撃可」のカードをタップしてください。':'このターンに攻撃できるクリーチャーはいません。'}</p>`}<div class="manual-secondary">${end?button(end,{quiet:true,label:'ターンを終える →'}):'<small>攻撃が必要なクリーチャーが残っています。</small>'}</div>`;
}
function selectedHandHTML(s,m,h){if(!m.hand)return '<div class="selection-empty">手札を選ぶと、ここに使い方を表示します。</div>';const c=card(m.hand);return `<div class="selected-hand-info"><span class="selected-card-mini">${h.art(c.id)}</span><div><strong>${esc(c.name)}</strong><small>${esc(selectionHint(s,m.hand))}</small></div><button class="btn ghost" data-action="card-detail" data-id="${esc(c.id)}">能力を見る</button></div>`;}

export function manualScreenHTML(s,ui,{art,icon,practice=false,undoCount=0}={}){
 const m=manualModel(s,ui),h={art,icon},latest=s.log.at(-1),phase=s.phase;
 const phaseItems=[['charge','1','マナ'],['main','2','召喚・呪文'],['attack','3','攻撃']];
 return `<div class="manual-topbar"><div class="manual-heading"><span class="live-duel-dot"></span><strong>手動対戦</strong><span class="manual-turn">TURN ${s.turn}</span><span class="manual-practice">${practice?'練習':'通常'}</span></div><div class="manual-top-tools"><button class="btn ghost" data-action="manual-speed" aria-pressed="${!!ui.fast}">AI ${ui.fast?'速い':'標準'}</button><button class="icon-btn" data-action="leave-battle" aria-label="対戦を終了">${icon('close',20)}</button></div></div><div class="manual-layout"><section class="manual-stage"><div class="manual-turnbar ${!m.human&&s.winner===null?'is-opponent':''}"><strong>${s.winner!==null?'対戦終了':m.human?'あなたの操作':'相手の操作'}</strong><ol class="manual-phase">${phaseItems.map(([key,n,title])=>`<li class="${phase===key?'is-current':''}" ${phase===key?'aria-current="step"':''}><b>${n}</b>${title}</li>`).join('')}</ol></div>${manualBoardHTML(s,ui,h)}<div class="manual-console"><div class="manual-guide" role="status" aria-live="polite" tabindex="-1"><div><span class="guide-kicker">${s.decision?'RESOLVE':'NEXT ACTION'}</span><h2>${esc(m.title)}</h2><p>${esc(m.help)}</p></div>${m.progress?`<strong class="choice-progress">${esc(m.progress)}</strong>`:''}</div>${handHTML(s,ui,m,h)}<div class="manual-action-body">${mainActions(s,ui,m,h)}</div><div class="manual-console-footer">${practice&&s.winner===null?`<button data-action="battle-hint" ${m.human?'':'disabled'}>${icon('spark',15)} ヒント</button><button data-action="undo-battle" ${undoCount?'':'disabled'}>${icon('history',15)} 待った</button>`:'<span>能力の処理は自動です</span>'}<button data-action="manual-log" aria-expanded="${!!ui.logOpen}">${icon('history',14)} 対戦ログ</button></div></div></section><aside class="manual-side"><section class="manual-log-summary"><span class="guide-kicker">LAST PLAY</span><p>${esc(latest?.text||'対戦を開始しました')}</p></section><section class="manual-log ${ui.logOpen?'is-open':''}"><button class="manual-log-heading" data-action="manual-log" aria-expanded="${!!ui.logOpen}"><strong>対戦ログ</strong><span>最新20件 ${icon('chevron',14)}</span></button><div class="manual-log-events">${s.log.slice(-20).reverse().map(e=>`<div class="manual-log-event ${['break','finish','trigger','play','dddSummon'].includes(e.type)?'important':''}"><small>T${e.turn} · ${e.player===0?'自分':'相手'}</small><p>${esc(e.text)}</p></div>`).join('')}</div></section><p class="manual-privacy">相手の手札・山札・シールドの内容は非公開です。カードの見た目は識別補助用です。</p></aside></div>`;
}
