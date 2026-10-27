// Hand returns are ordered before moving any card, and grant scopes follow
// the resolved spell so they expire and respect ability suppression normally.
export function createUtilityHandSupport(api){
 const{card,cost,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g92_'+op,...more});
 const multicolorMana=(s,p)=>s.players[p].mana.filter(x=>api.manaColors(x.faceDown?card('face-down-seal'):card(x),s,p).length>1).length;
 function finishTyphoon(s,t){
  const own=s.players[t.p],xs=t.ordered.map(uid=>api.remove(own.hand,uid)).filter(Boolean);
  for(const x of xs)api.clear(x,'deck');own.deck.push(...xs);
  api.log(s,t.p,'handExchange',card(t.source).name+'：手札'+xs.length+'枚を山札の下に置き、'+(t.count+1)+'枚引く',{cardId:t.source});
  api.draw(s,t.p,t.count+1);
 }
 function order(s,t){
  const own=s.players[t.p],remaining=t.ids.filter(uid=>!t.ordered.includes(uid)&&own.hand.some(x=>x.uid===uid));
  if(remaining.length<=1){finishTyphoon(s,{...t,ordered:[...t.ordered,...remaining]});return;}
  choice(s,t,'山札の下に置く手札を上から順に選ぶ（'+t.ordered.length+'/'+t.ids.length+'）',remaining.map(uid=>{const x=own.hand.find(x=>x.uid===uid);return opt(card(x).name,uid,-Math.min(cost(card(x)),30),x.cardId);}));
 }
 function run(s,t){if(!t.op.startsWith('g92_'))return false;const own=s.players[t.p];switch(t.op){
 case'g92_Slash':for(const x of living(s,t.p))(x.g9Speed??=[]).push({turn:s.turn,cost:cost(card(t.source)),spellSource:t.source});break;
 case'g92_Neo':{const win=living(s,t.p).some(x=>effective(x,s).shako);choice(s,t,'カードを2枚まで引く',[0,1,2].map(n=>opt(n+'枚引く',n,n===0?0:n<own.deck.length?n*5:win?100:-100)));break;}
 case'g92_Typhoon':{const ids=own.hand.map(x=>x.uid);put(s,follow(t,'Order',{ids,count:ids.length,ordered:[]}));break;}
 case'g92_Order':order(s,t);break;
 case'g92_Snow':if(own.mana.length<s.players[1-t.p].mana.length)put(s,task('g34_Ramp',t.p,t.source,{n:2}));break;
 case'g92_Rainbow':put(s,task('g34_Target',t.p,t.source,{filter:{max:5},to:'hand',title:'手札に戻すコスト5以下の相手のクリーチャーを1体選ぶ'}),follow(t,'RainbowDiscard'));break;
 case'g92_RainbowDiscard':if(multicolorMana(s,t.p)>=2)put(s,task('discard',1-t.p,t.source,{n:1,causedBy:t.p,random:true}));break;
 default:throw Error('未実装の手札・攻撃補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g92_'))return false;switch(t.op){
 case'g92_Neo':api.draw(s,t.p,v);break;
 case'g92_Order':put(s,follow(t,'Order',{ordered:[...t.ordered,v]}));break;
 default:throw Error('未実装の手札補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g92Effect)return false;put(s,task('g92_'+c.g92Effect,p,c.id,{uid}));return true;}};
}
