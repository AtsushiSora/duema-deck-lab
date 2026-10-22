// No.07: Armored deployment, optional payments and turn-scoped battle events.
export function createArmoredRules(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,draw,move,enter,cast,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),armored=c=>String(c.race).includes('アーマード'),dragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
 const noReduce=(s,p)=>creatures(s,1-p).some(x=>effective(x,s).noCostReduction);
 const reducers=(s,p,c)=>armored(c)&&!noReduce(s,p)?creatures(s,p).filter(x=>effective(x,s).koppi&&(s.g7DiscountUsed||{})[key(x)]!==s.turn):[];
 const selected=(s,p,c)=>reducers(s,p,c).filter(x=>!c.g7Payment?.reducers||c.g7Payment.reducers.includes(key(x)));
 const on=(s,p,source,op,more={})=>({player:p,uid:more.uid,source,effect:'extended',task:task(op,p,source,more)});
 const enqueue=(s,p,source,op,more={})=>api.enqueue(s,p,on(s,p,source,op,more));
 const unit=(s,t)=>ownUnit(s,t.p,t.uid,t.incarnation||0);
 const ownUnit=(s,p,uid,inc)=>s.players[p].battle.find(x=>api.layers(x).some(y=>y.uid===uid&&(y.incarnation||0)===inc));
 const payCard=(c,payment)=>({...c,g7Payment:payment});
 const energyPool=(s,p,chosen)=>creatures(s,p).filter(x=>!x.tapped&&!chosen.includes(x.uid)&&!chosen.some(uid=>cost(card(s.players[p].battle.find(y=>y.uid===uid)))===cost(card(x))));
 function canPayEnergy(s,p,c,payment){const chosen=payment.energy||[],copy={...s,players:s.players.map((x,i)=>i===p?{...x,battle:x.battle.map(y=>chosen.includes(y.uid)?{...y,tapped:true}:y)}:x)};return api.canPay(copy,p,payCard(c,payment));}
 function feasibleEnergy(s,p,c,payment,chosen=[]){if(canPayEnergy(s,p,c,{...payment,energy:chosen}))return true;if(chosen.length>=Math.ceil(cost(c)/2)||noReduce(s,p))return false;return energyPool(s,p,chosen).some(x=>feasibleEnergy(s,p,c,payment,[...chosen,x.uid]));}
 function virtualEntry(s,p,x,base=null){const own=s.players[p],battle=own.battle.filter(y=>y.uid!==base?.uid);battle.push({...x,...(base?{under:[base]}:{})});return {...s,players:s.players.map((y,i)=>i===p?{...y,battle}:y)};}
 function arrange(s,p,rows){if(!rows.length)return true;return rows.some((x,i)=>{const c=card(x),rest=rows.filter((_,j)=>j!==i);if(!api.canEnter(s,p,c,{origin:'deck',execution:false}))return false;if(c.evolution)return api.evolutionBases(s,p,c).some(b=>arrange(virtualEntry(s,p,x,b),p,rest));return arrange(virtualEntry(s,p,x),p,rest);});}
 function canPut(s,p,x,origin){return card(x).type!=='spell'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);}
 function prepare(s,t){const own=s.players[t.p];own.g7Holding??=[];for(const uid of t.selected){const x=remove(own.deck,uid);if(x)own.g7Holding.push(x);}own.g7Reveals=t.uids.filter(uid=>!t.selected.includes(uid));put(s,task('g7Next',t.p,t.source),task('g7Rest',t.p,t.source,{uids:own.g7Reveals}));if(t.selected.length)api.deckCheck(s,t.p);}
 function enterHeld(s,t,base){const own=s.players[t.p],x=remove(own.g7Holding,t.uid);if(x)enter(s,t.p,x,base,{origin:'deck',execution:false});put(s,task('g7Next',t.p,t.source));}
 function run(s,t){if(!t.op.startsWith('g7'))return false;const own=s.players[t.p];switch(t.op){
  case'g7Look':{const uids=own.deck.slice(0,4).map(x=>x.uid);put(s,task('g7Select',t.p,t.source,{uids,selected:[]}));break;}
  case'g7Select':{const list=t.uids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&card(x).name!==card(t.source).name&&armored(card(x))&&api.canEnter(s,t.p,card(x),{origin:'deck',execution:false})&&arrange(s,t.p,[...t.selected.map(uid=>own.deck.find(x=>x.uid===uid)),x]));if(!list.length){prepare(s,t);break;}choice(s,t,'上4枚から出すアーマードを選ぶ（'+t.selected.length+'枚選択）',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),opt('選択を確定',null,0)]);break;}
  case'g7Next':{const list=(own.g7Holding||[]).filter(x=>canPut(s,t.p,x,'deck')&&(!card(x).evolution?arrange(virtualEntry(s,t.p,x),t.p,own.g7Holding.filter(y=>y.uid!==x.uid)):api.evolutionBases(s,t.p,card(x)).some(base=>arrange(virtualEntry(s,t.p,x,base),t.p,own.g7Holding.filter(y=>y.uid!==x.uid)))));if(!list.length){for(const x of own.g7Holding.splice(0)){own.deck.push(x);own.g7Reveals.push(x.uid);}break;}if(list.length===1)put(s,task('g7Held',t.p,t.source,{uid:list[0].uid}));else choice(s,t,'次に出すアーマードを選ぶ（登場順）',list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
  case'g7Held':{const x=own.g7Holding.find(x=>x.uid===t.uid);if(!x)break;const remaining=own.g7Holding.filter(y=>y.uid!==t.uid),bases=api.evolutionBases(s,t.p,card(x)).filter(base=>arrange(virtualEntry(s,t.p,x,base),t.p,remaining));if(!canPut(s,t.p,x,'deck')||card(x).evolution&&!bases.length){remove(own.g7Holding,x.uid);own.deck.push(x);own.g7Reveals.push(x.uid);put(s,task('g7Next',t.p,t.source));break;}if(card(x).evolution||card(x).neoEvolution)choice(s,t,'出すアーマードの進化元を選ぶ',[...(card(x).neoEvolution?[opt('進化させずに出す',false,0)]:[]),...bases.map(x=>opt(card(x).name,x.uid,10,x.cardId))]);else enterHeld(s,t,null);break;}
  case'g7Rest':{const uids=[...new Set([...t.uids,...(own.g7Reveals||[])])];delete own.g7Reveals;put(s,task('g20Bottom',t.p,t.source,{uids}));break;}
  case'g7Valkyria':choice(s,t,'マナから出す進化ではないドラゴンを選ぶ',[...own.mana.filter(x=>dragon(card(x))&&!card(x).evolution&&!card(x).sMax&&canPut(s,t.p,x,'mana')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
  case'g7VolShield':if((s.g7VolUsed||{})[t.key]!==s.turn)choice(s,t,'ヴォルジャアクでシールドを増やす？',[opt('シールド化する',true,own.deck.length>1?10:-20),skip()]);break;
  case'g7VolDeath':choice(s,t,'手札から出すコスト7以下のボルシャックを選ぶ',[...own.hand.filter(x=>card(x).type==='creature'&&cost(card(x))<=7&&card(x).name.includes('ボルシャック')&&canPut(s,t.p,x,'hand')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
  case'g7Terminal':if(!s.g7TerminalUsed?.[t.p])choice(s,t,'終極宣言で全シールドをブレイクする？（ゲーム中1回）',[opt('終極宣言する',true,own.shields.length<=2?30:-3),skip()]);break;
  case'g7TerminalProtect':(s.g7NoLose??=[]).push({p:t.p,turn:s.turn});api.log(s,t.p,'noLose','次の自分のターンのはじめまでゲームに負けない',{cardId:t.source});break;
  case'g7BakuUntap':{const source=unit(s,t);for(const x of creatures(s,t.p))if(x.uid!==source?.uid&&api.canUntap(x))x.tapped=false;break;}
  case'g7FlareUntap':{const x=unit(s,t);if(x&&api.canUntap(x))x.tapped=false;break;}
  case'g7ParaAttack':if(own.hand.length<=1){const x=unit(s,t);if(x&&api.canUntap(x))x.tapped=false;draw(s,t.p,2);}break;
  case'g7ParaEnd':{const x=unit(s,t);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave'}]);break;}
  case'g7ValSelect':{const list=[...creatures(s,t.p),...creatures(s,1-t.p)].filter(x=>x.uid!==(unit(s,t)?.uid||t.uid)&&!t.selected.includes(x.uid));if(t.selected.length===2||!list.length){put(s,...t.selected.map(uid=>task('g7ValMode',t.p,t.source,{target:uid})));break;}choice(s,t,'タップまたはアンタップする他のクリーチャーを2体まで選ぶ',[...targetOptions(s,t.p,list),opt('ここまでで確定',null,0)]);break;}
  case'g7ValMode':{const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===t.target)),x=owner>=0?s.players[owner].battle.find(x=>x.uid===t.target):null;if(x)choice(s,t,card(x).name+'をどうする？',[opt('タップする',true,owner===t.p?-1:10,x.cardId),opt('アンタップする',false,owner===t.p?10:-1,x.cardId)]);break;}
  case'g7EnemyTap':{const list=creatures(s,t.p).filter(x=>!x.tapped&&!t.selected.includes(x.uid));if(t.selected.length===2||!list.length){for(const uid of t.selected)api.tap(s,t.p,own.battle.find(x=>x.uid===uid));break;}choice(s,t,'自分のアンタップ中のクリーチャーをタップするため選ぶ',list.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
  case'g7Energy':{const x=own.hand.find(x=>x.uid===t.uid);if(!x)break;const payment={...t.payment,energy:t.selected},list=noReduce(s,t.p)?[]:energyPool(s,t.p,t.selected).filter(y=>feasibleEnergy(s,t.p,card(x),t.payment,[...t.selected,y.uid]));choice(s,t,'ハイパーエナジーでタップする異なるコストのクリーチャー（'+t.selected.length+'体）',[...list.map(y=>opt(card(y).name+'（コスト'+card(y).cost+'）',y.uid,5,y.cardId)),...(canPayEnergy(s,t.p,card(x),payment)?[opt('この支払いで召喚',false,20,x.cardId)]:[]),opt('キャンセル',null,-20)]);break;}
  default:throw Error('未実装のアーマード効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g7'))return false;const own=s.players[t.p];switch(t.op){
  case'g7Select':if(value)put(s,{...t,selected:[...t.selected,value]});else prepare(s,t);break;
  case'g7Next':put(s,task('g7Held',t.p,t.source,{uid:value}));break;
  case'g7Held':enterHeld(s,t,value||null);break;
  case'g7Valkyria':if(value)put(s,task('putCreature',t.p,t.source,{origin:'mana',uid:value,noEvolve:true}));break;
  case'g7VolShield':if(value&&(s.g7VolUsed||{})[t.key]!==s.turn){(s.g7VolUsed??={})[t.key]=s.turn;api.shieldTop(s,t.p,card(t.source));}break;
  case'g7VolDeath':if(value)put(s,task('putCreature',t.p,t.source,{origin:'hand',uid:value}));break;
  case'g7Terminal':if(value&&!s.g7TerminalUsed?.[t.p]){(s.g7TerminalUsed??=[false,false])[t.p]=true;const follow=task('g7TerminalProtect',t.p,t.source);if(own.shields.length)api.interruptBreak(s,t.p,own.shields.map(x=>x.uid),follow);else put(s,follow);}break;
  case'g7ValSelect':if(value)put(s,{...t,selected:[...t.selected,value]});else put(s,...t.selected.map(uid=>task('g7ValMode',t.p,t.source,{target:uid})));break;
  case'g7ValMode':{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===t.target)),x=p>=0?s.players[p].battle.find(x=>x.uid===t.target):null;if(x){if(value)api.tap(s,p,x);else if(api.canUntap(x))x.tapped=false;}break;}
  case'g7EnemyTap':put(s,{...t,selected:[...t.selected,value]});break;
  case'g7Energy':if(value)put(s,{...t,selected:[...t.selected,value]});else if(value===false){const x=own.hand.find(x=>x.uid===t.uid),payment={...t.payment,energy:t.selected};if(x&&canPayEnergy(s,t.p,card(x),payment))cast(s,t.p,x.uid,false,null,0,null,'hand','ハイパーエナジー',false,null,null,null,null,payment);}break;
  default:throw Error('未実装のアーマード選択：'+t.op);
 }return true;}
 return {run,chosen,
  effect(s,p,c,uid,entry){const more={uid,incarnation:entry?.incarnation||0};switch(c.effect){case'armoredBaku':put(s,task('g7Look',p,c.id));break;case'armoredValkyria':put(s,task('g7Valkyria',p,c.id));break;case'armoredVal':put(s,task('g7ValSelect',p,c.id,{...more,selected:[]}));break;case'armoredMonster':put(s,task('g7EnemyTap',1-p,c.id,{selected:[]}),task('draw',p,c.id,{n:1}),task('g5HandMana',p,c.id));break;default:return false;}return true;},
  discount(s,p,c){return selected(s,p,c).length+(dragon(c)?creatures(s,p).filter(x=>effective(x,s).chara).length*2:0)+(c.paraReduction&&c.g7Payment?.para?1:0)+(c.hyperEnergy?(c.g7Payment?.energy?.length||0)*2:0);},
  played(s,p,c,inst){for(const x of selected(s,p,c))(s.g7DiscountUsed??={})[key(x)]=s.turn;if(c.g7Payment?.para)inst.g7Para={turn:s.turn,source:c.id};},
  beginEnergy(s,p,a){put(s,task('g7Energy',p,a.cardId,{uid:a.uid,payment:a.g7Payment,selected:[]}));},
  mainActions(s,p){const out=[];for(const x of s.players[p].hand)for(const[face,c]of faces(card(x)).entries()){if(!api.canCast(s,p,c)||c.type!=='spell'&&!api.canEnter(s,p,c,{origin:'hand',execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length)continue;const ids=reducers(s,p,c).map(key),sets=ids.reduce((all,k)=>[...all,...all.map(a=>[...a,k])],[[]]);for(const keys of sets){for(const para of[false,...(c.paraReduction&&!noReduce(s,p)?[true]:[])]){if(keys.length===ids.length&&!para)continue;const g7Payment={reducers:keys,para},pay=payCard(c,g7Payment);if(api.canPay(s,p,pay))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,g7Payment,cost:api.summonCost(s,p,pay),label:c.name+'を'+(para?'軽減し、ターンの終わりに破壊':'軽減の使用先を選んで使用')});}if(c.hyperEnergy&&!noReduce(s,p)&&energyPool(s,p,[]).length&&feasibleEnergy(s,p,c,{reducers:keys})){const g7Payment={reducers:keys};out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,alternative:'hyperEnergy',g7Payment,label:c.name+'をハイパーエナジーで召喚'});}}}return out;},
  entry(s,p,x,options={}){if(api.isCreature(s,x))for(const owner of[0,1])for(const y of creatures(s,owner))if(effective(y,s).voljaak&&(y.uid!==x.uid||!options.selfMuted)&&(s.g7VolUsed||{})[key(y)]!==s.turn)enqueue(s,owner,y.cardId,'g7VolShield',{key:key(y)});},
  attack(s,p,x){if(effective(x,s).paraReduction&&!api.selfStopped(s,p))enqueue(s,p,x.cardId,'g7ParaAttack',{uid:x.uid,incarnation:x.incarnation||0});},
  beforeBattle(s,pa,a,pd,b){s.g7Battles??=[0,0];const wins=[pa,pd].map(p=>!(s.g7Battles[p]||0)&&creatures(s,p).some(x=>effective(x,s).flare));for(const p of new Set([pa,pd]))s.g7Battles[p]=(s.g7Battles[p]||0)+1;return wins;},
  tapEntry:(s,p)=>!(s.g7Entries?.[p]||0)&&creatures(s,1-p).some(x=>effective(x,s).flare),
  leaveSnapshot(s,rows){return Object.fromEntries(rows.flatMap(({player,uid})=>{const x=s.players[player].battle.find(x=>x.uid===uid);return x&&effective(x,s).voljaak?[[uid,true]]:[];}));},
  leaving(s,p,x,snapshot,to,destroy){if(snapshot?.[x.uid]&&to==='grave'&&destroy)enqueue(s,p,x.cardId,'g7VolDeath');},
  inherit(s,base,x){if(base.g7Para)x.g7Para=structuredClone(base.g7Para);},
  start(s,p){return creatures(s,p).filter(x=>effective(x,s).voljaak&&!s.g7TerminalUsed?.[p]).map(x=>on(s,p,x.cardId,'g7Terminal'));},
  end(s){return [0,1].flatMap(p=>creatures(s,p).flatMap(x=>{const c=effective(x,s),more={uid:x.uid,incarnation:x.incarnation||0};return [...(c.bakteras?[on(s,p,x.cardId,'g7BakuUntap',more)]:[]),...(p===s.active&&c.flare?[on(s,p,x.cardId,'g7FlareUntap',more)]:[]),...(x.g7Para?.turn===s.turn?[on(s,p,x.g7Para.source,'g7ParaEnd',more)]:[])];}));},
  noLose:(s,p)=>(s.g7NoLose||[]).some(x=>x.p===p),
  expire(s,when,p){if(when==='end'){s.g7Battles=[0,0];s.g7Entries=[0,0];}if(when==='start')s.g7NoLose=(s.g7NoLose||[]).filter(x=>x.p!==p);},
 };
}
