// No.10: library permissions, protected batch deployment and per-draw replacements.
export function createGachiroboRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,draw,move,enter,targetOptions}=api;
 const canPut=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const protect=(own,n)=>{const uids=own.deck.slice(0,n).map(x=>x.uid);(own.g10Protected??=[]).push(...uids);return uids;};
 const release=(own,uids)=>own.g10Protected=(own.g10Protected||[]).filter(uid=>!uids.includes(uid));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function arrange(s,p,list){if(!list.length)return true;return list.some(x=>{if(!canPut(s,p,x,'deck'))return false;const c=card(x),rest=list.filter(y=>y.uid!==x.uid),bases=c.evolution?api.evolutionBases(s,p,c):[null];return bases.some(base=>{const v=structuredClone(s),own=v.players[p];if(base)remove(c.graveEvolution?own.grave:own.battle,base.uid);own.battle.push({...x,entered:s.turn});return arrange(v,p,rest);});});}
 function enterBatch(s,t,base=null){const own=s.players[t.p],x=remove(own.deck,t.uid);put(s,{...t,op:'g10_Next',remaining:t.remaining.filter(uid=>uid!==t.uid)});if(x){enter(s,t.p,x,base,{origin:'deck',execution:false});api.deckCheck(s,t.p);}}
 function run(s,t){if(!t.op.startsWith('g10_'))return false;const own=s.players[t.p];switch(t.op){
 case'g10_Robo':{const uids=protect(own,3),list=uids.map(uid=>own.deck.find(x=>x.uid===uid)),success=list.length&&list.every(x=>card(x).type==='creature'&&cost(card(x))===cost(card(list[0])));api.log(s,t.p,'reveal','ガチロボで公開：'+list.map(x=>card(x).name).join('、'),{cardId:t.source});put(s,success?{...t,op:'g10_Next',remaining:uids,protected:uids,rest:[],failedTop:true}:{...t,op:'g10_Order',remaining:uids,protected:uids});break;}
 case'g10_Magrul':{const uids=protect(own,4);put(s,{...t,op:'g10_Select',uids,selected:[],budget:9});break;}
 case'g10_Select':{const list=t.uids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>card(x).type==='creature'&&colors(card(x)).length>1&&cost(card(x))<=t.budget&&api.canEnter(s,t.p,card(x),{origin:'deck',execution:false})&&arrange(s,t.p,[...t.selected.map(uid=>own.deck.find(x=>x.uid===uid)),x]));choice(s,t,'上4枚から多色クリーチャーを合計9コストまで選ぶ（残り'+t.budget+'）',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),opt('この選択で出す',null,t.selected.length?25:0)]);break;}
 case'g10_Next':{const list=t.remaining.map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&canPut(s,t.p,x,'deck'));if(!list.length){put(s,{...t,op:'g10_Order',remaining:t.failedTop?[]:[...t.rest,...t.remaining],protected:t.protected});break;}if(list.length===1)put(s,{...t,op:'g10_Enter',uid:list[0].uid});else choice(s,t,'次に出すクリーチャーを選ぶ（登場順）',list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
 case'g10_Enter':{const x=own.deck.find(x=>x.uid===t.uid);if(!x||!canPut(s,t.p,x,'deck')){put(s,{...t,op:'g10_Next',remaining:t.remaining.filter(uid=>uid!==t.uid),rest:[...t.rest,t.uid]});break;}const c=card(x);if(c.evolution||c.neoEvolution)choice(s,t,'山札から出すクリーチャーの進化元を選ぶ',[...(c.neoEvolution?[opt('進化せずに出す',null,0)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId))]);else enterBatch(s,t);break;}
 case'g10_Order':{const remaining=t.remaining.filter(uid=>own.deck.some(x=>x.uid===uid));if(remaining.length<2){for(const uid of remaining){const x=remove(own.deck,uid);own.deck.push(x);}release(own,t.protected);break;}choice(s,{...t,remaining},'残りを山札の下へ置く順序を選ぶ',remaining.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g10_Cambiare':for(const x of creatures(s,1-t.p)){api.tap(s,1-t.p,x);x.skipUntap=true;}break;
 case'g10_Shield':choice(s,t,'シールド化する相手のエレメントを選ぶ',[...targetOptions(s,t.p,s.players[1-t.p].battle),skip()]);break;
 case'g10_Fight':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.isCreature(s,x))choice(s,t,'ガラワルドで相手とバトルしますか？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;}
 case'g10_Cougar':{const uids=protect(own,3);choice(s,{...t,uids},'上3枚からクリーチャーを1体手札に加える？ 残りはマナへ',[...uids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>card(x).type==='creature').map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;}
 case'g10_Mystery':{own.deck=api.shuffled(own.deck,Math.floor(api.random(s)*4294967296));const x=own.deck[0];if(!x){api.deckCheck(s,t.p);break;}api.log(s,t.p,'reveal','ミステリー・ディザスターで公開：'+card(x).name,{cardId:x.cardId});if(card(x).type==='creature'){if(canPut(s,t.p,x,'deck'))put(s,task('putCreature',t.p,t.source,{origin:'deck',uid:x.uid,deckCheck:true}));}else{own.deck.shift();const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);own[to].push(x);api.deckCheck(s,t.p);}break;}
 case'g10_Nicol':put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:7}));break;
 case'g10_Destroy':choice(s,t,'破壊する相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g10_BigBang':put(s,task('mill',t.p,t.source,{n:2}),task('draw',t.p,t.source,{n:2}));break;
 case'g10_Draws':if(t.n>0){if(own.deck.length||!deckSafe(s,t.p)){put(s,task('draw',t.p,t.source,{n:t.n}));break;}choice(s,t,'引くかわりに墓地のクリーチャーを出しますか？（残り'+t.n+'回）',[...own.grave.filter(x=>canPut(s,t.p,x,'grave')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);}break;
 case'g10_Bean':{const x=s.players[t.owner].battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetInc);if(x&&api.isCreature(s,x))move(s,[{player:t.owner,uid:x.uid,to:'mana'}]);break;}
 case'g10_Rice':put(s,task('g17_Ramp',t.p,t.source,{n:1}),task('g17_ReturnMana',t.p,t.source));break;
 case'g10_Guignol':choice(s,t,'グラン・ギニョールの効果を選ぶ',[opt('他のクリーチャーを1体手札に戻す','bounce',creatures(s,1-t.p).length?20:0),opt('上2枚を墓地に置き、その中から1枚まで手札に戻す','mill',10)]);break;
 case'g10_Bounce':choice(s,t,'手札に戻す他のクリーチャーを選ぶ',targetOptions(s,t.p,[...creatures(s,t.p).filter(x=>x.uid!==t.uid||(x.incarnation||0)!==t.incarnation),...creatures(s,1-t.p)]).map(x=>({...x,score:own.battle.some(y=>y.uid===x.value)?-10:x.score})));break;
 case'g10_GuignolMill':{const uids=[];for(let i=0;i<2&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,t.p);if(x){clear(x);own.grave.push(x);uids.push(x.uid);}api.deckCheck(s,t.p);}if(s.winner===null)choice(s,{...t,uids},'今墓地に置いたカードを1枚まで手札へ',[...own.grave.filter(x=>uids.includes(x.uid)).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;}
 case'g10_RevSummon':{const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&!own.shields.length&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:true})&&api.canCast(s,t.p,card(x)))api.cast(s,t.p,x.uid,true,null,0,null,'hand','革命0');break;}
 default:throw Error('未実装のガチロボ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g10_'))return false;const own=s.players[t.p];switch(t.op){
 case'g10_Select':if(v){const x=own.deck.find(x=>x.uid===v);put(s,{...t,selected:[...t.selected,v],budget:t.budget-cost(card(x))});}else put(s,{...t,op:'g10_Next',remaining:t.selected,rest:t.uids.filter(uid=>!t.selected.includes(uid)),protected:t.uids});break;
 case'g10_Next':put(s,{...t,op:'g10_Enter',uid:v});break;
 case'g10_Enter':enterBatch(s,t,v);break;
 case'g10_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v)});break;}
 case'g10_Shield':if(v)move(s,[{player:1-t.p,uid:v,to:'shields'}]);break;
 case'g10_Fight':if(v){const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation),y=s.players[1-t.p].battle.find(x=>x.uid===v);if(x&&y)api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);}break;
 case'g10_Cougar':{for(const uid of t.uids){const x=remove(own.deck,uid);if(!x)continue;const to=uid===v?'hand':api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);own[to].push(x);}release(own,t.uids);api.deckCheck(s,t.p);break;}
 case'g10_Draws':put(s,...(v?[task('putCreature',t.p,t.source,{origin:'grave',uid:v})]:[]),{...t,n:t.n-1});break;
 case'g10_Destroy':move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g10_Bounce':{const player=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(player>=0)move(s,[{player,uid:v,to:'hand'}]);break;}
 case'g10_Guignol':put(s,{...t,op:v==='bounce'?'g10_Bounce':'g10_GuignolMill'});break;
 case'g10_GuignolMill':if(v){const x=remove(own.grave,v);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g10_RevDeclare':{const row=s.g10RevDeclarations.shift();if(v){api.log(s,t.p,'revolutionZero','カンビアーレの革命0を使用宣言',{cardId:t.source});api.enqueue(s,t.p,{uid:row.uid,source:row.source,effect:'extended',task:task('g10_RevSummon',t.p,row.source,row)});}break;}
 default:throw Error('未実装のガチロボ選択：'+t.op);
 }return true;}
 const deckSafe=(s,p)=>creatures(s,p).some(x=>effective(x,s).bigBang);
 return {run,chosen,deckSafe,
 effect(s,p,c,uid,entry){const op={gachiRobo:'g10_Robo',gachiCambiare:'g10_Cambiare',gachiFight:'g10_Fight',gachiMystery:'g10_Mystery',gachiNicol:'g10_Nicol',gachiBigBang:'g10_BigBang',gachiMagrul:'g10_Magrul',gachiRice:'g10_Rice',gachiGuignol:'g10_Guignol'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0}));return true;},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.gachiAttack)on(s,p,x,c.gachiAttack);},
 battleWins(s,p,w){const x=w&&s.players[p].battle.find(x=>x.uid===w.uid),c=x&&effective(x,s);return c?.cougarWin?[{player:p,uid:x.uid,source:x.cardId,task:task('g10_Cougar',p,x.cardId)}]:c?.gachiWinDraw?[{player:p,uid:x.uid,source:x.cardId,task:task('optionalDrawOne',p,x.cardId)}]:[];},
 entry(s,p,x){if(!api.isCreature(s,x))return;const c=effective(x,s),entryText=c.justDiver||/(?:^|\n)このクリーチャー[がを](?:バトルゾーンに)?出(?:た|した)時/.test(String(c.text).split('\n【呪文面】')[0]);if(entryText)for(const y of creatures(s,1-p))if(effective(y,s).blackBean)on(s,1-p,y,'g10_Bean',{owner:p,target:x.uid,targetInc:x.incarnation||0});},
 shieldHand(s,p,x){if(card(x).revolutionZero&&!s.players[p].shields.length)(s.g10RevDeclarations??=[]).push({p,uid:x.uid,serial:x.zoneSerial||0,source:x.cardId});},
 shieldDeclarations(s){const rows=s.g10RevDeclarations;if(!rows?.length||s.decision)return false;const row=rows[0],x=s.players[row.p].hand.find(x=>x.uid===row.uid&&(x.zoneSerial||0)===row.serial);if(!x){rows.shift();return false;}choice(s,task('g10_RevDeclare',row.p,row.source,row),'カンビアーレの革命0を宣言しますか？',[opt('宣言する',true,30,x.cardId),skip()]);return true;},
 mainActions(s,p){const own=s.players[p],x=own.deck[0];if(p!==s.active||!x||card(x).type!=='creature'||!creatures(s,p).some(x=>effective(x,s).orochiTop)||!api.canEnter(s,p,card(x),{origin:'deck',execution:true})||!api.canCast(s,p,card(x))||card(x).evolution&&!api.evolutionBases(s,p,card(x)).length||!api.canPay(s,p,{...card(x),summonOrigin:'deck'}))return [];return [{kind:'play',uid:x.uid,cardId:x.cardId,origin:'deck',cost:api.summonCost(s,p,{...card(x),summonOrigin:'deck'}),label:'山札の上の'+card(x).name+'を召喚'}];},
 };
}
