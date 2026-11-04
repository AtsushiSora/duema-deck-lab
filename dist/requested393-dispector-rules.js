import{hasCopiedRole393}from'./requested393-joker-rules.js?v=0.481.0';
// Requested Dispectors: serializable continuations, public targets and full-card identity.
export function createRequested393DispectorRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),up=(s,p)=>creatures(s,p).filter(x=>!x.sealed),live=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t));
 const event=(p,x,op,more={})=>({player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g393D_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,event(p,x,op,more)),next=(s,t,op,more={})=>put(s,{...t,op:'g393D_'+op,...more});
 const roleCount=(s,x,role)=>{const c=effective(x,s);if(!hasCopiedRole393(c,'g393DRole',role))return 0;return Number(card(x.cardId).g393DRole===role)+(x.g393JCopies||[]).filter(r=>card(r.cardId)?.g393DRole===role).length||1;};
 const repeat=(n,fn)=>{for(let i=0;i<n;i++)fn();};
 const count=(s,p)=>s.g393DExecutions?.[p]?.turn===s.turn?s.g393DExecutions[p].n:0;
 const countExecution=(s,p)=>{const n=count(s,p);(s.g393DExecutions??=[null,null])[p]={turn:s.turn,n:n+1};};
 const dies=s=>s.g393DDestroyed?.turn===s.turn?s.g393DDestroyed.n:0;
 const canPut=(s,p,x,z)=>!x.faceDown&&card(x).type==='creature'&&api.canMoveZone(s,p,z)&&api.canEnter(s,p,card(x),{origin:z,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function run(s,t){if(!t.op.startsWith('g393D_'))return false;const own=s.players[t.p];switch(t.op){
 case'g393D_Iron':{const rows=targetOptions(s,t.p,up(s,1-t.p));choice(s,t,'マナへ置いて登場時能力を使う相手のクリーチャーを1体まで選ぶ',[...rows,skip()]);break;}
 case'g393D_IronAfter':{const owner=s.players[t.owner],x=owner.mana.find(x=>x.uid===t.target);if(!x)break;const entries=api.entryAbilities(s,t.p,t.original,{source:t.source,uid:t.uid,incarnation:t.incarnation||0});if(entries.length)choice(s,{...t,entries},'選んだクリーチャーの登場時能力を1つ使う？',[...entries.map((entry,i)=>opt(entry.label,i,20,t.original)),skip()]);break;}
 case'g393D_IronEnd':choice(s,t,'手札を1枚捨て、次のターン中、相手が実行できるカードを1枚までにする？',[...own.hand.map(x=>opt(card(x).name,x.uid,20-cost(card(x)),x.cardId)),skip()]);break;
 case'g393D_IronLock':(s.g393DExecuteLimits??=[]).push({player:1-t.p,turn:s.turn+1,source:t.source});api.log(s,t.p,'limit',card(t.source).name+'：次のターン、相手はカードを1枚までしか実行できない',{cardId:t.source});break;
 case'g393D_NextReset':choice(s,t,'手札と墓地を山札へ戻して5枚引くプレイヤーを選ぶ',[opt('自分',t.p,own.hand.length<5?25:-5),opt('相手',1-t.p,s.players[1-t.p].hand.length>5?20:-10),skip()]);break;
 case'g393D_NextDraw':api.draw(s,t.owner,5);break;
 case'g393D_VolvalTurn':if(dies(s)>=4)put(s,task('g5ExtraTurn',t.p,t.source));break;
 case'g393D_MaxiDestroy':{const x=s.players[t.owner].battle.find(x=>key(x)===key(t.enemy));if(x)move(s,[{player:t.owner,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 case'g393D_GorinaUntap':{const x=live(s,t);if(x&&api.canUntap(x)){x.tapped=false;api.log(s,t.p,'untap',card(t.source).name+'：最初の攻撃でアンタップ',{cardId:t.source});}break;}
 case'g393D_GorinaWatch':put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}),{...t,op:'g393D_GorinaDeploy'});break;
 case'g393D_GorinaDeploy':{const attacker=s.attack&&s.players[t.p].battle.find(x=>x.uid===s.attack.attacker),attackCost=attacker?cost(effective(attacker,s)):t.attackCost,rows=own.hand.filter(x=>cost(card(x))<attackCost&&canPut(s,t.p,x,'hand'));if(rows.length)choice(s,t,'攻撃中のクリーチャーよりコストが小さいクリーチャーを手札から1体まで出す',[...rows.map(x=>opt(card(x).name,x.uid,25+cost(card(x)),x.cardId)),skip()]);break;}
 case'g393D_Premium':{const rows=[0,1].flatMap(owner=>s.players[owner].mana.filter(x=>cost(card(x))<=5&&canPut(s,owner,x,'mana')).map(x=>({owner,x})));if(!rows.length){next(s,t,'PremiumBattle');break;}choice(s,t,'マナから出すコスト5以下のクリーチャーを1体選ぶ',rows.map(({owner,x})=>opt((owner===t.p?'自分：':'相手：')+card(x).name,{owner,uid:x.uid},owner===t.p?30+cost(card(x)):-10-cost(card(x)),x.cardId)));break;}
 case'g393D_PremiumRamp':put(s,task('g34_Ramp',t.owner,t.source,{n:1,controller:t.p}),{...t,op:'g393D_PremiumBattle'});break;
 case'g393D_PremiumBattle':put(s,task('g34_Fight240',t.p,t.source,{optional:true,spell:true}),task('g34_GroupGrant364',t.p,t.source,{owner:'self',filter:{creature:true},grant:{unblockable:true},spell:true}));break;
 case'g393D_PremiumChance':{const x=own.hand.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(x&&api.canCast(s,t.p,card(x),'hand'))choice(s,t,'アタック・チャンスでエターナルプレミアムズを唱える？',[opt('コストを支払わずに唱える',true,30,x.cardId),skip()]);break;}
 default:throw Error('未実装の要求ディスペクター効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g393D_'))return false;const own=s.players[t.p];switch(t.op){
 case'g393D_Iron':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){next(s,t,'IronAfter',{owner:1-t.p,target:x.uid,original:x.cardId});move(s,[{player:1-t.p,uid:x.uid,to:'mana',destroy:false,controller:t.p}]);}}break;
 case'g393D_IronAfter':if(v!==null&&v!==undefined&&t.entries[v])api.resolveEntry(s,t.entries[v]);break;
 case'g393D_IronEnd':if(v){const x=own.hand.find(x=>x.uid===v);if(x)api.discardSelected(s,t.p,[x.uid],t.source,t.p,{...t,op:'g393D_IronLock'});}break;
 case'g393D_NextReset':if(v!==null&&v!==undefined){const target=s.players[v],added=[];for(const z of['hand','grave'])if(api.canMoveZone(s,v,z))for(const x of [...target[z]]){remove(target[z],x.uid);clear(x,'deck');added.push(x);}api.shuffleLibrary(s,v,added,t.source);next(s,t,'NextDraw',{owner:v});}break;
 case'g393D_GorinaDeploy':if(v&&own.hand.some(x=>x.uid===v))put(s,task('g34_Put',t.p,t.source,{origin:'hand',target:v,execution:false}));break;
 case'g393D_Premium':if(v&&s.players[v.owner].mana.some(x=>x.uid===v.uid)){put(s,task('g34_Put',v.owner,t.source,{origin:'mana',owner:v.owner,target:v.uid,execution:false,controller:t.p}),{...t,op:'g393D_PremiumRamp',owner:v.owner});}break;
 case'g393D_PremiumChance':if(v){const x=own.hand.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(x&&api.canCast(s,t.p,card(x),'hand'))api.cast(s,t.p,x.uid,true,null,0,null,'hand','アタック・チャンス');}break;
 default:throw Error('未実装の要求ディスペクター選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g393DEntry)return false;const x=s.players[p].battle.find(x=>x.uid===uid),n=x&&!c.copyOf?(Number(card(x.cardId).g393DEntry===c.g393DEntry)+(x.g393JCopies||[]).filter(r=>card(r.cardId)?.g393DEntry===c.g393DEntry).length||1):1;repeat(n,()=>put(s,task('g393D_'+(c.g393DEntry==='iron'?'Iron':'Premium'),p,c.id,{uid,incarnation:entry?.incarnation||x?.incarnation||0})));return true;},
 entry(s,p,x){if(x.sealed||!api.isCreature(s,x)||cost(effective(x,s))<=s.players[p].mana.length)return;for(const watcher of up(s,1-p))repeat(roleCount(s,watcher,'maxi'),()=>on(s,1-p,watcher,'MaxiDestroy',{owner:p,enemy:{uid:x.uid,incarnation:x.incarnation||0}}));},
 attack(s,p,x){const self=effective(x,s);if(!api.selfStopped(s,p))repeat(roleCount(s,x,'next'),()=>on(s,p,x,'NextReset'));if(hasCopiedRole393(self,'g393DRole','gorina')&&!api.selfStopped(s,p)){const a=s.g393DUnitAttacks?.[key(x)];if(a?.turn===s.turn&&a.n===1)repeat(roleCount(s,x,'gorina'),()=>on(s,p,x,'GorinaUntap'));}for(const watcher of up(s,p))if(!(key(watcher)===key(x)&&api.selfStopped(s,p)))repeat(roleCount(s,watcher,'gorina'),()=>on(s,p,watcher,'GorinaWatch',{attackCost:cost(self)}));},
 attackStart(s,p,x){const id=key(x),before=s.g393DUnitAttacks?.[id];(s.g393DUnitAttacks??={})[id]={turn:s.turn,n:before?.turn===s.turn?before.n+1:1};const c=effective(x,s);if(!String(c.race).includes('ディスペクター')||!['水','火','自然'].every(z=>colors(c).includes(z)))return;for(const y of s.players[p].hand)if(card(y).g393DChance)on(s,p,y,'PremiumChance',{target:y.uid,serial:y.zoneSerial||0});},
 end(s){const p=s.active,out=[];for(const x of up(s,p)){const c=effective(x,s);if(dies(s)>=4)repeat(roleCount(s,x,'volval'),()=>out.push(event(p,x,'VolvalTurn')));repeat(roleCount(s,x,'iron'),()=>out.push(event(p,x,'IronEnd')));}return out;},
 leaving(s,p,x,snapshot,to,destroy){const prior=(snapshot?.six?.death303||snapshot?.death303||[]).find(y=>y.p===p&&key(y)===key(x));if(to==='grave'&&destroy&&(prior?.creature??api.isCreature(s,x)))s.g393DDestroyed={turn:s.turn,n:dies(s)+1};},
 played(s,p,c){if(c.type!=='spell')countExecution(s,p);},spellCast(s,p){countExecution(s,p);},
 allowedCast(s,p,c){return !(s.g393DExecuteLimits||[]).some(l=>l.player===p&&l.turn===s.turn&&count(s,p)>=1);},
 expire(s){s.g393DExecuteLimits=(s.g393DExecuteLimits||[]).filter(l=>l.turn>=s.turn);}
 };
}
