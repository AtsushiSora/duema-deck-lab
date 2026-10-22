// Serializable effects for the first fully supported DM26-SD1 list.
export function createStarterRules(api){
 const {card,colors,cost,effective,creatures,put,task,choice,opt,skip,targetOptions,nowCreature,draw,mill,remove,removeShield,clear,enter,move,enqueue,log}=api;
 const puppet=c=>c.race?.includes('デスパペット');
 const on=(s,p,source,op,more={})=>enqueue(s,p,{source, effect:'extended',task:task(op,p,source,more)});
 const live=(s,t)=>{const x=nowCreature(s,t.p,t.uid);return x&&(t.incarnation===undefined||t.incarnation===(x.incarnation||0))?x:null;};
 const slashColors=(s,p)=>{const c=new Set(s.players[p].battle.filter(x=>['creature','seed'].includes(card(x).type)).flatMap(x=>colors(card(x))));return c.has('水')&&c.has('闇');};
 const modes=(s,p,c,family)=>put(s,task('s6Modes',p,c.id,{family,remaining:2,selected:[]}));
 function run(s,t){if(!t.op.startsWith('s6'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case 's6MaryEntry':choice(s,t,'山札の上2枚を墓地に置きますか？',[opt('2枚を墓地へ',true,own.deck.length>2?15:-20),skip()]);break;
  case 's6MaryRevive':{const list=own.grave.filter(x=>puppet(card(x))&&card(x).type!=='spell'&&cost(card(x))<=4&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false}));choice(s,t,'墓地からコスト4以下のデスパペットを出しますか？',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
  case 's6MaryLeave':put(s,task('optionalDrawOne',t.p,t.source),task('discard',1-t.p,t.source,{causedBy:t.p,n:1}));break;
  case 's6FumiDraw':{if((s.s6FumiUsed||{})[t.key]===s.turn)break;choice(s,t,'フミシュナでカードを1枚引きますか？',[opt('1枚引く',true,own.deck.length>1?15:-20),skip()]);break;}
  case 's6Sacrifice':if(live(s,t))choice(s,t,'特攻人形ジェニーを破壊して相手の手札を捨てさせますか？',[opt('自身を破壊して1枚捨てさせる',true,opp.hand.length?25:-5),skip()]);break;
  case 's6Inspect':choice(s,t,'相手の手札を見て、捨てさせる1枚を選ぶ',opp.hand.map(x=>opt(card(x).name,x.uid,10+cost(card(x))*3,x.cardId)));break;
  case 's6OniBounce':{const x=s.players[t.owner].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x)choice(s,t,'オニカマスで、出たクリーチャーを手札に戻しますか？',[opt('そのクリーチャーを手札に戻す',true,30,x.cardId),skip()]);break;}
  case 's6Modes':{
   if(!t.remaining){put(s,...[...t.selected].sort((a,b)=>a-b).map(mode=>task('s6Mode',t.p,t.source,{family:t.family,mode})));break;}
   const labels=t.family==='darkness'?['相手が自身の手札1枚を選んで捨てる','墓地からコスト4以下の闇のクリーチャーを出す','相手1体のパワーを-4000']:['カードを1枚引く','相手1体を手札に戻す'];
   choice(s,t,`効果を${3-t.remaining}/2つ目に選ぶ（同じ効果も選べます）`,labels.map((label,value)=>{let score=0;if(t.family==='darkness'){if(value===0)score=opp.hand.length?12:0;if(value===1)score=own.grave.some(x=>card(x).type==='creature'&&colors(card(x)).includes('闇')&&cost(card(x))<=4)?35:0;if(value===2)score=creatures(s,1-t.p).some(x=>api.power(x,false,s)<=4000)?30:creatures(s,1-t.p).length?20:0;}else score=value===0?(own.deck.length>2?10:-20):creatures(s,1-t.p).length?20:0;return opt(label,value,score);}));break;
  }
  case 's6Mode':if(t.family==='darkness'){if(t.mode===0)put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1}));if(t.mode===1)put(s,task('s6DarkRevive',t.p,t.source));if(t.mode===2)put(s,task('powerMinus',t.p,t.source));}else{if(t.mode===0)draw(s,t.p,1);if(t.mode===1)put(s,task('s6Bounce',t.p,t.source));}break;
  case 's6DarkRevive':{const list=own.grave.filter(x=>card(x).type==='creature'&&colors(card(x)).includes('闇')&&cost(card(x))<=4&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false}));choice(s,t,'墓地からコスト4以下の闇のクリーチャーを出す',list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;}
  case 's6Bounce':choice(s,t,'手札に戻す相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case 's6Slash':{const canBoth=slashColors(s,t.p),revive=own.grave.some(x=>card(x).type==='creature'&&cost(card(x))<=8),drawScore=own.deck.length>3?20:-50;choice(s,t,'ブレイン・スラッシュの効果を選ぶ',[opt('3枚引いて1枚捨てる',[0],drawScore),opt('墓地からコスト8以下の1体を出す',[1],revive?30:0),...(canBoth?[opt('両方を上から順に使う',[0,1],revive&&drawScore>0?50:drawScore)]:[])]);break;}
  case 's6Charon':choice(s,t,'Vチャロンの対象プレイヤーを選ぶ',[opt('自分の手札とシールドを入れ替える',t.p,own.hand.length<2?5:-10),opt('相手の手札とシールドを入れ替える',1-t.p,opp.shields.length&&api.deckRedirect(s)?80:15)]);break;
  case 's6HandOrder':if(t.uids.length)choice(s,t,`山札の下に置く手札の順序を選ぶ（残り${t.uids.length}枚）`,t.uids.map(uid=>{const x=own.hand.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));else{put(s,task('s6AfterHandDraw',t.p,t.source));draw(s,t.p,t.count);}break;
  case 's6AfterHandDraw':put(s,task('s6ShieldOrder',t.p,t.source,{uids:own.shields.map(x=>x.uid),count:own.shields.length}));break;
  case 's6ShieldOrder':if(t.uids.length)choice(s,t,`山札の下に置くシールドの順序を選ぶ（残り${t.uids.length}枚）`,t.uids.map(uid=>opt('元のシールド'+(t.positions?.[uid]??own.shields.findIndex(x=>x.uid===uid)+1),uid,0)));else for(let i=0;i<t.count&&s.winner===null;i++)api.shieldTop(s,t.p,card(t.source));break;
  default:throw Error('未実装の構築済みデッキ効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('s6'))return false;const own=s.players[t.p];switch(t.op){
  case 's6MaryEntry':if(value)mill(s,t.p,2);if(s.winner===null)put(s,task('s6MaryRevive',t.p,t.source));break;
  case 's6MaryRevive':case 's6DarkRevive':if(value)put(s,task('putCreature',t.p,t.source,{uid:value,origin:'grave'}));break;
  case 's6FumiDraw':if(value&&(s.s6FumiUsed||{})[t.key]!==s.turn){(s.s6FumiUsed??={})[t.key]=s.turn;draw(s,t.p,1);}break;
  case 's6Sacrifice':if(value&&live(s,t)){put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1,random:true}));move(s,[{player:t.p,uid:t.uid,to:'grave'}]);}break;
  case 's6Inspect':put(s,task('discardChosen',1-t.p,t.source,{uid:value,n:1}));break;
  case 's6OniBounce':if(value&&s.players[t.owner].battle.some(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation))move(s,[{player:t.owner,uid:t.uid,to:'hand'}]);break;
  case 's6Modes':put(s,{...t,remaining:t.remaining-1,selected:[...t.selected,value]});break;
  case 's6Bounce':move(s,[{player:1-t.p,uid:value,to:'hand'}]);break;
  case 's6Slash':put(s,...value.flatMap(mode=>mode===0?[task('draw',t.p,t.source,{n:3}),task('discard',t.p,t.source,{causedBy:t.p,n:1})]:[task('revive',t.p,t.source,{max:8})]));break;
  case 's6Charon':{const hand=s.players[value].hand;put(s,task('s6HandOrder',value,t.source,{uids:hand.map(x=>x.uid),count:hand.length}));log(s,t.p,'charonTarget',`Vチャロンで${value===t.p?'自分':'相手'}を選ぶ`,{cardId:t.source});break;}
  case 's6HandOrder':{const x=remove(own.hand,value);if(x){clear(x,'deck');own.deck.push(x);}put(s,{...t,uids:t.uids.filter(uid=>uid!==value)});break;}
  case 's6ShieldOrder':{const positions=t.positions||Object.fromEntries(own.shields.map((x,i)=>[x.uid,i+1])),x=removeShield(s,t.p,value);if(x){const to=x.faceUp&&card(x).gCastle?'grave':'deck';clear(x,to);own[to].push(x);}put(s,{...t,positions,uids:t.uids.filter(uid=>uid!==value)});break;}
  default:throw Error('未実装の構築済みデッキ選択：'+t.op);
 }return true;}
 return {run,chosen,
  effect(s,p,c,uid,entry){const more={uid,incarnation:entry?.incarnation};switch(c.effect){case'maryRevive':put(s,task('s6MaryEntry',p,c.id));break;case'darknessModes':modes(s,p,c,'darkness');break;case'fumiModes':modes(s,p,c,'fumi');break;case'brainSlash':put(s,task('s6Slash',p,c.id));break;case'charonReset':put(s,task('s6Charon',p,c.id));break;case'jennySacrifice':put(s,task('s6Sacrifice',p,c.id,more));break;case'inspectDiscard':put(s,task('s6Inspect',p,c.id));break;default:return false;}return true;},
  discarded(s,p){for(const x of creatures(s,1-p))if(effective(x,s).discardDrawOnce){const key=x.uid+'@'+(x.incarnation||0);if((s.s6FumiUsed||{})[key]!==s.turn)on(s,1-p,x.cardId,'s6FumiDraw',{uid:x.uid,incarnation:x.incarnation||0,key});}},
  leaveSnapshot(s,departing){return s.players.map((_,p)=>creatures(s,p).filter(x=>effective(x,s).puppetLord).map(x=>({uid:x.uid,source:x.cardId,selfOnly:departing.some(r=>r.player===p&&r.uid===x.uid)})));},
  leaving(s,p,x,snapshot){if(puppet(card(x)))for(const w of snapshot?.[p]||[])if(!w.selfOnly||w.uid===x.uid)on(s,p,w.source,'s6MaryLeave');},
  entry(s,p,inst,options){if(p===s.active&&api.isCreature(s,inst)&&options.execution===false)for(const x of creatures(s,1-p))if(effective(x,s).oniBounce)on(s,1-p,x.cardId,'s6OniBounce',{owner:p,uid:inst.uid,incarnation:inst.incarnation||0});},
  mainActions(s,p){return s.players[p].grave.flatMap(x=>api.faces(card(x)).flatMap((c,face)=>c.graveCast&&!api.spellIgnored(s,c)&&api.canCast(s,p,c)&&api.canPay(s,p,c)?[{kind:'play',label:'墓地から'+c.name+'を唱える',uid:x.uid,cardId:x.cardId,face,cost:api.summonCost(s,p,c),origin:'grave',ownGraveCast:true}]:[]));},
 };
}
