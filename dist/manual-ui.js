import {RIVAL_IDS} from './hero-draw.js';
import {paymentReviewHTML} from './battle-insights.js';
import {sourceCardBadge,sourceCardLabel} from './card-info.js';
import {shieldCards} from './shield-state.js';
import {aiPlaybackHTML,aiSpeedLabel} from './ai-playback.js';
import {handCardModel,handShelfHTML,handInspectorHTML,handEvolutionButtonHTML} from './hand-ui.js';
import {getLegalActions,manaSelectionStatus,manaColors,card,power,effectiveCard,isEvolution,canUntap,abilitiesIgnored,genmuActive,momoActive,selfTriggersStopped,manaValue,manaValueAt,exLifeShieldInfo,exLifeShields,shieldGuardSources,playFaces,attackLocked,evolutionBases,canCastSpell,canEnterCreature,summonCost,paymentPool,manaPayment} from './engine.js';
import {attackRoute,previewAttackAction} from './battle-visuals.js';
import {pageWindow} from './board-fit.js';
import {battlePrimaryAction} from './battle-controls.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=x=>x===Infinity||x==='∞'?'∞':Number(x).toLocaleString('ja-JP');
const quietKinds=new Set(['skipDDD','skipDDDSummon','cancelEvolution','cancelDeploy','cancelMugen','cancelLeaveMana','skipDeploy','skipDragonTap','skipTrigger','skipFight','skipRamp','skipEffect','finishShieldGuards','allowLeave','noBlock','stopJudge','skipGaiaDeclare','skipGaiaSummon']);
const titles={manaPayment:'支払うマナを選ぼう',triggerEvolution:'S・トリガーで召喚する進化元を選ぼう',mirageDeclare:'真気楼を使うか宣言しよう',endAbilityOrder:'終了時の能力の順序を選ぼう',gaiaDeclare:'ガイアッシュを使うか宣言しよう',gaiaSummon:'ガイアッシュを召喚するか選ぼう',everShields:'手札に加えるシールドを2つ選ぼう',leaveReplace:'残す方法を選ぼう',leaveMana:'墓地に置くマナを3枚選ぼう',deploy:'手札・マナから出すカードを選ぼう',deployEvolution:'進化元を選ぼう',mugen:'タップする4体を選ぼう',infinityCount:'ブレイクする数を選ぼう',infinityShields:'ブレイクするシールドを選ぼう',dddDeclare:'D・D・Dを使うか選ぼう',dddSummon:'実行する方法を選ぼう',block:'ブロックするか選ぼう',trigger:'S・トリガーを使うか選ぼう',breakChoice:'ブレイクするシールドを選ぼう',judgeCost:'参照するコストを選ぼう',judgeContinue:'ジャッジを続けるか選ぼう',judgeBreak:'効果で割るシールドを選ぼう',shieldGuard:'シールドを守るか選ぼう',triggerOrder:'先に使うS・トリガー・G・ストライクを選ぼう',entryOrder:'先に解決する能力を選ぼう',effectOrder:'先に解決する能力を選ぼう',dragonTap:'タップする相手を選ぼう',revealEvolution:'公開したカードの出し方を選ぼう',evolution:'進化するか選ぼう',optionalRamp:'マナを増やすか選ぼう',manaTop:'山札に戻すカードを選ぼう',fight:'バトルする相手を選ぼう',battleWinOrder:'先に解決する勝利時能力を選ぼう',draw:'引く枚数を選ぼう',effect:'効果の対象を選ぼう',search:'手札に加えるカードを選ぼう',untap:'アンタップするか選ぼう'};

