// No.03: declared attack spells, delayed mana obligations, and spell recasting.
export function createJaouRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter,cast,enqueue,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),allColors=c=>[...new Set(faces(c).flatMap(colors))];
 const oni=s=>s.players.some(p=>!p.shields.length);
 const mana=(s,p)=>['闇','火'].every(c=>s.players[p].mana.some(x=>!x.faceDown&&api.manaColors(card(x),s,p).includes(c)));
 const ready=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,more)});
 function declarations(s,p,serial,target){const remaining=s.players[p].hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&!api.spellIgnored(s,c)&&api.canCast(s,p,c)&&((c.oniCast&&oni(s)&&mana(s,p))||(c.reverseCast&&p!==s.active&&target==='player'))?[{uid:x.uid,source:x.cardId,face,zoneSerial:x.zoneSerial||0,reverse:!!c.reverseCast}]:[]));if(remaining.length){put(s,task('g3_Declare',p,remaining[0].source,{remaining,declared:[],serial}));return true;}return false;}
 function ramp(s,p){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);s.players[p][to].push(x);}api.deckCheck(s,p);}
 function run(s,t){if(!t.op.startsWith('g3_'))return false;const own=s.players[t.p];switch(t.op){
 case'g3_Baba':if(oni(s)){const x=own.deck.pop();if(x){clear(x);own.grave.push(x);api.log(s,t.p,'mill','山札の一番下を墓地へ：'+card(x).name,{cardId:x.cardId});put(s,task('g3_BabaDeploy',t.p,t.source,{uid:x.uid}));}api.deckCheck(s,t.p);}break;
 case'g3_BabaDeploy':{const x=own.grave.find(x=>x.uid===t.uid);if(x&&ready(s,t.p,x,'grave')&&cost(card(x))<=5)choice(s,t,'一番下から墓地に置いたクリーチャーを出しますか？',[opt('出す',true,creatures(s,1-t.p).some(y=>effective(y,s).kakuReturn)?-5:20,x.cardId),skip()]);break;}
 case'g3_CycleEntry':put(s,task('execute',t.p,t.source,{origin:'grave',max:4,spellOnly:true}));break;
 case'g3_CycleRepeat':{const x=own.grave.find(x=>x.uid===t.spell),c=x&&faces(card(x))[t.face];if(x&&(x.zoneSerial||0)===t.serial+1&&c?.type==='spell'&&api.canCast(s,t.p,c)&&s.g3CycleUsed?.[t.key]!==s.turn)choice(s,t,'手札から唱えた呪文を墓地からもう一度唱えますか？',[opt(c.name+'を唱える',true,25,x.cardId),skip()]);break;}
 case'g3_Jaouga':choice(s,t,'自分のシールドをすべて手札に加えますか？',[opt('すべて手札へ（S・トリガー不可）',true,own.shields.length?15:0),skip()]);break;
 case'g3_Katsu':{const uids=own.deck.slice(0,5).map(x=>x.uid);(own.g3Protected??=[]).push(...uids);if(uids.length)choice(s,{...t,uids},'上5枚から公開して手札に加えるカードを選ぶ',uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,10+cost(card(x)),x.cardId);}));break;}
 case'g3_Order':{if(!t.uids.length){own.g3Protected=(own.g3Protected||[]).filter(uid=>!t.protected.includes(uid));if(t.bounce)put(s,task('g3_Bounce',t.p,t.source));break;}if(t.uids.length===1){const x=remove(own.deck,t.uids[0]);if(x)own.deck.push(x);put(s,{...t,uids:[]});break;}choice(s,t,'残りを山札の下へ置く順序を選ぶ',t.uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g3_Bounce':choice(s,t,'手札に戻すクリーチャーを選ぶ',[...targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)]).map(o=>({...o,score:own.battle.some(x=>x.uid===o.value)?-10:o.score})),skip()]);break;
 case'g3_Minus':choice(s,t,'パワーを－∞する相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g3_Jaoumon':{const uids=[];for(let i=0;i<4&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,t.p);if(x){clear(x);own.grave.push(x);uids.push(x.uid);}api.deckCheck(s,t.p);}put(s,task('g3_JaouDeploy',t.p,t.source,{uids}));break;}
 case'g3_JaouDeploy':choice(s,t,'今墓地に置いた闇・火のコスト6以下を出す',own.grave.filter(x=>t.uids.includes(x.uid)&&ready(s,t.p,x,'grave')&&!card(x).evolution&&!card(x).sMax&&cost(card(x))<=6&&colors(card(x)).some(c=>['闇','火'].includes(c))).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;
 case'g3_Fight':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x)choice(s,t,'出したクリーチャーでバトルしますか？',[...targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;}
 case'g3_Fortune':ramp(s,t.p);if(own.mana.length<=5)api.draw(s,t.p,1);break;
 case'g3_Final':if(!s.finalUsed?.[t.p]){(s.finalUsed??=[false,false])[t.p]=true;put(s,task('g3_FinalSelect',t.p,t.source,{selected:[],budget:6}));}break;
 case'g3_FinalSelect':{const used=t.selected.map(x=>x.uid),list=['hand','mana'].flatMap(origin=>own[origin].filter(x=>!used.includes(x.uid)&&!x.faceDown&&ready(s,t.p,x,origin)&&!card(x).evolution&&!card(x).sMax&&colors(card(x)).length>1&&cost(card(x))<=t.budget).map(x=>opt(card(x).name+'（'+(origin==='hand'?'手札':'マナ')+'）',{uid:x.uid,origin},10+cost(card(x)),x.cardId)));choice(s,t,'合計コスト6以下を選ぶ（残り'+t.budget+'）',[...list,opt('この選択で出す',null,t.selected.length?20:0)]);break;}
 case'g3_Declare':if(t.remaining.length){const row=t.remaining[0],x=own.hand.find(x=>x.uid===row.uid);if(x)choice(s,t,card(x).name+'の'+(row.reverse?'逆転撃':'鬼エンド')+'を宣言しますか？',[opt('宣言する',true,25,x.cardId),skip()]);else put(s,{...t,remaining:t.remaining.slice(1)});}else for(const row of t.declared)enqueue(s,t.p,{uid:row.uid,source:row.source,effect:'extended',task:task('g3_AttackSpell',t.p,row.source,{...row,serial:t.serial})});break;
 case'g3_AttackSpell':{const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.zoneSerial),c=x&&faces(card(x))[t.face];if(!x||!api.canCast(s,t.p,c)||api.spellIgnored(s,c)||(t.reverse?s.g3ReverseUsed===t.serial:!(oni(s)&&mana(s,t.p))))break;choice(s,t,'宣言した'+c.name+'を唱えますか？'+(t.reverse?'（次の自分のターンに闇3マナ）':''),[opt('唱える',true,35,x.cardId),skip()]);break;}
 case'g3_Debt':if(!api.spellIgnored(s,card(t.source))){if(!api.payDeferred(s,t.p,3,'闇'))api.finish(s,1-t.p,'逆転撃の闇3マナを支払えなかった','loss');else api.log(s,t.p,'payment','逆転撃の闇3マナを支払った',{cardId:t.source});}break;
 default:throw Error('未実装の邪王門効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g3_'))return false;const own=s.players[t.p];switch(t.op){
 case'g3_BabaDeploy':if(value)put(s,task('putCreature',t.p,t.source,{origin:'grave',uid:t.uid}));break;
 case'g3_CycleRepeat':if(value&&own.grave.some(x=>x.uid===t.spell&&(x.zoneSerial||0)===t.serial+1)&&s.g3CycleUsed?.[t.key]!==s.turn){(s.g3CycleUsed??={})[t.key]=s.turn;cast(s,t.p,t.spell,true,null,t.face,null,'grave','サイクルペディア');}break;
 case'g3_Jaouga':if(value){const moved=[];for(const uid of own.shields.map(x=>x.uid)){moved.push(...api.moveShield(s,t.p,uid,'hand',{handEffects:false}));}for(const x of moved)api.shieldHand(s,t.p,x);}break;
 case'g3_Katsu':{const x=remove(own.deck,value);if(x){api.log(s,t.p,'reveal','カツキングで公開：'+card(x).name,{cardId:x.cardId});const bounce=allColors(card(x)).some(c=>['火','自然'].includes(c));clear(x,'hand');own.hand.push(x);put(s,task('g3_Order',t.p,t.source,{uids:t.uids.filter(uid=>uid!==value),protected:t.uids,bounce}));api.deckCheck(s,t.p);}break;}
 case'g3_Order':{const x=remove(own.deck,value);if(x)own.deck.push(x);put(s,{...t,uids:t.uids.filter(uid=>uid!==value)});break;}
 case'g3_Bounce':if(value){const player=s.players.findIndex(p=>p.battle.some(x=>x.uid===value));move(s,[{player,uid:value,to:'hand',destroy:false}]);}break;
 case'g3_Minus':{const x=s.players[1-t.p].battle.find(x=>x.uid===value);if(x)(x.powerModifiers??=[]).push({amount:'-infinity',spellCost:4,expires:'end',who:s.active});break;}
 case'g3_JaouDeploy':{const x=remove(own.grave,value);if(x){enter(s,t.p,x,null,{origin:'grave',execution:false});if(own.battle.some(y=>y.uid===x.uid))put(s,task('g3_Fight',t.p,t.source,{uid:x.uid,incarnation:x.incarnation||0}));}break;}
 case'g3_Fight':if(value){const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation),y=s.players[1-t.p].battle.find(x=>x.uid===value);if(x&&y)api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);}break;
 case'g3_FinalSelect':if(value){const x=own[value.origin].find(x=>x.uid===value.uid);put(s,{...t,selected:[...t.selected,value],budget:t.budget-cost(card(x))});}else put(s,...t.selected.map(x=>task('putCreature',t.p,t.source,{...x})));break;
 case'g3_Declare':if(value){const row=t.remaining[0];api.log(s,t.p,'attackDeclare',card(row.source).name+'の'+(row.reverse?'逆転撃':'鬼エンド')+'を使用宣言',{cardId:row.source});}put(s,{...t,remaining:t.remaining.slice(1),declared:value?[...t.declared,t.remaining[0]]:t.declared});break;
 case'g3_AttackSpell':if(value){if(t.reverse){s.g3ReverseUsed=t.serial;(s.g3Debts??=[]).push({p:t.p,source:t.source});}cast(s,t.p,t.uid,true,null,t.face,null,'hand',t.reverse?'逆転撃':'鬼エンド');}break;
 default:throw Error('未実装の邪王門選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid){const op={babaBottom:'g3_Baba',cycleEntry:'g3_CycleEntry',jaougaShields:'g3_Jaouga',katsuLook:'g3_Katsu',reverseMinus:'g3_Minus',jaoumon:'g3_Jaoumon',fortuneRamp:'g3_Fortune'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid}));return true;},
 attackStart(s,p,x){const serial=s.g3AttackSerial=(s.g3AttackSerial||0)+1;s.g3Window={serial,p:1-p,target:s.attack.target,done:false};declarations(s,p,serial,s.attack.target);},
 beforeNonActive(s){const w=s.g3Window;if(!w||w.done||s.decision||s.extTasks?.length||s.attackDeclarations||s.leaving||s.battleResolution||s.judge)return false;w.done=true;return declarations(s,w.p,w.serial,w.target);},
 start(s,p){const rows=(s.g3Debts||[]).filter(x=>x.p===p);s.g3Debts=(s.g3Debts||[]).filter(x=>x.p!==p);return rows.map(x=>({source:x.source,effect:'extended',task:task('g3_Debt',p,x.source)}));},
 spellCast(s,p,c,inst,origin,face){if(!inst||c.type!=='spell')return;const list=creatures(s,p).filter(x=>effective(x,s).cycle);if(origin==='grave'&&list.length)inst.finishTo='deck';if(origin==='hand')for(const x of list)if(s.g3CycleUsed?.[key(x)]!==s.turn)on(s,p,x,'g3_CycleRepeat',{key:key(x),spell:inst.uid,serial:inst.zoneSerial||0,face});},
 lossOptions(s,p){return s.active!==p&&mana(s,p)?s.players[p].hand.filter(x=>card(x).babaLoss).map(x=>opt(card(x).name+'を見せ、山札の下へ置いて敗北を回避',{kind:'baba',uid:x.uid},50,x.cardId)):[];},
 };
}
