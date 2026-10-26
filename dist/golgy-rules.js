import {policyRemove,policyLook} from './champion-zone-policy.js';
// NEO stacks, super-soul and library continuations use physical identities throughout.
export function createGolgyRules(api){
 const {card,cost,colors,effective,creatures,put,task,choice,opt,skip,enqueue,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const live=(s,t)=>s.players[t.p].battle.find(top=>!top.sealed&&api.allLayers(top).some(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)));
 const count=(s,t)=>{const x=live(s,t);return x?api.allLayers(x).length:t.lastKnownCount??1;};
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,lastKnownCount:api.allLayers(x).length,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,lastKnownCount:api.allLayers(x).length,...more})});
 const pool=(s,t)=>(t.ids||[]).map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 const release=(s,p,ids)=>{s.players[p].g27Protected=(s.players[p].g27Protected||[]).filter(uid=>!ids.includes(uid));};
 function reveal(s,t,n,publicly){
  const own=s.players[t.p],excluded=own.g27Protected||[],list=policyLook(s,t.p,n,own.deck.filter(x=>!excluded.includes(x.uid)),api);own.g27Protected=[...excluded,...list.map(x=>x.uid)];
  log(s,t.p,publicly?'reveal':'look',publicly?card(t.source).name+'で公開：'+list.map(x=>card(x).name).join('・'):card(t.source).name+'：山札の上'+list.length+'枚を確認',{cardId:t.source});return list.map(x=>x.uid);
 }
 const order=(s,t,ids)=>put(s,{...t,op:'g27_Order',ids});
 function take(s,t,uid,to){const own=s.players[t.p],x=api.remove(own.deck,uid);release(s,t.p,[uid]);if(!x)return;const target=to==='mana'&&(api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p))?'grave':to;api.clear(x,target);api.addZone(s,t.p,target,x);}
 const baseEligible=(s,x,c)=>!!(card(x).type==='creature'||card(x).shinkalize)&&!!(c.evolution||c.neoEvolution)&&api.matchesEvolution(x,c.evolution||c.neoEvolution,s);
 function executeOptions(s,t,x){
  if(!x)return[];return api.faces(card(x)).flatMap((c,face)=>{
   if(cost(c)>s.players[t.p].hand.length||!api.canCast(s,t.p,c,'deck')||c.type!=='spell'&&!api.canEnter(s,t.p,c,{origin:'deck',execution:true}))return[];
   const bases=!c.graveEvolution&&(c.evolution||c.neoEvolution)?api.evolutionBases(s,t.p,c):[],choices=[...(!c.evolution||c.graveEvolution?[null]:[]),...bases];
   return choices.map(base=>opt('無料で実行：'+c.name+(base?'（'+card(base).name+'に進化）':''),{uid:x.uid,face,baseUid:base?.uid||null},30+cost(c),x.cardId));
  });
 }
 function run(s,t){if(!t.op.startsWith('g27_'))return false;const own=s.players[t.p];switch(t.op){
  case'g27_Kohaku':{const x=live(s,t);if(x)x.g26Stay=t.p;break;}
  case'g27_Golgy':{const n=count(s,t),safe=Math.min(n,Math.max(0,own.deck.length-1));choice(s,t,'ゴルギーオージャー：先にマナへ置く枚数を選ぶ',Array.from({length:Math.min(n,own.deck.length)+1},(_,i)=>opt(i+'枚をマナへ',i,i===safe?35:i>safe?-100:5+i)));break;}
  case'g27_Recover':{const selected=t.selected||[],list=own.mana.filter(x=>!selected.includes(x.uid));if(selected.length>=3||!list.length){put(s,{...t,op:'g27_RecoverDone',selected});break;}choice(s,{...t,selected},'マナから手札へ戻すカード（3枚まで）',[...list.map(x=>opt(card(x).name,x.uid,own.mana.length-selected.length>4?cost(card(x)): -15,x.cardId)),opt('ここまでで確定',null,0)]);break;}
  case'g27_RecoverDone':{const list=t.selected.map(uid=>policyRemove(s,t.p,'mana',uid,api)).filter(Boolean);for(const x of list)api.clear(x,'hand');api.addZone(s,t.p,'hand',...list);log(s,t.p,'recover','ゴルギーオージャー：マナから'+list.length+'枚を手札へ',{cardId:t.source});break;}
  case'g27_Win':if(count(s,t)>=10)api.finish(s,t.p,'ゴルギーオージャー：含まれるカード10枚以上で攻撃して勝利');break;
  case'g27_Big':{const ids=reveal(s,t,2,false);put(s,{...t,op:'g27_BigPick',ids});break;}
  case'g27_BigPick':choice(s,t,'見たカードから1枚を手札またはマナへ',pool(s,t).flatMap(x=>['hand','mana'].map(to=>opt(card(x).name+'を'+(to==='hand'?'手札':'マナ')+'へ',{uid:x.uid,to},to==='mana'&&own.mana.length<6?25:to==='hand'?10+cost(card(x)):0,x.cardId))));if(!pool(s,t).length)release(s,t.p,t.ids);break;
  case'g27_Raid':{const ids=reveal(s,t,3,true);put(s,{...t,op:'g27_RaidPick',ids});break;}
  case'g27_RaidPick':{const x=live(s,t),eligible=x?pool(s,t).filter(y=>baseEligible(s,y,card(x))):[];choice(s,t,'超魂レイド：進化元にできるカードを1枚、下に置く？',[...eligible.map(y=>opt(card(y).name,y.uid,20+(card(y).g27Kohaku?10:0),y.cardId)),skip()]);break;}
  case'g27_Order':{const list=pool(s,t);if(list.length<=1){for(const x of list){api.remove(own.deck,x.uid);own.deck.push(x);}release(s,t.p,t.ids);api.deckCheck(s,t.p);break;}choice(s,t,'山札の下に置く順序を選ぶ（先に選んだカードが上）',list.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
  case'g27_Shield':choice(s,t,'カンツォーネ：相手のエレメントをシールド化する？',[...targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>!x.sealed)),skip()]);break;
  case'g27_KanDeath':{const list=(t.cards||[]).filter(r=>own.grave.some(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial));if(!list.length)break;const targets=creatures(s,t.p).filter(x=>card(x).neoEvolution||card(x).evolution||card(x).sMax);choice(s,{...t,cards:list},'カンツォーネの下にあったカードをまとめて移動する',[...targets.map(x=>opt(card(x).name+'の下に置く',x.uid,25+(effective(x,s).g27Golgy?api.allLayers(x).length*5:0),x.cardId)),...(!targets.length?[opt('進化元に戻す（対象なし：墓地に残す）',null,0)]:[]),opt('表向きの1つのシールドにする','shield',15)]);break;}
  case'g27_Herc':api.draw(s,t.p,2);put(s,{...t,op:'g27_Untap',n:count(s,t),selected:[]});break;
  case'g27_Untap':{const selected=t.selected||[],list=own.mana.filter(x=>!selected.includes(x.uid));if(selected.length>=Math.min(t.n,own.mana.length)||!list.length){for(const uid of selected){const x=own.mana.find(x=>x.uid===uid);if(x&&api.canUntap(x))x.tapped=false;}break;}choice(s,{...t,selected},'ヘラクレス：アンタップするマナを選ぶ（'+selected.length+'/'+Math.min(t.n,own.mana.length)+'）',list.map(x=>opt(card(x).name,x.uid,x.tapped?25:0,x.cardId)));break;}
  case'g27_WestEntry':api.draw(s,t.p,3);put(s,{...t,op:'g27_HandTop'});break;
  case'g27_HandTop':choice(s,t,'竜騎公：手札1枚を山札の上に置く',own.hand.map(x=>opt(card(x).name,x.uid,cost(card(x))<=own.hand.length-1?cost(card(x)): -cost(card(x)),x.cardId)));break;
  case'g27_West':if((s.g27WestUsed||{})[t.useKey]===s.turn)break;choice(s,t,'竜騎公：山札の上1枚を見る？',[opt('見て、無料で実行または手札に加える',true,20),skip()]);break;
  case'g27_WestLook':{const ids=reveal(s,t,1,false);if(!ids.length){api.deckCheck(s,t.p);break;}put(s,{...t,op:'g27_WestUse',ids});break;}
  case'g27_WestUse':{const x=pool(s,t)[0];if(x)choice(s,t,'竜騎公：'+card(x).name+'をどう使う？',[...executeOptions(s,t,x),opt('手札に加える',null,5,x.cardId)]);else release(s,t.p,t.ids);break;}
  case'g27_Gin':put(s,{...t,op:'g27_Tap',n:count(s,t),selected:[]});break;
  case'g27_Tap':{const selected=t.selected||[],options=targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!selected.includes(x.uid)));if(selected.length>=t.n||!options.length){for(const uid of selected){const x=s.players[1-t.p].battle.find(x=>x.uid===uid);if(x){api.tap(s,1-t.p,x);(x.tapLocks??=[]).push(t.p);}}break;}choice(s,{...t,selected},'吟弾の妖精：次の自分のターンまでタップする相手を選ぶ',options);break;}
  case'g27_Blueprint':{const ids=reveal(s,t,6,true);put(s,{...t,op:'g27_BlueprintPick',ids,categories:['neo','fusion']});break;}
  case'g27_BlueprintPick':{const selected=t.selected||[],remaining=pool(s,t).filter(x=>!selected.includes(x.uid)),matches=(x,k)=>k==='neo'?!!card(x).neoEvolution:String(card(x).race).includes('フュージョナー'),pair=t.categories.length===2&&remaining.some(x=>matches(x,'neo')&&remaining.some(y=>y.uid!==x.uid&&matches(y,'fusion'))),options=remaining.flatMap(x=>t.categories.filter(k=>matches(x,k)&&(!pair||remaining.some(y=>y.uid!==x.uid&&matches(y,k==='neo'?'fusion':'neo')))).map(category=>opt((category==='neo'?'NEO：':'フュージョナー：')+card(x).name,{uid:x.uid,category},20+cost(card(x)),x.cardId)));if(options.length)choice(s,{...t,selected},'超魂設計図：NEO1体・フュージョナー1枚を別々に選ぶ',options);else{const list=selected.map(uid=>api.remove(own.deck,uid)).filter(Boolean);release(s,t.p,selected);for(const x of list)api.clear(x,'hand');api.addZone(s,t.p,'hand',...list);order(s,t,t.ids.filter(uid=>!selected.includes(uid)));api.deckCheck(s,t.p);}break;}
  case'g27_Jasmine':{const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);x.tapped=to==='mana';api.addZone(s,t.p,to,x);log(s,t.p,'ramp','ジャスミンの地版：山札の上1枚をタップしてマナへ',{cardId:t.source});}api.deckCheck(s,t.p);break;}
  default:throw Error('未実装のゴルギー効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g27_'))return false;const own=s.players[t.p];switch(t.op){
  case'g27_Golgy':{const batch=[];for(let i=0;i<v;i++){const x=api.takeTop(s,t.p);if(x)batch.push(x);}const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';for(const x of batch)api.clear(x,to);api.addZone(s,t.p,to,...batch);log(s,t.p,'ramp','ゴルギーオージャー：山札の上'+batch.length+'枚を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:t.source});api.deckCheck(s,t.p);put(s,{...t,op:'g27_Recover',selected:[]});break;}
  case'g27_Recover':put(s,{...t,op:v?'g27_Recover':'g27_RecoverDone',selected:v?[...t.selected,v]:t.selected});break;
  case'g27_BigPick':take(s,t,v.uid,v.to);order(s,t,t.ids.filter(uid=>uid!==v.uid));api.deckCheck(s,t.p);break;
  case'g27_RaidPick':{const x=live(s,t);if(v&&x){const y=api.remove(own.deck,v);if(y){release(s,t.p,[v]);api.clear(y,'battle');(x.under??=[]).push(y);log(s,t.p,'evolve','超魂レイド：'+card(y).name+'を進化元へ',{cardId:t.source});}}order(s,t,t.ids.filter(uid=>uid!==v||own.deck.some(x=>x.uid===uid)));break;}
  case'g27_Order':{const x=api.remove(own.deck,v);if(x)own.deck.push(x);release(s,t.p,[v]);order(s,t,t.ids.filter(uid=>uid!==v));break;}
  case'g27_Shield':if(v)api.move(s,[{player:1-t.p,uid:v,to:'shields',destroy:false}]);break;
  case'g27_KanDeath':{if(v===null||!api.canMoveZone(s,t.p,'grave')||v==='shield'&&!api.canAddShield(s,t.p))break;const target=v==='shield'?null:creatures(s,t.p).find(x=>x.uid===v&&(card(x).neoEvolution||card(x).evolution||card(x).sMax));if(v!=='shield'&&!target)break;const list=t.cards.flatMap(r=>{const x=own.grave.find(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial);return x?[policyRemove(s,t.p,'grave',r.uid,api)]:[];});for(const x of list)api.clear(x,v==='shield'?'shields':'battle');if(target)(target.under??=[]).push(...list);else if(list.length){const [root,...rest]=list;root.faceUp=true;own.shields.push(root);api.notifyShieldAdded(s,t.p,root);for(const x of rest)api.addShieldCard(s,t.p,root.uid,x);}log(s,t.p,'evolve','カンツォーネ：下にあった'+list.length+'枚を'+(target?'進化元へ':'1つの表向きシールドへ'),{cardId:t.source});break;}
  case'g27_Untap':case'g27_Tap':put(s,{...t,selected:[...t.selected,v]});break;
  case'g27_HandTop':{const x=api.remove(own.hand,v);if(x){api.clear(x,'deck');own.deck.unshift(x);log(s,t.p,'handToDeck','竜騎公：手札1枚を山札の上へ',{cardId:t.source});}break;}
  case'g27_West':if(v&&(s.g27WestUsed||{})[t.useKey]!==s.turn){(s.g27WestUsed??={})[t.useKey]=s.turn;put(s,{...t,op:'g27_WestLook'});}break;
  case'g27_WestUse':if(v){const x=pool(s,t)[0];release(s,t.p,t.ids);if(x)api.cast(s,t.p,x.uid,true,v.baseUid,v.face,null,'deck','竜騎公の能力');}else{for(const uid of t.ids)take(s,t,uid,'hand');api.deckCheck(s,t.p);}break;
  case'g27_BlueprintPick':put(s,{...t,selected:[...t.selected,v.uid],categories:t.categories.filter(k=>k!==v.category)});break;
  default:throw Error('未実装のゴルギー選択：'+t.op);
 }return true;}
 return {run,chosen,
  effect(s,p,c,uid,entry){const op={golgyEntry:'g27_Golgy',golgyKohaku:'g27_Kohaku',golgyBig:'g27_Big',golgyShield:'g27_Shield',golgyHerc:'g27_Herc',golgyWest:'g27_WestEntry',golgyGin:'g27_Gin',golgyBlueprint:'g27_Blueprint',golgyJasmine:'g27_Jasmine'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,incarnation:entry?.incarnation||0,lastKnownCount:entry?.lastKnownCount??1}));return true;},
  baseCost(s,p,c){const x=c.g27BaseUid&&api.evolutionBases(s,p,c).find(x=>x.uid===c.g27BaseUid);return c.g27Golgy&&x?Math.max(3,cost(c)-2*api.allLayers(x).length):c.g27West&&x?cost(c)-3:cost(c);},
  discount(s,p,c){return c.type==='creature'&&c.neoEvolution?creatures(s,p).reduce((n,x)=>n+(effective(x,s).g27KohakuCount||0),0):0;},
  attack(s,p,x){if(s.attack?.target==='player')for(const y of creatures(s,1-p))if(effective(y,s).g27West&&(s.g27WestUsed||{})[key(y)]!==s.turn)on(s,1-p,y,'g27_West',{useKey:key(y)});if(effective(x,s).g27Golgy&&!api.selfStopped(s,p))on(s,p,x,'g27_Win');},
  entry(s,p,x,options){if(options.selfMuted||api.selfStopped(s,p)||api.ignored(s,x))return;if(card(x).g27Raid)on(s,p,x,'g27_Raid');if(card(x).g27Aophe&&options.revolution)on(s,p,x,'draw',{n:2});},
  snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&effective(x,s).g27Kan?[{uid:x.uid,p:r.player,cards:api.allLayers(x).slice(1).map(y=>({uid:y.uid,serial:(y.zoneSerial||0)+1}))}]:[];});},
  leaving(s,p,x,snapshot,to,destroy){const row=snapshot?.find(r=>r.uid===x.uid&&r.p===p);if(row&&to==='grave'&&destroy)on(s,p,x,'g27_KanDeath',{cards:row.cards});},
  mainActions(s,p){const out=[];for(const origin of ['hand','mana','deck'])for(const x of origin==='deck'?[api.peekTop(s,p)].filter(Boolean):s.players[p][origin]){const c=card(x);if(!c.g27Golgy&&!c.g27West&&!c.g27Big||!api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true}))continue;const permits=origin==='mana'?api.manaPermits(s,p,x):[null],bases=api.evolutionBases(s,p,c);for(const base of [...(c.g27Big?[null]:[]),...bases]){const normal={...c,summonOrigin:origin,g27BaseUid:base?.uid||null},allColors=['光','水','自然'].every(v=>s.players[p].mana.some(y=>api.manaColors(card(y),s,p).includes(v))),payment=c.g27Big?{...normal,cost:2,civilizations:[],fixedPayment:true}:normal;if(c.g27Big&&!allColors||!api.canPay(s,p,payment))continue;for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,alternative:'golgy',baseUid:base?.uid||null,cost:api.summonCost(s,p,payment),label:c.name+(base?'を'+card(base).name+'に進化':'を進化元なしで召喚')+'（'+api.summonCost(s,p,payment)+'マナ）'});}}return out;},
  alternative(s,p,a){const x=s.players[p][a.origin||'hand'].find(x=>x.uid===a.uid);api.cast(s,p,x.uid,false,a.baseUid||null,0,card(x).g27Big?{cost:2,civilizations:[],fixedPayment:true}:null,a.origin||'hand','カードの能力',false,a.manaPermit,null,null,null,null,null,a.g26Reducers??null);}
 };
}
