// Viewed cards stay reserved until the search finishes; entry triggers resolve after the shuffle.
export function createUtilityDragonSearch(api){
 const{card,cost,effective,put,task,choice,opt}=api;
 const follow=(t,op,more={})=>({...t,op:'g80_'+op,...more});
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const available=own=>{const skip=held(own);return own.deck.filter(x=>!skip.has(x.uid));};
 const dragon=x=>card(x).type==='creature'&&/ドラゴン/.test(card(x).race||'');
 const puttable=(s,p,x)=>['creature','seed','field','gear'].includes(card(x).type)&&api.canEnter(s,p,card(x),{origin:'deck',execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).some(y=>y.uid!==x.uid));
 function release(s,p,ids){s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(uid=>!ids.includes(uid));}
 function run(s,t){if(!t.op.startsWith('g80_'))return false;const own=s.players[t.p];switch(t.op){
 case'g80_Nex':case'g80_Rupia':case'g80_Valkyrie':{if(api.deckLocked(s,t.p))break;const xs=available(own).slice(0,api.lookCount(s,t.p,own.deck.length)),ids=xs.map(x=>x.uid),publicLook=api.lookPublic(s,t.p);(own.g34Protected??=[]).push(...ids);if(ids.length)api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の'+ids.length+'枚を'+(publicLook?'公開：'+xs.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});const role=t.op.slice(4),list=xs.filter(x=>role==='Nex'?card(x).name.includes('ルピア')&&puttable(s,t.p,x):card(x).type==='creature'&&(role==='Rupia'?card(x).name.includes('ボルシャック'):/アーマード・ドラゴン/.test(card(x).race||'')));choice(s,follow(t,'SearchPick',{role,ids}),role==='Nex'?'山札から出す「ルピア」を1枚まで選ぶ':'公開して手札に加える'+(role==='Rupia'?'ボルシャック':'アーマード・ドラゴン')+'を1体まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,own.deck.length>1?20+Math.min(cost(card(x)),30):-100,x.cardId)),opt('選ばずにシャッフル',null,0)]);break;}
 case'g80_SearchFinish':release(s,t.p,t.ids);api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);break;
 case'g80_Gazer':if(!api.deckLocked(s,t.p)&&available(own).length)choice(s,t,'山札の上1枚を表向きにして、ドラゴンなら出す？',[opt('表向きにする',true,available(own).length>1?15:-100),opt('表向きにしない',false,0)]);break;
 case'g80_GazerReveal':{if(api.deckLocked(s,t.p))break;const x=available(own)[0];if(!x)break;api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});if(dragon(x)){if(puttable(s,t.p,x)){(own.g34Protected??=[]).push(x.uid);put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:x.uid}),follow(t,'GazerFinish',{ids:[x.uid]}));}}else api.mill(s,t.p,1);break;}
 case'g80_GazerFinish':release(s,t.p,t.ids);api.deckCheck(s,t.p);break;
 case'g80_Genji':choice(s,t,'破壊する相手のブロッカーを1体選ぶ',api.targetOptions(s,t.p,api.creatures(s,1-t.p).filter(x=>!x.sealed&&effective(x,s).blocker)));break;
 default:throw Error('未実装のドラゴン補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g80_'))return false;const own=s.players[t.p];switch(t.op){
 case'g80_SearchPick':{const x=v&&t.ids.includes(v)&&own.deck.find(x=>x.uid===v);if(x){if(t.role==='Nex'){put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:x.uid}),follow(t,'SearchFinish'));break;}api.remove(own.deck,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});}put(s,follow(t,'SearchFinish'));break;}
 case'g80_Gazer':if(v)put(s,follow(t,'GazerReveal'));break;
 case'g80_Genji':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 default:throw Error('未実装のドラゴン補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g80Effect)return false;put(s,task('g80_'+c.g80Effect,p,c.id,{uid}));return true;},
 decorate(s,p,x,c){return c.g80Nex?{...c,attackBonus:(c.attackBonus||0)+s.players[p].grave.filter(x=>card(x).type==='creature'&&/ファイアー・バード/.test(card(x).race||'')).length*1000}:c;},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s),op=c.g80Gazer?'Gazer':c.g80Genji?'Genji':null;if(op)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g80_'+op,p,x.cardId)});}};
}
