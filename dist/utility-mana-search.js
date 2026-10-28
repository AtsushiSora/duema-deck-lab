// Library searches reserve viewed cards until the chosen move and shuffle finish.
export function createUtilityManaSearch(api){
 const{card,cost,colors,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const follow=(t,op,more={})=>({...t,op:'g82_'+op,...more});
 function finish(s,t){const own=s.players[t.p];own.g34Protected=(own.g34Protected||[]).filter(uid=>!t.ids.includes(uid));api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);}
 function run(s,t){if(!t.op.startsWith('g82_'))return false;const own=s.players[t.p];switch(t.op){
 case'g82_Heaven':case'g82_Nasuro':case'g82_Stone':case'g82_Lily':case'g82_Horn':case'g82_Copper':case'g82_Romano':case'g82_Mountain':{
  if(api.deckLocked(s,t.p))break;
  const skip=held(own),xs=own.deck.filter(x=>!skip.has(x.uid)).slice(0,api.lookCount(s,t.p,own.deck.length)),ids=xs.map(x=>x.uid),role=t.op.slice(4),publicLook=api.lookPublic(s,t.p),to=['Horn','Mountain','Heaven'].includes(role)?'hand':['Romano','Nasuro'].includes(role)?'grave':'mana';
  (own.g34Protected??=[]).push(...ids);
  if(ids.length)api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の'+ids.length+'枚を'+(publicLook?'公開：'+xs.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});
  const list=xs.filter(x=>['Stone','Nasuro'].includes(role)||(role==='Heaven'?api.faces(card(x)).some(c=>c.type==='spell'):role==='Romano'?api.faces(card(x)).some(c=>colors(c).includes('闇')):role==='Copper'?!colors(card(x)).includes('自然'):card(x).type==='creature'&&(role==='Mountain'?colors(card(x)).length>1:role==='Horn'||api.isEvolution(x))));
  const present=new Set(own.mana.filter(x=>!x.faceDown).flatMap(x=>colors(card(x))));
  // A search with no characteristic condition must find a card if one is available (701.10b).
  choice(s,follow(t,'SearchPick',{role,to,ids}),'山札から'+(role==='Heaven'?'呪文':role==='Romano'?'闇のカード':role==='Copper'?'自然以外のカード':role==='Lily'?'進化クリーチャー':role==='Mountain'?'多色クリーチャー':role==='Horn'?'クリーチャー':'カード')+'を1枚'+(['Stone','Nasuro'].includes(role)?'':'まで')+'選んで'+(to==='hand'?'公開し手札に加える':to==='grave'?'墓地に置く':'マナに置く'),[...list.map(x=>opt(card(x).name,x.uid,own.deck.length>1?20+Math.min(cost(card(x)),30)+(to==='mana'?colors(card(x)).filter(c=>!present.has(c)).length*8:0)+(to==='grave'&&api.faces(card(x)).some(c=>c.type==='spell'&&colors(c).includes('闇')&&cost(c)<=6)?30:0):-100,x.cardId)),...(!['Stone','Nasuro'].includes(role)||!list.length?[opt('選ばずにシャッフル',null,0)]:[])]);break;
 }
 case'g82_Top':choice(s,t,'山札の上2枚をタップしてマナに置く？',[opt('2枚をマナに置く',true,own.deck.length>2?20:-100),opt('置かない',false,0)]);break;
 case'g82_Triple':put(s,task('g34_Select',t.p,t.source,{origin:'grave',deploy:true,filter:{creature:true,nonEvolution:true,max:3},n:3,optional:true,title:'墓地から出すコスト3以下の進化ではないクリーチャーを3体まで選ぶ'}));break;
 case'g82_Reload':put(s,task('g34_Draw',t.p,t.source,{n:1}),task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g82_SearchFinish':finish(s,t);break;
 case'g82_Jet':{const n=living(s,t.p).filter(x=>/ハンター/.test(effective(x,s).race||'')).length;if(n)put(s,task('g34_Draw',t.p,t.source,{n,optional:true}));break;}
 default:throw Error('未実装のマナ・検索補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g82_'))return false;switch(t.op){
 case'g82_Top':if(v)put(s,task('g34_Ramp',t.p,t.source,{n:2,tapped:true}));break;
 case'g82_SearchPick':{const own=s.players[t.p],x=v&&t.ids.includes(v)&&own.deck.find(x=>x.uid===v);if(x){api.remove(own.deck,x.uid);const to=t.to==='mana'&&api.deckRedirect(s,t.p)?'grave':t.to;api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});}put(s,follow(t,'SearchFinish'));break;}
 default:throw Error('未実装のマナ・検索補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g82Effect)return false;put(s,task('g82_'+c.g82Effect,p,c.id,{uid}));return true;},
 discount(s,p,c){return c.type==='creature'&&colors(c).includes('闇')?living(s,p).filter(x=>effective(x,s).g82Maxval).length:0;}};
}
