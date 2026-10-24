// Screenshot dark-mado effects. Choices and continuations contain physical UIDs only.
export function createDarkMadoRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,cast,on,targetOptions}=api;
 const magic=c=>String(c.race).includes('魔導具');
 const minus=(s,p,uid,amount,source)=>{const x=s.players[p].battle.find(x=>x.uid===uid);if(x)(x.powerModifiers??=[]).push({amount:-amount,expires:'end',who:s.active,...(source&&card(source).type==='spell'?{spellCost:cost(card(source)),spellSource:source}:{})});};
 const canPut=(s,p,x)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin:'grave',execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length)&&(!card(x).graveEvolution||s.players[p].grave.some(y=>y.uid!==x.uid&&card(y).type==='creature'));
 function canSequence(s,p,list){
  const own=s.players[p],virtual={...s,players:s.players.map((x,i)=>i===p?{...x,battle:[...own.battle],grave:[...own.grave]}:x)},left=[...list];
  while(left.length){const i=left.findIndex(x=>virtual.players[p].grave.some(y=>y.uid===x.uid)&&canPut(virtual,p,x));if(i<0)return false;const [x]=left.splice(i,1),c=card(x),v=virtual.players[p];
   v.grave=v.grave.filter(y=>y.uid!==x.uid);
   if(c.graveEvolution){const base=v.grave.find(y=>card(y).type==='creature');v.grave=v.grave.filter(y=>y!==base);}
   else if(c.evolution){const bases=api.evolutionBases(virtual,p,c);v.battle=v.battle.filter(y=>y.uid!==bases[0].uid);}
   v.battle.push(x);v.enteredThisTurn=(v.enteredThisTurn||0)+1;
  }return true;
 }
 const serial=x=>x.zoneSerial||0;
 function executeZadan(s,t,grant){
  const x=s.players[t.p].grave.find(x=>x.uid===t.value.uid);if(!x)return;
  const c=faces(card(x))[t.value.face];
  if(c.type==='spell')x.finishTo='deck';
  if(grant)x.g30SuperFace=t.value.face;
  if((c.evolution||c.neoEvolution)&&!c.graveEvolution&&!c.ultraEvolution)put(s,{...t,op:'g30_ZadanBase'});
  else cast(s,t.p,x.uid,true,null,t.value.face,null,'grave','魔王ザダン');
 }
 function watchLarge(s,c){
  if(cost(c)<8)return;
  for(const x of s.players[s.active].battle)if(card(x).g4Lab&&effective(x,s).g4Lab)on(s,s.active,x,'discard',{p:1-s.active,causedBy:s.active,n:1,all:true});
 }
 function run(s,t){if(!t.op.startsWith('g30_'))return false;
  const own=s.players[t.p];
  switch(t.op){
   case'g30_Zadan':{
    const list=own.grave.flatMap(x=>faces(card(x)).map((c,face)=>({x,c,face}))).filter(({c})=>colors(c).includes('闇')&&cost(c)<=own.grave.length&&api.canCast(s,t.p,c,'grave')&&(c.type==='spell'||api.canEnter(s,t.p,c,{origin:'grave',execution:true})&&(!c.evolution||api.evolutionBases(s,t.p,c).length)));
    choice(s,t,'ザダン：墓地の枚数以下の闇のカードを実行する',[...list.map(({x,c,face})=>opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)),skip()]);break;
   }
   case'g30_ZadanSuper':choice(s,t,'スーパー・S・トリガーの追加効果を使う？',[opt('追加効果を使う',true,30),opt('追加効果を使わない',false,0)]);break;
   case'g30_ZadanBase':{const x=own.grave.find(x=>x.uid===t.value.uid);if(x){const c=faces(card(x))[t.value.face];choice(s,t,'ザダン：進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',null,1)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,10,x.cardId))]);}break;}
   case'g30_Maou':for(const x of creatures(s,1-t.p))minus(s,1-t.p,x.uid,3000);break;
   case'g30_Nameless':put(s,task('g30_Minus',t.p,t.source,{amount:12000}),...(t.super?[task('discard',1-t.p,t.source,{n:1,all:true,causedBy:t.p})]:[]));break;
   case'g30_Jaw':put(s,task('mill',t.p,t.source,{n:3}),task('g30_Minus',t.p,t.source,{byGrave:true}),...(t.super?[task('g30_JawSelect',t.p,t.source,{selected:[]})]:[]));break;
   case'g30_Minus':{const amount=t.byGrave?own.grave.length*1000:t.amount;choice(s,{...t,amount},'パワーを−'+amount+'する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;}
   case'g30_JawSelect':{
    const selected=t.selected.filter(uid=>own.grave.some(x=>x.uid===uid)),used=selected.reduce((n,uid)=>n+cost(card(own.grave.find(x=>x.uid===uid))),0);
    choice(s,{...t,selected},'冥王の顎：出すクリーチャーを選ぶ（合計'+used+'/8）',[...own.grave.filter(x=>!selected.includes(x.uid)&&cost(card(x))+used<=8&&canSequence(s,t.p,[...selected.map(uid=>own.grave.find(y=>y.uid===uid)),x])).map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)),opt('この内容で出す',null,selected.length?10:0)]);break;
   }
   case'g30_JawDeploy':{
    const left=t.uids.filter(uid=>own.grave.some(x=>x.uid===uid));
    if(left.length)choice(s,{...t,uids:left},'冥王の顎：次に出す順序を選ぶ',left.map(uid=>own.grave.find(x=>x.uid===uid)).filter(x=>canPut(s,t.p,x)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;
   }
   case'g30_Gride':{const before=new Set(own.grave.map(x=>x.uid));api.mill(s,t.p,3);const amount=own.grave.filter(x=>!before.has(x.uid)&&faces(card(x)).some(magic)).length*2000;choice(s,{...t,amount},'グリデリア：相手1体を−'+amount+'する？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;}
   case'g30_Funz':{const selected=t.selected||[];if(selected.length===2){move(s,selected.map(uid=>({player:1-t.p,uid,to:'hand',destroy:false})));break;}choice(s,{...t,selected},'フンズヴァイ：戻すエレメントを2つまで選ぶ',[...targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>!selected.includes(x.uid))),opt('この内容で戻す',null,selected.length?10:0)]);break;}
   case'g30_GraveHand':choice(s,t,'墓地の闇のカードを1枚、手札に戻す',own.grave.filter(x=>faces(card(x)).some(c=>colors(c).includes('闇'))).map(x=>opt(card(x).name,x.uid,10+Math.min(20,cost(card(x))),x.cardId)));break;
   case'g30_Tin':{const x=own.grave.find(x=>x.uid===t.uid&&serial(x)===t.serial);if(x&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false}))choice(s,t,'ティン★ビンを墓地からタップして出す？',[opt('タップして出す',true,30,x.cardId),skip()]);break;}
   default:throw Error('未実装の闇魔導具効果：'+t.op);
  }return true;
 }
 function chosen(s,t,v){if(!t.op.startsWith('g30_'))return false;
  const own=s.players[t.p];switch(t.op){
   case'g30_Zadan':if(v){const x=own.grave.find(x=>x.uid===v.uid),c=faces(card(x))[v.face];if(c.superTrigger)put(s,{...t,op:'g30_ZadanSuper',value:v});else executeZadan(s,{...t,value:v},false);}break;
   case'g30_ZadanSuper':executeZadan(s,t,!!v);break;
   case'g30_ZadanBase':cast(s,t.p,t.value.uid,true,v,t.value.face,null,'grave','魔王ザダン');break;
   case'g30_Minus':minus(s,1-t.p,v,t.amount,t.source);break;
   case'g30_Gride':if(v)minus(s,1-t.p,v,t.amount);break;
   case'g30_JawSelect':put(s,v?{...t,selected:[...t.selected,v]}:{...t,op:'g30_JawDeploy',uids:t.selected});break;
   case'g30_JawDeploy':put(s,task('putCreature',t.p,t.source,{origin:'grave',uid:v}),{...t,uids:t.uids.filter(uid=>uid!==v)});break;
   case'g30_Funz':{const selected=t.selected||[];if(v)put(s,{...t,selected:[...selected,v]});else if(selected.length)move(s,selected.map(uid=>({player:1-t.p,uid,to:'hand',destroy:false})));break;}
   case'g30_GraveHand':{const x=remove(own.grave,v);if(x){clear(x,'hand');own.hand.push(x);}break;}
   case'g30_Tin':if(v){const x=own.grave.find(x=>x.uid===t.uid&&serial(x)===t.serial);if(x){remove(own.grave,x.uid);api.enter(s,t.p,x,null,{origin:'grave',execution:false,tapped:true});}}break;
   default:throw Error('未実装の闇魔導具選択：'+t.op);
  }return true;
 }
 return {run,chosen,
  effect(s,p,c,uid,entry){const op={madoZadan:'Zadan',madoMaou:'Maou',madoNameless:'Nameless',madoJaw:'Jaw',madoGride:'Gride',madoFunz:'Funz'}[c.effect];if(op){put(s,task('g30_'+op,p,c.id,{super:!!entry?.super}));return true;}if(c.effect==='madoVoga'){put(s,task('mill',p,c.id,{n:4}),task('g30_GraveHand',p,c.id));return true;}if(c.effect==='madoLab'||c.effect==='madoTin'){put(s,task('discard',1-p,c.id,{n:1,causedBy:p,random:c.effect==='madoLab'}));return true;}return false;},
  discount(s,p,c){return (c.g4Zadan&&s.players[p].grave.length>=7?7:0)+(c.type==='creature'&&magic(c)?s.players[p].battle.filter(x=>card(x).g4Voga&&effective(x,s).g4Voga).length:0);},
  mainActions(s,p){const own=s.players[p];return own.grave.filter(x=>card(x).g4Zadan&&own.grave.length>=7&&api.canCast(s,p,card(x),'grave')&&api.canEnter(s,p,card(x),{origin:'grave',execution:true})&&api.canPay(s,p,{...card(x),summonOrigin:'grave'})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',cost:api.summonCost(s,p,{...card(x),summonOrigin:'grave'}),label:'墓地の'+card(x).name+'を召喚'}));},
  summoned(s,p,x){watchLarge(s,card(x));},spellCast(s,p,c){watchLarge(s,c);},
  attack(s,p,x){const c=effective(x,s);if(api.selfStopped(s,p))return;if(c.g4Zadan)on(s,p,x,'g30_Zadan');if(c.g4Manji)on(s,p,x,'destroyPower',{max:'∞'});},
  end(s){return s.players[s.active].battle.filter(x=>card(x).g4Vogen&&effective(x,s).g4Vogen).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('mill',s.active,x.cardId,{n:13})}));},
  gateWatchers(s,p){return s.players[p].grave.filter(x=>card(x).g4Tin).map(x=>({uid:x.uid,serial:serial(x),source:x.cardId}));},
  gateUsed(s,p,rows){for(const x of rows)api.enqueue(s,p,{uid:x.uid,source:x.source,effect:'extended',task:task('g30_Tin',p,x.source,x)});},
 };
}
