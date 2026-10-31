// Stable character IDs are separate from deck compositions and keep old wins.
export const CHARACTER_ERAS=Object.freeze([
 {id:'shobu',label:'勝舞編',normal:['shobu','hakuoh','kurojo','mimi','tenchi','george'],bosses:['zakira']},
 {id:'katta',label:'勝太編',normal:['katta','basara','lucifer','kojiro','benchan','butchake','hokaben','yodel'],bosses:['yomi','izumo','basara-final']},
 {id:'joe',label:'ジョー編',normal:['joe','kira','boltz','cap','momo','hyde','himiko'],bosses:['zero','abaku','gendle']},
 {id:'win',label:'ウィン編',normal:['win','kaiza','ugata','boy','karen','fargo','issa'],bosses:['kaiza-final']}
]);
export const EXTRA_CHARACTER_IDS=Object.freeze(CHARACTER_ERAS.flatMap(e=>[...e.normal,...e.bosses]).filter(id=>!['shobu','katta','joe','win','hakuoh','basara','kira','kaiza'].includes(id)));
export const CHARACTER_NAMES=Object.freeze({shobu:'切札勝舞',hakuoh:'白凰',kurojo:'黒城凶死郎',mimi:'黄昏ミミ',tenchi:'天地龍牙',george:'ジョージ',zakira:'ザキラ',katta:'切札勝太',basara:'赤城山バサラ',lucifer:'ルシファー',kojiro:'コジロー',benchan:'べんちゃん',butchake:'ぶっちゃけ',hokaben:'ホカベン',yodel:'ヨーデル',yomi:'ヨミ',izumo:'イズモ','basara-final':'赤城山バサラ〈最終決戦版〉',joe:'切札ジョー',kira:'キラ',boltz:'ボルツ',cap:'キャップ',momo:'うららかもも',hyde:'ハイド',himiko:'ヒミコ',zero:'ゼーロ',abaku:'鬼札アバク',gendle:'ジェンドル',win:'斬札ウィン',kaiza:'プリンス・カイザ',ugata:'ウガタ',boy:'覚知山ボウイ',karen:'カレン',fargo:'霞ヶ関ファルゴ',issa:'最上川イッサ','kaiza-final':'プリンス・カイザ〈最終決戦版〉'});
export const characterEra=id=>CHARACTER_ERAS.find(e=>e.normal.includes(id)||e.bosses.includes(id));
export const isCharacterBoss=id=>!!characterEra(id)?.bosses.includes(id);
export const challengeKind=id=>isCharacterBoss(id)?'ボス':['shobu','katta','joe','win'].includes(id)?'主人公':['hakuoh','basara','kira','kaiza'].includes(id)?'ライバル':'キャラクター';
export function characterCleared(id,progress={},manualResults={}){return [progress?.[id]?.wins,manualResults?.['character:'+id]?.wins].some(n=>Number.isSafeInteger(n)&&n>0);}
export function characterUnlockState(id,{progress={},manualResults={},unlocks={}}={}){const era=characterEra(id);if(!era)return{unlocked:false,remaining:[],era:null};const remaining=era.normal.filter(id=>!characterCleared(id,progress,manualResults));return{unlocked:!isCharacterBoss(id)||unlocks?.[id]===true||remaining.length===0,remaining,era};}
export function recordCharacterUnlocks(unlocks={},progress={},manualResults={}){let next=unlocks||{};for(const era of CHARACTER_ERAS)if(era.normal.every(id=>characterCleared(id,progress,manualResults)))for(const id of era.bosses)if(next[id]!==true){if(next===unlocks)next={...unlocks};next[id]=true;}return next;}
