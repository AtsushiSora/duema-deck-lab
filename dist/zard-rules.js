// No.02: five-colour resource choices and SSS invasion continuations.
export function createZardRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter,cast,draw,enqueue,targetOptions}=api;
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const allColors=c=>[...new Set(faces(c).flatMap(colors))];
 const five=list=>['光','水','闇','火','自然'].every(c=>list.includes(c));
 const mark=(s,p,n)=>{const own=s.players[p],uids=own.deck.slice(0,n).map(x=>x.uid);(own.g2Protected??=[]).push(...uids);return uids;};
 const unmark=(s,p,uids)=>{const own=s.players[p];own.g2Protected=(own.g2Protected||[]).filter(x=>!uids.includes(x));};
 const ready=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function inherited(s,a,b){for(const k of['entered','buff','unblocked','tapLocks','buffSources','unblockSpellCost','powerModifiers','skipUntap','gospelSpeed','g19Protected','g19Blocker','g2Blocker','justDiverActive','g9Speed','g9Untap','g9AttackTurn','g9AttackCount'])if(a[k]!==undefined)b[k]=structuredClone(a[k]);api.inherit(s,a,b);}
 function ramp(s,p,n){const own=s.players[p];for(let i=0;i<n&&s.winner===null;i++){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s)?'grave':'mana';clear(x,to);own[to].push(x);}api.deckCheck(s,p);}}
 function run(s,t){if(!t.op.startsWith('g2_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g2_Zard':{const list=['hand','grave'].flatMap(origin=>own[origin].flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&cost(c)<=7&&api.canCast(s,t.p,c)?[opt(c.name+'（'+(origin==='hand'?'手札':'墓地')+'）',{uid:x.uid,origin,face},20+cost(c),x.cardId)]:[])));choice(s,t,'コスト7以下の呪文を唱えますか？',[...list,skip()]);break;}
  case'g2_End':choice(s,t,'ザーディクリカで破壊とドローを行いますか？',[opt('相手1体を破壊し、1枚引く',true,own.deck.length>1?20:-50),skip()]);break;
  case'g2_Dogi':ramp(s,t.p,2);put(s,task('g2_ReturnCreature',t.p,t.source));break;
  case'g2_ReturnCreature':choice(s,t,'マナから手札に戻すクリーチャーを選ぶ',own.mana.filter(x=>!x.faceDown&&card(x).type==='creature').map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;
  case'g2_Untap':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x&&api.canUntap(x))x.tapped=false;break;}
  case'g2_Dolf':{const rows=creatures(s,1-t.p).filter(x=>colors(card(x)).filter(c=>c!=='無色').length<2).map(x=>({player:1-t.p,uid:x.uid,to:'grave'}));if(rows.length)move(s,rows);break;}
  case'g2_Damd':choice(s,t,'墓地・マナ・手札へ移動する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case'g2_DamdTo':choice(s,t,'選んだクリーチャーの移動先',[opt('墓地','grave',10),opt('マナ','mana',5),opt('手札','hand',0)]);break;
  case'g2_Five':{const labels=['シールドを1枚追加','カードを2枚引く','相手の手札をランダムに1枚捨てさせる','コスト6以下の相手のエレメントを破壊','マナを1枚追加し、1枚まで手札に戻す'];if(t.selected.length===2){put(s,...[...t.selected].sort((a,b)=>a-b).map(mode=>task('g2_FiveMode',t.p,t.source,{mode})));break;}choice(s,t,'効果を'+(t.selected.length+1)+'/2回目に選ぶ',labels.map((l,i)=>opt(l,i,i===3&&opp.battle.length?25:i===1&&own.deck.length>3?15:10)).concat(!t.selected.length&&five(own.battle.flatMap(x=>colors(card(x))))?[opt('5文明：すべてを1回ずつ使う','all',40)]:[]));break;}
  case'g2_FiveMode':if(t.mode===0)api.shieldTop(s,t.p,card(t.source));if(t.mode===1)draw(s,t.p,2);if(t.mode===2)put(s,task('discard',1-t.p,t.source,{n:1,random:true}));if(t.mode===3)choice(s,t,'破壊するコスト6以下のエレメントを選ぶ',targetOptions(s,t.p,opp.battle.filter(x=>cost(card(x))<=6)));if(t.mode===4){ramp(s,t.p,1);put(s,task('g20ReturnMana',t.p,t.source,{max:1,selected:[]}));}break;
  case'g2_Sign':choice(s,t,'手札から出す光のドラゴンを選ぶ',own.hand.filter(x=>ready(s,t.p,x,'hand')&&!card(x).evolution&&cost(card(x))<=7&&colors(card(x)).includes('光')&&String(card(x).race).includes('ドラゴン')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;
  case'g2_Aqua':choice(s,t,'山札の上5枚を公開しますか？',[opt('公開して光・闇のカードを手札へ',true,own.deck.length>5?20:-50),skip()]);break;
  case'g2_Boss':put(s,task('discard',1-t.p,t.source,{n:1,random:true,g2Boss:{p:t.p,source:t.source}}));break;
  case'g2_BossDeploy':{const shared=allColors(card(t.discardId));choice(s,t,'捨てたカードと同じ文明の多色クリーチャーを出しますか？',[...own.hand.filter(x=>ready(s,t.p,x,'hand')&&cost(card(x))<=8&&colors(card(x)).length>1&&colors(card(x)).some(c=>shared.includes(c))).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;}
  case'g2_Allocate':{const uids=mark(s,t.p,3);if(uids.length)put(s,task('g2_ChooseHand',t.p,t.source,{uids,fire:t.fire}));break;}
  case'g2_ChooseHand':choice(s,t,'上3枚から手札に加えるカードを選ぶ',t.uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,10+cost(card(x)),x.cardId);}));break;
  case'g2_ChooseMana':if(t.uids.length)choice(s,t,'マナに置くカードを選ぶ',t.uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,allColors(card(x)).length*3,x.cardId);}));else put(s,task('g2_AllocateFinish',t.p,t.source,{...t,op:'g2_AllocateFinish',mana:null}));break;
  case'g2_AllocateFinish':{const uids=[t.hand,t.mana,...t.uids].filter(Boolean),grave=t.uids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean);for(const uid of uids){const x=remove(own.deck,uid);if(!x)continue;const to=uid===t.hand?'hand':uid===t.mana&&!api.deckRedirect(s)?'mana':'grave';clear(x,to);own[to].push(x);}unmark(s,t.p,uids);api.deckCheck(s,t.p);if(t.fire&&grave.length)put(s,task('g2_FireCost',t.p,t.source,{cardId:grave[0].cardId}));break;}
  case'g2_FireCost':{const cs=[...new Set(faces(card(t.cardId)).map(cost))];if(cs.length===1)put(s,task('destroyCost',t.p,t.source,{max:cs[0],optional:false}));else choice(s,t,'墓地に置いたカードのどちらのコストを使う？',cs.map(c=>opt(String(c),c,c)));break;}
  case'g2_Miracle':ramp(s,t.p,1);if(five(own.mana.filter(x=>!x.faceDown).flatMap(x=>api.manaColors(card(x),s,t.p))))ramp(s,t.p,1);break;
  case'g2_Declare':if(t.remaining.length){const row=t.remaining[0],x=own[row.origin].find(x=>x.uid===row.uid);if(x)choice(s,t,card(x).name+'（'+({hand:'手札',grave:'墓地',mana:'マナ',battle:'バトルゾーン'}[row.origin])+'）のSSS級侵略を宣言しますか？',[opt('宣言する',true,20,x.cardId),skip()]);else put(s,{...t,remaining:t.remaining.slice(1)});}else for(const row of t.declared)enqueue(s,t.p,{uid:row.uid,source:row.cardId,effect:'extended',task:task('g2_Invade',t.p,row.cardId,{...row,attacker:t.attacker})});break;
  case'g2_Invade':{const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),a=own.battle.find(x=>x.uid===s.attack?.attacker);if(!x||!a||x===a||!invasionMatches(s,a)||!api.evolutionBases(s,t.p,card(x)).some(b=>b.uid===a.uid)||t.origin!=='battle'&&!api.canEnter(s,t.p,card(x),{origin:t.origin,execution:false}))break;choice(s,{...t,base:a.uid},'宣言したSSS級侵略を実行しますか？',[opt('攻撃中のクリーチャーの上に重ねる',true,30,x.cardId),skip()]);break;}
  default:throw Error('未実装の5c効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g2_'))return false;const own=s.players[t.p];switch(t.op){
  case'g2_Zard':if(value){const x=own[value.origin].find(x=>x.uid===value.uid);x.finishTo='deck';cast(s,t.p,x.uid,true,null,value.face,null,value.origin,'ザーディクリカ');}break;
  case'g2_End':if(value)put(s,task('destroyPower',t.p,t.source,{max:5500}),task('draw',t.p,t.source,{n:1}));break;
  case'g2_ReturnCreature':{const x=remove(own.mana,value);if(x){clear(x,'hand');own.hand.push(x);}break;}
  case'g2_Damd':put(s,task('g2_DamdTo',t.p,t.source,{target:value}));break;
  case'g2_DamdTo':move(s,[{player:1-t.p,uid:t.target,to:value,destroy:false}]);break;
  case'g2_Five':if(value==='all')put(s,...[0,1,2,3,4].map(mode=>task('g2_FiveMode',t.p,t.source,{mode})));else put(s,{...t,selected:[...t.selected,value]});break;
  case'g2_FiveMode':if(t.mode===3)move(s,[{player:1-t.p,uid:value,to:'grave'}]);break;
  case'g2_Sign':{const x=remove(own.hand,value);enter(s,t.p,x,null,{origin:'hand',execution:false});if(own.battle.some(y=>y.uid===x.uid)){(x.g2Blocker??=[]).push({who:t.p,turns:own.turns});}break;}
  case'g2_Aqua':if(value){const list=own.deck.splice(0,5);api.log(s,t.p,'reveal','アクアンで上5枚を公開：'+list.map(x=>card(x).name).join('、'),{cardId:t.source});for(const x of list){const to=allColors(card(x)).some(c=>['光','闇'].includes(c))?'hand':'grave';clear(x,to);own[to].push(x);}api.deckCheck(s,t.p);}break;
  case'g2_BossDeploy':if(value)put(s,task('putCreature',t.p,t.source,{origin:'hand',uid:value}));break;
  case'g2_ChooseHand':put(s,{...t,op:'g2_ChooseMana',hand:value,uids:t.uids.filter(uid=>uid!==value)});break;
  case'g2_ChooseMana':put(s,{...t,op:'g2_AllocateFinish',mana:value,uids:t.uids.filter(uid=>uid!==value)});break;
  case'g2_FireCost':put(s,task('destroyCost',t.p,t.source,{max:value,optional:false}));break;
  case'g2_Declare':put(s,{...t,remaining:t.remaining.slice(1),declared:value?[...t.declared,t.remaining[0]]:t.declared});break;
  case'g2_Invade':if(value)invade(s,t);break;
  default:throw Error('未実装の5c選択：'+t.op);
 }return true;}
 function invasionMatches(s,a){return api.isCreature(s,a)&&String(effective(a,s).race).includes('コマンド')&&colors(effective(a,s)).some(c=>['水','闇','自然'].includes(c));}
 function invade(s,t){const own=s.players[t.p],x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),base=own.battle.find(x=>x.uid===t.base);if(!x||!base||x===base)return;
  if(t.origin==='battle'){
   const index=own.battle.indexOf(x),[under,...rest]=x.under||[];if(under){if(rest.length)(under.under??=[]).push(...rest);inherited(s,x,under);under.tapped=x.tapped;own.battle[index]=under;}else own.battle.splice(index,1);delete x.under;
   remove(own.battle,base.uid);x.under=[base];inherited(s,base,x);x.tapped=base.tapped;own.battle.push(x);s.attack.attacker=x.uid;
   if(!api.ignored(s,x))on(s,t.p,x,'g2_Damd');
  }else{remove(own[t.origin],x.uid);enter(s,t.p,x,base.uid,{origin:t.origin,execution:false});}
  api.log(s,t.p,'invasion','SSS級侵略で'+card(x).name+'を攻撃中のクリーチャーに重ねる',{cardId:x.cardId});
 }
 return {run,chosen,inherit(s,base,x){if(base.g2Blocker?.length)x.g2Blocker=structuredClone(base.g2Blocker);},
  effect(s,p,c,uid){const op={zardCast:'g2_Zard',dogiRamp:'g2_Dogi',dolfSweep:'g2_Dolf',damdRemove:'g2_Damd',fiveModes:'g2_Five',dragonSign:'g2_Sign',aquaReveal:'g2_Aqua',bossDeploy:'g2_Boss',dedoAllocate:'g2_Allocate',fireAllocate:'g2_Allocate',fairyMiracle:'g2_Miracle'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,...(c.effect==='fiveModes'?{selected:[]}:{}),...(c.effect==='fireAllocate'?{fire:true}:{})}));return true;},
  spellCast(s,p){(s.g2Spells??=[null,null])[p]=s.turn;},
  end(s){const p=s.active;return s.g2Spells?.[p]===s.turn?creatures(s,p).filter(x=>effective(x,s).zardEnd).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g2_End',p,x.cardId)})):[];},
  shieldLeft(s,p,shield){for(const x of creatures(s,p))if(effective(x,s).dolf&&x.exLifeShieldUid===shield.uid)on(s,p,x,'g2_Dolf');},
  allowedSpell(s,p,c){return colors(c).filter(c=>c!=='無色').length>1||!creatures(s,1-p).some(x=>effective(x,s).dolf);},
  battleWins(s,p,w){const x=w&&ownCreature(s,p,w.uid);return x&&effective(x,s).revZero&&s.players[p].shields.length===0?[{player:p,uid:x.uid,source:x.cardId,task:task('g2_Untap',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}]:[];},
  attackStart(s,p,a){if(!invasionMatches(s,a))return;const remaining=['hand','grave','mana','battle'].flatMap(origin=>s.players[p][origin].filter(x=>x.uid!==a.uid&&card(x).sssInvasion&&(origin!=='battle'||!api.ignored(s,x))).map(x=>({uid:x.uid,origin,cardId:x.cardId,serial:x.zoneSerial||0})));if(remaining.length)put(s,task('g2_Declare',p,a.cardId,{remaining,declared:[],attacker:a.uid}));},
  discarded(s,t,x,discarded){if(t.g2Boss&&discarded)put(s,task('g2_BossDeploy',t.g2Boss.p,t.g2Boss.source,{discardId:x.cardId}));},
  expire(s,when,p){if(when==='start')for(const own of s.players)for(const x of own.battle)x.g2Blocker=(x.g2Blocker||[]).filter(g=>g.who!==p);},
 };
 function ownCreature(s,p,uid){return s.players[p].battle.find(x=>x.uid===uid);}
}
