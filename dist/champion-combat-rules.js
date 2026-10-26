// Historical Apollo, Momoking JO and Bolshack champions. UIDs and continuations survive saves.
// JO grants stack (official QA 40623); meteoburn may remove a former top card (QA 43745).
export function createCombatChampionRules(api){
 const{card,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g50_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g50_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const race=(c,q)=>String(c.race).includes(q),dragon=c=>race(c,'ドラゴン'),rek=c=>race(c,'レクスターズ'),fire=c=>colors(c).includes('火');
 const live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>(t.track||[{uid:t.uid,incarnation:t.incarnation||0}]).some(r=>y.uid===r.uid&&(y.incarnation||0)===r.incarnation)));
 const allowedZone=(s,p,z)=>!api.canMoveZone||api.canMoveZone(s,p,z),lookN=(s,p,n)=>api.lookCount?api.lookCount(s,p,n):api.deckLocked(s,p)?0:n;
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 function look(s,t,n,publicly=false){const own=s.players[t.p],held=reserved(own),xs=own.deck.filter(x=>!held.has(x.uid)).slice(0,lookN(s,t.p,n));(own.g34Protected??=[]).push(...xs.map(x=>x.uid));api.log(s,t.p,publicly?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚'+(publicly?'を公開：'+xs.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});return xs.map(x=>x.uid);}
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(id=>!ids.includes(id));
 const pool=(s,t)=>(t.ids||[]).map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 const canPut=(s,p,x,z,execution=false)=>['creature','seed'].includes(card(x).type)&&allowedZone(s,p,z)&&(!execution||api.canCast(s,p,card(x),z))&&api.canEnter(s,p,card(x),{origin:z,execution})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function deploy(s,t,base=null){const own=s.players[t.p],x=own[t.origin]?.find(x=>x.uid===t.target);if(!x||!canPut(s,t.p,x,t.origin,!!t.execution))return false;if(t.execution){api.cast(s,t.p,x.uid,true,base,0,null,t.origin,t.reason||'アタック・チャンス');return true;}remove(own[t.origin],x.uid);release(s,t.p,[x.uid]);clear(x,'battle');api.enter(s,t.p,x,base,{origin:t.origin,execution:false});if(t.orderGrant)x.g50OrderGrant={p:t.p,turns:own.turns};if(t.origin==='deck')api.deckCheck(s,t.p);return true;}
 function ramp(s,t){const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);api.addZone(s,t.p,to,x);}api.deckCheck(s,t.p);return x;}
 function layerLeaving(s,p,top,y){if(card(y).g50Canbero&&!api.ignored(s,top))on(s,p,top,'CanberoUntap',{ids:api.layers(y).slice(1).map(z=>z.uid)});}
 function detach(s,p,x,uid){const parent=api.layers(x).find(y=>y.under?.some(z=>z.uid===uid));if(!parent)return false;const y=parent.under.find(y=>y.uid===uid);layerLeaving(s,p,x,y);if(api.recordLastPower)api.recordLastPower(s,p,x,[y]);remove(parent.under,uid);const rest=y.under||[];parent.under.push(...rest);clear(y,'grave');api.addZone(s,p,'grave',y);return true;}
 function breakAll(s,t,p,uids,follow){if(!uids.length){if(follow)put(s,follow);return;}api.interruptBreak(s,p,uids,follow||task('g50_Done',t.p,t.source));}
 function candidateRows(s,t,filter){return(t.zones||[t.origin||'hand']).flatMap(origin=>allowedZone(s,t.p,origin)?s.players[t.p][origin].filter(x=>filter(card(x),x)&&canPut(s,t.p,x,origin,!!t.execution)).map(x=>({x,origin})):[]);}
 function chooseDeploy(s,t,filter,title){const rows=candidateRows(s,t,filter);choice(s,t,title,[...rows.map(({x,origin})=>opt((t.zones?.length>1?({hand:'手札：',mana:'マナ：',grave:'墓地：'}[origin]||''):'')+card(x).name,{uid:x.uid,origin},30+cost(card(x)),x.cardId)),...(t.optional===false?[]:[skip()])]);}
 function beginMeteor(s,t){const x=live(s,t),ids=x?api.layers(x).slice(1).map(x=>x.uid):[];if(ids.length>=3)choice(s,{...t,selected:[]},'メテオバーン：進化元を3枚墓地に置いて、相手のシールドをすべてブレイクする？',[opt('進化元を3枚選ぶ',true,100),skip()]);}
 function finishSacrifice(s,t){const moved=s.players[t.p].grave.some(x=>x.uid===t.target&&(x.zoneSerial||0)>t.serial);if(t.feather){if(!moved){const x=live(s,t);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:false}]);}}else if(moved)api.draw(s,t.p,2);}
 function run(s,t){if(!t.op.startsWith('g50_'))return false;const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.op){
 case'g50_Done':break;
 case'g50_SeedBattle':if(x&&x.under?.some(y=>card(y).type==='seed'))queue(s,t,'Battle');break;
 case'g50_Battle':if(x&&api.isCreature(s,x))choice(s,t,'バトルさせる相手のクリーチャーを選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p)),...(t.optional===false?[]:[skip()])]);break;
 case'g50_Turbo':put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:x?.under?.some(y=>card(y).type==='seed')?2:1}));break;
 case'g50_Dread':move(s,creatures(s,1-t.p).filter(y=>api.power(y,false,s)<=3000).map(y=>({player:1-t.p,uid:y.uid,to:'grave',destroy:true})));break;
 case'g50_Egg':{const xs=own.deck.slice(0,lookN(s,t.p,own.deck.length)).filter(y=>api.isEvolution(y));choice(s,t,'山札から進化クリーチャーを1体選ぶ',[...xs.map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)),opt('該当カードを選ばずシャッフルする',null,-100)]);break;}
 case'g50_Storie':if(own.hand.length)choice(s,t,'山札の下に置く手札を1枚選ぶ',own.hand.map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));else api.draw(s,t.p,1);break;
 case'g50_Feather':case'g50_SacrificeDraw':{const rows=creatures(s,t.p).filter(y=>t.op!=='g50_Feather'||y.uid!==x?.uid);if(rows.length)choice(s,t,t.op==='g50_Feather'?'墓地に置く他の自分のクリーチャーを選ぶ':'破壊する自分のクリーチャーを選ぶ',rows.map(y=>opt(card(y).name,y.uid,-cost(card(y)),y.cardId)));else if(t.op==='g50_Feather'&&x)move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:false}]);break;}
 case'g50_AfterSacrifice':finishSacrifice(s,t);break;
 case'g50_Meteor':beginMeteor(s,t);break;
 case'g50_MeteorPick':{const list=x?api.layers(x).slice(1).filter(y=>!t.selected.includes(y.uid)):[];if(t.selected.length===3){if(x&&t.selected.every(uid=>api.layers(x).slice(1).some(y=>y.uid===uid))){for(const uid of t.selected)detach(s,t.p,x,uid);breakAll(s,t,1-t.p,opp.shields.map(y=>y.uid));}break;}choice(s,t,'墓地に置く進化元を3枚選ぶ（'+t.selected.length+'/3）',list.map(y=>opt(y.faceDown?'裏向きの進化元':card(y).name,y.uid,10,y.faceDown?null:y.cardId)));break;}
 case'g50_ApolloMana':{const selected=t.selected||[],list=allowedZone(s,1-t.p,'mana')?opp.mana.filter(y=>!selected.includes(y.uid)):[];if(selected.length>=2||!list.length){for(const uid of selected){const y=remove(opp.mana,uid);if(y){clear(y,'grave');api.addZone(s,1-t.p,'grave',y);}}break;}choice(s,{...t,selected},'墓地に置く相手のマナを2枚選ぶ（'+selected.length+'/2）',list.map(y=>opt(card(y).name,y.uid,10,y.cardId)));break;}
 case'g50_Forbidden':{if(!x)break;const ids=look(s,t,own.deck.length,true),y=pool(s,{...t,ids}).find(y=>rek(card(y))&&!api.isEvolution(y));if(y){remove(own.deck,y.uid);clear(y,'battle');(x.under??=[]).push(y);}release(s,t.p,ids);api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);break;}
 case'g50_KingdomOffer':if(x&&lookN(s,t.p,1)&&own.deck.length)choice(s,t,'モモキングダム：山札の上1枚をこのクリーチャーの下に置く？',[opt('下に置く',true,35),skip()]);break;
 case'g50_KingdomAdd':if(x){const ids=look(s,t,1,true),y=pool(s,{...t,ids})[0];if(y){remove(own.deck,y.uid);clear(y,'battle');(x.under??=[]).push(y);}release(s,t.p,ids);api.deckCheck(s,t.p);}break;
 case'g50_KingdomFour':choice(s,t,'破壊する相手のコスト9以下のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(y=>cost(effective(y,s))<=9)));break;
 case'g50_Canbero':opp.entryLimitNextTurn=true;api.log(s,t.p,'entryLimit','キャンベロ：次の相手ターン、出せるクリーチャーは1体まで',{cardId:t.source});break;
 case'g50_CanberoUntap':{const y=own.battle.find(y=>api.layers(y).some(z=>t.ids.includes(z.uid)));if(y&&api.isCreature(s,y)&&api.canUntap(y))y.tapped=false;break;}
 case'g50_JoEvolve':case'g50_RxEvolve':if(x){const jo=t.op==='g50_JoEvolve',rows=own.hand.filter(y=>card(y).evolution&&(!jo||card(y).name.includes('モモキング'))&&(jo||cost(card(y))<=7)&&canPut(s,t.p,y,'hand')&&api.evolutionBases(s,t.p,card(y)).some(b=>b.uid===x.uid));choice(s,t,'このクリーチャーの上に置く進化クリーチャーを選ぶ',[...rows.map(y=>opt(card(y).name,y.uid,40+cost(card(y)),y.cardId)),skip()]);}break;
 case'g50_Rx':put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:2}),{...t,op:'g50_RxEvolve'});break;
 case'g50_JoEnd':if(x&&api.isCreature(s,x))choice(s,t,'シンカパワー：一番上のカードを墓地に置き、アンタップして1枚引く？',[opt('一番上を墓地に置く',true,x.under?.length?45:-20),skip()]);break;
 case'g50_JoAfter':{if(!own.grave.some(y=>y.uid===t.target&&(y.zoneSerial||0)>t.serial))break;const y=own.battle.find(y=>api.layers(y).some(z=>t.ids.includes(z.uid)));if(y&&api.canUntap(y))y.tapped=false;api.draw(s,t.p,1);break;}
 case'g50_Untap':if(x&&api.canUntap(x))x.tapped=false;break;
 case'g50_Bolbal':queue(s,t,'BolbalShields',{selected:[],n:Math.min(2,own.shields.length)});break;
 case'g50_BolbalShields':{const list=own.shields.filter(y=>!t.selected.includes(y.uid));if(t.selected.length>=t.n||!list.length){breakAll(s,t,t.p,t.selected,{...t,op:'g50_Battle'});break;}choice(s,t,'ブレイクする自分のシールドを2つ選ぶ',list.map(y=>opt('シールド'+(own.shields.indexOf(y)+1),y.uid,0)));break;}
 case'g50_BolbalEnd':choice(s,t,'パワー6000以下のクリーチャーをすべて破壊する？',[opt('すべて破壊する',true,creatures(s,1-t.p).filter(y=>api.power(y,false,s)<=6000).length*20-creatures(s,t.p).filter(y=>api.power(y,false,s)<=6000).length*15),skip()]);break;
 case'g50_GodEnd':choice(s,t,'ゴッド・モモキング：カードを何枚引く？',[0,1,2].map(n=>opt(n+'枚引く',n,own.deck.length>n?n*10:-100)));break;
 case'g50_GodDiscard':if(own.hand.length)choice(s,t,'捨てる手札を1枚選ぶ',own.hand.map(y=>opt(card(y).name,y.uid,(card(y).name.includes('モモキング')?35:0)+(rek(card(y))?20:0)-cost(card(y)),y.cardId)));break;
 case'g50_GodAfter':{const ids=s.g14Discards?.[t.key]||[];delete s.g14Discards?.[t.key];if(ids.some(id=>card(id).name.includes('モモキング'))&&x&&api.canUntap(x))x.tapped=false;if(ids.some(id=>rek(card(id))))put(s,task('g34_Target',t.p,t.source,{to:'hand',title:'手札に戻す相手のクリーチャーを選ぶ'}));break;}
 case'g50_Nex':{const ids=look(s,t,1,true),y=pool(s,{...t,ids})[0];if(y&&(rek(card(y))||card(y).type==='creature'&&fire(card(y)))){if(canPut(s,t.p,y,'deck'))queue(s,t,'Deploy',{target:y.uid,origin:'deck',optional:false});else release(s,t.p,ids);}else if(y){remove(own.deck,y.uid);release(s,t.p,ids);clear(y,'grave');api.addZone(s,t.p,'grave',y);}release(s,t.p,ids.filter(uid=>uid!==y?.uid));api.deckCheck(s,t.p);break;}
 case'g50_Deploy':{const y=own[t.origin]?.find(y=>y.uid===t.target);if(!y||!canPut(s,t.p,y,t.origin,!!t.execution)){if(t.origin==='deck'&&y){release(s,t.p,[y.uid]);if(t.failureTo==='grave'){remove(own.deck,y.uid);clear(y,'grave');api.addZone(s,t.p,'grave',y);}}break;}if(card(y).evolution)choice(s,t,'進化元を選ぶ',api.evolutionBases(s,t.p,card(y)).map(b=>opt(card(b).name,b.uid,10,b.cardId)));else deploy(s,t);break;}
 case'g50_Duel':put(s,task('g34_Target',t.p,t.source,{to:'mana',title:'マナゾーンに置く相手のクリーチャーを選ぶ'}),{...t,op:'g50_DuelPut'});break;
 case'g50_DuelPut':chooseDeploy(s,{...t,origin:'mana'},c=>dragon(c)&&c.name.includes('ボルシャック')&&cost(c)<=own.mana.length,'マナから出すボルシャック・ドラゴンを選ぶ');break;
 case'g50_Secret':{const y=ramp(s,t);if(y&&dragon(card(y)))queue(s,t,'ManaReturn');break;}
 case'g50_ManaReturn':choice(s,t,'マナから手札に戻すカードを1枚まで選ぶ',[...(allowedZone(s,t.p,'mana')?own.mana:[]).map(y=>opt(card(y).name,y.uid,10+cost(card(y)),y.cardId)),skip()]);break;
 case'g50_Varga':move(s,creatures(s,1-t.p).filter(y=>effective(y,s).blocker).map(y=>({player:1-t.p,uid:y.uid,to:'grave',destroy:true})));break;
 case'g50_VargaAttack':api.draw(s,t.p,1);queue(s,t,'HandDragon');break;
 case'g50_HandDragon':chooseDeploy(s,t,dragon,'手札から出すドラゴンを1体まで選ぶ');break;
 case'g50_Hero':queue(s,t,'HeroPick',{ids:look(s,t,6),selected:[]});break;
 case'g50_HeroPick':{const list=pool(s,t).filter(y=>!t.selected.includes(y.uid)&&dragon(card(y))&&card(y).name.includes('ボルシャック'));if(!list.length)queue(s,t,'HeroFinish');else choice(s,t,'出すボルシャック・ドラゴンを好きな数選ぶ',[...list.map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)),opt('この内容で出す',null,0)]);break;}
 case'g50_HeroFinish':queue(s,t,'HeroNext');break;
 case'g50_HeroNext':{const list=pool(s,t).filter(y=>t.selected.includes(y.uid)&&canPut(s,t.p,y,'deck'));if(!list.length){queue(s,t,'OrderBottom');break;}choice(s,t,'次に出すボルシャック・ドラゴンを選ぶ',list.map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)));break;}
 case'g50_OrderBottom':{const rows=pool(s,t);if(rows.length<=1){for(const y of rows){remove(own.deck,y.uid);own.deck.push(y);}release(s,t.p,t.ids);api.deckCheck(s,t.p);break;}choice(s,t,'山札の下に置く順序を選ぶ（先に選ぶカードが上）',rows.map(y=>opt(card(y).name,y.uid,0,y.cardId)));break;}
 case'g50_Hadouk':queue(s,t,'HadoukPick',{selected:[],total:0});break;
 case'g50_HadoukPick':{const rows=creatures(s,1-t.p).filter(y=>!t.selected.includes(y.uid)&&t.total+cost(effective(y,s))<=8);choice(s,t,'合計コスト8以下で破壊するクリーチャーを選ぶ（現在'+t.total+'）',[...targetOptions(s,t.p,rows),opt('この内容で破壊する',null,0)]);break;}
 case'g50_HadoukDestroy':if(t.super)queue(s,t,'HadoukSuper');if(t.selected.length)move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'grave',destroy:true})));break;
 case'g50_HadoukSuper':{const ids=look(s,t,5),rows=pool(s,{...t,ids}).filter(y=>card(y).type==='creature'&&!api.isEvolution(y)&&fire(card(y))&&canPut(s,t.p,y,'deck'));choice(s,{...t,ids},'スーパーS・トリガー：火の進化でないクリーチャーを出す？',[...rows.map(y=>opt(card(y).name,y.uid,40+cost(card(y)),y.cardId)),skip()]);break;}
 case'g50_HadoukBattle':{const y=own.battle.find(y=>y.uid===t.putUid);if(y)put(s,{...t,op:'g50_Battle',uid:y.uid,incarnation:y.incarnation||0,optional:false});break;}
 case'g50_Rev0Offer':{const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);if(y&&s.attack?.target==='player'&&!own.shields.length)choice(s,t,'革命0トリガー：ボルシャック・ドギラゴンを公開する？',[opt('公開して山札の上を確認',true,60,y.cardId),skip()]);break;}
 case'g50_Rev0':{const ids=look(s,t,1,true),y=pool(s,{...t,ids})[0];if(y&&fire(card(y))&&!api.isEvolution(y)&&canPut(s,t.p,y,'deck'))put(s,{...t,op:'g50_Deploy',target:y.uid,origin:'deck'},{...t,op:'g50_Rev0Evolve',base:y.uid});else release(s,t.p,ids);break;}
 case'g50_Rev0Evolve':{const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial),base=own.battle.find(y=>y.uid===t.base);if(y&&base&&api.evolutionBases(s,t.p,card(y)).some(y=>y.uid===base.uid)&&api.canEnter(s,t.p,card(y),{origin:'hand',execution:false})){remove(own.hand,y.uid);clear(y,'battle');api.enter(s,t.p,y,base.uid,{origin:'hand',execution:false});}break;}
 case'g50_Chance':{const y=own.hand.find(y=>y.uid===t.uid&&(y.zoneSerial||0)===t.serial);if(y&&canPut(s,t.p,y,'hand',true))choice(s,t,'アタック・チャンス：秘伝・ドラゴンを召喚する？',[opt('コストを支払わず召喚',true,35,y.cardId),skip()]);break;}
 case'g50_Order':{const rows=[0,1].flatMap(p=>creatures(s,p).filter(y=>!dragon(effective(y,s))).map(y=>({player:p,uid:y.uid,to:'hand',destroy:false})));queue(s,t,'OrderPut');if(rows.length)move(s,rows);break;}
 case'g50_OrderPut':chooseDeploy(s,{...t,zones:['mana','grave']},dragon,'マナ・墓地から出すドラゴンを選ぶ（好きな数）');break;
 case'g50_KingFinish':{const frame=s.extSpells?.find(f=>f.inst.uid===t.uid),y=frame?.inst;if(y){const parts=(y.under||[]).flatMap(api.layers);delete y.under;for(const z of parts){clear(z,'grave');api.addZone(s,t.p,'grave',z);}}break;}
 case'g50_Guard':ramp(s,t);put(s,task('g34_Target',t.p,t.source,{tap:true,optional:true,title:'Volzeos-Balamord：タップする相手を1体まで選ぶ'}));break;
 case'g50_Poleco':if(x)move(s,[{player:t.p,uid:x.uid,to:'hand',destroy:false}]);break;
 default:throw Error('未実装の歴代進化効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g50_'))return false;const own=s.players[t.p],x=live(s,t);switch(t.op){
 case'g50_Battle':if(v&&x&&api.isCreature(s,x)){const y=s.players[1-t.p].battle.find(y=>y.uid===v);if(y)api.battle(s,t.p,x,1-t.p,y);}break;
 case'g50_Egg':{const y=v&&remove(own.deck,v);if(y){api.log(s,t.p,'reveal','エボリューション・エッグ：'+card(y).name,{cardId:y.cardId});clear(y,'hand');api.addZone(s,t.p,'hand',y);}api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);break;}
 case'g50_Storie':{const y=remove(own.hand,v);if(y){clear(y,'deck');api.addZone(s,t.p,'deck',y);}api.draw(s,t.p,1);break;}
 case'g50_Feather':case'g50_SacrificeDraw':{const y=own.battle.find(y=>y.uid===v);if(y){queue(s,t,'AfterSacrifice',{target:v,serial:y.zoneSerial||0,feather:t.op==='g50_Feather'});move(s,[{player:t.p,uid:v,to:'grave',destroy:t.op!=='g50_Feather'}]);}break;}
 case'g50_Meteor':if(v)queue(s,t,'MeteorPick');break;
 case'g50_MeteorPick':queue(s,t,'MeteorPick',{selected:[...t.selected,v]});break;
 case'g50_ApolloMana':queue(s,t,'ApolloMana',{selected:[...t.selected,v]});break;
 case'g50_KingdomOffer':if(v)queue(s,t,'KingdomAdd');break;
 case'g50_KingdomFour':if(v)move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true}]);break;
 case'g50_JoEvolve':case'g50_RxEvolve':if(v&&x){const y=remove(own.hand,v);if(y){clear(y,'battle');api.enter(s,t.p,y,x.uid,{origin:'hand',execution:false});}}break;
 case'g50_JoEnd':if(v&&x){const ids=api.layers(x).map(y=>y.uid),uid=x.uid,serial=x.zoneSerial||0;queue(s,t,'JoAfter',{ids,target:uid,serial});move(s,[{player:t.p,uid,to:'grave',destroy:false,cardOnly:true}]);}break;
 case'g50_BolbalShields':queue(s,t,'BolbalShields',{selected:[...t.selected,v]});break;
 case'g50_BolbalEnd':if(v)move(s,[0,1].flatMap(p=>creatures(s,p).filter(y=>api.power(y,false,s)<=6000).map(y=>({player:p,uid:y.uid,to:'grave',destroy:true}))));break;
 case'g50_GodEnd':api.draw(s,t.p,v);queue(s,t,'GodDiscard');break;
 case'g50_GodDiscard':{const key='g50-'+(s.g50DiscardSerial=(s.g50DiscardSerial||0)+1);(s.g14Discards??={})[key]=[];put(s,task('discardChosen',t.p,t.source,{causedBy:t.p,n:1,uid:v,travelKey:key}),{...t,op:'g50_GodAfter',key});break;}
 case'g50_Deploy':deploy(s,t,v);break;
 case'g50_DuelPut':case'g50_HandDragon':if(v)queue(s,t,'Deploy',{target:v.uid,origin:v.origin});break;
 case'g50_ManaReturn':if(v&&allowedZone(s,t.p,'mana')){const y=remove(own.mana,v);if(y){clear(y,'hand');api.addZone(s,t.p,'hand',y);}}break;
 case'g50_HeroNext':put(s,{...t,op:'g50_Deploy',target:v,origin:'deck'},{...t,op:'g50_HeroNext',selected:t.selected.filter(uid=>uid!==v)});break;
 case'g50_HeroPick':if(v)queue(s,t,'HeroPick',{selected:[...t.selected,v]});else queue(s,t,'HeroFinish');break;
 case'g50_OrderBottom':{const y=remove(own.deck,v);if(y)own.deck.push(y);release(s,t.p,[v]);queue(s,t,'OrderBottom',{ids:t.ids.filter(uid=>uid!==v)});break;}
 case'g50_HadoukPick':if(v){const y=s.players[1-t.p].battle.find(y=>y.uid===v);queue(s,t,'HadoukPick',{selected:[...t.selected,v],total:t.total+cost(effective(y,s))});}else queue(s,t,'HadoukDestroy');break;
 case'g50_HadoukSuper':if(v)put(s,{...t,op:'g50_Deploy',target:v,origin:'deck'},{...t,op:'g50_HadoukBattle',putUid:v},{...t,op:'g50_OrderBottom'});else queue(s,t,'OrderBottom');break;
 case'g50_Rev0Offer':if(v)queue(s,t,'Rev0');break;
 case'g50_Chance':if(v)api.cast(s,t.p,t.uid,true,null,0,null,'hand','アタック・チャンス');break;
 case'g50_OrderPut':if(v)put(s,{...t,op:'g50_Deploy',target:v.uid,origin:v.origin,orderGrant:true},t);else queue(s,t,'KingFinish');break;
 default:throw Error('未実装の歴代進化選択：'+t.op);
 }return true;}
 const kingRows=(s,p)=>['hand','mana'].flatMap(origin=>allowedZone(s,p,origin)?s.players[p][origin].map(x=>({x,origin})):[]);
 function kingSets(s,p,c){const rows=kingRows(s,p),names=c.g50KingParts;if(!names)return[];const options=names.map(name=>rows.filter(r=>card(r.x).name===name));if(options.some(xs=>!xs.length))return[];let out=[[]];for(const xs of options)out=out.flatMap(old=>xs.map(x=>[...old,x]));return out;}
 return{run,chosen,layerLeaving,
 finishSpell(s,f){if(!f.inst.g50KingFace||!f.inst.under?.length)return;const parts=f.inst.under.flatMap(api.layers);delete f.inst.under;const to=['deck','mana'].includes(f.to)?f.to:'grave';for(const y of parts){clear(y,to);api.addZone(s,f.owner,to,y);}},
 effect(s,p,c,uid,entry){if(!c.g50Effect)return false;put(s,task('g50_'+c.g50Effect,p,c.id,{uid,incarnation:entry?.incarnation||0,super:!!(entry?.super||c.superTriggerActive)}));return true;},
 entry(s,p,x,options={}){if(rek(card(x)))for(const y of s.players[p].battle)if(y.uid!==x.uid&&card(y).g50Kingdom&&!api.ignored(s,y))on(s,p,y,'KingdomOffer');},
 stateCheck(s){for(const p of[0,1])for(const top of s.players[p].battle){const all=api.layers(top),n=all.length;for(const x of all){const c=card(x);if(!c.g50Kingdom)continue;const previous=x.g50KingdomCount;x.g50KingdomCount=n;if(x===top&&!api.ignored(s,x)&&n===c.g50Kingdom&&previous!==n){if(n===6)for(const y of creatures(s,1-p))(y.powerModifiers??=[]).push({amount:-99999,expires:'end',who:s.active});else on(s,p,x,'KingdomFour');}}}},
 decorate(s,p,x,c){if(p<0)return c;const own=s.players[p],graveFire=own.grave.filter(y=>fire(card(y))).length;if(c.g50Duel)c={...c,power:Number(c.power)+graveFire*1000};if(c.g50Nex)c={...c,attackBonus:(c.attackBonus||0)+graveFire*2000};if(c.g50Kingdom&&api.layers(x).length<c.g50Kingdom)c={...c,noAttack:true,untargetable:true};if(c.g50Volzeos&&x.entered===s.turn)c={...c,unblockable:true};if(x.g50OrderGrant&&s.players[x.g50OrderGrant.p].turns===x.g50OrderGrant.turns)c={...c,speedAttacker:true,blocker:true};return c;},
 allowedCast(s,p,c){if(c.type==='cell')return false;return c.type!=='creature'||cost(c)>4||!s.players.some(own=>own.battle.some(x=>card(x).g50Cross&&!api.ignored(s,x)));},
 allowedEntry(s,p,c,options={}){return !options.execution||!c||c.type!=='creature'||this.allowedCast(s,p,c);},
 attack(s,p,x){const c=effective(x,s);if(api.selfStopped(s,p))return;if(c.g50Jo)on(s,p,x,'JoEvolve');if(c.g50Nex)on(s,p,x,'Nex');if(c.g50Dogi)on(s,p,x,'Battle');if(c.g50Secret)on(s,p,x,'Secret');if(c.g50Varga)on(s,p,x,'VargaAttack');if(c.g50Volzeos)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('discard',1-p,x.cardId,{causedBy:p,n:s.players[1-p].hand.length,all:true})});},
 attackStart(s,p,x){const c=effective(x,s);if(dragon(c)&&cost(c)>=7&&colors(c).some(c=>['火','自然'].includes(c)))for(const y of s.players[p].hand)if(card(y).g50Secret)on(s,p,y,'Chance',{serial:y.zoneSerial||0});if(s.attack?.target==='player'&&!s.players[1-p].shields.length)for(const y of s.players[1-p].hand)if(card(y).g50Dogi)on(s,1-p,y,'Rev0Offer',{serial:y.zoneSerial||0});},
 evolutionBase(s,p,x){if(api.ignored(s,x))return;for(const[k,flag]of[['g50Jo','g50Jo'],['g50Rx','g50Rx']])if(effective(x,s)[flag])x[k]={turn:s.turn,n:(x[k]?.turn===s.turn?x[k].n:0)+1};},
 inherit(s,a,b){for(const k of['g50Jo','g50Rx','g50OrderGrant','g50PolecoBroke'])if(a[k]!==undefined)b[k]=structuredClone(a[k]);},
 attackEnd(s,a,x){if(!x)return;const track=api.layers(x).map(y=>({uid:y.uid,incarnation:y.incarnation||0}));if(effective(x,s).g50God)on(s,a.player,x,'GodEnd',{track});if(x.g50Jo?.turn===s.turn&&!api.ignored(s,x))for(let i=0;i<x.g50Jo.n;i++)on(s,a.player,x,'JoEnd',{track});},
 battleWins(s,p,w){const x=s.players[p].battle.find(x=>x.uid===w.uid);return x?.g50Rx?.turn===s.turn&&!api.ignored(s,x)?Array.from({length:x.g50Rx.n},()=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g50_Untap',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})})):[];},
 broken(s,context,count){if(!count)return;const p=s.active,x=s.players[p].battle.find(x=>x.uid===(context?.sourceUid||s.attack?.attacker));if(x)x.g50PolecoBroke=s.turn;},
 end(s){return s.players[s.active].battle.flatMap(x=>[...(effective(x,s).g50Poleco&&x.g50PolecoBroke===s.turn?[{player:s.active,uid:x.uid,source:x.cardId,effect:'extended',task:task('g50_Poleco',s.active,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}]:[]),...(effective(x,s).g50Bolbal?[{player:s.active,uid:x.uid,source:x.cardId,effect:'extended',task:task('g50_BolbalEnd',s.active,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}]:[])]);},
 snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);if(!x||api.ignored(s,x))return[];return[{p:r.player,uid:x.uid,snow:!!card(x).g50Snow,canbero:!!card(x).g50Canbero,ids:api.layers(x).slice(1).map(y=>y.uid)}];});},
 leaving(s,p,x,snapshot,to,destroy){const row=snapshot?.find(r=>r.uid===x.uid&&r.p===p);if(row?.snow&&to==='grave'&&destroy)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Ramp',p,x.cardId,{n:1})});if(row?.canbero)on(s,p,x,'CanberoUntap',{ids:row.ids});},
 selected(s,p,a,d){const v=a.kind==='extended'?d?.choices?.[a.choice]?.value:null,ids=new Set([...(a.targets||[]).map(x=>x.uid),...(['effect','fight','dragonTap'].includes(a.kind)?[a.target||a.uid]:[]),...(typeof v==='string'?[v]:v?.uid?[v.uid]:[])]);for(const x of s.players[1-p].battle)if(ids.has(x.uid)&&effective(x,s).g50Apollo)on(s,1-p,x,'ApolloMana',{selected:[]});},
 guardStrike(s,p){for(const x of creatures(s,p))if(effective(x,s).g50Volzeos)on(s,p,x,'Guard');},
 mainActions(s,p){const out=[],own=s.players[p];if(creatures(s,p).filter(x=>fire(effective(x,s))&&dragon(effective(x,s))).length>=4)for(const x of own.hand)if(card(x).g50Varga&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,alternative:'combatZero',label:card(x).name+'をG・ゼロで召喚'});const seen=new Set();for(const row of kingRows(s,p)){const c=card(row.x);if(!c.g50KingParts||seen.has(c.g50KingFace.name))continue;seen.add(c.g50KingFace.name);const king={...c.g50KingFace,id:c.id};if(!api.canCast(s,p,king)||king.type==='creature'&&!api.canEnter(s,p,king,{origin:row.origin,execution:true})||!api.canPay(s,p,king))continue;for(const rows of kingSets(s,p,c))out.push({kind:'play',uid:rows[0].x.uid,cardId:c.id,cost:api.summonCost(s,p,king),alternative:'combatKing',parts:rows.map(r=>({uid:r.x.uid,origin:r.origin})),kingSource:c.id,label:king.name+'をキング・セルから合体して'+(king.type==='spell'?'唱える':'召喚')});}return out;},
 alternative(s,p,a){if(a.alternative==='combatZero'){api.cast(s,p,a.uid,true,null,0,null,'hand','G・ゼロ');return;}const own=s.players[p],source=card(a.kingSource),c={...source.g50KingFace,id:source.id},rows=a.parts.map(r=>({...r,x:own[r.origin].find(x=>x.uid===r.uid)}));if(rows.some(r=>!r.x||!allowedZone(s,p,r.origin)))return;const paidMana=api.pay(s,p,c);for(const r of rows)remove(own[r.origin],r.uid);const top=rows.find(r=>r.x.cardId===a.kingSource)||rows[0],inst=top.x;for(const r of rows)clear(r.x,'battle');inst.g50KingFace=true;inst.g50KingDefinition=a.kingSource;inst.under=rows.filter(r=>r!==top).map(r=>r.x);api.completeExecution(s,p,inst,c,{ruleOrigin:top.origin,origin:top.origin,free:false,freeReason:'キング・セル合体',alternativeCost:null,paidMana,cost:api.summonCost(s,p,c),ownGraveCast:false,grantedSuper:false,baseUid:null,face:0});},
 expire(s,when,p){if(when==='start')for(const own of s.players)for(const x of own.battle)if(x.g50OrderGrant?.p===p&&s.players[p].turns>x.g50OrderGrant.turns)delete x.g50OrderGrant;},
 };
}