export const newManualUI=()=>({hand:null,attacker:null,attackChoice:null,confirm:null,handOpen:false,logOpen:false,panelMinimized:false,mobilePanel:'closed',handPage:0,handFace:0,choicePage:0,aiSpeed:'normal',fast:false,filter:'',context:''});
export function manualModel(s,ui={}){
 const actions=getLegalActions(s),human=actions[0]?.player===0,hand=s.players[0].hand.find(x=>x.uid===ui.hand)||null;
 const attacker=human&&!s.decision&&actions.some(a=>a.kind==='attack'&&a.uid===ui.attacker)?ui.attacker:null;
 const source=s.decision?.source||s.resolvingSpell?.source||s.judge?.source;
 const selected=s.decision?.task?.selected,chosen=selected?.length||s.decision?.chosen?.length||0;
 const progress=s.decision?.type==='extended'&&Array.isArray(selected)?`${chosen}${s.decision.task.op==='g26_Select'?' / 2体':s.decision.task.op==='g4_Gate'?' / '+s.decision.task.n+'つ':s.decision.task.op==='g4_Untap'?' / 3枚':s.decision.task.op==='g2_Five'?' / 2回':s.decision.task.op==='g12Select'?' / 2枚':s.decision.task.op==='g20Select'?' / '+s.decision.task.max+'体':s.decision.task.op==='g19BojiSelect'?' / 2体':s.decision.task.op==='g19Untap'?' / 3体':s.decision.task.op==='g8_Try'?' / 2体':s.decision.task.op==='g1_WatchBounce'?' / 2体':s.decision.task.op==='g21Shutter'?' / 2体':s.decision.task.op==='g21Fortress'?' / 3つ':s.decision.task.op==='g21BreakChoose'?' / 9つ':'枚選択'}`:s.decision?.type==='everShields'?`${chosen} / 2つ`:s.decision?.type==='leaveMana'?`${chosen} / 3枚`:s.decision?.type==='mugen'?`${chosen} / ${card(s.decision.source).mugenCrime}体`:s.decision?.type==='manaTop'?`${chosen} / ${s.decision.count}枚`:s.decision?.type==='infinityShields'?`${chosen} / ${s.decision.count}つ`:s.decision?.type==='shieldGuard'?`${s.shieldBreak.protections.length}つ保護`:null;
 let title=s.winner!==null?(s.winner===0?'勝利！':'対戦終了'):!human?'相手の行動を待っています':s.decision?(s.decision.title||titles[s.decision.type]||'行動を選ぼう'):s.phase==='charge'?'マナに置くカードを選ぼう':s.phase==='main'?hand?'このカードをどう使う？':'使うカードを手札から選ぼう':attacker?'攻撃先を選ぼう':'攻撃するクリーチャーを選ぼう';
 if(s.decision?.type==='mugen')title='タップする'+card(s.decision.source).mugenCrime+'体を選ぼう';
 if(s.decision?.type==='block'&&actions.some(a=>a.kind==='guardman'))title='ブロック・ガードマンを選ぼう';
 let help=s.winner!==null?s.reason:!human?'相手の手札や山札は非公開です。':s.decision?decisionHelp(s):s.phase==='charge'?'手札をタップしてから「マナに置く」。1ターンに1枚です。':s.phase==='main'?'選んだカードの能力を確認して、召喚・呪文を使えます。':attacker?'光っている相手のカードか、プレイヤーへの攻撃をタップ。':'「攻撃可」のカードをタップ。対象を選んでから攻撃します。';
 if(human&&!s.decision&&s.phase==='main'&&actions.some(a=>a.kind==='play'&&a.origin==='mana')){if(!hand)title='使うカードを選ぼう';help='手札のカード、または「マナから使う」から選べます。';}
 const attackChoice=previewAttackAction(s,ui);if(attackChoice){title='攻撃内容を確認しよう';help='矢印で攻撃先を確認して「攻撃を確定」。選び直すこともできます。';}
 return {actions,human,hand,attacker,attackChoice,source,progress,title,help,context:`${s.actions}:${s.turn}:${s.active}:${s.decision?.type||s.phase}${s.decision?.type==='manaPayment'?':'+s.decision.selected.join(','): ''}`};
}
function decisionHelp(s){
 const d=s.decision;
 if(d.task?.op==='g37DarkMasters')return '相手の手札を確認して3枚まで選びます。「この選択で捨てさせる」で少ない枚数でも確定できます。';
 if(d.task?.op==='g37Bounce')return '自分・相手のどちらからも3体まで選べます。確定すると選んだクリーチャーをまとめて手札に戻します。';
 if(d.task?.op==='g37TapMode')return '今のタップ状態を確認し、「タップする」か「アンタップする」を選びます。その後1枚引きます。';
 if(d.task?.op==='gsDeclare'||d.task?.op==='gsTarget')return 'G・ストライクは、選んだ相手をこのターン攻撃できなくします。タップ・アンタップ状態は変わりません。';
 if(d.type==='manaPayment')return '使うマナをタップして選び、文明と必要数を確認して確定します。選択中のカードはもう一度タップすると外せます。';
 if(d.type==='everShields')return 'シールド2つを選ぶとクリーチャーを残せます。S・トリガーは使えません。この置換効果で選んだG城も手札へ戻ります。';
 if(d.task?.op==='g29_Bases')return '進化ではないコマンドまたはドラゴンを選び、コストの合計を20以上にします。確定するまでマナは支払いません。';
 if(d.task?.op==='g29_InvPick')return '自分のマナまたはシールドから、カードを合計2枚選びます。ブレイクではないためS・トリガーは使いません。';
 if(d.task?.op==='g29_RevivePick')return '自分の墓地から出すカードを選びます。進化元になるカードを先に選び、最後に確定してください。';
 if(d.task?.op==='g28_RadioPick')return '山札の上5枚から出す2体までを先に選びます。残ったカードは好きな順序で山札の下へ置きます。';
 if(d.task?.op==='g28_Modes')return '同じ効果も選べます。必要な回数を選んだ後、カードに書かれた順で処理します。';
 if(d.task?.op==='g28_Deploy')return '出すカードと、進化させる場合の進化元を確認してください。';
 if(d.task?.op==='g28_ManaDeploy')return '現在のマナ枚数よりコストが小さい非進化を、マナから進化させずに出せます。';
 if(d.task?.op==='g28_Dagra')return '裏向きのシールドの中身を見ずに選びます。束のシールドは含まれるカードすべてがマナへ移動します。';
 if(d.task?.op==='g27_Golgy')return '山札の上からマナに置く枚数を先に選びます。その後、マナから3枚まで手札に戻せます。';
 if(d.task?.op==='g27_KanDeath')return 'カンツォーネの下にあったカードをまとめて、進化元または表向きの1つのシールドに戻します。';
 if(d.task?.op==='g27_WestUse')return '手札の枚数以下のコストなら無料で実行できます。実行しなければ手札に加えます。';
 if(d.task?.op==='g26_Select')return '手札とマナから合計コスト7以下のクリーチャーを2体まで選びます。確定後に出す順序を選べます。';
 if(d.task?.op==='g26_Saint')return '今回の複数ブレイクを、このセイント・キャッスル1つのブレイクに置き換えます。';
 if(d.task?.op==='g26_Zaze')return 'シールドにカードが置かれ、ザゼ・ゼーンをアンタップしました。続けて効果を1つ選びます。';
 if(d.task?.op==='g26_DrawDeploy')return '引くかどうかを選び、その後、最初の相手のエレメント・呪文以下のコストのクリーチャーを出せます。';
 if(d.task?.op==='g13_Murder')return '相手の手札を確認して、クリーチャー1体を捨てさせます。「相手の手札を見る」で呪文も含めて確認できます。';
 if(d.task?.op?.startsWith('g13_Mek'))return '見ているカードから条件に合う面を選びます。W・メクレイドは使う2枚と順序を先に決めます。';
 if(d.task?.op==='g13_SB')return '今回加わる闇のシールドを1枚捨て、手札の秩序の意志を無料で唱えます。';
 if(d.task?.op==='g13_BorrowAbility')return '相手のカードの登場時能力を1つだけ使います。「このクリーチャー」はマーダン自身を参照します。';
 if(d.task?.op==='g23_Declare')return '攻撃時に使う侵略・バルチュリスを、ほかの能力を解決する前に宣言します。';
 if(d.task?.op==='g23_Unseal')return 'コマンドと同じ文明のカードから、封印を必ず1つ外します。封印の中身は選ぶ前に見られません。';
 if(d.task?.op==='g23_Purin')return 'プリンを超次元へ移動できたら、別のエイリアンを1体出します。召喚とは異なります。';
 if(d.task?.op==='g23_Gareck')return '効果は1回ずつ選んで処理します。先に墓地に置いたクリーチャーも、次の選択で出せます。';
 if(d.task?.op==='g4_Declare')return '今回使う無月の門を宣言します。宣言後に引いたカードは今回の対象にはできません。';
 if(d.task?.op==='g4_Gate')return card(d.source).mugenKind==='joker'?'自分の場と墓地から魔導具・ジョーカーズを合計6つ選びます。このカード自身や、他のカードの下にあるカードは選べません。':'自分の場と墓地から必要な数の魔導具を選びます。他のカードの下にある魔導具は選べません。';
 if(d.task?.op==='g4_Store')return '呪文を墓地へ置くかわりに新世壊の下に置き、1枚引けます。';
 if(d.task?.op==='g4_World')return 'この新世壊でゲーム中1回、水のコスト99以下の呪文を手札か墓地から唱えられます。';
 if(d.task?.op==='g4_Untap')return 'アンタップするマナを3枚まで選びます。選び終わったら「ここまでで確定」を押せます。';
 if(d.task?.op==='g8_DragonShield')return 'ブレイクの前にシールドを増やします。重ねてもシールドの数は増えず、束のカードだけ増えます。';
 if(d.task?.op==='g8_Savak')return '相手のクリーチャー本体や進化元からカードを1枚選び、相手のシールドに表向きで重ねます。';
 if(d.task?.op==='g8_FinalPick')return '上4枚から合計コスト6以下の多色クリーチャーを先に選びます。残りは好きな順序で山札の下へ置きます。';
 if(d.task?.op==='g17_BattleReplace')return '銀河竜がかわりにバトルします。攻撃しているクリーチャーや攻撃先自体は変わりません。';
 if(d.task?.op==='g17_TermDraw')return '手札と同じ枚数を引くか選び、その内容を見てからマナを増やすか決められます。終極宣言はゲーム中1回です。';
 if(d.task?.op==='g17_Mekraid')return '選んだ面の種族とコストで判定します。残りは好きな順序で山札の下へ置きます。';
 if(d.task?.op==='g3_Declare')return '今回使う鬼エンド・逆転撃を先にすべて宣言します。逆転撃を唱えると、次の自分のターンに闇3マナの支払いが必要です。';
 if(d.task?.op==='g3_FinalSelect')return '手札とマナから、合計コスト6以下の多色クリーチャーを選んで確定します。';
 if(d.task?.op==='g3_CycleRepeat')return '手札から唱えた同じ呪文を墓地から再使用します。このクリーチャーにつき各ターン1回です。';
 if(d.task?.op==='g2_Declare')return '攻撃時に使いたい侵略をすべて宣言します。宣言後に引いたカードは今回の攻撃では使えません。';
 if(d.task?.op==='g2_Invade')return '宣言した場所に残っているカードを重ねます。バトルゾーンからなら、元の進化元はその場に残ります。';
 if(d.task?.op==='g2_Five')return '同じ効果を2回選べます。5文明が盤面に揃っていれば、すべてを1回ずつ使うこともできます。';
 if(d.task?.op==='g12Select')return '使うハンターを2枚まで先に選び、確定してから使う順番を選びます。残りは好きな順序で山札の下へ置きます。';
 if(d.task?.op==='g12Loss')return '適用する敗北の置き換えを選びます。山札が0枚のままなら、破壊された時の能力が解決する前に再び敗北します。';
 if(d.task?.op==='g19BojiSelect')return '手札と墓地から最大1体ずつ、先にすべて選びます。出した仲間は次の自分のターンまでブロッカーになります。';
 if(d.task?.op==='g19Yobi')return '召喚して出た時に使えます。山札の上から最初に見つかった小さいクリーチャーを出します。';
 if(d.task?.op==='g19MekraidLook')return '選んだ面のコストと種族で判定します。クリーチャー側・呪文側を選べます。残りは好きな順序で山札の下へ置きます。';
 if(d.type==='triggerEvolution')return '実行する時点の進化元を選び、コストを支払わずに召喚します。';
 if(d.task?.op==='g21KiyoSelect')return '使うエレメントを先にすべて選び、確定後に使う順番を選びます。呪文側は選べません。';
 if(d.task?.op==='g21GohatenUse')return '自分の分を出し終えてから相手の分を出します。登場時の誘発は無視しますが、EXライフなどの置き換えは働きます。';
 if(d.task?.op==='g21Shutter')return '2体まで選んで確定するとまとめてタップします。選べる同期の妖精があれば優先して選びます。';
 if(d.task?.op==='g20Select')return '出すカードをすべて選んでから確定します。登場時の能力は、その後に解決します。';
 if(d.task?.op==='g20Gio')return '他のコスト9の手札を選びます。確定して召喚する時に選んだカード名を相手に公開します。';
 if(['mugen','leaveMana','manaTop'].includes(d.type))return '必要な数をすべて選ぶと確定します。選択中のカードにはチェックが付きます。';
 if(d.type==='mirageDeclare')return '相手のターン終了時です。終了時の効果を解決する前に使用を宣言し、唱える時にクリーチャーが3体以上出たかを確認します。';
 if(d.type==='endAbilityOrder')return '宣言した能力の中から、先に解決するものを選びます。';
 if(d.type==='gaiaDeclare')return '相手がマナをタップせずにカードを使ったターンの終わりです。手札から使うカードを先に宣言します。';
 if(d.type==='gaiaSummon')return 'コストを支払わずに召喚できます。場に同名カードがあると召喚できません。';
 if(d.type==='shieldGuard')return 'シールド1つにつき、選んだクリーチャーの下のカードすべてを墓地へ置きます。';
 if(d.type==='dddDeclare')return 'この攻撃で使うカードを先に宣言します。マナを支払うのは解決するときです。';
 if(d.type==='dddSummon')return card(d.source).ddd.cost===3?'光・火を含む3マナを支払って召喚します。':card(d.source).ddd.cost===2?'自然のマナ2枚を使います。進化させずに出すこともできます。':card(d.source).ddd.fromMana?'光・水・自然を含む5マナ。手札・マナから唱え、効果を2回か3回選べます。':card(d.source).ddd.attackDiscount?'光・火・自然がマナにあれば、攻撃中のコスト分だけ軽減。支払いは無色・最低1です。':'光・火・自然を含む7マナ。進化させずに出すこともできます。';
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
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g37')){const d=s.decision,op=d.task.op,own=['g37Testa','g37Cho','g37Never','g37ShieldHand'],field=['g37Bounce','g37ChoTargets','g37OwnDestroy','g37EnemyDestroy','g37Yobirin','g37Smoke','g37TapTarget','g37Starfield'];const legalZone=own.includes(op)&&zone==='hand'&&player===d.player||op==='g37DarkMasters'&&zone==='hand'&&player!==d.player||field.includes(op)&&zone==='battle'&&(['g37Bounce','g37TapTarget'].includes(op)||player===(op==='g37ChoTargets'?1-d.player:d.player))||op==='g37Darts'&&zone==='shields'&&player===d.task.owner||op==='g37DartsUse'&&zone==='shields'&&player===d.player;if(legalZone){const actions=m.actions.filter(a=>a.kind==='extended'&&(d.choices[a.choice]?.value?.uid??d.choices[a.choice]?.value)===uid);return actions.length===1?actions[0]:null;}}
 let matches=[];
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g31_')){const d=s.decision,allowed={g31_Bases:['battle','grave'],g31_Sacrifice:['battle'],g31_DestroySmall:['battle'],g31_RecoverPick:['grave'],g31_Reload:['hand'],g31_Heavy:['battle'],g31_ManaTrash:['mana'],g31_NonCreature:['battle'],g31_Oni:['shields'],g31_ApolloShields:['shields'],g31_Xeno:['hand'],g31_Link:['battle']}[d.task.op]||[];if(allowed.includes(zone)){const a=m.actions.filter(a=>a.kind==='extended'&&d.choices[a.choice]?.value===uid);if(a.length===1)return a[0];}}

 if(s.decision?.type==='everShields'&&player===s.decision.player&&zone==='shields')return m.actions.find(a=>a.kind==='everShield'&&a.shield===uid)||null;
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g29_')){const d=s.decision,op=d.task.op,own=player===d.player,zones={g29_Bases:'battle',g29_Arc:'hand',g29_RevivePick:'grave',g29_Danger:'battle',g29_Destroy:'battle'};if(zone===zones[op]&&(own&&!['g29_Destroy'].includes(op)||op==='g29_Destroy'&&!own||op==='g29_Danger')){const list=m.actions.filter(a=>a.kind==='extended'&&(d.choices[a.choice]?.value?.uid||d.choices[a.choice]?.value)===uid);if(list.length===1)return list[0];}if(own&&op==='g29_InvPick'){const list=m.actions.filter(a=>{const v=d.choices[a.choice]?.value;return a.kind==='extended'&&v?.uid===uid&&v.zone===zone;});if(list.length===1)return list[0];}}
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g28_')){const d=s.decision,op=d.task.op,own=player===d.player,zones={g28_PizzaPick:'hand',g28_ManaDeploy:'mana',g28_GyaiRecover:'mana',g28_Dagra:'shields',g28_Deploy:'battle',g28_ExecuteBase:'battle',g28_HandDeck:'hand'};if(op==='g28_ElementMana'&&zone==='battle'||op==='g28_TapPick'&&!own&&zone==='battle'||own&&(zone===zones[op]||op==='g28_Execute')){const list=m.actions.filter(a=>{const v=d.choices[a.choice]?.value;return a.kind==='extended'&&(v?.uid||v)===uid&&(op!=='g28_Execute'||v?.origin===zone);});if(list.length===1)return list[0];}}
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g27_')){const op=s.decision.task.op,owner=s.decision.player,allowed=op==='g27_Shield'&&player!==owner&&zone==='battle'||op==='g27_Tap'&&player!==owner&&zone==='battle'||op==='g27_KanDeath'&&player===owner&&zone==='battle'||op==='g27_Untap'&&player===owner&&zone==='mana'||op==='g27_Recover'&&player===owner&&zone==='mana'||op==='g27_HandTop'&&player===owner&&zone==='hand';if(allowed){const a=m.actions.find(a=>a.kind==='extended'&&(s.decision.choices[a.choice]?.value?.uid||s.decision.choices[a.choice]?.value)===uid);if(a)return a;}}
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g26_')){const op=s.decision.task.op,owner=s.decision.player;
  const allowed=op==='g26_Ever'&&zone==='battle'||op==='g26_Tap'&&player!==owner&&zone==='battle'||op==='g26_Deploy'&&player===owner&&zone==='hand'||op==='g26_Select'&&player===owner&&['hand','mana'].includes(zone)||op==='g26_Saint'&&player===owner&&zone==='shields';
  if(allowed){const a=m.actions.find(a=>{const v=s.decision.choices[a.choice]?.value;return op==='g26_Select'?v?.uid===uid&&v.origin===zone:v===uid;});if(a)return a;}}
 if(s.decision?.type==='extended'&&s.decision.task.op.startsWith('g13_')){const op=s.decision.task.op,own={g13_JagaRevive:'grave',g13_FootRecover:'grave',g13_ManaHand:'mana'},enemy={g13_Murder:'hand',g13_Borrow:'grave',g13_Seal:'battle',g13_Sis:'battle'};if(zone===(player===s.decision.player?own[op]:enemy[op])||op==='g13_Lord'&&player===s.decision.player){const matches=m.actions.filter(a=>{const v=s.decision.choices[a.choice]?.value;return v&&((op==='g13_Lord'&&v.origin===zone&&v.uid===uid)||v===uid);});if(matches.length===1)return matches[0];}}
 if(zone==='hand'&&player===0&&s.decision?.type==='leaveHand')return m.actions.find(a=>a.kind==='leaveHand'&&a.uid===uid)||null;
 if(s.decision?.type==='extended'&&s.decision.player===player&&s.decision.task.op==='g23_Unseal'){const a=m.actions.find(a=>a.kind==='extended'&&s.decision.choices[a.choice]?.value===uid);if(zone==='seals')return a||null;if(zone==='battle'){const seals=s.players[player].seals||[];return m.actions.find(a=>seals.some(x=>x.uid===s.decision.choices[a.choice]?.value&&x.sealOf===uid))||null;}}
 if(zone==='extra'&&player===0&&!s.decision){const list=m.actions.filter(a=>a.kind==='play'&&a.origin==='extra'&&a.uid===uid);if(list.length===1)return list[0];}
 if(zone==='seals'&&s.decision?.task?.op==='g4_Airvo'){const a=m.actions.find(a=>{const v=s.decision.choices[a.choice]?.value;return v?.player===player&&v?.uid===uid;});if(a)return a;}
 if(s.decision?.type==='extended'&&['g4_Gate','g4_Airvo','g4_Untap','g4_World'].includes(s.decision.task.op)){
  const op=s.decision.task.op,actions=m.actions.filter(a=>{const v=s.decision.choices[a.choice]?.value;if(op==='g4_Airvo')return zone==='battle'&&v?.player===player&&v?.uid===uid&&v?.top===uid;if(player!==s.decision.player)return false;if(op==='g4_Untap')return zone==='mana'&&v===uid;return v?.origin===zone&&v?.uid===uid;});if(actions.length===1)return actions[0];
 }
 if(s.decision?.type==='extended'){const op=s.decision.task.op,own={g8_Daiou:'battle',g8_ArshuReturn:'mana',g8_DragonShieldStack:'shields'},enemy={g8_DaiouEnemy:'battle',g8_Zeos:'battle',g8_Try:'battle',g8_ArshuBounce:'battle',g8_Savak:'battle',g8_SavakShield:'shields'};if(zone===(player===s.decision.player?own[op]:enemy[op])){const a=m.actions.find(a=>a.kind==='extended'&&(s.decision.choices[a.choice]?.value?.uid||s.decision.choices[a.choice]?.value)===uid);if(a)return a;}}
 if(s.decision?.type==='extended'){const zones={g24_Bases:'grave',g24_Ura:'grave',g24_GraveHand:'grave',g24_DoomRevive:'grave',g24_EnemySacrifice:'battle'},op=s.decision.task.op,who=op==='g24_Minus'?1-s.decision.player:s.decision.player;if(player===who&&zone===(op==='g24_Minus'?'battle':zones[op])){const a=m.actions.find(a=>a.kind==='extended'&&s.decision.choices[a.choice]?.value===uid);if(a)return a;}}
 if(s.decision?.type==='extended'){const own={g14_G3Pick:'battle',g14_Put:'battle',g14_ReturnMana:'mana',g14_MomoShield:'shields'};if((player===s.decision.player&&zone===own[s.decision.task.op]||player!==s.decision.player&&zone==='battle'&&s.decision.task.op==='g14_Chicken')){const a=m.actions.find(a=>a.kind==='extended'&&s.decision.choices[a.choice]?.value===uid);if(a)return a;}}
 if(s.decision?.type==='extended'&&player===s.decision.player){const zones={g25_KeepShields:'shields',g25_Put:'battle',g25_PegEnter:'battle',g25_Oni:'battle',g25_ReturnMana:'mana',g25_PegPick:'mana',g25_PegUse:'mana',g25_Milled:'grave'};if(zone===zones[s.decision.task.op]){const a=m.actions.find(a=>a.kind==='extended'&&s.decision.choices[a.choice]?.value===uid);if(a)return a;}}
 if(s.decision?.type==='extended'&&['g21Shutter','s6Bounce','g21Enter','g21Fortress','g21BreakChoose','g19Minus','g19VenerakLeave','g19SheketAttack','g19Held','g19Dran','g19AmeliaReturn','g9Bounce','g9FireMode','g9Peecap','g9Hime'].includes(s.decision.task.op)){const op=s.decision.task.op,expectedZone=['g21Fortress','g21BreakChoose','g19Dran','g19AmeliaReturn'].includes(op)?'shields':'battle',expectedPlayer=['g21Enter','g19Held','g19Dran','g19AmeliaReturn','g9FireMode','g9Peecap','g9Hime'].includes(op)?s.decision.player:1-s.decision.player;if(zone===expectedZone&&player===expectedPlayer){const actions=m.actions.filter(a=>a.kind==='extended'&&s.decision.choices[a.choice]?.value===uid);if(actions.length===1)return actions[0];}}

 if(zone==='battle'&&s.decision?.type==='extended'&&['g7ValSelect','g7Energy','g7EnemyTap'].includes(s.decision.task.op)){const op=s.decision.task.op;if(op==='g7ValSelect'||player===s.decision.player){const action=m.actions.find(a=>s.decision.choices[a.choice]?.value===uid);if(action)return action;}}
 if(zone==='battle'){
  if(m.attacker&&player===1)matches=m.actions.filter(a=>a.kind==='attack'&&a.uid===m.attacker&&a.target===uid);
  else if(s.decision)matches=m.actions.filter(a=>
   (a.kind==='effect'&&a.targets?.length===1&&a.targets[0].player===player&&a.targets[0].uid===uid&&s.decision.effect!=='tapTwo')||
   (player===0&&['block','guardman','mugenTap','replaceUltra'].includes(a.kind)&&a.uid===uid)||
   (player===1&&['fight','dragonTap'].includes(a.kind)&&(a.target||a.uid)===uid)||
   (player===0&&['evolve','revealEvolve','deployEvolve','summonDDD','triggerEvolve'].includes(a.kind)&&a.baseUid===uid));
 }
 if(zone==='shields'&&player===1)matches=m.actions.filter(a=>(m.attacker&&a.kind==='attack'&&a.uid===m.attacker&&a.shield===uid)||(['judgeBreak','infinityShield'].includes(a.kind)&&a.shield===uid)||(a.kind==='breakShields'&&a.shields.length===1&&a.shields[0]===uid));
 return matches.length===1?matches[0]:null;
}
export function confirmEndTurn(s,a){return a?.kind==='endTurn'&&getLegalActions(s).some(x=>x.kind==='attack'&&x.player===a.player);}
export function manualPrimaryAction(s,ui,m=manualModel(s,ui)){
 if(m.human&&s.decision?.type==='manaPayment'){const move=m.actions.find(a=>a.kind==='confirmMana');return {label:move?'このマナで使う':'支払うマナを選ぶ',command:move?'move':'choices',move,disabled:false};}
 const hand=m.hand&&handCardModel(s,m.hand.uid,ui.handFace,m.actions);
 return battlePrimaryAction({actions:m.actions,human:m.human,finished:s.winner!==null,decision:!!s.decision,phase:s.phase,
  selected:!!m.hand,selectedMoves:hand?.faceActions||[],selectedType:hand?.face.type,attacker:!!m.attacker,attackChoice:m.attackChoice,
  endReview:m.actions.some(a=>a.id===ui.confirm&&a.kind==='endTurn')});
}
export function manualLogHTML(s){return `<div class="manual-log-events">${s.log.slice(-20).reverse().map(e=>`<div class="manual-log-event ${['break','finish','trigger','play','dddSummon'].includes(e.type)?'important':''}"><small>T${e.turn} · ${e.player===0?'自分':'相手'}</small><p>${esc(e.text)}</p></div>`).join('')}</div>`;}
export function selectionHint(s,inst){
 const actions=getLegalActions(s).filter(a=>a.player===0&&a.uid===inst.uid);
 if(s.phase==='charge'&&!s.decision)return 'マナに置けます';
 if(actions.some(a=>a.kind==='play'||a.kind==='mugenStart'||a.kind==='pandora'))return '使用できます';
 const c=card(inst),p=s.players[0];
 if(c.dream&&p.battle.some(x=>x.cardId===c.id))return '同名ドリームが場にあります';
 if(c.type==='creature'&&p.entryLimitThisTurn&&(p.enteredThisTurn||0)>=1)return 'このターンの登場上限です';
 if(c.mugenCrime)return 'ムゲンクライム：'+c.mugenCrime+'体のタップと、文明を満たす'+c.mugenCrime+'マナが必要です。軽減も反映します';
 return '必要なマナ・文明や条件が揃っていません';
}
const actionCard=(s,a)=>a.cardId?card(a.cardId):null;
const sourceZone=(s,a)=>a.origin==='mana'?'マナ':a.origin==='grave'?'墓地':a.origin==='hand'?'手札':s.decision?.type==='search'?'山札':s.players[0].hand.some(x=>x.uid===a.uid)?'手札':s.players[0].mana.some(x=>x.uid===a.uid)?'マナ':null;
const feedbackItems=ui=>ui.feedback?.items||[];
const feedbackStyle=ui=>`style="--change-delay:-${Math.min(3000,Math.max(0,Number(ui.feedbackAge)||0))}ms"`;
const zoneDelta=(ui,p,z)=>feedbackItems(ui).find(x=>x.player===p&&x.zone===z&&x.kind==='count')?.delta||0;
const deltaLabel=n=>`${n>0?'+':''}${n}`;
function feedbackHTML(ui){const items=feedbackItems(ui);if(!items.length)return '';const text=items.map(x=>`${x.player?'相手':'自分'}：${x.kind==='arrived'?card(x.cardId).name+'が登場':x.kind==='departed'?`場から${-x.delta}体移動`:`${x.zone==='mana'?'マナ':'シールド'} ${deltaLabel(x.delta)}枚`}`).join(' ／ ');return `<div class="recent-board-changes" role="status"><span>直前の変化</span><p title="${esc(text)}">${esc(text)}</p></div>`;}
function attackOverlayHTML(route){if(!route)return '';return `<svg class="attack-overlay ${route.preview?'is-preview':'is-active'}" aria-hidden="true"><defs><marker id="manual-attack-tip" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0 0L9 4.5L0 9Z"/></marker></defs><path class="attack-arrow-line" marker-end="url(#manual-attack-tip)"/><circle class="attack-arrow-origin" r="5"/></svg><div class="attack-route-strip" role="status"><span>${route.preview?'攻撃予定':'攻撃中'}</span><strong>${esc(route.from.label)} → ${esc(route.to.label)}</strong><small class="attack-offscreen-note"></small></div>`;}
function pagingHTML(pane,action){return pane.pages>1?`<div class="manual-paging"><button data-action="${action}" data-page="${pane.index-1}" ${pane.index===0?'disabled':''}>前へ</button><span>${pane.index+1} / ${pane.pages}</span><button data-action="${action}" data-page="${pane.index+1}" ${pane.index+1>=pane.pages?'disabled':''}>次へ</button></div>`:'';}
function mobileDockHTML(s,ui,m){
 const primary=manualPrimaryAction(s,ui,m),secondary=m.attackChoice?['manual-cancel-attack','選び直す']:m.attacker?['manual-clear-attacker','選択を解除']:m.hand?['manual-clear-hand','選択を解除']:null;
 return `<div class="manual-mobile-dock"><div>${secondary?`<button class="dock-secondary" data-action="${secondary[0]}">${secondary[1]}</button>`:''}<button class="dock-primary" data-action="manual-primary" data-context="${esc(m.context)}" ${primary.disabled?'disabled':''}>${esc(primary.label)}</button></div></div>`;
}

