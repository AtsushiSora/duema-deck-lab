// No.05: effects use serializable continuations, including nested spell casts.
export function createGospelRules(api){
 const {card,faces,cost,colors,power,creatures,put,task,choice,opt,skip,remove,removeShield,clear,move,cast,draw,log,canCast,canEnter,targetOptions,lock}=api;
 const hasSpell=x=>faces(card(x)).some(c=>c.type==='spell');
 const elementOptions=(s,p,max)=>s.players[1-p].battle.filter(x=>cost(card(x))<=(max==='∞'?Infinity:max)).filter(x=>api.targetable(s,p,1-p,x)).map(x=>opt(card(x).name,{uid:x.uid,zone:'battle'},20+cost(card(x)),x.cardId));
 const entry=(s,p,source,op,more={})=>api.enqueue(s,p,{source,effect:'extended',task:task(op,p,source,more)});
 const discount=(s,p,source,n)=>{(s.g5NextSummons??=[]).push({p,source,reduce:n,turn:s.turn});};
 function discardThen(s,t,follow){const key=String(s.g5Serial=(s.g5Serial||0)+1);(s.g5Discards??={})[key]=null;put(s,task('discard',t.p,t.source,{n:1,gospelKey:key}),task(follow,t.p,t.source,{key}));}
 function run(s,t){if(!t.op.startsWith('g5'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g5Recover':{const list=own.grave.filter(hasSpell).filter(x=>!t.selected.includes(x.uid));choice(s,t,'手札に戻す墓地の呪文を選ぶ（'+t.selected.length+'枚選択）',[...list.map(x=>opt(card(x).name,x.uid,20,x.cardId)),opt('ここまでで確定',null,0)]);break;}
  case'g5Dolsuzaku':{const list=['hand','grave'].flatMap(origin=>own[origin].filter(x=>!t.selected.some(y=>y.uid===x.uid)&&card(x).type==='creature'&&card(x).race.includes('ドルスザク')&&canEnter(s,t.p,card(x),{origin,execution:true})).map(x=>opt(card(x).name,{origin,uid:x.uid},30,x.cardId)));const max=own.entryLimitThisTurn?Math.max(0,1-(own.enteredThisTurn||0)):4;if(t.selected.length<max&&list.length)choice(s,t,'召喚するドルスザクを4体まで先に選ぶ（'+t.selected.length+'体）',[...list,opt('ここまでで確定',null,0)]);else put(s,{...t,op:'g5PrepareSummons'});break;}
  case'g5PrepareSummons':{own.g5Holding??=[];for(const row of t.selected){const x=remove(own[row.origin],row.uid);if(x){x.g5Origin=row.origin;own.g5Holding.push(x);}}put(s,...t.selected.map(row=>task('g5Summon',t.p,t.source,row)));break;}
  case'g5Summon':{const x=own.g5Holding?.find(x=>x.uid===t.uid);if(x){if(canEnter(s,t.p,card(x),{origin:x.g5Origin,execution:true}))cast(s,t.p,t.uid,true,null,0,null,'g5Holding','ドルスザクの能力');else{remove(own.g5Holding,x.uid);own[x.g5Origin].push(x);delete x.g5Origin;}}break;}
  case'g5ExtraTurn':{const q=s.extraTurns??=[];q.unshift({player:t.p,createdTurn:s.turn});const current=q.filter(x=>x.createdTurn===s.turn),older=q.filter(x=>x.createdTurn!==s.turn);s.extraTurns=[...current.filter(x=>x.player===s.active),...current.filter(x=>x.player!==s.active),...older];}log(s,t.p,'extraTurn','このターンの後に追加ターンを行う',{cardId:t.source});break;
  case'g5Frozen':{const detach=parent=>{for(const x of [...(parent.under||[])]){detach(x);if(card(x).type!=='creature'){parent.under=parent.under.filter(y=>y.uid!==x.uid);if(x.under?.length)parent.under.push(...x.under);clear(x);opp.grave.push(x);}}};for(const top of opp.battle)detach(top);const moves=opp.battle.filter(x=>card(x).type!=='creature').map(x=>({player:1-t.p,uid:x.uid,to:'grave'}));put(s,task('g5FreezeRest',t.p,t.source));if(moves.length)move(s,moves);break;}
  case'g5FreezeRest':{for(const x of[...opp.shields].filter(x=>x.faceUp)){const y=removeShield(s,1-t.p,x.uid);clear(y);opp.grave.push(y);}for(const x of creatures(s,1-t.p)){api.tap(s,1-t.p,x);x.skipUntap=true;}for(const x of opp.mana){x.tapped=true;x.skipUntap=true;}log(s,t.p,'freeze','相手のクリーチャーとマナをタップし、次の相手ターン開始時のアンタップを止める',{cardId:t.source});break;}
  case'g5Judge':{const uids=[[],[]],moves=[];for(const p of[s.active,1-s.active])for(const x of creatures(s,p))if(cost(card(x))>=s.players[p].mana.length){uids[p].push(...api.layers(x).map(y=>y.uid));moves.push({player:p,uid:x.uid,to:'deck'});}put(s,...[s.active,1-s.active].map(p=>task('g5OrderBottom',p,t.source,{uids:uids[p]})));if(moves.length)move(s,moves);break;}
  case'g5OrderBottom':{const ids=t.uids.filter(uid=>own.deck.some(x=>x.uid===uid));if(ids.length===1){const x=remove(own.deck,ids[0]);own.deck.push(x);}else if(ids.length>1)choice(s,{...t,uids:ids},'山札の下に置くカードの順序を選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
  case'g5Triple':choice(s,t,'T・T・Tの効果を選ぶ',[opt('相手を3体までタップ',0,creatures(s,1-t.p).filter(x=>!x.tapped).length*8),opt('カードを3枚引く',1,own.deck.length>3?20:-30),opt('次の召喚を3軽減し、スピードアタッカーを与える',2,own.hand.some(x=>card(x).type==='creature')?30:0)]);break;
  case'g5TapThree':{const list=creatures(s,1-t.p).filter(x=>!t.uids.includes(x.uid));if(t.uids.length<3&&list.length)choice(s,t,'タップする相手を3体まで選ぶ',[...targetOptions(s,t.p,list),opt('ここまでで確定',null,0)]);else for(const uid of t.uids){const x=opp.battle.find(x=>x.uid===uid);if(x)api.tap(s,1-t.p,x);}break;}
  case'g5Siren':choice(s,t,'手札に戻す自分のマナを1枚選ぶ',own.mana.map(x=>opt(card(x).name,x.uid,x.tapped?10:0,x.cardId)));if(!own.mana.length)put(s,task('g5HandMana',t.p,t.source));break;
  case'g5HandMana':choice(s,t,'マナに置く手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
  case'g5Courage':choice(s,t,'勇愛の天秤の効果を選ぶ',[opt('手札を1枚捨て、2枚引く',0,own.deck.length>2?15:-30),opt('パワー2000以下の相手を破壊',1,creatures(s,1-t.p).some(x=>power(x,false,s)<=2000)?30:0)]);break;
  case'g5Burning':put(s,task('discard',t.p,t.source,{n:1}),task('draw',t.p,t.source,{n:2}),...(t.plus?[task('g5DestroyElement',t.p,t.source,{max:6})]:[]));break;
  case'g5LastFlame':discardThen(s,t,'g5AfterFlame');break;
  case'g5AfterFlame':{const id=s.g5Discards?.[t.key];delete s.g5Discards[t.key];if(id){const max=Math.max(...faces(card(id)).map(cost));put(s,task('g5DestroyElement',t.p,t.source,{max:Number.isFinite(max)?max:'∞'}));}break;}
  case'g5DestroyElement':choice(s,t,'破壊するコスト'+t.max+'以下のエレメントを選ぶ',elementOptions(s,t.p,t.max));break;
  case'g5AltPay':{const list=own.hand.filter(x=>x.uid!==t.uid&&!t.selected.includes(x.uid)&&card(x).race.includes('スノーフェアリー'));if(t.selected.length===5){put(s,...t.selected.map(uid=>task('discardChosen',t.p,t.source,{uid,n:1})),task('g5AltCast',t.p,t.source,{uid:t.uid}));break;}choice(s,t,'代替コストのスノーフェアリーを5体選ぶ（'+t.selected.length+'/5）',[...list.map(x=>opt(card(x).name,x.uid,0,x.cardId)),opt('使用をやめる',null,-100)]);break;}
  case'g5AltCast':if(own.hand.some(x=>x.uid===t.uid)&&canCast(s,t.p,card(t.source)))cast(s,t.p,t.uid,true,null,0,null,'hand','スノーフェアリー5体の代替コスト');break;
  default:throw Error('未実装のゴスペル効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g5'))return false;const own=s.players[t.p];switch(t.op){
  case'g5Recover':if(value)put(s,{...t,selected:[...t.selected,value]});else for(const uid of t.selected){const x=remove(own.grave,uid);if(x){clear(x,'hand');own.hand.push(x);}}break;
  case'g5Dolsuzaku':if(value)put(s,{...t,selected:[...t.selected,value]});else put(s,{...t,op:'g5PrepareSummons'});break;
  case'g5OrderBottom':{const x=remove(own.deck,value);own.deck.push(x);put(s,{...t,uids:t.uids.filter(uid=>uid!==value)});break;}
  case'g5Triple':if(value===0)put(s,task('g5TapThree',t.p,t.source,{uids:[]}));if(value===1)draw(s,t.p,3);if(value===2&&!oppNoReduce(s,t.p))discount(s,t.p,t.source,3);break;
  case'g5TapThree':if(value)put(s,{...t,uids:[...t.uids,value]});else for(const uid of t.uids){const x=s.players[1-t.p].battle.find(x=>x.uid===uid);if(x)api.tap(s,1-t.p,x);}break;
  case'g5Siren':{const x=remove(own.mana,value);if(x){clear(x,'hand');own.hand.push(x);}put(s,task('g5HandMana',t.p,t.source));break;}
  case'g5HandMana':{const x=remove(own.hand,value);if(x){clear(x,'mana');own.mana.push(x);}break;}
  case'g5Courage':if(value===0)put(s,task('discard',t.p,t.source,{n:1}),task('draw',t.p,t.source,{n:2}));else put(s,task('destroyPower',t.p,t.source,{max:2000}));break;
  case'g5DestroyElement':if(value.zone==='battle')move(s,[{player:1-t.p,uid:value.uid,to:'grave'}]);else{const x=removeShield(s,1-t.p,value.uid);if(x){clear(x);s.players[1-t.p].grave.push(x);}}break;
  case'g5AltPay':if(value)put(s,{...t,selected:[...t.selected,value]});break;
  default:throw Error('未実装のゴスペル選択：'+t.op);
 }return true;}
 const oppNoReduce=(s,p)=>creatures(s,1-p).some(x=>api.effective(x,s).noCostReduction);
 return {run,chosen,hasSpell,
  effect(s,p,c,uid){switch(c.effect){case'gospelRecover':put(s,task('g5Recover',p,c.id,{selected:[]}));break;case'dolsuzakuTurn':put(s,task('g5Dolsuzaku',p,c.id,{selected:[]}),task('g5ExtraTurn',p,c.id));break;case'frozenCarnival':put(s,task('g5Frozen',p,c.id));break;case'finalStop':lock(s,p,{kind:'cast',player:1-p,expires:'end',who:1-p,afterTurns:s.players[1-p].turns});draw(s,p,1);break;case'oriotisJudge':put(s,task('g5Judge',p,c.id));break;case'nextSummonSpeed':if(!oppNoReduce(s,p))discount(s,p,c.id,1);break;case'tripleMode':put(s,task('g5Triple',p,c.id));break;case'sirenMana':put(s,task('g5Siren',p,c.id));break;case'courageMode':put(s,task('g5Courage',p,c.id));break;case'burningLoot':put(s,task('g5Burning',p,c.id,{plus:(s.extSpells||[]).find(x=>x.inst.uid===uid)?.inst.triggerPlus||false}));break;case'lastDragonFlame':put(s,task('g5LastFlame',p,c.id));break;default:return false;}return true;},
  discarded(s,t,x,actual){if(t.gospelKey&&actual)s.g5Discards[t.gospelKey]=x.cardId;},
  nextDiscount(s,p){return (s.g5NextSummons||[]).filter(x=>x.p===p&&x.turn===s.turn).reduce((n,x)=>n+x.reduce,0);},
  summoned(s,p,x){const list=(s.g5NextSummons||[]).filter(x=>x.p===p&&x.turn===s.turn);s.g5NextSummons=(s.g5NextSummons||[]).filter(x=>!list.includes(x));if(list.length)x.gospelSpeed=s.turn;},
  attack(s,p,x){if(api.effective(x,s).gospelAttack&&!api.selfStopped(s,p))entry(s,p,x.cardId,'execute',{origin:'hand',max:'∞',spellOnly:true});},
  mainActions(s,p){return s.players[p].hand.filter(x=>card(x).snowAlternative&&canCast(s,p,card(x))&&s.players[p].hand.filter(y=>y.uid!==x.uid&&card(y).race.includes('スノーフェアリー')).length>=5).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,alternative:'snow',label:card(x).name+'をスノーフェアリー5体を捨てて唱える'}));},
  beginAlternative(s,p,a){put(s,task('g5AltPay',p,a.cardId,{uid:a.uid,selected:[]}));},
 };
}
