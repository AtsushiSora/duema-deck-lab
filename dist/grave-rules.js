// No.24: physical grave evolution, ordered under-card replacements, and entry events.
export function createGraveRules(api){
 const {card,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move}=api;
 const graveCreatures=(s,p)=>s.players[p].grave.filter(x=>card(x).type==='creature'),below=x=>api.layers(x).slice(1);
 const live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)&&(t.serial===undefined||(y.zoneSerial||0)===t.serial)));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,serial:x.zoneSerial||0,...more})});
 function detach(s,p,top,uid,to){const parent=api.layers(top).find(x=>x.under?.some(y=>y.uid===uid));if(!parent)return null;const i=parent.under.findIndex(x=>x.uid===uid),x=parent.under[i];parent.under.splice(i,1,...(x.under||[]));clear(x,to);api.addZone(s,s.players[p],to,x);return x;}
 function beginCast(s,p,args){put(s,task('g24_Bases',p,card(s.players[p][args[5]].find(x=>x.uid===args[0])).id,{uid:args[0],mode:'cast',args,selected:args[2]?[args[2]]:[]}));}
 function beginPut(s,p,x,base,options){(s.players[p].g24Holding??=[]).push(x);put(s,task('g24_Bases',p,x.cardId,{uid:x.uid,mode:'put',options,selected:base?[base]:[]}));}
 function baseCard(s,t,n){return {...card(t.source),graveBaseCount:n,summonOrigin:t.mode==='cast'?t.args[5]:t.options.origin};}
 function beginUra(s,p,uid,mode='loss',selected=[]){const x=s.players[p].battle.find(x=>x.uid===uid);choice(s,task('g24_UraReplace',p,x.cardId,{uid,mode,selected}),'ウラギリダムス：山札の下へ戻す5枚を順に選ぶ（'+selected.length+'/5）',[...below(x).filter(y=>!selected.includes(y.uid)).map(y=>opt(card(y).name,y.uid,10,y.cardId)),opt('選び直す',null,-100)]);}
 function run(s,t){if(!t.op.startsWith('g24_'))return false;const own=s.players[t.p];switch(t.op){
 case'g24_Bases':{const candidates=graveCreatures(s,t.p).filter(x=>x.uid!==t.uid&&(!t.options?.graveCandidates||t.options.graveCandidates.includes(x.uid))),list=t.mode==='put'&&t.selected.length>=candidates.length-(t.options.graveReserve||0)?[]:candidates.filter(x=>!t.selected.includes(x.uid)),valid=t.selected.length&&t.selected.every(uid=>own.grave.some(x=>x.uid===uid)),payable=t.mode==='put'||t.args[1]||api.canPay(s,t.p,baseCard(s,t,t.selected.length));choice(s,t,'超無限墓地進化：進化元を選ぶ（'+t.selected.length+'枚・'+api.summonCost(s,t.p,baseCard(s,t,t.selected.length))+'マナ）',[...list.map(x=>opt(card(x).name,x.uid,5,x.cardId)),...(valid&&payable?[opt('この進化元で出す',false,25,t.source)]:[]),...(t.selected.length?[opt('進化元を選び直す','reset',-100)]:[]),...(t.mode==='cast'&&!t.args[1]?[opt('召喚をやめる',null,-100)]:[])]);break;}
 case'g24_Meteor':{const x=live(s,t);if(x)choice(s,t,'メテオバーン：下のカード1枚を墓地に置く？',[...below(x).map(y=>opt(card(y).name,y.uid,20+cost(card(y)),y.cardId)),skip()]);break;}
 case'g24_DoomRevive':choice(s,t,'進化ではないクリーチャーを1体、墓地から出す',graveCreatures(s,t.p).filter(x=>!card(x).evolution&&!card(x).sMax&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false})).map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)));break;
 case'g24_Minus':{const amount=t.byGrave?graveCreatures(s,t.p).length*1000:t.amount;choice(s,{...t,amount},'相手1体のパワーを−'+amount+'する',api.targetOptions(s,t.p,creatures(s,1-t.p)));break;}
 case'g24_GT':{const rows=[0,1].flatMap(player=>creatures(s,player).filter(x=>card(x).psychic).map(x=>({player,uid:x.uid,to:'grave'})));put(s,task('g24_GTSmall',t.p,t.source));if(rows.length)move(s,rows);break;}
 case'g24_GTSmall':{const rows=[0,1].flatMap(player=>creatures(s,player).filter(x=>api.power(x,x.uid===s.attack?.attacker,s)<=5000).map(x=>({player,uid:x.uid,to:'grave'})));if(rows.length)move(s,rows);break;}
 case'g24_Kaibyaku':put(s,task('mill',t.p,t.source,{n:3}),task('g24_GraveHand',t.p,t.source));break;
 case'g24_GraveHand':choice(s,t,'墓地からクリーチャー1体を手札に戻す',graveCreatures(s,t.p).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;
 case'g24_Ura':{const x=live(s,t);if(!x||graveCreatures(s,t.p).length<5)break;const selected=t.selected||[];choice(s,{...t,selected},'ウラギリダムスの下に置く5体を順に選ぶ（'+selected.length+'/5）',[...graveCreatures(s,t.p).filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,20-cost(card(x)),x.cardId)),skip()]);break;}
 case'g24_Abaku':put(s,task('mill',t.p,t.source,{n:5}),task('g24_DestroySelf',t.p,t.source,{uid:t.uid,incarnation:t.incarnation}));break;
 case'g24_DestroySelf':{const x=live(s,t);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave'}]);break;}
 case'g24_Loot':choice(s,t,'手札1枚を捨てて2枚引く？',[...own.hand.map(x=>opt(card(x).name,x.uid,own.deck.length>2?10-cost(card(x))*.1:-100,x.cardId)),skip()]);break;
 case'g24_Timp':{const x=live(s,t);if(x)choice(s,t,'シンバリーを破壊して相手にも1体破壊させる？',[opt('破壊する',true,creatures(s,1-t.p).length?20:-10),skip()]);break;}
 case'g24_TimpAfter':put(s,task('g24_EnemySacrifice',1-t.p,t.source));break;
 case'g24_EnemySacrifice':choice(s,t,'自分のクリーチャー1体を選び、破壊する',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;
 default:throw Error('未実装の墓地ソース効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g24_'))return false;const own=s.players[t.p];switch(t.op){
 case'g24_Bases':if(v==='reset')put(s,{...t,selected:[]});else if(v)put(s,{...t,selected:[...t.selected,v]});else if(v===false){if(t.mode==='cast'){const a=[...t.args];a[2]=t.selected;a[4]={...(typeof a[4]==='object'&&a[4]||{}),graveBaseCount:t.selected.length};cast(s,t.p,...a);}else{const x=remove(own.g24Holding,t.uid);if(x)enter(s,t.p,x,t.selected,t.options);}}break;
 case'g24_Meteor':if(v){const x=live(s,t);if(x&&detach(s,t.p,x,v,'grave'))put(s,task('g24_Minus',t.p,t.source,{amount:9000}),task('g24_DoomRevive',t.p,t.source));}break;
 case'g24_DoomRevive':{const x=remove(own.grave,v);if(x)enter(s,t.p,x,null,{origin:'grave',execution:false});break;}
 case'g24_Minus':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-t.amount,expires:'end',who:s.active,...(t.spellCost===undefined?{}:{spellCost:t.spellCost})});break;}
 case'g24_GraveHand':{const x=remove(own.grave,v);if(x){clear(x,'hand');own.hand.push(x);}break;}
 case'g24_Ura':if(v){const selected=[...t.selected,v],x=live(s,t);if(selected.length<5)put(s,{...t,selected});else if(x&&selected.every(uid=>own.grave.some(y=>y.uid===uid))){for(const uid of selected){const y=remove(own.grave,uid);clear(y,'battle');(x.under??=[]).push(y);}put(s,task('destroyCost',t.p,t.source,{max:Number.MAX_SAFE_INTEGER,optional:false}));}}break;
 case'g24_UraReplace':{if(!v){beginUra(s,t.p,t.uid,t.mode);break;}const selected=[...t.selected,v];if(selected.length<5){beginUra(s,t.p,t.uid,t.mode,selected);break;}const x=own.battle.find(x=>x.uid===t.uid);for(const uid of selected)detach(s,t.p,x,uid,'deck');api.log(s,t.p,'uraReplace','下のカード5枚を山札の下に置き、'+(t.mode==='loss'?'敗北':'離脱')+'を置換',{cardId:t.source});if(t.mode==='loss')api.completeLossReplacement(s,'ウラギリダムス：下の5枚を山札に戻して敗北を置換');else s.leaving.rows.find(x=>x.player===t.p&&x.uid===t.uid).plan={kind:'ura'};break;}
 case'g24_Loot':if(v)put(s,task('discardChosen',t.p,t.source,{n:1,causedBy:t.p,uid:v}),task('draw',t.p,t.source,{n:2}));break;
 case'g24_Timp':if(v){const x=live(s,t);if(x){put(s,task('g24_TimpAfter',t.p,t.source,{destroyed:x.uid,serial:x.zoneSerial||0}));move(s,[{player:t.p,uid:x.uid,to:'grave'}]);}}break;
 case'g24_EnemySacrifice':move(s,[{player:t.p,uid:v,to:'grave'}]);break;
 default:throw Error('未実装の墓地ソース選択：'+t.op);
 }return true;}
 return{run,chosen,beginCast,beginPut,beginUra,below,
 effect(s,p,c,uid,entry){const op={graveGT:'GT',graveObuza:'Minus',graveKaibyaku:'Kaibyaku',graveUra:'Ura',graveAbaku:'Abaku',graveLoot:'Loot'}[c.effect];if(c.effect==='graveDoor'||c.effect==='graveMinus4'){put(s,...Array.from({length:c.effect==='graveDoor'?2:1},()=>task('g24_Minus',p,c.id,{amount:4000,...(c.type==='spell'?{spellCost:c.cost}:{})})));return true;}if(!op)return false;put(s,task('g24_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0,...(c.effect==='graveObuza'?{byGrave:true}:{})}));return true;},
 entry(s,p,x){if(!api.isCreature(s,x))return;for(const y of creatures(s,p)){const c=effective(y,s);if(c.secondEntrySacrifice&&s.players[p].enteredThisTurn===2)on(s,p,y,'g24_Timp');if(c.entryDiscardOther&&y.uid!==x.uid)api.enqueue(s,p,{uid:y.uid,source:y.cardId,effect:'extended',task:task('discard',1-p,y.cardId,{n:1,causedBy:p})});}},
 attack(s,p,x){if(effective(x,s).meteorDoom&&!api.selfStopped(s,p))on(s,p,x,'g24_Meteor');},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).uraGuard).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g24_Ura',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 lossOptions(s,p){return creatures(s,p).filter(x=>effective(x,s).uraGuard&&below(x).length>=5).map(x=>opt(card(x).name+'：下の5枚を山札へ戻して敗北を回避',{kind:'ura',uid:x.uid},60,x.cardId));},
 };
}
