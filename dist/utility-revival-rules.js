// Recovery and defensive choices reuse the normal entry, targeting and zone restrictions.
export function createUtilityRevivalRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 function run(s,t){if(!t.op.startsWith('g60_'))return false;const own=s.players[t.p];switch(t.op){
 case'g60_Yusui':{const max=creatures(s,t.p).some(x=>api.colors(api.effective(x,s)).some(c=>['水','自然'].includes(c)))?5:3;put(s,task('g34_Select',t.p,t.source,{origin:'grave',n:1,deploy:true,optional:false,filter:{creature:true,max},title:'墓地から出すコスト'+max+'以下のクリーチャーを1体選ぶ'}));break;}
 case'g60_Scale':{const recovery=api.canMoveZone(s,t.p,'grave')?own.grave.filter(x=>card(x).type==='creature').length:0,enemy=creatures(s,1-t.p);choice(s,t,'生死の天秤：効果を選ぶ',[opt('墓地のクリーチャーを2体まで手札へ','recover',recovery?20+Math.min(recovery,2)*10:0),opt('相手の1体をこのターン−5000','minus',enemy.some(x=>api.power(x,false,s)<=5000)?45:enemy.length?10:-10)]);break;}
 case'g60_Kernel':choice(s,t,'次の自分のターンのはじめまで攻撃・ブロックできなくする相手の1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g60_Minus':choice(s,t,'このターンのパワーを−5000する相手の1体を選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g60_Cabura':if(api.canMoveZone(s,t.p,'mana')&&own.mana.length)choice(s,t,'手札に戻す自分のマナを1枚まで選ぶ',[...own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:15+Math.min(cost(card(x)),30),x.faceDown?undefined:x.cardId)),opt('戻さない',null,0)]);break;
 default:throw Error('未実装の回収ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g60_'))return false;switch(t.op){
 case'g60_Scale':if(v==='recover')put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'hand',n:2,optional:true,filter:{creature:true},title:'手札に戻す墓地のクリーチャーを2体まで選ぶ'}));else if(v==='minus')put(s,{...t,op:'g60_Minus'});break;
 case'g60_Minus':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-5000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g60_Kernel':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)for(const kind of['attack','block'])api.lock(s,t.p,{kind,reason:card(t.source).name,...(card(t.source).type==='spell'?{spellCost:cost(card(t.source)),spellSource:t.source}:{}),player:1-t.p,uid:x.uid,incarnation:x.incarnation||0,expires:'start',who:t.p});break;}
 case'g60_Cabura':{const own=s.players[t.p],x=v&&own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')){api.remove(own.mana,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}break;}
 default:throw Error('未実装の回収ユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g60Effect)return false;put(s,task('g60_'+c.g60Effect,p,c.id,{uid}));return true;}};
}
