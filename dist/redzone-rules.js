// No.23: invasion declarations, sealed cards and the public extra-dimensional zone.
export function createRedzoneRules(api){
 const {card,cost,colors,effective,power,creatures,put,task,choice,opt,skip,remove,clear,move,draw,enqueue,log,targetOptions}=api;
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)&&!x.sealed);
 const matches=(s,a,c)=>api.isCreature(s,a)&&String(effective(a,s).race).includes('コマンド')&&colors(effective(a,s)).some(v=>c.invasion.colors.includes(v));
 const handRows=(s,p)=>s.players[p].hand.filter(x=>card(x).balchuris).map(x=>({uid:x.uid,source:x.cardId,origin:'hand',serial:x.zoneSerial||0,kind:'bal'}));
 function inherit(s,a,b){for(const k of['tapped','entered','buff','unblocked','tapLocks','buffSources','unblockSpellCost','powerModifiers','skipUntap','gospelSpeed','g19Protected','g19Blocker','justDiverActive'])if(a[k]!==undefined)b[k]=structuredClone(a[k]);api.inherit(s,a,b);}
 function invade(s,t){const own=s.players[t.p],x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),a=own.battle.find(x=>x.uid===s.attack?.attacker&&!x.sealed);if(!x||!a||x===a||!matches(s,a,card(x))||!api.evolutionBases(s,t.p,card(x)).some(x=>x.uid===a.uid))return;if(t.origin==='battle'){
  const index=own.battle.indexOf(x),[base,...rest]=x.under||[];if(base){if(rest.length)(base.under??=[]).push(...rest);inherit(s,x,base);own.battle[index]=base;}else own.battle.splice(index,1);delete x.under;remove(own.battle,a.uid);x.under=[a];inherit(s,a,x);own.battle.push(x);s.attack.attacker=x.uid;api.gearCleanup(s);
 }else if(api.canEnter(s,t.p,card(x),{origin:t.origin,execution:false})){remove(own[t.origin],x.uid);api.enter(s,t.p,x,a.uid,{origin:t.origin,execution:false});}log(s,t.p,'invasion',card(x).name+'を侵略で重ねる',{cardId:x.cardId});}
 function run(s,t){if(!t.op.startsWith('g23_'))return false;const own=s.players[t.p];switch(t.op){
 case'g23_Declare':{const row=t.remaining[0];if(!row){for(const r of t.declared)enqueue(s,t.p,{uid:r.uid,source:r.source,effect:'extended',task:task(r.kind==='bal'?'g23_BalWait':'g23_Invade',t.p,r.source,r)});break;}const x=own[row.origin].find(x=>x.uid===row.uid&&(x.zoneSerial||0)===row.serial&&!x.sealed);if(!x){put(s,{...t,remaining:t.remaining.slice(1)});break;}choice(s,t,card(row.source).name+'（'+({hand:'手札',grave:'墓地',battle:'場'}[row.origin])+'）を使用宣言しますか？',[opt('宣言する',true,row.kind==='bal'?35:45,row.source),skip()]);break;}
 case'g23_Invade':{const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial&&!x.sealed),a=own.battle.find(x=>x.uid===s.attack?.attacker&&!x.sealed);if(x&&a&&x!==a&&matches(s,a,card(x))&&api.evolutionBases(s,t.p,card(x)).some(x=>x.uid===a.uid)&&(t.origin==='battle'||api.canEnter(s,t.p,card(x),{origin:t.origin,execution:false})))choice(s,t,'宣言した侵略を実行しますか？',[opt('攻撃中のクリーチャーに重ねる',true,45,t.source),skip()]);break;}
 case'g23_Black':{const list=creatures(s,1-t.p);if(list.length){const min=Math.min(...list.map(x=>power(x,x.uid===s.attack?.attacker,s)));api.seal(s,1-t.p,list.filter(x=>power(x,x.uid===s.attack?.attacker,s)===min).map(x=>x.uid));}break;}
 case'g23_Max':{const list=creatures(s,1-t.p);if(list.length){const max=Math.max(...list.map(x=>power(x,x.uid===s.attack?.attacker,s)));move(s,list.filter(x=>power(x,x.uid===s.attack?.attacker,s)===max).map(x=>({player:1-t.p,uid:x.uid,to:'grave'})));}break;}
 case'g23_Unseal':{const list=(own.seals||[]).filter(y=>own.battle.some(x=>x.uid===y.sealOf&&colors(card(x.cardId)).some(c=>t.colors.includes(c))));choice(s,t,'コマンド登場：外す封印を1つ選ぶ',list.map(y=>{const x=own.battle.find(x=>x.uid===y.sealOf),c=card(x.cardId);return opt(c.name+'の封印を外す',y.uid,20+cost(c),c.id);}));break;}
 case'g23_FEnd':{const x=live(s,t);if(x){if(api.canUntap(x))x.tapped=false;move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,cardOnly:true}]);}break;}
 case'g23_Purin':{const x=live(s,t);if(x&&api.canLeave(s,t.p,x))choice(s,t,'プリンを超次元ゾーンに置き、別のエイリアンを出しますか？',[opt('超次元ゾーンへ置く',true,(own.extra||[]).some(y=>String(card(y).race).includes('エイリアン')&&!card(y).redPurin)?30:-10),skip()]);break;}
 case'g23_PurinAfter':if((own.extra||[]).some(x=>x.uid===t.uid&&(x.zoneSerial||0)===(t.serial||0)+1))put(s,task('g23_Alien',t.p,t.source));break;
 case'g23_Alien':{const list=(own.extra||[]).filter(x=>card(x).type==='creature'&&String(card(x).race).includes('エイリアン')&&!card(x).redPurin&&api.canEnter(s,t.p,card(x),{origin:'extra',execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length));choice(s,t,'超次元から出すエイリアンを選ぶ',list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
 case'g23_Circle':put(s,task('discard',t.p,t.source,{n:1,causedBy:t.p}),task('g23_DrawUpTo',t.p,t.source),task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g23_DrawUpTo':choice(s,t,'引く枚数を選ぶ（3枚まで）',[0,1,2,3].map(n=>opt(n+'枚引く',n,own.deck.length>n?n*10:-100)));break;
 case'g23_Royal':put(s,task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g23_CircleMana':{const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x)x.tapped=false;break;}
 case'g23_Gareck':if(t.n>0)choice(s,t,'ガレック：効果を選ぶ（残り'+t.n+'回）',[opt('相手1体のパワーを−3000','minus',creatures(s,1-t.p).length?20:-10),opt('上3枚を墓地へ','mill',own.deck.length>6?10:-100),opt('墓地からコスト3以下を出す','revive',own.grave.some(x=>card(x).type==='creature'&&cost(card(x))<=3)?30:-10)]);break;
 case'g23_Minus':choice(s,t,'パワーを−3000する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g23_BalWait':if(own.hand.some(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial))(s.g23After??=[]).push(t);break;
 case'g23_BalPut':{const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&s.g23BalEntered?.[t.p]!==s.turn&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false}))choice(s,t,'攻撃の後：宣言したバルチュリスを出しますか？',[opt('手札から出す',true,40,x.cardId),skip()]);break;}
 default:throw Error('未実装のレッドゾーン効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g23_'))return false;const own=s.players[t.p];switch(t.op){
 case'g23_Declare':{const row=t.remaining[0];if(v)log(s,t.p,'redDeclare',card(row.source).name+'を使用宣言',{cardId:row.source});put(s,{...t,remaining:t.remaining.slice(1),declared:v?[...t.declared,row]:t.declared});break;}
 case'g23_Invade':if(v)invade(s,t);break;
 case'g23_Unseal':api.moveSeal(s,t.p,v,'grave');break;
 case'g23_Purin':if(v){const x=live(s,t),serial=x.zoneSerial||0;put(s,task('g23_PurinAfter',t.p,t.source,{uid:x.uid,serial}));move(s,[{player:t.p,uid:x.uid,to:'extra',destroy:false}]);}break;
 case'g23_Alien':put(s,task('putCreature',t.p,t.source,{origin:'extra',uid:v}));break;
 case'g23_DrawUpTo':draw(s,t.p,v);break;
 case'g23_Gareck':put(s,...(v==='minus'?[task('g23_Minus',t.p,t.source)]:v==='mill'?[task('mill',t.p,t.source,{n:3})]:[task('revive',t.p,t.source,{max:3,optional:false})]),{...t,n:t.n-1});break;
 case'g23_Minus':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-3000,expires:'end',who:s.active});break;}
 case'g23_BalPut':if(v)put(s,task('putCreature',t.p,t.source,{origin:'hand',uid:t.uid}));break;
 default:throw Error('未実装のレッドゾーン選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){const op={redBlack:'g23_Black',redMax:'g23_Max',redRoyal:'g23_Royal',redCircle:'g23_Circle',redGareck:'g23_Gareck'}[c.effect];if(c.effect==='redClock'){api.skipTurn(s,p,c.id);return true;}if(!op)return false;put(s,task(op,p,c.id,{uid,...(op==='g23_Gareck'?{n:3}:{})}));return true;},
 manaTap(s,p){return s.leaving?.snapshot?.redzone?.manaTap?.[p]??creatures(s,1-p).some(x=>effective(x,s).opponentManaTap);},
 snapshot(s){return {manaTap:[0,1].map(p=>creatures(s,1-p).some(x=>effective(x,s).opponentManaTap)),royals:[0,1].flatMap(p=>creatures(s,p).filter(x=>effective(x,s).pandora).map(x=>x.uid))};},
 extraAdded(s,p,all){for(const x of all)if(s.leaving?s.leaving.snapshot?.redzone?.royals.includes(x.uid):card(x).pandora)on(s,p,x,'g23_Royal');},
 command(s,p,x){if(!api.isCreature(s,x)||!String(effective(x,s).race).includes('コマンド'))return;const cs=colors(effective(x,s));if((s.players[p].seals||[]).some(y=>s.players[p].battle.some(z=>z.uid===y.sealOf&&colors(card(z.cardId)).some(c=>cs.includes(c)))))put(s,task('g23_Unseal',p,x.cardId,{colors:cs}));},
 handMana(s,p,x){if(card(x).redCircleMana)on(s,p,x,'g23_CircleMana',{serial:x.zoneSerial||0});},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).redPurin).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g23_Purin',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 attackStart(s,p,a){const old=s.g23Attacks?.[p],count=old?.turn===s.turn?old.count+1:1;(s.g23Attacks??=[null,null])[p]={turn:s.turn,count};const rows=['hand','grave','battle'].flatMap(origin=>s.players[p][origin].filter(x=>x.uid!==a.uid&&!x.sealed&&card(x).invasion?.origins.includes(origin)&&matches(s,a,card(x))).map(x=>({uid:x.uid,source:x.cardId,origin,serial:x.zoneSerial||0,kind:'invade'})));if(count===2&&s.g23BalEntered?.[p]!==s.turn)rows.push(...handRows(s,p));if(rows.length)put(s,task('g23_Declare',p,a.cardId,{remaining:rows,declared:[]}));},
 attackEnd(s,a,x){if(x&&a.number===1&&effective(x,s).redF)on(s,a.player,x,'g23_FEnd');},
 advanceAfter(s){if(!s.g23After?.length||s.attackLifecycle||s.attack||s.decision||s.pendingEffects?.length||s.extTasks?.length||s.triggers||s.judge||s.leaving||s.battleResolution||s.g19BreakSequence||s.g19Interrupt||s.breakContext||s.winner!==null)return;const rows=s.g23After;delete s.g23After;for(const r of rows)enqueue(s,r.p,{uid:r.uid,source:r.source,effect:'extended',task:{...r,op:'g23_BalPut'}});},
 mainActions(s,p){const own=s.players[p],out=[];for(const origin of['hand','extra','mana','deck'])for(const x of own[origin]||[]){const c=card(x);if(!c.pandora)continue;const permits=origin==='mana'?api.manaPermits(s,p,x):origin==='deck'&&own.deck[0]!==x||origin==='deck'&&api.deckLocked(s,p)||origin==='deck'&&!creatures(s,p).some(x=>effective(x,s).orochiTop)?[]:[null];for(const permit of permits)if(api.canPay(s,p,{cost:2,civilizations:['水','火'],fixedPayment:true}))out.push({kind:'pandora',uid:x.uid,cardId:x.cardId,origin,permit,cost:2,label:({hand:'手札',extra:'超次元',mana:'マナ',deck:'山札の上'}[origin])+'の'+c.name+'をパンドラ・シフトで超次元へ（2マナ）'});if(origin==='extra'&&c.extraSummon&&api.canCast(s,p,c)&&api.canEnter(s,p,c,{origin:'extra',execution:true})&&api.canPay(s,p,{...c,summonOrigin:'extra'}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'extra',cost:api.summonCost(s,p,{...c,summonOrigin:'extra'}),label:'超次元ゾーンの'+c.name+'を召喚'});}return out;},
 pandora(s,p,a){const own=s.players[p],x=own[a.origin].find(x=>x.uid===a.uid);api.pay(s,p,{cost:2,civilizations:['水','火'],fixedPayment:true});if(a.origin==='extra'){log(s,p,'pandora',card(x).name+'のパンドラ・シフトを使用（同じゾーンのため移動しない）',{cardId:x.cardId});return;}remove(own[a.origin],x.uid);api.useOrigin(s,p,card(x),x,a.origin,a.permit);clear(x,'extra');api.addZone(s,p,'extra',x);if(a.origin==='deck')api.deckCheck(s,p);log(s,p,'pandora',card(x).name+'をパンドラ・シフトで超次元ゾーンへ',{cardId:x.cardId});},
 };
}
