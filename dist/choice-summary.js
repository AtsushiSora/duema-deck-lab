import {card,playFaces} from './engine.js';
const effects={draw1:'カードを1枚引く',draw2:'カードを2枚引く',draw3:'カードを3枚引く',drawUpTo3:'カードを3枚まで引く',ramp1:'山札の上1枚をマナに置く',ramp2:'山札の上2枚をマナに置く',discardAll:'相手の手札をすべて捨てさせる',discard:'相手の手札を捨てさせる',bounce:'クリーチャーを手札に戻す',bounceOptional:'クリーチャーを手札に戻すか選ぶ',destroySmall:'パワー2000以下の相手クリーチャーを破壊する',tapAll:'相手のクリーチャーをすべてタップする',justDiver:'次の自分のターンのはじめまで、選ばれず攻撃されない',endUntap:'このクリーチャーをアンタップするか選ぶ',g166EndUntap:'このクリーチャーをアンタップする',shieldEntryTapLock:'相手をタップし、アンタップを制限する'};
const tasks={g251EntryDraw:'登場時のドローを処理する',g1_Copy:'ほかのクリーチャーの能力をコピーする',g1_Skip:'ターンの残りを飛ばす',g19Yobi:'ヨビニオンで山札からクリーチャーを出す'};
export function choiceEffectSummary(s,a){
 if(!['orderEntry','orderEffect','orderTrigger','orderGS'].includes(a.kind))return '';
 if(a.kind==='orderGS')return '相手クリーチャー1体を、このターン攻撃できなくする';
 const entry=(a.kind==='orderEntry'?s.triggers?.entries:s.pendingEffects)?.find(e=>e.effectId===a.effectId),c=a.cardId&&card(a.cardId);
 if(entry&&effects[entry.effect])return effects[entry.effect];
 if(entry?.effect==='extended'&&tasks[entry.task?.op])return tasks[entry.task.op];
 const faces=c?playFaces(c):[],inst=s.players[a.player??0]?.hand.find(x=>x.uid===a.uid),index=a.kind==='orderTrigger'?(s.triggers?.faceByUid?.[inst?.uid]||0):0,source=faces[index]||c;
 const lines=String(source?.text||'').split(/[\n■]+/).map(x=>x.trim()).filter(Boolean),matching=lines.find(t=>a.kind==='orderTrigger'?/S.?トリガー/.test(t):entry?.effect==='extended'?/出た時|出たとき|出る時|出るとき/.test(t):/出た時|出たとき/.test(t));
 const text=(a.kind==='orderEntry'?matching:null)||(!entry&&a.kind==='orderTrigger'?'S・トリガーで、このカードを使う':null);
 return text?(text.length>115?text.slice(0,114)+'…':text):'このカードの能力を処理します。詳しい条件は「詳細」で確認できます。';
}
