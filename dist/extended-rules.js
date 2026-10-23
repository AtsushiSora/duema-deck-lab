import {createGraveRules} from './grave-rules.js?v=0.56';
import {createTravelRules} from './travel-rules.js?v=0.56';
import {createKenjiRules} from './kenji-rules.js?v=0.56';
import {createLionelRules} from './lionel-rules.js?v=0.56';
import {createSamuraiRules} from './samurai-rules.js?v=0.56';
import {createGachiroboRules} from './gachirobo-rules.js?v=0.56';
import {createGiantRules} from './giant-rules.js?v=0.56';
import {createJaouRules} from './jaou-rules.js?v=0.56';
import {createZardRules} from './zard-rules.js?v=0.56';
import {createHunterRules} from './hunter-rules.js?v=0.56';
import {createArmoredRules} from './armored-rules.js?v=0.56';
import {createMagicRules} from './magic-rules.js?v=0.56';
import {createMechaRules} from './mecha-rules.js?v=0.56';
import {createKiyonagaRules} from './kiyonaga-rules.js?v=0.56';
import {createGransectRules} from './gransect-rules.js?v=0.56';
import {createGateRules} from './gate-rules.js?v=0.56';
import {createGalaxyRules} from './galaxy-rules.js?v=0.56';
import {createGospelRules} from './gospel-rules.js?v=0.56';
import {createStarterRules} from './starter-rules.js?v=0.56';
// Serializable continuations for the verified tournament-card effects.
export function createExtendedRules(api){
 const {card,faces,cost,colors,effective,power,layers,draw,mill,move,enter,cast,remove,removeShield,clear,enqueue,log,random,canEnter,canCast,evolutionBases}=api;
 const creatures=(s,p)=>s.players[p].battle.filter(x=>api.isCreature(s,x));
 const put=(s,...tasks)=>{(s.extTasks??=[]).unshift(...tasks.filter(Boolean));};
 const task=(op,p,source,more={})=>({op,p,source,...more});
 const choice=(s,t,title,options)=>{if(options.length)s.decision={type:'extended',player:t.p,source:t.source,title,task:t,choices:options};};
 const opt=(label,value,score=0,cardId=null)=>({label,value,score:Number.isFinite(score)?Math.max(-1000,Math.min(1000,score)):score>0?1000:-1000,...(cardId?{cardId}:{})});
 const skip=()=>opt('使わない',null,0);
 const targetOptions=(s,p,list)=>forceTargets(s,p,list.filter(x=>{const owner=s.players.findIndex(y=>y.battle.some(z=>z.uid===x.uid));return owner<0||targetable(s,p,owner,x);})).map(x=>opt(card(x).name,x.uid,cost(card(x))*3,card(x).id));
 const forceTargets=(s,p,list)=>{const forced=list.filter(x=>{const owner=s.players.findIndex(y=>y.battle.some(z=>z.uid===x.uid));return owner>=0&&owner!==p&&api.isCreature(s,x)&&effective(x,s).forceTarget;});return forced.length?forced:list;};
 const nowCreature=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);
 const lock=(s,p,more)=>{(s.extLimits??=[]).push({controller:p,expires:'start',who:p,...more});};
 const locked=(s,p,x,kind)=>{
  if(kind==='attack'&&creatures(s,p).some(y=>effective(y,s).ignoreAttackLocks))return false;
  if((s.extLimits||[]).some(l=>l.kind==='numberLock'&&!api.spellIgnored(s,{type:'spell',cost:2})&&l.player===p&&x.g9LockScopes?.includes(l.scope)&&cost(card(x))===(l.cost==='∞'?Infinity:l.cost)))return true;
  return (s.extLimits||[]).some(l=>l.kind===kind&&l.player===p&&(!l.uid||layers(x).some(y=>y.uid===l.uid&&(y.incarnation||0)===(l.incarnation||0)))&&(l.cost===undefined||faces(card(x)).some(c=>cost(c)===(l.cost==='∞'?Infinity:Number(l.cost)))));
 };
 const shieldTo=(s,p,uid,to)=>{const x=removeShield(s,p,uid);if(x){const target=x.faceUp&&card(x).gCastle||to==='mana'&&api.manaRedirect(s,p)?'grave':to;clear(x);s.players[p][target].push(x);}return x;};
 const targetable=(s,p,owner,x)=>!x||p===owner||!(effective(x,s).untargetable||effective(x,s).justDiver&&x.justDiverActive);
 const starter=createStarterRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo});
 const gospel=createGospelRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const galaxy=createGalaxyRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const gate=createGateRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const gran=createGransectRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const kiyo=createKiyonagaRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const armored=createArmoredRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const magic=createMagicRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const mecha=createMechaRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const hunter=createHunterRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock,canLeave:mecha.canLeave,uraLoss:(s,p,uid)=>grave.beginUra(s,p,uid),oniLoss:(s,p,uid)=>kenji.beginOni(s,p,uid)});
 const zard=createZardRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock,gearCleanup:s=>samurai.cleanup(s),inherit:(s,a,b)=>{travel.inherit(s,a,b);lionel.inherit(s,a,b);samurai.inherit(s,a,b);armored.inherit(s,a,b);magic.inherit(s,a,b);}});
 const jaou=createJaouRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const giant=createGiantRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock,canLeave:mecha.canLeave});
 const gachi=createGachiroboRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const samurai=createSamuraiRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock});
 const lionel=createLionelRules({...api,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,shieldTo,targetable,lock,canLeave:mecha.canLeave,triggersAllowed:hunter.triggersAllowed});
 const kenji=createKenjiRules({...api,creatures,put,task,choice,opt,skip,targetOptions,canLeave:mecha.canLeave});
 const travel=createTravelRules({...api,creatures,put,task,choice,opt,skip,targetOptions,lock,shieldTo,manaPermits:(s,p,x)=>[...galaxy.manaPermits(s,p,x),...kenji.manaPermits(s,p,x),...gran.manaPermits(s,p,x)]});
 const grave=createGraveRules({...api,creatures,put,task,choice,opt,skip,targetOptions});
 const discardDeploy=(s,t,x)=>card(x).discardDeploy&&t.p!==s.active||card(x).enemyDiscardDeploy&&(t.causedBy??s.active)!==t.p&&["spell","creature"].includes(card(t.source)?.type);
 const entryTask=(s,p,c,uid,entry)=>{
  if(grave.effect(s,p,c,uid,entry)||travel.effect(s,p,c,uid,entry)||kenji.effect(s,p,c,uid,entry)||lionel.effect(s,p,c,uid,entry)||samurai.effect(s,p,c,uid,entry)||gachi.effect(s,p,c,uid,entry)||giant.effect(s,p,c,uid,entry)||jaou.effect(s,p,c,uid,entry)||zard.effect(s,p,c,uid,entry)||hunter.effect(s,p,c,uid,entry)||armored.effect(s,p,c,uid,entry)||magic.effect(s,p,c,uid,entry)||mecha.effect(s,p,c,uid,entry)||kiyo.effect(s,p,c,uid,entry)||gran.effect(s,p,c,uid,entry)||gate.effect(s,p,c,uid,entry)||galaxy.effect(s,p,c,uid,entry)||gospel.effect(s,p,c,uid,entry)||starter.effect(s,p,c,uid,entry))return true;
  const more={uid};switch(c.effect){
   case 'jadowShield':put(s,task('jadowShield',p,c.id,more));break;
   case 'vamBounce':put(s,task('elementBounce',p,c.id,{...more,discardAfter:true}));break;
   case 'goodEvil':put(s,task('draw',p,c.id,{n:3}),task('discard',p,c.id,{causedBy:p,n:2,optional:true,randomDiscardAfter:true}));break;
   case 'aterModes':put(s,task('modes',p,c.id,{family:'ater',remaining:2,selected:[]}));break;
   case 'jaganRevive':put(s,task('mill',p,c.id,{n:2}),task('revive',p,c.id,{max:5,optional:true}));break;
   case 'reverseLock':for(const x of creatures(s,1-p))for(const kind of ['attack','block'])lock(s,p,{kind,player:1-p,uid:x.uid,incarnation:x.incarnation||0});break;
   case 'urEvolve':put(s,task('urEvolve',p,c.id,more));break;
   case 'muteLoot':put(s,task('optionalLoot',p,c.id,{n:2}));break;
   case 'tensaiLoot':put(s,task('draw',p,c.id,{n:2}),task('discard',p,c.id,{causedBy:p,n:1,costLock:true}));break;
   case 'graveRecycle':put(s,task('recyclePlayer',p,c.id));break;
   case 'destroyMin':put(s,task('destroyMin',p,c.id));break;
   case 'vtBounce':put(s,task('vtBounce',p,c.id));break;
   case 'miradaCast':put(s,task('execute',p,c.id,{origin:'hand',max:5,light:true,spellOnly:true,fallbackDraw:1}));break;
   case 'spellLock':lock(s,p,{kind:'cast',player:1-p,expires:'end',who:1-p});break;
   case 'miracleDraw':put(s,task('draw',p,c.id,{n:3}),task('execute',p,c.id,{origin:'hand',max:5,spellOnly:true}));break;
   case 'serpentModal':put(s,task('discard',p,c.id,{causedBy:p,n:1}),task('modes',p,c.id,{family:'serpent',remaining:1,total:1,selected:[]}));break;
   case 'icicleModes':put(s,task('modes',p,c.id,{family:'icicle',remaining:2,selected:[]}));break;
   case 'mirageModes':put(s,task('modes',p,c.id,{family:'mirage',remaining:2,selected:[]}));break;
   default:return false;
  }return true;
 };
 function run(s,t){const own=s.players[t.p],opp=s.players[1-t.p],c=card(t.source);
  switch(t.op){
   case 'castleLeave':put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:2}));break;
   case 'tapAll':for(const x of creatures(s,1-t.p))api.tap(s,1-t.p,x);break;
   case 'gsTarget':if(api.spellIgnored(s,c))break;choice(s,t,'このターン攻撃できなくする相手を選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
   case 'bottomOrder':if(t.uids.length===1){const x=remove(own.deck,t.uids[0]);if(x)own.deck.push(x);}else if(t.uids.length>1)choice(s,t,'山札の下に置くシールドの順序を選ぶ',t.uids.map((uid,i)=>opt('元のシールド '+(i+1),uid)));break;
   case 'draw':draw(s,t.p,t.n);break;
   case 'finishJudgeCharger':api.finishCharger(s);break;
   case 'mill':mill(s,t.p,t.n);break;
   case 'muteAttackLock':lock(s,t.p,{kind:'attack',player:1-t.p,expires:'end',who:s.active});break;
   case 'optionalDrawOne':choice(s,t,'カードを1枚引きますか？',[opt('1枚引く',true,own.deck.length>1?10:-10),skip()]);break;
   case 'optionalLoot':choice(s,t,`カードを${t.n}枚引いて、1枚捨てますか？`,[opt('引いてから1枚捨てる',true,own.deck.length>t.n?20:-10),skip()]);break;
   case 'discardSelect':{const available=own.hand.filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=t.n||!available.length){beginDiscardBatch(s,t,t.selected);break;}choice(s,t,'捨てる手札を選ぶ（'+t.selected.length+'枚選択済み）',[...available.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)),...(t.optional?[opt('ここまでで確定',null,0)]:[])]);break;}
   case 'discardBatch':{const b=s.extDiscardBatches[t.batchId];if(!b)break;if(!b.uids.length){delete s.extDiscardBatches[t.batchId];if(b.randomDiscardAfter&&b.actual)put(s,task('discard',1-b.p,b.source,{causedBy:b.p,n:b.actual,random:true}));break;}const [uid,...rest]=b.uids;b.uids=rest;if(own.hand.some(x=>x.uid===uid))put(s,{...t,op:'discardChosen',uid,n:1});else put(s,t);break;}
   case 'discard':{
    if(t.n>1&&!t.all){if(t.random){const available=[...own.hand],chosen=[];while(chosen.length<t.n&&available.length)chosen.push(available.splice(Math.floor(random(s)*available.length),1)[0].uid);beginDiscardBatch(s,t,chosen);}else put(s,{...t,op:'discardSelect',selected:[]});break;}
    if(t.all&&own.hand.some(x=>discardDeploy(s,t,x))){beginDiscardBatch(s,t,own.hand.map(x=>x.uid));break;}
    if(!t.n||!own.hand.length){if(t.randomDiscardAfter&&t.discarded)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:t.discarded,random:true}));break;}
    if(t.all&&!own.hand.some(x=>discardDeploy(s,t,x))){const all=[...own.hand];for(const x of all){remove(own.hand,x.uid);clear(x);own.grave.push(x);afterDiscard(s,{...t,n:1},x,true);}log(s,t.p,'discard',`手札${all.length}枚をすべて捨てる`,{cardId:t.source});break;}
    const candidates=t.random?[own.hand[Math.floor(random(s)*own.hand.length)]]:own.hand;
    if(t.random){const x=candidates[0];put(s,{...t,op:'discardChosen',uid:x.uid});}
    else choice(s,t,`${t.n}枚まで手札を捨てる${t.discarded?'（'+t.discarded+'枚選択済み）':''}`, [...candidates.map(x=>opt(card(x).name,x.uid,Math.min(20,cost(card(x))),x.cardId)),...(t.optional?[opt('ここまでで確定',null,own.hand.length>4?-1:0)]:[])]);
    break;
   }
   case 'discardChosen':{
    const x=own.hand.find(x=>x.uid===t.uid);if(!x)break;
    if(discardDeploy(s,t,x)&&canEnter(s,t.p,card(x),{origin:'hand',execution:false})){choice(s,t,'捨てるかわりにバトルゾーンに出しますか？',[opt('墓地のかわりに出す',true,30,x.cardId),opt('そのまま捨てる',false,0)]);break;}
    discardCard(s,t,x);break;
   }
   case 'elementBounce':choice(s,t,'手札に戻す相手のエレメントを選ぶ',targetOptions(s,t.p,opp.battle));if(!targetOptions(s,t.p,opp.battle).length&&t.discardAfter)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1,random:true}));break;
   case 'jadowShield':choice(s,t,'手札に加える自分のシールドを選ぶ（S・トリガー不可）',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,0)));if(!own.shields.length)put(s,task('destroyUntapped',t.p,t.source));break;
   case 'destroyUntapped':choice(s,t,'破壊するアンタップ中の相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!x.tapped)));break;
   case 'modes':{
    if(!t.remaining){const sorted=[...t.selected].sort((a,b)=>a-b);put(s,...sorted.map(mode=>task('mode',t.p,t.source,{family:t.family,mode})));break;}
    const labels={ater:['相手1体のパワーを-4000','山札の上4枚を墓地へ','墓地のコスト4以下を出す'],serpent:['カードを2枚引く','パワー9000以下の相手を破壊'],icicle:['相手1体の攻撃とブロックを止める','手札を1枚捨て、2枚引く','手札のコスト2以下のエレメントを出す'],mirage:['カードを2枚引いて1枚捨てる','墓地のS・トリガーを実行する','クリーチャー1体をシールド化']}[t.family]||[];
    choice(s,t,`効果を${3-t.remaining}/2つ目に選ぶ（同じ効果も選べます）`,labels.map((label,value)=>opt(label,value,value===2&&own.grave.some(x=>card(x).type==='creature'&&cost(card(x))<=4)?25:value===0&&creatures(s,1-t.p).length?20:5)));break;
   }
   case 'mode':if(t.family==='serpent'){if(t.mode===0)draw(s,t.p,2);else put(s,task('destroyPower',t.p,t.source,{max:9000}));}if(t.family==='icicle'){if(t.mode===0)put(s,task('attackBlock',t.p,t.source));if(t.mode===1)put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:2}));if(t.mode===2)put(s,task('execute',t.p,t.source,{origin:'hand',max:2,elementOnly:true,deploy:true,optional:false}));}if(t.family==='mirage'){if(t.mode===0)put(s,task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{causedBy:t.p,n:1}));if(t.mode===1)put(s,task('execute',t.p,t.source,{origin:'grave',max:'∞',trigger:true,bottomAfter:true,optional:false}));if(t.mode===2)put(s,task('shieldCreature',t.p,t.source));}if(t.family==='ater'){if(t.mode===0)put(s,task('powerMinus',t.p,t.source));if(t.mode===1)mill(s,t.p,4);if(t.mode===2)put(s,task('revive',t.p,t.source,{max:4}));}break;
   case 'powerMinus':choice(s,t,'パワーを-4000する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
   case 'revive':{
    const list=own.grave.filter(x=>card(x).type==='creature'&&cost(card(x))<=t.max&&(!t.multi||colors(card(x)).length>1)&&canEnter(s,t.p,card(x),{origin:'grave',execution:false}));
    choice(s,t,'墓地から出すクリーチャーを選ぶ',[...list.map(x=>opt(card(x).name,x.uid,10+cost(card(x))*3,x.cardId)),...(t.optional?[skip()]:[])]);break;
   }
   case 'putCreature':{
    const x=own[t.origin].find(x=>x.uid===t.uid);if(!x||!canEnter(s,t.p,card(x),{origin:t.origin,execution:t.execution??false}))break;
    const c=card(x);if(c.evolution||c.neoEvolution&&!t.noEvolve){const bases=evolutionBases(s,t.p,c);choice(s,t,'出す方法・進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',false,1)]:[]),...bases.map(b=>opt(card(b).name+'の上に置く',b.uid,b.tapped?-1:2,b.cardId))]);}
    else{remove(own[t.origin],x.uid);if(c.gCastle){x.faceUp=true;own.shields.push(x);mecha.shieldAdded(s,t.p,x);(s.noManaUse??=[false,false])[t.p]=true;}else enter(s,t.p,x,null,{origin:t.origin,execution:false});if(t.deckCheck)api.deckCheck(s,t.p);}break;
   }
   case 'urEvolve':{
    const base=own.battle.find(x=>x.uid===t.uid);if(!base)break;
    const list=own.hand.filter(x=>card(x).neoEvolution&&cost(card(x))<=6&&evolutionBases(s,t.p,card(x)).some(y=>y.uid===base.uid)&&canEnter(s,t.p,card(x),{origin:'hand',execution:false}));choice(s,t,'このタマシードの上に置くNEOクリーチャーを選ぶ',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
   }
   case 'endJagan':{
    const source=nowCreature(s,t.p,t.uid);if(!source||!source.tapped)break;choice(s,t,'手札に戻す自分の他のクリーチャーを選ぶ',[...creatures(s,t.p).filter(x=>x.uid!==t.uid).map(x=>opt(card(x).name,x.uid,own.hand.some(y=>y.cardId===x.cardId)?20:-2,x.cardId)),skip()]);break;
   }
   case 'sameName':{
    const list=own.hand.filter(x=>x.cardId===t.nameId&&canEnter(s,t.p,card(x),{origin:'hand',execution:false}));choice(s,t,'同名のクリーチャーを手札から出す',[...list.map(x=>opt(card(x).name,x.uid,25,x.cardId)),skip()]);break;
   }
   case 'execute':{
    const list=own[t.origin||'hand'].flatMap(x=>faces(card(x)).map((c,face)=>({x,c,face}))).filter(({c})=>(!t.creatureOnly||c.type==='creature')&&(!t.elementOnly||c.type!=='spell')&&(!t.noncreature||c.type!=='creature')&&(!t.spellOnly||c.type==='spell')&&cost(c)<=(t.max==='∞'?Infinity:t.max)&&(!t.light||colors(c).includes('光'))&&(!t.trigger||c.trigger)&&canCast(s,t.p,c)&&(c.type==='spell'||canEnter(s,t.p,c,{origin:t.origin||'hand',execution:!t.deploy})&&(!c.evolution||evolutionBases(s,t.p,c).length)));
    choice(s,t,'コストを支払わずに使うカードを選ぶ',[...list.map(({x,c,face})=>opt(c.name,{uid:x.uid,face},15+cost(c),x.cardId)),...(t.optional!==false?[skip()]:[])]);break;
   }
   case 'stealSpell':{
    const x=s.players[t.owner].grave.find(x=>x.uid===t.uid);if(x&&faces(card(x)).some(c=>c.type==='spell'&&canCast(s,t.p,c)))choice(s,t,'相手の墓地から呪文を唱えますか？',[opt('唱える',true,20,x.cardId),skip()]);break;
   }
   case 'kakuReturn':{const x=nowCreature(s,t.p,t.uid);if(x)choice(s,t,'出したクリーチャーを山札のどちらに置く？',[opt('山札の上', 'deckTop',0),opt('山札の下','deck',1)]);break;}
   case 'tensaiCost':choice(s,t,'捨てたカードのどちらのコストを使う？',faces(card(t.discardId)).map(c=>opt(c.name+'：'+c.cost,c.cost,0)));break;
   case 'bounceAny':choice(s,t,'手札に戻すクリーチャーを選ぶ',[...targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)]),skip()]);break;
   case 'redUntap':{const x=nowCreature(s,t.p,t.uid);if(x)x.tapped=false;break;}
   case 'destroyMin':{const list=creatures(s,1-t.p);if(list.length){const min=Math.min(...list.map(x=>power(x,x.uid===s.attack?.attacker,s)));move(s,list.filter(x=>power(x,x.uid===s.attack?.attacker,s)===min).map(x=>({player:1-t.p,uid:x.uid,to:'grave'})));}break;}
   case 'vtBounce':{const list=creatures(s,1-t.p).filter(x=>power(x,x.uid===s.attack?.attacker,s)<=5000);lock(s,t.p,{kind:'entryPower',player:1-t.p,max:5000,startsPlayer:1-t.p,active:false,expires:'end',who:1-t.p});if(list.length)move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'hand'})));break;}
   case 'recyclePlayer':choice(s,t,'カードを戻す墓地を選ぶ',[opt('自分の墓地',t.p,own.grave.length),opt('相手の墓地',1-t.p,opp.grave.length)]);break;
   case 'recycleSelect':choice(s,t,'戻すカードを選ぶ（'+t.chosen.length+'枚選択）',[...s.players[t.owner].grave.filter(x=>!t.chosen.includes(x.uid)).map(x=>opt(card(x).name,x.uid,1,x.cardId)),opt('ここまでで確定',null,t.chosen.length>0?2:0)]);break;
   case 'recycleOrder':if(t.chosen.length)choice(s,t,'山札の下に置く順序を選ぶ',t.chosen.map(uid=>{const x=own.grave.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));else put(s,task('destroyCost',t.controller,t.source,{max:t.count}));break;
   case 'destroyCost':choice(s,t,'破壊するコスト'+t.max+'以下の相手を選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(card(x))<=t.max)),...(t.optional!==false?[skip()]:[])]);break;
   case 'destroyPower':choice(s,t,'破壊するパワー'+t.max+'以下の相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>power(x,x.uid===s.attack?.attacker,s)<=(t.max==='∞'?Infinity:t.max))));break;
   case 'attackBlock':choice(s,t,'攻撃もブロックもできなくする相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
   case 'shieldCreature':choice(s,t,'シールド化するクリーチャーを選ぶ',targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)]));break;
   case 'ninjaDeclare':if(t.remaining.length){const uid=t.remaining[0],x=own.hand.find(x=>x.uid===uid);if(x)choice(s,t,card(x).name+'の使用を宣言する？',[opt('宣言する',true,10,x.cardId),skip()]);else put(s,{...t,remaining:t.remaining.slice(1)});}else for(const uid of t.declared){const x=own.hand.find(x=>x.uid===uid);if(x)enqueue(s,t.p,{uid,source:x.cardId,effect:'extended',task:task('ninjaResolve',t.p,x.cardId,{uid})});}break;
   case 'ninjaResolve':{
    const x=own.hand.find(x=>x.uid===t.uid),used=s.attack?.ninjaUsed?.[t.p]||{};if(!x||!s.attack)break;const c=card(x);
    if(c.ninjaStrike&&!used.strike&&own.mana.length>=3&&own.mana.some(y=>api.manaColors(card(y),s,t.p).includes('水'))&&canEnter(s,t.p,c)){choice(s,t,'ニンジャ・ストライクで召喚する？',[opt('召喚する','strike',30,x.cardId),skip()]);}
    if(c.ninjaChange&&!used.any&&canEnter(s,t.p,c,{origin:'hand',execution:false}))choice(s,t,'ニンジャ・チェンジで入れ替える相手を選ぶ',[...targetOptions(s,t.p,creatures(s,t.p).filter(y=>cost(card(y))>=5&&/メカ|シノビ/.test(card(y).race))),skip()]);break;
   }
   case 'revDeclare':if(t.remaining.length){const uid=t.remaining[0],x=own.hand.find(x=>x.uid===uid);if(x)choice(s,t,card(x).name+'の革命チェンジを宣言する？',[opt('宣言する',true,15,x.cardId),skip()]);else put(s,{...t,remaining:t.remaining.slice(1)});}else for(const uid of t.declared){const x=own.hand.find(x=>x.uid===uid);if(x)enqueue(s,t.p,{uid,source:x.cardId,effect:'extended',task:task('revResolve',t.p,x.cardId,{uid,attacker:t.attacker})});}break;
   case 'revResolve':{const x=own.hand.find(x=>x.uid===t.uid),a=nowCreature(s,t.p,t.attacker);if(x&&a&&s.attack?.attacker===a.uid&&revMatches(s,a,card(x))&&canEnter(s,t.p,card(x),{origin:'hand',execution:false}))choice(s,t,'革命チェンジを実行する？',[opt('入れ替える',a.uid,25,x.cardId),skip()]);break;}
   case 'swapFinish':{const old=own.hand.find(x=>x.uid===t.old),x=own.hand.find(x=>x.uid===t.uid);if(old&&x&&canEnter(s,t.p,card(x),{origin:'hand',execution:false})){remove(own.hand,x.uid);enter(s,t.p,x,null,{origin:'hand',execution:false,revolution:t.revolution});x.tapped=t.tapped;if(t.attack){s.attack={...t.attack};magic.swapped(s,t.old,x);for(const key of ['attacker','target','blockUid'])if(s.attack[key]===t.old)s.attack[key]=x.uid;}}break;}
   case 'finalDark':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;put(s,task('mill',t.p,t.source,{n:2}),task('revive',t.p,t.source,{max:7,multi:true,optional:false}));}break;
   case 'finalLight':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;lock(s,t.p,{kind:'summon',player:1-t.p,max:7,expires:'end',who:1-t.p});}break;
   case 'darkFight':{const x=nowCreature(s,t.p,t.uid);if(x&&(t.incarnation===undefined||t.incarnation===(x.incarnation||0)))choice(s,t,'ドギラゴン悪でバトルする相手を選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;}
   case 'ninjaBottom':{const x=own.battle.find(x=>layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===t.incarnation));if(x&&card(x).race?.includes('シノビ'))move(s,[{player:t.p,uid:x.uid,to:'deck'}]);break;}
   case 'mirageCast':{const x=own.hand.find(x=>x.uid===t.uid);if(x&&(s.creaturesEntered||0)>=3&&canCast(s,t.p,card(x)))cast(s,t.p,x.uid,true,null,0,null,'hand','ターン終了時の能力');break;}
   case 'finishSpell':{const i=(s.extSpells||[]).findIndex(x=>x.inst.uid===t.uid);if(i>=0){const [f]=s.extSpells.splice(i,1);if(f.virtual)break;delete f.inst.finishTo;delete f.inst.crystalFinish;delete f.inst.normalFinish;clear(f.inst,f.to);if(f.crystal&&f.to==='mana'){f.inst.faceDown=true;f.inst.tapped=false;s.players[f.owner].mana.push(f.inst);}else s.players[f.owner][f.to==='deck'?'deck':f.to==='mana'?'mana':'grave'].push(f.inst);}break;}
   default:if(!grave.run(s,t)&&!travel.run(s,t)&&!kenji.run(s,t)&&!lionel.run(s,t)&&!samurai.run(s,t)&&!gachi.run(s,t)&&!giant.run(s,t)&&!jaou.run(s,t)&&!zard.run(s,t)&&!hunter.run(s,t)&&!armored.run(s,t)&&!magic.run(s,t)&&!mecha.run(s,t)&&!kiyo.run(s,t)&&!gran.run(s,t)&&!gate.run(s,t)&&!galaxy.run(s,t)&&!gospel.run(s,t)&&!starter.run(s,t))throw Error('未実装の継続効果です：'+t.op);
  }
 }
 function revMatches(s,x,c){const r=c.rev;return !!r&&api.isCreature(s,x)&&(r.any|| (r.categories?r.categories.some(q=>String(card(x).race).includes(q)):r.race?String(card(x).race).includes(r.race):card(x).race.includes('ドラゴン')))&&(!r.nameIncludes||card(x).name.includes(r.nameIncludes))&&(!r.multicolor||colors(card(x)).length>1)&&cost(card(x))>=(r.min||0)&&(!r.colors||colors(card(x)).some(v=>r.colors.includes(v)));}
 function startSwap(s,t,uid,revolution){const incoming=s.players[t.p].hand.find(x=>x.uid===t.uid);if(incoming&&galaxy.entryWouldReplace(s,t.p,card(incoming),'hand')){log(s,t.p,'swapFailed','登場の置き換えにより入れ替えは実行されない',{cardId:t.source});return;}const old=nowCreature(s,t.p,uid);if(!old)return;if(card(old).starEvolution&&old.under?.length){log(s,t.p,'swapFailed','スター進化の構成カードすべては戻せないため入れ替えできない',{cardId:t.source});return;}const attack=s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(uid)?structuredClone(s.attack):null;put(s,{...t,op:'swapFinish',old:uid,tapped:old.tapped,attack,revolution});move(s,[{player:t.p,uid,to:'hand'}]);}
 function beginDiscardBatch(s,t,uids){const batchId=String(s.extDiscardSerial=(s.extDiscardSerial||0)+1);(s.extDiscardBatches??={})[batchId]={p:t.p,source:t.source,uids:[...uids],actual:0,randomDiscardAfter:t.randomDiscardAfter};put(s,{...t,op:'discardBatch',batchId,n:1,randomDiscardAfter:false});}
 function discardCard(s,t,x){
  remove(s.players[t.p].hand,x.uid);clear(x);s.players[t.p].grave.push(x);log(s,t.p,'discard',`${card(x).name}を手札から捨てる`,{cardId:x.cardId});
  afterDiscard(s,t,x,true);
 }
 function afterDiscard(s,t,x,discarded){
  travel.discarded(s,t,x,discarded);zard.discarded(s,t,x,discarded);magic.discarded(s,t,x,discarded);galaxy.discarded(s,t,x,discarded);gospel.discarded(s,t,x,discarded);
  const count=(t.discarded||0)+(discarded?1:0);if(t.batchId&&s.extDiscardBatches?.[t.batchId])s.extDiscardBatches[t.batchId].actual+=discarded?1:0;
  if(discarded){
   starter.discarded(s,t.p);
   if(t.costLock)put(s,task('tensaiCost',t.p,t.source,{discardId:x.cardId}));
   if(!s.players[t.p].discardedThisTurn){s.players[t.p].discardedThisTurn=true;for(const castle of s.players[t.p].shields)if(castle.faceUp&&card(castle).gCastle)enqueue(s,t.p,{uid:castle.uid,source:castle.cardId,effect:'extended',task:task('optionalDrawOne',t.p,castle.cardId)});}
   for(const y of creatures(s,1-t.p))if(effective(y,s).stealDiscardedSpell&&faces(card(x)).some(c=>c.type==='spell'))enqueue(s,1-t.p,{uid:y.uid,source:y.cardId,effect:'extended',task:task('stealSpell',1-t.p,y.cardId,{owner:t.p,uid:x.uid})});
  }
  if(t.batchId)put(s,{...t,op:'discardBatch'});else if(t.n>1)put(s,{...t,op:'discard',n:t.n-1,discarded:count});else if(t.randomDiscardAfter&&count)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:count,random:true}));
 }
 function chosen(s,t,value){const own=s.players[t.p];switch(t.op){
  case 'gsDeclare':s.triggers.gsUndeclared.shift();if(value)s.triggers.gsDeclared.push(t.uid);break;
  case 'gsTarget':if(value){const x=nowCreature(s,1-t.p,value);lock(s,t.p,{kind:'attack',player:1-t.p,uid:value,incarnation:x.incarnation||0,expires:'end',who:s.active});}break;
  case 'bottomOrder':{const x=remove(own.deck,value);own.deck.push(x);put(s,{...t,uids:t.uids.filter(x=>x!==value)});break;}
  case 'hyperCost':{const x=nowCreature(s,t.p,t.uid),other=nowCreature(s,t.p,value);if(x&&other){api.tap(s,t.p,other);x.hyperActive=true;x.hyperResolved=true;}break;}
  case 'optionalDrawOne':if(value)draw(s,t.p,1);break;
  case 'optionalLoot':if(value)put(s,task('draw',t.p,t.source,{n:t.n}),task('discard',t.p,t.source,{causedBy:t.p,n:1}));break;
  case 'discardSelect':if(value)put(s,{...t,selected:[...t.selected,value]});else beginDiscardBatch(s,t,t.selected);break;
  case 'discard':if(value)put(s,{...t,op:'discardChosen',uid:value});else if(t.randomDiscardAfter&&t.discarded)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:t.discarded,random:true}));break;
  case 'discardChosen':{const x=own.hand.find(x=>x.uid===t.uid);if(!x)break;if(value){remove(own.hand,x.uid);enter(s,t.p,x,null,{origin:'hand',execution:false});afterDiscard(s,t,x,false);if(card(x).discardBounce)put(s,task('bounceAny',t.p,x.cardId));}else discardCard(s,t,x);break;}
  case 'elementBounce':move(s,[{player:1-t.p,uid:value,to:'hand'}]);if(t.discardAfter)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1,random:true}));break;
  case 'jadowShield':{const x=shieldTo(s,t.p,value,'hand');if(x)gachi.shieldHand(s,t.p,x);put(s,...(x&&card(x).gStrike?[task('gsTarget',t.p,x.cardId)]:[]),task('destroyUntapped',t.p,t.source));break;}
  case 'destroyUntapped':move(s,[{player:1-t.p,uid:value,to:'grave'}]);break;
  case 'modes':put(s,{...t,remaining:t.remaining-1,selected:[...t.selected,value]});break;
  case 'powerMinus':{const x=nowCreature(s,1-t.p,value);if(x)(x.powerModifiers??=[]).push({amount:-4000,expires:'end',who:s.active});break;}
  case 'revive':if(value)put(s,task('putCreature',t.p,t.source,{uid:value,origin:'grave'}));break;
  case 'putCreature':{const x=t.execution?own[t.origin].find(x=>x.uid===t.uid):remove(own[t.origin],t.uid);if(x)if(t.execution)cast(s,t.p,x.uid,true,value||null,t.face||0,null,t.origin,'カードの能力');else enter(s,t.p,x,value||null,{origin:t.origin,execution:false});if(t.deckCheck)api.deckCheck(s,t.p);break;}
  case 'urEvolve':if(value){const x=remove(own.hand,value);enter(s,t.p,x,t.uid,{origin:'hand',execution:false});}break;
  case 'endJagan':if(value){const x=nowCreature(s,t.p,value);if(x){put(s,task('sameName',t.p,t.source,{nameId:x.cardId}));move(s,[{player:t.p,uid:x.uid,to:'hand'}]);}}break;
  case 'sameName':if(value)put(s,task('putCreature',t.p,t.source,{uid:value,origin:'hand'}));break;
  case 'execute':if(value){const x=own[t.origin||'hand'].find(x=>x.uid===value.uid);if(t.deploy)put(s,task('putCreature',t.p,t.source,{uid:value.uid,origin:t.origin||'hand'}));else{const c=faces(card(x))[value.face];if(x&&t.bottomAfter&&c.type==='spell')x.finishTo='deck';if(c.evolution||c.neoEvolution)put(s,task('putCreature',t.p,t.source,{uid:x.uid,origin:t.origin||'hand',execution:true,face:value.face}));else cast(s,t.p,value.uid,true,null,value.face,null,t.origin||'hand','カードの能力');}}else if(t.fallbackDraw)draw(s,t.p,t.fallbackDraw);break;
  case 'stealSpell':if(value){const x=remove(s.players[t.owner].grave,t.uid);if(x){x.cardOwner=t.owner;own.hand.push(x);const face=faces(card(x)).findIndex(c=>c.type==='spell');cast(s,t.p,x.uid,true,null,face,null,'hand','相手の墓地から');}}break;
  case 'kakuReturn':move(s,[{player:t.p,uid:t.uid,to:value}]);break;
  case 'tensaiCost':for(const x of creatures(s,1-t.p))if(faces(card(x)).some(c=>cost(c)===(value==='∞'?Infinity:Number(value))))for(const kind of ['attack','block'])lock(s,t.p,{kind,player:1-t.p,cost:value,uid:x.uid,incarnation:x.incarnation||0});break;
  case 'bounceAny':if(value){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===value));move(s,[{player:owner,uid:value,to:'hand'}]);}break;
  case 'recyclePlayer':put(s,{...t,op:'recycleSelect',owner:value,chosen:[]});break;
  case 'recycleSelect':if(value)put(s,{...t,chosen:[...t.chosen,value]});else put(s,{...t,op:'recycleOrder',p:t.owner,controller:t.p,count:t.chosen.length});break;
  case 'recycleOrder':{const x=remove(own.grave,value);if(x){clear(x);own.deck.push(x);}put(s,{...t,chosen:t.chosen.filter(x=>x!==value)});break;}
  case 'destroyCost':case 'destroyPower':if(value)move(s,[{player:1-t.p,uid:value,to:'grave'}]);break;
  case 'attackBlock':{const x=nowCreature(s,1-t.p,value);if(x)for(const kind of ['attack','block'])lock(s,t.p,{kind,player:1-t.p,uid:x.uid,incarnation:x.incarnation||0});break;}
  case 'shieldCreature':{const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===value));move(s,[{player:owner,uid:value,to:'shields'}]);break;}
  case 'ninjaDeclare':case 'revDeclare':put(s,{...t,remaining:t.remaining.slice(1),declared:value?[...t.declared,t.remaining[0]]:t.declared});break;
  case 'ninjaResolve':if(value){const x=own.hand.find(x=>x.uid===t.uid);if(value==='strike'){(s.attack.ninjaUsed??={})[t.p]={any:true,strike:true};cast(s,t.p,x.uid,true,null,0,null,'hand','ニンジャ・ストライク');const entered=nowCreature(s,t.p,t.uid);if(entered)entered.uraNinja={turn:s.turn,incarnation:entered.incarnation};for(const y of creatures(s,t.p))if(effective(y,s).ninjaDraw)enqueue(s,t.p,{uid:y.uid,source:y.cardId,effect:'extended',task:task('optionalDrawOne',t.p,y.cardId)});}else{(s.attack.ninjaUsed??={})[t.p]={...(s.attack.ninjaUsed?.[t.p]||{}),any:true};startSwap(s,t,value,false);}}break;
  case 'revResolve':if(value)startSwap(s,t,value,true);break;
  case 'darkFight':if(value){const x=nowCreature(s,t.p,t.uid),y=nowCreature(s,1-t.p,value);if(x&&y){(s.darkFights??={})[t.uid+'@'+(x.incarnation||0)]=s.turn;api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);}}break;
  default:if(!grave.chosen(s,t,value)&&!travel.chosen(s,t,value)&&!kenji.chosen(s,t,value)&&!lionel.chosen(s,t,value)&&!samurai.chosen(s,t,value)&&!gachi.chosen(s,t,value)&&!giant.chosen(s,t,value)&&!jaou.chosen(s,t,value)&&!zard.chosen(s,t,value)&&!hunter.chosen(s,t,value)&&!armored.chosen(s,t,value)&&!magic.chosen(s,t,value)&&!mecha.chosen(s,t,value)&&!kiyo.chosen(s,t,value)&&!gran.chosen(s,t,value)&&!gate.chosen(s,t,value)&&!galaxy.chosen(s,t,value)&&!gospel.chosen(s,t,value)&&!starter.chosen(s,t,value))throw Error('未実装の選択です：'+t.op);
 }}
 return {
  put,task,choice,lock,locked,beginGraveCast:grave.beginCast,beginGravePut:grave.beginPut,beginUra:grave.beginUra,uraBelow:grave.below,selectBreaker:travel.selectBreaker,broken:travel.broken,advanceAfterAttack:travel.advanceAfter,travelDecorate:travel.decorate,beginOni:kenji.beginOni,oniCards:kenji.oniCards,manaRedirect:kenji.manaRedirect,lionelPower:lionel.power,lionelDecorate:lionel.decorate,lionelState:lionel.stateCheck,samuraiPower:samurai.power,samuraiSpeed:samurai.speed,samuraiDiscount:samurai.discount,crossAction:samurai.crossAction,gearCleanup:samurai.cleanup,gearInherit:samurai.inherit,variants:samurai.variants,muteEntry:giant.muteEntry,deckSafe:gachi.deckSafe,shieldDeclarations:gachi.shieldDeclarations,allowedCard:giant.allowedCard,giantDiscount:giant.discount,replaceBattle:giant.replaceBattle,creatures,shieldTo,targetable,allowedSpell:(s,p,c)=>travel.allowedSpell(s,p)&&zard.allowedSpell(s,p,c)&&lionel.allowedSpell(s,p,c),forceActions:(s,p,out)=>hunter.forceActions(s,p,kiyo.forceActions(s,p,out)),spellShieldTrigger:kiyo.spellShieldTrigger,handMana(s,p,x){lionel.handMana(s,p,x);kiyo.handMana(s,p,x);},mechaDiscount:mecha.discount,canLeave:mecha.canLeave,shieldAdded:mecha.shieldAdded,beforeBreak:(s,p,uids)=>lionel.beforeBreak(s,p,uids)||magic.beforeBreak(s,p,uids)||mecha.beforeBreak(s,p,uids),advanceBreak:mecha.advanceBreak,inherit(s,base,x){travel.inherit(s,base,x);lionel.inherit(s,base,x);samurai.inherit(s,base,x);zard.inherit(s,base,x);armored.inherit(s,base,x);magic.inherit(s,base,x);},armoredDiscount:armored.discount,noLose:(s,p)=>armored.noLose(s,p)||hunter.noLose(s,p),hunterDiscount:hunter.discount,beforeNonActive(s){const w=s.g3Window;if(!w||w.done)return false;const added=jaou.beforeNonActive(s);if(w.done&&s.attack){const ninja=this.ninjaWindow(s,w.p);return added||ninja;}return added;},lossOptions(s,p){const old=hunter.lossOptions(s,p),johnny=lionel.lossOptions(s,p),more=[...johnny,...grave.lossOptions(s,p),...kenji.lossOptions(s,p),...jaou.lossOptions(s,p)];if(!more.length)return old;const out=[...old.filter(x=>x.value),...more];if(!johnny.length&&!old.some(x=>x.value?.kind==='diehard'))out.push(opt('置換せず敗北する',null,-1000));return out;},triggersAllowed:hunter.triggersAllowed,tapEntry:(s,p)=>armored.tapEntry(s,p)||lionel.tapEntry(s,p),beforeBattle:armored.beforeBattle,advanceAttackEnd(s){const a=s.attackLifecycle,x=a&&s.players[a.player].battle.find(x=>x.uid===a.uid&&(x.incarnation||0)===a.incarnation);magic.advanceAttackEnd(s);if(a&&!s.attackLifecycle){if(x)lionel.attackEnd(s,a,x);travel.attackEnd(s,a);}},magicDiscount:magic.discount,
  raceDiscount:galaxy.discount,granDiscount:gran.discount,played(s,p,c,inst,origin,permit){kenji.played(s,p,c,inst,origin,permit);giant.played(s,p,c,inst,origin,permit);armored.played(s,p,c,inst);magic.played(s,p,c);galaxy.played(s,p,c,inst,origin,permit);gran.played(s,p,c,inst,origin,permit);},spellCast(s,p,c,inst,origin,face=0){travel.spellCast(s,p);jaou.spellCast(s,p,c,inst,origin,face);zard.spellCast(s,p,c);gran.spellCast(s,p,c);kiyo.spellCast(s,p,c);},replaceEntry:galaxy.replaceEntry,
  nextDiscount:gospel.nextDiscount,summoned:gospel.summoned,beginAlternative(s,p,a){if(a.alternative==='joe')travel.beginJoe(s,p,a);else if(a.alternative==='fushigibirth')kenji.beginAlternative(s,p,a);else if(a.alternative==='hyperEnergy')armored.beginEnergy(s,p,a);else if(a.alternative==='gio')gate.beginAlternative(s,p,a);else gospel.beginAlternative(s,p,a);},start(s,p){return [...grave.start(s,p),...travel.start(s,p),...samurai.start(s,p),...giant.start(s,p),...jaou.start(s,p),...armored.start(s,p),...mecha.start(s,p),...gate.start(s,p),...gran.start(s,p)];},battleWins:(s,p,w)=>[...travel.battleWins(s,p,w),...gachi.battleWins(s,p,w),...giant.battleWins(s,p,w),...zard.battleWins(s,p,w),...gate.battleWins(s,p),...hunter.battleWins(s,p,w)],
  attackStart(s,p,x){jaou.attackStart(s,p,x);zard.attackStart(s,p,x);magic.attackStart(s,p,x);travel.attackStart(s,p,x);const remaining=s.players[p].hand.filter(y=>revMatches(s,x,card(y))).map(y=>y.uid);if(remaining.length)put(s,task('revDeclare',p,x.cardId,{remaining,declared:[],attacker:x.uid}));},
  attackTriggers(s,p,x){grave.attack(s,p,x);travel.attack(s,p,x);kenji.attack(s,p,x);samurai.attack(s,p,x);gachi.attack(s,p,x);giant.attack(s,p,x);hunter.attack(s,p,x);armored.attack(s,p,x);mecha.attack(s,p,x);kiyo.attack(s,p,x);gran.attack(s,p,x);gate.attack(s,p,x);galaxy.attack(s,p,x);gospel.attack(s,p,x);const c=effective(x,s);if(c.attackEffect&&!api.selfStopped(s,p))enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(c.effect==='graveRecycle'?'recyclePlayer':c.effect==='destroyMin'?'destroyMin':'tapAll',p,x.cardId)});},
  ninjaWindow(s,p){if(!s.attack)return false;const key=p+'@'+s.attack.stage;(s.attack.ninjaWindows??={});if(s.attack.ninjaWindows[key])return false;s.attack.ninjaWindows[key]=true;const remaining=s.players[p].hand.filter(x=>card(x).ninjaChange||card(x).ninjaStrike&&s.players[p].mana.length>=3&&s.players[p].mana.some(y=>api.manaColors(card(y),s,p).includes('水'))&&canEnter(s,p,card(x))).map(x=>x.uid);if(remaining.length){put(s,task('ninjaDeclare',p,s.players[p].hand.find(x=>x.uid===remaining[0]).cardId,{remaining,declared:[]}));return true;}return false;},
  tapped(s,p,x){if(effective(x,s).tapLoot)enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('optionalLoot',p,x.cardId,{n:2})});},
  leaveSnapshot(s,rows){return {hunter:hunter.leaveSnapshot(s,rows),armored:armored.leaveSnapshot(s,rows),starter:starter.leaveSnapshot(s,rows),kiyo:kiyo.leaveSnapshot(s,rows),mecha:mecha.leaveSnapshot(s,rows)};},
  leaving(s,p,x,enabled=!!effective(x,s).kakuLeave,snapshot,to='grave',destroy=true){kenji.leaving(s,p,x);hunter.leaving(s,p,x,snapshot?.hunter,to,destroy);armored.leaving(s,p,x,snapshot?.armored,to,destroy);starter.leaving(s,p,x,snapshot?.starter||snapshot);kiyo.leaving(s,p,x,snapshot?.kiyo,to);mecha.leaving(s,p,x,snapshot?.mecha);if(s.active!==p&&enabled)enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('optionalLoot',p,x.cardId,{n:1})});},
  shieldLeft(s,p,x){zard.shieldLeft(s,p,x);gate.shieldLeft(s,p,x);if(x.faceUp&&card(x).gCastle)enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('castleLeave',p,x.cardId)});},
  finishSpell(s,p,inst){(s.extSpells??=[]).push({inst,owner:inst.cardOwner??p,to:inst.normalFinish||inst.crystalFinish?'mana':inst.finishTo||'grave',crystal:!!inst.crystalFinish});},
  shieldHand(s,p,x,broken=false){lionel.shieldHand(s,p,x,broken);gachi.shieldHand(s,p,x);if(!broken&&card(x).gStrike)enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('gsTarget',p,x.cardId)});},
  reverseBreak(s,p,uids){const context=s.breakContext,attacker=context?.reverse?{cardId:context.source}:s.players[s.active].battle.find(x=>x.uid===s.attack?.attacker);if(!attacker||(!context?.reverse&&!effective(attacker,s).reverseBurn))return false;s.breakContext=null;const moved=[];for(const uid of uids){const x=removeShield(s,p,uid);if(x){clear(x);s.players[p].deck.push(x);moved.push(x.uid);}}put(s,task('bottomOrder',p,attacker.cardId,{uids:moved}),task('draw',s.active,attacker.cardId,{n:moved.length}),task('draw',p,attacker.cardId,{n:moved.length}));log(s,s.active,'reverseBurn','シールドを手札のかわりに山札の下へ置く（ブレイク数には数えない）',{cardId:attacker.cardId});return true;},
  mainActions(s,p){return [...travel.mainActions(s,p),...kenji.mainActions(s,p),...samurai.mainActions(s,p),...gachi.mainActions(s,p),...giant.mainActions(s,p),...armored.mainActions(s,p),...magic.mainActions(s,p),...gran.mainActions(s,p),...gate.mainActions(s,p),...galaxy.mainActions(s,p),...gospel.mainActions(s,p),...starter.mainActions(s,p),...creatures(s,p).filter(x=>effective(x,s).hyperTap&&!x.hyperActive&&creatures(s,p).some(y=>y.uid!==x.uid&&!y.tapped)).map(x=>({kind:'hyper',uid:x.uid,cardId:x.cardId,label:card(x).name+'をハイパー化する'}))];},
  hyper(s,p,uid){const x=nowCreature(s,p,uid);if(x)choice(s,task('hyperCost',p,x.cardId,{uid}),'ハイパー化のため他の1体をタップする',targetOptions(s,p,creatures(s,p).filter(y=>y.uid!==uid&&!y.tapped)));},
  effect:entryTask,
  resolve(s,e){if(e.task)put(s,e.task);},
  actions(s,d){return d.choices.map((x,index)=>({kind:'extended',...(d.task.op==='g9Number'?{number:x.value}:{}),label:x.label,choice:index,score:x.score,...(x.cardId?{cardId:x.cardId}:{})}));},
  step(s,a,d){s.decision=null;chosen(s,d.task,d.task.op==='g9Number'?a.number:d.choices[a.choice].value);},
  advance(s){if(s.lossEvent||s.judge?.stage==='compare'||s.decision||s.leaving||(s.battleResolution&&!s.battleResolution.gateWait)||s.winner!==null)return;let n=0;while(s.extTasks?.length&&!s.decision&&!s.leaving&&(!s.battleResolution||s.battleResolution.gateWait)&&s.winner===null){if(n++>0)break;if(n>200)throw Error('継続効果の処理が長すぎます');run(s,s.extTasks.shift());}},
  entry(s,p,inst,options={}){grave.entry(s,p,inst,options);travel.entry(s,p,inst,options);lionel.entry(s,p,inst,options);samurai.entry(s,p,inst,options);gachi.entry(s,p,inst,options);giant.entry(s,p,inst,options);hunter.entry(s,p,inst,options);armored.entry(s,p,inst,options);magic.entry(s,p,inst,options);mecha.entry(s,p,inst,options);kiyo.entry(s,p,inst,options);gran.entry(s,p,inst,options);starter.entry(s,p,inst,options);const c=card(inst);if(c.redUntap&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,inst))enqueue(s,p,{uid:inst.uid,source:c.id,effect:'extended',task:task('redUntap',p,c.id,{uid:inst.uid})});if(c.finalRev&&options.revolution&&!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,inst))enqueue(s,p,{uid:inst.uid,source:c.id,effect:'extended',task:task(c.finalRev==='burst'?'g3_Final':c.finalRev==='dark'?'finalDark':'finalLight',p,c.id)});if(api.isCreature(s,inst)){if(options.execution===false)for(const x of creatures(s,1-p))if(effective(x,s).kakuReturn)enqueue(s,1-p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('kakuReturn',p,x.cardId,{uid:inst.uid})});if(colors(c).length>1)for(const x of creatures(s,p))if(effective(x,s).darkEntryFight&&(!(options.selfMuted||api.selfStopped(s,p))||x.uid!==inst.uid)){const key=x.uid+'@'+(x.incarnation||0);if(s.darkTriggers?.[key]!==s.turn){(s.darkTriggers??={})[key]=s.turn;enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('darkFight',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})});}}for(const x of creatures(s,1-p))if(effective(x,s).opponentEntryDraw)enqueue(s,1-p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('optionalDrawOne',1-p,x.cardId)});}},
  drawn(s,p,n){const own=s.players[p],before=own.drawsThisTurn||0;own.drawsThisTurn=before+n;magic.drawn(s,p,before,n);for(let i=0;i<n;i++)if(before+i>=1)for(const x of creatures(s,1-p))if(effective(x,s).drawDiscard)enqueue(s,1-p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('discard',p,x.cardId,{causedBy:1-p,n:1})});},
  end(s){const bottom=[];for(const p of [0,1])for(const x of creatures(s,p))for(const y of layers(x))if(y.uraNinja?.turn===s.turn)bottom.push({player:p,uid:x.uid,source:y.cardId,effect:'extended',task:task('ninjaBottom',p,y.cardId,{uid:y.uid,incarnation:y.uraNinja.incarnation})});return [...travel.end(s),...samurai.end(s,s.active),...zard.end(s),...armored.end(s),...mecha.end(s),...gate.end(s),...galaxy.end(s),...bottom,...creatures(s,s.active).filter(x=>effective(x,s).endSameName&&x.tapped).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('endJagan',s.active,x.cardId,{uid:x.uid})}))];},
  expire(s,when,p){travel.expire(s,when,p);lionel.expire(s,when,p);samurai.expire(s,when,p);zard.expire(s,when,p);if(when==='end')s.g12NoLose=(s.g12NoLose||[]).filter(x=>x.turn!==s.turn);armored.expire(s,when,p);mecha.expire(s,when,p);if(when==='end')s.g5NextSummons=(s.g5NextSummons||[]).filter(x=>x.turn!==s.turn);for(const l of s.extLimits||[])if(when==='start'&&l.startsPlayer===p)l.active=true;s.extLimits=(s.extLimits||[]).filter(l=>!(l.expires===when&&l.who===p&&l.active!==false&&(l.afterTurns===undefined||s.players[p].turns>l.afterTurns)));if(when==='start')s.finalUsed=[false,false];for(const own of s.players){if(when==='start'){own.drawsThisTurn=0;own.brokenThisTurn=0;own.discardedThisTurn=false;}for(const x of own.battle){x.powerModifiers=(x.powerModifiers||[]).filter(l=>!(l.expires===when&&l.who===p));if(when==='start'&&own===s.players[p]){delete x.hyperActive;delete x.justDiverActive;}}}},
 };
}
