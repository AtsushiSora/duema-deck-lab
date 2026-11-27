import {policyLook} from './champion-zone-policy.js';
// No.18: cross gears remain independent battlefield elements, linked by incarnation.
export function createSamuraiRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,cast,targetOptions}=api;
 const samurai=c=>String(c.race).includes('サムライ'),armored=c=>String(c.race).includes('アーマード'),dragon=c=>String(c.race).includes('ドラゴン');
 const gears=(s,p)=>s.players[p].battle.filter(x=>card(x).type==='gear');
 const live=(s,p,g)=>g.crossedTo&&s.players[p].battle.find(x=>x.uid===g.crossedTo.uid&&(x.incarnation||0)===g.crossedTo.incarnation&&(x.sealed||api.isCreature(s,x)));
 const reverseHost928=(s,p,t)=>{
  const g=gears(s,p).find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);
  const x=g&&live(s,p,g);
  return x?.tapped&&api.canUntap(x)?x:null;
 };
 const attached=(s,p,x)=>gears(s,p).filter(g=>g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0));
 const active=(s,g)=>!api.ignored(s,g);
 // Phase1715: pairing tests physical attached cards; a muted partner still has its name.
 const paired=(s,p,x,name)=>attached(s,p,x).some(g=>!g.faceDown&&!g.sealed&&live(s,p,g)===x&&[card(g).name,...(card(g).additionalNames||[])].includes(name));
 const optionalReducers=(s,p,c)=>c.type==='creature'?gears(s,p).filter(g=>active(s,g)&&!g.sealed&&!g.faceDown&&!live(s,p,g)&&(card(g).zangeki&&(dragon(c)||samurai(c))||card(g).g1722DragonDiscount&&dragon(c))).length:0;
 const mushaName='ボルメテウス・武者・ドラゴン';
 function identity(s,p,x,c){
  if(c.type==='creature'&&!x.sealed){
   const races=attached(s,p,x).filter(g=>card(g).g1707CrossRace&&!g.faceDown&&!g.sealed&&live(s,p,g)===x&&active(s,g)).map(g=>card(g).g1707CrossRace);
   if(races.length)c={...c,race:[...new Set([...String(c.race||'').split('/').filter(Boolean),...races])].join('/')};
  }
  if(c.type!=='creature'||x.sealed||!s.players[p].battle.some(g=>g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0)&&card(g).g1083MushaLegend&&!g.faceDown&&!g.sealed&&active(s,g)))return c;
  return {...c,additionalNames:c.name===mushaName?[]:[mushaName],
   race:[...new Set([...String(c.race||'').split('/').filter(Boolean),'アーマード・ドラゴン','サムライ'])].join('/')};
 }
 const noReduce=(s,p)=>creatures(s,1-p).some(x=>effective(x,s).noCostReduction);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canUse=(s,p,c,origin)=>api.canCast(s,p,c,origin)&&(c.type==='spell'||api.canEnter(s,p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 function cross(s,p,g,x){
  g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};
  api.log(s,p,'crossGear',card(g).name+'を'+card(x).name+'にクロス',{cardId:g.cardId,target:x.uid});
  if(effective(x,s).g721CrossRamp)on(s,p,x,'g34_Ramp',{n:1,tapped:true});
  if(!x.sealed&&samurai(effective(x,s,true)))for(const mana of s.players[p].mana)if(card(mana).g1722ManaCross&&!mana.faceDown)
   on(s,p,mana,'g18_Inazuma1722',{serial:mana.zoneSerial||0,host:{uid:x.uid,incarnation:x.incarnation||0}});

 }
 const crossPayment=(g,reduction=0,alternative=false)=>({...card(g),crossing:true,...(alternative?{cost:card(g).g1720CrossAlternativeCost}:{}),...(reduction?{g933CrossReduction:reduction}:{})});
 function freeCross(g,c,x){return c.type==='creature'&&(g.g1724FreeCross||g.g1723FreeEvolutionGod&&(api.isEvolution(x)||x.godLinks?.length&&String(c.race).includes('ゴッド'))||g.doss&&samurai(c)||g.zangeki&&(c.name===mushaName||c.additionalNames?.includes(mushaName))||g.g1710FreeCrossName&&[c.name,...(c.additionalNames||[])].some(name=>(Array.isArray(g.g1710FreeCrossName)?g.g1710FreeCrossName:[g.g1710FreeCrossName]).some(part=>name.includes(part))));}
 const protect=(s,p,n)=>{const own=s.players[p];const uids=policyLook(s,p,n,own.deck,api).map(x=>x.uid);(own.g18Protected??=[]).push(...uids);return uids;};
 const release=(own,uids)=>own.g18Protected=(own.g18Protected||[]).filter(uid=>!uids.includes(uid));
 function run(s,t){if(!t.op.startsWith('g18_'))return false;const own=s.players[t.p];switch(t.op){
 case'g18_FinalGrant1724':
  if(s.attackLifecycle&&s.players.some(owner=>owner.battle.some(x=>!x.sealed&&api.isCreature(s,x)&&api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===t.incarnation))))
   choice(s,t,'この攻撃の終わりまでG・ブレイカーを与える？',[opt('与える',true,10),skip()]);
  break;
 case'g18_SelfCross1707':{
  const host=own.battle.find(x=>!x.sealed&&api.isCreature(s,x)&&api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
  const rows=host?gears(s,t.p).filter(g=>!g.sealed&&!g.faceDown&&live(s,t.p,g)!==host):[];
  if(rows.length)choice(s,t,'このクリーチャーに無料でクロスする自分のクロスギアを1枚選ぶ（任意）',[
   ...rows.map(g=>opt(card(g).name,{uid:g.uid,incarnation:g.incarnation||0},20,g.cardId)),skip()
  ]);
  break;
 }
 case'g18_Inazuma1722':{
  const g=own.mana.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial&&!y.faceDown);
  if(g&&api.canMoveZone(s,t.p,'mana')&&api.canEnter(s,t.p,card(g),{origin:'mana',execution:false}))
   choice(s,t,'イナズマ・カブトをマナゾーンから出し、クロスする？',[opt('出す',true,15,g.cardId),skip()]);
  break;
 }
 case'g18_InazumaAfter1722':{
  const g=own.battle.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial+1&&!y.sealed&&!y.faceDown);
  const host=own.battle.find(y=>!y.sealed&&api.isCreature(s,y)&&api.allLayers(y).some(z=>z.uid===t.host.uid&&(z.incarnation||0)===t.host.incarnation));
  if(g&&host)cross(s,t.p,g,host);
  break;
 }
 case'g18_Generate':choice(s,t,'侍流ジェネレートで手札のクロスギアを使う？',[...own.hand.filter(x=>card(x).type==='gear'&&canUse(s,t.p,card(x),'hand')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g18_Bui':choice(s,t,'自分のシールドを1つブレイクして6000以下を破壊する？',[...own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,creatures(s,1-t.p).some(x=>api.power(x,false,s)<=6000)?20:-5)),skip()]);break;
 case'g18_AfterBreak':if((own.brokenThisTurn||0)>t.before)put(s,task('destroyPower',t.p,t.source,{max:6000}));break;
 case'g18_Musashi':{const max=own.battle.filter(x=>colors(card(x)).includes('火')).length;choice(s,t,'火のエレメント数以下の相手エレメントを破壊（上限'+max+'）',targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>cost(card(x))<=max)));if(!s.decision)put(s,task('g18_MusashiDraw',t.p,t.source,{remaining:own.battle.filter(x=>colors(card(x)).includes('光')).length}));break;}
 case'g18_MusashiDraw':if(t.remaining>0)choice(s,t,'光のエレメント1つにつき1枚まで引く（残り'+t.remaining+'枚）',[opt('もう1枚引く',true,own.deck.length>1?10:-20),opt('ここまでで止める',null,0)]);break;
 case'g18_MusashiUse':{const max=own.hand.length,list=own.hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>!c.evolution&&!c.sMax&&(samurai(c)||armored(c))&&cost(c)<=max&&canUse(s,t.p,c,'hand')?[opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)]:[]));choice(s,t,'手札枚数以下のサムライ・アーマードを使う（上限'+max+'）',[...list,skip()]);break;}
 case'g18_Mekraid':{const uids=protect(s,t.p,3),list=uids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return faces(card(x)).flatMap((c,face)=>samurai(c)&&cost(c)<=5&&canUse(s,t.p,c,'deck')?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]);});choice(s,{...t,uids},'サムライ・メクレイド5：上3枚から1枚使う',[...list,skip()]);break;}
 case'g18_Use':{const x=own[t.origin].find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face||0];if(!x||!canUse(s,t.p,c,t.origin))break;if(c.evolution||c.neoEvolution)choice(s,t,'サムライの進化元を選ぶ',[...(c.neoEvolution?[opt('進化せずに出す',null,0)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId))]);else cast(s,t.p,x.uid,true,null,t.face||0,null,t.origin,t.reason||'サムライの能力');break;}
 case'g18_Order':{const remaining=t.remaining.filter(uid=>own.deck.some(x=>x.uid===uid));if(remaining.length<2){for(const uid of remaining){const x=remove(own.deck,uid);own.deck.push(x);}release(own,t.protected);break;}choice(s,{...t,remaining},'残りを山札の下へ置く順序を選ぶ',remaining.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g18_Maroku':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.isCreature(s,x)&&attached(s,t.p,x).length)put(s,{...t,op:'g18_Mekraid',maroku:true});break;}
 case'g18_ChooseFreeCross927':{
  const hosts=creatures(s,t.p);
  const rows=gears(s,t.p).filter(g=>!g.sealed&&!g.faceDown&&!(t.crossed1135||[]).includes(g.uid)&&
   hosts.some(x=>!x.sealed&&live(s,t.p,g)?.uid!==x.uid));
  if(!rows.length)break;
  const options=rows.map(g=>opt(card(g).name,{uid:g.uid,incarnation:g.incarnation||0},live(s,t.p,g)?5:15,g.cardId));
  if(t.g1135Many)options.push(skip());
  choice(s,t,'無料でクロスする自分のクロスギアを選ぶ',options);
  break;
 }
 case'g18_FreeCross':{
  const g=own.battle.find(x=>x.uid===t.gear&&(x.incarnation||0)===t.gearInc&&card(x).type==='gear'&&(!t.required927||!x.sealed&&!x.faceDown));
  if(g){
   const hosts=creatures(s,t.p).filter(x=>(!t.required927||!x.sealed)&&live(s,t.p,g)?.uid!==x.uid)
    .map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId));
   if(t.required927)choice(s,t,'クロスする自分のクリーチャーを選ぶ',hosts);
   else choice(s,t,'メクレイドで出したクロスギアを無料でクロスする？',[...hosts,skip()]);
  }
  break;
 }
 case'g18_AfterMekUse':{const g=own.battle.find(x=>x.uid===t.gear&&(x.zoneSerial||0)===t.serial&&card(x).type==='gear');if(g)put(s,{...t,op:'g18_FreeCross',gearInc:g.incarnation||0});break;}
 case'g18_Flash':put(s,task('g19Yobi',t.p,t.source,{max:6}),task('g18_FlashGrant',t.p,t.source));break;
 case'g18_FlashGrant':for(const x of creatures(s,t.p)){api.untap(s,t.p,x);(x.g18Blocker??=[]).push({who:t.p,cost:6,spellSource:t.source});}break;
 case'g18_ReverseUntap928':{
  const x=reverseHost928(s,t.p,t);
  if(x)choice(s,t,card(x).name+'をアンタップする？',[opt('アンタップする',true,15,x.cardId),skip()]);
  break;
 }
 case'g18_EndUntap':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x)api.untap(s,t.p,x);break;}
 case'g18_ShiraLock':api.lock(s,t.p,{kind:'spellCostLock',player:1-t.p,max:5});break;
 default:throw Error('未実装のサムライ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g18_'))return false;const own=s.players[t.p];switch(t.op){
 case'g18_SelfCross1707':{
  const host=own.battle.find(x=>!x.sealed&&api.isCreature(s,x)&&api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
  const gear=v&&gears(s,t.p).find(g=>g.uid===v.uid&&(g.incarnation||0)===v.incarnation&&!g.sealed&&!g.faceDown);
  if(host&&gear&&live(s,t.p,gear)!==host)cross(s,t.p,gear,host);
  break;
 }
 case'g18_Inazuma1722':if(v){
  const g=own.mana.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial&&!y.faceDown);
  if(g)put(s,task('g34_Put',t.p,t.source,{origin:'mana',target:g.uid}),{...t,op:'g18_InazumaAfter1722'});
 }break;
 case'g18_Generate':if(v)cast(s,t.p,v,true,null,0,null,'hand','侍流ジェネレート');break;
 case'g18_Bui':if(v){const before=own.brokenThisTurn||0;api.interruptBreak(s,t.p,[v],task('g18_AfterBreak',t.p,t.source,{before}));}break;
 case'g18_FinalGrant1724':if(v&&s.attackLifecycle)(s.attackLifecycle.g1724FinalRefs??=[]).push({uid:t.uid,incarnation:t.incarnation});break;
 case'g18_Musashi':put(s,task('g18_MusashiDraw',t.p,t.source,{remaining:own.battle.filter(x=>colors(card(x)).includes('光')).length}));if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g18_MusashiDraw':if(v){put(s,{...t,remaining:t.remaining-1});api.draw(s,t.p,1);}break;
 case'g18_MusashiUse':if(v)put(s,task('g18_Use',t.p,t.source,{origin:'hand',...v}));break;
 case'g18_Mekraid':{release(own,v?[v.uid]:[]);const x=v&&own.deck.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face||0];put(s,...(v?[task('g18_Use',t.p,t.source,{origin:'deck',...v,reason:'サムライ・メクレイド'})]:[]),...(t.maroku&&c?.type==='gear'?[task('g18_AfterMekUse',t.p,t.source,{gear:x.uid,serial:x.zoneSerial||0})]:[]),task('g18_Order',t.p,t.source,{remaining:t.uids.filter(uid=>uid!==v?.uid),protected:t.uids}));break;}
 case'g18_Use':cast(s,t.p,t.uid,true,v||null,t.face||0,null,t.origin,t.reason||'サムライの能力');break;
 case'g18_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v)});break;}
 case'g18_ReverseUntap928':if(v)api.untap(s,t.p,reverseHost928(s,t.p,t));break;
 case'g18_ChooseFreeCross927':if(v)put(s,{...t,op:'g18_FreeCross',gear:v.uid,gearInc:v.incarnation,required927:true});break;
 case'g18_FreeCross':if(v){
  const g=own.battle.find(x=>x.uid===t.gear&&(x.incarnation||0)===t.gearInc),x=own.battle.find(x=>x.uid===v);
  if(g&&x&&api.isCreature(s,x)&&(!t.required927||!g.sealed&&!g.faceDown&&!x.sealed&&live(s,t.p,g)?.uid!==x.uid)){
   cross(s,t.p,g,x);
   if(t.g1135Many)put(s,{...t,op:'g18_ChooseFreeCross927',crossed1135:[...(t.crossed1135||[]),g.uid]});
  }
 }break;
 default:throw Error('未実装のサムライ選択：'+t.op);
 }return true;}
 function sharesCrossedRace(s,p,gear,c){
  const host=live(s,p,gear);
  if(!c.race||!host||host.sealed||!active(s,gear))return false;
  const races=String(c.race).split('/');
  return String(effective(host,s,true).race||'').split('/').some(r=>r&&races.includes(r));
 }
 function crossedRacePower(s,c){
  if(!c.race)return 0;
  let total=0;
  for(const p of [0,1])for(const gear of gears(s,p)){
   const bonus=card(gear).g726CrossRacePower;
   if(bonus&&sharesCrossedRace(s,p,gear,c))total+=bonus;
  }
  return total;
 }
 return {run,chosen,
 snapshot933(s,rows){
  if(!rows.some(({player,uid})=>card(s.players[player].battle.find(x=>x.uid===uid))?.type==='gear'))return [];
  const leaving=new Set(rows.map(r=>r.uid));
  // The watcher must remain in play through a simultaneous departure (603.5d).
  return [s.active,1-s.active].flatMap(p=>creatures(s,p)
   .filter(x=>card(x).g933GearGraveDraw&&!leaving.has(x.uid)&&active(s,x)&&!api.selfStopped(s,p))
   .map(({uid,incarnation,cardId})=>({p,uid,incarnation,cardId})));
 },
 leaving933(s,x,to,watchers){
  if(to==='grave'&&card(x).type==='gear')for(const w of watchers||[])
   on(s,w.p,w,'g34_Draw',{n:1,optional:true});
 },
 snapshotCrossDeath(s,rows){
  const leaving=new Set(rows.map(r=>r.uid)),watchers={};
  for(const p of [0,1])for(const gear of gears(s,p)){
   if(!gear.crossedTo||(!card(gear).g1281CrossDeathDraw&&!card(gear).g1717CrossDeathFree)||gear.faceDown||leaving.has(gear.uid)||!active(s,gear))continue;
   const victim=rows.find(r=>r.uid===gear.crossedTo.uid);
   const host=victim&&live(s,victim.player,gear);
   if(!host||host.sealed||victim.linkCardOnly)continue;
   const uid=victim.godPart||host.uid;
   (watchers[uid]??=[]).push({p,uid:gear.uid,incarnation:gear.incarnation||0,cardId:gear.cardId,...(card(gear).g1717CrossDeathFree?{g1717CrossDeathFree:true}:{})});
  }
  return watchers;
 },
 crossedCreatureDestroyed(s,x,watchers){
  for(const gear of watchers?.[x.uid]||[])if(gear.g1717CrossDeathFree)on(s,gear.p,gear,'g18_FreeCross',{gear:gear.uid,gearInc:gear.incarnation});else on(s,gear.p,gear,'g34_Draw',{n:1,optional:true});
 },
 unblocked(s,p,x,c=card(x)){if(p<0||x.sealed||c.type!=='creature'||!api.isCreature(s,x))return false;if(attached(s,p,x).some(g=>card(g).g125CrossUnblock&&active(s,g)))return true;const vs=colors(c);return s.players[p].battle.some(y=>!y.sealed&&(card(y).g128WaterAura||card(y).g128LightDarkAura)&&api.isCreature(s,y)&&active(s,y)&&(card(y).g128WaterAura&&y.uid!==x.uid&&vs.includes('水')||card(y).g128LightDarkAura&&vs.some(v=>v==='光'||v==='闇')));},
 unblockedAttack(s,p,x){
  if(s.attack.target!=='player'||s.attack.g484Blocked||x.sealed)return false;
  let triggered=false;
  for(const gear of attached(s,p,x)){
   const defs=card(gear).g1080CrossUnblocked;
   if(!defs||gear.faceDown||!active(s,gear))continue;
   on(s,p,gear,'g34_Sequence',{defs});
   triggered=true;
  }
  return triggered;
 },
 identity,
 crossDestroyStay(s,p,x){return !x.sealed&&attached(s,p,x).some(g=>card(g).g1725CrossDestroyStay&&!g.faceDown&&!g.sealed&&live(s,p,g)===x&&active(s,g));},
 crossDestroyToHand(s,p,x){return !x.sealed&&attached(s,p,x).some(g=>card(g).g1715CrossDestroyToHand&&!g.faceDown&&!g.sealed&&live(s,p,g)===x&&active(s,g));},
 // Phase1713: an active crossed gear supplies permission independently of its host abilities.
 evolutionRace(s,p,x){return p>=0&&!x.sealed&&!x.faceDown&&s.players[p].battle.includes(x)&&attached(s,p,x).some(g=>card(g).g1713CrossAnyEvolutionRace&&!g.faceDown&&!g.sealed&&live(s,p,g)===x&&active(s,g));},
 soulSacrifices(s,row,host,sacrifices){
  if(row.replacement||row.to!=='grave'||row.destroy===false||host.sealed||!api.isCreature(s,host)||!attached(s,row.player,host).some(g=>card(g).g1723SoulSacrifice&&!g.sealed&&!g.faceDown&&active(s,g)))return [];
  return creatures(s,row.player).filter(x=>x!==host&&!x.sealed&&!x.faceDown&&!sacrifices.has(x.uid)&&api.canSacrifice1723(s,row.player,x));
 },
 sagaSources(s,row,host,sacrifices){
  if(row.replacement||row.to!=='grave'||row.destroy===false||host.sealed||!api.isCreature(s,host))return [];
  return attached(s,row.player,host).filter(g=>card(g).g1723SagaReplace&&!g.sealed&&!g.faceDown&&active(s,g)&&!sacrifices.has(g.uid)&&!api.manaMoveForbidden(s,row.player)&&api.canLeave(s,row.player,g,{to:'mana',destroy:false,replacement:true}));
 },
 battlePower(s,x,y){
  if(!y||!String(effective(y,s,true).race).includes('ゴッド'))return 0;
  const p=s.players.findIndex(own=>own.battle.includes(x));
  return p<0||x.sealed?0:attached(s,p,x).filter(g=>!g.sealed&&!g.faceDown&&active(s,g)).reduce((n,g)=>n+(card(g).g1723GodBattlePower||0),0);
 },
 nobleAttackLocked(s,p,x){
  return s.players.some((own,owner)=>own.battle.some(g=>card(g).g1721Noble&&!g.sealed&&!g.faceDown&&active(s,g)&&!live(s,owner,g)))&&api.power(x,false,s)<=2000;
 },
 nobleTargetAllowed(s,attacker,target){
  const p=s.players.findIndex(own=>own.battle.includes(target));
  return p<0||!attached(s,p,target).some(g=>card(g).g1721Noble&&!g.sealed&&!g.faceDown&&active(s,g))||api.power(attacker,false,s)>2000;
 },
 nobleBlockAllowed(s,attacker,blocker){
  const p=s.players.findIndex(own=>own.battle.includes(blocker)),a=s.players.findIndex(own=>own.battle.includes(attacker));
  return !(a>=0&&attached(s,a,attacker).some(g=>card(g).g1721Noble&&!g.sealed&&!g.faceDown&&active(s,g))&&api.power(blocker,false,s)<=2000)&&!this.nobleAttackLocked(s,p,blocker);
 },
 powerMultiplier(s,x){
  if(x.sealed)return 1;
  let multiplier=1;
  for(const own of s.players)for(const g of own.battle)if(card(g).g1721CrossMultiplier&&!g.sealed&&!g.faceDown&&g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0)&&active(s,g)&&api.isCreature(s,x))multiplier*=card(g).g1721CrossMultiplier;
  return multiplier;
 },
 spellTax(s,p,c){return c.type==='spell'?gears(s,1-p).filter(g=>card(g).g1721UncrossedSpellTax&&!g.sealed&&!g.faceDown&&!live(s,1-p,g)&&active(s,g)).reduce((n,g)=>n+card(g).g1721UncrossedSpellTax,0):0;},
 protected(s,p,x){
  if(x.crossedTo&&card(x).type==='gear'){
   const host=live(s,p,x);
   return !!(host&&!host.sealed&&card(host).g858ProtectCrossedGear&&active(s,host));
  }
  return api.isCreature(s,x)&&attached(s,p,x).some(g=>active(s,g)&&!g.sealed&&!g.faceDown&&(card(g).g119Petro||card(g).g1721CrossSpellProtection&&api.isSpellChoice(s)));
 },
 effect(s,p,c,uid,entry){const op={samuraiBui:'g18_Bui',samuraiMusashi:'g18_Musashi',samuraiMekraid:'g18_Mekraid',samuraiFlash:'g18_Flash'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 cleanup(s){for(const p of[0,1])for(const g of gears(s,p))if(g.crossedTo&&!live(s,p,g))delete g.crossedTo;},
 inherit(s,base,x){
  if(card(base).type==='gear'&&card(x).type==='gear'&&base.crossedTo)x.crossedTo={...base.crossedTo};
  if(base.g18Blocker)x.g18Blocker=structuredClone(base.g18Blocker);
  for(const p of [0,1]){
   for(const g of attached(s,p,base))g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};
   if(s.players[p].hasWeapons1361)for(const g of s.players[p].battle)
    if(g.weaponTo?.uid===base.uid&&g.weaponTo.incarnation===(base.incarnation||0))
     g.weaponTo={uid:x.uid,incarnation:x.incarnation||0};
  }
 },
 block(s,p){
  const owner=1-p,x=s.players[owner].battle.find(y=>y.uid===s.attack?.attacker);
  if(!x||x.sealed||!api.isCreature(s,x))return;
  for(const g of attached(s,owner,x))if(card(g).g1720CrossBlockedBreak&&!g.faceDown&&!g.sealed&&active(s,g))
   on(s,owner,g,'g34_Break497',{uid:x.uid,incarnation:x.incarnation||0,n:1,g747CreatureBreak:true,g830BlockBreaker:x.cardId});
 },
 broken(s,context,n,defender){
  if(!n||!context||context.burn||context.reverse||defender!==1-context.player)return;
  const p=context.player,x=s.players[p]?.battle.find(y=>y.uid===context.sourceUid&&(context.incarnation===undefined||(y.incarnation||0)===context.incarnation));
  if(!x||x.sealed||!api.isCreature(s,x))return;
  for(const g of attached(s,p,x))if(card(g).g1724BreakDestroyDraw&&!g.faceDown&&!g.sealed&&active(s,g))
   for(let i=0;i<n;i++)on(s,p,g,'g34_Sequence',{defs:[
    {op:'Target',to:'grave',filter:{creature:true,maxPower:3000},optional:false},
    {op:'Draw',n:1,optional:true}
   ]});
 },
 battleTasks1719(s,p,x){
  if(x.sealed||!api.isCreature(s,x))return [];
  return attached(s,p,x).filter(g=>card(g).g1719CrossBattle&&!g.faceDown&&!g.sealed&&active(s,g)).map(g=>({
   controller:p,source:g.cardId,player:p,elementSource:true,
   host:{uid:g.uid,incarnation:g.incarnation||0},defs:card(g).g1719CrossBattle
  }));
 },
 battleWins(s,p,w){
  const host=s.players[p].battle.find(x=>x.uid===w?.uid&&(w.incarnation===undefined||(x.incarnation||0)===w.incarnation));
  if(!host||host.sealed||!api.isCreature(s,host))return [];
  return attached(s,p,host).filter(g=>(card(g).g1718CrossWinDestroy||card(g).g1725CrossWinUntap)&&!g.faceDown&&!g.sealed&&active(s,g)).map(g=>card(g).g1725CrossWinUntap?{
   player:p,uid:g.uid,source:g.cardId,effect:'extended',task:task('g34_Sequence',p,g.cardId,{
    uid:host.uid,incarnation:host.incarnation||0,defs:[{op:'Offer',title:'バトルに勝ったクリーチャーをアンタップする？',defs:[{op:'Untap',g191First:true}]}]
   })
  }:({
   player:p,uid:g.uid,source:g.cardId,effect:'extended',task:task('g34_ExactMove',p,g.cardId,{
    uid:g.uid,incarnation:g.incarnation||0,owner:p,target:host.uid,targetIncarnation:host.incarnation||0,to:'grave'
   })
  }));
 },
 decorate932(s,p,x,c){
  if(c.type!=='creature')return c;
  if(s.attackLifecycle?.g1724FinalRefs?.some(r=>api.allLayers(x).some(y=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation)))c={...c,gBreaker:true};

  for(const g of attached(s,p,x))if(card(g).g1715CrossGrant&&!g.faceDown&&!g.sealed&&live(s,p,g)===x&&active(s,g))c={...c,...card(g).g1715CrossGrant};
  let speed=false,blocker=false,slayers=0,attackBonus=0;
  for(const owner of [p,1-p])for(const g of s.players[owner].battle){
   const def=card(g);
   if((!def.g932UncrossedSpeed&&!def.g932UncrossedSlayer&&!def.g945CrossBlocker&&!def.g1312CrossSpeed&&!def.g1706CrossSlayer&&!def.g1706CrossTap&&!def.g1707CrossAttackBonus)||g.faceDown||g.sealed||!active(s,g))continue;
   const host=live(s,owner,g);
   if(def.g945CrossBlocker&&owner===p&&host===x)blocker=true;
   if(def.g1312CrossSpeed&&owner===p&&host===x)speed=true;
   if(owner===p&&host===x){
    slayers+=Number(!!def.g1706CrossSlayer);
    if(def.g1706CrossTap)c={...c,g1706CrossTapOptions:[...(c.g1706CrossTapOptions||[]),{
     uid:g.uid,incarnation:g.incarnation||0,source:g.cardId,defs:def.g1706CrossTap
    }]};
   }
   if(!host){speed||=!!def.g932UncrossedSpeed;slayers+=Number(!!def.g932UncrossedSlayer);}
   else if(owner===p&&host.uid===x.uid&&(host.incarnation||0)===(x.incarnation||0))attackBonus+=(def.g932CrossAttackBonus||0)+(def.g1707CrossAttackBonus||0);
  }
  if(speed&&!c.speedAttacker)c={...c,speedAttacker:true};
  if(blocker&&!c.blocker)c={...c,blocker:true};
  if(slayers)c={...c,slayer:true,g208SlayerCount:(c.slayer?c.g208SlayerCount||1:0)+slayers};
  if(attackBonus)c={...c,attackBonus:(c.attackBonus||0)+attackBonus};
  return c;
 },
 summonDiscount932(s,p,c){
  return c.type==='creature'?gears(s,p).filter(g=>card(g).g932SummonDiscount&&!g.faceDown&&active(s,g)&&!live(s,p,g)).length:0;
 },
 discount(s,p,c){
  const all=gears(s,p).filter(x=>active(s,x));
  const gearReducers=c.type==='gear'?creatures(s,p).filter(x=>
   (card(x).g856GearDiscount||!c.crossing&&card(x).g978GenerateDiscount)&&active(s,x)).length:0;
  return gearReducers+all.filter(x=>card(x).takion&&(c.type==='gear'||c.type==='creature'&&samurai(c))).length+
   Math.min(optionalReducers(s,p,c),c.g18Reducers??Infinity);
 },
 speed(s,p,x){const c=card(x);return c.type==='creature'&&(samurai(c)&&creatures(s,p).some(y=>card(y).samuraiSpeed&&!api.ignored(s,y))||(dragon(c)||samurai(c))&&gears(s,p).some(g=>card(g).zangeki&&active(s,g)&&live(s,p,g)&&((q)=>dragon(q)||samurai(q))(card(live(s,p,g)))));},
 uncrossedBreakCap(s){
  return s.players.some((own,p)=>own.battle.some(g=>card(g).g1231UncrossedBreakCap&&
   !g.faceDown&&active(s,g)&&!live(s,p,g)));
 },
 bushidoDestroyStay(s,p,x){
  const crossed=attached(s,p,x).filter(g=>!g.faceDown);
  return crossed.some(g=>card(g).g1312KamikazeStay&&active(s,g))&&crossed.some(g=>g.cardId==='dmc45-009');
 },
 crossDestroyShield(s,p,x){
  return !x.sealed&&attached(s,p,x).some(g=>card(g).g1231CrossShield&&!g.faceDown&&active(s,g));
 },
 extraBreak(s,p,x){
  if(x.sealed)return 0;
  let count=0;
  for(const gear of s.players[p].battle){
   if(gear.crossedTo?.uid!==x.uid||gear.crossedTo.incarnation!==(x.incarnation||0)||gear.faceDown)continue;
   const amount=card(gear).g1230CrossExtraBreak;
   if(amount&&active(s,gear)&&(!card(gear).g1715CrossPartner||paired(s,p,x,card(gear).g1715CrossPartner)))count+=amount;
  }
  return count;
 },
 power(s,p,x,c){if(p<0||!api.isCreature(s,x))return 0;const crossed=attached(s,p,x).filter(g=>!g.faceDown&&!g.sealed&&live(s,p,g)===x);return crossed.filter(g=>active(s,g)).reduce((n,g)=>n+(card(g).g1713CrossGearPower||0)*crossed.length+(card(g).g1719CrossCostPower?cost(c)*card(g).g1719CrossCostPower:0)+(card(g).g1717CrossTappedPower?card(g).g1717CrossTappedPower*s.players.flatMap(own=>own.battle).filter(y=>y.tapped&&!y.sealed&&!y.faceDown&&api.isCreature(s,y)).length:0)+(card(g).g1715CrossPower?(paired(s,p,x,card(g).g1715CrossPower.name)?card(g).g1715CrossPower.paired:card(g).g1715CrossPower.base):0),0)+(x.sealed?0:crossedRacePower(s,c))+attached(s,p,x).filter(g=>!g.faceDown&&active(s,g)).reduce((n,g)=>n+(card(g).g123CrossPower||0),0)+attached(s,p,x).filter(g=>card(g).takion&&active(s,g)).length*1000+((dragon(card(x))||samurai(card(x)))?gears(s,p).filter(g=>card(g).zangeki&&active(s,g)&&live(s,p,g)&&((c)=>dragon(c)||samurai(c))(card(live(s,p,g)))).length*2000:0);},
 entry(s,p,x,options){
  const c=card(x);
  if(c.type==='gear'&&c.g1724EntryGearGrave&&!options.selfMuted&&!options.allEntryMuted&&active(s,x))
   on(s,p,x,'g34_Select',{origin:'battle',anyOwner:true,to:'grave',n:1,destroy:false,toOwnerGrave:true,
    filter:{g201Gear:true,faceUp:true},g173Targets:true,g193Select:true,title:'墓地に置くクロスギアを1枚選ぶ'});

  // Phase1716: finish S Trigger X before resolving entry triggers. Command unsealing is queued next, ahead of this task.
  if(c.type==='gear'&&c.g1717EntryCross&&!options.selfMuted&&!options.allEntryMuted&&active(s,x))on(s,p,x,'g18_FreeCross',{gear:x.uid,gearInc:x.incarnation||0});
  if(c.type==='gear'&&options.g1716TriggerX)put(s,task('g18_FreeCross',p,x.cardId,{gear:x.uid,gearInc:x.incarnation||0,required927:true}));
  if(!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,x)){
   if(c.samuraiGenerate)on(s,p,x,'g18_Generate');
   if(c.shiroLock&&options.revolution)on(s,p,x,'g18_ShiraLock');
  }
  if(c.type==='gear')for(const watcher of creatures(s,p))if(!watcher.sealed&&!watcher.faceDown&&effective(watcher,s).g1700GearBlockerDestroy)
   on(s,p,watcher,'g34_Target',{to:'grave',filter:{blocker:true},optional:true,title:'破壊する相手のブロッカーを1体まで選ぶ'});
  if(c.type==='gear'&&c.g1722SamuraiMagic&&options.execution&&!options.selfMuted&&!options.allEntryMuted&&active(s,x))
   on(s,p,x,'g34_Sequence',{defs:[{op:'IfOwn',filter:{g1484ZoneCount:{zone:'battle',min:1,filter:{creature:true,race:'サムライ'}}},defs:[
    {op:'LookDeploy530',g201Search:true,g841DeckPeek:true,limit:1,rest:'shuffle',filter:{g201Gear:true,g201ExactName:c.name}}
   ]}]});
  if(c.type==='gear'&&options.execution)
   for(const watcher of creatures(s,p)){
    if(effective(watcher,s).g931GenerateDraw)on(s,p,watcher,'g34_Draw',{n:1,optional:true});
   }
 },
 attack(s,p,x){
  if(!api.selfStopped(s,p)){
   const c=effective(x,s);
   if(c.samuraiBui)on(s,p,x,'g18_Bui');
   if(c.samuraiMusashi)on(s,p,x,'g18_MusashiUse');
  }
  const refs=api.allLayers(x).map(y=>y.uid+'@'+(y.incarnation||0));
  const godAttacks=s.g481Attackers?.turn===s.turn?s.g481Attackers.events.filter(e=>e.p===p&&e.g1723GodTarget&&e.refs.some(r=>refs.includes(r))):[];
  for(const g of attached(s,p,x)){
   if(!active(s,g))continue;
   const gear=card(g);
   if(gear.g1726ArmoredCopy&&!g.faceDown&&!g.sealed&&!api.isEvolution(x)&&String(effective(x,s,true).race).includes('アーマード・ドラゴン'))
    on(s,p,g,'g34_DrumSpirit1718',{uid:x.uid,incarnation:x.incarnation||0,tapped:true,g1726Copy:true,
     g399Attacker:{uid:x.uid,incarnation:x.incarnation||0,g1081Names:api.attackNames1726(s,x)}});
   if(gear.g1726NeoWave&&!g.faceDown&&!g.sealed)on(s,p,g,'g34_NeoWave1726');
   if(gear.g1724FinalGrant&&!g.faceDown&&!g.sealed)
    on(s,p,g,'g18_FinalGrant1724',{uid:x.uid,incarnation:x.incarnation||0});
   if(gear.g1723FirstGodUntap&&!g.faceDown&&!g.sealed&&godAttacks.length===1&&s.players[1-p].battle.some(y=>y.uid===s.attack?.target&&String(effective(y,s,true).race).includes('ゴッド')))
    on(s,p,g,'g34_Untap',{uid:x.uid,incarnation:x.incarnation||0,g191First:true});
   if(gear.doss)on(s,p,g,'g18_Mekraid');
   if(gear.g1719CrossAttackBreak&&!g.faceDown&&!g.sealed)on(s,p,g,'g34_Break497',{
    uid:x.uid,incarnation:x.incarnation||0,n:1,g747CreatureBreak:true,g828BattleBreaker:x.cardId
   });
   if(gear.g931CrossAttack&&!g.faceDown)on(s,p,g,'g34_Sequence',{defs:gear.g931CrossAttack,
    ...(gear.g931CrossAttack.some(d=>d.g828CompareAttacker)?{g399Attacker:{uid:x.uid,incarnation:x.incarnation||0}}:{})
   });
   if(gear.g930CrossAttack)on(s,p,g,'g34_Offer',{
    title:'山札の上から4枚を見る？',defs:gear.g930CrossAttack,score:s.players[p].deck.length>1?10:-1000
   });
  }
  for(const owner of [p,1-p])for(const gear of gears(s,owner)){
   if(!card(gear).g727CrossRaceDraw||!sharesCrossedRace(s,owner,gear,effective(x,s,true)))continue;
   on(s,owner,gear,'g34_Offer',{title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]});
  }
 },
 end(s,p){
  const own=(x,op)=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})});
  return [...creatures(s,p).filter(x=>effective(x,s).samuraiEndUntap).map(x=>own(x,'g18_EndUntap')),
   ...gears(s,p).filter(g=>!g.sealed&&!g.faceDown&&card(g).g928CrossEndUntap&&active(s,g)).map(g=>own(g,'g18_ReverseUntap928')),
   ...gears(s,p).filter(g=>!g.sealed&&!g.faceDown&&card(g).g1710CrossEndUntap&&active(s,g)&&live(s,p,g)).map(g=>{
    const host=live(s,p,g);return{player:p,uid:g.uid,source:g.cardId,effect:'extended',task:task('g18_EndUntap',p,g.cardId,{uid:host.uid,incarnation:host.incarnation||0})};
   })];
 },
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).maroku&&attached(s,p,x).length).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g18_Maroku',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 mainActions(s,p){
  const out=[];
  if(creatures(s,p).some(x=>!x.sealed))for(const x of s.players[p].hand){
   const c=api.zoneCard(s,p,x,'hand');
   if(c.g1706FreeGenerate&&api.canCast(s,p,c,'hand')&&api.canEnter(s,p,c,{origin:'hand',execution:true}))
    out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',cost:0,freeSummon:'G・ゼロ',
     label:c.name+'をG・ゼロでジェネレートする'});
  }
  for(const g of gears(s,p))for(const x of creatures(s,p)){
   if(live(s,p,g)?.uid===x.uid)continue;
   const gear=card(g),host=identity(s,p,x,card(x)),existing=!!live(s,p,g),free=active(s,g)&&freeCross(gear,host,x);
   const hostFree=!x.sealed&&!g.sealed&&!g.faceDown&&(effective(x,s).g946FreeCross&&active(s,x)||attached(s,p,x).some(y=>card(y).g1713CrossFree&&!y.faceDown&&!y.sealed&&live(s,p,y)===x&&active(s,y)));
   if(gear.g1720CrossAlternativeCost&&!g.sealed&&!g.faceDown&&active(s,g)&&api.canPay(s,p,crossPayment(g,0,true)))
    out.push({kind:'crossGear',uid:g.uid,cardId:g.cardId,target:x.uid,g1720AlternativeCross:true,
     cost:api.summonCost(s,p,crossPayment(g,0,true)),free:false,score:12,
     label:gear.name+' → '+host.name+'に代替コストでクロス（'+gear.g1720CrossAlternativeCost+'マナ）'});
   const base=free?0:api.summonCost(s,p,crossPayment(g));
   const hostDiscount=active(s,x)?host.g933CrossDiscount||0:0;
   const gearDiscount=gear.g1312SamuraiCrossDiscount&&!g.faceDown&&active(s,g)&&samurai(effective(x,s))?gear.g1312SamuraiCrossDiscount:0;
   const max=free||noReduce(s,p)?0:Math.min(hostDiscount+gearDiscount,base-1);
   const score=gear.g125CrossUnblock?(existing?-30:attached(s,p,x).some(y=>card(y).g125CrossUnblock&&active(s,y))?5:35)+(x.tapped?-10:0):
    gear.g119Petro?(existing||attached(s,p,x).some(y=>card(y).g119Petro&&active(s,y))?-30:40+Math.min(cost(host),12)*3):
    existing?-30:gear.zangeki&&(dragon(host)||samurai(host))?70:gear.doss?30:10;
   if(hostFree&&!free)
    out.push({kind:'crossGear',uid:g.uid,cardId:g.cardId,target:x.uid,cost:0,free:true,
     score:score+(!existing&&x.entered<s.turn&&!x.tapped?4:0)+1,
     label:gear.name+' → '+host.name+'にクロス（無料）'});
   const minimum=host.g1311MandatoryCrossDiscount?Math.min(hostDiscount,max):0;
   for(let reduction=minimum;reduction<=max;reduction++){
    const payment=crossPayment(g,reduction);
    if(!free&&!api.canPay(s,p,payment))continue;
    const n=free?0:api.summonCost(s,p,payment);
    out.push({kind:'crossGear',uid:g.uid,cardId:g.cardId,target:x.uid,cost:n,free,
     ...(reduction?{g933CrossReduction:reduction}:{}),score:score+(!existing&&x.entered<s.turn&&!x.tapped?4:0)+reduction,
     label:gear.name+' → '+host.name+'にクロス（'+(free?'無料':n+'マナ')+'）'});
   }
  }
  return out;
 },
 crossOnEntry(s,p,x,ids){for(const g of gears(s,p))if(!g.sealed&&ids.includes(g.uid))cross(s,p,g,x);},
 crossAction(s,p,a){const g=s.players[p].battle.find(x=>x.uid===a.uid),x=s.players[p].battle.find(x=>x.uid===a.target);if(!a.free)api.pay(s,p,crossPayment(g,a.g933CrossReduction,!!a.g1720AlternativeCross));cross(s,p,g,x);},
 variants(s,p,actions){const out=[...actions];if(noReduce(s,p))return out;for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.alternative||a.g18Reducers!==undefined)continue;const c=faces(card(a.cardId))[a.face||0],max=optionalReducers(s,p,c);for(let n=0;n<max;n++){const payment={...c,summonOrigin:a.origin||'hand',g18Reducers:n,...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{})};if(api.canPay(s,p,payment))out.push({...a,g18Reducers:n,cost:api.summonCost(s,p,payment),label:c.name+'を'+(gears(s,p).some(g=>card(g).g1722DragonDiscount)?'クロスギア':'ザンゲキ')+'の軽減'+n+'回で使う'});}}return out;},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const top of own.battle)for(const x of api.layers(top))x.g18Blocker=(x.g18Blocker||[]).filter(v=>v.who!==p);},
 };
}
