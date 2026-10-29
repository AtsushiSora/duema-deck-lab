// Verified photo cards: G-NEO battles, Joker entry copies, mana summons and Master G breaks.
export function createPhoto159CombatRules(api){
 const{card,faces,cost,effective,power,put,task,choice,opt,remove,clear,enter,cast,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),joker=c=>String(c.race).includes('ジョーカーズ');
 const living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const live=(s,t)=>living(s,t.p).find(x=>key(x)===key(t));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g159C_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g159C_'+op,...more});
 const skip=()=>opt('使わない',null,0);
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(uid=>!ids.includes(uid));
 const bases=(s,p,c)=>[...(!c.evolution?[null]:[]),...((c.evolution||c.neoEvolution)?api.evolutionBases(s,p,c):[])];
 const usable=(s,p,x,origin,c=card(x),execution=false)=>!x.faceDown&&api.canMoveZone(s,p,origin)&&api.canEnter(s,p,c,{origin,execution})&&(!execution||api.canCast(s,p,c,origin))&&(c.type!=='creature'||bases(s,p,c).length>0);
 function deploy(s,t,base){const own=s.players[t.p],x=own[t.origin].find(x=>x.uid===t.target);if(!x||!usable(s,t.p,x,t.origin))return;remove(own[t.origin],x.uid);clear(x,'battle');enter(s,t.p,x,base,{origin:t.origin,execution:false});}
 function run(s,t){if(!t.op.startsWith('g159C_'))return false;const own=s.players[t.p],enemy=s.players[1-t.p],unit=live(s,t);switch(t.op){
 case'g159C_Fight':if(unit)choice(s,t,'相手1体を選び、ボルシャックとバトルする？',[...targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const y=living(s,1-t.p).find(y=>y.uid===o.value),a=power(unit,unit.uid===s.attack?.attacker,s),b=power(y,y.uid===s.attack?.attacker,s);return{...o,score:a>b?35+cost(card(y)):a===b?-15:-40};}),skip()]);break;
 case'g159C_WinMana':{const max=unit?power(unit,unit.uid===s.attack?.attacker,s):t.lastPower;choice(s,{...t,max},'このクリーチャー以下のパワーの火の1体をマナから出す？',[...(api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&!(own.g34ManaHeld||[]).includes(x.uid)&&card(x).type==='creature'&&faces(card(x)).some(c=>c.type==='creature'&&api.colors(c).includes('火'))&&Number(card(x).power)<=max&&usable(s,t.p,x,'mana')):[]).map(x=>opt(card(x).name,x.uid,20+Math.min(cost(card(x)),20),x.cardId)),skip()]);break;}
 case'g159C_Deploy':{const x=own[t.origin].find(x=>x.uid===t.target);if(!x||!usable(s,t.p,x,t.origin))break;const b=bases(s,t.p,card(x));if(b.length===1&&!b[0])deploy(s,t,null);else choice(s,t,'出すクリーチャーの進化元を選ぶ',b.map(x=>opt(x?card(x).name:'進化させずに出す',x?.uid??null,x?10:1,x?.cardId)));break;}
 case'g159C_Supreme':put(s,task('g34_Target',t.p,t.source,{to:'deck',title:'山札の下へ置く相手のクリーチャーを1体選ぶ'}),task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g159C_Nyani':choice(s,t,'にやにYAH：使う効果を1つ選ぶ',[opt('相手のクリーチャーをすべてタップする','tap',living(s,1-t.p).filter(x=>!x.tapped).length*15),opt('Jビッグ1：他のジョーカーズの登場時能力を1つ使う','jbig',living(s,t.p).some(x=>x.uid!==t.uid&&joker(effective(x,s))&&card(x).effect&&card(x).g159CRole!=='nyani')?25:0)]);break;
 case'g159C_JBig':{const entries=living(s,t.p).filter(x=>x.uid!==t.uid&&joker(effective(x,s))&&!api.ignored(s,x)&&effective(x,s).g159CRole!=='nyani').flatMap(x=>api.entryAbilities(s,t.p,x.cardId,{uid:t.uid,source:t.source,incarnation:t.incarnation||0}).filter(e=>!String(e.label).includes('Jビッグ')).map(e=>({...e,borrowedFrom:x.cardId})));if(entries.length)choice(s,{...t,entries},'使うジョーカーズの登場時能力を1つ選ぶ',entries.map((e,i)=>opt(card(e.borrowedFrom).name+'：'+e.label,i,20,e.borrowedFrom)));break;}
 case'g159C_MomoDM':put(s,task('g34_Select',t.p,t.source,{origin:'mana',n:2,deploy:true,optional:true,filter:{creature:true,evolution:true,race:'ジョーカーズ',max:8},title:'マナから出すコスト8以下の進化ジョーカーズを2体まで選ぶ'}),task('g34_Ramp',t.p,t.source,{n:2,tapped:true}));break;
 case'g159C_MonkidMana':{const x=living(s,t.owner).find(x=>x.uid===t.target&&(x.incarnation||0)===(t.targetIncarnation||0));if(x)api.move(s,[{player:t.owner,uid:x.uid,to:'mana',destroy:false,controller:t.p}]);break;}
 case'g159C_Mekraid':{if(api.deckLocked(s,t.p))break;const reserved=held(own),xs=own.deck.filter(x=>!reserved.has(x.uid)).slice(0,api.lookCount(s,t.p,3)),ids=xs.map(x=>x.uid);(own.g34Protected??=[]).push(...ids);const publicly=api.lookPublic(s,t.p);api.log(s,t.p,publicly?'reveal':'look',card(t.source).name+'：山札の上'+ids.length+'枚を確認'+(publicly?'：'+xs.map(x=>card(x).name).join('・'):''),{cardId:t.source});const rows=xs.flatMap(x=>faces(card(x)).flatMap((c,face)=>joker(c)&&cost(c)<=5&&api.canCast(s,t.p,c,'deck')&&(c.type!=='creature'||usable(s,t.p,x,'deck',c,true))?[opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)]:[]));choice(s,{...t,ids},'ジョーカーズ・メクレイド5：実行するカードを1枚まで選ぶ',[...rows,skip()]);break;}
 case'g159C_MekUse':{const x=own.deck.find(x=>x.uid===t.target),c=x&&faces(card(x))[t.face||0];if(!x||!c||!api.canCast(s,t.p,c,'deck'))break;if(c.type==='creature'&&!usable(s,t.p,x,'deck',c,true))break;if(c.evolution||c.neoEvolution)choice(s,t,'メクレイド：進化元を選ぶ',bases(s,t.p,c).map(b=>opt(b?card(b).name:'進化させずに出す',b?.uid??null,b?10:1,b?.cardId)));else cast(s,t.p,x.uid,true,null,t.face||0,null,'deck','ジョーカーズ・メクレイド');break;}
 case'g159C_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));if(ids.length<=1){for(const uid of ids){const x=remove(own.deck,uid);if(x)own.deck.push(x);}release(s,t.p,t.protected||t.ids);api.deckCheck(s,t.p);break;}choice(s,{...t,ids},'残りを山札の下へ置く順序を選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g159C_MasterBreak':{const ids=t.ids.filter(uid=>api.findShield(s.players[t.defender],uid));if(!ids.length){s.breakContext=null;break;}put(s,task('g34_Target',t.p,t.source,{to:'grave',title:'マスターG・ブレイカー：各ブレイクの前に破壊する相手1体を選ぶ'}),{...t,op:'g159C_MasterCommit',ids});break;}
 case'g159C_MasterCommit':s.breakContext={...t.context,g159CPrepared:true};api.interruptBreak(s,t.defender,[t.ids[0]],{...t,op:'g159C_MasterBreak',ids:t.ids.slice(1)});break;
 default:throw Error('未実装の追加対戦効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g159C_'))return false;switch(t.op){
 case'g159C_Fight':if(v){const x=live(s,t),y=living(s,1-t.p).find(y=>y.uid===v);if(x&&y)api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);}break;
 case'g159C_WinMana':if(v)queue(s,t,'Deploy',{origin:'mana',target:v});break;
 case'g159C_Deploy':deploy(s,t,v);break;
 case'g159C_Nyani':if(v==='tap')for(const x of living(s,1-t.p))api.tap(s,1-t.p,x);else queue(s,t,'JBig');break;
 case'g159C_JBig':if(t.entries[v])api.resolveEntry(s,t.entries[v]);break;
 case'g159C_Mekraid':{release(s,t.p,v?[v.uid]:[]);put(s,...(v?[{...t,op:'g159C_MekUse',target:v.uid,face:v.face}]:[]),{...t,op:'g159C_Order',ids:t.ids.filter(uid=>uid!==v?.uid),protected:t.ids.filter(uid=>uid!==v?.uid)});break;}
 case'g159C_MekUse':cast(s,t.p,t.target,true,v,t.face||0,null,'deck','ジョーカーズ・メクレイド');break;
 case'g159C_Order':{const x=remove(s.players[t.p].deck,v);if(x)s.players[t.p].deck.push(x);queue(s,t,'Order',{ids:t.ids.filter(uid=>uid!==v)});break;}
 default:throw Error('未実装の追加対戦選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g159CEffect)return false;put(s,task('g159C_'+c.g159CEffect,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0}));return true;},
 decorate(s,p,x,c){if(c.g159CRole==='bolshack')return{...c,power:Number(c.power)+3000*s.players[p].grave.filter(x=>faces(card(x)).some(c=>api.colors(c).includes('火'))).length};return c;},
 attack(s,p,x){if(effective(x,s).g159CRole==='bolshack'&&!api.selfStopped(s,p))on(s,p,x,'Fight');},
 battleWins(s,p,w){const x=w&&living(s,p).find(x=>x.uid===w.uid);return x&&effective(x,s).g159CRole==='bolshack'&&!api.selfStopped(s,p)?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g159C_WinMana',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,lastPower:power(x,x.uid===s.attack?.attacker,s)})}]:[];},
 entry(s,p,x,options={}){if(!api.isCreature(s,x)||s.active!==p)return;for(const w of living(s,1-p))if(effective(w,s).g159CRole==='monkid'&&cost(effective(x,s))>s.players[p].mana.length)on(s,1-p,w,'MonkidMana',{owner:p,target:x.uid,targetIncarnation:x.incarnation||0});},
 broken(s,context,n){if(!n||!context||context.reverse)return;const x=living(s,context.player).find(x=>x.uid===context.sourceUid);if(x&&effective(x,s).g159CRole==='monkid'&&!api.selfStopped(s,context.player))on(s,context.player,x,'Mekraid');},
 beforeBreak(s,defender,ids){const context=s.breakContext,x=context&&living(s,context.player).find(x=>x.uid===context.sourceUid);if(!x||context.g159CPrepared||effective(x,s).g159CRole!=='supreme'||x.entered!==s.turn)return false;context.g159CPrepared=true;put(s,task('g159C_MasterBreak',context.player,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,defender,ids:[...ids],context:structuredClone(context)}));return true;}
 };
}
