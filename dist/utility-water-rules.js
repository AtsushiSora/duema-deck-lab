// Small water utilities use the shared draw/target/zone operations where possible.
export function createUtilityWaterRules(api){
 const {card,faces,colors,cost,effective,creatures,put,task,choice,opt}=api;
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g52_'+op,...more});
 const race=(s,p,name)=>creatures(s,p).some(x=>String(effective(x,s).race).replaceAll('・','').includes(name));
 const liveReduction=(s,p)=>creatures(s,p).filter(x=>card(x).g52Evolver&&!api.ignored(s,x)).length;
 function evolution(s,p,c){
  if(c.type!=='creature'||!colors(c).includes('水'))return false;
  if(c.neoEvolution)return c.g27BaseUid===undefined?api.evolutionBases(s,p,c).length>0:!!c.g27BaseUid;
  return !!(c.evolution||c.sMax||c.g48HandEvolution||c.g45MDeck||c.g50ForbiddenEvolution);
 }
 const reduction=(s,p,c)=>evolution(s,p,c)?Math.min(liveReduction(s,p),c.g52Reduction??Infinity):0;
 function payment(s,p,args,n){const [uid,,base,face=0,alt,origin='hand']=args,x=s.players[p][origin]?.find(x=>x.uid===uid),c=x&&faces(card(x))[face];return c&&{...c,summonOrigin:x.g5Origin||origin,g27BaseUid:base,...(args[6]==='D・D・D'?{g28DDD:true}:{}),...(args[9]?{snowReducers:args[9]}:{}),...(args[10]?{gioRevealCount:args[10].length}:{}),...(args[11]?{magicReducers:args[11]}:{}),...(args[12]?{g7Payment:args[12]}:{}),...(args[13]!==null&&args[13]!==undefined?{g18Reducers:args[13]}:{}),...(args[14]!==null&&args[14]!==undefined?{g26Reducers:args[14]}:{}),...(args[15]!==null&&args[15]!==undefined?{g42Reduction:args[15]}:{}),...(alt===null||alt===undefined?{}:typeof alt==='object'?alt:{cost:alt}),g52Reduction:n};}
 function teleport(s,t){
  const selected=t.selected||[],all=[0,1].flatMap(p=>creatures(s,p)).filter(x=>!selected.some(y=>y.uid===x.uid));
  const options=api.targetOptions(s,t.p,all).map(o=>{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value)),x=s.players[p].battle.find(x=>x.uid===o.value);return {...o,value:{p,uid:x.uid,incarnation:x.incarnation||0},score:(p===t.p?-1:1)*(10+Math.min(cost(card(x)),30))};});
  if(selected.length>=2||!options.length){finishTeleport(s,{...t,selected});return;}
  choice(s,{...t,selected},'手札に戻すクリーチャーを2体まで選ぶ（'+selected.length+'/2）',[...options,opt('ここまでで確定',null,0)]);
 }
 function finishTeleport(s,t){const rows=(t.selected||[]).filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation));if(rows.length)api.move(s,rows.map(r=>({player:r.p,uid:r.uid,to:'hand',destroy:false,controller:t.p})));}
 function concrete(s,t){
  if(!api.canMoveZone(s,1-t.p,'grave'))return;
  const selected=t.selected||[],rows=s.players[1-t.p].grave.filter(x=>!selected.includes(x.uid));
  if(!rows.length){finishConcrete(s,{...t,selected});return;}
  choice(s,{...t,selected},'相手の墓地から山札の下に戻す順に選ぶ（'+selected.length+'枚選択）',[...rows.map(x=>opt(card(x).name,x.uid,5+Math.min(cost(card(x)),20),x.cardId)),opt('ここまでで確定',null,0)]);
 }
 function finishConcrete(s,t){if(!api.canMoveZone(s,1-t.p,'grave'))return;const own=s.players[1-t.p],xs=(t.selected||[]).map(uid=>api.remove(own.grave,uid)).filter(Boolean);for(const x of xs)api.clear(x,'deck');own.deck.push(...xs);}
 function tutor(s,t){
  if(api.deckLocked(s,t.p))return;
  const own=s.players[t.p],reserved=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
  const rows=own.deck.filter(x=>!reserved.has(x.uid)).slice(0,api.lookCount(s,t.p,t.n));
  if(!rows.length)return;
  api.log(s,t.p,'reveal',card(t.source).name+'：山札の上'+rows.length+'枚を公開：'+rows.map(x=>card(x).name).join('・'),{cardId:t.source});
  const moved=rows.map(x=>api.remove(own.deck,x.uid)).filter(Boolean);
  for(const x of moved){const to=faces(card(x)).some(c=>colors(c).some(color=>t.colors.includes(color)))?'hand':'grave';api.clear(x,to);api.addZone(s,t.p,to,x);}
  api.deckCheck(s,t.p);
 }
 function run(s,t){if(!t.op.startsWith('g52_'))return false;const own=s.players[t.p];switch(t.op){
  case'g52_Brain':put(s,task('g34_Draw',t.p,t.source,{n:3,optional:true}),{...t,op:'g52_TopHand',selected:[]});break;
  case'g52_TopHand':{const selected=t.selected||[],n=Math.min(2,own.hand.length);if(selected.length>=n){const rows=selected.map(uid=>api.remove(own.hand,uid)).filter(Boolean);for(const x of rows)api.clear(x,'deck');own.deck.unshift(...rows);break;}choice(s,{...t,selected},'山札の上に戻す手札を順に選ぶ（'+selected.length+'/'+n+'）',own.hand.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,-Math.min(cost(card(x)),30),x.cardId)));break;}
  case'g52_Energy':put(s,...(race(s,t.p,'グレートメカオー')?[task('g34_Target',t.p,t.source,{anyOwner:true,to:'hand',optional:false})]:[]),{...t,op:'g52_EnergyDraw'});break;
  case'g52_EnergyDraw':if(race(s,t.p,'キカイヒーロー'))put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
  case'g52_Teleport':teleport(s,t);break;
  case'g52_Wave':{const own=s.players[t.p],options=api.targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>creatures(s,p))).map(o=>{const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value)),x=s.players[p].battle.find(x=>x.uid===o.value),win=own.deck.length<=1&&/ドラゴン/.test(effective(x,s).race||'')&&creatures(s,t.p).some(y=>y.uid!==x.uid&&effective(y,s).shako);return{...o,value:{p,uid:x.uid},label:(p===t.p?'自分：':'相手：')+o.label,score:win?1000:(p===t.p?-1:1)*(15+Math.min(cost(card(x)),30))};});choice(s,t,'手札に戻すクリーチャーを1体選ぶ',options);break;}
  case'g52_WaveDraw':{const win=creatures(s,t.p).some(x=>effective(x,s).shako);choice(s,t,'ドラゴンを選んだので、カードを1枚引いてもよい',[opt('1枚引く',1,own.deck.length>1?10:win?1000:-1000),opt('引かない',0,0)]);break;}
  case'g52_Concrete':concrete(s,t);break;
  case'g52_Tutor':tutor(s,t);break;
  case'g52_Reduction':{const c=payment(s,t.p,t.args,0),max=c&&liveReduction(s,t.p);if(!c)break;const options=Array.from({length:max+1},(_,n)=>({n,c:payment(s,t.p,t.args,n)})).filter(({c})=>api.canPay(s,t.p,c)).map(({n,c})=>opt(n===0?'軽減しない（'+api.summonCost(s,t.p,c)+'マナ）':n+'体分軽減（'+api.summonCost(s,t.p,c)+'マナ）',n,n*4));choice(s,t,'アクア・エボリューターの軽減を使う？',options);break;}
  default:throw Error('未実装の水ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g52_'))return false;switch(t.op){
  case'g52_TopHand':queue(s,t,'TopHand',{selected:[...t.selected,v]});break;
  case'g52_Teleport':if(v)queue(s,t,'Teleport',{selected:[...t.selected,v]});else finishTeleport(s,t);break;
  case'g52_Wave':{const x=s.players[v.p]?.battle.find(x=>x.uid===v.uid);if(x){if(/ドラゴン/.test(effective(x,s).race||''))queue(s,t,'WaveDraw');api.move(s,[{player:v.p,uid:x.uid,to:'hand',destroy:false,controller:t.p}]);}break;}
  case'g52_WaveDraw':if(v)api.draw(s,t.p,1);break;
  case'g52_Concrete':if(v)queue(s,t,'Concrete',{selected:[...t.selected,v]});else finishConcrete(s,t);break;
  case'g52_Reduction':{const args=[...t.args],alt=args[4];args[4]={...(alt===null||alt===undefined?{}:typeof alt==='object'?alt:{cost:alt}),g52Reduction:v};api.cast(s,t.p,...args);break;}
  default:throw Error('未実装の水ユーティリティ選択：'+t.op);
 }return true;}
 return {run,chosen,discount:reduction,
  effect(s,p,c,uid){if(!c.g52Effect)return false;put(s,task('g52_'+c.g52Effect,p,c.id,{uid,...(c.g52TutorColors?{colors:c.g52TutorColors,n:c.g52TutorCount}:{})}));return true;},
  beforeCast(s,p,args){if(args[1]||args[4]?.fixedPayment||args[4]?.g52Reduction!==undefined)return false;const c=payment(s,p,args,0);if(!c||!evolution(s,p,c))return false;const n=liveReduction(s,p);if(!n||api.summonCost(s,p,c)===api.summonCost(s,p,{...c,g52Reduction:n}))return false;put(s,task('g52_Reduction',p,c.id,{args}));return true;},
  variants(s,p,actions){const d=s.decision;if(d?.type!=='evolution'||d.playAction?.freeSummon)return actions;const a=d.playAction||{},c=faces(card(d.source))[a.face||0];if(!c?.neoEvolution||!liveReduction(s,p))return actions;return actions.filter(x=>x.kind!=='evolve'||api.canPay(s,p,{...c,summonOrigin:a.origin||'hand',g27BaseUid:x.baseUid||null,...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{}),...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.g18Reducers!==undefined?{g18Reducers:a.g18Reducers}:{}),...(a.g26Reducers!==undefined?{g26Reducers:a.g26Reducers}:{}),...(a.g42Reduction!==undefined?{g42Reduction:a.g42Reduction}:{})}));}
 };
}
