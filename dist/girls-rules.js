// No.08: dragon entry effects, shared shield groups, and serializable reveal choices.
export function createGirlsRules(api){
 const {card,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter}=api;
 const dragon=c=>String(c.race).includes('ドラゴン'),key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function ramp(s,p,n){const out=[];for(let i=0;i<n&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);if(to==='mana')x.tapped=true;api.addZone(s,s.players[p],to,x);out.push(x);}api.deckCheck(s,p);}return out;}
 function finishReveal(s,t,toMana=false){const own=s.players[t.p],remaining=t.uids.filter(uid=>own.deck.some(x=>x.uid===uid));delete own.g8Protected;if(toMana){for(const uid of remaining){const x=remove(own.deck,uid),to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);if(to==='mana')x.tapped=true;api.addZone(s,own,to,x);}api.deckCheck(s,t.p);}else{if(api.deckLocked(s,t.p))return;for(const uid of remaining){const x=remove(own.deck,uid);own.deck.push(x);}put(s,task('bottomOrder',t.p,t.source,{uids:remaining}));}}
 const canPut=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function run(s,t){if(!t.op.startsWith('g8_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g8_Daiou':if(api.targetOptions(s,t.p,creatures(s,1-t.p)).length)choice(s,t,'ドラゴ大王：バトルさせる自分のクリーチャーを選ぶ',[...creatures(s,t.p).map(x=>opt(card(x).name,x.uid,api.power(x,false,s)/1000,x.cardId)),skip()]);break;
 case'g8_DaiouEnemy':choice(s,t,'バトルさせる相手のクリーチャーを選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g8_Savak':{if(!opp.shields.length)break;const tops=new Set(api.targetOptions(s,t.p,api.visibleBattleCards(s,1-t.p)).map(x=>x.value));choice(s,t,'サッヴァーク：シールドに重ねる相手のカードを1枚選ぶ',api.visibleBattleCards(s,1-t.p).filter(x=>tops.has(x.uid)).flatMap(top=>api.layers(top).map(x=>opt(card(x).name,{uid:x.uid,top:top.uid},cost(card(x))*3,card(x).id))));break;}
 case'g8_SavakShield':choice(s,t,'相手のどのシールドに表向きで重ねる？',opp.shields.map((x,i)=>opt('相手のシールド'+(i+1),x.uid,0)));break;
 case'g8_Zeos':choice(s,t,'ゼオス：シールド化する相手のエレメントを選ぶ',[...api.targetOptions(s,t.p,api.visibleBattleCards(s,1-t.p)),skip()]);break;
 case'g8_Try':{const selected=t.selected||[],options=api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!selected.includes(x.uid)));if(selected.length===2||!options.length){if(selected.length)move(s,selected.map(uid=>({player:1-t.p,uid,to:'hand'})));break;}choice(s,{...t,selected},'手札に戻す相手のクリーチャーを2体まで選ぶ（'+selected.length+'/2）',[...options,opt('ここまでで確定',null,0)]);break;}
 case'g8_TryDie':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&(own.brokenThisTurn||0)<2)move(s,[{player:t.p,uid:x.uid,to:'grave'}]);break;}
 case'g8_Mega':{const rows=creatures(s,1-t.p).filter(x=>api.power(x,x.uid===s.attack?.attacker,s)<=13000).map(x=>({player:1-t.p,uid:x.uid,to:'grave'}));if(rows.length)move(s,rows);break;}
 case'g8_Gyai':{const uids=own.deck.slice(0,3).map(x=>x.uid);own.g8Protected=uids;api.log(s,t.p,'reveal','ギャイで公開：'+own.deck.slice(0,3).map(x=>card(x).name).join('、'),{cardId:t.source});put(s,{...t,op:'g8_GyaiPick',uids,selected:[]});break;}
 case'g8_GyaiPick':{const options=t.uids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&card(x).type==='creature'&&dragon(card(x)));choice(s,t,'手札に加えるドラゴンを選ぶ（残りはタップしてマナへ）',[...options.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 case'g8_Arshu':ramp(s,t.p,1);put(s,{...t,op:'g8_ArshuReturn'});break;
 case'g8_ArshuReturn':choice(s,t,'流星アーシュ：マナからドラゴンを1体手札に戻す',own.mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&dragon(card(x))).map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g8_ArshuBounce':choice(s,t,'戻したドラゴンのコスト以下の相手1体を手札へ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(card(x))<=t.max)));break;
 case'g8_Rupia':{const top=ramp(s,t.p,1)[0];if(top&&dragon(card(top))&&s.winner===null&&!s.lossEvent)ramp(s,t.p,1);break;}
 case'g8_Untap':for(const x of creatures(s,t.p))if(colors(card(x)).length>1&&api.canUntap(x))x.tapped=false;break;
 case'g8_Final':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;(s.finalHistory??=[false,false])[t.p]=true;if(api.deckLocked(s,t.p))break;const uids=own.deck.slice(0,4).map(x=>x.uid);own.g8Protected=uids;api.log(s,t.p,'reveal','ドギラゴン閃のファイナル革命で上4枚を公開：'+own.deck.slice(0,4).map(x=>card(x).name).join('、'),{cardId:t.source});put(s,{...t,op:'g8_FinalPick',uids,selected:[],budget:6});}break;
 case'g8_FinalPick':{const rows=t.uids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&canPut(s,t.p,x,'deck')&&!card(x).evolution&&!card(x).sMax&&colors(card(x)).length>1&&cost(card(x))<=t.budget);choice(s,t,'合計コスト6以下の多色クリーチャーを選ぶ（残り'+t.budget+'）',[...rows.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 case'g8_FinalNext':{const list=t.selected.filter(uid=>own.deck.some(x=>x.uid===uid));if(!list.length){finishReveal(s,t);break;}choice(s,{...t,selected:list},'次に出すクリーチャーを選ぶ',list.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,20+cost(card(x)),x.cardId);}));break;}
 case'g8_DragonShield':choice(s,t,'ドラゴン・W・ブレイカー：シールドの増やし方を選ぶ',[opt('山札の上を裏向きの新しいシールドにする','new',own.shields.length<4?20:8),opt('山札の上を表向きで既存のシールドに重ねる','stack',own.shields.length?15:-20)]);break;
 case'g8_DragonShieldStack':choice(s,t,'表向きにしたカードを重ねる自分のシールドを選ぶ',own.shields.map((x,i)=>opt('自分のシールド'+(i+1),x.uid,0)));break;
 default:throw Error('未実装のドラゴン娘効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g8_'))return false;const own=s.players[t.p];switch(t.op){
 case'g8_Daiou':if(v)put(s,{...t,op:'g8_DaiouEnemy',ally:v});break;
 case'g8_DaiouEnemy':{const a=own.battle.find(x=>x.uid===t.ally),b=s.players[1-t.p].battle.find(x=>x.uid===v);if(a&&b)api.battle(s,t.p,a,1-t.p,b,s.attack?.attacker);break;}
 case'g8_Savak':put(s,{...t,op:'g8_SavakShield',target:v.uid});break;
 case'g8_SavakShield':api.sendBattleCardToShield(s,1-t.p,t.target,v);break;
 case'g8_Zeos':if(v)move(s,[{player:1-t.p,uid:v,to:'shields',destroy:false}]);break;
 case'g8_Try':if(v)put(s,{...t,selected:[...t.selected,v]});else if(t.selected.length)move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'hand'})));break;
 case'g8_GyaiPick':if(v)put(s,{...t,selected:[...t.selected,v]});else{for(const uid of t.selected){const x=remove(own.deck,uid);if(x){clear(x,'hand');own.hand.push(x);}}finishReveal(s,t,true);}break;
 case'g8_ArshuReturn':{const x=remove(own.mana,v);if(x){const max=cost(card(x));clear(x,'hand');own.hand.push(x);put(s,{...t,op:'g8_ArshuBounce',max});}break;}
 case'g8_ArshuBounce':move(s,[{player:1-t.p,uid:v,to:'hand'}]);break;
 case'g8_FinalPick':if(v){const x=own.deck.find(x=>x.uid===v);put(s,{...t,selected:[...t.selected,v],budget:t.budget-cost(card(x))});}else put(s,{...t,op:'g8_FinalNext'});break;
 case'g8_FinalNext':put(s,task('putCreature',t.p,t.source,{uid:v,origin:'deck',deckCheck:true}),{...t,selected:t.selected.filter(uid=>uid!==v)});break;
 case'g8_DragonShield':if(v==='new')api.shieldTop(s,t.p,card(t.source));else if(own.shields.length&&!api.deckLocked(s,t.p)){const x=own.deck[0];if(x){api.log(s,t.p,'reveal','ドラゴン・W・ブレイカーで公開：'+card(x).name,{cardId:t.source});put(s,{...t,op:'g8_DragonShieldStack'});}}break;
 case'g8_DragonShieldStack':{if(!api.canAddShield(s,t.p))break;const x=api.takeTop(s,t.p);if(x){if(api.deckRedirect(s,t.p)){clear(x);api.addZone(s,own,'grave',x);}else{clear(x,'shields');api.addShieldCard(s,t.p,v,x);}api.deckCheck(s,t.p);}break;}
 default:throw Error('未実装のドラゴン娘選択：'+t.op);
 }return true;}
 return{run,chosen,manaPermits(s,p,x){return card(x).type==='creature'&&dragon(card(x))?creatures(s,p).filter(y=>effective(y,s).dragonManaOnce&&(s.g8ManaUses||{})[key(y)]!==s.turn).map(y=>'g8:'+key(y)):[];},
 effect(s,p,c,uid,entry){const op={girlsDaiou:'Daiou',girlsSavak:'Savak',girlsZeos:'Zeos',girlsTry:'Try',girlsMega:'Mega',girlsGyai:'Gyai',girlsArshu:'Arshu',girlsRupia:'Rupia'}[c.effect];if(!op)return false;put(s,task('g8_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 entry(s,p,x,options){if(effective(x,s).tryshot&&p!==s.active&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,x))on(s,p,x,'g8_TryDie');},
 leaveSnapshot(s,rows){return {creatureUids:[0,1].flatMap(p=>creatures(s,p).map(x=>x.uid)),watchers:[0,1].flatMap(p=>creatures(s,p).filter(x=>effective(x,s).suzu).map(x=>({p,uid:x.uid,source:x.cardId})))};},
 leaving(s,p,x,snapshot,to,destroy){if(to==='grave'&&destroy&&snapshot?.creatureUids.includes(x.uid))for(const y of snapshot.watchers)if(y.p!==p)api.enqueue(s,y.p,{uid:y.uid,source:y.source,effect:'extended',task:task('discard',p,y.source,{n:1,causedBy:y.p})});},
 end(s){return creatures(s,s.active).filter(x=>effective(x,s).endUntapMulticolor).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g8_Untap',s.active,x.cardId)}));},
 beforeBreak(s,defender,uids){const context=s.breakContext;if(!context||context.g19Prepared||defender===context.player)return false;const x=s.players[context.player].battle.find(x=>x.uid===context.sourceUid);if(!x||!effective(x,s).dragonBreaker)return false;context.g19Prepared=true;put(s,...uids.map(()=>task('g8_DragonShield',context.player,x.cardId)),task('g19BeforeCommit',context.player,x.cardId,{defender,uids:[...uids],context:structuredClone(context)}));return true;},
 mainActions(s,p){const own=s.players[p];return creatures(s,p).filter(x=>effective(x,s).dragonManaOnce&&(s.g8ManaUses||{})[key(x)]!==s.turn).flatMap(source=>own.mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&dragon(card(x))&&api.canCast(s,p,card(x))&&api.canEnter(s,p,card(x),{origin:'mana',execution:true})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length)&&api.canPay(s,p,{...card(x),summonOrigin:'mana'})).map(x=>({kind:'play',origin:'mana',manaPermit:'g8:'+key(source),uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,{...card(x),summonOrigin:'mana'}),label:'ギャイでマナの'+card(x).name+'を召喚'})));},
 played(s,p,c,x,origin,permit){if(origin==='mana'&&permit?.startsWith('g8:'))(s.g8ManaUses??={})[permit.slice(3)]=s.turn;},
 };
}
