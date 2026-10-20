import {shuffled} from './engine.js';
export function expandDeck(deck,registry){const errors=registry.validate(deck);if(errors.length)throw Error(errors.join(' / '));return registry.resolveRows(deck.cards).flatMap(r=>Array.from({length:r.count},(_,i)=>({cardId:r.id,uid:`${r.id}-${i}`})));}
export function dealOpening(deck,registry,seed){const cards=shuffled(expandDeck(deck,registry),seed);return {seed,shields:cards.slice(0,5),hand:cards.slice(5,10),deck:cards.slice(10),drawn:0};}
export function drawOne(state){if(!state.deck.length)throw Error('山札がありません');state.hand.push(state.deck.shift());state.drawn++;return state;}
function missProbability(total,success,draws){if(success===0)return 1;if(draws>total-success)return 0;let p=1;for(let i=0;i<draws;i++)p*=(total-success-i)/(total-i);return p;}
export function allPresentProbability(total,counts,draws){
 if(!Number.isSafeInteger(total)||total<1||!Number.isSafeInteger(draws)||draws<0||draws>total||counts.length>5||counts.some(n=>!Number.isSafeInteger(n)||n<1)||counts.reduce((a,b)=>a+b,0)>total)throw Error('確率計算の条件が正しくありません');
 if(!counts.length)return null;let answer=0;for(let mask=0;mask<2**counts.length;mask++){let success=0,bits=0;for(let i=0;i<counts.length;i++)if(mask&(1<<i)){success+=counts[i];bits++;}answer+=(bits%2?-1:1)*missProbability(total,success,draws);}return Math.min(1,Math.max(0,answer));
}
export function sampleDraws(deck,registry,{count=1000,extra=0,keys=[],seed=1}={}){
 if(!Number.isSafeInteger(count)||count<1||count>10000||!Number.isSafeInteger(extra)||extra<0||extra>30)throw Error('試行回数・ドロー枚数が正しくありません');
 const deckCards=registry.resolveRows(deck.cards),validIds=new Set(deckCards.map(r=>r.id));keys=[...new Set(keys.map(id=>registry.get(id)?.id))];if(keys.length>5||keys.some(id=>!validIds.has(id)))throw Error('確認するカードをデッキから5種類まで選択してください');
 const expanded=expandDeck(deck,registry),seen=5+extra,perCard=Object.fromEntries(deckCards.map(r=>[r.id,{hits:0,totalCopies:0}]));let hits=0;
 for(let i=0;i<count;i++){const sample=shuffled(expanded,(seed+Math.imul(i+1,2654435761))>>>0).slice(5,5+seen),counts={};for(const c of sample)counts[c.cardId]=(counts[c.cardId]||0)+1;for(const [id,n]of Object.entries(counts)){perCard[id].hits++;perCard[id].totalCopies+=n;}if(keys.length&&keys.every(id=>counts[id]))hits++;}
 return {count,extra,seen,keys,seed,hits:keys.length?hits:null,rate:keys.length?hits/count:null,exact:allPresentProbability(40,keys.map(id=>deckCards.find(r=>r.id===id).count),seen),cards:deckCards.map(r=>({id:r.id,copies:r.count,hits:perCard[r.id].hits,rate:perCard[r.id].hits/count,expected:seen*r.count/40,exact:allPresentProbability(40,[r.count],seen)}))};
}
