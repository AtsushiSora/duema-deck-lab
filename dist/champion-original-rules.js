import {policyLook} from './champion-zone-policy.js';
// Original-format champion additions. A continuation never holds an untracked physical card.
export function createOriginalChampionRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),queue=(s,t,op,more={})=>put(s,{...t,op:'g39_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g39_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function sasagers(s,p){
  return s.players[p].battle.flatMap(x=>{
   if(x.sealed)return [];
   const c=effective(x,s);
   if(!['creature','seed','field','gear'].includes(c.type)||!c.sasage)return [];
   return [{x,amounts:c.sasageAmounts?.toSorted((a,b)=>b-a)??[c.sasage]}];
  });
 }
 function sasageOptions(amounts){
  if(amounts.length===1)return [{count:1,reduction:amounts[0],defaultReduction:amounts[0]}];
  const totals=[new Set([0])];
  for(const amount of amounts){
   totals.push(new Set());
   for(let count=totals.length-1;count>0;count--)
    for(const total of totals[count-1])totals[count].add(total+amount);
  }
  let defaultReduction=0;
  return totals.slice(1).flatMap((values,index)=>{
   defaultReduction+=amounts[index];
   return [...values].map(reduction=>({count:index+1,reduction,defaultReduction}));
  });
 }
 const destroySasage=(s,p,uids)=>move(s,uids.map(uid=>({player:p,uid,to:'grave',destroy:true,controller:p})));
 function release(s,p,ids){s.players[p].g39Protected=(s.players[p].g39Protected||[]).filter(uid=>!ids.includes(uid));}
 function run(s,t){if(!t.op.startsWith('g39_'))return false;const own=s.players[t.p];switch(t.op){
 case'g39_Hyakume':put(s,task('g34_Ramp',t.p,t.source,{n:1}),task('discard',1-t.p,t.source,{causedBy:t.p,n:1,random:true}));break;
 case'g39_RinneRamp':put(s,task('g34_Ramp',t.p,t.source,{n:creatures(s,t.p).filter(y=>card(y).g39Rinne).length}));break;
 case'g39_UntapMana':for(const x of own.mana)if(api.canUntap(x))x.tapped=false;break;
 case'g39_Alice':put(s,task('g34_Look',t.p,t.source,{n:3,stages:[{n:1,to:'hand'},{n:1,to:'grave'}],rest:'top'}));break;
 case'g39_Katsu':if(t.remaining>0)choice(s,t,'カツえもん：使う効果を選ぶ（残り'+t.remaining+'回）',[opt('相手をタップし、ブロッカーなら破壊',0,creatures(s,1-t.p).some(x=>effective(x,s).blocker)?25:creatures(s,1-t.p).some(x=>!x.tapped)?12:-5),opt('カードを1枚引く',1,own.deck.length>1?15:-100)]);break;
 case'g39_KatsuTarget':choice(s,t,'タップする相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g39_Pointer':{const owner=t.stage===0?s.active:1-s.active;if(t.stage===2){queue(s,t,'PointerReveal',{owners:[s.active,1-s.active].filter(p=>t.selected.some(r=>r.player===p))});move(s,t.selected.map(r=>({...r,to:'deck',destroy:false,controller:t.p})));break;}choice(s,t,(owner===t.p?'自分':'相手')+'の山札の下に置くクリーチャーを1体まで選ぶ',[...targetOptions(s,t.p,creatures(s,owner)).map(o=>({...o,score:owner===t.p?5:o.score,value:{player:owner,uid:o.value}})),skip()]);break;}
 case'g39_PointerReveal':{if(!t.owners.length)break;const owner=t.owners[0],rows=[],player=s.players[owner];if(!api.deckLocked(s,owner))for(const x of policyLook(s,owner,player.deck.length,player.deck,api)){rows.push(x);if(card(x).type==='creature')break;}const found=rows.at(-1),x=found&&card(found).type==='creature'?found:null,ids=rows.map(x=>x.uid);(player.g39Protected??=[]).push(...ids);if(rows.length)api.log(s,t.p,'reveal',card(t.source).name+'：'+rows.map(x=>card(x).name).join('・'),{cardId:t.source});queue(s,t,'PointerShuffle',{owner,ids,owners:t.owners.slice(1)});if(x){release(s,owner,[x.uid]);put(s,task('g34_Put',owner,t.source,{controller:t.p,owner,origin:'deck',target:x.uid,execution:false}));}break;}
 case'g39_PointerShuffle':release(s,t.owner,t.ids);api.shuffleLibrary(s,t.owner,[],t.source);queue(s,t,'PointerReveal');break;
 case'g39_Sasage':{
  const c=faces(card(t.targetCard))[t.face||0],payment={...c,summonOrigin:t.origin,g39Reduction:t.reduction,...(c.neoEvolution?{g27BaseUid:t.base||null}:{})};
  if(!api.canPay(s,t.p,payment))break;
  const cast={...t,op:'g39_SasageCast',amount:api.summonCost(s,t.p,payment)};
  if(new Set(t.sasage).size===t.sasage.length){
   put(s,cast);
   destroySasage(s,t.p,t.sasage);
   break;
  }
  // QA 42647–42648: apply every declared reduction and resolve each destruction
  // separately, so a replacement can leave the same element in play for the next one.
  put(s,...t.sasage.map(uid=>{
   const x=own.battle.find(x=>x.uid===uid);
   return x&&task('g39_SasageDestroy',t.p,t.source,{target:uid,incarnation:x.incarnation||0});
  }),cast);
  break;
 }
 case'g39_SasageDestroy':
  if(own.battle.some(x=>x.uid===t.target&&(x.incarnation||0)===t.incarnation))destroySasage(s,t.p,[t.target]);
  break;
 case'g39_SasageCast':{const x=own[t.origin].find(x=>x.uid===t.target);if(x)api.cast(s,t.p,x.uid,false,t.base||null,t.face||0,{cost:t.amount,fixedPayment:true},t.origin,'ササゲール',false,t.permit);break;}
 case'g39_Rinne':{const x=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.incarnation),c=x&&faces(card(x))[1];if(!x||!effective(x,s).g39Rinne||!api.canCast(s,t.p,c,'battle')||!api.canPay(s,t.p,c))break;api.pay(s,t.p,c);api.castBattleSpell(s,t.p,x.uid,x.incarnation||0,x.cardId,{label:'輪廻∞',paid:true,rinne:true});break;}
 default:throw Error('未実装のオリジナル優勝デッキ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g39_'))return false;switch(t.op){
 case'g39_Katsu':queue(s,t,'Katsu',{remaining:t.remaining-1});if(v===1)put(s,task('draw',t.p,t.source,{n:1}));else queue(s,t,'KatsuTarget');break;
 case'g39_KatsuTarget':{const x=creatures(s,1-t.p).find(x=>x.uid===v);if(x){const blocker=!!effective(x,s).blocker;api.tap(s,1-t.p,x);if(blocker)move(s,[{player:1-t.p,uid:x.uid,to:'grave',destroy:true}]);}break;}
 case'g39_Pointer':queue(s,t,'Pointer',{stage:t.stage+1,selected:[...t.selected,...(v?[v]:[])]});break;
 default:throw Error('未実装のオリジナル優勝デッキ選択：'+t.op);
 }return true;}
 return{run,chosen,rinneCast(s,p,x){on(s,p,x,'RinneRamp');},
 effect(s,p,c,uid){if(!c.g39Effect)return false;put(s,task('g39_'+c.g39Effect,p,c.id,{uid,remaining:2,stage:0,selected:[]}));return true;},
 allowedEntry(s,p,c){return !c||!api.wouldEnterCreature(s,p,c)||(s.players[p].enteredThisTurn||0)<2||!creatures(s,1-p).some(x=>effective(x,s).g39Clinn);},
 entry(s,p,x,options){if(!api.isCreature(s,x)||!String(card(x).race).includes('デスパペット'))return;for(const y of creatures(s,p).filter(y=>effective(y,s).g39Clinn&&!(y.uid===x.uid&&options.selfMuted))){if(s.g39ClinnUsed?.[key(y)]===s.turn)continue;(s.g39ClinnUsed??={})[key(y)]=s.turn;api.enqueue(s,p,{uid:y.uid,source:y.cardId,effect:'extended',task:task('optionalDrawOne',p,y.cardId)});}},
 selected(s,p,a,d){if(a.kind==='attack')return;const value=a.kind==='extended'?d?.choices?.[a.choice]?.value:null,ids=new Set([...(a.targets||[]).map(t=>t.uid),...(['effect','fight','dragonTap'].includes(a.kind)?[a.target||a.uid]:[]),...(typeof value==='string'?[value]:value?.uid?[value.uid]:[])]);for(const x of creatures(s,1-p))if(ids.has(x.uid)&&effective(x,s).g39Hyakume)on(s,1-p,x,'Hyakume');},
 alternative(s,p,a){
  if(a.alternative==='rinne'){put(s,task('g39_Rinne',p,a.cardId,{target:a.uid,incarnation:a.incarnation}));return;}
  const reduction=a.sasageReduction??sasagers(s,p).reduce((total,{x,amounts})=>{
   const count=a.sasage.filter(uid=>uid===x.uid).length;
   return amounts.slice(0,count).reduce((sum,amount)=>sum+amount,total);
  },0);
  put(s,task('g39_Sasage',p,a.cardId,{target:a.uid,targetCard:a.cardId,face:a.face||0,origin:a.origin||'hand',permit:a.manaPermit,sasage:a.sasage,reduction,base:a.baseUid}));
 },
 mainActions(s,p){const own=s.players[p],out=[],xs=sasagers(s,p),locked=creatures(s,1-p).some(x=>effective(x,s).noCostReduction);for(const x of creatures(s,p)){const c=effective(x,s),spell=faces(card(x))[1];if(c.g39Rinne&&spell&&api.canCast(s,p,spell,'battle')&&api.canPay(s,p,spell))out.push({kind:'play',uid:x.uid,incarnation:x.incarnation||0,cardId:x.cardId,face:1,origin:'battle',alternative:'rinne',cost:api.summonCost(s,p,spell),label:spell.name+'を輪廻∞で唱える'});}if(!xs.length||locked)return out;
 let subsets;
 for(const origin of['hand','mana','grave'])for(const x of own[origin])for(const[face,c]of faces(card(x.cardId)).entries()){
  if(c.type!=='creature'||!String(c.race).includes('ディスペクター')||!api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true}))continue;
  const permits=origin==='hand'?[null]:origin==='mana'?api.manaPermits(s,p,x):[...(c.graveSummon||c.g38GraveSummon?[null]:[]),...(api.gravePermits?.(s,p,x,c)||[])];if(!permits.length)continue;
  subsets??=xs.reduce((all,{x,amounts})=>{
   const options=sasageOptions(amounts);
   return [...all,...all.flatMap(selected=>options.map(option=>[...selected,{x,...option}]))];
  },[[]]).slice(1);
  for(const selected of subsets){
   // NEO may enter with no base or evolve on a surviving creature. A destroyed donor cannot remain underneath it.
   const bases=c.evolution||c.neoEvolution?api.evolutionBases(s,p,c).filter(base=>!selected.some(({x})=>x.uid===base.uid)||!api.canLeave(s,p,base)):[];
   const reduction=selected.reduce((sum,option)=>sum+option.reduction,0);
   const differentReduction=selected.some(option=>option.reduction!==option.defaultReduction);
   const donors=selected.flatMap(({x,count})=>Array(count).fill(x.uid));
   const names=selected.map(({x,count,reduction})=>card(x).name+(count>1||differentReduction?' '+count+'回・'+reduction+'軽減':'')).join('・');
   for(const base of[...(!c.evolution?[null]:[]),...bases]){
    const payment={...c,summonOrigin:origin,g39Reduction:reduction,...(c.neoEvolution?{g27BaseUid:base?.uid||null}:{})};if(!api.canPay(s,p,payment))continue;
    for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin,manaPermit:permit,baseUid:base?.uid,alternative:'sasage',sasage:donors,...(differentReduction?{sasageReduction:reduction}:{}),cost:api.summonCost(s,p,payment),label:c.name+'をササゲール（'+names+'）で召喚'});
   }
  }
 }
 return out;},
 };
}
