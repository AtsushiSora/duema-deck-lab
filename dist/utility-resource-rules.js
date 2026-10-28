// Costs and object identities are captured before movement; each player chooses their own sacrifice.
export function createUtilityResourceRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g61_'+op,...more});
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(uid=>!ids.includes(uid));
 function look(s,t,n){const own=s.players[t.p],held=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v)),xs=own.deck.filter(x=>!held.has(x.uid)).slice(0,api.lookCount(s,t.p,n));(own.g34Protected??=[]).push(...xs.map(x=>x.uid));if(xs.length)api.log(s,t.p,api.lookPublic(s,t.p)?'reveal':'look',card(t.source).name+'：山札の'+xs.length+'枚を確認'+(api.lookPublic(s,t.p)?'：'+xs.map(x=>card(x).name).join('・'):''),{cardId:t.source});return xs;}
 function finishChain(s,t){put(s,{...t,op:'g61_Sacrifice',controller:t.p});const rows=(t.selected||[]).filter(r=>s.players[1-t.p].battle.some(x=>key(x)===key(r)));if(rows.length)api.move(s,rows.map(r=>({player:1-t.p,uid:r.uid,to:'grave',destroy:true,controller:t.p})));}
 function run(s,t){if(!t.op.startsWith('g61_'))return false;const own=s.players[t.p];switch(t.op){
 case'g61_Demise':put(s,{...t,op:'g61_Sacrifice',p:1-t.p,controller:t.p});break;
 case'g61_Escort':choice(s,t,'手札へ戻す自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?-cost(card(o.cardId))*4-(o.value===t.uid?10:0):50})));break;
 case'g61_Wave':{const rows=[t.p,1-t.p].flatMap(p=>creatures(s,p).filter(x=>!(p===t.p&&key(x)===key(t))&&api.colors(api.effective(x,s)).length<2).map(x=>({player:p,uid:x.uid,to:'hand',destroy:false,controller:t.p})));if(rows.length)api.move(s,rows);break;}
 case'g61_Chain':{const selected=t.selected||[],options=api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!selected.some(r=>key(r)===key(x))));if(selected.length>=2||!options.length){finishChain(s,t);break;}choice(s,{...t,selected},'破壊する相手のクリーチャーを2体まで選ぶ（'+selected.length+'/2）',[...options,opt('ここまでで確定',null,0)]);break;}
 case'g61_Eco':{for(let i=0;i<2;i++){const x=api.takeTop(s,t.p);if(!x)break;const dragon=faces(card(x)).some(c=>String(c.race).includes('ドラゴン')),to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:x.cardId});if(!dragon)break;}api.deckCheck(s,t.p);break;}
 case'g61_Vines':put(s,{...t,op:'g61_Sacrifice',p:1-t.p,blocker:true,controller:t.p});break;
 case'g61_Zekira':put(s,{...t,op:'g61_Sacrifice',controller:t.p});break;
 case'g61_Sacrifice':choice(s,t,'破壊する自分の'+(t.blocker?'ブロッカー':'クリーチャー')+'を1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>!t.blocker||api.effective(x,s).blocker)).map(o=>({...o,score:api.canLeave(s,t.p,own.battle.find(x=>x.uid===o.value))?-cost(card(o.cardId))*4:50})));break;
 case'g61_Genesis':choice(s,t,'破壊してカードを3枚引く自分のクリーチャーを1体まで選ぶ',[...api.targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:own.deck.length>3||creatures(s,t.p).some(x=>x.uid!==o.value&&api.effective(x,s).shako)?40-cost(card(o.cardId))*3:-1000})),opt('破壊せずに使わない',null,0)]);break;
 case'g61_Protection':queue(s,t,'ProtectionDraw');if(api.canAddShield(s,t.p))choice(s,t,'新しいシールドとして裏向きに加える手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,faces(card(x)).some(c=>c.trigger)?30:15-Math.min(cost(card(x)),30),x.cardId)));break;
 case'g61_ProtectionDraw':if(own.shields.length>s.players[1-t.p].shields.length)put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g61_DeathGate':choice(s,t,'破壊する相手のアンタップしているクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!x.tapped)));break;
 case'g61_Revive':put(s,task('g34_Select',t.p,t.source,{origin:'grave',n:1,deploy:true,optional:true,filter:{creature:true,nonEvolution:true,belowCost:t.max==='∞'?Number.MAX_SAFE_INTEGER:t.max},title:'破壊しようとした相手よりコストが小さい、進化ではない1体を墓地から出す？'}));break;
 case'g61_Ragmar':queue(s,t,'RagmarPick',{controller:t.p,owners:[s.active,1-s.active],selected:[]});break;
 case'g61_RagmarPick':{const owner=t.owners[0];if(owner===undefined){if(t.selected.length)api.move(s,t.selected.map(r=>({player:r.p,uid:r.uid,to:'mana',destroy:false,controller:t.controller})));break;}const xs=creatures(s,owner);if(!xs.length){queue(s,t,'RagmarPick',{owners:t.owners.slice(1)});break;}choice(s,{...t,p:owner},'自分のクリーチャーを1体選び、マナゾーンに置く',xs.map(x=>opt(card(x).name,x.uid,-cost(api.effective(x,s)),x.cardId)));break;}
 case'g61_Sonic':choice(s,t,'アンタップする自分のクリーチャーを1体選ぶ',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,x.tapped?25:0,x.cardId)));break;
 case'g61_Piero':{const x=own.battle.find(x=>key(x)===key(t));if(x&&!x.sealed)choice(s,t,'ファル・ピエロを破壊して墓地の呪文を1枚手札へ戻す？',[opt('破壊して回収する',true,api.canMoveZone(s,t.p,'grave')&&own.grave.some(x=>faces(card(x)).some(c=>c.type==='spell'))?30:-10,x.cardId),opt('破壊しない',null,0)]);break;}
 case'g61_Treasure':{const xs=look(s,t,own.deck.length),ids=xs.map(x=>x.uid),hits=xs.filter(x=>faces(card(x)).every(c=>!api.colors(c).includes('自然')));choice(s,{...t,ids},'山札から自然を含まないカードを1枚までマナゾーンへ置く',[...hits.map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)),opt('置かずにシャッフル',null,0)]);break;}
 case'g61_Clock':{const xs=look(s,t,3),ids=xs.map(x=>x.uid);if(xs.length)choice(s,{...t,ids},'上から見たカードのうち、手札に加える1枚を選ぶ',xs.map(x=>opt(card(x).name,x.uid,Math.min(cost(card(x)),30),x.cardId)));else release(s,t.p,ids);break;}
 case'g61_ClockBottom':{const xs=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean);if(xs.length)choice(s,t,'山札の一番下に置く1枚を選ぶ',xs.map(x=>opt(card(x).name,x.uid,0,x.cardId)));else release(s,t.p,t.ids);break;}
 default:throw Error('未実装の資源ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g61_'))return false;const own=s.players[t.p];switch(t.op){
 case'g61_Escort':if(v)api.move(s,[{player:t.p,uid:v,to:'hand',destroy:false,controller:t.p}]);break;
 case'g61_Chain':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,{...t,selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]});}else finishChain(s,t);break;
 case'g61_Sacrifice':if(v)api.move(s,[{player:t.p,uid:v,to:'grave',destroy:true,controller:t.controller??t.p}]);break;
 case'g61_Genesis':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x){put(s,task('g34_Draw',t.p,t.source,{n:3}));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_Protection':{const x=own.hand.find(x=>x.uid===v);if(x&&api.canAddShield(s,t.p)){api.remove(own.hand,x.uid);api.clear(x,'shields');api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);}break;}
 case'g61_DeathGate':{const x=creatures(s,1-t.p).find(x=>x.uid===v&&!x.tapped);if(x){const n=cost(api.effective(x,s));queue(s,t,'Revive',{max:Number.isFinite(n)?n:'∞'});api.move(s,[{player:1-t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_RagmarPick':queue(s,{...t,p:t.controller},'RagmarPick',{owners:t.owners.slice(1),selected:[...t.selected,{p:t.p,uid:v}]});break;
 case'g61_Sonic':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x)put(s,task('g34_Untap',t.p,t.source,{uid:x.uid,incarnation:x.incarnation||0}));break;}
 case'g61_Piero':{const x=own.battle.find(x=>key(x)===key(t));if(v&&x&&!x.sealed){put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'hand',n:1,optional:false,filter:{spell:true},title:'墓地から手札に戻す呪文を1枚選ぶ'}));api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);}break;}
 case'g61_Treasure':{const x=v&&own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(x.uid)&&faces(card(x)).every(c=>!api.colors(c).includes('自然'))){api.remove(own.deck,x.uid);const to=api.deckRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);api.log(s,t.p,'reveal',card(t.source).name+'で選択：'+card(x).name,{cardId:x.cardId});}release(s,t.p,t.ids);api.shuffleLibrary(s,t.p);api.deckCheck(s,t.p);break;}
 case'g61_Clock':{const x=own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(v)){api.remove(own.deck,x.uid);release(s,t.p,[x.uid]);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);queue(s,t,'ClockBottom',{ids:t.ids.filter(uid=>uid!==v)});api.deckCheck(s,t.p);}break;}
 case'g61_ClockBottom':{const x=own.deck.find(x=>x.uid===v);if(x&&t.ids.includes(v)){api.remove(own.deck,x.uid);own.deck.push(x);}release(s,t.p,t.ids);break;}
 default:throw Error('未実装の資源ユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid,entry){if(!c.g61Effect)return false;put(s,task('g61_'+c.g61Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;}};
}
