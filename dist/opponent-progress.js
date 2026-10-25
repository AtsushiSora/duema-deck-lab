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
