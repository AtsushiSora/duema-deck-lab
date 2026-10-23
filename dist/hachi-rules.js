// No.11: end-of-attack judges, command support and 5.S.D. library state.
export function createHachiRules(api){
 const {card,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enqueue,log,targetOptions}=api;
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)&&!x.sealed);
 function run(s,t){if(!t.op.startsWith('g11_'))return false;const own=s.players[t.p];switch(t.op){
 case'g11_Judge':api.singleJudge(s,t.p,t.source,t.uid,task('g11_Search',t.p,t.source));break;
 case'g11_Search':if(!api.deckLocked(s,t.p)){choice(s,t,'山札から特攻の忠剣ハチ公を出す？',[...own.deck.filter(x=>card(x).type==='creature'&&card(x).name.includes('特攻の忠剣ハチ公')&&api.canEnter(s,t.p,card(x),{origin:'deck',execution:false})).map(x=>opt(card(x).name,x.uid,35,x.cardId)),skip()]);}break;
 case'g11_Shuffle':api.shuffleLibrary(s,t.p);break;
 case'g11_Final':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;for(const x of creatures(s,t.p))if(x.uid!==t.uid&&api.canUntap(x))x.tapped=false;log(s,t.p,'finalRevolution','レッドギラゾーン：他のクリーチャーをすべてアンタップ',{cardId:t.source});}break;
 case'g11_RedZ':choice(s,t,'墓地に置く相手のシールドを選ぶ',s.players[1-t.p].shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)));break;
 case'g11_Storm':{const x=live(s,t),power=x?api.power(x,false,s):t.lastKnownPower;const list=creatures(s,1-t.p).filter(x=>api.power(x,false,s)<power);if(list.length)move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'grave'})));break;}
 case'g11_Fight':if(live(s,t))choice(s,t,'レッドトロンでバトルする相手を選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p)).map(o=>({...o,score:api.power(live(s,t),false,s)>api.power(s.players[1-t.p].battle.find(x=>x.uid===o.value),false,s)?35:-20})),skip()]);break;
 case'g11_Forbidden':put(s,task('destroyPower',t.p,t.source,{max:9999}),task('g11_Seal',t.p,t.source));break;
 case'g11_Seal':if(own.battle.some(x=>!x.sealed&&card(x).type==='field'))choice(s,t,'封印を付ける相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g11_Shibire':choice(s,t,'手札を1枚マナに置く？',[...own.hand.map(x=>opt(card(x).name,x.uid,own.mana.length<6?20-cost(card(x))*.1:-5,x.cardId)),skip()]);break;
 case'g11_Power':for(const x of creatures(s,t.p)){(x.powerModifiers??=[]).push({amount:8000,expires:'end',who:s.active,spellCost:13});(x.g11Triple??=[]).push({turn:s.turn,cost:13});}break;
 case'g11_SSD':put(s,task('g11_SSDTarget',t.p,t.source),task('g11_SSDEnter',t.p,t.source,{uid:t.uid}));break;
 case'g11_SSDTarget':choice(s,t,'山札の上から4枚目に横向きで置く相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g11_SSDEnter':{const i=(s.extSpells||[]).findIndex(x=>x.inst.uid===t.uid);if(i<0)break;const f=s.extSpells[i];if(f.virtual||!api.canEnter(s,t.p,card(f.inst),{origin:'spell',execution:false}))break;s.extSpells.splice(i,1);api.enter(s,t.p,f.inst,null,{origin:'spell',execution:false});break;}
 case'g11_FourthOrder':{const ids=t.uids.filter(uid=>own.deck.some(x=>x.uid===uid)),remaining=ids.filter(uid=>!t.selected.includes(uid));if(remaining.length<=1){const all=[...t.selected,...remaining].map(uid=>remove(own.deck,uid)).filter(Boolean);own.deck.splice(Math.min(3,own.deck.length),0,...all);}else choice(s,t,'横向きで差し込む順序を選ぶ（先に選ぶカードが上）',remaining.map(uid=>opt('移動したカード '+(t.uids.indexOf(uid)+1),uid,0)));break;}
 case'g11_Discard':{const x=own[t.origin].find(x=>x.uid===t.uid);if(x)choice(s,t,'レッドトロン：召喚前に捨てる手札を選ぶ',own.hand.filter(y=>y.uid!==x.uid).map(y=>opt(card(y).name,y.uid,10-cost(card(y))*.1,y.cardId)));break;}
 case'g11_Pay':{const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(!x)break;const c=card(x),payment=discounted(s,t.p,c);if(api.canCast(s,t.p,c)&&api.canEnter(s,t.p,c,{origin:t.origin,execution:true})&&api.canPay(s,t.p,payment))api.cast(s,t.p,x.uid,false,null,0,{cost:payment.cost},t.origin,'カードの能力',false,t.permit);break;}
 // Added cards may be inserted anywhere, without changing the original order (QA31783).
 case'g11_Insert':{const ids=t.uids.filter(uid=>own.deck.some(x=>x.uid===uid));if(!ids.length)break;const uid=ids[0],rest=own.deck.filter(x=>x.uid!==uid);choice(s,{...t,uids:ids},'山札に加えるカードの位置を選ぶ（既存の順序は変更不可）',Array.from({length:rest.length+1},(_,index)=>opt(index===rest.length?'一番下':`上から${index+1}枚目`,index,index===rest.length?5:0)));break;}
 default:throw Error('未実装のハチ公効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g11_'))return false;const own=s.players[t.p];switch(t.op){
 case'g11_Search':put(s,...(v?[task('putCreature',t.p,t.source,{origin:'deck',uid:v,deckCheck:true})]:[]),task('g11_Shuffle',t.p,t.source));break;
 case'g11_RedZ':api.moveShield(s,1-t.p,v,'grave');break;
 case'g11_Fight':{const x=live(s,t),y=s.players[1-t.p].battle.find(x=>x.uid===v);if(x&&y)api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);break;}
 case'g11_Seal':if(v)api.seal(s,1-t.p,[v]);break;
 case'g11_Shibire':if(v){const x=remove(own.hand,v);if(x){const to=api.manaRedirect(s,t.p)?'grave':'mana';clear(x,to);api.addZone(s,t.p,to,x);api.handMana(s,t.p,x);}}break;
 case'g11_SSDTarget':if(v)move(s,[{player:1-t.p,uid:v,to:'deckFourth',destroy:false}]);break;
 case'g11_FourthOrder':put(s,{...t,selected:[...t.selected,v]});break;
 case'g11_Discard':{put(s,{...t,op:'g11_Pay'});api.discardSelected(s,task('discard',t.p,t.source,{n:1,causedBy:t.p}),[v]);break;}
 case'g11_Insert':{const uid=t.uids[0],x=remove(own.deck,uid);if(x)own.deck.splice(Math.min(v,own.deck.length),0,x);put(s,{...t,uids:t.uids.slice(1)});break;}
 default:throw Error('未実装のハチ公選択：'+t.op);
 }return true;}
 function discounted(s,p,c){return {...c,cost:creatures(s,1-p).some(x=>effective(x,s).noCostReduction)?cost(c):Math.max(1,cost(c)-2),printedCost:c.cost};}
 return{run,chosen,
 effect(s,p,c,uid,entry){const op={hachiRedZ:'RedZ',hachiStorm:'Storm',hachiFight:'Fight',hachiForbidden:'Forbidden',hachiShibire:'Shibire',hachiPower:'Power',hachiSSD:'SSD'}[c.effect];if(!op)return false;put(s,task('g11_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0,lastKnownPower:entry?.lastKnownPower??0}));return true;},
 attackEnd(s,a,x){if(x&&effective(x,s).hachiJudge)on(s,a.player,x,'g11_Judge');},
 leaveSnapshot(s,rows){return Object.fromEntries(rows.flatMap(({player,uid})=>{const x=s.players[player].battle.find(x=>x.uid===uid);return x&&effective(x,s).qqLock?[[uid,true]]:[];}));},
 leaving(s,p,x,snapshot){if(snapshot?.[x.uid])on(s,p,x,'g11_Shuffle',{p:1-p});},
 inherit(s,base,x){if(base.g11Triple)x.g11Triple=structuredClone(base.g11Triple);},
 mainActions(s,p){const out=[];for(const origin of['hand','mana','deck'])for(const x of s.players[p][origin]){const c=card(x);if(!c.redtronDiscard||!s.players[p].hand.some(y=>y.uid!==x.uid)||creatures(s,1-p).some(x=>effective(x,s).noCostReduction))continue;const permits=origin==='mana'?api.manaPermits(s,p,x):origin==='deck'?(api.peekTop(s,p)?.uid===x.uid?[null]:[]):[null];if(api.canCast(s,p,c)&&api.canEnter(s,p,c,{origin,execution:true})&&api.canPay(s,p,discounted(s,p,c)))for(const permit of permits)out.push({kind:'play',alternative:'redtron',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,cost:api.summonCost(s,p,discounted(s,p,c)),label:c.name+'を手札1枚を捨てて軽減召喚'});}return out;},
 beginAlternative(s,p,a){const x=s.players[p][a.origin||'hand'].find(x=>x.uid===a.uid);put(s,task('g11_Discard',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0,origin:a.origin||'hand',permit:a.manaPermit}));},
 };
}
