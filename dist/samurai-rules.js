// No.18: cross gears remain independent battlefield elements, linked by incarnation.
export function createSamuraiRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,cast,targetOptions}=api;
 const samurai=c=>String(c.race).includes('サムライ'),armored=c=>String(c.race).includes('アーマード'),dragon=c=>String(c.race).includes('ドラゴン');
 const gears=(s,p)=>s.players[p].battle.filter(x=>card(x).type==='gear');
 const live=(s,p,g)=>g.crossedTo&&s.players[p].battle.find(x=>x.uid===g.crossedTo.uid&&(x.incarnation||0)===g.crossedTo.incarnation&&api.isCreature(s,x));
 const attached=(s,p,x)=>gears(s,p).filter(g=>g.crossedTo?.uid===x.uid&&g.crossedTo.incarnation===(x.incarnation||0));
 const active=(s,g)=>!api.ignored(s,g);
 const optionalReducers=(s,p,c)=>c.type==='creature'&&(dragon(c)||samurai(c))?gears(s,p).filter(g=>card(g).zangeki&&active(s,g)&&!live(s,p,g)).length:0;
 const noReduce=(s,p)=>creatures(s,1-p).some(x=>effective(x,s).noCostReduction);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canUse=(s,p,c,origin)=>api.canCast(s,p,c)&&(c.type==='spell'||api.canEnter(s,p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 function cross(s,p,g,x){g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};api.log(s,p,'crossGear',card(g).name+'を'+card(x).name+'にクロス',{cardId:g.cardId,target:x.uid});}
 function freeCross(g,c){return c.type==='creature'&&(g.doss&&samurai(c)||g.zangeki&&c.name==='ボルメテウス・武者・ドラゴン');}
 const protect=(own,n)=>{const uids=own.deck.slice(0,n).map(x=>x.uid);(own.g18Protected??=[]).push(...uids);return uids;};
 const release=(own,uids)=>own.g18Protected=(own.g18Protected||[]).filter(uid=>!uids.includes(uid));
 function run(s,t){if(!t.op.startsWith('g18_'))return false;const own=s.players[t.p];switch(t.op){
 case'g18_Generate':choice(s,t,'侍流ジェネレートで手札のクロスギアを使う？',[...own.hand.filter(x=>card(x).type==='gear'&&canUse(s,t.p,card(x),'hand')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g18_Bui':choice(s,t,'自分のシールドを1つブレイクして6000以下を破壊する？',[...own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,creatures(s,1-t.p).some(x=>api.power(x,false,s)<=6000)?20:-5)),skip()]);break;
 case'g18_AfterBreak':if((own.brokenThisTurn||0)>t.before)put(s,task('destroyPower',t.p,t.source,{max:6000}));break;
 case'g18_Musashi':{const max=own.battle.filter(x=>colors(card(x)).includes('火')).length;choice(s,t,'火のエレメント数以下の相手エレメントを破壊（上限'+max+'）',targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>cost(card(x))<=max)));if(!s.decision)put(s,task('g18_MusashiDraw',t.p,t.source,{remaining:own.battle.filter(x=>colors(card(x)).includes('光')).length}));break;}
 case'g18_MusashiDraw':if(t.remaining>0)choice(s,t,'光のエレメント1つにつき1枚まで引く（残り'+t.remaining+'枚）',[opt('もう1枚引く',true,own.deck.length>1?10:-20),opt('ここまでで止める',null,0)]);break;
 case'g18_MusashiUse':{const max=own.hand.length,list=own.hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>!c.evolution&&!c.sMax&&(samurai(c)||armored(c))&&cost(c)<=max&&canUse(s,t.p,c,'hand')?[opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)]:[]));choice(s,t,'手札枚数以下のサムライ・アーマードを使う（上限'+max+'）',[...list,skip()]);break;}
 case'g18_Mekraid':{const uids=protect(own,3),list=uids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return faces(card(x)).flatMap((c,face)=>samurai(c)&&cost(c)<=5&&canUse(s,t.p,c,'deck')?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]);});choice(s,{...t,uids},'サムライ・メクレイド5：上3枚から1枚使う',[...list,skip()]);break;}
 case'g18_Use':{const x=own[t.origin].find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face||0];if(!x||!canUse(s,t.p,c,t.origin))break;if(c.evolution||c.neoEvolution)choice(s,t,'サムライの進化元を選ぶ',[...(c.neoEvolution?[opt('進化せずに出す',null,0)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId))]);else cast(s,t.p,x.uid,true,null,t.face||0,null,t.origin,t.reason||'サムライの能力');break;}
 case'g18_Order':{const remaining=t.remaining.filter(uid=>own.deck.some(x=>x.uid===uid));if(remaining.length<2){for(const uid of remaining){const x=remove(own.deck,uid);own.deck.push(x);}release(own,t.protected);break;}choice(s,{...t,remaining},'残りを山札の下へ置く順序を選ぶ',remaining.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g18_Maroku':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.isCreature(s,x)&&attached(s,t.p,x).length)put(s,{...t,op:'g18_Mekraid',maroku:true});break;}
 case'g18_FreeCross':{const g=own.battle.find(x=>x.uid===t.gear&&(x.incarnation||0)===t.gearInc);if(g&&card(g).type==='gear')choice(s,t,'メクレイドで出したクロスギアを無料でクロスする？',[...creatures(s,t.p).filter(x=>live(s,t.p,g)?.uid!==x.uid).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;}
 case'g18_AfterMekUse':{const g=own.battle.find(x=>x.uid===t.gear&&(x.zoneSerial||0)===t.serial&&card(x).type==='gear');if(g)put(s,{...t,op:'g18_FreeCross',gearInc:g.incarnation||0});break;}
 case'g18_Flash':put(s,task('g19Yobi',t.p,t.source,{max:6}),task('g18_FlashGrant',t.p,t.source));break;
 case'g18_FlashGrant':for(const x of creatures(s,t.p)){if(api.canUntap(x))x.tapped=false;(x.g18Blocker??=[]).push({who:t.p,cost:6});}break;
 case'g18_EndUntap':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.canUntap(x))x.tapped=false;break;}
 case'g18_ShiraLock':api.lock(s,t.p,{kind:'spellCostLock',player:1-t.p,max:5});break;
 default:throw Error('未実装のサムライ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g18_'))return false;const own=s.players[t.p];switch(t.op){
 case'g18_Generate':if(v)cast(s,t.p,v,true,null,0,null,'hand','侍流ジェネレート');break;
 case'g18_Bui':if(v){const before=own.brokenThisTurn||0;api.interruptBreak(s,t.p,[v],task('g18_AfterBreak',t.p,t.source,{before}));}break;
 case'g18_Musashi':put(s,task('g18_MusashiDraw',t.p,t.source,{remaining:own.battle.filter(x=>colors(card(x)).includes('光')).length}));if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g18_MusashiDraw':if(v){put(s,{...t,remaining:t.remaining-1});api.draw(s,t.p,1);}break;
 case'g18_MusashiUse':if(v)put(s,task('g18_Use',t.p,t.source,{origin:'hand',...v}));break;
 case'g18_Mekraid':{release(own,v?[v.uid]:[]);const x=v&&own.deck.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face||0];put(s,...(v?[task('g18_Use',t.p,t.source,{origin:'deck',...v,reason:'サムライ・メクレイド'})]:[]),...(t.maroku&&c?.type==='gear'?[task('g18_AfterMekUse',t.p,t.source,{gear:x.uid,serial:x.zoneSerial||0})]:[]),task('g18_Order',t.p,t.source,{remaining:t.uids.filter(uid=>uid!==v?.uid),protected:t.uids}));break;}
 case'g18_Use':cast(s,t.p,t.uid,true,v||null,t.face||0,null,t.origin,t.reason||'サムライの能力');break;
 case'g18_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v)});break;}
 case'g18_FreeCross':if(v){const g=own.battle.find(x=>x.uid===t.gear&&(x.incarnation||0)===t.gearInc),x=own.battle.find(x=>x.uid===v);if(g&&x&&api.isCreature(s,x))cross(s,t.p,g,x);}break;
 default:throw Error('未実装のサムライ選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){const op={samuraiBui:'g18_Bui',samuraiMusashi:'g18_Musashi',samuraiMekraid:'g18_Mekraid',samuraiFlash:'g18_Flash'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 cleanup(s){for(const p of[0,1])for(const g of gears(s,p))if(g.crossedTo&&!live(s,p,g))delete g.crossedTo;},
 inherit(s,base,x){if(base.g18Blocker)x.g18Blocker=structuredClone(base.g18Blocker);for(const p of[0,1])for(const g of attached(s,p,base))g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};},
 discount(s,p,c){const all=gears(s,p).filter(x=>active(s,x));return all.filter(x=>card(x).takion&&(c.type==='gear'||c.type==='creature'&&samurai(c))).length+Math.min(optionalReducers(s,p,c),c.g18Reducers??Infinity);},
 speed(s,p,x){const c=card(x);return c.type==='creature'&&(samurai(c)&&creatures(s,p).some(y=>!api.ignored(s,y)&&card(y).samuraiSpeed)||(dragon(c)||samurai(c))&&gears(s,p).some(g=>card(g).zangeki&&active(s,g)&&live(s,p,g)&&((q)=>dragon(q)||samurai(q))(card(live(s,p,g)))));},
 power(s,p,x){if(p<0||!api.isCreature(s,x))return 0;return attached(s,p,x).filter(g=>card(g).takion&&active(s,g)).length*1000+((dragon(card(x))||samurai(card(x)))?gears(s,p).filter(g=>card(g).zangeki&&active(s,g)&&live(s,p,g)&&((c)=>dragon(c)||samurai(c))(card(live(s,p,g)))).length*2000:0);},
 entry(s,p,x,options){const c=card(x);if(!options.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,x)){if(c.samuraiGenerate)on(s,p,x,'g18_Generate');if(c.shiroLock&&options.revolution)on(s,p,x,'g18_ShiraLock');}},
 attack(s,p,x){if(!api.selfStopped(s,p)){const c=effective(x,s);if(c.samuraiBui)on(s,p,x,'g18_Bui');if(c.samuraiMusashi)on(s,p,x,'g18_MusashiUse');}for(const g of attached(s,p,x))if(card(g).doss&&active(s,g))on(s,p,g,'g18_Mekraid');},
 end(s,p){return creatures(s,p).filter(x=>effective(x,s).samuraiEndUntap).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g18_EndUntap',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).maroku&&attached(s,p,x).length).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g18_Maroku',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 mainActions(s,p){const out=[];for(const g of gears(s,p))for(const x of creatures(s,p)){if(live(s,p,g)?.uid===x.uid)continue;const free=active(s,g)&&freeCross(card(g),card(x)),c={...card(g),crossing:true},n=free?0:api.summonCost(s,p,c);if(!free&&!api.canPay(s,p,c))continue;const existing=!!live(s,p,g),score=existing?-30:card(g).zangeki&&(dragon(card(x))||samurai(card(x)))?70:card(g).doss?30:10;out.push({kind:'crossGear',uid:g.uid,cardId:g.cardId,target:x.uid,cost:n,free,score:score+(!existing&&x.entered<s.turn&&!x.tapped?4:0),label:card(g).name+' → '+card(x).name+'にクロス（'+(free?'無料':n+'マナ')+'）'});}return out;},
 crossAction(s,p,a){const g=s.players[p].battle.find(x=>x.uid===a.uid),x=s.players[p].battle.find(x=>x.uid===a.target);if(!a.free)api.pay(s,p,{...card(g),crossing:true});cross(s,p,g,x);},
 variants(s,p,actions){const out=[...actions];if(noReduce(s,p))return out;for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.alternative||a.g18Reducers!==undefined)continue;const c=faces(card(a.cardId))[a.face||0],max=optionalReducers(s,p,c);for(let n=0;n<max;n++){const payment={...c,summonOrigin:a.origin||'hand',g18Reducers:n,...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{})};if(api.canPay(s,p,payment))out.push({...a,g18Reducers:n,cost:api.summonCost(s,p,payment),label:c.name+'をザンゲキの軽減'+n+'回で使う'});}}return out;},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const top of own.battle)for(const x of api.layers(top))x.g18Blocker=(x.g18Blocker||[]).filter(v=>v.who!==p);},
 };
}
