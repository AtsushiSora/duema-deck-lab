// No.19: shield events, protected reveals, typed revolution changes and saved continuations.
export function createMechaRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,draw,mill,move,enter,cast,log,targetOptions,shieldTo}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),mecha=c=>String(c.race).includes('メカ'),light=c=>colors(c).includes('光');
 const on=(s,p,source,op,more={})=>api.enqueue(s,p,{uid:more.uid,source,effect:'extended',task:task(op,p,source,more)});
 const live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const canPut=(s,p,x,origin,execution=false)=>api.canEnter(s,p,card(x),{origin,execution})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const lightCount=(s,p)=>s.players[p].battle.filter(x=>['creature','seed'].includes(card(x).type)&&light(card(x))).length;
 function shieldOptions(s,t){choice(s,t,'山札の上をシールド化する？',[opt('シールドを増やす',true,s.players[t.p].deck.length>1?10:-10),skip()]);}
 function prepareLook(s,t,value){const own=s.players[t.p],selected=value?[value.uid]:[];own.g19Reveals=t.uids.filter(uid=>!selected.includes(uid));own.g19Holding=selected.map(uid=>remove(own.deck,uid)).filter(Boolean);put(s,...(value?[task('g19Held',t.p,t.source,{uid:value.uid,face:value.face||0,execution:!!t.execution,blocker:!!t.blocker,origin:t.origin||'deck'})]:[]),task('g19LookFinish',t.p,t.source,{uids:own.g19Reveals,shuffle:!!t.shuffle}));if(selected.length)api.deckCheck(s,t.p);}
 function run(s,t){if(!t.op.startsWith('g19'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g19SheketDraw':if(t.remaining&&own.deck.length)choice(s,t,'ドメチアーレでもう1枚引く？（残り'+t.remaining+'枚まで）',[opt('1枚引く',true,own.deck.length>1?10:-10),opt('ここまでで止める',null,0)]);break;
  case'g19Protect':{const x=live(s,t);if(x)x.g19Protected=true;break;}
  case'g19Shield':shieldOptions(s,t);break;
  case'g19Petrova':put(s,task('g19Shield',t.p,t.source),task('g19PetrovaDeploy',t.p,t.source));break;
  case'g19PetrovaDeploy':put(s,task('g19SelectDeploy',t.p,t.source,{origin:'hand',max:own.shields.length}));break;
  case'g19SelectDeploy':{const list=own[t.origin].filter(x=>card(x).type==='creature'&&cost(card(x))<=t.max&&(!t.mecha||mecha(card(x)))&&canPut(s,t.p,x,t.origin));choice(s,t,'コスト'+t.max+'以下を'+(t.origin==='hand'?'手札':'墓地')+'から出す',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
  case'g19BojiMill':choice(s,t,'山札の上4枚を墓地に置く？',[opt('4枚を墓地へ',true,own.deck.length>4?10:-20),skip()]);break;
  case'g19BojiEnd':put(s,task('g19BojiSelect',t.p,t.source,{selected:[]}));break;
  case'g19BojiSelect':{const origin=t.selected.some(x=>x.origin==='hand')||t.handDone?'grave':'hand',list=own[origin].filter(x=>card(x).type==='creature'&&cost(card(x))<=4&&canPut(s,t.p,x,origin)&&assignable(s,t.p,[...t.selected.map(r=>own[r.origin].find(y=>y.uid===r.uid)),x]));if(origin==='grave'&&t.graveDone){prepareBoji(s,t);break;}choice(s,{...t,origin},(origin==='hand'?'手札':'墓地')+'からコスト4以下を最大1体選ぶ',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
  case'g19Held':{const x=own.g19Holding?.find(x=>x.uid===t.uid);if(!x)break;const c=faces(card(x))[t.face||0];if(c.type==='spell'){if(api.canCast(s,t.p,c)){x.g5Origin=t.origin;cast(s,t.p,x.uid,true,null,t.face||0,null,'g19Holding','メカ・メクレイド');}else failHeld(s,t);break;}if(!canPut(s,t.p,x,t.origin,!!t.execution)){failHeld(s,t);break;}if(c.evolution||c.neoEvolution){const bases=api.evolutionBases(s,t.p,c).filter(x=>(!t.bases||t.bases.includes(x.uid))&&assignable(s,t.p,own.g19Holding.filter(y=>y.uid!==t.uid),[x.uid],t.bases));choice(s,t,'出すクリーチャーの進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',false,0)]:[]),...bases.map(x=>opt(card(x).name,x.uid,10,x.cardId))]);if(!bases.length&&!c.neoEvolution)failHeld(s,t);}else enterHeld(s,t,null);break;}
  case'g19Dran':choice(s,t,'自分のシールドを1つブレイクする？',[...own.shields.map((x,i)=>opt('シールド'+(i+1)+'をブレイク',x.uid,10)),skip()]);break;
  case'g19DranDeploy':put(s,task('g19SelectDeploy',t.p,t.source,{origin:'hand',max:3,mecha:true}));break;
  case'g19Goryu':{const x=api.shieldTop(s,t.p,card(t.source));if(x)x.g19ShieldST=t.p;break;}
  case'g19Yobi':choice(s,t,'ヨビニオンを使う？',[opt('小さいクリーチャーが出るまで公開する',true,own.deck.length>1?15:-10),skip()]);break;
  case'g19YobiReveal':{const index=own.deck.findIndex(x=>card(x).type==='creature'&&cost(card(x))<t.max),uids=own.deck.slice(0,index<0?own.deck.length:index+1).map(x=>x.uid),hit=index<0?null:own.deck[index];log(s,t.p,'reveal','ヨビニオンで公開：'+uids.map(uid=>card(own.deck.find(x=>x.uid===uid)).name).join('、'),{cardId:t.source});prepareLook(s,{...t,uids,shuffle:true},hit&&canPut(s,t.p,hit,'deck')?{uid:hit.uid}:null);break;}
  case'g19LookFinish':{const all=t.uids.flatMap(uid=>{const x=remove(own.deck,uid);return x?[x]:[];});delete own.g19Reveals;if(t.shuffle){own.deck.push(...api.shuffled(all,Math.floor(api.random(s)*4294967296)));}else{own.deck.push(...all);put(s,task('g20Bottom',t.p,t.source,{uids:all.map(x=>x.uid)}));}break;}
  case'g19Mekraid':if((s.g19MekraidUsed||{})[t.key]!==s.turn)choice(s,t,'メカ・メクレイド5を使う？',[opt('山札の上3枚を見る',true,own.deck.length>1?15:-10),skip()]);break;
  case'g19MekraidLook':{const uids=own.deck.slice(0,3).map(x=>x.uid),list=own.deck.slice(0,3).flatMap(x=>faces(card(x)).map((c,face)=>({x,c,face}))).filter(({x,c})=>mecha(c)&&cost(c)<=5&&api.canCast(s,t.p,c)&&(c.type==='spell'||canPut(s,t.p,x,'deck',true)));choice(s,{...t,uids,execution:true},'メクレイドで実行するコスト5以下のメカを選ぶ',[...list.map(({x,c,face})=>opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)),skip()]);break;}
  case'g19Cobra':put(s,task('mill',t.p,t.source,{n:2}),task('revive',t.p,t.source,{max:5}));break;
  case'g19CobraDie':{const x=live(s,t);if(x&&t.p!==s.active&&(own.brokenThisTurn||0)<2)move(s,[{player:t.p,uid:x.uid,to:'grave'}]);break;}
  case'g19Venerak':{const x=opp.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetIncarnation);if(x)choice(s,t,'ヴェネラックで出たクリーチャーをシールド化する？',[opt('シールド化する',true,20,x.cardId),skip()]);break;}
  case'g19VenerakLeave':choice(s,t,'タップして次のターン起こさない相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case'g19MechaDraw':if(own.battle.some(x=>x.uid!==t.uid&&mecha(card(x))))draw(s,t.p,1);break;
  case'g19Amelia':api.shieldTop(s,t.p,card(t.source));(s.g19Delayed??=[]).push({p:t.p,source:t.source});break;
  case'g19AmeliaReturn':choice(s,t,'手札に加える自分のシールドを選ぶ（S・トリガー不可）',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,0)));break;
  case'g19Minus':choice(s,t,'このターンのパワーを-3000する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case'g19SheketAttack':choice(s,t,'シールド化する相手のクリーチャーを選ぶ',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
  case'g19Untap':{const list=creatures(s,t.p).filter(x=>x.tapped&&!t.selected.includes(x.uid)&&api.canUntap(x));if(t.selected.length===3||!list.length){for(const uid of t.selected){const x=own.battle.find(x=>x.uid===uid);if(x&&api.canUntap(x))x.tapped=false;}break;}choice(s,t,'アンタップする自分のクリーチャーを3体まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,10,x.cardId)),opt('ここまでで確定',null,0)]);break;}
  case'g19BeforeCommit':s.g19BreakSequence={...t,tasks:(s.extTasks||[]).splice(0)};break;
  default:throw Error('未実装のメカ効果：'+t.op);
 }return true;}
 function failHeld(s,t){const own=s.players[t.p],x=remove(own.g19Holding,t.uid);if(x)own[t.origin].push(x);}
 function enterHeld(s,t,base){const own=s.players[t.p],x=own.g19Holding.find(x=>x.uid===t.uid);if(!x)return;if(t.execution){x.g5Origin=t.origin;cast(s,t.p,x.uid,true,base,t.face||0,null,'g19Holding','メカ・メクレイド');}else{remove(own.g19Holding,x.uid);enter(s,t.p,x,base,{origin:t.origin,execution:false});}if(t.blocker&&own.battle.some(y=>y.uid===x.uid))x.g19Blocker=t.p;}
 function assignable(s,p,rows,used=[],allowed=null){if(!rows.length)return true;const x=rows[0];if(!card(x).evolution)return assignable(s,p,rows.slice(1),used,allowed);return api.evolutionBases(s,p,card(x)).some(b=>!used.includes(b.uid)&&(!allowed||allowed.includes(b.uid))&&assignable(s,p,rows.slice(1),[...used,b.uid],allowed));}
 function prepareBoji(s,t){const own=s.players[t.p],bases=creatures(s,t.p).map(x=>x.uid);own.g19Holding??=[];for(const r of t.selected){const x=remove(own[r.origin],r.uid);if(x)own.g19Holding.push(x);}put(s,...t.selected.map(r=>task('g19Held',t.p,t.source,{...r,blocker:true,bases})));}
 function chosen(s,t,value){if(!t.op.startsWith('g19'))return false;const own=s.players[t.p];switch(t.op){
  case'g19SheketDraw':if(value){put(s,{...t,remaining:t.remaining-1});draw(s,t.p,1);}break;
  case'g19Shield':if(value)api.shieldTop(s,t.p,card(t.source));break;
  case'g19BojiMill':if(value)mill(s,t.p,4);break;
  case'g19SelectDeploy':if(value)put(s,task('putCreature',t.p,t.source,{origin:t.origin,uid:value}));break;
  case'g19BojiSelect':{const selected=value?[...t.selected,{uid:value,origin:t.origin}]:t.selected,rows=selected.map(r=>own[r.origin].find(x=>x.uid===r.uid));if(!assignable(s,t.p,rows))break;const next={...t,selected,[t.origin==='hand'?'handDone':'graveDone']:true};put(s,next);break;}
  case'g19Held':enterHeld(s,t,value||null);break;
  case'g19Dran':if(value)api.interruptBreak(s,t.p,[value],task('g19DranDeploy',t.p,t.source));else put(s,task('g19DranDeploy',t.p,t.source));break;
  case'g19Yobi':if(value)put(s,task('g19YobiReveal',t.p,t.source,{max:t.max}));break;
  case'g19Mekraid':if(value&&(s.g19MekraidUsed||{})[t.key]!==s.turn){(s.g19MekraidUsed??={})[t.key]=s.turn;put(s,task('g19MekraidLook',t.p,t.source));}break;
  case'g19MekraidLook':prepareLook(s,t,value);break;
  case'g19Venerak':if(value&&oppLive(s,t))move(s,[{player:1-t.p,uid:t.target,to:'shields'}]);break;
  case'g19VenerakLeave':{const x=s.players[1-t.p].battle.find(x=>x.uid===value);if(x){api.tap(s,1-t.p,x);x.skipUntap=true;}break;}
  case'g19AmeliaReturn':{shieldTo(s,t.p,value,'hand');break;}
  case'g19Minus':{const x=s.players[1-t.p].battle.find(x=>x.uid===value);if(x)(x.powerModifiers??=[]).push({amount:-3000,expires:'end',who:s.active});break;}
  case'g19SheketAttack':if(value)move(s,[{player:1-t.p,uid:value,to:'shields'}]);break;
  case'g19Untap':if(value)put(s,{...t,selected:[...t.selected,value]});else for(const uid of t.selected){const x=own.battle.find(x=>x.uid===uid);if(x&&api.canUntap(x))x.tapped=false;}break;
  default:throw Error('未実装のメカ選択：'+t.op);
 }return true;}
 const oppLive=(s,t)=>s.players[1-t.p].battle.some(x=>x.uid===t.target&&(x.incarnation||0)===t.targetIncarnation);
 return {run,chosen,
  effect(s,p,c,uid,entry){const more={uid,incarnation:entry?.incarnation||0};switch(c.effect){case'sheketDraw':put(s,task('g19SheketDraw',p,c.id,{remaining:lightCount(s,p)}));break;case'petrovaProtect':put(s,task('g19Protect',p,c.id,more));break;case'bojiMill':put(s,task('g19BojiMill',p,c.id));break;case'dranEntry':put(s,task('g19Dran',p,c.id));break;case'goldShield':put(s,task('g19Shield',p,c.id));break;case'c0braRevive':put(s,task('g19Cobra',p,c.id));break;case'mechaDraw':put(s,task('g19MechaDraw',p,c.id,more));break;case'ameliaShield':put(s,task('g19Amelia',p,c.id));break;case'mechaMinus':put(s,task('g19Minus',p,c.id));break;case'goryuShield':put(s,task('g19Goryu',p,c.id));break;default:return false;}return true;},
  discount(s,p,c){return s.players[p].battle.reduce((n,x)=>{const d=effective(x,s);return n+(d.sheket&&light(c)&&['creature','seed'].includes(c.type)?2:0)+(d.ultraMecha&&mecha(c)?1:0);},0);},
  canLeave(s,p,x){return !x.g19Protected&&!(api.isCreature(s,x)&&s.players[p].shields.length>=7&&creatures(s,p).some(y=>effective(y,s).engelsProtect));},
  entry(s,p,x,options){const c=effective(x,s),stopped=options.selfMuted||api.selfStopped(s,p)||api.ignored(s,x);if(!stopped){if(c.yobinion&&options.execution!==false)on(s,p,x.cardId,'g19Yobi',{max:cost(card(x))});if(c.cobra&&p!==s.active&&(s.players[p].brokenThisTurn||0)<2)on(s,p,x.cardId,'g19CobraDie',{uid:x.uid,incarnation:x.incarnation||0});}if(api.isCreature(s,x)&&p===s.active&&!options.paidMana)for(const y of creatures(s,1-p))if(effective(y,s).venerak)on(s,1-p,y.cardId,'g19Venerak',{target:x.uid,targetIncarnation:x.incarnation||0});},
  attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.sheketAttack)on(s,p,x.cardId,'g19SheketAttack');if(c.petrovaAttack)on(s,p,x.cardId,'g19Petrova');if(c.ninjaMechraid)on(s,p,x.cardId,'g19Shield');},
  shieldAdded(s,p){for(const x of creatures(s,p))if(effective(x,s).ninjaMechraid&&(s.g19MekraidUsed||{})[key(x)]!==s.turn)on(s,p,x.cardId,'g19Mekraid',{key:key(x)});},
  beforeBreak(s,defender,uids){const context=s.breakContext;if(!context||context.g19Prepared||defender===context.player)return false;const x=s.players[context.player].battle.find(x=>x.uid===context.sourceUid);if(!x||!effective(x,s).engels)return false;context.g19Prepared=true;put(s,...uids.map(()=>task('g19Shield',context.player,x.cardId)),task('g19BeforeCommit',context.player,x.cardId,{defender,uids:[...uids],context:structuredClone(context)}));return true;},
  advanceBreak(s){const w=s.g19BreakSequence;if(!w||s.decision||s.extTasks?.length||s.pendingEffects?.length||s.triggers||s.leaving||s.battleResolution||s.g19Interrupt||s.winner!==null)return;delete s.g19BreakSequence;s.breakContext=w.context;s.extTasks=w.tasks;api.breakShields(s,w.defender,w.uids);},
  leaveSnapshot(s,rows){return Object.fromEntries(rows.flatMap(({player,uid})=>{const x=s.players[player].battle.find(x=>x.uid===uid);return x&&player!==s.active&&effective(x,s).venerak?[[uid,true]]:[];}));},
  leaving(s,p,x,snapshot){if(snapshot?.[x.uid])on(s,p,x.cardId,'g19VenerakLeave');},
  start(s,p){const due=(s.g19Delayed||[]).filter(x=>x.p===p);s.g19Delayed=(s.g19Delayed||[]).filter(x=>x.p!==p);return due.map(x=>({player:p,source:x.source,effect:'extended',task:task('g19AmeliaReturn',p,x.source)}));},
  end(s){return creatures(s,s.active).flatMap(x=>{const c=effective(x,s);return [...(c.boji?[{source:x.cardId,effect:'extended',task:task('g19BojiEnd',s.active,x.cardId)}]:[]),...(c.engels?[{source:x.cardId,effect:'extended',task:task('g19Untap',s.active,x.cardId,{selected:[]})}]:[])];});},
  expire(s,when,p){if(when==='start'){for(const top of s.players[p].battle)for(const x of api.layers(top)){delete x.g19Protected;delete x.g19Blocker;}for(const x of s.players[p].shields)delete x.g19ShieldST;}},
 };
}
