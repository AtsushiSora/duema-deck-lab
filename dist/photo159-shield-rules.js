// Verified photograph cards: private shield choices and serializable triggered effects.
export function createPhoto159ShieldRules(api){
 const{card,faces,cost,colors,put,task,choice,opt}=api;
 const living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const role=(s,x)=>api.effective(x,s).g159ShieldRole;
 const active=(s,p,r)=>living(s,p).filter(x=>role(s,x)===r);
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const zagaanSources=(s,p,x)=>{const record=s.g159HandEntries?.[p];if(record?.turn!==s.turn)return[];return living(s,p).filter(w=>w.uid!==x.uid&&card(w).g159ShieldRole==='zagaan'&&!api.ignored(s,w)&&key(record.entries.find(r=>r.uid!==w.uid)||{})===key(x));};
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g159S_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const queued=(p,x,op,more={})=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g159S_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t));
 const spells=(s,p,origin,trigger=false)=>(api.canMoveZone(s,p,origin)?s.players[p][origin]:[]).flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&(!trigger||c.trigger||c.triggerPlus||c.superTrigger)&&api.canCast(s,p,c,origin)?[{x,c,face}]:[]));
 const shieldRows=(s,p)=>s.players[p].shields.flatMap(api.shieldCards).filter(x=>!x.g37ShieldHeld);
 const nonEvolution=c=>!c.evolution&&!c.sMax;
 const seen=rows=>'確認したシールド：'+(rows.map(x=>card(x).name).join(' / ')||'なし')+'。';
 const shieldDemons=(s,p,rows,light=false)=>rows.filter(x=>card(x).type==='creature'&&nonEvolution(card(x))&&String(card(x).race).includes('デーモン・コマンド')&&(!light||colors(card(x)).includes('光'))&&api.canEnter(s,p,card(x),{origin:'shields',execution:false}));
 function shieldDeploy(s,t,uid){const x=shieldRows(s,t.p).find(x=>x.uid===uid);if(!x||!api.canEnter(s,t.p,card(x),{origin:'shields',execution:false}))return;const y=api.removeShieldCard(s,t.p,uid);if(y){api.clear(y,'battle');api.log(s,t.p,'reveal',card(t.source).name+'：'+card(y).name+'をシールドから出す',{cardId:y.cardId});api.enter(s,t.p,y,null,{origin:'shields',execution:false});}}
 function run(s,t){if(!t.op.startsWith('g159S_'))return false;const own=s.players[t.p];switch(t.op){
 case'g159S_Yes':choice(s,t,'墓地から無料で唱えて表向きのシールドにするS・トリガー呪文を1枚まで選ぶ',[...spells(s,t.p,'grave',true).map(({x,c,face})=>opt(c.name,{uid:x.uid,face},20+Math.min(cost(c),20),x.cardId)),opt('唱えない',null,0)]);break;
 case'g159S_YesDestroy':choice(s,t,'唱えた呪文よりコストが小さい相手のクリーチャーを1体破壊する',api.targetOptions(s,t.p,living(s,1-t.p).filter(x=>cost(api.effective(x,s))<t.max)));break;
 case'g159S_Moon':api.shieldTop(s,t.p,card(t.source));if(s.winner===null)api.shieldTop(s,t.p,card(t.source));break;
 case'g159S_MoonOwn':if(own.shields.length)choice(s,t,'月と破壊と魔王と天使でブレイクする自分のシールドを1つ選ぶ',own.shields.map((x,i)=>opt('シールド '+(i+1),x.uid,10)));break;
 case'g159S_MoonEnemy':if(s.players[1-t.p].shields.length)choice(s,t,'オシオキムーン：相手のシールドを1つブレイクする？',[...s.players[1-t.p].shields.map((x,i)=>opt('シールド '+(i+1),x.uid,10)),opt('ブレイクしない',null,0)]);break;
 case'g159S_Tejina':put(s,{...t,op:'g159S_TejinaPick',p:1-t.p,controller:t.p});break;
 case'g159S_TejinaPick':choice(s,t,'シールド化する自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,living(s,t.p)).map(o=>({...o,score:-Math.min(cost(card(o.cardId)),20)})));break;
 case'g159S_Elbolom':put(s,task('g34_Draw',t.p,t.source,{n:1}),{...t,op:'g159S_ElbolomHand'});break;
 case'g159S_ElbolomHand':if(api.canAddShield(s,t.p))choice(s,t,'シールド化する自分の手札を1枚まで選ぶ',[...own.hand.map(x=>opt(card(x).name,x.uid,faces(card(x)).some(c=>c.trigger)?25:10-Math.min(cost(card(x)),20),x.cardId)),opt('シールド化しない',null,0)]);break;
 case'g159S_ElbolomEnd':choice(s,t,'ハイパーモード：手札から無料で唱えるS・トリガー呪文を1枚まで選ぶ',[...spells(s,t.p,'hand',true).map(({x,c,face})=>opt(c.name,{uid:x.uid,face},15+Math.min(cost(c),20),x.cardId)),opt('唱えない',null,0)]);break;
 case'g159S_AgasaCreature':{const rows=shieldRows(s,t.p);api.log(s,t.p,'look',card(t.source).name+'：自分のすべてのシールドを確認',{cardId:t.source});choice(s,t,seen(rows)+'出す進化ではないデーモン・コマンドを1体まで選ぶ',[...shieldDemons(s,t.p,rows).map(x=>opt(card(x).name,x.uid,20+Math.min(cost(card(x)),20),x.cardId)),opt('出さない',null,0)]);break;}
 case'g159S_AgasaSpell':{const rows=shieldRows(s,t.p);api.log(s,t.p,'look',card(t.source).name+'：自分のすべてのシールドを確認',{cardId:t.source});choice(s,t,seen(rows)+'無料で唱える呪文を1枚まで選ぶ',[...rows.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&api.canCast(s,t.p,c,'shields')?[opt(c.name,{uid:x.uid,face},20+Math.min(cost(c),20),x.cardId)]:[])),opt('唱えない',null,0)]);break;}
 case'g159S_Christy':if(own.shields.length)choice(s,t,'見る自分のシールドを1つ選ぶ',own.shields.map((x,i)=>opt('シールド '+(i+1),x.uid,10)));else put(s,task('g34_Draw',t.p,t.source,{n:1}));break;
 case'g159S_ChristyPick':{const root=api.findShield(own,t.target),rows=root?api.shieldCards(root).filter(x=>!x.g37ShieldHeld):[];choice(s,t,seen(rows)+'出す進化ではない光のデーモン・コマンドを1体まで選ぶ',[...shieldDemons(s,t.p,rows,true).map(x=>opt(card(x).name,x.uid,20+Math.min(cost(card(x)),20),x.cardId)),opt('出さない',null,0)]);break;}
 case'g159S_Perfect':{const x=api.canMoveZone(s,t.p,'grave')&&own.grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(!x)break;const c=card(x),deploy=String(c.race).match(/ディスタス|ディスペクター/)&&cost(c)<=own.mana.length;if(deploy)put(s,task('g34_Put',t.p,t.source,{origin:'grave',target:x.uid}));else{api.remove(own.grave,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'reveal',card(t.source).name+'：'+card(x).name+'を墓地から手札へ',{cardId:x.cardId});}break;}
 default:throw Error('未実装の写真159シールド効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g159S_'))return false;const own=s.players[t.p];switch(t.op){
 case'g159S_Yes':if(v){const row=spells(s,t.p,'grave',true).find(r=>r.x.uid===v.uid&&r.face===v.face);if(row){row.x.g159SpellShield=true;api.cast(s,t.p,row.x.uid,true,null,row.face,null,'grave','イエス・ザナドゥ');}}break;
 case'g159S_YesDestroy':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g159S_MoonOwn':case'g159S_MoonEnemy':if(v){s.breakContext={player:t.p,sourceUid:t.uid,source:t.source,g159Moon:true};api.breakShields(s,t.op==='g159S_MoonOwn'?t.p:1-t.p,[v]);}break;
 case'g159S_TejinaPick':if(v)api.move(s,[{player:t.p,uid:v,to:'shields',destroy:false,controller:t.controller??1-t.p}]);break;
 case'g159S_ElbolomHand':if(v&&api.canAddShield(s,t.p)){const x=api.remove(own.hand,v);if(x){api.clear(x,'shields');api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);}}break;
 case'g159S_ElbolomEnd':if(v){const row=spells(s,t.p,'hand',true).find(r=>r.x.uid===v.uid&&r.face===v.face);if(row)api.cast(s,t.p,row.x.uid,true,null,row.face,null,'hand','超光喜 エルボロム');}break;
 case'g159S_AgasaCreature':if(v)shieldDeploy(s,t,v);break;
 case'g159S_AgasaSpell':if(v&&shieldRows(s,t.p).some(x=>x.uid===v.uid))api.castShieldSpell(s,t.p,v.uid,v.face,t.source);break;
 case'g159S_Christy':api.log(s,t.p,'look',card(t.source).name+'：選んだ自分のシールドを確認',{cardId:t.source});put(s,{...t,op:'g159S_ChristyPick',target:v},task('g34_Draw',t.p,t.source,{n:1}));break;
 case'g159S_ChristyPick':if(v)shieldDeploy(s,t,v);break;
 default:throw Error('未実装の写真159シールド選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g159ShieldEffect)return false;put(s,task('g159S_'+c.g159ShieldEffect,p,c.id,{uid,incarnation:entry?.incarnation??s.players[p].battle.find(x=>x.uid===uid)?.incarnation??0}));return true;},
 entry(s,p,x,o={}){if(!api.isCreature(s,x))return;for(const w of active(s,1-p,'agasa'))on(s,1-p,w,'AgasaCreature');if(o.execution!==false&&o.origin==='hand'){(s.g159HandEntries??=[]);if(s.g159HandEntries[p]?.turn!==s.turn)s.g159HandEntries[p]={turn:s.turn,entries:[]};s.g159HandEntries[p].entries.push({uid:x.uid,incarnation:x.incarnation||0});const n=zagaanSources(s,p,x).length;if(!o.selfMuted&&!api.selfStopped(s,p)&&!api.ignored(s,x))for(let i=0;i<n-(card(x).yobinion?0:1);i++)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g19Yobi',p,x.cardId,{max:cost(card(x))})});}},
 attack(s,p,x){if(api.selfStopped(s,p))return;const r=role(s,x);if(r==='yes')on(s,p,x,'Yes');if(r==='elbolom')on(s,p,x,'Elbolom');},
 end(s){const out=[];for(const p of[0,1])for(const x of living(s,p)){const r=role(s,x);if(p===s.active&&r==='moon')out.push(queued(p,x,'MoonOwn'));if(r==='elbolom'&&x.hyperActive&&s.g159ShieldAddedTurns?.[p]===s.turn)out.push(queued(p,x,'ElbolomEnd'));}return out;},
 spellCast(s,p,c){for(const w of active(s,p,'yes'))on(s,p,w,'YesDestroy',{max:cost(c)});for(const w of active(s,1-p,'agasa'))on(s,1-p,w,'AgasaSpell');},
 shieldAdded(s,p){(s.g159ShieldAddedTurns??=[])[p]=s.turn;},
 shieldLeft(s,p,x){for(const w of active(s,p,'moon'))on(s,p,w,'MoonEnemy');const watchers=active(s,p,'perfect').map(w=>({uid:w.uid,incarnation:w.incarnation||0,cardId:w.cardId}));if(watchers.length)(s.g159ShieldDepartures??=[]).push({p,target:x.uid,serial:(x.zoneSerial||0)+1,watchers});},
 graveAdded(s,p,xs){const pending=s.g159ShieldDepartures||[];for(const x of xs){const records=pending.filter(r=>r.p===p&&r.target===x.uid&&r.serial===(x.zoneSerial||0));for(const r of records)for(const w of r.watchers)on(s,p,w,'Perfect',{target:x.uid,serial:x.zoneSerial||0});}s.g159ShieldDepartures=pending.filter(r=>!xs.some(x=>x.uid===r.target));},
 decorate(s,p,x,c){const own=s.players[p],sources=own.battle.filter(w=>!w.sealed&&!api.ignored(s,w)),zao=sources.some(w=>card(w).g159ShieldRole==='zao');if(c.type==='creature'&&zao){if(colors(c).includes('光')&&String(c.race).includes('エンジェル・コマンド'))c={...c,escape:true};if(colors(c).includes('闇')&&String(c.race).includes('デーモン・コマンド'))c={...c,slayer:true};}if(c.type==='creature'&&zagaanSources(s,p,x).length)c={...c,yobinion:true};if(c.type==='creature'&&sources.some(w=>w.uid!==x.uid&&card(w).g159ShieldRole==='perfect'))c={...c,sasage:Math.max(c.sasage||0,2)};return c;}
 };
}
