import {card,canCastSpell,canEnterCreature,summonCost,paymentPool,manaPayment,manaValue,evolutionBases} from './engine.js';

export function handUnavailableReason(s,inst,face,player=0){
 if(face.type==='spell'&&!canCastSpell(s,player,face,'hand'))return 'カードの効果による使用制限で、この呪文は唱えられません';
 if(face.type==='creature'&&s.players[player].entryLimitThisTurn&&(s.players[player].enteredThisTurn||0)>=1)return 'このターンに出せるクリーチャーの上限に達しています';
 if(face.type==='creature'&&face.g280NeedsSpell&&!(s.players[player].spellsThisTurn||0))return 'このターンに呪文を唱えてから召喚できます';
 if(face.type==='creature'&&!canEnterCreature(s,player,face,{origin:'hand'}))return 'カードの効果による制限で、今は場に出せません';
 if(face.evolution&&!face.neoEvolution&&!face.sMax&&!evolutionBases(s,player,face).length)return '条件に合う進化元がありません。進化条件をカード情報で確認できます';
 const cost=summonCost(s,player,{...face,summonOrigin:'hand'}),pool=paymentPool(s,player,[],face),available=pool.filter(x=>!x.tapped).reduce((n,x)=>n+(x.paymentValue??manaValue(card(x))),0);
 if(available<cost)return `通常の使用に必要なマナが不足しています（必要${cost} / 使用可能${available}）。別の出し方にも条件があります`;
 if(!manaPayment(pool,{...face,cost}))return '通常の使用に必要な文明を支払えません。多色カードは文明ごとに別のマナが必要です';
 return '今は使用できる行動がありません。カード固有の召喚条件・使用制限や、別の出し方の条件を確認してください';
}
