// Defensive targeting and reusable ramp spells share the normal zone and combat policies.
export function createUtilityDefenseRules(api){
 const{card,put,task,choice,opt}=api;
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 function targets(s,t){return t.op==='g58_Hayabusa'?creatures(s,t.p):t.op==='g58_Raiden'?creatures(s,1-t.p):[0,1].flatMap(p=>creatures(s,p).filter(x=>!api.isEvolution(x)&&(t.op!=='g58_Eternal'||api.cost(api.effective(x,s))<=4)));}
 function run(s,t){if(!t.op.startsWith('g58_'))return false;switch(t.op){
 case'g58_Hayabusa':case'g58_Raiden':case'g58_Shield':case'g58_Eternal':{
  const title=t.op==='g58_Hayabusa'?'次の自分のターンのはじめまでブロッカーを与える自分の1体を選ぶ':t.op==='g58_Raiden'?'タップする相手のクリーチャーを1体選ぶ':'シールドにする進化ではないクリーチャーを1体選ぶ';
  const options=api.targetOptions(s,t.p,targets(s,t)).map(o=>{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value)),x=s.players[p].battle.find(x=>x.uid===o.value);return{...o,score:t.op==='g58_Hayabusa'?(x.tapped?-20:20)+(!api.effective(x,s).blocker?15:0):t.op==='g58_Raiden'?(x.tapped?-10:20)+o.score:p===t.p?-20:o.score+20};});
  choice(s,t,title,options);break;
 }
 case'g58_Scorched':put(s,task('g34_Select',t.p,t.source,{owner:1-t.p,origin:'mana',to:'grave',n:1,optional:false,title:'墓地に置く相手のマナを1枚選ぶ'}),task('g34_Ramp',t.p,t.source,{n:1}));break;
 case'g58_Roulette':put(s,task('g34_Ramp',t.p,t.source,{n:1}),{...t,op:'g58_Judge'});break;
 case'g58_Judge':api.singleJudge(s,t.p,t.source,t.uid,{...t,op:'g58_Return'});break;
 case'g58_Return':{const frame=s.extSpells?.find(f=>f.inst.uid===t.uid);if(frame)frame.to='hand';break;}
 default:throw Error('未実装の防御ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g58_'))return false;const x=targets(s,t).find(x=>x.uid===v);if(!x)return true;const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));switch(t.op){
 // This existing grant is inherited by evolution and removed from every layer at the next own start.
 case'g58_Hayabusa':x.g19Blocker=t.p;api.log(s,t.p,'grant',card(x).name+'は次の自分のターンのはじめまでブロッカーを得た',{cardId:x.cardId});break;
 case'g58_Raiden':api.tap(s,p,x);break;
 case'g58_Shield':case'g58_Eternal':api.move(s,[{player:p,uid:x.uid,to:'shields',destroy:false,controller:t.p}]);break;
 default:throw Error('未実装の防御ユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g58Effect)return false;put(s,task('g58_'+c.g58Effect,p,c.id,{uid}));return true;}};
}
