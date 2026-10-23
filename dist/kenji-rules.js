// No.25: grave/mana summons, ultimate evolution and physical-card replacements.
export function createKenjiRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move,targetOptions}=api;
 const evo=c=>!!(c.evolution||c.sMax),key=x=>x.uid+'@'+(x.incarnation||0);
 const canPut=(s,p,x,origin)=>!x.faceDown&&card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,...more})});
 function ramp(s,p,n){for(let i=0;i<n&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);api.addZone(s,s.players[p],to,x);}api.deckCheck(s,p);}}
 function oniCards(s,p,excluded=[]){return s.players[p].battle.flatMap(top=>api.layers(top).filter(x=>!x.faceDown&&!excluded.includes(x.uid)&&(x!==top||api.canLeave(s,p,top))).map(x=>({x,top})));}
 function beginOni(s,p,uid,mode='loss',selected=[]){
  const reserved=mode==='leave'?s.leaving.rows.flatMap(r=>r.plan?.kind==='oni'?r.plan.cards:[]):[];
  if(selected.length===3){s.decision=null;if(mode==='leave'){const row=s.leaving.rows.find(r=>r.player===p&&r.uid===uid);row.plan={kind:'oni',cards:selected};}else{api.destroyReplacementCards(s,p,selected);api.completeLossReplacement(s);}return;}
  const xs=oniCards(s,p,[...reserved,...selected]);
  choice(s,task('g25_Oni',p,card(s.players[p].battle.find(x=>x.uid===uid)).id,{uid,mode,selected}),'鬼S-MAX：かわりに破壊する表向きのカード（'+selected.length+'/3）',[...xs.map(({x,top})=>opt(card(x).name+(x!==top?'（'+card(top).name+'の下）':''),x.uid,50-cost(card(x))-(x===top?15:0),x.cardId)),opt('選び直す',null,-100)]);
 }
 function fushiPayable(s,p,c,b){const own=s.players[p],raw=card(b);if(!api.canLeave(s,p,b)||b.exLifeShieldUid&&own.shields.some(x=>x.uid===b.exLifeShieldUid)||raw.gNeo&&b.under?.length)return api.canPay(s,p,c);const kept=raw.starEvolution&&b.under?.length?[b.under[0]]:[],virtual={...s,players:s.players.map((own,i)=>i===p?{...own,battle:own.battle.flatMap(x=>x.uid===b.uid?kept:[x])}:own)};return api.canPay(virtual,p,c);}
 function assignable(s,p,ids,bases){if(!ids.length)return true;const x=s.players[p].mana.find(x=>x.uid===ids[0]);if(!x)return assignable(s,p,ids.slice(1),bases);const c=card(x);return !c.evolution?assignable(s,p,ids.slice(1),bases):api.evolutionBases(s,p,c).some(b=>bases.includes(b.uid)&&assignable(s,p,ids.slice(1),bases.filter(uid=>uid!==b.uid)));}
 function run(s,t){if(!t.op.startsWith('g25_'))return false;const own=s.players[t.p];switch(t.op){
 case'g25_Crymax':put(s,...[s.active,1-s.active].map(p=>task('g25_KeepShields',p,t.source,{kept:[]})));break;
 case'g25_KeepShields':if(own.shields.length<=3)break;if(t.kept.length===3){for(const x of [...own.shields])if(!t.kept.includes(x.uid)){api.moveShield(s,t.p,x.uid,'grave');}break;}choice(s,t,'CRYMAX：残す自分のシールドを3枚選ぶ（'+t.kept.length+'/3）',own.shields.filter(x=>!t.kept.includes(x.uid)).map(x=>opt('シールド'+(own.shields.indexOf(x)+1),x.uid,0)));break;
 case'g25_CryAttack':put(s,task('destroyCost',t.p,t.source,{max:Number.MAX_SAFE_INTEGER,optional:false}),task('discard',1-t.p,t.source,{causedBy:t.p,n:2,random:true}));break;
 case'g25_Dida':for(const x of s.players[1-t.p].hand.splice(0)){clear(x,'mana');s.players[1-t.p].mana.push(x);api.handMana(s,1-t.p,x);}break;
 case'g25_Mill':{const ids=own.deck.slice(0,3).map(x=>x.uid);put(s,task('g25_Milled',t.p,t.source,{uids:ids}));api.mill(s,t.p,3);break;}
 case'g25_Milled':{const list=own.grave.filter(x=>t.uids.includes(x.uid)&&canPut(s,t.p,x,'grave'));choice(s,t,'今墓地に置いた3枚からクリーチャーを1体出す',list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
 case'g25_Plan':case'g25_Heart':{const uids=own.deck.slice(0,t.op==='g25_Plan'?6:4).map(x=>x.uid);(own.g25Protected??=[]).push(...uids);if(t.op==='g25_Heart')choice(s,{...t,uids},'上4枚から進化クリーチャーを1枚手札に加える？',[...uids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>evo(card(x))).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);else{const take=uids.filter(uid=>evo(card(own.deck.find(x=>x.uid===uid))));for(const uid of take){const x=remove(own.deck,uid);clear(x,'hand');own.hand.push(x);}put(s,task('g25_Order',t.p,t.source,{uids:uids.filter(uid=>!take.includes(uid)),protected:uids}));api.deckCheck(s,t.p);}break;}
 case'g25_Order':{const ids=t.uids.filter(uid=>own.deck.some(x=>x.uid===uid));if(ids.length<=1){for(const uid of ids)own.deck.push(remove(own.deck,uid));own.g25Protected=(own.g25Protected||[]).filter(uid=>!t.protected.includes(uid));break;}choice(s,{...t,uids:ids},'残りを山札の下に置く順序を選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g25_Pegasus':choice(s,t,'ギュンター：山札の上から何枚マナに置く？',Array.from({length:Math.min(3,own.deck.length)+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*5:-100)));break;
 case'g25_PegPick':{const bases=[...own.battle,...own.grave].map(x=>x.uid),selected=t.selected||[];choice(s,{...t,selected},'マナから出すクリーチャーをすべて選ぶ（'+selected.length+'体）',[...own.mana.filter(x=>!selected.includes(x.uid)&&canPut(s,t.p,x,'mana')&&(!own.entryLimitThisTurn||!selected.length)&&assignable(s,t.p,[...selected,x.uid],bases)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),opt('選択を確定する',null,0)]);break;}
 case'g25_PegUse':{if(!t.selected.length){delete s.g25DeployBatch;break;}const bases=t.bases.filter(uid=>[...own.battle,...own.grave].some(x=>x.uid===uid)),list=own.mana.filter(x=>t.selected.includes(x.uid)&&canPut(s,t.p,x,'mana'));if(!list.length){delete s.g25DeployBatch;break;}choice(s,{...t,bases},'同時に出すクリーチャーの進化元・処理順を選ぶ',list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;}
 case'g25_PegEnter':{const x=own.mana.find(x=>x.uid===t.target);if(!x)break;const remaining=t.selected.filter(uid=>uid!==t.target),bases=api.evolutionBases(s,t.p,card(x)).filter(b=>t.bases.includes(b.uid)&&assignable(s,t.p,remaining,t.bases.filter(uid=>uid!==b.uid)));if(card(x).evolution)choice(s,t,'同時展開する進化元を選ぶ',bases.map(x=>opt(card(x).name,x.uid,5,x.cardId)));else pegEnter(s,t,null);break;}
 case'g25_Put':{const x=own[t.origin].find(x=>x.uid===t.target);if(!x||!canPut(s,t.p,x,t.origin))break;const c=card(x);if(c.evolution)choice(s,t,'進化元を選ぶ',api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId)));else deploy(s,t,null);break;}
 case'g25_ReturnMana':choice(s,t,'ズンドコ：マナから1枚手札に戻す',own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g25_FushiAfter':{const x=own.grave.find(x=>x.uid===t.uid);if(x&&api.canPay(s,t.p,{...card(x),cost:t.payment,printedCost:card(x).cost,summonOrigin:'grave'}))cast(s,t.p,x.uid,false,null,0,{cost:t.payment},'grave','フシギバース');break;}
 default:throw Error('未実装のケンジ効果：'+t.op);
 }return true;}
 function pegEnter(s,t,base){put(s,task('g25_PegUse',t.p,t.source,{selected:t.selected.filter(uid=>uid!==t.target),bases:t.bases.filter(uid=>uid!==base)}));deploy(s,{...t,origin:'mana',ignoreEntry:true},base);}
 function deploy(s,t,base){const own=s.players[t.p],x=remove(own[t.origin],t.target);if(!x)return;enter(s,t.p,x,base,{origin:t.origin,execution:false,ignoreEntry:!!t.ignoreEntry,...(t.ignoreEntry?{graveCandidates:t.bases,graveReserve:(t.selected||[]).filter(uid=>uid!==t.target&&own.mana.some(y=>y.uid===uid&&card(y).graveEvolution)).length}:{})});}
 function chosen(s,t,v){if(!t.op.startsWith('g25_'))return false;const own=s.players[t.p];switch(t.op){
 case'g25_KeepShields':put(s,{...t,kept:[...t.kept,v]});break;
 case'g25_Milled':put(s,task('g25_Put',t.p,t.source,{target:v,origin:'grave'}));break;
 case'g25_Heart':if(v){const x=remove(own.deck,v);clear(x,'hand');own.hand.push(x);}put(s,task('g25_Order',t.p,t.source,{uids:t.uids.filter(uid=>uid!==v),protected:t.uids}));if(v)api.deckCheck(s,t.p);break;
 case'g25_Order':own.deck.push(remove(own.deck,v));put(s,{...t,uids:t.uids.filter(uid=>uid!==v)});break;
 case'g25_Pegasus':put(s,task('g25_PegPick',t.p,t.source));ramp(s,t.p,v);break;
 case'g25_PegPick':if(v)put(s,{...t,selected:[...t.selected,v]});else if(t.selected.length){s.g25DeployBatch=true;put(s,task('g25_PegUse',t.p,t.source,{selected:t.selected,bases:[...own.battle,...own.grave].map(x=>x.uid)}));}break;
 case'g25_PegUse':put(s,{...t,op:'g25_PegEnter',target:v});break;
 case'g25_PegEnter':pegEnter(s,t,v);break;
 case'g25_Put':deploy(s,t,v);break;
 case'g25_ReturnMana':{const x=remove(own.mana,v);if(x){clear(x,'hand');own.hand.push(x);}break;}
 case'g25_Oni':if(v)beginOni(s,t.p,t.uid,t.mode,[...t.selected,v]);else if(t.selected.length)beginOni(s,t.p,t.uid,t.mode,[]);else if(t.mode==='leave'){const r=s.leaving.rows.find(x=>x.uid===t.uid&&x.player===t.p);s.decision={type:'leaveReplace',player:t.p,uid:t.uid,mandatory:!!(r.ex||r.gneo||r.star||r.to==='mana'&&api.manaRedirect(s,t.p))};}else s.decision=null;break;
 default:throw Error('未実装のケンジ選択：'+t.op);
 }return true;}
 return {run,chosen,beginOni,oniCards,manaPermits(s,p){return creatures(s,p).filter(x=>effective(x,s).gaiaMana&&s.g25ManaUsed?.[key(x)]!==s.turn).map(x=>'g25:'+key(x));},
 effect(s,p,c,uid){const op={kenjiCrymax:'Crymax',kenjiDida:'Dida',kenjiMill:'Mill',kenjiPlan:'Plan',kenjiHeart:'Heart'}[c.effect];if(!op)return false;put(s,task('g25_'+op,p,c.id,{uid}));return true;},
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.oniMax)on(s,p,x,'g25_CryAttack');if(c.pegasus)on(s,p,x,'g25_Pegasus');},
 leaving(s,p,x){if(effective(x,s).zundokoLeave)on(s,p,x,'g25_ReturnMana');},
 manaRedirect(s,p){return s.active===p&&creatures(s,1-p).some(x=>effective(x,s).ningyo);},
 lossOptions(s,p){return oniCards(s,p).length>=3?creatures(s,p).filter(x=>effective(x,s).oniMax).map(x=>opt(card(x).name+'：表向きのカード3枚を破壊して敗北を回避',{kind:'oni',uid:x.uid},50,x.cardId)):[];},
 mainActions(s,p){const own=s.players[p],out=[],authorities=creatures(s,p).filter(x=>effective(x,s).gaiaMana&&s.g25ManaUsed?.[key(x)]!==s.turn);
  for(const origin of['grave','mana'])for(const x of own[origin]){const c=card(x);if(c.type!=='creature'||origin==='grave'&&!c.graveSummon||origin==='mana'&&!authorities.length||!api.canCast(s,p,c)||!api.canEnter(s,p,c,{origin,execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length||!api.canPay(s,p,{...c,summonOrigin:origin}))continue;for(const permit of origin==='mana'?authorities.map(key):[null])out.push({kind:'play',origin,uid:x.uid,cardId:c.id,cost:api.summonCost(s,p,{...c,summonOrigin:origin}),manaPermit:permit&&'g25:'+permit,label:(origin==='grave'?'墓地':'マナ')+'から'+c.name+'を召喚'});}
  for(const x of own.grave.filter(x=>card(x).fushigibirth))if(api.canCast(s,p,card(x))&&api.canEnter(s,p,card(x),{origin:'grave',execution:true}))for(const b of creatures(s,p)){const n=Math.max(card(x).fushiMin??2,card(x).fushigibirth-cost(card(b))),pay={...card(x),cost:n,printedCost:card(x).cost,summonOrigin:'grave'};if(fushiPayable(s,p,pay,b))out.push({kind:'play',alternative:'fushigibirth',origin:'grave',uid:x.uid,cardId:x.cardId,fushiBase:b.uid,cost:api.summonCost(s,p,pay),label:card(b).name+'をタップしてマナへ置き、'+card(x).name+'をフシギバースで召喚'});}
  return out;
 },
 beginAlternative(s,p,a){const b=s.players[p].battle.find(x=>x.uid===a.fushiBase),x=s.players[p].grave.find(x=>x.uid===a.uid);if(!b||!x)return;const payment=Math.max(card(x).fushiMin??2,card(x).fushigibirth-cost(card(b)));put(s,task('g25_FushiAfter',p,x.cardId,{uid:x.uid,payment}));api.tap(s,p,b);move(s,[{player:p,uid:b.uid,to:'mana',tapped:true,destroy:false}]);},
 played(s,p,c,x,origin,permit){if(origin==='mana'&&permit?.startsWith('g25:'))(s.g25ManaUsed??={})[permit.slice(4)]=s.turn;},
 };
}
