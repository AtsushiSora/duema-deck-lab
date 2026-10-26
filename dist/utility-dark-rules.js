// Utility cards use the shared movement, replacement and discard machinery.
export function createUtilityDarkRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 const randomDiscard=(p,source)=>task('discard',1-p,source,{n:1,random:true,causedBy:p});
 const blocker=(p,source)=>task('g34_Target',p,source,{filter:{blocker:true},to:'grave',title:'破壊する相手のブロッカーを1体選ぶ'});
 const ramp=(p,source)=>task('g34_Ramp',p,source,{n:1});
 function run(s,t){if(!t.op.startsWith('g53_'))return false;switch(t.op){
 case'g53_Shield':api.shieldTop(s,t.p,card(t.source));break;
 case'g53_Reset':{const hand=s.players[1-t.p].hand;api.log(s,t.p,'look','マインド・リセット：相手の手札を確認：'+hand.map(x=>card(x).name).join('・'),{cardId:t.source});choice(s,t,'相手の手札から捨てさせる呪文を1枚選ぶ',hand.filter(x=>faces(card(x)).some(f=>f.type==='spell')).map(x=>opt(card(x).name,x.uid,20+Math.max(...faces(card(x)).filter(f=>f.type==='spell').map(cost)),x.cardId)));break;}
 default:throw Error('未実装の闇系ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(t.op!=='g53_Reset')return false;if(v&&s.players[1-t.p].hand.some(x=>x.uid===v))put(s,task('discardChosen',1-t.p,t.source,{n:1,uid:v,causedBy:t.p}));return true;}
 return{run,chosen,
 effect(s,p,c){if(!c.g53Effect)return false;const source=c.id,shield=task('g53_Shield',p,source);switch(c.g53Effect){
 case'Primal':put(s,task('mill',p,source,{n:4}),task('g34_Select',p,source,{origin:'grave',to:'hand',n:1,optional:true,filter:{creature:true},title:'墓地から手札に戻すクリーチャーを1体まで選ぶ'}));break;
 case'Reset':put(s,task('g53_Reset',p,source));break;
 case'Vega':put(s,shield,randomDiscard(p,source));break;
 case'Triple':put(s,ramp(p,source),randomDiscard(p,source));break;
 case'Sky':put(s,ramp(p,source),shield);break;
 case'Wind':put(s,blocker(p,source),ramp(p,source));break;
 case'Gareck':put(s,blocker(p,source),randomDiscard(p,source));break;
 case'Train':put(s,randomDiscard(p,source));break;
 default:throw Error('未実装の闇系ユーティリティカード：'+c.g53Effect);
 }return true;},
 };
}
