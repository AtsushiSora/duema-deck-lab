// No.12: one-shot Gachinko judges, Hunter deployment and loss replacements.
export function createHunterRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,draw,move,cast,remove,clear,targetOptions,shieldTo,lock}=api;
 const hunter=c=>String(c.race).includes('ハンター'),dragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン'),key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(p,x,op,more={})=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const enqueue=(s,p,x,op,more={})=>api.enqueue(s,p,on(p,x,op,more));
 const usable=(s,p,c,origin='deck')=>api.canCast(s,p,c)&&(c.type==='spell'||api.canEnter(s,p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 const judge=(s,t,win)=>api.singleJudge(s,t.p,t.source,t.uid,win);
 // A selected Hunter may supply the evolution base for the second selected card.
 function selectable(s,t,c){
  if(usable(s,t.p,c))return true;
  const own=s.players[t.p];return t.selected.some(row=>{const x=own.deck.find(x=>x.uid===row.uid),first=x&&faces(card(x))[row.face];if(!first||first.type!=='creature'||!usable(s,t.p,first))return false;
   const bases=first.evolution?api.evolutionBases(s,t.p,first):[null];return bases.some(base=>{const battle=own.battle.filter(y=>y.uid!==base?.uid);battle.push({...x,entered:s.turn,...(base?{under:[base]}:{})});const next={...s,players:s.players.map((y,i)=>i===t.p?{...y,battle,enteredThisTurn:(y.enteredThisTurn||0)+1}:y)};return usable(next,t.p,c);});
  });
 }
 function reveal(s,t,n){const uids=s.players[t.p].deck.slice(0,n).map(x=>x.uid);(s.players[t.p].g12Reveals??=[]).push(...uids);return uids;}
 function bottom(s,t){const own=s.players[t.p];own.g12Reveals=(own.g12Reveals||[]).filter(uid=>!t.uids.includes(uid));put(s,task('g20Bottom',t.p,t.source,{uids:t.uids.filter(uid=>own.deck.some(x=>x.uid===uid))}));}
 function use(s,t,base=null){const own=s.players[t.p],x=own[t.origin||'deck'].find(x=>x.uid===t.uid);if(x&&usable(s,t.p,faces(card(x))[t.face||0],t.origin||'deck')){cast(s,t.p,x.uid,true,base,t.face||0,null,t.origin||'deck',t.reason||'W・メクレイド');if((t.origin||'deck')==='deck')api.deckCheck(s,t.p);}}
 function run(s,t){if(!t.op.startsWith('g12'))return false;const own=s.players[t.p];switch(t.op){
  case'g12Mekraid':put(s,task('g12Select',t.p,t.source,{uids:reveal(s,t,6),selected:[]}));break;
  case'g12Select':{const list=t.uids.filter(uid=>!t.selected.some(y=>y.uid===uid)).flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return x?faces(card(x)).flatMap((c,face)=>cost(c)<=10&&hunter(c)&&selectable(s,t,c)?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]):[];});if(t.selected.length===2||!list.length){put(s,task('g12Next',t.p,t.source,{remaining:t.selected}),task('g12Bottom',t.p,t.source,{uids:t.uids}));break;}choice(s,t,'W・メクレイドで使うカードを2枚まで選ぶ（'+t.selected.length+'枚）',[...list,opt('選択を確定',null,0)]);break;}
  case'g12Next':{if(!t.remaining.length)break;const list=t.remaining.filter(row=>{const x=own.deck.find(x=>x.uid===row.uid);return x&&usable(s,t.p,faces(card(x))[row.face]);});if(!list.length)break;if(list.length===1)put(s,task('g12Use',t.p,t.source,{...list[0]}),{...t,remaining:t.remaining.filter(y=>y.uid!==list[0].uid)});else choice(s,t,'次に使うカードを選ぶ（使用順）',list.map(row=>{const x=own.deck.find(x=>x.uid===row.uid);return opt(faces(card(x))[row.face].name,row,20+cost(faces(card(x))[row.face]),x.cardId);}));break;}
  case'g12Use':{const x=own[t.origin||'deck'].find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face||0];if(!c||!usable(s,t.p,c,t.origin||'deck'))break;if(c.evolution||c.neoEvolution)choice(s,t,'召喚する方法・進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに召喚',false,1)]:[]),...api.evolutionBases(s,t.p,c).map(b=>opt(card(b).name+'の上に召喚',b.uid,2,b.cardId))]);else use(s,t);break;}
  case'g12Bottom':bottom(s,t);break;
  case'g12Onimaru':judge(s,t,task('g12ExtraTurn',t.p,t.source));break;
  case'g12ExtraTurn':(s.extraTurns??=[]).unshift({player:t.p,source:t.source});api.log(s,t.p,'extraTurn','鬼丸「覇」でこのターンの後に追加ターン',{cardId:t.source});break;
  case'g12Ouga':judge(s,t,task('g12DragonLook',t.p,t.source));break;
  case'g12DragonLook':{const uids=reveal(s,t,3);put(s,task('g12Dragon',t.p,t.source,{uids}),task('g12Bottom',t.p,t.source,{uids}));break;}
  case'g12Dragon':choice(s,t,'上3枚から出すドラゴンを1体まで選ぶ',[...t.uids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return x&&dragon(card(x))&&api.canEnter(s,t.p,card(x),{origin:'deck',execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length)?[opt(card(x).name,uid,20+cost(card(x)),x.cardId)]:[];}),skip()]);break;
  case'g12DiehardShield':choice(s,t,'墓地に置く相手のシールドを選ぶ',s.players[1-t.p].shields.map((x,i)=>opt('相手のシールド'+(i+1),x.uid,0)));break;
  case'g12DiehardProtect':(s.g12NoLose??=[]).push({p:t.p,turn:s.turn});api.log(s,t.p,'noLose','このターン、ゲームに負けず、相手は勝てない',{cardId:t.source});break;
  case'g12Aqua':judge(s,t,task('g12AquaWin',t.p,t.source));break;
  case'g12AquaWin':draw(s,t.p,1);for(const x of creatures(s,1-t.p))lock(s,t.p,{kind:'attack',player:1-t.p,uid:x.uid,incarnation:x.incarnation||0,expires:'end',who:s.active});break;
  case'g12Mechade':choice(s,t,'マナの枚数以下のハンターを召喚する',[...own.mana.filter(x=>card(x).type==='creature'&&hunter(card(x))&&cost(card(x))<=own.mana.length&&usable(s,t.p,card(x),'mana')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
  case'g12Bambi':judge(s,t,task('g20Ramp',t.p,t.source,{n:1}));break;
  case'g12VictoryJudge':judge(s,t,task('draw',t.p,t.source,{n:1}));break;
  case'g12Sweep':{const rows=[0,1].flatMap(p=>creatures(s,p).filter(x=>api.power(x,x.uid===s.attack?.attacker,s)<=t.max).map(x=>({player:p,uid:x.uid,to:'grave'})));if(rows.length)move(s,rows);break;}
  case'g12ManaLook':{const uids=reveal(s,t,2);if(uids.length)choice(s,{...t,uids},'上2枚からマナに置くカードを選ぶ',uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,-cost(card(x)),x.cardId);}));break;}
  case'g12ManaRest':if(t.uids.length)choice(s,t,'残りのカードをどちらに置く？',[opt('山札の上','top',1),opt('山札の下','bottom',0)]);break;
  case'g12Loss':throw Error('敗北置換は状態チェックから選択します');
  default:throw Error('未実装のハンター効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g12'))return false;const own=s.players[t.p];switch(t.op){
  case'g12Select':if(value)put(s,{...t,selected:[...t.selected,value]});else put(s,task('g12Next',t.p,t.source,{remaining:t.selected}),task('g12Bottom',t.p,t.source,{uids:t.uids}));break;
  case'g12Next':put(s,task('g12Use',t.p,t.source,value),{...t,remaining:t.remaining.filter(y=>y.uid!==value.uid)});break;
  case'g12Use':use(s,t,value||null);break;
  case'g12Dragon':if(value)put(s,task('putCreature',t.p,t.source,{origin:'deck',uid:value}),task('g12DeckCheck',t.p,t.source));break;
  case'g12DiehardShield':shieldTo(s,1-t.p,value,'grave');break;
  case'g12Mechade':if(value)put(s,task('g12Use',t.p,t.source,{origin:'mana',uid:value,reason:'メチャデ塊ゾウ'}));break;
  case'g12ManaLook':{const x=remove(own.deck,value),to=api.deckRedirect(s,t.p)?'grave':'mana';if(x){clear(x,to);api.addZone(s,own,to,x);}const uids=t.uids.filter(uid=>uid!==value);own.g12Reveals=(own.g12Reveals||[]).filter(uid=>uid!==value);put(s,task('g12ManaRest',t.p,t.source,{uids}));api.deckCheck(s,t.p);break;}
  case'g12ManaRest':own.g12Reveals=(own.g12Reveals||[]).filter(uid=>!t.uids.includes(uid));if(value==='bottom')put(s,task('g20Bottom',t.p,t.source,{uids:t.uids}));break;
  case'g12Loss':if(value){if(value.kind==='ura'){api.uraLoss(s,t.p,value.uid);break;}if(value.kind==='oni'){api.oniLoss(s,t.p,value.uid);break;}if(value.kind==='johnnyHand'){api.replaceJohnnyHandLoss(s,t.p,value.uid);break;}if(value.kind==='baba'){api.replaceHandLoss(s,t.p,value.uid);break;}if(value.kind==='hunter')(s.g12LossUsed??={})[value.key]=s.turn;api.replaceLoss(s,t.p,value.uid);}else api.declineLoss(s);break;
  default:throw Error('未実装のハンター選択：'+t.op);
 }return true;}
 return {run(s,t){if(t.op==='g12DeckCheck'){api.deckCheck(s,t.p);return true;}return run(s,t);},chosen,
  effect(s,p,c,uid){switch(c.effect){case'hunterMekraid':put(s,task('g12Mekraid',p,c.id,{uid}));break;case'hunterBambi':put(s,task('g12Bambi',p,c.id,{uid}));break;case'hunterSweep4':put(s,task('g12Sweep',p,c.id,{max:4000}));break;case'hunterSweep2':put(s,task('g12Sweep',p,c.id,{max:2000}));break;case'hunterVictory':put(s,task('destroyPower',p,c.id,{max:12000}),task('g12VictoryJudge',p,c.id,{uid}));break;case'hunterMana':put(s,task('g12ManaLook',p,c.id));break;case'hunterDraw':draw(s,p,2);break;default:return false;}return true;},
  discount(s,p,c){return(c.hunterSympathy?creatures(s,p).filter(x=>hunter(effective(x,s))).length:0)+(c.opponentCreatureDiscount?creatures(s,1-p).length:0);},
  attack(s,p,x){const c=effective(x,s),stopped=api.selfStopped(s,p);if(!stopped){if(c.hunterMekraid)enqueue(s,p,x,'g12Mekraid');if(c.onimaruExtra)enqueue(s,p,x,'g12Onimaru');if(c.ougaJudge)enqueue(s,p,x,'g12Ouga');}if(dragon(c))for(const y of creatures(s,p))if(effective(y,s).diehard&&(!stopped||x.uid!==y.uid))enqueue(s,p,y,'g12DiehardShield');},
  entry(s,p,x){if(api.isCreature(s,x))for(const y of creatures(s,1-p))if(effective(y,s).aquaJudge)enqueue(s,1-p,y,'g12Aqua');},
  battleWins(s,p,w){return w?.mechade?[{player:p,uid:w.uid,source:w.source,hunter:true}]:[];},
  leaveSnapshot(s,rows){return Object.fromEntries(rows.flatMap(({player,uid})=>{const x=s.players[player].battle.find(x=>x.uid===uid);return x&&effective(x,s).diehard?[[uid,true]]:[];}));},
  leaving(s,p,x,snapshot,to,destroy){if(snapshot?.[x.uid]&&to==='grave'&&destroy)enqueue(s,p,x,'g12DiehardProtect');},
  noLose:(s,p)=>(s.g12NoLose||[]).some(x=>x.p===p&&x.turn===s.turn),
  triggersAllowed:(s,p)=>!creatures(s,1-p).some(x=>x.tapped&&effective(x,s).bairas),
  forceActions(s,p,actions){const must=new Map();for(const a of actions)if(a.kind==='attack'&&a.target!=='player'){const target=s.players[1-p].battle.find(x=>x.uid===a.target);if(target&&effective(target,s).bairas){const ids=must.get(a.uid)||new Set();ids.add(a.target);must.set(a.uid,ids);}}return actions.filter(a=>a.kind!=='attack'||!must.has(a.uid)||must.get(a.uid).has(a.target));},
  lossOptions(s,p){const own=s.players[p],destroyable=x=>api.canLeave(s,p,x),all=creatures(s,p),mandatory=all.filter(x=>effective(x,s).diehard&&destroyable(x));const out=mandatory.map(x=>opt(card(x).name+'をかわりに破壊',{kind:'diehard',uid:x.uid},40,x.cardId));for(const source of all.filter(x=>effective(x,s).hunterLoss&&s.g12LossUsed?.[key(x)]!==s.turn))for(const x of own.battle.filter(x=>hunter(card(x))&&destroyable(x)))out.push(opt(card(source).name+'：'+card(x).name+'を破壊',{kind:'hunter',key:key(source),uid:x.uid},30-cost(card(x)),x.cardId));if(out.length&&!mandatory.length)out.push(opt('置換せず敗北する',null,-1000));return out;},
 };
}
