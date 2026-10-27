// Block triggers resolve before combat; mana recovery follows the mandatory ramp.
export function createUtilityBlockRules(api){
 const{card,cost,effective,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const dragonOrPhoenix=x=>!x.faceDown&&card(x).type==='creature'&&/ドラゴン|フェニックス/.test(card(x).race||'');
 function run(s,t){if(!t.op.startsWith('g72_'))return false;const own=s.players[t.p];switch(t.op){
 case'g72_Chaser':choice(s,t,'破壊するアンタップ状態の相手を1体選ぶ',targetOptions(s,t.p,living(s,1-t.p).filter(x=>!x.tapped)));break;
 case'g72_Grudge':choice(s,t,'破壊するコスト'+own.grave.length+'以下の相手を1体選ぶ（墓地'+own.grave.length+'枚）',targetOptions(s,t.p,living(s,1-t.p).filter(x=>cost(card(x))<=own.grave.length)));break;
 case'g72_Blossom':put(s,task('g34_Ramp',t.p,t.source,{n:1}),task('g72_BlossomPick',t.p,t.source));break;
 case'g72_BlossomPick':if(api.canMoveZone(s,t.p,'mana')){const list=own.mana.filter(dragonOrPhoenix);if(list.length)choice(s,t,'マナから手札に戻すドラゴンまたはフェニックスを選ぶ',[...list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),opt('戻さない',null,0)]);}break;
 default:throw Error('未実装の条件付き除去・ブロック効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g72_'))return false;switch(t.op){
 case'g72_Chaser':case'g72_Grudge':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g72_BlossomPick':if(v&&api.canMoveZone(s,t.p,'mana')){const x=s.players[t.p].mana.find(x=>x.uid===v);if(x&&dragonOrPhoenix(x)){api.remove(s.players[t.p].mana,v);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 default:throw Error('未実装の条件付き除去・回収選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g72Effect)return false;put(s,task('g72_'+c.g72Effect,p,c.id,{uid}));return true;},
 block(s,p,x){if(effective(x,s).g72Candle)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_Look',p,x.cardId,{n:4,stages:[{to:'hand',n:1}]})});}};
}