export function manualBoardHTML(s,ui,{art,icon}){
 const m=manualModel(s,ui),route=attackRoute(s,ui),handSelection=handCardModel(s,ui.hand,ui.handFace,m.actions),destinations=handSelection?.destinations||[];
 const specialZones=(p,who)=>`${p.extra?.length||p.seals?.length?`<div class="play-special-zones">${p.extra?.length?`<button data-action="zone-detail" data-player="${who}" data-zone="extra">超次元 <b>${p.extra.length}</b> ›</button>`:''}${p.seals?.length?`<button data-action="zone-detail" data-player="${who}" data-zone="seals">封印 <b>${p.seals.length}</b> ›</button>`:''}</div>`:''}`;
 const resources=(p,who)=>{
  const ready=p.mana.filter(x=>!x.tapped).reduce((n,x)=>n+manaValueAt(s,who,x),0),total=p.mana.reduce((n,x)=>n+manaValue(card(x)),0);
  return `<div class="play-resources"><span data-playback-zone="${who}:deck"><b>${p.deck.length}</b> 山札${p.deck.some(x=>x.g11Sideways)?`<small class="sideways-position" title="横向きのカード：上から${p.deck.flatMap((x,j)=>x.g11Sideways?[j+1]:[]).join("・")}枚目">横${p.deck.findIndex(x=>x.g11Sideways)+1}枚目${p.deck.filter(x=>x.g11Sideways).length>1?"ほか":""}</small>`:""}</span><span data-playback-zone="${who}:hand"><b>${p.hand.length}</b> 手札${who?'・非公開':''}</span><button class="${zoneDelta(ui,who,'mana')?'recent-change':''} ${who===0&&destinations.includes('mana')?'hand-mana-target':''}" ${feedbackStyle(ui)} data-playback-zone="${who}:mana" data-action="zone-detail" data-player="${who}" data-zone="mana" aria-label="${who?'相手':'自分'}のマナを見る・使用可能${ready}・合計${total}"><b>${ready}<small> / ${total}</small></b> マナ ${zoneDelta(ui,who,'mana')?`<em class="zone-change-delta">${deltaLabel(zoneDelta(ui,who,'mana'))}</em>`:''} ${icon('chevron',12)}</button><button data-playback-zone="${who}:grave" data-action="zone-detail" data-player="${who}" data-zone="grave" aria-label="${who?'相手':'自分'}の墓地を見る"><b>${p.grave.length}</b> 墓地 ${icon('chevron',12)}</button></div>`;
 };
 const shields=(p,who)=>`<div class="play-shields ${zoneDelta(ui,who,'shields')?'recent-change':''}" ${feedbackStyle(ui)} data-playback-zone="${who}:shields" aria-label="${who?'相手':'自分'}のシールド"><button class="zone-caption shield-rail-open" data-action="manual-shields" data-player="${who}" aria-label="${who?'相手':'自分'}のシールド${p.shields.length}つを拡大して見る">${icon('shield',13)} <b>${p.shields.length}</b>${zoneDelta(ui,who,'shields')?`<em class="zone-change-delta">${deltaLabel(zoneDelta(ui,who,'shields'))}</em>`:''}<small aria-hidden="true">↗</small></button><div class="shield-tiles" data-fit-grid="shields" data-fit-count="${p.shields.length}" data-fit-layout="rail" style="--fit-cols:${Math.max(1,Math.min(5,p.shields.length))};--fit-rows:${Math.max(1,Math.ceil(p.shields.length/5))}">${p.shields.map((x,i)=>{const a=boardChoiceModel(s,ui,who,'shields',x.uid,m),ex=exLifeShieldInfo(s,who,x.uid);return `<button data-visual-key="shield:${who}:${esc(x.uid)}" class="shield-tile ${a?'is-target':''} ${ex?'is-ex':''} ${route?.to.key===`shield:${who}:${x.uid}`?'is-attack-destination':''}" ${a?`data-action="battle-step" data-index="${a.id}"`:'disabled'} aria-label="${who?'相手':'自分'}のシールド${i+1}${shieldCards(x).length>1?'・'+shieldCards(x).length+'枚の束':''}${ex?'・EXライフ':''}${a?'を選ぶ':''}"><span>${i+1}</span>${shieldCards(x).length>1?`<small class="shield-card-count">${shieldCards(x).length}枚</small>`:''}${ex?'<small>EX</small>':''}</button>`;}).join('')||'<span class="no-shields">シールドなし</span>'}</div>${p.shields.flatMap(shieldCards).some(x=>x.faceUp)?`<button class="shield-faceup-button" data-action="manual-faceup-shields" data-player="${who}" aria-label="${who?'相手':'自分'}の表向きのシールドカードを見る">表 ${p.shields.flatMap(shieldCards).filter(x=>x.faceUp).length}</button>`:''}</div>`;
 const creatures=(p,who)=>`<div class="play-creatures ${who===0&&destinations.includes('battle')?'hand-summon-target':''}" data-playback-zone="${who}:battle" data-fit-grid="creatures" data-fit-count="${p.battle.length}" style="--fit-cols:${Math.max(1,Math.min(5,p.battle.length))};--fit-rows:${Math.max(1,Math.ceil(p.battle.length/5))}" aria-label="${who?'相手':'自分'}のバトルゾーン">${p.battle.map((x,index)=>{
  const c=card(x),data=effectiveCard(x,s),restricted=data.type==='creature'&&attackLocked(s,who,x),ready=m.human&&who===0&&m.actions.some(a=>a.kind==='attack'&&a.uid===x.uid),a=boardChoiceModel(s,ui,who,'battle',x.uid,m),chosen=s.decision?.type==='mugen'&&s.decision.chosen.includes(x.uid)||s.decision?.task?.op==='g4_Gate'&&s.decision.task.selected.some(y=>y.uid===x.uid);
  const arrived=feedbackItems(ui).some(c=>c.player===who&&c.zone==='battle'&&c.kind==='arrived'&&c.uid===x.uid);
  const holder=x.crossedTo&&p.battle.find(y=>y.uid===x.crossedTo.uid&&(y.incarnation||0)===x.crossedTo.incarnation);
  const flags=[data.type==='gear'?(holder?'装備：'+card(holder).name:'未クロス'):null,abilitiesIgnored(s,x)?'能力無効':null,exLifeShields(s,who,x).length?'EXライフ':null,data.blocker?'ブロッカー':null,isEvolution(x)?data.sMax?'S-MAX':data.starEvolution?'スター進化':data.gNeo?'G-NEO':'進化':null,!canUntap(x)?'アンタップ制限':null].filter(Boolean);
  return `<article ${feedbackStyle(ui)} class="play-creature ${x.sealed?'is-sealed':''} ${arrived?'recent-change':''} ${route?.from.key===`creature:${who}:${x.uid}`?'is-attack-origin':''} ${route?.to.key===`creature:${who}:${x.uid}`?'is-attack-destination':''} ${x.tapped?'is-tapped':''} ${ready?'is-ready':''} ${a?'is-target':''} ${m.attacker===x.uid?'is-selected':''} ${chosen?'is-chosen':''}"><button class="creature-tap" data-visual-key="creature:${who}:${esc(x.uid)}" data-action="manual-creature" data-uid="${esc(x.uid)}" data-player="${who}" data-focus-key="creature-${esc(x.uid)}" aria-label="${esc(c.name)}${data.type==='creature'?'・'+(x.tapped?'タップ中':'アンタップ')+(restricted?'・攻撃不可':''):''}${a?'を選ぶ':ready?'で攻撃先を選ぶ':'の詳細'}${!x.sealed&&data.type==='creature'&&sourceCardLabel(x,isEvolution(x))?'・'+sourceCardLabel(x,isEvolution(x)):''}" aria-pressed="${m.attacker===x.uid||chosen}">${art(x.cardId)}${restricted?'<span class="creature-attack-lock">攻撃不可</span>':''}${data.type==='creature'?sourceCardBadge(x,isEvolution(x)):''}<span class="compact-creature-index">${index+1}</span><span class="compact-creature-name">${esc(c.name)}</span><span class="compact-creature-state">${x.sealed?'封印中':ready?'攻撃可':x.tapped?'タップ中':isEvolution(x)?'進化':''}</span><span class="creature-current-power">${x.sealed?'封印 '+(p.seals||[]).filter(y=>y.sealOf===x.uid).length+'枚':data.type==='gear'?'クロスギア':data.type==='seed'?'タマシード':data.type==='field'?'下 '+flatten(x).length+'枚'+(x.g4WorldUsed?' · 使用済':''):number(power(x,x.uid===s.attack?.attacker,s))}</span>${chosen?`<span class="chosen-check">${icon('check',16)}</span>`:''}</button><strong class="creature-name">${esc(c.name)}</strong><div class="creature-tags">${arrived?'<span class="arrival-tag">登場</span>':''}${ready?'<span class="ready-tag">攻撃可</span>':x.tapped?'<span>タップ中</span>':data.type==='creature'&&x.entered===s.turn&&!isEvolution(x)&&!data.speedAttacker?'<span>出たターン</span>':''}${x.godLinks?.length?'<span>G・リンク '+(x.godLinks.length+1)+'枚</span>':''}${flags.slice(0,2).map(v=>`<span>${esc(v)}</span>`).join('')}</div><div class="creature-tools"><button data-action="manual-status" data-player="${who}" data-uid="${esc(x.uid)}" aria-label="${esc(c.name)}の状態を見る">状態</button>${x.under?.length||x.godLinks?.length?`<button data-action="evolution-stack" data-uid="${esc(x.uid)}" data-player="${who}">${x.godLinks?.length?'G・リンク '+(x.godLinks.length+1)+'枚':sourceCardLabel(x,isEvolution(x))}</button>`:''}</div></article>`;
 }).join('')||`<div class="play-empty">${icon('decks',22)}<span>クリーチャーはまだいません</span></div>`}</div>`;
 const playerAttack=m.attacker?m.actions.find(a=>a.kind==='attack'&&a.uid===m.attacker&&a.target==='player'&&!a.shield):null;
 const policies=[];
 if(s.players.some(p=>p.battle.some(x=>effectiveCard(x,s).g37Role==='parthenon')))for(const p of[0,1])policies.push((p?'相手':'自分')+'のパルテノン制限：登場 '+(s.players[p].enteredThisTurn||0)+'/3体・呪文 '+(s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0)+'/3枚（このターン）');
 for(const who of [0,1]){const b=s.players[who].battle.map(x=>effectiveCard(x,s)),label=who?'相手':'自分';if(b.some(c=>c.newWorld))policies.push(label+'の新世壊：魔導具・ドルスザク呪文の禁止を無視。魔導具を下に置いて1枚引ける');if(b.some(c=>c.onlyLightSpells))policies.push((who?'自分':'相手')+'は光以外の呪文を唱えられない（新世壊の例外あり）');if(b.some(c=>c.manaUntapThree))policies.push((who?'自分':'相手')+'がターン開始時にアンタップできるマナは3枚まで');}

 if(momoActive(s))policies.push('モモムゲン：両者の多色ではないクリーチャー能力・呪文効果を無視');
 if(genmuActive(s))policies.push('ゲンム：両者のコスト5以下のクリーチャー能力・呪文効果を無視');
 for(const who of [0,1]){
  if(s.players[1-who].battle.some(x=>effectiveCard(x,s).selfEntrySilence))policies.push(`${who?'相手':'自分'}のクリーチャー自身の登場時能力はキーナリーによりトリガーしない`);
  if(s.players[who].battle.some(x=>effectiveCard(x,s).watch))policies.push(`${who?'相手':'自分'}のジ・ウォッチ：相手のクリーチャー登場・呪文使用後にターンを飛ばせる`);
  if(s.players[who].battle.some(x=>effectiveCard(x,s).dragonOnlyEntry))policies.push('ドラゴ大王：両者のドラゴンではないクリーチャーは出るかわりに墓地へ');
  if(s.players[who].battle.some(x=>effectiveCard(x,s).savakGuard))policies.push(`${who?'相手':'自分'}はサッヴァークで表向きのシールドカード1枚を墓地へ置き、クリーチャーを残せる`);
  if(selfTriggersStopped(s,who))policies.push(`${who?'相手':'自分'}のクリーチャー自身の登場時・攻撃時能力はトリガーしない`);
  if(s.players[1-who].battle.some(x=>effectiveCard(x,s).entryGate))policies.push(`${who?'相手':'自分'}は手札からの実行でのみ登場できる`);
  if(s.players[1-who].battle.some(x=>effectiveCard(x,s).spellLockMaxCost))policies.push(`${who?'相手':'自分'}はコスト5以下の呪文を唱えられない`);
  if((s.g7NoLose||[]).some(x=>x.p===who))policies.push(`${who?'相手':'自分'}は次の自分のターンのはじめまで終極宣言でゲームに負けない`);
  if((s.g12NoLose||[]).some(x=>x.p===who&&x.turn===s.turn))policies.push(`${who?'相手':'自分'}はこのターン、ダイハードの効果でゲームに負けない`);
  if(s.players[1-who].battle.some(x=>x.tapped&&effectiveCard(x,s).bairas))policies.push(`${who?'相手':'自分'}はバイラス・カースドによりS・トリガーを使えない`);
  if(s.players[who].entryLimitThisTurn)policies.push(`${who?'相手':'自分'}のこのターンの登場：${Math.min(s.players[who].enteredThisTurn||0,1)} / 1体`);
 }
 return `<div class="play-board"><section class="opponent-field"><div class="play-player" data-visual-key="player:1"><span class="player-avatar">AI</span><strong>${esc(s.players[1].name)}</strong><small>相手</small>${specialZones(s.players[1],1)}<button class="field-overview-button" data-action="manual-field" data-player="1" aria-label="相手の場を拡大して見る">場 ${s.players[1].battle.length} ↗</button>${playerAttack?`<button class="direct-attack" data-action="battle-step" data-index="${playerAttack.id}">${icon('battle',14)} ${s.players[1].shields.length?'相手へ攻撃':'ダイレクトアタック'}</button>`:''}</div>${resources(s.players[1],1)}${shields(s.players[1],1)}${creatures(s.players[1],1)}</section><div class="board-divider"><span>DUEL MASTERS</span><b>VS</b><span>DECK LAB</span></div><section class="own-field">${creatures(s.players[0],0)}${shields(s.players[0],0)}<div class="play-player ${destinations.includes('spell')?'hand-spell-target':''}" data-visual-key="player:0"><span class="player-avatar mine">YOU</span><strong>${esc(s.players[0].name)}</strong><small>自分</small>${specialZones(s.players[0],0)}<button class="field-overview-button" data-action="manual-field" data-player="0" aria-label="自分の場を拡大して見る">場 ${s.players[0].battle.length} ↗</button></div>${resources(s.players[0],0)}</section></div>${policies.length?`<details class="play-policies"><summary>${icon('info',14)} 適用中の制限・効果 <b>${policies.length}</b></summary><ul>${policies.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}`;
}
const flatten=c=>(c.under||[]).flatMap(x=>[x,...flatten(x)]);
function button(a,{primary=false,quiet=false,label=null}={}){return `<button class="btn ${primary?'primary':quiet?'ghost':''}" data-action="battle-step" data-index="${a.id}" data-focus-key="action-${a.kind}-${a.id}">${esc(label||a.label)}</button>`;}
function handHTML(s,ui,m,{art,icon}){
 if(ui.mobile)return '';
 const open=ui.mobile?ui.mobilePanel==='hand':(!s.decision&&s.phase!=='attack')||ui.handOpen;
 const pane=pageWindow(s.players[0].hand,ui.handPage,ui.handPageSize||6),shown=ui.mobile?pane.items:s.players[0].hand;
 return `<div class="manual-hand"><div class="hand-heading"><strong>手札 <b>${s.players[0].hand.length}</b></strong><small>${m.human&&!s.decision?'カードをタップして操作':'自分だけが見られます'}</small>${open?'<span class="hand-swipe-hint">左右にスワイプ</span>':''}${s.decision||s.phase==='attack'?`<button data-action="manual-hand-toggle" aria-expanded="${open}">${open?'閉じる':'手札を見る'} ${icon('chevron',12)}</button>`:''}</div>${open?`<div class="manual-hand-cards">${shown.map(x=>{const selectable=m.human&&m.actions.some(a=>a.uid===x.uid&&(a.kind==='play'||a.kind==='charge'||a.kind==='mugenStart'||a.kind==='pandora'));return `<button class="manual-hand-card ${ui.hand===x.uid?'is-selected':''} ${selectable?'is-playable':''}" data-action="hand-card" data-uid="${esc(x.uid)}" data-focus-key="hand-${esc(x.uid)}" aria-pressed="${ui.hand===x.uid}" aria-label="手札の${esc(card(x).name)}${selectable?'・選択可能':''}">${art(x.cardId)}<span class="hand-cost-mobile" aria-hidden="true">${esc(card(x).cost)}</span>${selectable?`<span class="hand-can-use">${s.phase==='charge'?'マナ候補':'使用可'}</span>`:''}<strong>${esc(card(x).name)}</strong></button>`;}).join('')||'<div class="empty-hand">手札はありません</div>'}</div>${ui.mobile?pagingHTML(pane,'manual-hand-page'):''}`:''}</div>`;
}
function choicesHTML(s,ui,m,h){
 if(s.decision?.type==='manaPayment')return manaPaymentHTML(s,m.actions,h);
 const positive=m.actions.filter(a=>!quietKinds.has(a.kind)&&!(a.kind==='draw'&&a.n===0)),quiet=m.actions.filter(a=>quietKinds.has(a.kind)||(a.kind==='draw'&&a.n===0));
 const query=(ui.filter||'').normalize('NFKC').toLowerCase(),filtered=positive.filter(a=>a.label.normalize('NFKC').toLowerCase().includes(query)),pane=pageWindow(filtered,ui.choicePage,ui.choicePageSize||4),shown=ui.mobile?pane.items:filtered;
 return `${s.decision?.task?.op==='g9Number'?`<label class="choice-search">宣言する数字<input id="manual-number" class="field" inputmode="numeric" placeholder="0以上の整数、または∞" aria-label="宣言する数字"></label><button class="btn primary" data-action="manual-number-submit" data-index="${m.actions[0].id}">入力した数字を宣言</button>`:''}${m.source?`<div class="resolving-card"><span class="choice-source-art">${h.art(card(m.source).referenceId||m.source)}</span><div><small>解決中のカード</small><strong>${esc(card(m.source).name)}${card(m.source).copyOf?` / ${esc(card(card(m.source).copyOf).name)}の能力`: ''}</strong></div><button class="icon-btn" data-action="card-detail" data-id="${esc(card(m.source).copyOf||m.source)}" aria-label="解決中の能力を見る">${h.icon('info',18)}</button></div>`:''}${positive.length>8?`<label class="choice-search">${h.icon('search',16)}<input id="manual-choice-search" type="search" value="${esc(ui.filter||'')}" placeholder="選択肢をカード名で絞り込む" aria-label="選択肢を絞り込む"></label>`:''}<div class="manual-choices">${shown.map(a=>{const c=actionCard(s,a),zone=sourceZone(s,a);return `<button class="choice-card" data-action="battle-step" data-index="${a.id}" data-focus-key="action-${a.kind}-${a.id}">${c?`<span class="choice-thumb">${h.art(c.id)}</span>`:`<span class="choice-symbol">${h.icon(['judgeAgain','useRamp','useTrigger','declareDDD'].includes(a.kind)?'bolt':'check',19)}</span>`}<span class="choice-copy">${zone?`<small>${zone}${a.cost!=null?' · '+a.cost+'マナ':''}</small>`:''}<strong>${esc(a.label)}</strong></span>${h.icon('chevron',14)}</button>`;}).join('')||(!query?'':`<p class="small">一致する選択肢がありません。<button class="details-link" data-action="manual-clear-filter">絞り込みを解除</button></p>`)}</div>${ui.mobile?pagingHTML(pane,'manual-choice-page'):''}${quiet.length?`<div class="manual-secondary">${quiet.map(a=>button(a,{quiet:true})).join('')}</div>`:''}`;
}
function mainActions(s,ui,m,h){
 if(s.winner!==null)return `<div class="manual-result"><strong>${s.winner===0?s.challenge?RIVAL_IDS.includes(s.challenge.heroId)?'ライバル撃破！':'主人公撃破！':'勝利！':'対戦終了'}</strong><p>${esc(s.reason)}</p><div class="manual-secondary"><button class="btn primary" data-action="battle-again">もう一度対戦</button><button class="btn" data-action="manual-replay">記録を見返す</button>${s.challenge?'<button class="btn" data-action="end-battle">'+(RIVAL_IDS.includes(s.challenge.heroId)?'ライバル':'主人公')+'を選ぶ</button>':''}</div></div>`;
 if(!m.human)return `<div class="manual-wait"><span class="running-dot"></span><div><strong>相手AIが考えています</strong><small>盤面を見ながら待ちましょう。</small></div></div>`;
 if(ui.confirm!==null){const a=m.actions.find(a=>a.id===ui.confirm&&a.kind==='endTurn');if(a)return `<div class="end-turn-review"><strong>まだ攻撃できるクリーチャーがいます</strong><p>攻撃せずにターンを終了しますか？</p><div class="manual-secondary"><button class="btn" data-action="manual-cancel-end">対戦に戻る</button><button class="btn primary" data-action="manual-confirm-end" data-index="${a.id}">ターンを終える</button></div></div>`;}
 if(m.attackChoice){const route=attackRoute(s,ui);return `<div class="attack-preview-review"><small>攻撃先を確認</small><strong>${esc(route.from.label)}<span>→ ${esc(route.to.label)}</span></strong><div class="manual-primary"><button class="btn primary" data-action="manual-confirm-attack" data-index="${m.attackChoice.id}">攻撃を確定</button><button class="btn ghost" data-action="manual-cancel-attack">選び直す</button></div></div>`;}
 if(s.decision)return `${['g13_Murder','g37DarkMasters'].includes(s.decision.task?.op)?'<button class="btn full" data-action="zone-detail" data-player="1" data-zone="hand">相手の手札を見る</button>':''}${choicesHTML(s,ui,m,h)}`;
 if(s.phase==='charge'){
  const a=m.actions.find(a=>a.kind==='charge'&&a.uid===ui.hand),skip=m.actions.find(a=>a.kind==='skipCharge');
  return `${selectedHandHTML(s,m,h)}<div class="manual-primary"><button class="btn primary" data-action="battle-step" data-index="${a?.id??''}" ${a?'':'disabled'}>${h.icon('bolt',17)} マナに置く</button>${button(skip,{quiet:true,label:'置かずに進む'})}</div>`;
 }
 if(s.phase==='main'){
  const plays=m.actions.filter(a=>a.uid===ui.hand&&(a.kind==='play'||a.kind==='mugenStart'||a.kind==='pandora')),extra=m.actions.filter(a=>(a.kind==='play'&&['mana','grave','deck','extra'].includes(a.origin))||(a.kind==='mugenStart'&&a.uid!==ui.hand)||a.kind==='pandora'&&a.origin!=='hand'||a.kind==='hyper'||a.kind==='crossGear'),next=m.actions.find(a=>a.kind==='toAttack');
  const manaRows=manaSummonModel(s),manaReady=manaRows.filter(r=>r.actions.length).length;
  return `${manaRows.length?`<button class="btn full manual-mana-summon-entry" data-action="zone-detail" data-player="0" data-zone="mana">${manaReady?'マナから使う（'+manaReady+'枚使用可能）':'マナからの召喚条件を確認'}</button>`:''}${selectedHandHTML(s,m,h)}<div class="manual-primary">${plays.map(a=>{const label=a.kind==='pandora'?'パンドラ・シフトで超次元へ · 2マナ':a.freeSummon?a.freeSummon+'で召喚':a.alternative==='gio'?'手札を公開して軽減する':a.alternative==='snow'?'スノーフェアリー5体を捨てて使う':a.kind==='mugenStart'?'ムゲンクライム'+card(a.cardId).mugenCrime+'で召喚':`${playFaces(card(a.cardId))[a.face||0].type==='spell'?'呪文を使う':playFaces(card(a.cardId))[a.face||0].type==='gear'?'ジェネレートする':playFaces(card(a.cardId))[a.face||0].type==='seed'?'タマシードを使う':'召喚する'} · ${a.cost??4}マナ${card(a.cardId).spellFace?`（${a.face===1?'呪文側':'クリーチャー側'}）`:''}`;return handEvolutionButtonHTML(s,a,h,label,`action-${a.kind}-${a.id}`)||button(a,{primary:true,label});}).join('')}${button(next,{quiet:true,label:'攻撃へ進む →'})}</div>${extra.length&&ui.mobile?`<button class="btn full manual-extra-button" data-action="manual-extra-methods">クロス・山札・マナ・墓地などから使う (${extra.length})</button>`:extra.length?`<details class="manual-extra"><summary>クロス・山札・マナ・墓地などから使う <b>${extra.length}</b></summary><div class="manual-secondary">${extra.map(a=>button(a)).join('')}</div></details>`:''}`;
 }
 const attacks=m.actions.filter(a=>a.kind==='attack'&&a.uid===m.attacker),end=m.actions.find(a=>a.kind==='endTurn');
 return `${m.attacker?`<div class="selected-attacker"><span>${h.icon('battle',20)}</span><div><small>攻撃するクリーチャー</small><strong>${esc(card(s.players[0].battle.find(x=>x.uid===m.attacker)).name)}</strong></div><button class="btn ghost" data-action="manual-clear-attacker">選び直す</button></div><div class="manual-attack-targets">${ui.mobile?`<button class="btn" data-action="manual-target-list">攻撃先を一覧から選ぶ (${attacks.length})</button>`:attacks.map(a=>button(a,{primary:a.target==='player'})).join('')}</div>`:`<p class="manual-instruction">${m.actions.some(a=>a.kind==='attack')?'盤面の「攻撃可」のカードをタップしてください。':'このターンに攻撃できるクリーチャーはいません。'}</p>`}<div class="manual-secondary">${end?button(end,{quiet:true,label:'ターンを終える →'}):'<small>攻撃が必要なクリーチャーが残っています。</small>'}</div>`;
}
function selectedHandHTML(s,m,h){if(!m.hand)return '<div class="selection-empty">手札を選ぶと、ここに使い方を表示します。</div>';const c=card(m.hand);return `<div class="selected-hand-info"><span class="selected-card-mini">${h.art(c.id)}</span><div><strong>${esc(c.name)}</strong><small>${esc(selectionHint(s,m.hand))}</small></div><button class="btn ghost" data-action="card-detail" data-id="${esc(c.id)}">能力を見る</button></div>`;}

export function manualScreenHTML(s,ui,{art,icon,displayCard,practice=false,undoCount=0}={}){
 const m=manualModel(s,ui),h={art,icon,displayCard},latest=s.log.at(-1),phase=s.phase;
 const phaseItems=[['charge','1','マナ'],['main','2','召喚・呪文'],['attack','3','攻撃']];
 return `<div class="manual-topbar"><div class="manual-heading"><span class="live-duel-dot"></span><strong>${s.challenge?RIVAL_IDS.includes(s.challenge.heroId)?'ライバル戦':'主人公戦':'手動対戦'}</strong><span class="manual-turn">TURN ${s.turn}</span><span class="manual-practice">${practice?'練習':'通常'}</span></div><div class="manual-top-tools"><button class="btn ghost manual-speed-button" data-action="manual-speed" aria-label="AIの速さを変更">AI ${aiSpeedLabel(ui.aiSpeed)}</button><button class="icon-btn manual-options-button" data-action="manual-options" aria-label="対戦メニュー"><span aria-hidden="true">⋯</span></button><button class="icon-btn" data-action="leave-battle" aria-label="対戦を終了">${icon('close',20)}</button></div></div><div class="manual-layout"><section class="manual-stage ${s.decision?.type==='manaPayment'?'mana-payment-open':''} mobile-panel-${esc(ui.mobilePanel||'closed')} ${ui.aiPlayback?.cue?'has-ai-playback':''}"><div class="manual-turnbar ${!m.human&&s.winner===null?'is-opponent':''}"><strong>${s.winner!==null?'対戦終了':m.human?'あなたの操作':'相手の操作'}</strong><ol class="manual-phase">${phaseItems.map(([key,n,title])=>`<li class="${phase===key?'is-current':''}" ${phase===key?'aria-current="step"':''}><b>${n}</b>${title}</li>`).join('')}</ol></div>${aiPlaybackHTML(ui.aiPlayback)}<div class="manual-board-frame"><div class="manual-board-area" tabindex="0" role="region" aria-label="${ui.mobile?'対戦の盤面全体':'対戦の盤面。上下にスクロールできます'}">${manualBoardHTML(s,ui,h)}</div>${attackOverlayHTML(attackRoute(s,ui))}</div>${handShelfHTML(s,ui,h)}<div class="manual-console ${ui.panelMinimized?'is-minimized':''}"><div class="manual-guide" role="status" aria-live="polite" tabindex="-1"><div><span class="guide-kicker">${s.decision?'RESOLVE':'NEXT ACTION'}</span><h2>${esc(m.title)}</h2><p>${esc(m.help)}</p></div>${m.progress?`<strong class="choice-progress">${esc(m.progress)}</strong>`:''}<div class="manual-panel-tools"><button class="manual-help-button" data-action="manual-help" aria-label="今の操作の説明を見る">${icon('help',17)}</button><button class="manual-panel-toggle" data-action="manual-panel-toggle" aria-expanded="${!ui.panelMinimized}" aria-controls="manual-controls" data-focus-key="panel-toggle">${ui.mobile?'盤面に戻る':ui.panelMinimized?'操作を開く':'盤面を広く'}</button></div></div><div class="manual-console-content" id="manual-controls">${ui.mobile&&ui.mobilePanel==='card'?handInspectorHTML(s,ui,h):`${feedbackHTML(ui)}${handHTML(s,ui,m,h)}<div class="manual-action-body">${mainActions(s,ui,m,h)}</div>`}</div><div class="manual-console-footer">${practice&&s.winner===null?`<button data-action="battle-hint" ${m.human?'':'disabled'}>${icon('spark',15)} ヒント</button><button data-action="undo-battle" ${undoCount?'':'disabled'}>${icon('history',15)} 待った</button>`:'<span>能力の処理は自動です</span>'}<button data-action="manual-log" aria-expanded="${!!ui.logOpen}">${icon('history',14)} 対戦ログ</button></div></div>${mobileDockHTML(s,ui,m)}</section><aside class="manual-side ${ui.logOpen?'is-open':''}"><section class="manual-log-summary"><span class="guide-kicker">LAST PLAY</span><p>${esc(latest?.text||'対戦を開始しました')}</p></section><section class="manual-log ${ui.logOpen?'is-open':''}"><button class="manual-log-heading" data-action="manual-log" aria-expanded="${!!ui.logOpen}"><strong>対戦ログ</strong><span>最新20件 <span class="manual-log-close">閉じる ×</span>${icon('chevron',14)}</span></button>${manualLogHTML(s)}</section><p class="manual-privacy">相手の手札・山札・シールドの内容は非公開です。カードの見た目は識別補助用です。</p></aside></div>`;
}

// Only public shield information is passed to the expanded picker.
export function manualShieldModel(s,ui,player){
 if(![0,1].includes(player))return null;const m=manualModel(s,ui),p=s.players[player],ids=new Set(p.shields.map(x=>x.uid));
 const groups=p.shields.map((x,i)=>({number:i+1,count:shieldCards(x).length,ex:!!exLifeShieldInfo(s,player,x.uid)?.active,faceUp:shieldCards(x).filter(c=>c.faceUp).map(c=>({id:c.cardId,name:card(c).name})),action:boardChoiceModel(s,ui,player,'shields',x.uid,m)}));
 const direct=new Set(groups.flatMap(x=>x.action?[x.action.id]:[]));const actions=m.human?m.actions.filter(a=>direct.has(a.id)||ids.has(a.shield)||a.shields?.some(uid=>ids.has(uid))||player===1&&m.attacker&&a.kind==='attack'&&a.uid===m.attacker&&a.target==='player'):[];
 return {player,groups,actions};
}

// The same card layout is used for inspecting a zone and selecting payment.
export function manaSummonModel(s,owner=0){
 if(owner!==0)return [];
 const actions=getLegalActions(s).filter(a=>a.player===0&&a.kind==='play'&&a.origin==='mana');
 return s.players[owner].mana.flatMap(x=>{
  const c=card(x),plays=actions.filter(a=>a.uid===x.uid);if(!c.manaSummon&&!plays.length)return [];
  const data={...c,summonOrigin:'mana'},cost=summonCost(s,owner,data);let reason='';
  if(!plays.length){
   if(s.winner!==null)reason='対戦は終了しています。';
   else if(s.active!==owner)reason='自分のターンのメインステップに召喚できます。';
   else if(s.decision)reason='今の能力や選択の処理が終わってから召喚できます。';
   else if(s.phase!=='main')reason='メインステップに進むと召喚できます。';
   else if(c.evolution&&!evolutionBases(s,owner,c).length)reason=c.evolution.ultimate?'場に究極進化クリーチャーの進化元が必要です。':'場に条件に合う進化元が必要です。';
   else if(!canCastSpell(s,owner,data,'mana')||!canEnterCreature(s,owner,data,{origin:'mana',execution:true}))reason='現在の召喚制限により、マナゾーンから召喚できません。';
   else if(!manaPayment(paymentPool(s,owner,[],data),{...data,cost}))reason='未使用のマナか、必要な文明が足りません（必要 '+cost+'マナ）。';
   else reason='現在は召喚条件を満たしていません。';
  }
  return [{uid:x.uid,cardId:x.cardId,name:c.name,cost,actions:plays,reason}];
 });
}
export function manaSummonHTML(s,owner=0,{art=()=>''}={}){
 const rows=manaSummonModel(s,owner);if(!rows.length)return '';
 return `<section class="mana-summon-list" aria-label="マナからの召喚"><h3>マナから使う</h3>${rows.map(r=>`<article class="mana-summon-row">${art(r.cardId)}<div class="grow"><strong>${esc(r.name)}</strong>${r.reason?`<p class="small">${esc(r.reason)}</p>`:`<small>マナゾーンから使用可能</small>`}<div class="mana-summon-buttons">${r.actions.map(a=>`<button class="btn primary" data-action="manual-zone-choice" data-index="${a.id}">${playFaces(card(a.cardId))[a.face||0].type==='creature'?'ここから召喚':'ここから使う'} · ${a.cost??r.cost}マナ</button>`).join('')}<button class="btn sm" data-action="card-detail" data-id="${esc(r.cardId)}">能力を見る</button></div></div></article>`).join('')}</section>`;
}
export function manaZoneHTML(rows,{art,actions=[],selected=[],owner=0,selecting=false,context='',state=null}={}){
 return '<div class="mana-card-track" tabindex="0" aria-label="マナのカード一覧・左右にスクロール">'+rows.map(x=>{
  const c=card(x),a=actions.find(a=>a.kind==='selectMana'&&a.uid===x.uid),chosen=selected.includes(x.uid),hidden=x.faceDown&&owner!==0,usable=!x.tapped,name=x.faceDown&&owner===0?'裏向き：'+card(x.cardId).name:c.name;
  return '<button class="mana-card '+(x.tapped?'is-tapped ':'')+(chosen?'is-selected':'')+'" '+(selecting?'data-action="manual-mana" data-context="'+esc(context)+'" data-index="'+(a?.id??'')+'" data-focus-key="mana-'+esc(x.uid)+'" aria-pressed="'+chosen+'" '+(!a?'disabled':''):'data-action="card-detail" data-id="'+esc(hidden?'':x.cardId)+'" '+(hidden?'disabled':''))+' aria-label="'+esc((hidden?'裏向きのマナ':name)+'・'+(chosen?'選択中':usable?'未使用・アンタップ':'使用済・タップ')+(x.paymentBird?'・バトルゾーンから支払い':''))+'"><span class="mana-card-art">'+(hidden?'<span class="mana-hidden">?</span>':art(x.cardId))+'</span><strong>'+esc(hidden?'裏向きのマナ':name)+'</strong><small>'+esc(hidden?'文明非公開':x.paymentBird||x.paymentAllColors?'すべての文明':manaColors(c).filter(Boolean).join('/')||'無色')+' · '+(x.paymentValue??(state?manaValueAt(state,owner,x):manaValue(c)))+'マナ</small><span class="mana-card-state">'+(chosen?'✓ 選択中':usable?'未使用':'↻ 使用済')+'</span>'+(x.paymentBird?'<small>バトルゾーン</small>':'')+'</button>';
 }).join('')+'</div>';
}
export function manaPaymentHTML(s,actions,h){
 const d=s.decision,status=manaSelectionStatus(d),context=manualModel(s).context,confirm=actions.find(a=>a.kind==='confirmMana'),cancel=actions.find(a=>a.kind==='cancelMana');
 return '<section class="mana-payment" aria-label="マナの支払い">'+paymentReviewHTML(s)+'<div class="mana-payment-summary" role="status"><strong>選択 '+status.amount+' / 必要 '+status.cost+'マナ</strong><span>'+d.selected.length+'枚選択</span></div>'+(d.source?'<p class="mana-payment-source">'+esc(card(d.source).name)+'</p>':'')+'<div class="mana-color-status" aria-label="必要な文明">'+status.colors.map(c=>'<span class="'+(c.paid?'is-paid':'')+'">'+(c.paid?'✓ ':'○ ')+esc(c.name)+'</span>').join('')+'</div>'+manaZoneHTML(d.pool,{art:h.art,actions,selected:d.selected,selecting:true,context})+'<p class="mana-payment-help">'+(status.valid?'この組み合わせで支払えます。':status.amount<status.cost?'必要なマナ数と文明を満たすように選んでください。':'必要な文明ごとに別のカードを選んでください。')+'</p><div class="mana-payment-footer"><button class="btn primary" data-action="manual-mana" data-context="'+esc(context)+'" data-index="'+(confirm?.id??'')+'" '+(!confirm?'disabled':'')+'>このマナで使う</button>'+(cancel?'<button class="btn" data-action="manual-mana" data-context="'+esc(context)+'" data-index="'+cancel.id+'">キャンセル</button>':'')+'</div></section>';
}
