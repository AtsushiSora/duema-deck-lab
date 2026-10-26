import {policyRemove,policyLook} from './champion-zone-policy.js';
// Serializable choices for the phase-44 cards. Hidden libraries stay reserved
// until the complete look/deploy/order instruction has finished.
export function createBandeRules(api){
 const {card,cost,faces,effective,creatures,put,task,choice,opt,skip,remove,clear,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>!x.sealed&&api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const release=(s,p,ids)=>{s.players[p].g28Protected=(s.players[p].g28Protected||[]).filter(uid=>!ids.includes(uid));};
 const pool=(s,t)=>(t.ids||[]).map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 const look=(s,t,n)=>{const own=s.players[t.p],list=policyLook(s,t.p,n,own.deck.filter(x=>!own.g28Protected?.includes(x.uid)),api);own.g28Protected=[...(own.g28Protected||[]),...list.map(x=>x.uid)];log(s,t.p,'look',card(t.source).name+'：山札の上'+list.length+'枚を確認',{cardId:t.source});return list.map(x=>x.uid);};
 const order=(s,t,ids)=>put(s,{...t,op:'g28_Order',ids});
 const bases=(s,p,c,noEvolve=false)=>noEvolve?[null]:[...(!c.evolution||c.graveEvolution?[null]:[]),...(!c.graveEvolution&&(c.evolution||c.neoEvolution)?api.evolutionBases(s,p,c):[])];
 const deployable=(s,p,x,origin,noEvolve=false)=>{const c=card(x);return c.type==='creature'&&(!noEvolve||!c.evolution&&!c.sMax)&&api.canEnter(s,p,c,{origin,execution:false})&&bases(s,p,c,noEvolve).length>0;};
 function deploy(s,t,x,baseUid=null){if(!x||!deployable(s,t.p,x,t.origin,t.noEvolve))return;remove(s.players[t.p][t.origin],x.uid);if(t.origin==='deck')release(s,t.p,[x.uid]);clear(x,'battle');api.enter(s,t.p,x,baseUid,{origin:t.origin,execution:false});if(t.pizza){x.gospelSpeed=s.turn;(x.powerModifiers??=[]).push({amount:3000,expires:'end',who:s.active});}log(s,t.p,'enter',card(t.source).name+'で'+card(x).name+'を'+t.origin+'から出す',{cardId:x.cardId});}
 function executeChoices(s,t){return (t.origins||['hand']).flatMap(origin=>s.players[t.p][origin].flatMap(x=>faces(card(x)).flatMap((c,face)=>cost(c)<=t.max&&(!t.noncreature||c.type!=='creature')&&api.canCast(s,t.p,c,origin)&&(c.type==='spell'||api.canEnter(s,t.p,c,{origin,execution:true}))&&bases(s,t.p,c).length?[opt((origin==='mana'?'マナの':'手札の')+c.name,{uid:x.uid,face,origin},20+cost(c)*3,x.cardId)]:[])));}
 function run(s,t){if(!t.op.startsWith('g28_'))return false;const own=s.players[t.p];switch(t.op){
 case'g28_Radio':put(s,{...t,op:'g28_RadioPick',ids:look(s,t,5),selected:[]});break;
 case'g28_RadioPick':{const list=pool(s,t).filter(x=>!t.selected.includes(x.uid)&&cost(card(x))<=3&&deployable(s,t.p,x,'deck'));if(t.selected.length>=2||!list.length){put(s,...t.selected.map(uid=>({...t,op:'g28_Deploy',origin:'deck',uid})),{...t,op:'g28_Order',ids:t.ids.filter(uid=>!t.selected.includes(uid))});break;}choice(s,t,'ASMラジオ：出すクリーチャーを2体まで選ぶ（'+t.selected.length+'/2）',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x))*3+(card(x).g28Bande?15:0),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 case'g28_Deploy':{const x=own[t.origin].find(x=>x.uid===t.uid);if(!x||!deployable(s,t.p,x,t.origin,t.noEvolve)){if(t.origin==='deck')order(s,t,[t.uid]);break;}const b=bases(s,t.p,card(x),t.noEvolve);if(b.length===1&&!b[0])deploy(s,t,x);else choice(s,t,'出し方・進化元を選ぶ',b.map(x=>opt(x?card(x).name+'の上に置く':'進化させずに出す',x?.uid||null,x?x.tapped?-2:10:1,x?.cardId)));break;}
 case'g28_Order':{const list=pool(s,t);if(list.length<=1){for(const x of list){remove(own.deck,x.uid);own.deck.push(x);}release(s,t.p,t.ids);api.deckCheck(s,t.p);break;}choice(s,t,'山札の下に置く順序を選ぶ（先に選ぶカードが上）',list.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
 case'g28_Pizza':api.draw(s,t.p,1);put(s,{...t,op:'g28_PizzaPick'});break;
 case'g28_PizzaPick':choice(s,t,'アンティハムト：手札からコスト3以下を出す？',[...own.hand.filter(x=>cost(card(x))<=3&&deployable(s,t.p,x,'hand')).map(x=>opt(card(x).name,x.uid,30+cost(card(x))*3+(card(x).g28Bande?20:0),x.cardId)),skip()]);break;
 case'g28_Bande':put(s,{...t,op:'g28_Execute',origins:['hand','mana'],max:4,noncreature:true,optional:true});break;
 case'g28_Execute':{const list=executeChoices(s,t);choice(s,t,'コスト'+t.max+'以下のカードを実行する',[...list,...(t.optional||!list.length?[skip()]:[])]);break;}
 case'g28_ExecuteBase':{const x=own[t.origin].find(x=>x.uid===t.uid);if(!x)break;const c=faces(card(x))[t.face],b=bases(s,t.p,c);choice(s,t,'無料で実行する進化元を選ぶ',b.map(x=>opt(x?card(x).name+'の上に置く':'進化させずに実行',x?.uid||null,x?10:1,x?.cardId)));break;}
 case'g28_Buff':{const x=live(s,t);if(x){x.unblocked=true;delete x.unblockSpellCost;(x.powerModifiers??=[]).push({amount:3000,expires:'end',who:s.active});log(s,t.p,'buff',card(t.source).name+'：このターン、ブロックされずパワー+3000',{cardId:t.source});}break;}
 case'g28_ModeCount':choice(s,t,'D・D・D：効果を選ぶ回数を選ぶ',[opt('通常どおり2回選ぶ',2,0),opt('D・D・Dで3回選ぶ',3,20)]);break;
 case'g28_Modes':{if(!t.remaining){put(s,...[...t.selected].sort((a,b)=>a-b).map(mode=>({...t,op:'g28_Mode',mode})));break;}const execute=executeChoices(s,{...t,max:3}).length;choice(s,t,'心転地と透幻郷：効果を選ぶ（残り'+t.remaining+'回・同じ効果も選べます）',['2枚引き、手札1枚を山札の上か下へ','手札のコスト3以下を無料で実行','コスト6以下のエレメントをマナへ'].map((label,i)=>opt(label,i,i===1?(execute?40:0):i===0?(own.deck.length>2?25:-100):creatures(s,1-t.p).some(x=>cost(card(x))<=6)?30:0)));break;}
 case'g28_Mode':if(t.mode===0){api.draw(s,t.p,2);put(s,{...t,op:'g28_HandDeck'});}else if(t.mode===1)put(s,{...t,op:'g28_Execute',max:3,origins:['hand'],optional:false,noncreature:false});else put(s,{...t,op:'g28_ElementMana'});break;
 case'g28_HandDeck':choice(s,t,'手札1枚を山札の上または下に置く',own.hand.flatMap(x=>['top','bottom'].map(to=>opt(card(x).name+'を'+(to==='top'?'上':'下')+'へ',{uid:x.uid,to},to==='bottom'?cost(card(x)):0,x.cardId))));break;
 case'g28_ElementMana':{const list=[...api.visibleBattleCards(s,t.p),...api.visibleBattleCards(s,1-t.p)].filter(x=>card(x).type!=='seal'&&cost(card(x))<=6);choice(s,t,'コスト6以下のエレメントを1つマナへ',targetOptions(s,t.p,list).map(o=>({...o,score:s.players[1-t.p].battle.some(x=>x.uid===o.value)?30+cost(card(o.cardId)):-20})));break;}
 case'g28_Balance':choice(s,t,'攻守の天秤：効果を選ぶ',[opt('相手のクリーチャーを2体までタップ',0,creatures(s,1-t.p).filter(x=>!x.tapped).length*10),opt('自分のクリーチャーをすべてアンタップ',1,creatures(s,t.p).filter(x=>x.tapped&&api.canUntap(x)).length*15)]);break;
 case'g28_TapPick':{const list=targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!t.selected.includes(x.uid)));if(t.selected.length>=2||!list.length){for(const uid of t.selected)api.tap(s,1-t.p,s.players[1-t.p].battle.find(x=>x.uid===uid));break;}choice(s,t,'タップする相手を2体まで選ぶ',[...list.map(o=>({...o,score:s.players[1-t.p].battle.find(x=>x.uid===o.value)?.tapped?-2:o.score+10})),opt('ここまでで確定',null,0)]);break;}
 case'g28_Taka':put(s,{...t,op:'g28_TakaPick',ids:look(s,t,4)});break;
 case'g28_TakaPick':choice(s,t,'TAKASUGI：クリーチャー1体を公開して手札へ加える？',[...pool(s,t).filter(x=>card(x).type==='creature').map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g28_Seal':{const list=creatures(s,1-t.p).filter(x=>x.entered===s.turn);if(list.length)api.move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'hand',destroy:false})));break;}
 case'g28_Dagra':choice(s,t,'ダグラジャパニカン：マナに置く自分のシールドを選ぶ',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,1)));break;
 case'g28_ManaDeploy':choice(s,t,'ダグラジャパニカン：マナより小さいコストの非進化を出す？',[...own.mana.filter(x=>cost(card(x))<own.mana.length&&deployable(s,t.p,x,'mana',true)).map(x=>opt(card(x).name,x.uid,30+cost(card(x))*3,x.cardId)),skip()]);break;
 case'g28_Gyai':choice(s,t,'ギャイ：山札の上2枚をタップしてマナへ置く？',[opt('2枚をタップしてマナへ',true,own.deck.length>2?30:-100),opt('マナへ置かず回収へ進む',false,0)]);break;
 case'g28_GyaiRecover':choice(s,t,'ギャイ：マナのドラゴン・カード1枚を手札へ戻す？',[...own.mana.filter(x=>faces(card(x)).some(c=>String(c.race).includes('ドラゴン'))).map(x=>opt(card(x).name,x.uid,own.mana.length>5?10+cost(card(x)):-5,x.cardId)),skip()]);break;
 default:throw Error('未実装の主要カード効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g28_'))return false;const own=s.players[t.p];switch(t.op){
 case'g28_RadioPick':if(v)put(s,{...t,selected:[...t.selected,v]});else put(s,...t.selected.map(uid=>({...t,op:'g28_Deploy',origin:'deck',uid})),{...t,op:'g28_Order',ids:t.ids.filter(uid=>!t.selected.includes(uid))});break;
 case'g28_Deploy':deploy(s,t,own[t.origin].find(x=>x.uid===t.uid),v);break;
 case'g28_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);release(s,t.p,[v]);order(s,t,t.ids.filter(uid=>uid!==v));break;}
 case'g28_PizzaPick':if(v)put(s,{...t,op:'g28_Deploy',origin:'hand',uid:v,pizza:true});break;
 case'g28_Execute':if(v){const x=own[v.origin].find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];if(c.evolution||c.neoEvolution)put(s,{...t,op:'g28_ExecuteBase',...v});else api.cast(s,t.p,v.uid,true,null,v.face,null,v.origin,'カードの能力');}break;
 case'g28_ExecuteBase':api.cast(s,t.p,t.uid,true,v,t.face,null,t.origin,'カードの能力');break;
 case'g28_ModeCount':put(s,{...t,op:'g28_Modes',remaining:v,selected:[]});break;
 case'g28_Modes':put(s,{...t,remaining:t.remaining-1,selected:[...t.selected,v]});break;
 case'g28_HandDeck':{const x=remove(own.hand,v.uid);if(x){clear(x,'deck');if(v.to==='top')own.deck.unshift(x);else own.deck.push(x);}break;}
 case'g28_ElementMana':{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'mana',destroy:false}]);break;}
 case'g28_Balance':if(v===0)put(s,{...t,op:'g28_TapPick',selected:[]});else for(const x of creatures(s,t.p))if(api.canUntap(x))x.tapped=false;break;
 case'g28_TapPick':if(v)put(s,{...t,selected:[...t.selected,v]});else for(const uid of t.selected)api.tap(s,1-t.p,s.players[1-t.p].battle.find(x=>x.uid===uid));break;
 case'g28_TakaPick':if(v){const x=remove(own.deck,v);release(s,t.p,[v]);if(x){log(s,t.p,'reveal',card(t.source).name+'で公開：'+card(x).name,{cardId:x.cardId});clear(x,'hand');api.addZone(s,t.p,'hand',x);}}order(s,t,t.ids.filter(uid=>uid!==v));break;
 case'g28_Dagra':api.moveShield(s,t.p,v,'mana');break;
 case'g28_ManaDeploy':if(v)put(s,{...t,op:'g28_Deploy',origin:'mana',uid:v,noEvolve:true});break;
 case'g28_Gyai':if(v){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana',batch=[];for(let i=0;i<2;i++){const x=api.takeTop(s,t.p);if(x){clear(x,to);x.tapped=to==='mana';batch.push(x);}}api.addZone(s,t.p,to,...batch);log(s,t.p,'ramp','ギャイ：山札の上'+batch.length+'枚を'+(to==='mana'?'タップしてマナ':'墓地')+'へ',{cardId:t.source});api.deckCheck(s,t.p);}put(s,{...t,op:'g28_GyaiRecover'});break;
 case'g28_GyaiRecover':if(v){const x=policyRemove(s,t.p,'mana',v,api);if(x){clear(x,'hand');api.addZone(s,t.p,'hand',x);log(s,t.p,'recover','ギャイ：ドラゴン・カードをマナから手札へ',{cardId:x.cardId});}}break;
 default:throw Error('未実装の主要カード選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){const op={bandeRadio:'g28_Radio',bandePizza:'g28_Pizza',bandeDecision:c.g28DDD?'g28_ModeCount':'g28_Modes',bandeDagra:'g28_Dagra',bandeBalance:'g28_Balance',bandeSeal:'g28_Seal',bandeTaka:'g28_Taka'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,...(op==='g28_Modes'?{remaining:c.g28DDD?3:2,selected:[]}:{} )}));return true;},
 attack(s,p,x){if(effective(x,s).g28Bande&&!api.selfStopped(s,p))on(s,p,x,'g28_Bande');},
 played(s,p,c){if(c.type!=='creature')for(const x of creatures(s,p))if(effective(x,s).g28Bande)on(s,p,x,'g28_Buff');},
 evolutionBase(s,p,x){if(effective(x,s).g28Taka)on(s,p,x,'g28_Taka');},
 entry(s,p,x,options){if(card(x).type!=='creature'||!String(card(x).race).includes('ドラゴン'))return;for(const y of creatures(s,p)){const c=effective(y,s);if(!c.g28Gyai&&!c.g28Suzu||y.uid===x.uid&&(options.selfMuted||api.selfStopped(s,p)))continue;const k=key(y);if(s.g28DragonOnce?.[k]===s.turn)continue;(s.g28DragonOnce??={})[k]=s.turn;if(c.g28Gyai)on(s,p,y,'g28_Gyai');else on(s,p,y,'discard',{p:1-p,n:1,random:true,causedBy:p,controller:p});}},
 attackEnd(s,a,x){if(x&&effective(x,s).g28ManaEnd)on(s,a.player,x,'g28_ManaDeploy');}
 };
}
