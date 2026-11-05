import {normalizeDeckTags} from './deck-tags.js?v=0.555.0';
const signature=deck=>JSON.stringify([deck.name,deck.format||'original',...(deck.cards||[]).map(r=>[r.id,r.count]).sort((a,b)=>a[0].localeCompare(b[0])),deck.description||'',deck.historicalId||'',deck.tournament||'',deck.templateId||'',deck.sourceTitle||'',deck.source||'',deck.product||null,!!deck.favorite,normalizeDeckTags(deck.tags).sort()]);
export function deckAccountStatus(deck,role,state,{localOK=true}={}){
 if(!localOK)return {kind:'warning',text:'端末への保存に失敗',note:'編集を閉じずに、デッキを書き出して保管してください。'};
 if(!state.user)return {kind:'local',text:'この端末に保存済み',note:'アカウントへ保存すると、別の端末でも取り込めます。'};
 if(!state.loaded)return {kind:'pending',text:'アカウント保存を確認できていません',note:'アカウント画面で保存内容を再読込してください。'};
 const rows=state.cloud?.snapshot?.[role==='opponent'?'friends':'decks']||[];
 if(rows.some(d=>signature(d)===signature(deck)))return {kind:'saved',text:'アカウントにも保存済み',note:'最後に確認したアカウントの構成と一致しています。'};
 return {kind:'pending',text:'アカウントには未保存の変更あり',note:'アカウント画面の「この端末のデッキを保存」で保存できます。'};
}
