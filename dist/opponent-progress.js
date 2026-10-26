// Use the actual forty cards, so copies and renamed opponents share a mark.
// Changing the composition creates a new challenge rather than inheriting a win.
export function opponentProgressKey(deck,registry){
 if(!deck?.cards?.length)return null;
 try{
  const rows=registry.resolveRows(deck.cards).sort((a,b)=>a.id.localeCompare(b.id));
  if(rows.reduce((n,r)=>n+r.count,0)!==40)return null;
  return 'deck-v1:'+JSON.stringify([deck.format||'original',rows.map(r=>[r.id,r.count])]);
 }catch{return null;}
}
export function recordManualVictory(progress,battle,registry){
 const previous=progress||{};
 if(battle?.state?.winner!==0||battle.decks?.length!==2)return previous;
 const key=opponentProgressKey(battle.decks[1],registry);
 if(!key||previous[key]===true)return previous;
 return {...previous,[key]:true};
}
export function isOpponentDefeated(deck,progress,registry,heroProgress){
 const key=opponentProgressKey(deck,registry);
 if(key&&progress?.[key]===true)return true;
 // Retain marks earned in character challenges before general marks existed.
 const id=deck?.hero?.id;
 return !!(id&&['hero-'+id,'rival-'+id].includes(deck.id)&&heroProgress?.[id]?.wins>0);
}
export function defeatedBadgeHTML(defeated){
 return defeated?'<span class="badge green defeated-badge">✓ 撃破済み</span>':'';
}

const count=n=>Number.isSafeInteger(n)&&n>0?n:0;
const score=r=>({wins:count(r?.wins),losses:count(r?.losses)});
function resultKey(battle,registry){
 if(!battle?.decks?.[1])return null;
 return battle.challengeId?'character:'+battle.challengeId:opponentProgressKey(battle.decks[1],registry);
}
// A finished manual game has one receipt, shared by redraws and restored sessions.
export function recordManualResult(progress,battle,registry){
 const previous=progress||{},game=battle?.manualGame||battle?.challengeGame;
 if(![0,1].includes(battle?.state?.winner)||!game)return previous;
 const key=resultKey(battle,registry),deckKey=opponentProgressKey(battle.decks?.[0],registry);
 if(!key||!deckKey)return previous;
 const old=previous[key]||{},games=old.games||[];if(games.includes(game))return previous;
 const add=r=>{const s=score(r);return {wins:s.wins+(battle.state.winner===0?1:0),losses:s.losses+(battle.state.winner===1?1:0)};};
 return {...previous,[key]:{...add(old),games:[game,...games].slice(0,256),decks:{...old.decks,[deckKey]:add(old.decks?.[deckKey])}}};
}
export function manualResultSummary(progress,battle,registry,heroProgress){
 const row=progress?.[resultKey(battle,registry)],legacy=battle?.challengeId&&heroProgress?.[battle.challengeId];
 const total=score(legacy||row),deckKey=opponentProgressKey(battle?.decks?.[0],registry),deck=score(row?.decks?.[deckKey]),games=total.wins+total.losses;
 return {...total,games,winRate:games?Math.round(total.wins/games*1000)/10:null,deckWins:deck.wins,deckLosses:deck.losses,deckGames:deck.wins+deck.losses};
}
