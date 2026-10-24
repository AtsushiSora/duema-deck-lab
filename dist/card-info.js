// Display/search metadata is independent of the battle engine's effect definitions.
export const normalizeSearch=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s・･「」『』《》ー\-―_!！?？。、,:：/\\()（）]/g,'');
export function cardFaces(c){if(c?.faces?.length)return c.faces;if(!c?.supported)return [];return [{name:c.name,typeText:c.type==='creature'?'クリーチャー':'呪文',civilizationText:c.civ,civilizations:[c.civ],cost:c.cost,costText:String(c.cost),abilityText:c.text,race:c.race||'',powerText:c.power?String(c.power):'',missingFields:[]}];}
export const cardCivilizations=c=>[...new Set(cardFaces(c).flatMap(f=>f.civilizations))];
export const civilizationLabel=f=>f.civilizations.length?f.civilizations.join(' / '):f.civilizationText||'未掲載';
export const costLabel=c=>cardFaces(c).map(f=>f.costText||'未掲載').join(' / ')||'—';
export const typeLabel=c=>[...new Set(cardFaces(c).map(f=>f.typeText||'未掲載'))].join(' / ')||'未掲載';
const index=new WeakMap();
export function searchText(c){if(!index.has(c))index.set(c,normalizeSearch([c.name,...cardFaces(c).flatMap(f=>[f.name,f.typeText,f.civilizationText,f.race,f.abilityText])].join(' ')));return index.get(c);}
export function matchesCard(c,{query='',civ='',cost='',type=''}={}){
 if(query&&!searchText(c).includes(normalizeSearch(query)))return false;
 if(type==='supported'&&!c.supported||type==='nameOnly'&&c.supported)return false;
 const kind=['supported','nameOnly'].includes(type)?'':type;
 if(!civ&&!cost&&!kind)return true;
 return cardFaces(c).some(f=>(!civ||f.civilizations.includes(civ))&&(!cost||(cost==='5+'?f.cost!==null&&f.cost>=5:cost==='special'?f.cost===null&&Boolean(f.costText):f.cost===Number(cost)))&&(!kind||(kind==='creature'?f.typeText.includes('クリーチャー'):kind==='spell'?f.typeText.includes('呪文'):f.typeText===kind)));
}
export const primaryCost=c=>cardFaces(c)[0]?.cost??null;

// Count every physical card below the top, including earlier evolution layers.
export const sourceCardCount=c=>(c?.under||[]).reduce((n,x)=>n+1+sourceCardCount(x),0);
export const sourceCardLabel=(c,evolved=false)=>evolved||sourceCardCount(c)?`${evolved?'進化元':'下に'} ${sourceCardCount(c)}枚`:'';
export function sourceCardBadge(c,evolved=false){if(c?.hidden||c?.sealed||!evolved&&!sourceCardCount(c))return '';const n=sourceCardCount(c);return `<span class="creature-source-count" data-short-label="${evolved?'元':'下'}" aria-label="${sourceCardLabel(c,evolved)}" title="${sourceCardLabel(c,evolved)}"><span class="source-label">${evolved?'進化元':'下に'}</span><b>${n}</b><span class="source-unit">枚</span></span>`;}
