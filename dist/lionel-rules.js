// No.15: seed/evolution play, Star reconstruction and S-MAX state checks.
export function createLionelRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,cast,enter,move,draw,targetOptions}=api;
 const rex=c=>String(c.race).includes('レクスターズ'),joker=c=>String(c.race).includes('ジョーカーズ');
 const seed=(s,x)=>effective(x,s).type==='seed';
 const allTypes=(s,p)=>s.players[p].battle.filter(x=>api.isCreature(s,x)||seed(s,x));
 const canUse=(s,p,c,origin)=>api.canCast(s,p,c)&&(c.type==='spell'||api.canEnter(s,p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 const evolve=c=>!!(c.evolution||c.sMax);
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function run(s,t){if(!t.op.startsWith('g15_'))return false;const own=s.players[t.p];switch(t.op){
 case'g15_Star':put(s,task('draw',t.p,t.source,{n:1}),task('g15_LightSeed',t.p,t.source));break;
 case'g15_LightSeed':choice(s,t,'手札から光のタマシードを1枚出す？',[...own.hand.filter(x=>card(x).type==='seed'&&colors(card(x)).includes('光')&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false})).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g15_StarEvo':if(s.g15StarUsed?.[t.key]!==s.turn)choice(s,t,'ライオネル：手札からコスト6以下の進化を出す？（各ターン1回）',[...own.hand.filter(x=>evolve(card(x))&&cost(card(x))<=6&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g15_Peace':if(t.remaining)choice(s,t,'理想と平和：残り'+t.remaining+'回（同じ能力も選べます）',[opt('上2枚の光・水を手札へ','look',own.hand.length<5?20:8),opt('山札の上1枚をシールド化','shield',own.shields.length<5?14:6),opt('コスト3以下のエレメントをシールド化','element',s.players[1-t.p].battle.some(x=>cost(card(x))<=3)?22:-2)]);break;
 case'g15_Look':{const uids=own.deck.slice(0,2).map(x=>x.uid),take=uids.filter(uid=>faces(card(own.deck.find(x=>x.uid===uid))).some(c=>colors(c).some(v=>['光','水'].includes(v))));for(const uid of take){const x=remove(own.deck,uid);api.clear(x,'hand');own.hand.push(x);}put(s,task('g15_Order',t.p,t.source,{remaining:uids.filter(uid=>!take.includes(uid))}));api.deckCheck(s,t.p);break;}
 case'g15_Order':{const list=t.remaining.filter(uid=>own.deck.some(x=>x.uid===uid));if(list.length<2){for(const uid of list)own.deck.push(remove(own.deck,uid));break;}choice(s,{...t,remaining:list},'残りを山札の下へ置く順序を選ぶ',list.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g15_PeaceElement':choice(s,t,'シールド化するコスト3以下のエレメントを選ぶ',targetOptions(s,t.p,[0,1].flatMap(p=>s.players[p].battle.filter(x=>cost(card(x))<=3))));break;
 case'g15_Rune':choice(s,t,'山札の上3枚を墓地に置く？（置かなくても墓地のカードを使えます）',[opt('3枚墓地に置く',true,own.deck.length>3?8:-20),skip()]);break;
 case'g15_AQ':{const list=own.hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>['seed','spell'].includes(c.type)&&cost(c)<=5&&canUse(s,t.p,c,'hand')?[opt(c.name,{uid:x.uid,face},15+cost(c),x.cardId)]:[]));choice(s,t,'手札からコスト5以下のタマシード・呪文を使う？',[...list,skip()]);break;}
 case'g15_Use':{const x=own[t.origin||'hand'].find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face||0];if(x&&canUse(s,t.p,c,t.origin||'hand'))cast(s,t.p,x.uid,true,null,t.face||0,null,t.origin||'hand','カードの能力');break;}
 case'g15_Slotton':choice(s,t,'スロットン：引く、または光の進化クリーチャーを出す',[opt('カードを1枚引く','draw',6),opt('手札から光のコスト7以下の進化を出す','deploy',own.hand.some(x=>evolve(card(x))&&colors(card(x)).includes('光')&&cost(card(x))<=7)?20:0)]);break;
 case'g15_LightEvolution':{const list=own.hand.filter(x=>evolve(card(x))&&colors(card(x)).includes('光')&&cost(card(x))<=7&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length));choice(s,t,'出す光の進化クリーチャーを選ぶ',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
 case'g15_Deploy':{const x=own.hand.find(x=>x.uid===t.uid);if(!x||!api.canEnter(s,t.p,card(x),{origin:'hand',execution:false}))break;const c=card(x);if(c.evolution)choice(s,t,'光の進化クリーチャーの進化元を選ぶ',api.evolutionBases(s,t.p,c).map(b=>opt(card(b).name,b.uid,4,b.cardId)));else deploy(s,t,null);break;}
 case'g15_AfterDeploy':{const x=own.battle.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x)(x.g15Blocker??=[]).push({who:t.p});break;}
 case'g15_Korail':choice(s,t,'山札の下に戻し、持ち主が1枚引くクリーチャー・タマシードを選ぶ',targetOptions(s,t.p,[...allTypes(s,t.p),...allTypes(s,1-t.p)]));break;
 case'g15_Gera':put(s,task('draw',t.p,t.source,{n:1}),task('g15_Tap',1-t.p,t.source));break;
 case'g15_Tap':choice(s,t,'自分のアンタップしているクリーチャーを1体選び、タップする',targetOptions(s,t.p,creatures(s,t.p).filter(x=>!x.tapped)));break;
 case'g15_Song':choice(s,t,'墓地をシャッフルして山札の下へ戻すプレイヤーを選ぶ',[opt('自分',t.p,own.grave.length),opt('相手',1-t.p,s.players[1-t.p].grave.length)]);break;
 case'g15_Heart':put(s,task('g15_Keep',s.active,t.source,{kept:[],controller:t.p,other:1-s.active}));break;
 case'g15_Keep':{const list=allTypes(s,t.p);choice(s,t,'ジョーカーズの心絵：残す自分のクリーチャーまたはタマシードを最大1つ選ぶ',[...list.map(x=>opt(card(x).name,x.uid,cost(card(x))*2,x.cardId)),opt('残さない',null,0)]);break;}
 case'g15_HeartMove':{const rows=[0,1].flatMap(p=>allTypes(s,p).filter(x=>!t.kept.includes(x.uid)).map(x=>({player:p,uid:x.uid,to:'deck'}))),uids=rows.map(r=>({p:r.player,uids:api.layers(s.players[r.player].battle.find(x=>x.uid===r.uid)).map(x=>x.uid)}));put(s,task('g15_HeartFinish',t.p,t.source,{uids}));move(s,rows);break;}
 case'g15_HeartFinish':{const counts=[0,1].map(p=>{const ids=t.uids.filter(x=>x.p===p).flatMap(x=>x.uids);return s.players[p].deck.filter(x=>ids.includes(x.uid)).length;});for(const p of[s.active,1-s.active])s.players[p].deck=api.shuffled(s.players[p].deck,Math.floor(api.random(s)*4294967296));put(s,...[s.active,1-s.active].flatMap(p=>Array.from({length:counts[p]},()=>task('g15_Shield',p,t.source))));break;}
 case'g15_Shield':api.shieldTop(s,t.p,card(t.source));break;
 case'g15_ManaUntap':{const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&api.canUntap(x))x.tapped=false;break;}
 case'g15_JohnnyWin':if(own.shields.length>=10)api.finish(s,t.p,card(t.source).name+'：シールド10以上で勝利');break;
 case'g15_NonBreakST':{const x=own.hand.find(x=>x.uid===t.uid);if(x&&own.shields.length<=2&&api.triggersAllowed(s,t.p)&&api.canCast(s,t.p,card(x))&&!api.spellIgnored(s,card(x)))choice(s,t,'革命2のS・トリガーを使う？',[opt('理想と平和の決断を唱える',true,20,x.cardId),skip()]);break;}
 default:throw Error('未実装のライオネル効果：'+t.op);
 }return true;}
 function deploy(s,t,base){const own=s.players[t.p],x=own.hand.find(x=>x.uid===t.uid);if(!x)return;const serial=x.zoneSerial||0;if(t.blocker)put(s,task('g15_AfterDeploy',t.p,t.source,{uid:x.uid,serial}));remove(own.hand,x.uid);enter(s,t.p,x,base,{origin:'hand',execution:false});}
 function chosen(s,t,v){if(!t.op.startsWith('g15_'))return false;const own=s.players[t.p];switch(t.op){
 case'g15_Peace':put(s,task('g15_'+({look:'Look',shield:'Shield',element:'PeaceElement'}[v]),t.p,t.source),{...t,remaining:t.remaining-1});break;
 case'g15_Order':own.deck.push(remove(own.deck,v));put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v)});break;
 case'g15_PeaceElement':case'g15_Korail':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(t.op==='g15_Korail')put(s,task('draw',owner,t.source,{n:1}));move(s,[{player:owner,uid:v,to:t.op==='g15_Korail'?'deck':'shields'}]);}break;
 case'g15_Rune':put(s,task('execute',t.p,t.source,{origin:'grave',max:4,noncreature:true}));if(v)api.mill(s,t.p,3);break;
 case'g15_LightSeed':if(v)put(s,task('g15_Deploy',t.p,t.source,{uid:v}));break;
 case'g15_StarEvo':if(v){(s.g15StarUsed??={})[t.key]=s.turn;put(s,task('g15_Deploy',t.p,t.source,{uid:v}));}break;
 case'g15_AQ':if(v)put(s,task('g15_Use',t.p,t.source,v));break;
 case'g15_Slotton':if(v==='draw')draw(s,t.p,1);else put(s,task('g15_LightEvolution',t.p,t.source));break;
 case'g15_LightEvolution':if(v)put(s,task('g15_Deploy',t.p,t.source,{uid:v,blocker:true}));break;
 case'g15_Deploy':deploy(s,t,v);break;
 case'g15_Tap':if(v){const x=own.battle.find(x=>x.uid===v);if(x)api.tap(s,t.p,x);}break;
 case'g15_Song':{const target=s.players[v],all=target.grave.splice(0);for(const x of all)api.clear(x,'deck');target.deck.push(...api.shuffled(all,Math.floor(api.random(s)*4294967296)));draw(s,t.p,2);break;}
 case'g15_Keep':{const kept=v?[...t.kept,v]:t.kept;if(t.other!==undefined)put(s,{...t,p:t.other,other:undefined,kept});else put(s,task('g15_HeartMove',t.controller,t.source,{kept}));break;}
 case'g15_SmaxKeep':{const resume=s.g15SmaxResume;delete s.g15SmaxResume;s.decision=null;s.g15ResumeAfterMove=resume;move(s,own.battle.filter(x=>card(x).sMax&&x.uid!==v).map(x=>({player:t.p,uid:x.uid,to:'hand'})));if(!s.decision&&!s.leaving){s.decision=s.g15ResumeAfterMove;delete s.g15ResumeAfterMove;}break;}
 case'g15_NonBreakST':if(v&&own.hand.some(x=>x.uid===t.uid))cast(s,t.p,t.uid,true);break;
 default:throw Error('未実装のライオネル選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){const op={lionelStar:'Star',lionelPeace:'Peace',lionelRune:'Rune',lionelHeart:'Heart',lionelSlotton:'Slotton',lionelAQ:'AQ',lionelKorail:'Korail',lionelGera:'Gera',lionelSong:'Song'}[c.effect];if(!op)return false;put(s,task('g15_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0,...(op==='Peace'?{remaining:2}:{})}));return true;},
 entry(s,p,x){if(card(x).type==='seed'||card(x).natureAce4)for(const source of creatures(s,p))if(effective(source,s).lionelStar&&s.g15StarUsed?.[key(source)]!==s.turn)on(s,p,source,'g15_StarEvo',{key:key(source)});},
 inherit(s,base,x){if(base.g15Blocker)x.g15Blocker=structuredClone(base.g15Blocker);},
 power(s,p,x){if(p<0||!api.isCreature(s,x))return 0;const c=card(x);return (rex(c)?creatures(s,p).filter(y=>y.uid!==x.uid&&!api.ignored(s,y)&&card(y).arcTeam).length*2000:0)+(!api.ignored(s,x)&&c.johnny? s.players[p].battle.filter(y=>y.uid!==x.uid&&(rex(card(y))||joker(card(y)))).length*2000:0);},
 decorate(s,p,x,c){if(c.aqCivil&&allTypes(s,p).filter(y=>colors(card(y)).includes('水')).length>=3)c={...c,blocker:true,death:'hand'};if(x.g15Blocker?.length)c={...c,blocker:true};return c;},
 allowedSpell(s,p,c){return colors(c).includes('光')||!creatures(s,1-p).some(x=>effective(x,s).arcTeam);},
 tapEntry(s,p){return !(s.players[p].enteredThisTurn||0)&&creatures(s,1-p).some(x=>effective(x,s).arcTeam);},
 handMana(s,p,x){if(card(x).runeUntap)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g15_ManaUntap',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0})});},
 shieldHand(s,p,x,broken){if(!broken&&card(x).rev2Trigger)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g15_NonBreakST',p,x.cardId,{uid:x.uid})});},
 beforeBreak(s,defender,uids){const context=s.breakContext;if(!context||context.g19Prepared||defender===context.player&&!context.g14Self)return false;const x=s.players[context.player].battle.find(x=>x.uid===context.sourceUid);if(!x||!effective(x,s).johnny)return false;context.g19Prepared=true;put(s,...uids.map(()=>task('g15_Shield',context.player,x.cardId)),task('g19BeforeCommit',context.player,x.cardId,{defender,uids:[...uids],context:structuredClone(context)}));return true;},
 attackEnd(s,a,x){if(effective(x,s).johnny&&s.players[a.player].shields.length>=10)on(s,a.player,x,'g15_JohnnyWin');},
 lossOptions(s,p){const own=s.players[p],sources=creatures(s,p).filter(x=>effective(x,s).johnny),out=[];for(const x of sources){if(api.canLeave(s,p,x))out.push(opt(card(x).name+'を破壊して敗北を回避',{kind:'johnny',uid:x.uid},40,x.cardId));for(const h of own.hand.filter(h=>card(h).name===card(x).name))if(!out.some(v=>v.value?.uid===h.uid))out.push(opt('手札の'+card(h).name+'を捨てて敗北を回避',{kind:'johnnyHand',uid:h.uid},50,h.cardId));}return out;},
 stateCheck(s){if(s.g25DeployBatch)return false;if(s.g15ResumeAfterMove!==undefined&&!s.leaving&&!s.decision){s.decision=s.g15ResumeAfterMove;delete s.g15ResumeAfterMove;}if(s.leaving||s.g15SmaxResume!==undefined||s.decision?.task?.op==='g15_SmaxKeep'||s.winner!==null)return false;for(const p of[s.active,1-s.active]){const xs=s.players[p].battle.filter(x=>card(x).sMax),sig=xs.map(x=>key(x)+':'+api.canLeave(s,p,x)+':'+s.players[p].battle.reduce((n,y)=>n+api.layers(y).length,0)).join('|');if(xs.length<2){if(s.g15SmaxSeen)delete s.g15SmaxSeen[p];continue;}if(s.g15SmaxSeen?.[p]===sig)continue;(s.g15SmaxSeen??={})[p]=sig;s.g15SmaxResume=s.decision;choice(s,task('g15_SmaxKeep',p,xs[0].cardId),'S-MAX進化：場に残す1体を選ぶ',xs.map(x=>opt(card(x).name,x.uid,api.canLeave(s,p,x)?10:20,x.cardId)));return true;}return false;},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const top of own.battle)for(const x of api.layers(top))if(x.g15Blocker)x.g15Blocker=x.g15Blocker.filter(v=>v.who!==p);},
 };
}
