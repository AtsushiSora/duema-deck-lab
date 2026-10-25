// Curated utility cards. All continuations contain serializable physical IDs.
export function createRecommendedRules(api){
 const {card,faces,cost,colors,power,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enqueue,targetable,lock}=api;
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const release=(own,ids)=>own.g36Protected=(own.g36Protected||[]).filter(uid=>!ids.includes(uid));
 const continuation=(t,op,more={})=>task(op,t.p,t.source,more);
 const ramp=(s,p)=>{const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);api.addZone(s,p,to,x);}api.deckCheck(s,p);};
 function run(s,t){
  if(!t.op.startsWith('g36'))return false;const own=s.players[t.p],opp=s.players[1-t.p];
  switch(t.op){
   case'g36Olive':choice(s,t,'墓地を山札に戻すプレイヤーを選ぶ',[opt('自分',t.p,own.deck.length<8?50:own.grave.length),opt('相手',1-t.p,opp.grave.length*3)]);break;
   case'g36Collapse':choice(s,t,'山札の上に置くマナを1枚選ぶ',[t.p,1-t.p].flatMap(p=>s.players[p].mana.map(x=>opt((p===t.p?'自分：':'相手：')+(x.faceDown?'裏向きのマナ':card(x).name),{p,uid:x.uid},p===t.p?-10:10+(x.faceDown?0:cost(card(x))),x.faceDown?undefined:x.cardId))));break;
   case'g36Water':put(s,task('g34_Ramp',t.p,t.source,{n:2,tapped:true}),continuation(t,'g36WaterPick'));break;
   case'g36WaterPick':choice(s,t,'マナから手札に戻すクリーチャーを1体選ぶ',own.mana.filter(x=>!x.faceDown&&card(x).type==='creature').map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;
   case'g36WaterBounce':choice(s,t,'戻したクリーチャー以下のコストの相手を手札に戻す？',[...api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(effective(x,s))<=t.max)),skip()]);break;
   case'g36Love':choice(s,t,'山札に戻すプレイヤーを選ぶ',[
    opt('相手の場・手札・墓地を山札に戻す',1-t.p,20+opp.battle.length*8+opp.hand.length*3+opp.grave.length),
    opt('自分の場・手札・墓地を山札に戻す',t.p,(own.deck.length<5?60:0)-own.battle.length*10+own.grave.length)
   ]);break;
   case'g36LoveFinish':{
    const target=s.players[t.owner],before=new Set(t.deck);
    // Replacement payments and cards entering a new zone are new objects.
    // Only the hand/grave objects present when the batch began participate.
    for(const row of t.rows){const x=target[row.origin].find(x=>x.uid===row.uid&&(x.zoneSerial||0)===row.serial);if(x){remove(target[row.origin],x.uid);clear(x,'deck');api.addZone(s,t.owner,'deck',x);}}
    const added=target.deck.filter(x=>!before.has(x.uid));target.deck=target.deck.filter(x=>before.has(x.uid));
    api.shuffleLibrary(s,t.owner,added,t.source);
    api.log(s,t.p,'zoneShuffle',(t.owner===t.p?'自分':'相手')+'の場・手札・墓地から'+added.length+'枚を山札に戻す',{cardId:t.source});api.deckCheck(s,t.owner);break;
   }
   case'g36Look':case'g36Memory':{
    const hidden=reserved(own),xs=own.deck.filter(x=>!hidden.has(x.uid)).slice(0,t.op==='g36Memory'?own.deck.length:t.n),ids=xs.map(x=>x.uid);
    if(!ids.length)break;(own.g36Protected??=[]).push(...ids);
    api.log(s,t.p,'look',card(t.source).name+'：山札'+(t.op==='g36Memory'?'':'の上'+ids.length+'枚')+'を確認',{cardId:t.source});
    choice(s,{...t,ids},'手札に加えるカードを1枚選ぶ',xs.map(x=>opt(card(x).name,x.uid,15+cost(card(x)),x.cardId)));break;
   }
   case'g36Order':{
    const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));
    if(api.deckLocked(s,t.p)){release(own,t.protected);if(t.bounce)put(s,continuation(t,'g36Bounce',{enemyOnly:t.enemyOnly}));break;}
    if(ids.length>1)choice(s,{...t,ids},'残りを山札の下に置く順序を選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));
    else{for(const uid of [...t.ordered,...ids]){const x=remove(own.deck,uid);if(x)own.deck.push(x);}release(own,t.protected);if(t.bounce)put(s,continuation(t,'g36Bounce',{enemyOnly:t.enemyOnly}));}break;
   }
   case'g36Bounce':choice(s,t,'手札に戻すクリーチャーを選ぶ',[
    ...api.targetOptions(s,t.p,[...(t.enemyOnly?[]:creatures(s,t.p)),...creatures(s,1-t.p)]).map(o=>({...o,score:own.battle.some(x=>x.uid===o.value)?-10:o.score})),skip()]);break;
   case'g36Pixie':ramp(s,t.p);if(s.winner===null)put(s,continuation(t,'g36Recover'));break;
   case'g36Recover':choice(s,t,'マナから無色カードを1枚戻してもよい',[
    ...own.mana.filter(x=>!x.faceDown&&faces(card(x)).every(c=>colors(c).length===0)).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;
   case'g36Purify':ramp(s,t.p);if(s.winner===null)put(s,continuation(t,'g36Grave',{selected:[]}));break;
   case'g36Grave':{
    const xs=opp.grave.filter(x=>!t.selected.includes(x.uid));if(!xs.length){shuffleSelected(s,t);break;}
    choice(s,t,'相手の墓地から山札に戻すカードを選ぶ（'+t.selected.length+'枚選択）',[
     ...xs.map(x=>opt(card(x).name,x.uid,5+cost(card(x)),x.cardId)),opt(t.selected.length?'この選択で戻す':'戻さない',null,0)]);break;
   }
   case'g36DNA':for(const x of creatures(s,1-t.p))api.tap(s,1-t.p,x);if(own.shields.length<=2)choice(s,t,'山札の上から1枚をシールドに加える？',[opt('加える',true,own.deck.length>1?20:-100),skip()]);break;
   case'g36Jack':{
    const rows=api.visibleBattleCards(s,1-t.p).filter(top=>targetable(s,t.p,1-t.p,top)).flatMap(top=>api.layers(top).filter(x=>(top===x?[card(x)]:faces(card(x))).some(c=>cost(c)<=4)).map(x=>opt((x!==top?'下のカード：':'')+card(x).name,x.uid,10+cost(card(x))*3,x.cardId)));
    choice(s,t,'コスト4以下の相手のカードを1枚選ぶ',rows);break;
   }
   case'g36Scrapper':{
    const xs=creatures(s,1-t.p).filter(x=>!t.selected.includes(x.uid)&&power(x,x.uid===s.attack?.attacker,s)<=t.budget);
    const options=api.targetOptions(s,t.p,xs);if(!options.length){destroySelected(s,t);break;}
    choice(s,t,'パワー合計5000以下で選ぶ（残り'+t.budget+'）',[...options,opt('この選択で破壊する',null,0)]);break;
   }
   case'g36Mixel':{
    const x=s.players[t.owner].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);
    if(x)move(s,[{player:t.owner,uid:x.uid,to:'deck',destroy:false}]);break;
   }
   default:throw Error('未実装のおすすめカード効果：'+t.op);
  }return true;
 }
 function shuffleSelected(s,t){const own=s.players[1-t.p],xs=t.selected.map(uid=>remove(own.grave,uid)).filter(Boolean);if(!xs.length)return;for(const x of xs)clear(x,'deck');api.shuffleLibrary(s,1-t.p,xs,t.source);api.log(s,t.p,'graveShuffle','相手の墓地'+xs.length+'枚を山札に戻す',{cardId:t.source});}
 function destroySelected(s,t){if(t.selected.length)move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'grave',destroy:true})));}
 function chosen(s,t,v){
  if(!t.op.startsWith('g36'))return false;const own=s.players[t.p];
  switch(t.op){
   case'g36Olive':{const target=s.players[v],xs=target.grave.splice(0);for(const x of xs)clear(x,'deck');api.shuffleLibrary(s,v,xs,t.source);api.log(s,t.p,'graveShuffle',(v===t.p?'自分':'相手')+'の墓地'+xs.length+'枚を山札に戻す',{cardId:t.source});break;}
   case'g36Collapse':{const x=remove(s.players[v.p].mana,v.uid);if(x){clear(x,'deck');s.players[v.p].deck.unshift(x);api.log(s,t.p,'manaToTop',(v.p===t.p?'自分':'相手')+'のマナ1枚を山札の上に置く',{cardId:t.source});}break;}
   case'g36WaterPick':{const x=remove(own.mana,v);if(x){const max=cost(card(x));clear(x,'hand');api.addZone(s,t.p,'hand',x);put(s,continuation(t,'g36WaterBounce',{max}));}break;}
   case'g36WaterBounce':if(v)move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false}]);break;
   case'g36Love':{
    const target=s.players[v],rows=['hand','grave'].flatMap(origin=>target[origin].map(x=>({origin,uid:x.uid,serial:x.zoneSerial||0})));
    put(s,continuation(t,'g36LoveFinish',{owner:v,rows,deck:target.deck.map(x=>x.uid)}));
    move(s,api.visibleBattleCards(s,v).map(x=>({player:v,uid:x.uid,to:'deck',destroy:false,controller:t.controller??t.p})));break;
   }
   case'g36Look':case'g36Memory':{
    const x=remove(own.deck,v);if(!x){release(own,t.ids);break;}const c=card(x);
    const bounce=t.enemyOnly?faces(c).some(f=>f.type==='creature'&&Number(f.power)>=6000):faces(c).some(f=>colors(f).some(c=>c==='火'||c==='自然'));
    release(own,[x.uid]);clear(x,'hand');api.addZone(s,t.p,'hand',x);
    if(t.op==='g36Memory'){release(own,t.ids);api.shuffleLibrary(s,t.p);api.log(s,t.p,'search','山札からカードを1枚手札に加え、シャッフルする',{cardId:t.source});}
    else{api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+c.name,{cardId:x.cardId});put(s,continuation(t,'g36Order',{ids:t.ids.filter(uid=>uid!==v),protected:t.ids,ordered:[],bounce,enemyOnly:t.enemyOnly}));}
    api.deckCheck(s,t.p);break;
   }
   case'g36Order':put(s,{...t,ids:t.ids.filter(uid=>uid!==v),ordered:[...t.ordered,v]});break;
   case'g36Bounce':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(owner>=0)move(s,[{player:owner,uid:v,to:'hand',destroy:false}]);}break;
   case'g36Recover':if(v){const x=remove(own.mana,v);if(x){clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
   case'g36Grave':if(v)put(s,{...t,selected:[...t.selected,v]});else shuffleSelected(s,t);break;
   case'g36DNA':if(v)api.shieldTop(s,t.p,card(t.source));break;
   case'g36Jack':if(v)api.moveBattleCard(s,1-t.p,v,'grave');break;
   case'g36Scrapper':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,{...t,selected:[...t.selected,v],budget:t.budget-power(x,x.uid===s.attack?.attacker,s)});}else destroySelected(s,t);break;
   default:throw Error('未実装のおすすめカード選択：'+t.op);
  }return true;
 }
 return {run,chosen,
  effect(s,p,c){if(c.effect!=='recommended')return false;const role=c.recommendRole;
   if(role==='chaff'){lock(s,p,{kind:'cast',player:1-p,spellCost:c.cost,spellSource:c.id});api.draw(s,p,1);return true;}
   const op={olive:'Olive',collapse:'Collapse',water:'Water',love:'Love',dondon:'Look',surasura:'Look',memory:'Memory',pixie:'Pixie',purify:'Purify',dna:'DNA',jack:'Jack',scrapper:'Scrapper'}[role];if(!op)throw Error('未実装のおすすめカード：'+role);
   put(s,task('g36'+op,p,c.id,{...(role==='dondon'?{n:5}:role==='surasura'?{n:4,enemyOnly:true}:role==='scrapper'?{selected:[],budget:5000}:{})}));return true;
  },
  allowedEntry(s,p,c,{execution}){return c?.type!=='creature'||execution||s.active!==p||!creatures(s,1-p).some(x=>!api.ignored(s,x)&&effective(x,s).recommendRole==='senno');},
  entry(s,p,x){if(!api.isCreature(s,x)||cost(card(x))<=s.players[p].mana.length)return;
   for(const watcher of creatures(s,1-p))if(!api.ignored(s,watcher)&&effective(watcher,s).recommendRole==='mixel')enqueue(s,1-p,{uid:watcher.uid,source:watcher.cardId,effect:'extended',task:task('g36Mixel',1-p,watcher.cardId,{owner:p,uid:x.uid,incarnation:x.incarnation||0})});
  }
 };
}
