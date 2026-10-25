// Missing environment cards: continuations store physical IDs, never detached copies.
export function createEnvironmentRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter,cast,enqueue,targetOptions}=api;
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 const active=(s,p,role)=>s.players[p].battle.filter(x=>!api.ignored(s,x)&&effective(x,s).g37Role===role);
 const queue=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g37'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const follow=(t,op,more={})=>task('g37'+op,t.p,t.source,more);
 const usable=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const reserve=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const spells=(s,p)=>s.g37Spells?.[p]?.turn===s.turn?s.g37Spells[p].n:0;
 const parthenon=s=>[0,1].some(p=>active(s,p,'parthenon').length);
 function finishTargets(s,t,to='grave'){if(t.selected.length)move(s,t.selected.map(uid=>({player:s.players.findIndex(p=>p.battle.some(x=>x.uid===uid)),uid,to,destroy:to==='grave',controller:t.controller??t.p})).filter(r=>r.player>=0));}
 function run(s,t){if(!t.op.startsWith('g37'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g37Blue':if(creatures(s,1-t.p).length>=creatures(s,t.p).length+4&&!activeBlue(s,t.p)&&own.hand.some(x=>x.uid===t.uid)&&api.canEnter(s,t.p,card(t.source),{origin:'hand',execution:true})&&api.canCast(s,t.p,card(t.source),'hand'))choice(s,t,'ブルー・インパルスをコストを支払わずに召喚する？',[opt('召喚する',true,30,t.source),skip()]);break;
 case'g37Smash':{const x=live(s,t),c=x&&faces(card(x))[1];if(c&&api.canCast(s,t.p,c,'battle'))choice(s,t,'スマッシュ・バーストで呪文側を唱える？',[opt('唱える',true,30,t.source),skip()]);break;}
 case'g37Bounce':{const rows=[...creatures(s,t.p),...creatures(s,1-t.p)].filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=3||!rows.length){finishTargets(s,t,'hand');break;}choice(s,t,'手札に戻すクリーチャーを3体まで選ぶ（'+t.selected.length+'/3）',[...targetOptions(s,t.p,rows).map(o=>({...o,score:own.battle.some(x=>x.uid===o.value)?-10:o.score})),opt('この選択で戻す',null,0)]);break;}
 case'g37Hogan':{api.shuffleLibrary(s,t.p);const x=own.deck.find(x=>!reserve(own).has(x.uid));if(!x)break;api.log(s,t.p,'reveal','ホーガン・ブラスターで公開：'+card(x).name,{cardId:x.cardId});const rows=faces(card(x)).flatMap((c,face)=>c.type==='spell'&&api.canCast(s,t.p,c,'deck')?[opt(c.name+'を唱える',{uid:x.uid,face,spell:true},20+cost(c),x.cardId)]:c.type==='creature'&&usable(s,t.p,x,'deck')?[opt(c.name+'を出す',{uid:x.uid,face,spell:false},20+cost(c),x.cardId)]:[]);choice(s,t,'公開したカードを使う？',[...rows,skip()]);break;}
 case'g37Darts':{const owner=t.owner??t.p;choice(s,{...t,p:1-owner,owner,controller:owner},'相手のシールドを1枚選ぶ',s.players[owner].shields.filter(root=>!api.shieldCards(root).some(x=>x.g37ShieldHeld)).map((root,i)=>opt('シールド'+(i+1),root.uid,0)));break;}
 case'g37DartsUse':{const root=api.findShield(own,t.target),xs=root?api.shieldCards(root).filter(x=>!x.g37ShieldHeld&&(!t.remaining||t.remaining.includes(x.uid))):[],options=xs.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&api.canCast(s,t.p,c,'shields')?[opt(c.name+'を唱える',{uid:x.uid,face},20+cost(c),x.cardId)]:[]));api.log(s,t.p,'look','ラッキー・ダーツ：選ばれたシールドを確認',{cardId:t.source});if(options.length)choice(s,{...t,remaining:xs.map(x=>x.uid)},'選ばれたシールドの呪文を唱える？',[...options,skip()]);break;}
 case'g37Watergate':{if(api.deckLocked(s,t.p)){api.log(s,t.p,'libraryLocked','自分の山札を見る処理を行えない',{cardId:t.source});break;}const hidden=reserve(own);choice(s,t,'山札の上に置く多色カードを1枚選んでもよい',[...own.deck.filter(x=>!hidden.has(x.uid)&&new Set(faces(card(x)).flatMap(colors)).size>1).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
 case'g37Testa':choice(s,t,'マジックまたはアウトレイジを1枚捨てて2枚引く？',[...own.hand.filter(x=>faces(card(x)).some(c=>/マジック|アウトレイジ/.test(c.race))).map(x=>opt(card(x).name,x.uid,15-cost(card(x)),x.cardId)),skip()]);break;
 case'g37Cho':if(own.hand.length)choice(s,t,'手札を1枚捨てる',own.hand.map(x=>opt(card(x).name,x.uid,Math.max(...faces(card(x)).map(cost))*3,x.cardId)));else put(s,follow(t,'ChoTargets',{budget:0,selected:[]}));break;
 case'g37ChoTargets':{const rows=creatures(s,1-t.p).filter(x=>!t.selected.includes(x.uid)&&cost(card(x))<=(t.budget==='∞'?Infinity:t.budget));if(!rows.length){finishTargets(s,t);break;}choice(s,t,'コスト合計が残り'+t.budget+'以下になるように選ぶ',[...targetOptions(s,t.p,rows),opt('この選択で破壊する',null,0)]);break;}
 case'g37Yobirin':case'g37Smoke':{const x=live(s,t),family=t.op==='g37Yobirin'?'アビス':'メカまたはシノビ';if(x)choice(s,t,'他の'+family+'をタップして能力を使う？',[...creatures(s,t.p).filter(y=>y.uid!==x.uid&&!y.tapped&&(t.op==='g37Yobirin'?String(effective(y,s).race).includes('アビス'):/メカ|シノビ/.test(effective(y,s).race))).map(y=>opt(card(y).name,y.uid,15-cost(card(y)),y.cardId)),skip()]);break;}
 case'g37SmokeSpell':put(s,follow(t,'TapTarget'),task('draw',t.p,t.source,{n:1}));break;
 case'g37TapTarget':choice(s,t,'タップまたはアンタップするクリーチャーを選ぶ',targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)]));break;
 case'g37TapMode':{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===t.target)),x=s.players[p]?.battle.find(x=>x.uid===t.target);if(x)choice(s,t,card(x).name+'（'+(x.tapped?'タップ中':'アンタップ')+'）',[opt('タップする','tap',p===t.p?-5:15),opt('アンタップする','untap',p===t.p?15:-5)]);break;}
 case'g37Never':choice(s,t,'手札からコスト7以下の進化ではないクリーチャーを出す？',[...own.hand.filter(x=>card(x).type==='creature'&&!card(x).evolution&&!card(x).sMax&&cost(card(x))<=7&&usable(s,t.p,x,'hand')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g37Return':{const x=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetIncarnation);if(x)move(s,[{player:t.p,uid:x.uid,to:'hand',destroy:false}]);break;}
 case'g37Starfield':choice(s,t,'進化ではない自分のクリーチャーをマナに置く',targetOptions(s,t.p,creatures(s,t.p).filter(x=>!api.isEvolution(x))));break;
 case'g37StarfieldEvolve':if(own.mana.some(x=>t.moved.includes(x.uid)))put(s,task('g34_Select',t.p,t.source,{origin:'mana',n:1,filter:{creature:true,evolution:true,max:own.mana.length},deploy:true}));break;
 case'g37OwnDestroy':{const rows=creatures(s,t.p).filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=2||!rows.length){put(s,follow(t,'EnemyDestroy',{owner:1-t.p}));finishTargets(s,t);break;}choice(s,t,'破壊する自分のクリーチャーを2体選ぶ（'+t.selected.length+'/2）',rows.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
 case'g37EnemyDestroy':choice(s,{...t,p:t.owner,controller:t.p},'破壊する自分のクリーチャーを1体選ぶ',creatures(s,t.owner).map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;
 case'g37DarkMasters':{const rows=opp.hand.filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=3||!rows.length){discardEnemy(s,t);break;}choice(s,t,'相手の手札から3枚まで選んで捨てさせる（'+t.selected.length+'/3）',[...rows.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),opt('この選択で捨てさせる',null,0)]);break;}
 case'g37GalaxyMax':{const both=['光','水'].every(c=>creatures(s,t.p).some(x=>colors(effective(x,s)).includes(c)));choice(s,t,'護天！銀河MAXの効果を選ぶ',[opt('手札1枚を表向きのシールドにする','shield',own.hand.length?15:-5),opt('相手1体を手札に戻す','bounce',opp.battle.length?20:0),...(both?[opt('両方の効果を使う','both',40)]:[])]);break;}
 case'g37ShieldHand':choice(s,t,'表向きのシールドにする手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,10-cost(card(x)),x.cardId)));break;
 default:throw Error('未対応の環境カード処理：'+t.op);
 }return true;}
 function discardEnemy(s,t){if(t.selected.length)api.discardSelected(s,{p:1-t.p,controller:t.p,causedBy:t.p,source:t.source},t.selected);}
 function chosen(s,t,v){if(!t.op.startsWith('g37'))return false;const own=s.players[t.p];switch(t.op){
 case'g37Blue':if(v&&creatures(s,1-t.p).length>=creatures(s,t.p).length+4&&!activeBlue(s,t.p)&&own.hand.some(x=>x.uid===t.uid)&&api.canEnter(s,t.p,card(t.source),{execution:true})&&api.canCast(s,t.p,card(t.source),'hand'))cast(s,t.p,t.uid,true,null,0,null,'hand','ターン終了時の能力');break;
 case'g37Smash':if(v&&live(s,t))api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source);break;
 case'g37Bounce':if(v)put(s,{...t,selected:[...t.selected,v]});else finishTargets(s,t,'hand');break;
 case'g37Hogan':if(v){const x=own.deck.find(x=>x.uid===v.uid);if(x)put(s,task('g34_Put',t.p,t.source,{target:x.uid,origin:'deck',face:v.face,execution:v.spell}));}break;
 case'g37Darts':if(v)put(s,task('g37DartsUse',t.owner,t.source,{target:v}));break;
 case'g37DartsUse':if(v){const remaining=t.remaining.filter(uid=>uid!==v.uid);if(remaining.length)put(s,{...t,remaining});api.castShieldSpell(s,t.p,v.uid,v.face,t.source);}break;
 case'g37Watergate':{if(api.deckLocked(s,t.p))break;const x=v&&own.deck.find(x=>x.uid===v);if(x){remove(own.deck,x.uid);api.log(s,t.p,'reveal','山札の上に置くカードを公開：'+card(x).name,{cardId:x.cardId});}api.shuffleLibrary(s,t.p);if(x)own.deck.unshift(x);break;}
 case'g37Testa':case'g37Cho':if(v){const x=own.hand.find(x=>x.uid===v);if(x)api.discardSelected(s,{p:t.p,controller:t.p,causedBy:t.p,source:t.source,g37Follow:t.op==='g37Testa'?'testa':'cho'},[v]);}break;
 case'g37ChoTargets':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,{...t,selected:[...t.selected,v],budget:t.budget==='∞'?'∞':t.budget-cost(card(x))});}else finishTargets(s,t);break;
 case'g37Yobirin':case'g37Smoke':if(v){const x=live(s,t),y=own.battle.find(x=>x.uid===v&&!x.tapped);if(x&&y){api.tap(s,t.p,y);if(t.op==='g37Yobirin')api.castBattleSpell(s,t.p,x.uid,x.incarnation||0,x.cardId,'アビス・フレンド・バースト');else put(s,task('g19MekraidLook',t.p,t.source));}}break;
 case'g37TapTarget':if(v)put(s,follow(t,'TapMode',{target:v}));break;
 case'g37TapMode':{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===t.target)),x=s.players[p]?.battle.find(x=>x.uid===t.target);if(x){if(v==='tap')api.tap(s,p,x);else if(api.canUntap(x)){x.tapped=false;}api.log(s,t.p,'tapState',card(x).name+'：'+(x.tapped?'タップ中':'アンタップ'),{cardId:x.cardId,targetUid:x.uid,tapped:x.tapped});}break;}
 case'g37Never':if(v){const x=own.hand.find(x=>x.uid===v);if(x&&usable(s,t.p,x,'hand')){remove(own.hand,v);clear(x,'battle');enter(s,t.p,x,null,{origin:'hand',execution:false});if(own.battle.includes(x))put(s,follow(t,'Return',{target:x.uid,targetIncarnation:x.incarnation||0}));}}break;
 case'g37Starfield':if(v){const x=own.battle.find(x=>x.uid===v);if(x){put(s,follow(t,'StarfieldEvolve',{moved:api.layers(x).map(x=>x.uid)}));move(s,[{player:t.p,uid:v,to:'mana',destroy:false}]);}}break;
 case'g37OwnDestroy':put(s,{...t,selected:[...t.selected,v]});break;
 case'g37EnemyDestroy':if(v)move(s,[{player:t.p,uid:v,to:'grave',destroy:true,controller:t.controller}]);break;
 case'g37DarkMasters':if(v)put(s,{...t,selected:[...t.selected,v]});else discardEnemy(s,t);break;
 case'g37GalaxyMax':put(s,...(v==='shield'||v==='both'?[follow(t,'ShieldHand')]:[]),...(v==='bounce'||v==='both'?[task('g34_Target',t.p,t.source,{to:'hand'})]:[]));break;
 case'g37ShieldHand':if(v){const x=remove(own.hand,v);if(x){clear(x,'shields');x.faceUp=true;api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);api.log(s,t.p,'reveal',card(x).name+'を表向きのシールドに置く',{cardId:x.cardId});}}break;
 default:throw Error('未対応の環境カード選択：'+t.op);
 }return true;}
 const activeBlue=(s,p)=>creatures(s,p).some(x=>card(x).id==='dm23bd7-003');
 return {run,chosen,
 effect(s,p,c,uid,entry){if(c.effect!=='environment')return false;const role=c.g37Role;if(role==='gift'){(s.g37Gifts??=[]).push({p,turn:s.turn});return true;}const op={blueBounce:'Bounce',hogan:'Hogan',darts:'Darts',watergate:'Watergate',testa:'Testa',yobirin:'Yobirin',cho:'Cho',never:'Never',starfield:'Starfield',dupoiz:'OwnDestroy',smokeSpell:'SmokeSpell',darkMasters:'DarkMasters',galaxyMax:'GalaxyMax'}[role];if(!op)throw Error('未対応の環境カード：'+role);put(s,task('g37'+op,p,c.id,{uid,incarnation:entry?.incarnation||0,...(['Bounce','OwnDestroy','DarkMasters'].includes(op)?{selected:[]}:{} )}));return true;},
 nextDiscount:(s,p)=>3*(s.g37Gifts||[]).filter(x=>x.p===p&&x.turn===s.turn).length,
 summoned(s,p){s.g37Gifts=(s.g37Gifts||[]).filter(x=>x.p!==p||x.turn!==s.turn);},
 spellCast(s,p){s.g37Spells??=[{},{}];s.g37Spells[p]={turn:s.turn,n:spells(s,p)+1};},
 allowedCast:(s,p,c)=>c.type!=='spell'||!parthenon(s)||spells(s,p)<3,
 allowedEntry:(s,p,c)=>c?.type!=='creature'||!parthenon(s)||(s.players[p].enteredThisTurn||0)<3,
 discarded(s,t,x,actual){if(t.g37Follow==='testa'&&actual)put(s,task('draw',t.p,t.source,{n:2}));if(t.g37Follow==='cho')put(s,follow(t,'ChoTargets',{selected:[],budget:actual?(faces(card(x)).some(c=>cost(c)===Infinity)?'∞':Math.max(...faces(card(x)).map(cost))):0}));},
 attack(s,p,x){if(api.ignored(s,x)||api.selfStopped(s,p))return;const role=effective(x,s).g37Role;if(role==='shuffle'){enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g9Number',p,x.cardId,{family:'shuffle'})});}if(role==='blue')queue(s,p,x,'Smash');if(role==='smoke')queue(s,p,x,'Smoke');},
 end(s){const p=1-s.active;return s.players[p].hand.filter(x=>card(x).g37Role==='blue'&&creatures(s,1-p).length>=creatures(s,p).length+4&&!activeBlue(s,p)).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g37Blue',p,x.cardId,{uid:x.uid})}));},
 snapshot(s){return {creatures:s.players.flatMap(p=>p.battle.filter(x=>api.isCreature(s,x)).map(x=>x.uid)),watchers:[0,1].flatMap(p=>api.selfStopped(s,p)?[]:active(s,p,'yobirin').map(x=>({p,uid:x.uid,source:x.cardId})))};},
 leaving(s,p,x,snapshot,destroy){if(!destroy||!(snapshot?snapshot.creatures.includes(x.uid):api.isCreature(s,x)))return;for(const w of snapshot?.watchers||[])enqueue(s,w.p,{uid:w.uid,source:w.source,effect:'extended',task:task('optionalDrawOne',w.p,w.source)});},
 beforeBreak(s,p,uids){const ctx=s.breakContext,a=ctx&&!ctx.reverse&&ctx.player!==p&&s.players[ctx.player].battle.find(x=>x.uid===ctx.sourceUid);if(!a||effective(a,s).g37Role!=='adamski')return false;const n=uids.filter(uid=>api.findShield(s.players[p],uid)).length;s.breakContext=null;api.mill(s,p,2*n);api.log(s,s.active,'breakReplace','アダムスキー：シールド'+n+'つのブレイクを山札'+2*n+'枚の墓地送りに置き換える',{cardId:a.cardId});return true;}
 };
}
