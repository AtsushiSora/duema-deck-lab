// Choose the chain's deployment order before resolving any of the recruited entry abilities.
export function createUtilityWaterChain(api){
 const{card,cost,colors,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),key=x=>x.uid+'@'+(x.incarnation||0);
 const self=(x,t)=>api.allLayers(x).some(y=>key(y)===key(t))||(x.g47ElementRefs||[]).some(y=>key(y)===key(t));
 const follow=(t,op,more={})=>({...t,op:'g84_'+op,...more});
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 function finish(s,t){const own=s.players[t.p],xs=[...(t.ordered||[]),...t.ids.filter(uid=>!(t.ordered||[]).includes(uid))].map(uid=>api.remove(own.deck,uid)).filter(Boolean);own.deck.unshift(...xs);own.g34Protected=(own.g34Protected||[]).filter(uid=>!t.ids.includes(uid));api.deckCheck(s,t.p);}
 function deploy(s,t){put(s,...t.selected.map(uid=>task('g34_Put',t.p,t.source,{origin:'deck',target:uid})),follow(t,'Order',{ordered:[]}));}
 function run(s,t){if(!t.op.startsWith('g84_'))return false;const own=s.players[t.p];switch(t.op){
 case'g84_Hogan':case'g84_Chain':{
  if(api.deckLocked(s,t.p))break;const skip=held(own),xs=own.deck.filter(x=>!skip.has(x.uid)).slice(0,api.lookCount(s,t.p,t.op==='g84_Hogan'?2:1)),ids=xs.map(x=>x.uid),publicLook=api.lookPublic(s,t.p);
  (own.g34Protected??=[]).push(...ids);if(ids.length)api.log(s,t.p,publicLook?'reveal':'look',card(t.source).name+'：山札の上'+ids.length+'枚を'+(publicLook?'公開：'+xs.map(x=>card(x).name).join('・'):'確認'),{cardId:t.source});
  put(s,follow(t,'Pick',{ids,selected:[]}));break;
 }
 case'g84_Pick':{const list=t.ids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&card(x).type==='creature'&&cost(card(x))<cost({cost:t.max}));if(!list.length){deploy(s,t);break;}choice(s,t,'連鎖で出す順にクリーチャーを選ぶ（'+t.selected.length+'体選択中）',[...list.map(x=>opt(card(x).name,x.uid,t.selected.length+1<own.deck.length?20+Math.min(cost(card(x)),30):-100,x.cardId)),opt('この内容で確定',null,0)]);break;}
 case'g84_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid)&&!t.ordered.includes(uid));if(ids.length>1)choice(s,t,'残ったカードを山札の上から戻す順に選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,Math.min(cost(card(x)),30),x.cardId);}));else finish(s,t);break;}
 case'g84_Sonic':choice(s,t,'手札に戻す他のパワー4000以下のクリーチャーを1体まで選ぶ',[...api.targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>living(s,p)).filter(x=>!self(x,t)&&api.power(x,false,s)<=4000)).map(o=>({...o,label:(own.battle.some(x=>x.uid===o.value)?'自分：':'相手：')+o.label,score:own.battle.some(x=>x.uid===o.value)?-10-o.score:15+o.score})),opt('戻さない',null,0)]);break;
 case'g84_Extreme':{const rows=living(s,t.p).filter(x=>!self(x,t)).map(x=>({player:t.p,uid:x.uid,to:'hand',destroy:false,controller:t.controller??t.p}));if(rows.length)api.move(s,rows);break;}
 case'g84_Deep':api.draw(s,t.p,living(s,1-t.p).length);break;
 case'g84_Irons':{const x=own.battle.find(x=>self(x,t));if(x)x.unblocked=true;break;}
 default:throw Error('未実装の水の連鎖・補充効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g84_'))return false;switch(t.op){
 case'g84_Pick':if(v)put(s,follow(t,'Pick',{selected:[...t.selected,v]}));else deploy(s,t);break;
 case'g84_Order':put(s,follow(t,'Order',{ordered:[...t.ordered,v]}));break;
 case'g84_Sonic':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.controller??t.p}]);}break;
 default:throw Error('未実装の水の連鎖・補充選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid,entry){if(!c.g84Effect)return false;const ref={uid,incarnation:entry?.incarnation??s.players[p].battle.find(x=>x.uid===uid)?.incarnation??0},root=s.players[p].battle.find(x=>self(x,ref)),max=root?effective(root,s).cost:entry?.lastKnownCost??c.cost;put(s,task('g84_'+c.g84Effect,p,c.id,{...ref,max}));return true;},
 entry(s,p,x,o){if(!api.isCreature(s,x)||o.selfMuted||api.selfStopped(s,p))return;for(const y of living(s,p)){
  const c=effective(y,s);if(c.g84Jester&&s.active===p&&s.players[p].enteredThisTurn===2)api.enqueue(s,p,{uid:y.uid,incarnation:y.incarnation||0,source:y.cardId,effect:'extended',task:task('g34_Draw',p,y.cardId,{n:1,optional:true})});
  if(c.g84Irons&&y.uid!==x.uid&&colors(effective(x,s)).includes('水'))api.enqueue(s,p,{uid:y.uid,incarnation:y.incarnation||0,source:y.cardId,effect:'extended',task:task('g84_Irons',p,y.cardId,{uid:y.uid,incarnation:y.incarnation||0})});
 }} };
}
