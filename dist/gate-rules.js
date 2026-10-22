// No.20: explicit choices and serializable continuations; no card-name heuristics.
export function createGateRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,draw,move,log,targetOptions}=api;
 const effect=(s,p,source,op,more={})=>api.enqueue(s,p,{source,effect:'extended',task:task(op,p,source,more)});
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const revealable=(s,p,uid)=>s.players[p].hand.filter(x=>x.uid!==uid&&faces(card(x)).some(c=>cost(c)===9));
 function canAssign(s,p,list,excluded=[],allowed=null){const evos=list.filter(x=>card(x).evolution).map(x=>api.evolutionBases(s,p,card(x)).filter(x=>!excluded.includes(x.uid)&&(!allowed||allowed.includes(x.uid))).map(x=>x.uid)).sort((a,b)=>a.length-b.length);const visit=(i,used)=>i===evos.length||evos[i].some(uid=>!used.includes(uid)&&visit(i+1,[...used,uid]));return visit(0,[]);}
 function eligible(s,t,x){const c=card(x),selected=t.selected.map(uid=>s.players[t.p][t.origin].find(x=>x.uid===uid));return canAssign(s,t.p,[...selected,x])&&c.type==='creature'&&(!t.light||colors(c).includes('光'))&&(!t.blocker||c.blocker)&&(!t.nonEvo||!c.evolution)&&api.canEnter(s,t.p,c,{origin:t.origin,execution:false})&&(!c.evolution||api.evolutionBases(s,t.p,c).length);}
 const deploy=(p,source,more={})=>task('g20Select',p,source,{origin:'hand',max:1,selected:[],...more});
 function ramp(s,p,n,tapped){const own=s.players[p],all=own.deck.splice(0,n);for(const x of all){const to=api.deckRedirect(s)?'grave':'mana';clear(x,to);if(to==='mana'&&tapped)x.tapped=true;own[to].push(x);}log(s,p,'ramp','山札の上から'+all.length+'枚を'+(api.deckRedirect(s)?'墓地':'マナ')+'へ');api.deckCheck(s,p);return all;}
 function prepare(s,t){const own=s.players[t.p],selected=t.selected;(own.g20Holding??=[]);const bases=creatures(s,t.p).map(x=>x.uid);for(const uid of selected){const x=remove(own[t.origin],uid);if(x){x.g20Origin=t.origin;own.g20Holding.push(x);}}
  put(s,...selected.map(uid=>task('g20Deploy',t.p,t.source,{uid,bases})),...(t.revealed?[task('g20Remainder',t.p,t.source,{uids:t.revealed.filter(uid=>!selected.includes(uid))})]:[]));if(t.origin==='deck'&&selected.length)api.deckCheck(s,t.p);
 }
 function enterHeld(s,t,base=null){const own=s.players[t.p],x=remove(own.g20Holding,t.uid);if(!x)return;const origin=x.g20Origin;delete x.g20Origin;enter(s,t.p,x,base,{origin,execution:false});}
 function run(s,t){if(!t.op.startsWith('g20'))return false;const own=s.players[t.p];switch(t.op){
  case'g20Select':{const spent=t.selected.reduce((n,uid)=>n+cost(card(own[t.origin].find(x=>x.uid===uid))),0),pool=own[t.origin].filter(x=>(!t.revealed||t.revealed.includes(x.uid))&&!t.selected.includes(x.uid)&&eligible(s,t,x)&&(t.sum===undefined||spent+cost(card(x))<=t.sum));if(t.selected.length===t.max||!pool.length){prepare(s,t);break;}choice(s,t,'出すクリーチャーを選ぶ（'+t.selected.length+' / '+t.max+'体）',[...pool.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),...(!t.required||t.selected.length?[opt('ここまでで確定',null,0)]:[])]);break;}
  case'g20Remainder':{let n=0;for(const uid of t.uids){const x=remove(own.deck,uid);if(x){const to=api.deckRedirect(s)?'grave':'mana';clear(x,to);own[to].push(x);n++;}}if(n)api.deckCheck(s,t.p);break;}
  case'g20Deploy':{const x=own.g20Holding?.find(x=>x.uid===t.uid);if(!x)break;const c=card(x),remaining=own.g20Holding.filter(y=>y.uid!==x.uid),bases=api.evolutionBases(s,t.p,c).filter(x=>t.bases.includes(x.uid)&&canAssign(s,t.p,remaining,[x.uid],t.bases));if(!api.canEnter(s,t.p,c,{origin:x.g20Origin,execution:false})||c.evolution&&!bases.length){remove(own.g20Holding,x.uid);const to=x.g20Origin==='deck'?'mana':x.g20Origin;delete x.g20Origin;clear(x,to);own[to].push(x);break;}if(c.evolution||c.neoEvolution)choice(s,t,'進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',false,0)]:[]),...bases.map(x=>opt(card(x).name+'の上に置く',x.uid,10,x.cardId))]);else enterHeld(s,t);break;}
  case'g20Wellkius':put(s,deploy(t.p,t.source,{blocker:true}));draw(s,t.p,1);break;
  case'g20Mikadoreo':{const revealed=own.deck.slice(0,4).map(x=>x.uid);log(s,t.p,'reveal','山札の上4枚を公開：'+own.deck.slice(0,4).map(x=>card(x).name).join('、'),{cardId:t.source});put(s,deploy(t.p,t.source,{origin:'deck',max:4,revealed}));break;}
  case'g20Win':if(creatures(s,t.p).filter(x=>cost(card(x))>=8).length>=4)api.finish(s,t.p,'ミカドレオ：コスト8以上のクリーチャーが4体以上');break;
  case'g20Stegoro':put(s,task('g20Ramp',t.p,t.source,{n:1}),task('g20ReturnMana',t.p,t.source,{max:1,selected:[]}));break;
  case'g20Ramp':ramp(s,t.p,t.n,!!t.tapped);break;
  case'g20ReturnMana':{const list=own.mana.filter(x=>!t.selected.includes(x.uid));if(t.selected.length===t.max||!list.length){for(const uid of t.selected){const x=remove(own.mana,uid);if(x){clear(x,'hand');own.hand.push(x);}}break;}choice(s,t,'手札に戻すマナを'+t.max+'枚まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,own.hand.length<3?4:1,x.cardId)),opt('ここまでで確定',null,0)]);break;}
  case'g20Sharappu':choice(s,t,'山札に戻すカードを選ぶ墓地',[opt('自分の墓地',t.p,own.grave.length),opt('相手の墓地',1-t.p,s.players[1-t.p].grave.length),skip()]);break;
  case'g20Shuffle':{const list=s.players[t.owner].grave.filter(x=>!t.selected.includes(x.uid));choice(s,t,'山札に戻すカードを選ぶ（'+t.selected.length+'枚選択）',[...list.map(x=>opt(card(x).name,x.uid,1,x.cardId)),opt('ここまでで確定',null,t.selected.length?2:0)]);break;}
  case'g20Power':{const x=ramp(s,t.p,1,false)[0];if(x&&card(x).type==='creature'&&Number(card(x).power)>=6000&&s.winner===null)draw(s,t.p,1);break;}
  case'g20Takeback':{const list=[...own.battle,...s.players[1-t.p].battle].filter(x=>cost(card(x))<=3);choice(s,t,'タップしてマナに置くコスト3以下のエレメント',[...targetOptions(s,t.p,list),skip()]);break;}
  case'g20Huge':{const top=own.deck.slice(0,4),hits=top.filter(x=>card(x).type==='creature'&&cost(card(x))>=7);log(s,t.p,'reveal','山札の上4枚を公開：'+top.map(x=>card(x).name).join('、'),{cardId:t.source});for(const x of hits){remove(own.deck,x.uid);clear(x,'hand');own.hand.push(x);}put(s,task('g20Bottom',t.p,t.source,{uids:top.filter(x=>!hits.includes(x)).map(x=>x.uid)}));if(hits.length)api.deckCheck(s,t.p);break;}
  case'g20Bottom':if(t.uids.length===1){const x=remove(own.deck,t.uids[0]);if(x)own.deck.push(x);}else if(t.uids.length>1)choice(s,t,'山札の下に置く順序を選ぶ（先に選んだカードが上）',t.uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;
  case'g20Gio':{const x=own.hand.find(x=>x.uid===t.uid);if(!x)break;const list=revealable(s,t.p,t.uid).filter(x=>!t.selected.includes(x.uid)),pay={...card(x),gioRevealCount:t.selected.length};choice(s,t,'召喚コストを軽減するため公開するコスト9の手札（'+t.selected.length+'枚）',[...list.map(x=>opt(card(x).name,x.uid,5,x.cardId)),...(api.canPay(s,t.p,pay)?[opt(t.selected.length+'枚を公開して召喚',false,20,x.cardId)]:[]),opt('キャンセル',null,-10)]);break;}
  case'g20GioBase':{const x=own.hand.find(x=>x.uid===t.uid);if(x)choice(s,t,'超七極 Gioの進化元を選ぶ',api.evolutionBases(s,t.p,card(x)).map(x=>opt(card(x).name+'の上に置く',x.uid,10,x.cardId)));break;}
  default:throw Error('未実装のゲート効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g20'))return false;const own=s.players[t.p];switch(t.op){
  case'g20Select':if(value)put(s,{...t,selected:[...t.selected,value]});else prepare(s,t);break;
  case'g20Deploy':enterHeld(s,t,value||null);break;
  case'g20ReturnMana':put(s,{...t,selected:value?[...t.selected,value]:t.selected,max:value?t.max:t.selected.length});break;
  case'g20Sharappu':if(value!==null)put(s,task('g20Shuffle',t.p,t.source,{owner:value,selected:[]}));break;
  case'g20Shuffle':if(value)put(s,{...t,selected:[...t.selected,value]});else if(t.selected.length){const owner=s.players[t.owner],all=t.selected.map(uid=>remove(owner.grave,uid)).filter(Boolean);for(const x of all)clear(x,'deck');owner.deck=api.shuffled([...owner.deck,...all],Math.floor(api.random(s)*4294967296));log(s,t.p,'shuffleGrave',all.length+'枚を山札に戻してシャッフルする',{cardId:t.source});}break;
  case'g20Takeback':if(value){const player=s.players.findIndex(p=>p.battle.some(x=>x.uid===value));move(s,[{player,uid:value,to:'mana',tapped:true}]);}break;
  case'g20Bottom':{const x=remove(own.deck,value);if(x)own.deck.push(x);put(s,{...t,uids:t.uids.filter(uid=>uid!==value)});break;}
  case'g20Gio':if(value===false)put(s,{...t,op:'g20GioBase'});else if(value!==null)put(s,{...t,selected:[...t.selected,value]});break;
  case'g20GioBase':api.cast(s,t.p,t.uid,false,value,0,null,'hand','カードの能力',false,null,null,t.selected);break;
  default:throw Error('未実装のゲート選択：'+t.op);
 }return true;}
 return {run,chosen,
  effect(s,p,c,uid,entry){switch(c.effect){
   case'wellkius':put(s,task('g20Wellkius',p,c.id));break;
   case'mikadoreo':put(s,task('g20Mikadoreo',p,c.id));break;
   case'sheva':put(s,deploy(p,c.id,{origin:'mana',max:2,sum:7}));break;
   case'rudolf':put(s,task('g20Ramp',p,c.id,{n:2,tapped:true}),task('g20ReturnMana',p,c.id,{max:2,selected:[]}));break;
   case'saiphogate':put(s,deploy(p,c.id,{light:true,blocker:true,nonEvo:true}));break;
   case'heavensGate':put(s,deploy(p,c.id,{light:true,blocker:true,nonEvo:true,max:2}));break;
   case'stargaze':put(s,deploy(p,c.id,{light:true,blocker:true,nonEvo:true,required:true}));break;
   case'bambooRamp':put(s,task('g20Ramp',p,c.id,{n:2,tapped:true}));break;
   case'sharappu':put(s,task('g20Ramp',p,c.id,{n:1}),task('g20Sharappu',p,c.id));break;
   case'fairyPower':put(s,task('g20Power',p,c.id));break;
   case'takeback':put(s,task('g20Takeback',p,c.id));break;
   case'hugePlan':put(s,task('g20Huge',p,c.id));break;
   default:return false;
  }return true;},
  attack(s,p,x){if(!api.selfStopped(s,p)&&effective(x,s).stegoro)effect(s,p,x.cardId,'g20Stegoro');
   for(const y of creatures(s,1-p))if(effective(y,s).rudolf&&(s.attack.target==='player'||s.attack.target===y.uid)&&!(s.g20Attacks||[]).some(a=>a.turn===s.turn&&a.defender===1-p&&(a.target==='player'||a.target===key(y)))){effect(s,1-p,y.cardId,'discard',{n:1,random:true,p});}
   const target=s.attack.target==='player'?'player':key(s.players[1-p].battle.find(x=>x.uid===s.attack.target));(s.g20Attacks??=[]).push({turn:s.turn,defender:1-p,target});
  },
  shieldLeft(s,p){for(const x of creatures(s,p))if(effective(x,s).hades&&!s.g20LeavingUids?.includes(x.uid))effect(s,p,x.cardId,'destroyPower',{max:'∞'});},
  battleWins(s,p){return creatures(s,p).filter(x=>effective(x,s).wellkius).map(x=>({player:p,uid:x.uid,source:x.cardId,gate:true}));},
  start(s,p){return creatures(s,p).filter(x=>effective(x,s).mikadoreo).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g20Win',p,x.cardId)}));},
  end(s){return creatures(s,s.active).filter(x=>effective(x,s).achernar).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:deploy(s.active,x.cardId,{light:true,blocker:true,nonEvo:true})}));},
  mainActions(s,p){return s.players[p].hand.filter(x=>card(x).gio&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})&&api.evolutionBases(s,p,card(x)).length&&revealable(s,p,x.uid).length&&api.canPay(s,p,{...card(x),gioRevealCount:revealable(s,p,x.uid).length})).map(x=>({kind:'play',alternative:'gio',uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,{...card(x),gioRevealCount:revealable(s,p,x.uid).length}),label:card(x).name+'を手札を公開して軽減・召喚'}));},
  beginAlternative(s,p,a){put(s,task('g20Gio',p,a.cardId,{uid:a.uid,selected:[]}));},
 };
}
