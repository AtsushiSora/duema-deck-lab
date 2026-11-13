// Requested J-change and J-crime: original attack identity, replacements and JSON-safe continuations.
export function createRequested393ChangeRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter}=api;
 const joker=c=>String(c.race||'').includes('ジョーカーズ'),key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g393C_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t)&&!x.sealed&&x.uid===s.attack?.attacker);
 const eligible=(s,t,x)=>!x.faceDown&&card(x).type==='creature'&&joker(card(x))&&cost(card(x))<=t.max&&api.canMoveZone(s,t.p,t.origin)&&api.canEnter(s,t.p,card(x),{origin:t.origin,execution:false});
 const bases=(s,t,x)=>api.evolutionBases(s,t.p,card(x)).filter(y=>y.uid!==t.uid);
 const incoming=(s,t)=>s.players[t.p][t.origin].find(x=>x.uid===t.target&&(x.zoneSerial||0)===(t.serial||0));
 function mandatoryReplacement(s,p,x,origin){const c=effective(x,s);if(c.g34Omega||c.gNeo&&x.under?.length||card(x).starEvolution)return true;if(c.exLife){const ids=new Set(api.allLayers(x).flatMap(y=>[...(y.exLifeShieldUids||[]),...(y.exLifeShieldUid?[y.exLifeShieldUid]:[])]));if(s.players[p].shields.some(y=>ids.has(api.shieldGroup(y))))return true;}return origin==='grave'&&!!(c.graveToHand||c.destroyToHand||c.graveToMana||c.destroyToMana||c.destroyToDeck||c.death||c.caddy||api.destroyToHand393?.(s,p,x));}
 function canSwap(s,t,x){const old=live(s,t);return !!old&&!mandatoryReplacement(s,t.p,old,t.origin)&&api.canLeave(s,t.p,old,{destroy:t.origin==='grave'})&&api.canMoveZone(s,t.p,t.origin)&&!card(old).starEvolution&&eligible(s,t,x)&&(!card(x).evolution||bases(s,t,x).length>0)&&!api.entryWouldReplace393?.(s,t.p,card(x),t.origin);}
 function beginSwap(s,t){const old=live(s,t),x=incoming(s,t);if(!old||!x||!canSwap(s,t,x))return;const c=card(x);if((c.evolution||c.neoEvolution)&&t.baseUid!==null&&!bases(s,t,x).some(y=>y.uid===t.baseUid))return;if(c.evolution&&!t.baseUid)return;
  const outgoing=api.allLayers(old).map(y=>({uid:y.uid,serial:y.zoneSerial||0})),attack=structuredClone(s.attack);put(s,{...t,op:'g393C_SwapFinish',outgoing,attack,tapped:old.tapped});
  move(s,[{player:t.p,uid:old.uid,to:t.origin,destroy:t.origin==='grave',exchange:true,controller:t.p}]);
 }
 function finish(s,t){const own=s.players[t.p],x=incoming(s,t);if(!x||!t.outgoing.every(r=>own[t.origin].some(y=>y.uid===r.uid&&(y.zoneSerial||0)===r.serial+1))||own.battle.some(y=>y.uid===t.uid)||!eligible(s,t,x)||api.entryWouldReplace393?.(s,t.p,card(x),t.origin))return;
  if(t.baseUid&&!api.evolutionBases(s,t.p,card(x)).some(y=>y.uid===t.baseUid))return;
  remove(own[t.origin],x.uid);clear(x,'battle');enter(s,t.p,x,t.baseUid||null,{origin:t.origin,execution:false});
  if(own.battle.includes(x)){x.tapped=t.tapped;s.attack={...t.attack};for(const k of['attacker','target','blockUid'])if(s.attack[k]===t.uid)s.attack[k]=x.uid;api.swapped393?.(s,t.uid,x);api.log(s,t.p,t.origin==='grave'?'jCrime':'jChange',card(t.source).name+'の'+(t.origin==='grave'?'Jクライム':'Jチェンジ')+'で'+card(x).name+'と入れ替え、攻撃を続ける',{cardId:x.cardId});}
 }
 function smashSource(s,t){for(const origin of['battle','hand','grave','mana','deck','extra']){const rows=origin==='battle'?s.players[t.p].battle.flatMap(api.allLayers):s.players[t.p][origin],x=rows.find(x=>x.uid===t.uid);if(x&&(origin==='battle'?(x.incarnation||0)===(t.incarnation||0):(x.zoneSerial||0)===(t.serial||0)+1))return{origin,x};}return null;}
 function run(s,t){if(!t.op.startsWith('g393C_'))return false;const own=s.players[t.p];switch(t.op){
  case'g393C_Swap':{if(!live(s,t))break;const rows=own[t.origin].filter(x=>canSwap(s,t,x));if(rows.length)choice(s,t,(t.origin==='grave'?'Jクライム':'Jチェンジ')+t.max+'：入れ替えるジョーカーズを選ぶ',[...rows.map(x=>opt(card(x).name,{uid:x.uid,serial:x.zoneSerial||0},20+cost(card(x)),x.cardId)),skip()]);break;}
  case'g393C_Base':{const x=incoming(s,t);if(x&&canSwap(s,t,x))choice(s,t,'入れ替えて出すクリーチャーの進化元を選ぶ',[...(!card(x).evolution?[opt('進化させずに出す',null,0)]:[]),...bases(s,t,x).map(y=>opt(card(y).name,y.uid,10,y.cardId))]);break;}
  case'g393C_SwapFinish':finish(s,t);break;
  case'g393C_Smash':{const row=smashSource(s,t),face=faces(card(t.source))[1];if(row&&face&&api.canCast(s,t.p,face,row.origin))choice(s,t,'スマッシュ・バーストで「'+face.name+'」を唱える？',[opt('呪文側を唱える',true,own.deck.length<=1?-1000:20,t.source),skip()]);break;}
  default:throw Error('未実装の追加ジョーカーズ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g393C_'))return false;switch(t.op){
  case'g393C_Swap':if(v){const x=s.players[t.p][t.origin].find(x=>x.uid===v.uid&&(x.zoneSerial||0)===v.serial);if(x){const next={...t,target:x.uid,serial:v.serial};if(card(x).evolution||card(x).neoEvolution)put(s,{...next,op:'g393C_Base'});else beginSwap(s,{...next,baseUid:null});}}break;
  case'g393C_Base':beginSwap(s,{...t,baseUid:v});break;
  case'g393C_Smash':if(v&&smashSource(s,t))api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source);break;
  default:throw Error('未実装の追加ジョーカーズ選択：'+t.op);
 }return true;}
 return{run,chosen,
  attack(s,p,x){if(api.selfStopped(s,p)||api.ignored(s,x)||x.sealed)return;const c=effective(x,s),changes=c.g393CChangeCopies?.length?[...(card(x.cardId).g393Change?[c.g393Change]:[]),...c.g393CChangeCopies]:[c.g393Change||{}];for(const change of changes)for(const[origin,max]of Object.entries(change))on(s,p,x,'Swap',{origin,max});if(c.g393Smash)on(s,p,x,'Smash',{serial:x.zoneSerial||0});},
  // Same timing as revolution-change swapFinish: before waiting leave/death/entry triggers resolve.
  finishSwap(s){if(!s.decision&&!s.leaving&&s.extTasks?.[0]?.op==='g393C_SwapFinish'){const t=s.extTasks.shift();api.withEffect(s,t.controller??t.p,()=>api.withAbilitySource(s,t.source,()=>run(s,t)));}}
 };
}
