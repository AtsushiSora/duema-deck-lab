// No.09: Magic spells, resolution-time declarations and first-attack continuations.
export function createMagicRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,draw,move,cast,targetOptions}=api;
 const magic=c=>String(c.race).includes('マジック'),key=x=>x.uid+'@'+(x.incarnation||0);
 const reducers=(s,p,c)=>magic(c)&&!creatures(s,1-p).some(x=>effective(x,s).noCostReduction)?creatures(s,p).filter(x=>effective(x,s).magicDiscount&&(s.g9DiscountUsed||{})[key(x)]!==s.turn):[];
 const selected=(s,p,c)=>reducers(s,p,c).filter(x=>!c.magicReducers||c.magicReducers.includes(key(x)));
 const on=(s,p,source,op,more={})=>api.enqueue(s,p,{source,effect:'extended',task:task(op,p,source,more)});
 function grant(s,p,uid,source,speed=true){const x=creatures(s,p).find(x=>x.uid===uid);if(!x)return;if(speed)(x.g9Speed??=[]).push({turn:s.turn,cost:faces(card(source)).find(c=>c.type==='spell').cost,spellSource:source});(x.g9Untap??=[]).push({turn:s.turn,cost:faces(card(source)).find(c=>c.type==='spell').cost,source,spellSource:source});}
 function numberChoice(s,t){const publicCosts=s.players[1-t.p].battle.flatMap(x=>[cost(card(x))]),values=[...new Set([0,1,2,3,4,5,6,7,8,9,10,...publicCosts.map(x=>Number.isFinite(x)?x:'∞'),'∞'])];choice(s,t,'宣言する数字を選ぶ（数字の入力もできます）',values.map(value=>opt(String(value)+'を宣言',value,s.players[1-t.p].battle.reduce((n,x)=>n+(cost(card(x))===(value==='∞'?Infinity:value)?10:0),0))));}
 function run(s,t){if(!t.op.startsWith('g9'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g9Number':numberChoice(s,t);break;
  case'g9Napo':{const id=String(s.g9Serial=(s.g9Serial||0)+1);(s.g9Discards??={})[id]=0;put(s,task('discard',t.p,t.source,{causedBy:t.p,n:2,optional:true,magicKey:id}),task('g9NapoDraw',t.p,t.source,{key:id}));break;}
  case'g9NapoDraw':{const n=s.g9Discards[t.key]||0;delete s.g9Discards[t.key];draw(s,t.p,n+1);break;}
  case'g9SmallDestroy':move(s,opp.battle.filter(x=>cost(card(x))<=2).map(x=>({player:1-t.p,uid:x.uid,to:'grave'})));break;
  case'g9FireModes':if(!t.remaining)put(s,...[...t.selected].sort((a,b)=>a-b).map(mode=>task('g9FireMode',t.p,t.source,{mode})));else choice(s,t,'使う効果を選ぶ（同じ効果も選べます・あと'+t.remaining+'つ）',['手札からコスト3以下のクリーチャーを出す','自分の1体にスピードアタッカーを与える','自分の1体を最初の攻撃の終わりにアンタップ'].map((label,value)=>opt(label,value,value===0&&own.hand.some(x=>card(x).type==='creature'&&cost(card(x))<=3)?25:5)));break;
  case'g9FireMode':if(t.mode===0)put(s,task('execute',t.p,t.source,{origin:'hand',max:3,creatureOnly:true,deploy:true,optional:false}));else choice(s,t,t.mode===1?'スピードアタッカーを与えるクリーチャーを選ぶ':'最初の攻撃の終わりにアンタップするクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,t.p)));break;
  case'g9Peecap':choice(s,t,'スピードアタッカーと攻撃後のアンタップを与える1体を選ぶ',targetOptions(s,t.p,creatures(s,t.p)));break;
  case'g9Hime':choice(s,t,'他のマジックをタップして呪文面を唱える？',[...creatures(s,t.p).filter(x=>x.uid!==t.uid&&!x.tapped&&magic(card(x))).map(x=>opt(card(x).name,x.uid,15,x.cardId)),skip()]);break;
  case'g9Bounce':{const list=opp.battle.filter(x=>!t.selected.includes(x.uid));if(t.selected.length===2||!list.length){move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'hand'})));break;}choice(s,t,'手札に戻す相手のエレメントを2つまで選ぶ',[...targetOptions(s,t.p,list),opt('ここまでで確定',null,0)]);break;}
  case'g9Karaku':choice(s,t,'1枚引いて、コスト3以下の呪文を唱える？',[opt('1枚引く',true,own.deck.length>1?15:-10),skip()]);break;
  case'g9Kaku':{const list=['hand','grave'].flatMap(origin=>own[origin].flatMap(x=>faces(card(x)).map((c,face)=>({x,c,face,origin})))).filter(({c,origin})=>c.type==='spell'&&cost(c)<=own.mana.length&&api.canCast(s,t.p,c,origin));choice(s,t,'ブレイク前に唱える呪文を選ぶ（現在'+own.mana.length+'マナ）',[...list.map(({x,c,face,origin})=>opt((origin==='grave'?'墓地：':'手札：')+c.name,{uid:x.uid,face,origin},20+cost(c),x.cardId)),skip()]);break;}
  case'g9Untap':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.canUntap(x)&&!api.spellIgnored(s,{type:'spell',cost:t.cost,spellSource:t.source})){x.tapped=false;api.log(s,t.p,'untap','最初の攻撃の終わりに'+card(x).name+'をアンタップ',{cardId:t.source});}break;}
  default:throw Error('未実装のマジック効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g9'))return false;const own=s.players[t.p];switch(t.op){
  case'g9Number':{const scope=String(s.g9Serial=(s.g9Serial||0)+1),field=t.family==='ignore'?'g9IgnoreScopes':'g9LockScopes';for(const x of s.players[1-t.p].battle)if(!x.sealed&&(t.family==='ignore'||api.isCreature(s,x)))(x[field]??=[]).push(scope);api.lock(s,t.p,{kind:t.family==='ignore'?'numberIgnore':'numberLock',player:1-t.p,cost:value,scope,creatureSource:t.family==='shuffle'});if(t.family==='ignore'||t.family==='shuffle')api.lock(s,t.p,{kind:'numberCast',player:1-t.p,cost:value,creatureSource:t.family==='shuffle'});api.log(s,t.p,'declare',String(value)+'を宣言',{cardId:t.source});break;}
  case'g9FireModes':put(s,{...t,remaining:t.remaining-1,selected:[...t.selected,value]});break;
  case'g9FireMode':if(t.mode===1){const x=own.battle.find(x=>x.uid===value);if(x)(x.g9Speed??=[]).push({turn:s.turn,cost:faces(card(t.source)).find(c=>c.type==='spell').cost,spellSource:t.source});}else grant(s,t.p,value,t.source,false);break;
  case'g9Peecap':grant(s,t.p,value,t.source);break;
  case'g9Hime':if(value){const x=creatures(s,t.p).find(x=>x.uid===value&&!x.tapped&&magic(card(x)));if(x){api.tap(s,t.p,x);api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source,'マジック・フレンド・バースト');}}break;
  case'g9Bounce':if(value)put(s,{...t,selected:[...t.selected,value]});else move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'hand'})));break;
  case'g9Karaku':if(value){put(s,task('execute',t.p,t.source,{origin:'hand',max:3,spellOnly:true}));draw(s,t.p,1);}break;
  case'g9Kaku':if(value){const x=own[value.origin].find(x=>x.uid===value.uid);if(x){x.finishTo='deck';cast(s,t.p,x.uid,true,null,value.face,null,value.origin,'カクメイジン');}}break;
  default:throw Error('未実装のマジック選択：'+t.op);
 }return true;}
 return {run,chosen,reducers,
  effect(s,p,c,uid,entry){switch(c.effect){case'magicNapo':put(s,task('g9Napo',p,c.id));break;case'magicSmallDestroy':put(s,task('g9SmallDestroy',p,c.id));break;case'magicIgnore':put(s,task('draw',p,c.id,{n:1}),task('g9Number',p,c.id,{family:'ignore'}));break;case'magicNumberLock':put(s,task('g9Number',p,c.id,{family:c.g37Role==='shuffle'?'shuffle':'lock'}));break;case'magicFire':put(s,task('g9FireModes',p,c.id,{remaining:2,selected:[]}));break;case'magicKaraku':put(s,task('g9Karaku',p,c.id));break;case'magicHime':put(s,task('g9Hime',p,c.id,{uid,incarnation:entry?.incarnation||0}));break;case'magicBounce':put(s,task('g9Bounce',p,c.id,{selected:[]}));break;case'magicPeecap':put(s,task('g9Peecap',p,c.id));break;case'magicDraw':draw(s,p,1);break;default:return false;}return true;},
  discount:(s,p,c)=>selected(s,p,c).length+(c.magicOwnDiscount&&creatures(s,p).some(x=>magic(card(x)))?1:0),
  played(s,p,c){for(const x of selected(s,p,c))(s.g9DiscountUsed??={})[key(x)]=s.turn;},
  discarded(s,t){if(t.magicKey)s.g9Discards[t.magicKey]++;},
  mainActions(s,p){const out=[];for(const x of s.players[p].hand)for(const[face,c]of faces(card(x)).entries()){const ids=reducers(s,p,c).map(key);if(!ids.length||!api.canCast(s,p,c)||c.type!=='spell'&&!api.canEnter(s,p,c,{origin:'hand',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length)continue;const subsets=ids.reduce((all,k)=>[...all,...all.map(a=>[...a,k])],[[]]);for(const magicReducers of subsets.filter(a=>a.length!==ids.length)){const pay={...c,magicReducers};if(api.canPay(s,p,pay))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,magicReducers,cost:api.summonCost(s,p,pay),label:c.name+'を軽減の使用先を選んで使う'});}}return out;},
  entry(s,p,x,options){if(!api.isCreature(s,x))return;for(const y of creatures(s,1-p))if(effective(y,s).bonKigo){api.lock(s,1-p,{kind:'attack',player:p,uid:x.uid,incarnation:x.incarnation||0,expires:'end',who:s.active});if(!options.costPaid)on(s,1-p,y.cardId,'optionalDrawOne');}},
  drawn(s,p,before,n){if(p===s.active)for(let i=0;i<n;i++)if(before+i>=1)for(const x of creatures(s,1-p))if(effective(x,s).himeDraw)on(s,1-p,x.cardId,'optionalDrawOne');},
  beforeBreak(s,defender,uids){const context=s.breakContext;if(!context||context.g19Prepared||defender===context.player&&!context.g14Self)return false;const x=s.players[context.player].battle.find(x=>x.uid===context.sourceUid);if(!x||!effective(x,s).kakumeijin)return false;context.g19Prepared=true;put(s,...uids.map(()=>task('g9Kaku',context.player,x.cardId)),task('g19BeforeCommit',context.player,x.cardId,{defender,uids:[...uids],context:structuredClone(context)}));return true;},
  attackStart(s,p,x){const count=x.g9AttackTurn===s.turn?(x.g9AttackCount||0)+1:1;x.g9AttackTurn=s.turn;x.g9AttackCount=count;s.attackLifecycle={player:p,uid:x.uid,incarnation:x.incarnation||0,number:count};},
  inherit(s,base,x){for(const field of['g9IgnoreScopes','g9LockScopes','g9Speed','g9Untap'])if(base[field])x[field]=structuredClone(base[field]);x.g9AttackTurn=base.g9AttackTurn;x.g9AttackCount=base.g9AttackCount;if(s.attackLifecycle?.uid===base.uid)s.attackLifecycle={...s.attackLifecycle,uid:x.uid,incarnation:x.incarnation||0};},
  swapped(s,old,x){if(s.attackLifecycle?.uid===old){x.g9AttackTurn=s.turn;x.g9AttackCount=1;s.attackLifecycle={...s.attackLifecycle,uid:x.uid,incarnation:x.incarnation||0,number:1};}},
  advanceAttackEnd(s){const a=s.attackLifecycle;if(!a||s.attack||s.decision||s.pendingEffects?.length||s.extTasks?.length||s.triggers||s.judge||s.leaving||s.battleResolution||s.attackDeclarations||s.g19BreakSequence||s.g19Interrupt||s.breakContext||s.winner!==null)return;delete s.attackLifecycle;const x=s.players[a.player].battle.find(x=>x.uid===a.uid&&(x.incarnation||0)===a.incarnation);if(x&&a.number===1)for(const g of x.g9Untap||[])if(g.turn===s.turn&&!api.spellIgnored(s,{type:'spell',cost:g.cost,spellSource:g.source}))on(s,a.player,g.source,'g9Untap',{uid:x.uid,incarnation:x.incarnation||0,cost:g.cost,spellSource:g.source});},
 };
}
