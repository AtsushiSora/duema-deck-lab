import {policyRemove,policyLook} from './champion-zone-policy.js';
// Physical multi-base evolution and Phoenix effects. All choices survive JSON round-trips.
export function createPhoenixRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter,cast,targetOptions}=api;
 const phoenix=c=>String(c.race).includes('フェニックス');
 const live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g31_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const poppo=(s,p)=>creatures(s,p).some(x=>effective(x,s).g31Poppo);
 const complex=(s,p,c,options={})=>!!c.g31Evolution||!!c.evolution&&phoenix(c)&&options.execution!==false&&poppo(s,p);
 const definition=c=>c.g31Evolution||{zone:'battle',conditions:[c.evolution]};
 function candidates(s,p,c,options={}){const d=definition(c),zones=d.zone==='grave'?['grave']:d.zone==='deck'?[]:options.execution!==false&&phoenix(c)&&poppo(s,p)?['battle','grave']:['battle'];return zones.filter(zone=>api.canMoveZone(s,p,zone)).flatMap(zone=>s.players[p][zone].filter(x=>zone==='grave'?card(x).type==='creature':api.isCreature(s,x)).map(x=>({x,zone})));}
 const matches=(s,x,condition)=>condition.creature||api.matchesEvolution(x,condition,s);
 function completions(s,p,c,selected=[],options={}){const d=definition(c);if(d.zone==='deck')return s.players[p].deck.length>0;const pool=candidates(s,p,c,options).filter(r=>r.x.uid!==options.exclude).sort((a,b)=>Number(selected.includes(b.x.uid))-Number(selected.includes(a.x.uid)));if(d.variable)return selected.length>0&&new Set(selected).size===selected.length&&selected.every(uid=>pool.some(r=>r.x.uid===uid&&matches(s,r.x,d.conditions[0])));if(selected.length>d.conditions.length||new Set(selected).size!==selected.length||selected.some(uid=>!pool.some(r=>r.x.uid===uid)))return false;function visit(i,used){if(i===d.conditions.length)return selected.every(uid=>used.includes(uid));return pool.some(r=>!used.includes(r.x.uid)&&matches(s,r.x,d.conditions[i])&&visit(i+1,[...used,r.x.uid]));}return visit(0,[]);}
 function bases(s,p,c,options={}){if(!definition(c).variable&&!completions(s,p,c,[],options))return[];if(definition(c).zone==='deck')return s.players[p].deck.slice(0,3);return candidates(s,p,c,options).filter(r=>completions(s,p,c,[r.x.uid],options)).map(r=>r.x);}
 function beginCast(s,p,args){const x=s.players[p][args[5]].find(x=>x.uid===args[0]);put(s,task('g31_Bases',p,x.cardId,{uid:x.uid,mode:'cast',args,selected:[]}));}
 function beginPut(s,p,x,base,options){(s.players[p].g31Holding??=[]).push(x);put(s,task('g31_Bases',p,x.cardId,{uid:x.uid,mode:'put',options,selected:[]}));}
 function finishBases(s,t){const own=s.players[t.p];if(t.mode==='cast'){const a=[...t.args];a[2]=t.selected;cast(s,t.p,...a);}else{const x=remove(own.g31Holding,t.uid);if(x)enter(s,t.p,x,t.selected,t.options);}}
 function attach(s,p,x,ids,options={}){const c=card(x),d=definition(c),own=s.players[p];if(options.g31Force){const b=own.battle.find(y=>y.uid===ids);if(!b)throw Error('強制進化元がありません');ids=[ids];}
 if(d.zone==='deck'&&!options.g31Force){x.under=[];for(let i=0;i<d.count;i++){const y=api.takeTop(s,p);if(!y)break;y.faceDown=true;x.under.push(y);}api.deckCheck(s,p);return;}
 const rows=ids.map(uid=>{for(const zone of ['battle','grave']){const y=own[zone].find(y=>y.uid===uid);if(y)return{x:y,zone};}return null;});if(!options.g31Force&&(!completions(s,p,c,ids,{...options,exclude:x.uid})||!d.variable&&ids.length!==d.conditions.length)||rows.some(r=>!r)||new Set(ids).size!==ids.length)throw Error('進化元が正しくありません');x.under=rows.map(r=>r.x);
 const field=rows.filter(r=>r.zone==='battle').map(r=>r.x);for(const b of field){api.evolutionBase(s,p,b);api.inherit(s,b,x);if(s.attack?.attacker===b.uid)s.attack.attacker=x.uid;if(s.attack?.target===b.uid)s.attack.target=x.uid;}
 x.tapped=x.tapped||field.some(b=>b.tapped);x.buff=field.reduce((n,b)=>n+(b.buff||0),0);x.powerModifiers=field.flatMap(b=>structuredClone(b.powerModifiers||[]));x.tapLocks=field.flatMap(b=>b.tapLocks||[]);x.unblocked=field.some(b=>b.unblocked);x.buffSources=field.flatMap(b=>structuredClone(b.buffSources||[]));for(const key of ['justDiverActive','skipUntap','g19Protected'])if(field.some(b=>b[key]))x[key]=true;if(field.some(b=>b.gospelSpeed===s.turn))x.gospelSpeed=s.turn;for(const b of field)if(b.g19Blocker!==undefined)x.g19Blocker=b.g19Blocker;for(const r of rows){remove(own[r.zone],r.x.uid);if(r.zone==='grave')clear(r.x,'battle');}api.log(s,p,'evolve',rows.length+'体から'+c.name+'へ進化',{cardId:c.id});
 }
 function detach(s,p,x,uid){const parent=api.layers(x).find(y=>y.under?.some(z=>z.uid===uid));if(!parent)return false;const y=remove(parent.under,uid);parent.under.push(...(y.under||[]));clear(y,'grave');api.addZone(s,s.players[p],'grave',y);return true;}
 function marsCount(s,p){const fits=c=>/ファイアー・バード|フェニックス/.test(String(c.race));return s.players[p].mana.filter(x=>!x.faceDown&&faces(card(x)).some(fits)).length+s.players[p].battle.filter(x=>!x.sealed&&['creature','seed','gear','field','aura'].includes(card(x).type)&&fits(effective(x,s))).length;}
 function marsActions(s,p){return marsCount(s,p)>=5?s.players[p].hand.filter(x=>card(x).g213Mars&&bases(s,p,card(x)).length&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})&&api.canPay(s,p,{...card(x),cost:3,printedCost:5,civilizations:['火']})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,{...card(x),cost:3,printedCost:5,civilizations:['火']}),alternative:'phoenixMars',label:card(x).name+'を代替コスト（火を含む3マナ・軽減可）で召喚'})):[];}
 function run(s,t){if(!t.op.startsWith('g31_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g31_MarsOffer':{const x=live(s,t);if(x&&api.layers(x).length>1)choice(s,t,'メテオバーン：相手に進化元を1枚選ばせて墓地に置く？',[opt('使う（火のクリーチャーなら墓地から出す）',true,20),skip()]);break;}
 case'g31_MarsPick':{const x=live(s,{...t,p:t.owner}),rows=x?api.layers(x).slice(1):[];if(rows.length)choice(s,t,'相手の進化元を1枚選ぶ（裏向きの内容は非公開）',rows.map((y,i)=>opt(y.faceDown?'裏向きの進化元 '+(i+1):card(y).name,y.uid,y.faceDown?0:card(y).type==='creature'&&colors(card(y)).includes('火')?-10:10,y.faceDown?null:y.cardId)));break;}
 case'g31_MarsRevive':{const x=own.grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(x&&card(x).type==='creature'&&colors(card(x)).includes('火'))put(s,task('g34_Put',t.p,t.source,{origin:'grave',owner:t.p,target:x.uid,execution:false,controller:t.p}));break;}
 case'g31_Reduce':{const x=own[t.args[5]].find(x=>x.uid===t.args[0]);if(x){const c=card(x),max=(s.g31Discounts||[]).filter(d=>d.p===t.p&&d.turn===s.turn).length*4;choice(s,t,'鬼寄せの術：召喚コストをいくつ少なくする？',Array.from({length:max+1},(_,n)=>n).filter(n=>api.canPay(s,t.p,{...c,g31Reduction:n})).map(n=>opt(n+'少なくする',n,n)));}break;}
 case'g31_Bases':{const c=card(t.source),d=definition(c),options={...(t.options||{}),exclude:t.uid},n=d.conditions?.length;if(d.zone==='deck'||!d.variable&&t.selected.length===n){finishBases(s,t);break;}const list=candidates(s,t.p,c,options).filter(r=>!t.selected.includes(r.x.uid)&&completions(s,t.p,c,[...t.selected,r.x.uid],options));if(!list.length&&d.variable&&t.selected.length){finishBases(s,t);break;}if(!list.length){if(t.mode==='put'){const x=remove(own.g31Holding,t.uid);if(x){clear(x,'grave');api.addZone(s,own,'grave',x);}}break;}choice(s,t,'進化元を順に選ぶ（'+t.selected.length+'/'+(d.variable?'好きな数':n)+'）',[...list.map(r=>opt(card(r.x).name+(r.zone==='grave'?'（墓地）':'（場）'),r.x.uid,30-cost(card(r.x)),r.x.cardId)),...(d.variable&&t.selected.length?[opt('確定する',null,0)]:[])]);break;}
 case'g31_ZeroLeave':put(s,task('discard',1-t.p,t.source,{n:2,causedBy:t.p}),task('g31_ManaTrash',t.p,t.source,{max:2,optional:true}));break;
 case'g31_Fel':put(s,task('g31_Sacrifice',t.p,t.source,{n:2,selected:[],after:[task('discard',1-t.p,t.source,{n:2,causedBy:t.p})]}));break;
 case'g31_Sacrifice':{const list=creatures(s,t.p).filter(x=>!t.selected.includes(x.uid));if(t.selected.length<t.n&&list.length)choice(s,t,'破壊する自分のクリーチャーを選ぶ（'+t.selected.length+'/'+t.n+'）',list.map(x=>opt(card(x).name,x.uid,-cost(card(x))+(effective(x,s).exLife?20:0),x.cardId)));else{put(s,...(t.after||[]));if(t.selected.length)move(s,t.selected.map(uid=>({player:t.p,uid,to:'grave'})));}break;}
 case'g31_Gate':{const list=api.deckLocked(s,t.p)?[]:policyLook(s,t.p,3,own.deck,api),n=list.filter(x=>phoenix(card(x))).length;api.log(s,t.p,'reveal',list.map(x=>card(x).name).join(' / '),{cardId:t.source});put(s,...Array.from({length:n},()=>task('g5ExtraTurn',t.p,t.source)));break;}
 case'g31_Reverse':choice(s,t,'山札の上3枚を墓地に置く？',[opt('3枚置き、相手1体を破壊する',true,own.deck.length>3?30:-100),skip()]);break;
 case'g31_Abu':put(s,task('mill',t.p,t.source,{n:2}),task('g31_DestroySmall',t.p,t.source));break;
 case'g31_DestroySmall':choice(s,t,'墓地の枚数よりコストが小さい相手を破壊する',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(card(x))<own.grave.length)));break;
 case'g31_Recover':put(s,task('mill',t.p,t.source,{n:1}),task('g31_RecoverPick',t.p,t.source));break;
 case'g31_RecoverPick':choice(s,t,'墓地のフェニックス・カードを1枚戻す？',[...own.grave.filter(x=>faces(card(x)).some(phoenix)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g31_Loot':put(s,task('discard',t.p,t.source,{n:1,causedBy:t.p}),task('draw',t.p,t.source,{n:2}));break;
 case'g31_Reload':choice(s,t,'手札を1枚捨てて1枚引く？',[...own.hand.map(x=>opt(card(x).name,x.uid,10-cost(card(x))*.1,x.cardId)),skip()]);break;
 case'g31_Mill':choice(s,t,'山札の上3枚を墓地に置く？',[opt('3枚置く',true,own.deck.length>3?20:-100),skip()]);break;
 case'g31_Heavy':choice(s,t,'自分の1体を破壊して1枚引き、相手にも1体破壊させる？',[...creatures(s,t.p).map(x=>opt(card(x).name,x.uid,creatures(s,1-t.p).length?30-cost(card(x)):-20,x.cardId)),skip()]);break;
 case'g31_Metal':choice(s,t,'相手のマナ1枚と、クリーチャーでない場のカード1枚を破壊する？',[opt('使う',true,opp.mana.length||opp.battle.some(x=>!api.isCreature(s,x))?30:0),skip()]);break;
 case'g31_ManaTrash':{const selected=t.selected||[];if(selected.length===t.max||!opp.mana.some(x=>!selected.includes(x.uid))){for(const uid of selected){const x=policyRemove(s,1-t.p,'mana',uid,api);if(x){clear(x,'grave');api.addZone(s,opp,'grave',x);}}break;}choice(s,{...t,selected},'墓地に置く相手のマナを選ぶ',[...opp.mana.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,20,x.cardId)),...(t.optional?[opt('この内容で確定',null,0)]:[])]);break;}
 case'g31_NonCreature':choice(s,t,'相手のクリーチャーでないカードを破壊する',targetOptions(s,t.p,opp.battle.filter(x=>!api.isCreature(s,x))));break;
 case'g31_Oni':choice(s,t,'手札に戻す自分のシールドを選ぶ',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)));if(!own.shields.length)put(s,task('g31_OniDiscount',t.p,t.source));break;
 case'g31_OniDiscount':(s.g31Discounts??=[]).push({p:t.p,turn:s.turn,source:t.source});break;
 case'g31_Meteor':{const x=live(s,t),list=x&&api.layers(x).slice(1);if(list?.length)choice(s,t,'メテオバーン：下のカードを'+(t.kind==='apollo'?'好きな枚数':'1枚')+'墓地に置く？',[...list.map(y=>opt(y.faceDown?'裏向きの進化元':card(y).name,y.uid,t.kind==='apollo'?(t.count?5:30):30,y.faceDown?null:y.cardId)),opt('この内容で進む',null,t.count?20:0)]);else if(t.kind==='apollo'&&t.count)apolloMinus(s,t);break;}
 case'g31_GodRevive':choice(s,t,'龍神ヘヴィか龍神メタルを墓地から出す',own.grave.filter(x=>['龍神ヘヴィ','龍神メタル'].includes(card(x).name)&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false})).map(x=>opt(card(x).name,x.uid,30,x.cardId)));break;
 case'g31_ApolloShields':{const selected=t.selected||[],n=Math.min(2,opp.shields.length);if(selected.length===n){for(const uid of selected)api.moveShield(s,1-t.p,uid,'grave',{replacement:true});break;}choice(s,{...t,selected},'墓地に置く相手のシールドを2つ選ぶ',opp.shields.filter(x=>!selected.includes(x.uid)).map((x,i)=>opt('シールド'+(opp.shields.indexOf(x)+1),x.uid,20)));break;}
 case'g31_Xeno':{const x=live(s,t);if(x)choice(s,t,'進化フェニックスをこのクリーチャーの上に置く？',[...own.hand.filter(y=>card(y).evolution&&phoenix(card(y))&&cost(card(y))<=7&&api.canEnter(s,t.p,card(y),{origin:'hand',execution:false})).map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)),skip()]);break;}
 case'g31_XenoReturn':{const x=own.grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&own.grave.filter(y=>faces(card(y)).some(phoenix)).length>=2)choice(s,t,'ゼノバース・ラピアを墓地から手札へ戻す？',[opt('戻す',true,30,x.cardId),skip()]);break;}
 case'g31_XenoEnd':{const x=live(s,t);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave'}]);break;}
 case'g31_Link':{const x=own.g31Holding.find(x=>x.uid===t.uid);if(x)choice(s,t,'ゴッドをG・リンクして出す？',[...linkCandidates(s,t.p,card(x)).map(y=>opt(card(y).name+'とリンク',y.uid,40,y.cardId)),skip()]);break;}
 default:throw Error('未実装のフェニックス効果：'+t.op);
 }return true;}
 function apolloMinus(s,t){for(const x of creatures(s,1-t.p))(x.powerModifiers??=[]).push({amount:-4000*t.count,expires:'end',who:s.active});}
 function chosen(s,t,v){if(!t.op.startsWith('g31_'))return false;const own=s.players[t.p];switch(t.op){
 case'g31_MarsOffer':if(v)put(s,task('g31_MarsPick',1-t.p,t.source,{owner:t.p,uid:t.uid,incarnation:t.incarnation,controller:t.p}));break;
 case'g31_MarsPick':{const x=live(s,{...t,p:t.owner}),under=x&&api.layers(x).slice(1).find(y=>y.uid===v);if(under){const serial=(under.zoneSerial||0)+1;api.moveBattleCard(s,t.owner,under.uid,'grave',{controller:t.owner});put(s,task('g31_MarsRevive',t.owner,t.source,{target:under.uid,serial,controller:t.owner}));}break;}

 case'g31_Reduce':{const a=[...t.args];a[4]={...(a[4]||{}),g31Reduction:v};cast(s,t.p,...a);break;}
 case'g31_Bases':if(v)put(s,{...t,selected:[...t.selected,v]});else finishBases(s,t);break;
 case'g31_Sacrifice':put(s,{...t,selected:[...t.selected,v]});break;
 case'g31_Reverse':if(v)put(s,task('mill',t.p,t.source,{n:3}),task('g31_DestroySmall',t.p,t.source));break;
 case'g31_DestroySmall':case'g31_NonCreature':if(v)move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g31_RecoverPick':if(v){const x=policyRemove(s,t.p,'grave',v,api);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g31_Reload':if(v)put(s,task('discardChosen',t.p,t.source,{n:1,causedBy:t.p,uid:v}),task('draw',t.p,t.source,{n:1}));break;
 case'g31_Mill':if(v)put(s,task('mill',t.p,t.source,{n:3}));break;
 case'g31_Heavy':if(v){put(s,task('draw',t.p,t.source,{n:1}),task('g24_EnemySacrifice',1-t.p,t.source));move(s,[{player:t.p,uid:v,to:'grave'}]);}break;
 case'g31_Metal':if(v)put(s,task('g31_ManaTrash',t.p,t.source,{max:1}),task('g31_NonCreature',t.p,t.source));break;
 case'g31_ManaTrash':if(v)put(s,{...t,selected:[...t.selected,v]});else{for(const uid of t.selected){const x=policyRemove(s,1-t.p,'mana',uid,api);if(x){clear(x,'grave');api.addZone(s,s.players[1-t.p],'grave',x);}}}break;
 case'g31_Oni':api.moveShield(s,t.p,v,'hand',{replacement:true});put(s,task('g31_OniDiscount',t.p,t.source));break;
 case'g31_Meteor':{const x=live(s,t);if(!x)break;if(v&&detach(s,t.p,x,v)){if(t.kind==='apollo')put(s,{...t,count:(t.count||0)+1});else if(t.kind==='pluto')put(s,task('mill',t.p,t.source,{n:3}),task('destroyPower',t.p,t.source,{max:'∞'}));else put(s,task('g31_GodRevive',t.p,t.source));}else if(t.kind==='apollo'&&t.count)apolloMinus(s,t);break;}
 case'g31_GodRevive':{const x=policyRemove(s,t.p,'grave',v,api);if(x)enter(s,t.p,x,null,{origin:'grave',execution:false});break;}
 case'g31_ApolloShields':put(s,{...t,selected:[...t.selected,v]});break;
 case'g31_Xeno':if(v){const base=live(s,t),x=remove(own.hand,v);if(x&&base){enter(s,t.p,x,base.uid,{origin:'hand',execution:false,g31Force:true});const top=own.battle.find(y=>api.layers(y).some(z=>z.uid===x.uid));if(top)(top.g31EndDeath??=[]).push({turn:s.turn,uid:x.uid,incarnation:x.incarnation||0});}}break;
 case'g31_XenoReturn':if(v){const x=policyRemove(s,t.p,'grave',t.uid,api);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g31_Link':{const x=remove(own.g31Holding,t.uid);if(x)enter(s,t.p,x,t.base,{...t.options,g31Linked:true,g31Partner:v});break;}
 default:throw Error('未実装のフェニックス選択：'+t.op);
 }return true;}
 function linkCandidates(s,p,c){return creatures(s,p).filter(x=>!x.godLinks?.length&&((c.g31God==='left'&&card(x).g31God==='right')||(c.g31God==='right'&&card(x).g31God==='left')));}
 return{run,chosen,complex,bases,beginCast,beginPut,attach,
 beginPayment(s,p,args){const x=s.players[p][args[5]].find(x=>x.uid===args[0]),c=x&&faces(card(x))[args[3]];if(args[1]||args[4]!==null||c?.type!=='creature'||!colors(c).some(x=>['闇','火'].includes(x))||!(s.g31Discounts||[]).some(x=>x.p===p&&x.turn===s.turn)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return false;put(s,task('g31_Reduce',p,c.id,{args}));return true;},
 beginLink(s,p,x,base,options){if(!card(x).g31God||options.g31Linked||!linkCandidates(s,p,card(x)).length)return false;(s.players[p].g31Holding??=[]).push(x);put(s,task('g31_Link',p,x.cardId,{uid:x.uid,base,options}));return true;},
 link(s,p,x,options){if(!options.g31Partner)return x;const own=s.players[p],base=own.battle.find(y=>y.uid===options.g31Partner);if(!base||base.godLinks?.length)return x;remove(own.battle,x.uid);base.godLinks=[x];api.log(s,p,'godLink',card(base.cardId).name+'と'+card(x).name+'をG・リンク',{cardId:x.cardId});return base;},
 effect(s,p,c,uid,entry){if(!c.effect?.startsWith('phoenix'))return false;put(s,task('g31_'+c.effect.slice(7),p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.g213Mars)on(s,p,x,'MarsOffer');if(c.g31Apollo)on(s,p,x,'Meteor',{kind:'apollo',count:0});if(c.g31Pluto)on(s,p,x,'Meteor',{kind:'pluto'});if(c.g31Destroy)on(s,p,x,'Meteor',{kind:'destroy'});},
 snapshot(s,rows){return rows.map(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return{p:r.player,uid:r.uid,c:x&&effective(x,s)};});},
 leaving(s,p,x,snapshot,to,destroy){const c=snapshot?.find(r=>r.p===p&&r.uid===x.uid)?.c||effective(x,s);if(c.g31King)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('discard',1-p,x.cardId,{n:1,all:true,causedBy:p})});if(c.g31Zero)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g31_ZeroLeave',p,x.cardId)});if(c.g31Fel&&to==='grave'&&destroy&&!s.g31ExtraTurn)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g5ExtraTurn',p,x.cardId)});},
 start(s,p){return s.players[p].grave.filter(x=>card(x).g31Xeno).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g31_XenoReturn',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0})}));},
 end(s){return s.players.flatMap((own,p)=>own.battle.flatMap(x=>(x.g31EndDeath||[]).filter(e=>e.turn===s.turn).map(e=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g31_XenoEnd',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,turn:e.turn})}))));},
 selected(s,p,a,d){const value=a.kind==='extended'?d?.choices?.[a.choice]?.value:null,ids=new Set([...(a.targets||[]).map(t=>t.uid),...(['effect','fight','dragonTap'].includes(a.kind)?[a.target||a.uid]:[]),...(typeof value==='string'?[value]:value?.uid?[value.uid]:[])]);for(const x of s.players[1-p].battle)if(ids.has(x.uid)&&effective(x,s).g31Apollo)on(s,1-p,x,'ApolloShields');},
 discount(s,p,c){return c.type==='creature'&&colors(c).some(x=>['闇','火'].includes(x))?(c.g31Reduction??(s.g31Discounts||[]).filter(x=>x.p===p&&x.turn===s.turn).length*4):0;},
 summoned(s,p,x){if(colors(card(x)).some(c=>['闇','火'].includes(c)))s.g31Discounts=(s.g31Discounts||[]).filter(d=>d.p!==p||d.turn!==s.turn);},
 forceActions(s,p,out){const linked=creatures(s,1-p).filter(x=>x.godLinks?.length&&effective(x,s).g31GodHeavy);const forced=new Set(out.filter(a=>a.kind==='attack'&&linked.some(x=>a.target===x.uid)).map(a=>a.uid));return forced.size?out.filter(a=>a.kind!=='endTurn'&&(a.kind!=='attack'||!forced.has(a.uid)||linked.some(x=>a.target===x.uid))):out;},
 mainActions(s,p){const own=s.players[p],n=[...own.mana,...own.battle].filter(x=>/シノビ|フェニックス/.test(String(card(x).race))).length;const mars=marsActions(s,p);if(n<5)return mars;return [...mars,...own.hand.filter(x=>card(x).g31Pluto&&bases(s,p,card(x)).length&&api.canCast(s,p,card(x))&&api.canEnter(s,p,card(x))&&api.canPay(s,p,{...card(x),cost:2,fixedPayment:true,civilizations:['闇','闇'],printedCost:4})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,cost:2,alternative:'phoenixPluto',label:card(x).name+'を闇2マナで召喚'}))];},
 alternative(s,p,a){if(a.alternative==='phoenixMars'){cast(s,p,a.uid,false,null,0,{cost:3,printedCost:5,civilizations:['火']},'hand','代替コスト');return;}cast(s,p,a.uid,false,null,0,{cost:2,civilizations:['闇','闇'],fixedPayment:true},'hand','代替コスト');},
 };
}
