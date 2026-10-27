// Fix the whole mana selection before moving cards; hidden mana never exposes its identity.
export function createUtilityGrowthRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const follow=(t,op,more={})=>({...t,op:'g77_'+op,...more});
 function moveMana(s,t,ids){const p=t.owner??1-t.p;if(!api.canMoveZone(s,p,'mana'))return;const to=t.to||'grave',xs=ids.map(uid=>api.remove(s.players[p].mana,uid)).filter(Boolean);for(const x of xs){api.clear(x,to);api.addZone(s,p,to,x);}if(xs.length)api.log(s,t.p,'manaLeave',card(t.source).name+'：'+(p===t.p?'自分':'相手')+'のマナ'+xs.length+'枚を'+(to==='hand'?'手札':'墓地')+'へ',{cardId:t.source});}
 function run(s,t){if(!t.op.startsWith('g77_'))return false;const own=s.players[t.p];switch(t.op){
 case'g77_Fusion':put(s,task('g34_Ramp',t.p,t.source,{n:own.mana.length,tapped:true}));break;
 case'g77_Fortress':put(s,follow(t,'ManaPick',{n:2,optional:true,selected:[]}));break;
 case'g77_Mild':put(s,follow(t,'ManaPick',{n:1,optional:false,selected:[]}),task('g34_Ramp',t.p,t.source,{n:1}));break;
 case'g77_ManaPick':{const p=t.owner??1-t.p,list=api.canMoveZone(s,p,'mana')?s.players[p].mana.filter(x=>!t.selected.includes(x.uid)):[];if(t.selected.length>=t.n||!list.length){moveMana(s,t,t.selected);break;}choice(s,t,'墓地に置く相手のマナを'+t.n+'枚'+(t.optional?'まで':'')+'選ぶ（'+t.selected.length+'/'+t.n+'）',[...list.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:12+Math.min(cost(card(x)),30),x.faceDown?null:x.cardId)),...(t.optional?[opt('ここまでで確定',null,0)]:[])]);break;}
 case'g77_Gaia':choice(s,t,'マナに置く自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,api.creatures(s,t.p).filter(x=>!x.sealed)).map(o=>({...o,score:20-o.score})));break;
 case'g77_Dahlia':{const list=api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&/ドラゴン/.test(card(x).race||'')):[];choice(s,t,'マナから手札に戻すドラゴンを1体まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,15+Math.min(cost(card(x)),30),x.cardId)),opt('戻さない',null,0)]);break;}
 default:throw Error('未実装の自然のマナ補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g77_'))return false;switch(t.op){
 case'g77_ManaPick':if(v)put(s,follow(t,'ManaPick',{selected:[...t.selected,v]}));else moveMana(s,t,t.selected);break;
 case'g77_Gaia':if(v)api.move(s,[{player:t.p,uid:v,to:'mana',destroy:false,controller:t.p}]);break;
 case'g77_Dahlia':if(v)moveMana(s,{...t,owner:t.p,to:'hand'},[v]);break;
 default:throw Error('未実装の自然のマナ補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g77Effect)return false;put(s,task('g77_'+c.g77Effect,p,c.id,{uid}));return true;}};
}
