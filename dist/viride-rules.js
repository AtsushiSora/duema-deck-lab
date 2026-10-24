// White/green shield engine. Every continuation and selected identity is serializable.
export function createVirideRules(api){
 const {card,cost,colors,effective,creatures,put,task,choice,opt,skip,enqueue,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.zoneSerial||0);
 const castles=(s,p)=>s.players[p].shields.flatMap(api.shieldCards).filter(x=>x.faceUp&&!x.shieldCardOnly&&card(x).gCastle);
 const has=(s,p,prop)=>creatures(s,p).some(x=>effective(x,s)[prop]);
 const lightMana=(s,p)=>s.players[p].mana.filter(x=>api.manaColors(card(x),s,p).includes('光')).length;
 const gardens=(s,p,c)=>c.type==='creature'&&!c.fixedPayment&&!creatures(s,1-p).some(x=>effective(x,s).noCostReduction)?castles(s,p).filter(x=>card(x).g26Garden&&(s.g26GardenUsed||{})[key(x)]!==s.turn):[];
 const selectedGardens=(s,p,c)=>gardens(s,p,c).filter(x=>c.g26Reducers==null||c.g26Reducers.includes(key(x)));
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)&&!x.sealed);
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 function firstEvent(s,p,c,muted=false){
  const own=s.players[p];if(own.g26FirstEventTurn===s.turn)return;own.g26FirstEventTurn=s.turn;
  if(s.active!==p||muted)return;
  for(const x of creatures(s,1-p))if(effective(x,s).g26Viride)on(s,1-p,x,'g26_DrawDeploy',{max:cost(c)});
 }
 function run(s,t){if(!t.op.startsWith('g26_'))return false;const own=s.players[t.p];switch(t.op){
  case'g26_Final':if(!s.finalHistory?.[t.p]){(s.finalHistory??=[false,false])[t.p]=true;(s.finalUsed??=[false,false])[t.p]=true;(s.g26Extreme??=[false,false])[t.p]=true;log(s,t.p,'finalRevolution','極限ファイナル革命：次の自分のターンまで敗北と相手の効果による離脱を防ぐ',{cardId:t.source});}break;
  case'g26_DrawDeploy':choice(s,t,'ウィリデ：1枚引く？（引かなくても展開できます）',[opt('1枚引く',true,own.deck.length>2?15:-20),skip()]);break;
  case'g26_Deploy':{
   const list=own.hand.filter(x=>card(x).type==='creature'&&cost(card(x))<=t.max&&api.canEnter(s,t.p,card(x),{origin:'hand',execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length));
   choice(s,t,'ウィリデ：コスト'+t.max+'以下を手札から出す？',[...list.map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)),skip()]);break;
  }
  case'g26_Zaze':{const x=live(s,t);if(x&&api.canUntap(x))x.tapped=false;choice(s,t,'ザゼ・ゼーン：効果を1つ選ぶ',[opt('カードを1枚引く','draw',own.deck.length>2?10:-50),opt('相手1体をタップし、次のターンもアンタップさせない','tap',creatures(s,1-t.p).length?20:-10),opt('次の自分のターンまで、このクリーチャーは離れない','stay',x?15:-10)]);break;}
  case'g26_Tap':choice(s,t,'タップし、次のターンのアンタップを止める相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case'g26_Ever':choice(s,t,'エバーラスト：シールド化するエレメントを選ぶ？',[...targetOptions(s,t.p,[...own.battle,...s.players[1-t.p].battle].filter(x=>!x.sealed)).map(o=>({...o,score:s.players[1-t.p].battle.some(x=>x.uid===o.value)?30:0})),opt('エレメントを選ばない',null,5)]);break;
  case'g26_EverAfter':if(!s.players[t.owner].shields.flatMap(api.shieldCards).some(x=>x.uid===t.target))put(s,{...t,op:'g26_TopShield'});break;
  case'g26_TopShield':choice(s,t,'自分の山札の上1枚をシールド化する？',[opt('シールド化する',true,own.deck.length>2?15:-20),skip()]);break;
  case'g26_Hustle':{const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);x.tapped=to==='mana';api.addZone(s,t.p,to,x);log(s,t.p,'ramp','ハッスル・キャッスル：山札の上1枚をタップしてマナへ',{cardId:t.source});}api.deckCheck(s,t.p);break;}
  case'g26_GardenDraw':if(creatures(s,t.p).length>creatures(s,1-t.p).length)put(s,task('optionalDrawOne',t.p,t.source));break;
  case'g26_End':choice(s,t,'ドギラゴン逆：山札の上2枚をマナに置く？',[opt('2枚をマナへ置く',true,own.deck.length>4?15:-20),skip()]);break;
  case'g26_Select':{const selected=t.selected||[],remaining=2-selected.length,budget=7-selected.reduce((n,r)=>n+cost(card(r.cardId)),0),list=['hand','mana'].flatMap(origin=>own[origin].filter(x=>!selected.some(r=>r.uid===x.uid)&&card(x).type==='creature'&&cost(card(x))<=budget&&api.canEnter(s,t.p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length)).map(x=>({x,origin})));
   if(!remaining||!list.length){put(s,{...t,op:'g26_Order',selected});break;}
   choice(s,{...t,selected},'手札・マナから合計7以下の2体までを選ぶ（'+selected.length+'体選択）',[...list.map(({x,origin})=>opt((origin==='mana'?'マナ：':'手札：')+card(x).name,{uid:x.uid,cardId:x.cardId,origin},20+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)]);break;
  }
  case'g26_Order':{const list=t.selected.filter(r=>own[r.origin].some(x=>x.uid===r.uid));if(list.length===1)put(s,task('putCreature',t.p,t.source,{...list[0]}));else if(list.length>1)choice(s,{...t,selected:list},'先に出すクリーチャーを選ぶ',list.map(r=>opt(card(r.cardId).name,r.uid,10,r.cardId)));break;}
  case'g26_Saint':choice(s,t,'セイント・キャッスルでブレイクを受ける？',[...castles(s,t.p).filter(x=>card(x).g26Saint).map(x=>opt('このセイント・キャッスルだけをブレイクする',api.shieldGroup(x),25,x.cardId)),opt('元のシールドをブレイクする',null,0)]);break;
  default:throw Error('未実装のウィリデ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g26_'))return false;const own=s.players[t.p];switch(t.op){
  case'g26_DrawDeploy':if(v)api.draw(s,t.p,1);put(s,{...t,op:'g26_Deploy'});break;
  case'g26_Deploy':if(v)put(s,task('putCreature',t.p,t.source,{uid:v,origin:'hand'}));break;
  case'g26_Zaze':if(v==='draw')api.draw(s,t.p,1);else if(v==='tap')put(s,{...t,op:'g26_Tap'});else{const x=live(s,t);if(x)x.g26Stay=t.p;}break;
  case'g26_Tap':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){api.tap(s,1-t.p,x);x.skipUntap=true;}break;}
  case'g26_Ever':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));put(s,{...t,op:'g26_EverAfter',owner,target:v});api.move(s,[{player:owner,uid:v,to:'shields',destroy:false}]);}else put(s,{...t,op:'g26_TopShield'});break;
  case'g26_TopShield':if(v)api.shieldTop(s,t.p,card(t.source));break;
  case'g26_End':put(s,{...t,op:'g26_Select',selected:[]});if(v){for(let i=0;i<2&&s.winner===null;i++){const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);}api.deckCheck(s,t.p);}}break;
  case'g26_Select':put(s,{...t,op:v?'g26_Select':'g26_Order',selected:v?[...t.selected,v]:t.selected});break;
  case'g26_Order':{const r=t.selected.find(r=>r.uid===v);put(s,task('putCreature',t.p,t.source,r),{...t,selected:t.selected.filter(r=>r.uid!==v)});break;}
  case'g26_Saint':if(v)api.saintBreak(s,t.p,v,t.context);else{s.breakContext={...t.context,g26SaintUsed:true};api.breakShields(s,t.p,t.uids);}break;
  default:throw Error('未実装のウィリデ選択：'+t.op);
 }return true;}
 return {run,chosen,castles,
  effect(s,p,c,uid,entry){if(c.effect!=='virideEver')return false;put(s,task('g26_Ever',p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
  originAllowed(s,p,origin){return ['hand','deck'].includes(origin)||!has(s,1-p,'g26Poppi');},
  spellAllowed(s,p,c){return c.type!=='spell'||!has(s,1-p,'g26OneNote')||(s.players[p].spellsThisTurn||0)<1;},
  entryAllowed(s,p,c){return c?.type!=='creature'||(s.players[p].enteredThisTurn||0)<1||!creatures(s,1-p).some(x=>effective(x,s).g26OneNote&&x.under?.length);},
  everSaver(s,p){return lightMana(s,p)>=5&&has(s,p,'g26Ever');},
  noLose:(s,p)=>!!s.g26Extreme?.[p],
  discount(s,p,c){return c.type==='creature'?selectedGardens(s,p,c).length+(c.g26Ever&&lightMana(s,p)>=3?2:0):0;},
  played(s,p,c){for(const x of selectedGardens(s,p,c))(s.g26GardenUsed??={})[key(x)]=s.turn;},
  spellCast(s,p,c){s.players[p].spellsThisTurn=(s.players[p].spellsThisTurn||0)+1;firstEvent(s,p,c);},
  entry(s,p,x,muted=false){firstEvent(s,p,card(x),muted);},
  attack(s,p,x){if(effective(x,s).g26Ever&&!api.selfStopped(s,p))on(s,p,x,'g26_Ever');},
  shieldAdded(s,p,x){for(const y of creatures(s,p))if(effective(y,s).g26Zaze)on(s,p,y,'g26_Zaze');if(x.faceUp&&!x.shieldCardOnly&&card(x).g26Hustle)on(s,p,x,'g26_Hustle');},
  beforeBreak(s,p,uids){const ctx=s.breakContext;if(!ctx||ctx.g26SaintUsed||ctx.reverse||ctx.burn||ctx.player===p||!s.players[1-p].battle.some(x=>x.uid===ctx.sourceUid&&api.isCreature(s,x))||!castles(s,p).some(x=>card(x).g26Saint))return false;put(s,task('g26_Saint',p,'dm26rp1-057',{uids:[...uids],context:structuredClone(ctx)}));return true;},
  end(s){return [...creatures(s,s.active).filter(x=>effective(x,s).g26Dogi).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g26_End',s.active,x.cardId)})),...castles(s,s.active).filter(x=>card(x).g26Garden&&creatures(s,s.active).length>creatures(s,1-s.active).length).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g26_GardenDraw',s.active,x.cardId)}))];},
  expire(s,when,p){if(when==='start'){if(s.g26Extreme)s.g26Extreme[p]=false;for(const own of s.players){own.spellsThisTurn=0;for(const top of own.battle)for(const x of api.allLayers(top))if(x.g26Stay===p)delete x.g26Stay;}}},
  inherit(s,a,b){if(a.g26Stay!==undefined)b.g26Stay=a.g26Stay;},
  mainActions(s,p){const out=[];for(const origin of ['hand','mana'])for(const x of s.players[p][origin]){const c=card(x);if(!c.g26Viride||s.players[p].shields.length<=s.players[1-p].shields.length||!api.canCast(s,p,c,origin)||!api.canEnter(s,p,c,{origin,execution:true})||!api.canPay(s,p,{...c,cost:2,civilizations:['光'],fixedPayment:true}))continue;const permits=origin==='hand'?[null]:api.manaPermits(s,p,x);for(const permit of permits)out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin,manaPermit:permit,alternative:'viride',cost:2,label:c.name+'を光2マナで召喚'});}return out;},
  variants(s,p,actions){const out=[];for(const a of actions){if(a.kind!=='play'||a.alternative&&a.alternative!=='golgy'||a.freeSummon){out.push(a);continue;}const x=s.players[p][a.origin||'hand'].find(x=>x.uid===a.uid);if(!x){out.push(a);continue;}const c={...api.faces(card(x))[a.face||0],summonOrigin:a.origin||'hand',g27BaseUid:a.baseUid||null,...(a.alternative==='golgy'&&card(x).g27Big?{fixedPayment:true}:{})},list=gardens(s,p,c).map(key);out.push(a);if(!list.length)continue;const subsets=list.reduce((all,k)=>[...all,...all.map(a=>[...a,k])],[[]]);for(const selected of subsets.filter(x=>x.length!==list.length)){const payment={...c,g26Reducers:selected};if(api.canPay(s,p,payment))out.push({...a,g26Reducers:selected,cost:api.summonCost(s,p,payment),label:a.label+'（庭園の軽減 '+selected.length+'枚）'});}}return out;},
  alternative(s,p,a){const x=s.players[p][a.origin||'hand'].find(x=>x.uid===a.uid);api.cast(s,p,x.uid,false,a.baseUid||null,0,{cost:2,civilizations:['光'],fixedPayment:true},a.origin||'hand','カードの能力',false,a.manaPermit);},
 };
}
