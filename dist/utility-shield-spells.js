// Hidden shield additions preserve one shield group and reveal no new card identity.
export function createUtilityShieldSpells(api){
 const{card,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const follow=(t,op,more={})=>({...t,op:'g71_'+op,...more});
 function run(s,t){if(!t.op.startsWith('g71_'))return false;const own=s.players[t.p];switch(t.op){
 case'g71_Critical':choice(s,t,'破壊する相手のブロッカーを1体選ぶ',targetOptions(s,t.p,living(s,1-t.p).filter(x=>effective(x,s).blocker)));break;
 case'g71_Plus':{
  if(!api.canAddShield(s,t.p)||!own.deck.length||!own.shields.length)break;
  const max=Math.min(t.n??1,own.deck.length);
  const options=own.shields.flatMap((x,i)=>Array.from({length:max},(_,j)=>{
   const amount=j+1,group=api.shieldGroup(x),stack=api.shieldCards(x).length;
   return opt('シールド '+(i+1)+'（カード'+stack+'枚）'+(t.n>1?'に'+amount+'枚重ねる':''),
    t.n>1?{group,amount}:group,t.optional?(own.deck.length<=amount?-1000:amount*10-stack):-stack);
  }));
  choice(s,t,'山札の上から'+(t.n>1?t.n+'枚まで':'1枚')+'裏向きに重ねるシールドを選ぶ',
   [...options,...(t.optional?[opt('使わない',null,0)]:[])]);
  break;
 }
 case'g71_Surf':put(s,task('g69_Bounce',t.p,t.source),task('g34_Draw',t.p,t.source,{n:1}));break;
 case'g71_Strong':put(s,task('g69_Bounce',t.p,t.source),follow(t,'StrongDraw'));break;
 case'g71_StrongDraw':if(living(s,t.p).some(x=>currentPower(s,x)>=6000)){const win=living(s,t.p).some(x=>effective(x,s).shako);choice(s,t,'カードを1枚引く？',[opt('1枚引く',true,own.deck.length>1?10:win?100:-100),opt('引かない',false,0)]);}break;
 case'g71_Burst':{const list=[0,1].flatMap(p=>living(s,p).filter(x=>currentPower(s,x)<=2000).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(list.length)api.move(s,list);break;}
 case'g71_Tornado':choice(s,t,'破壊するパワー4000以下の相手を1体選ぶ',targetOptions(s,t.p,living(s,1-t.p).filter(x=>currentPower(s,x)<=4000)));break;
 default:throw Error('未実装のシールド・除去呪文：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g71_'))return false;const own=s.players[t.p];switch(t.op){
 case'g71_Critical':case'g71_Tornado':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g71_StrongDraw':if(v)api.draw(s,t.p,1);break;
 case'g71_Plus':{
  const group=v?.group??v;
  if(!group||!api.canAddShield(s,t.p)||!api.findShield(own,group))break;
  const beforePlus1659=api.shieldCards(api.findShield(own,group)).length;
  const cards=[];
  for(let i=0;i<(v?.amount??1);i++){
   const x=api.takeTop(s,t.p);
   if(!x)break;
   cards.push(x);
  }
  if(cards.length&&s.players.some(p=>p.battle.some(y=>effective(y,s).deckRedirect))){
   for(const x of cards)api.clear(x,'grave');
   api.addZone(s,t.p,'grave',...cards);
  }else if(cards.length){
   for(const x of cards){
    api.clear(x,'shields');
    api.addShieldCard(s,t.p,group,x,{faceUp:false});
   }
   api.log(s,t.p,'shieldPlus',card(t.source).name+'：山札の上'+cards.length+'枚を裏向きでシールドに重ねる',{cardId:t.source});
  }
  api.deckCheck(s,t.p);
  if(api.shieldCards(api.findShield(own,group)).length>beforePlus1659&&s.winner===null)put(s,task('g34_AlPlus1659',t.p,t.source,{group}));
  break;
 }
 default:throw Error('未実装のシールド・除去の選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g71Effect)return false;put(s,task('g71_'+c.g71Effect,p,c.id,{uid}));return true;}};
}
