// Original-format champion additions. A continuation never holds an untracked physical card.
export function createOriginalChampionRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),queue=(s,t,op,more={})=>put(s,{...t,op:'g39_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g39_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const sasagers=(s,p)=>creatures(s,p).filter(x=>effective(x,s).sasage);
 function release(s,p,ids){s.players[p].g39Protected=(s.players[p].g39Protected||[]).filter(uid=>!ids.includes(uid));}
 function run(s,t){if(!t.op.startsWith('g39_'))return false;const own=s.players[t.p];switch(t.op){
 case'g39_Hyakume':put(s,task('g34_Ramp',t.p,t.source,{n:1}),task('discard',1-t.p,t.source,{causedBy:t.p,n:1,random:true}));break;
 case'g39_RinneRamp':put(s,task('g34_Ramp',t.p,t.source,{n:creatures(s,t.p).filter(y=>card(y).g39Rinne).length}));break;
 case'g39_UntapMana':for(const x of own.mana)if(api.canUntap(x))x.tapped=false;break;
 case'g39_Alice':put(s,task('g34_Look',t.p,t.source,{n:3,stages:[{n:1,to:'hand'},{n:1,to:'grave'}],rest:'top'}));break;
 case'g39_Katsu':if(t.remaining>0)choice(s,t,'カツえもん：使う効果を選ぶ（残り'+t.remaining+'回）',[opt('相手をタップし、ブロッカーなら破壊',0,creatures(s,1-t.p).some(x=>effective(x,s).blocker)?25:creatures(s,1-t.p).some(x=>!x.tapped)?12:-5),opt('カードを1枚引く',1,own.deck.length>1?15:-100)]);break;
 case'g39_KatsuTarget':choice(s,t,'タップする相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g39_Pointer':{const owner=t.stage===0?s.active:1-s.active;if(t.stage===2){queue(s,t,'PointerReveal',{owners:[s.active,1-s.active].filter(p=>t.selected.some(r=>r.player===p))});move(s,t.selected.map(r=>({...r,to:'deck',destroy:false,controller:t.p})));break;}choice(s,t,(owner===t.p?'自分':'相手')+'の山札の下に置くクリーチャーを1体まで選ぶ',[...targetOptions(s,t.p,creatures(s,owner)).map(o=>({...o,score:owner===t.p?5:o.score,value:{player:owner,uid:o.value}})),skip()]);break;}
 case'g39_PointerReveal':{if(!t.owners.length)break;const owner=t.owners[0],rows=[],player=s.players[owner];if(!api.deckLocked(s,owner))for(const x of player.deck){rows.push(x);if(card(x).type==='creature')break;}const found=rows.at(-1),x=found&&card(found).type==='creature'?found:null,ids=rows.map(x=>x.uid);(player.g39Protected??=[]).push(...ids);if(rows.length)api.log(s,t.p,'reveal',card(t.source).name+'：'+rows.map(x=>card(x).name).join('・'),{cardId:t.source});queue(s,t,'PointerShuffle',{owner,ids,owners:t.owners.slice(1)});if(x){release(s,owner,[x.uid]);put(s,task('g34_Put',owner,t.source,{controller:t.p,owner,origin:'deck',target:x.uid,execution:false}));}break;}
 case'g39_PointerShuffle':release(s,t.owner,t.ids);api.shuffleLibrary(s,t.owner,[],t.source);queue(s,t,'PointerReveal');break;
 case'g39_Sasage':{const c=faces(card(t.targetCard))[t.face||0],payment={...c,summonOrigin:t.origin,g39Reduction:t.reduction};if(!api.canPay(s,t.p,payment))break;const amount=api.summonCost(s,t.p,payment);queue(s,t,'SasageCast',{amount});move(s,t.sasage.map(uid=>({player:t.p,uid,to:'grave',destroy:true,controller:t.p})));break;}
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
 alternative(s,p,a){if(a.alternative==='rinne')put(s,task('g39_Rinne',p,a.cardId,{target:a.uid,incarnation:a.incarnation}));else{const xs=sasagers(s,p).filter(x=>a.sasage.includes(x.uid)),reduction=xs.reduce((n,x)=>n+effective(x,s).sasage,0);put(s,task('g39_Sasage',p,a.cardId,{target:a.uid,targetCard:a.cardId,face:a.face||0,origin:a.origin||'hand',permit:a.manaPermit,sasage:xs.map(x=>x.uid),reduction,base:a.baseUid}));}},
 mainActions(s,p){const own=s.players[p],out=[],xs=sasagers(s,p),locked=creatures(s,1-p).some(x=>effective(x,s).noCostReduction);for(const x of creatures(s,p)){const c=effective(x,s),spell=faces(card(x))[1];if(c.g39Rinne&&spell&&api.canCast(s,p,spell,'battle')&&api.canPay(s,p,spell))out.push({kind:'play',uid:x.uid,incarnation:x.incarnation||0,cardId:x.cardId,face:1,origin:'battle',alternative:'rinne',cost:api.summonCost(s,p,spell),label:spell.name+'を輪廻∞で唱える'});}if(!xs.length||locked)return out;
 for(const origin of['hand','mana','grave'])for(const x of own[origin])for(const[face,c]of faces(card(x.cardId)).entries()){if(c.type!=='creature'||!String(c.race).includes('ディスペクター')||!api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true}))continue;const permits=origin==='hand'?[null]:origin==='mana'?api.manaPermits(s,p,x):c.graveSummon||c.g38GraveSummon?[null]:[];if(!permits.length)continue;const subsets=xs.reduce((all,x)=>[...all,...all.map(a=>[...a,x])],[[]]);for(const selected of subsets.filter(a=>a.length)){const payment={...c,summonOrigin:origin,g39Reduction:selected.reduce((n,x)=>n+effective(x,s).sasage,0)};if(!api.canPay(s,p,payment))continue;for(const permit of permits)for(const base of c.evolution?api.evolutionBases(s,p,c):[null])out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin,manaPermit:permit,baseUid:base?.uid,alternative:'sasage',sasage:selected.map(x=>x.uid),cost:api.summonCost(s,p,payment),label:c.name+'をササゲール（'+selected.map(x=>card(x).name).join('・')+'）で召喚'});}}
 return out;},
 };
}
