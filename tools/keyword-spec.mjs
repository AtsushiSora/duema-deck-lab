// This accepts only a fixed set of keyword clauses. Unrecognized remaining text fails closed.
export function keywordSpec(abilityText){
 const clauses=abilityText.replace(/[（(][^）)]*[）)]/g,'').replace(/[■\s]/g,'');
 const grammar=/^(?:(?:W・ブレイカー|T・ブレイカー|スピードアタッカー|ブロッカー|このクリーチャーは、?相手プレイヤーを攻撃(?:することが)?できない。|このクリーチャーは攻撃することができない。|このクリーチャーはブロックされない。|スレイヤー))+$/;
 if(!grammar.test(clauses))throw Error('未対応の能力文が残っています');
 if(clauses.includes('W・ブレイカー')&&clauses.includes('T・ブレイカー'))throw Error('複数ブレイカーの選択は未対応です');
 const spec={};
 if(clauses.includes('W・ブレイカー'))spec.breaker=2;
 if(clauses.includes('T・ブレイカー'))spec.breaker=3;
 if(clauses.includes('ブロッカー'))spec.blocker=true;
 if(clauses.includes('スピードアタッカー'))spec.speedAttacker=true;
 if(clauses.includes('スレイヤー'))spec.slayer=true;
 if(clauses.includes('このクリーチャーは攻撃することができない。'))spec.noAttack=true;
 if(/相手プレイヤーを攻撃/.test(clauses))spec.noPlayerAttack=true;
 if(clauses.includes('このクリーチャーはブロックされない。'))spec.unblockable=true;
 return spec;
}
