// Exact champion-list additions. All choices refer to physical UIDs and survive JSON replay.
export function createChampionRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const magic=x=>faces(card(x)).some(c=>String(c.race).includes('魔導具'));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g38_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g38_'+op,...more});
 function trialFinish(s,t){const own=s.players[t.p],ids=t.ids||[],all=!api.deckLocked(s,t.p)&&ids.length===own.deck.length;if(all){own.g38LibrarySafe=true;put(s,task('g5ExtraTurn',t.p,t.source));}const rows=ids.map(uid=>remove(own.deck,uid)).filter(Boolean);own.g38Protected=(own.g38Protected||[]).filter(uid=>!ids.includes(uid));for(const x of rows){clear(x,'hand');own.hand.push(x);}api.log(s,t.p,'trial','公開した'+rows.length+'枚を手札に加える'+(all?'。山札切れで負けない効果を得る':''),{cardId:t.source});api.deckCheck(s,t.p);}
 function trial(s,t){const own=s.players[t.p],ids=t.ids||[],next=api.deckLocked(s,t.p)?null:own.deck.find(x=>!ids.includes(x.uid));if(!next){trialFinish(s,t);return;}const values=[...new Set(faces(card(next)).map(c=>cost(c)===Infinity?'∞':cost(c)))];(own.g38Protected??=[]).push(next.uid);api.log(s,t.p,'reveal',card(next).name,{cardId:next.cardId});const more={...t,ids:[...ids,next.uid],costs:t.costs||[]};if(values.length>1)choice(s,{...more,op:'g38_TrialCost'},'神の試練：公開した'+card(next).name+'のどちらのコストを参照する？',values.map(n=>opt('コスト'+n,n,more.costs.includes(n)?-20:20,next.cardId)));else trialCost(s,more,values[0]);}
 function trialCost(s,t,n){if(t.costs.includes(n))trialFinish(s,t);else queue(s,t,'Trial',{costs:[...t.costs,n]});}
 function run(s,t){if(!t.op.startsWith('g38_'))return false;const own=s.players[t.p];switch(t.op){
 case'g38_Party':{const selected=t.selected||[],rows=creatures(s,1-t.p).filter(x=>!selected.some(y=>y.uid===x.uid));if(selected.length===3||!rows.length){queue(s,t,'PartySend',{selected,stage:0,used:[]});break;}choice(s,{...t,selected},'パーティ：移動させる相手のクリーチャーを3体まで選ぶ（'+selected.length+'/3）',[...targetOptions(s,t.p,rows),opt('ここまでで確定',null,0)]);break;}
 case'g38_PartySend':{const owner=1-t.p,rows=creatures(s,owner).filter(x=>t.selected.some(y=>y.uid===x.uid&&(x.incarnation||0)===y.incarnation)&&!t.used.includes(x.uid));if(t.stage>=3||!rows.length)break;const to=['shields','mana','hand'][t.stage];choice(s,{...t,p:owner,controller:t.p},'パーティ：自分のクリーチャーを'+({shields:'シールド',mana:'マナ',hand:'手札'}[to])+'へ移す',rows.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
 case'g38_Lood':queue(s,t,'LoodBounce');api.draw(s,t.p,1);break;
 case'g38_LoodBounce':move(s,creatures(s,1-t.p).filter(x=>cost(effective(x,s))<=own.hand.length).map(x=>({player:1-t.p,uid:x.uid,to:'hand',destroy:false})));break;
 case'g38_Plaisir':{const options=['hand','grave'].flatMap(origin=>own[origin].flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&cost(c)<=5&&api.colors(c).some(x=>['水','火'].includes(x))&&api.canCast(s,t.p,c,origin)?[opt(c.name,{uid:x.uid,origin,face},20+cost(c),x.cardId)]:[])));choice(s,t,'プレジール：手札または墓地から水か火の呪文を唱える？',[...options,skip()]);break;}
 case'g38_Esmer':choice(s,t,'エスメル：自分のシールドを1つマナへ置く？',[...own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)),skip()]);break;
 case'g38_Tea':own.g38TeaReturns=(own.g38TeaReturns||0)+1;api.shieldTop(s,t.p,card(t.source));break;
 case'g38_TeaReturn':choice(s,t,'シールドを1つ手札に加える（S・トリガーは使わない）',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,5)));break;
 case'g38_Yabadan':choice(s,t,'ヤバーダン：破壊する相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g38_YabadanMill':choice(s,t,'山札の上から'+t.n+'枚を墓地に置く？',[opt('墓地に置く',true,t.n<own.deck.length?10:-100),skip()]);break;
 case'g38_Another':for(const p of[s.active,1-s.active]){const rows=[...s.players[p].hand.splice(0),...s.players[p].grave.splice(0)];for(const x of rows)clear(x,'deck');api.shuffleLibrary(s,p,rows,t.source);}put(s,...[s.active,1-s.active].map(p=>task('draw',p,t.source,{n:5})));break;
 case'g38_Trial':trial(s,t);break;
 case'g38_Mondo':own.g38LibrarySafe=true;api.draw(s,t.p,5);if(!own.deck.length)put(s,task('g5ExtraTurn',t.p,t.source));break;
 case'g38_DoryumCost':{const selected=(t.selected||[]).filter(uid=>own.hand.some(x=>x.uid===uid));if(selected.length===2){put(s,task('g38_DoryumCast',t.p,t.source,{target:t.target}));api.discardSelected(s,{...t,n:2,causedBy:t.p},selected);break;}choice(s,{...t,selected},'ド・リュミーズ：捨てる魔導具を2枚選ぶ（'+selected.length+'/2）',own.hand.filter(x=>x.uid!==t.target&&!selected.includes(x.uid)&&magic(x)).map(x=>opt(card(x).name,x.uid,15-cost(card(x)),x.cardId)));break;}
 case'g38_DoryumCast':if(own.hand.some(x=>x.uid===t.target)&&api.canCast(s,t.p,card(t.source),'hand'))api.cast(s,t.p,t.target,true,null,0,null,'hand','ド・リュミーズの代替コスト');break;
 case'g38_Ukidu':{const options=[0,1].flatMap(p=>s.players[p].shields.map((x,i)=>opt((p===t.p?'自分':'相手')+'のシールド'+(i+1),{p,uid:x.uid},p===t.p?-2:10)));if(options.length)choice(s,t,'ウキドゥ：見るシールドを選ぶ',options);else put(s,task('draw',t.p,t.source,{n:1}));break;}
 case'g38_Croce':for(const p of[s.active,1-s.active]){const rows=s.players[p].grave.splice(0);for(const x of rows)clear(x,'deck');api.shuffleLibrary(s,p,rows,t.source);}break;
 case'g38_MelaBreak':{const p=t.defender,shields=s.players[p].shields,n=Math.min(2,shields.length),selected=(t.selected||[]).filter(uid=>shields.some(x=>x.uid===uid));if(!n){if(p!==t.p)queue(s,t,'MelaBreak',{defender:t.p,selected:[]});break;}if(n===shields.length||selected.length===n){api.interruptBreak(s,p,n===shields.length?shields.map(x=>x.uid):selected,task(p!==t.p?'g38_MelaBreak':'g38_Done',t.p,t.source,{defender:t.p,selected:[]}));break;}choice(s,{...t,selected},'メラヴォルガル：'+(p===t.p?'自分':'相手')+'のブレイクするシールドを選ぶ（'+selected.length+'/'+n+'）',shields.filter(x=>!selected.includes(x.uid)).map((x,i)=>opt('シールド'+(shields.indexOf(x)+1),x.uid,0)));break;}
 case'g38_Done':break;
 case'g38_Sycrill':choice(s,t,'サイクリル：コスト4以下の呪文を墓地から手札に戻す？',[...own.grave.filter(x=>faces(card(x)).some(c=>c.type==='spell'&&cost(c)<=4)).map(x=>opt(card(x).name,x.uid,15,x.cardId)),skip()]);break;
 case'g38_Mantis':{const p=t.owner,rows=creatures(s,p),selected=(t.selected||[]).filter(uid=>rows.some(x=>x.uid===uid));if(selected.length===Math.min(2,rows.length)){move(s,rows.filter(x=>!selected.includes(x.uid)).map(x=>({player:p,uid:x.uid,to:'mana',destroy:false,controller:t.p})));break;}choice(s,{...t,p,controller:t.p,selected},'マンティス：場に残す自分のクリーチャーを2体選ぶ',rows.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,cost(effective(x,s)),x.cardId)));break;}
 case'g38_Land':{const rows=own.mana.filter(x=>['creature','seed','field','gear'].includes(card(x).type)&&!card(x).evolution&&!card(x).sMax&&String(card(x).race).includes('ジャイアント')&&cost(card(x))<=8&&api.canEnter(s,t.p,card(x),{origin:'mana',execution:false}));choice(s,t,'輝跡の大地：マナから出すコスト8以下のジャイアントを選ぶ',rows.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
 case'g38_LandFight':{const x=live(s,t);if(x&&api.isCreature(s,x))choice(s,t,'出したジャイアントとバトルさせる相手を選ぶ？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;}
 default:throw Error('未実装の優勝デッキ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g38_'))return false;const own=s.players[t.p];switch(t.op){
 case'g38_Party':{const x=creatures(s,1-t.p).find(x=>x.uid===v);queue(s,t,v?'Party':'PartySend',{selected:x?[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]:t.selected,stage:0,used:[]});break;}
 case'g38_PartySend':{const owner=t.p,p=t.controller,to=['shields','mana','hand'][t.stage],next={...t,p,stage:t.stage+1,used:[...t.used,v]};queue(s,next,'PartySend');move(s,[{player:owner,uid:v,to,destroy:false,controller:p}]);break;}
 case'g38_Plaisir':if(v){const x=own[v.origin].find(x=>x.uid===v.uid);if(x){x.finishTo='deck';api.cast(s,t.p,x.uid,true,null,v.face,null,v.origin,'プレジール');}}break;
 case'g38_Esmer':if(v)api.moveShield(s,t.p,v,'mana');break;
 case'g38_TeaReturn':if(v)api.moveShield(s,t.p,v,'hand');break;
 case'g38_Yabadan':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){const n=cost(effective(x,s));queue(s,t,'YabadanMill',{n:Number.isFinite(n)?n:s.players[t.p].deck.length});move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true}]);}break;}
 case'g38_YabadanMill':if(v)api.mill(s,t.p,t.n);break;
 case'g38_TrialCost':trialCost(s,t,v);break;
 case'g38_DoryumCost':queue(s,t,'DoryumCost',{selected:[...t.selected,v]});break;
 case'g38_Ukidu':{const x=api.findShield(s.players[v.p],v.uid);if(x){const label=api.shieldCards(x).map(y=>card(y).name).join(' / ');choice(s,{...t,op:'g38_UkiduReplace',target:v},'確認したシールド：'+label+'。墓地に置いて新しいシールドに替える？',[opt('墓地へ置き、新しいシールドに替える',true,v.p===t.p?-1:10),opt('そのままにする',false,0)]);}else put(s,task('draw',t.p,t.source,{n:1}));break;}
 case'g38_UkiduReplace':if(v&&api.findShield(s.players[t.target.p],t.target.uid)){api.moveShield(s,t.target.p,t.target.uid,'grave');api.shieldTop(s,t.target.p,card(t.source));}put(s,task('draw',t.p,t.source,{n:1}));break;
 case'g38_MelaBreak':queue(s,t,'MelaBreak',{selected:[...t.selected,v]});break;
 case'g38_Sycrill':if(v){const x=remove(own.grave,v);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g38_Mantis':queue(s,{...t,p:t.controller},'Mantis',{selected:[...t.selected,v]});break;
 case'g38_Land':{const x=remove(own.mana,v);if(x){clear(x,'battle');api.enter(s,t.p,x,null,{origin:'mana',execution:false});queue(s,t,'LandFight',{uid:x.uid,incarnation:x.incarnation||0});}break;}
 case'g38_LandFight':if(v){const x=live(s,t),y=s.players[1-t.p].battle.find(x=>x.uid===v);if(x&&y)api.battle(s,t.p,x,1-t.p,y);}break;
 default:throw Error('未実装の優勝デッキ選択：'+t.op);
 }return true;}
 return{run,chosen,
 start(s,p){const n=s.players[p].g38TeaReturns||0;s.players[p].g38TeaReturns=0;return [...Array.from({length:n},()=>({source:'dmex12-016',effect:'extended',task:task('g38_TeaReturn',p,'dmex12-016')})),...creatures(s,p).filter(x=>effective(x,s).g38Mantis).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Select',p,x.cardId,{origin:'mana',to:'hand',n:1,optional:true})}))];},
 effect(s,p,c,uid){if(c.effect!=='champion')return false;const op=c.g38Effect;if(op==='Draw3')put(s,task('draw',p,c.id,{n:3}));else put(s,task('g38_'+op,p,c.id,{uid,defender:1-p,owner:1-p}));return true;},
 attack(s,p,x){if(effective(x,s).g38Plaisir&&!api.selfStopped(s,p))on(s,p,x,'Plaisir');if(effective(x,s).g38Revive&&!api.selfStopped(s,p))api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Select',p,x.cardId,{origin:'grave',n:1,optional:true,deploy:true,filter:{creature:true,max:8},grant:{entryPlayerAttack:true}})});if(api.selfStopped(s,p)||!String(effective(x,s).race).includes('スノーフェアリー'))return;for(const y of creatures(s,p).filter(y=>effective(y,s).g38Sycrill)){const key=y.uid+'@'+(y.incarnation||0);if(s.g38SycrillUsed?.[key]!==s.turn){(s.g38SycrillUsed??={})[key]=s.turn;on(s,p,y,'Sycrill');}}},
 mainActions(s,p){const own=s.players[p],out=[];for(const x of own.grave){const c=card(x);if(c.g38GraveSummon&&api.canCast(s,p,c,'grave')&&api.canEnter(s,p,c,{origin:'grave',execution:true})&&api.canPay(s,p,c))out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',cost:api.summonCost(s,p,c),label:c.name+'を墓地から召喚する'});}for(const x of own.hand){const c=card(x);if(!api.canCast(s,p,c,'hand'))continue;if(c.g38Effect==='Croce'&&s.players[1-p].grave.length>=5&&api.canEnter(s,p,c,{origin:'hand',execution:true}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',cost:0,freeSummon:'G・ゼロ',label:c.name+'をG・ゼロで召喚する'});if(c.g38Effect==='Draw3'&&own.mana.length>=4&&own.mana.some(magic)&&own.hand.filter(y=>y.uid!==x.uid&&magic(y)).length>=2)out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',cost:0,alternative:'champion',label:c.name+'を魔導具2枚を捨てて唱える'});}return out;},
 alternative(s,p,a){put(s,task('g38_DoryumCost',p,a.cardId,{target:a.uid,selected:[]}));},
 };
}
