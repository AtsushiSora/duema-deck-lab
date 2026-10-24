// Face-up shields use physical cards and stable shield groups, including stacked shields.
export function createShieldPhotoRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move,targetOptions}=api;
 const armored=c=>String(c.race).includes('アーマード'),dragon=c=>String(c.race).includes('ドラゴン'),ad=c=>String(c.race).includes('アーマード・ドラゴン');
 const shields=(s,p)=>Array.isArray(s.players[p].shields)?s.players[p].shields.flatMap(api.shieldCards):(s.players[p].publicShields||[]),up=(s,p)=>shields(s,p).filter(x=>x.faceUp),castles=(s,p,flag)=>up(s,p).filter(x=>card(x).gCastle&&card(x)[flag]);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g33_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const pool=(s,t)=>(t.ids||[]).map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 function look(s,t,n){if(api.deckLocked(s,t.p))return[];const own=s.players[t.p],protectedIds=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),xs=own.deck.filter(x=>!protectedIds.has(x.uid)).slice(0,n);own.g33Protected=[...(own.g33Protected||[]),...xs.map(x=>x.uid)];api.log(s,t.p,'look',card(t.source).name+'：山札の上'+xs.length+'枚を確認',{cardId:t.source});return xs.map(x=>x.uid);}
 function release(s,p,uid){s.players[p].g33Protected=(s.players[p].g33Protected||[]).filter(x=>x!==uid);}
 function addFace(s,p,x,fromDeck=false){if(!x)return;clear(x,'shields');if(fromDeck&&s.players.some(y=>y.battle.some(x=>effective(x,s).deckRedirect)))api.addZone(s,p,'grave',x);else{x.faceUp=true;api.addZone(s,p,'shields',x);api.notifyShieldAdded(s,p,x);api.log(s,p,'shieldAdd',card(x).name+'を表向きでシールド化',{cardId:x.cardId});}}
 function faceTop(s,p){addFace(s,p,api.takeTop(s,p),true);api.deckCheck(s,p);}
 function take(s,t,uid,to){const x=remove(s.players[t.p].deck,uid);release(s,t.p,uid);if(x){if(to==='shields')addFace(s,t.p,x,true);else{clear(x,to);api.addZone(s,t.p,to,x);}}return x;}
 function run(s,t){if(!t.op.startsWith('g33_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g33_FaceTop':faceTop(s,t.p);break;
 case'g33_Hikari':case'g33_Resolve':{const ids=look(s,t,t.op==='g33_Hikari'?2:3);if(ids.length)put(s,{...t,op:'g33_FacePick',ids,resolve:t.op==='g33_Resolve'});break;}
 case'g33_FacePick':choice(s,t,'表向きでシールド化する1枚を選ぶ',pool(s,t).map(x=>opt(card(x).name,x.uid,armored(card(x))?10:5,x.cardId)));break;
 case'g33_GravePick':choice(s,t,'墓地に置く1枚を選ぶ（そのコスト以下の相手を破壊）',pool(s,t).map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g33_Destroy':choice(s,t,'墓地に置いたカードのコスト以下の相手を1体破壊する',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(effective(x,s))<=t.max)));break;
 case'g33_Bounce':choice(s,t,'相手クリーチャーを1体、手札に戻す？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
 case'g33_Mirror':if(t.optional)choice(s,t,'山札の上1枚を表向きでシールドの上に置く？',[opt('置く',true,15),skip()]);else put(s,{...t,op:'g33_MirrorShield'});break;
 case'g33_MirrorShield':choice(s,t,'上にカードを置く自分のシールドを選ぶ',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,0)));break;
 case'g33_D4':choice(s,t,'見るシールドを選ぶ',[0,1].flatMap(p=>s.players[p].shields.map((x,i)=>opt((p===t.p?'自分':'相手')+'のシールド'+(i+1),{p,uid:x.uid},p===t.p?10:0))));if(!own.shields.length&&!opp.shields.length)api.draw(s,t.p,2);break;
 case'g33_D4Flip':{const root=api.findShield(s.players[t.owner],t.shield);if(root)choice(s,t,'見たシールドのカードを表向き・裏向きにする？',[...api.shieldCards(root).flatMap(x=>[opt(card(x).name+'を表向きにする',{uid:x.uid,faceUp:true},t.owner===t.p&&!x.faceUp?10:0,x.cardId),opt(card(x).name+'を裏向きにする',{uid:x.uid,faceUp:false},t.owner!==t.p&&x.faceUp?10:0,x.cardId)]),skip()]);else api.draw(s,t.p,2);break;}
 case'g33_Parfe':choice(s,t,'「あとはたのんだぞ」：効果を選ぶ',[opt('相手のコスト3以下をシールド化する','remove',creatures(s,1-t.p).some(x=>cost(effective(x,s))<=3)?25:0),opt('山札の上1枚を表向きでシールド化する','add',15)]);break;
 case'g33_ParfeRemove':choice(s,t,'シールド化する相手のコスト3以下を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(effective(x,s))<=3)));break;
 case'g33_Offer':{const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&own.mana.length>=2&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false}))choice(s,t,'パルフェ・ルピアを手札から出す？',[opt('出す',true,40,x.cardId),skip()]);break;}
 case'g33_TapLock':choice(s,t,'相手1体をタップし、次の自分のターンまでアンタップを封じる',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g33_Draw2':choice(s,t,'カードを2枚引く？',[opt('引く',true,own.deck.length>2?15:-100),skip()]);break;
 case'g33_Deka':{const ids=look(s,t,4);put(s,{...t,op:'g33_DekaPick',ids});break;}
 case'g33_DekaPick':choice(s,t,'ドラゴンまたはファイアー・バードを1枚、手札に加える？',[...pool(s,t).filter(x=>dragon(card(x))||String(card(x).race).includes('ファイアー・バード')).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;
 case'g33_Order':{const ids=pool(s,t).map(x=>x.uid);if(!ids.length){const tops=(t.top||[]).map(uid=>remove(own.deck,uid)).filter(Boolean),bottoms=(t.bottom||[]).map(uid=>remove(own.deck,uid)).filter(Boolean);for(const x of [...tops,...bottoms])release(s,t.p,x.uid);own.deck.unshift(...tops);own.deck.push(...bottoms);api.deckCheck(s,t.p);break;}choice(s,{...t,ids},'残りを山札の上・下へ、順に置く',[...pool(s,{...t,ids}).flatMap(x=>[opt(card(x).name+'を山札の上へ',{uid:x.uid,to:'top'},2,x.cardId),opt(card(x).name+'を山札の下へ',{uid:x.uid,to:'bottom'},1,x.cardId)])]);break;}
 case'g33_Charge':{const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),xs=own.hand.filter(x=>ad(card(x)));if(x&&xs.length)choice(s,t,'手札のアーマード・ドラゴン・カードを公開して、このマナをアンタップする？',[...xs.map(y=>opt(card(y).name,y.uid,10,y.cardId)),skip()]);break;}
 case'g33_Dogi':(s.extLimits??=[]).push({kind:'entryCost',player:1-t.p,max:7,expires:'end',who:s.active});break;
 case'g33_Final':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;(s.finalHistory??=[false,false])[t.p]=true;api.draw(s,t.p,1);put(s,{...t,op:'g33_FinalPick'});}break;
 case'g33_FinalPick':choice(s,t,'コスト6以下の多色カードを手札かマナから実行する？',[...['hand','mana'].flatMap(origin=>own[origin].flatMap(x=>faces(card(x)).flatMap((c,face)=>cost(c)<=6&&colors(c).length>1&&api.canCast(s,t.p,c,origin)&&(c.type!=='creature'||api.canEnter(s,t.p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,t.p,c).length))?[opt((origin==='hand'?'手札：':'マナ：')+c.name,{uid:x.uid,origin,face},20+cost(c),x.cardId)]:[]))),skip()]);break;
 case'g33_UntapDragons':for(const x of creatures(s,t.p))if(dragon(effective(x,s))&&api.canUntap(x))x.tapped=false;break;
 case'g33_UntapArmored':for(const x of creatures(s,t.p))if(armored(effective(x,s))&&api.canUntap(x))x.tapped=false;break;
 case'g33_Shachi':{const x=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetInc);if(x&&api.isCreature(s,x))move(s,[{player:t.p,uid:x.uid,to:'grave',by:1-t.p}]);break;}
 case'g33_Counter':{const pending=s.g33Executions?.find(x=>x.inst.uid===t.target),xs=up(s,t.p);if(pending&&(!pending.options.virtualArgs||api.canReplaceExecution(s,pending.p,pending.options.virtualArgs[0]))&&xs.length&&creatures(s,t.p).some(x=>effective(x,s).g33Hikari))choice(s,t,'「'+pending.c.name+'」の実行を、表向きシールド1枚を裏返して墓地に置き換える？',[...xs.map(x=>opt(card(x).name,x.uid,30,x.cardId)),skip()]);else finishExecution(s,t.target,null);break;}
 default:throw Error('未実装の表向きシールド効果：'+t.op);
 }return true;}
 function finishExecution(s,uid,shield){const i=s.g33Executions?.findIndex(x=>x.inst.uid===uid);if(i===undefined||i<0)return;const pending=s.g33Executions.splice(i,1)[0];if(shield){const x=up(s,1-pending.p).find(x=>x.uid===shield);if(x&&(!pending.options.virtualArgs||api.replaceExecutionCard(s,pending.p,pending.options.virtualArgs[0]))){x.faceUp=false;if(!pending.options.virtualArgs){clear(pending.inst,'grave');api.addZone(s,pending.inst.cardOwner??pending.p,'grave',pending.inst);}api.log(s,1-pending.p,'executeReplaced',pending.c.name+'の実行を置き換え、墓地に置いた',{cardId:pending.inst.cardId});return;}}if(pending.options.virtualArgs)api.castBattleSpell(s,pending.p,...pending.options.virtualArgs,true);else api.completeExecution(s,pending.p,pending.inst,pending.c,pending.options);}
 function chosen(s,t,v){if(!t.op.startsWith('g33_'))return false;const own=s.players[t.p];switch(t.op){
 case'g33_FacePick':{take(s,t,v,'shields');const ids=t.ids.filter(uid=>uid!==v);if(t.resolve&&ids.length)put(s,{...t,ids,op:'g33_GravePick'});else{for(const uid of ids)take(s,t,uid,'hand');api.deckCheck(s,t.p);}break;}
 case'g33_GravePick':{const x=take(s,t,v,'grave');for(const uid of t.ids.filter(uid=>uid!==v))take(s,t,uid,'hand');put(s,{...t,op:'g33_Destroy',max:x?Math.max(...faces(card(x)).map(cost)):0});api.deckCheck(s,t.p);break;}
 case'g33_Destroy':if(v)move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g33_Bounce':if(v)move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false}]);break;
 case'g33_Mirror':if(v)put(s,{...t,op:'g33_MirrorShield'});break;
 case'g33_MirrorShield':{const x=api.takeTop(s,t.p);if(x){clear(x,'shields');if(s.players.some(y=>y.battle.some(x=>effective(x,s).deckRedirect)))api.addZone(s,t.p,'grave',x);else api.addShieldCard(s,t.p,v,x);}api.deckCheck(s,t.p);break;}
 case'g33_D4':put(s,{...t,op:'g33_D4Flip',owner:v.p,shield:v.uid});break;
 case'g33_D4Flip':if(v){const x=shields(s,t.owner).find(x=>x.uid===v.uid);if(x)x.faceUp=v.faceUp;}api.draw(s,t.p,2);break;
 case'g33_Parfe':put(s,{...t,op:v==='add'?'g33_FaceTop':'g33_ParfeRemove'});break;
 case'g33_ParfeRemove':if(v)move(s,[{player:1-t.p,uid:v,to:'shields',destroy:false}]);break;
 case'g33_Offer':if(v){const x=remove(own.hand,t.uid);if(x)enter(s,t.p,x,null,{origin:'hand',execution:false});}break;
 case'g33_TapLock':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){api.tap(s,1-t.p,x);(x.tapLocks??=[]).push({who:t.p,afterTurns:own.turns});}break;}
 case'g33_Draw2':if(v)api.draw(s,t.p,2);break;
 case'g33_DekaPick':if(v)take(s,t,v,'hand');put(s,{...t,op:'g33_Order',ids:t.ids.filter(uid=>uid!==v),top:[],bottom:[]});break;
 case'g33_Order':put(s,{...t,ids:t.ids.filter(uid=>uid!==v.uid),[v.to]:[...(t[v.to]||[]),v.uid]});break;
 case'g33_Charge':if(v){const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),y=own.hand.find(x=>x.uid===v);if(x&&y){api.log(s,t.p,'reveal',card(y).name+'を公開',{cardId:y.cardId});if(api.canUntap(x))x.tapped=false;}}break;
 case'g33_FinalPick':if(v){const c=faces(card(own[v.origin].find(x=>x.uid===v.uid)))[v.face];if(c.evolution)put(s,task('putCreature',t.p,t.source,{uid:v.uid,origin:v.origin,execution:true,face:v.face}));else cast(s,t.p,v.uid,true,null,v.face,null,v.origin,'ファイナル革命');}break;
 case'g33_Counter':finishExecution(s,t.target,v);break;
 default:throw Error('未実装の表向きシールド選択：'+t.op);
 }return true;}
 return{run,chosen,up,
 effect(s,p,c,uid){const effects={shieldFaceTop:'FaceTop',shieldDogi:'Dogi',shieldResolve:'Resolve',shieldBounce:'Bounce',shieldMirror:'Mirror',shieldMirrorSpell:'Mirror',shieldD4:'D4',shieldParfe:'Parfe',shieldDeka:'Deka'};if(!effects[c.effect])return false;put(s,task('g33_'+effects[c.effect],p,c.id,{uid,optional:c.effect==='shieldMirror'}));return true;},
 discount(s,p,c){return c.type==='creature'&&up(s,p).length?c.g33FaceDiscount||0:0;},
 decorate(s,p,x,c){if(c.type==='creature'&&armored(c)&&castles(s,p,'g33Mai').length)c={...c,blocker:true,speedAttacker:true};if(c.type==='creature'&&colors(c).length>1&&s.players[p].battle.some(x=>!api.ignored(s,x)&&card(x).g33Dogi))c={...c,speedAttacker:true};return c;},
 beforeExecution(s,p,c,inst,options){if(c.type==='creature'||!up(s,1-p).length||!creatures(s,1-p).some(x=>effective(x,s).g33Hikari))return false;(s.g33Executions??=[]).push({p,c,inst,options});put(s,task('g33_Counter',1-p,c.id,{target:inst.uid}));return true;},
 guard(s,p,x){return ad(effective(x,s))&&creatures(s,p).some(y=>effective(y,s).g33Kaku);},
 shieldAdded(s,p,x){if(!x.faceUp)return;for(const y of s.players[p].hand)if(card(y).g33Parfe&&s.players[p].mana.length>=2)on(s,p,y,'Offer',{serial:y.zoneSerial||0});},
 shieldLeft(s,p,x){if(x.faceUp&&card(x).g33Mai)on(s,p,x,'FaceTop');},
 entry(s,p,x,options){if(!api.isCreature(s,x))return;const c=effective(x,s);if(!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,x)){if(c.g33Hikari&&options.revolution)on(s,p,x,'Hikari');if(c.g33Dogi&&options.revolution)on(s,p,x,'Final');}if(ad(c))for(const y of creatures(s,p))if(effective(y,s).g33Golgini&&(y.uid!==x.uid||!options.selfMuted&&!api.selfStopped(s,p)))on(s,p,y,'TapLock');for(const castle of castles(s,1-p,'g33Shachi'))if(cost(c)>s.players[p].mana.length)on(s,1-p,castle,'Shachi',{p,target:x.uid,targetInc:x.incarnation||0,controller:1-p});},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.g33Hikari)on(s,p,x,'Hikari');if(c.g33Golgini)on(s,p,x,'Draw2');},
 snapshot(s){return[0,1].flatMap(p=>creatures(s,p).filter(x=>effective(x,s).g33Deka).map(x=>({p,uid:x.uid,source:x.cardId})));},
 leaving(s,p,x,snapshot,to,destroy){if(destroy&&to==='grave'&&snapshot?.some(y=>y.uid===x.uid&&y.p===p))on(s,p,x,'UntapDragons');},
 handMana(s,p,x){if(card(x).g33ChargeReveal)on(s,p,x,'Charge',{serial:x.zoneSerial||0});},
 end(s){return[0,1].flatMap(p=>castles(s,p,'g33Mai').map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g33_UntapArmored',p,x.cardId)})));},
 };
}
