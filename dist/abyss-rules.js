import {policyRemove,policyTake,policyLook} from './champion-zone-policy.js';
// No.13: grave summons, delayed returns, private Mekraid and borrowed entry abilities.
export function createAbyssRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,cast,draw,enqueue,log,targetOptions}=api;
 const abyss=c=>String(c.race).includes('アビス'),dark=x=>faces(card(x)).some(c=>colors(c).includes('闇'));
 const on=(s,p,x,op,more={})=>enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0)&&!x.sealed);
 const canPut=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const canUse=(s,p,c)=>api.canCast(s,p,c)&&(c.type==='spell'||api.canEnter(s,p,c,{origin:'deck',execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 const darkCount=(s,p)=>s.players[p].battle.filter(x=>(api.isCreature(s,x)||card(x).type==='seed')&&colors(card(x)).includes('闇')).length;
 const protect=(s,p,n)=>{const own=s.players[p];const ids=policyLook(s,p,n,own.deck.filter(x=>!(own.g13Protected||[]).includes(x.uid)),api).map(x=>x.uid);(own.g13Protected??=[]).push(...ids);return ids;};
 const release=(own,ids)=>own.g13Protected=(own.g13Protected||[]).filter(x=>!ids.includes(x));
 function grant(s,x,conditional){(x.g13Rush??=[]).push({turn:s.turn,conditional,attacked:false});}
 function sbPairs(s,t){const own=s.players[t.p];return own.hand.filter(x=>card(x).strikeBack&&api.canCast(s,t.p,card(x))&&!t.declared?.includes(x.uid)).flatMap(x=>t.costs.filter(uid=>uid!==x.uid&&own.hand.some(y=>y.uid===uid&&(card(x).strikeBackRace?api.faces(card(y)).some(c=>String(c.race).includes(card(x).strikeBackRace)):api.faces(card(y)).some(c=>colors(c).includes(card(x).strikeBackColor||'闇'))))).map(uid=>opt(card(x).name+'：'+card(own.hand.find(y=>y.uid===uid)).name+'を捨ててS・バック',{uid:x.uid,cost:uid},35,x.cardId)));}
 function run(s,t){if(!t.op.startsWith('g13_'))return false;const own=s.players[t.p];switch(t.op){
 case'g13_Jaga':if(own.hand.length>=2)choice(s,t,'手札を2枚捨て、アビス・メクレイド5する？',[opt('2枚捨てて使う',true,30,t.source),skip()]);break;
 case'g13_Mek':{const uids=protect(s,t.p,t.double?6:3);put(s,{...t,op:'g13_MekPick',uids,selected:[],max:t.double?2:1});break;}
 case'g13_MekPick':{const list=t.uids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return x&&!t.selected.some(y=>y.uid===uid)?faces(card(x)).flatMap((c,face)=>abyss(c)&&cost(c)<=5&&canUse(s,t.p,c)?[opt(c.name,{uid,face},30+cost(c),x.cardId)]:[]):[];});if(t.selected.length>=t.max||!list.length){put(s,{...t,op:'g13_MekUse',remaining:t.selected});break;}choice(s,t,'アビス・'+(t.max===2?'W・':'')+'メクレイド5：使うカードを選ぶ（'+t.selected.length+'/'+t.max+'）',[...list,opt('この内容で使う',null,t.selected.length?25:0)]);break;}
 case'g13_MekUse':{if(!t.revealed){const chosen=t.remaining.flatMap(v=>{const x=own.deck.find(x=>x.uid===v.uid);return x?[faces(card(x))[v.face].name]:[];});if(chosen.length)log(s,t.p,'mekraidReveal','メクレイドで使うカードを公開：'+chosen.join('、'),{cardId:t.source});t={...t,revealed:true};}const [v,...remaining]=t.remaining;if(!v){put(s,{...t,op:'g13_Order',remaining:t.uids});break;}put(s,{...t,remaining});const x=own.deck.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];if(x&&canUse(s,t.p,c)){release(own,[x.uid]);put(s,task('g13_Use',t.p,t.source,v));}break;}
 case'g13_Use':{const x=own.deck.find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face];if(!x||!canUse(s,t.p,c))break;if(c.evolution||c.neoEvolution)choice(s,t,'メクレイド：進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',null,0)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId))]);else cast(s,t.p,x.uid,true,null,t.face,null,'deck','アビス・メクレイド');break;}
 case'g13_Order':{const remaining=t.remaining.filter(uid=>own.deck.some(x=>x.uid===uid));if(remaining.length<2){for(const uid of remaining)own.deck.push(remove(own.deck,uid));release(own,t.uids);break;}choice(s,{...t,remaining},'残りを山札の下へ置く順序を選ぶ',remaining.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g13_JagaRevive':if(s.g13JagaUsed?.[t.key]!==s.turn)choice(s,t,'ジャガイスト：墓地からアビスを出す？',[...own.grave.filter(x=>abyss(card(x))&&cost(card(x))<=t.max&&canPut(s,t.p,x,'grave')).map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)),skip()]);break;
 case'g13_JagaGrant':{const x=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetInc);if(x)grant(s,x,true);break;}
 case'g13_Sis':choice(s,t,'パワーを−∞する相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g13_WMek':choice(s,t,'アビス・W・メクレイド5する？',[opt('上6枚から2枚まで使う',true,30,t.source),skip()]);break;
 case'g13_Lord':choice(s,t,'墓地・マナからコスト6以下のアビスを出す？',[...['grave','mana'].flatMap(origin=>own[origin].filter(x=>abyss(card(x))&&cost(card(x))<=6&&canPut(s,t.p,x,origin)).map(x=>opt(card(x).name,{origin,uid:x.uid},30+cost(card(x)),x.cardId))),skip()]);break;
 case'g13_Return':{const x=own.battle.find(x=>!x.sealed&&api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===t.incarnation));if(x)move(s,[{player:t.p,uid:x.uid,to:'deck',destroy:false}]);break;}
 case'g13_Murder':choice(s,t,'相手の手札を見る：捨てさせるクリーチャーを選ぶ',s.players[1-t.p].hand.filter(x=>card(x).type==='creature').map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;
 case'g13_Borrow':if(darkCount(s,t.p)>=3)choice(s,t,'シビルカウント3：能力を使う相手の墓地のカードを選ぶ',[...s.players[1-t.p].grave.map(x=>opt(card(x).name,x.uid,api.entryAbilities(s,t.p,x.cardId,t).length?25+cost(card(x)):-10,x.cardId)),skip()]);break;
 case'g13_BorrowAbility':{const x=s.players[1-t.p].grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(!x)break;const entries=api.entryAbilities(s,t.p,x.cardId,t);choice(s,t,'使う登場時能力を1つ選ぶ',[...entries.map((entry,i)=>opt(entry.label,{entry},20,x.cardId)),opt('能力を使わず、山札の下へ置く',null,0)]);break;}
 case'g13_BorrowBottom':{const x=s.players[1-t.p].grave.find(x=>x.uid===t.target&&(x.zoneSerial||0)===t.serial);if(x&&api.canMoveZone(s,1-t.p,'grave')){policyRemove(s,1-t.p,'grave',x.uid,api);clear(x,'deck');s.players[1-t.p].deck.push(x);}break;}
 case'g13_Makua':choice(s,t,'マクア：効果を選ぶ',[opt('2枚をタップしてマナへ、その後1枚回収','mana',own.mana.length<7?35:10),opt('プレイヤー1人の墓地を山札の下へ','grave',s.players[1-t.p].grave.length>3?25:0),opt('相手のコスト5以下の非クリーチャー・エレメントをマナへ','element',s.players[1-t.p].battle.some(x=>!x.sealed&&card(x).type!=='creature'&&cost(card(x))<=5)?35:0)]);break;
 case'g13_Ramp':{for(let n=0;n<2&&s.winner===null;n++){const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);x.tapped=to==='mana';api.addZone(s,t.p,to,x);}api.deckCheck(s,t.p);}put(s,task('g13_ManaHand',t.p,t.source));break;}
 case'g13_ManaHand':choice(s,t,'自分のマナから1枚を手札に戻す',own.mana.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g13_GravePlayer':choice(s,t,'山札の下へ戻す墓地の持ち主を選ぶ',[0,1].map(p=>opt(p===t.p?'自分':'相手',p,s.players[p].grave.length*(p===t.p?-1:1))));break;
 case'g13_Mill':choice(s,t,'山札の上5枚を墓地に置く？',[opt('5枚を墓地へ',true,own.deck.length>7?25:-30),skip()]);break;
 case'g13_Foot':api.mill(s,t.p,1);put(s,task('g13_FootRecover',t.p,t.source));break;
 case'g13_FootRecover':choice(s,t,'墓地から闇のカード1枚を手札に戻す？',[...own.grave.filter(dark).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g13_Seal':choice(s,t,'封印する相手クリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g13_Bella':{const x=live(s,t);if(x&&api.canLeave(s,t.p,x))choice(s,t,'ベラドンナを破壊して効果を使う？',[opt('破壊して使う',true,25,t.source),skip()]);break;}
 case'g13_BellaMode':choice(s,t,'ベラドンナ：効果を選ぶ',[opt('相手の手札を見ないで1枚捨てさせる','discard',s.players[1-t.p].hand.length?15:-10),opt('山札の上1枚をマナへ','ramp',own.mana.length<6?25:5)]);break;
 case'g13_SB':{const list=sbPairs(s,t);if(list.length)choice(s,t,'S・バック：条件に合うシールドのカードを捨てて使う？',[...list,opt('S・バックを使わない',null,0)]);else if(!t.window)put(s,...(t.declared||[]).map(uid=>task('g13_SBCast',t.p,t.source,{uid})));break;}
 case'g13_SBCast':{const x=own.hand.find(x=>x.uid===t.uid);if(x&&api.canCast(s,t.p,card(x))){if(card(x).evolution)put(s,task('g32_SBBase',t.p,x.cardId,{target:x.uid}));else cast(s,t.p,x.uid,true,null,0,null,'hand','S・バック');}break;}
 default:throw Error('未実装のアビス効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g13_'))return false;const own=s.players[t.p];switch(t.op){
 case'g13_Jaga':if(v)put(s,task('discard',t.p,t.source,{n:2,causedBy:t.p}),task('g13_Mek',t.p,t.source));break;
 case'g13_MekPick':put(s,{...t,op:v?'g13_MekPick':'g13_MekUse',selected:v?[...t.selected,v]:t.selected,...(!v?{remaining:t.selected}:{})});break;
 case'g13_Use':cast(s,t.p,t.uid,true,v,t.face,null,'deck','アビス・メクレイド');break;
 case'g13_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);put(s,{...t,remaining:t.remaining.filter(uid=>uid!==v)});break;}
 case'g13_JagaRevive':if(v){(s.g13JagaUsed??={})[t.key]=s.turn;const x=own.grave.find(x=>x.uid===v);put(s,task('putCreature',t.p,t.source,{uid:v,origin:'grave'}),task('g13_JagaGrant',t.p,t.source,{target:v,targetInc:(x.incarnation||0)+1}));}break;
 case'g13_Sis':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:'-infinity',expires:'end',who:s.active});break;}
 case'g13_WMek':if(v)put(s,task('g13_Mek',t.p,t.source,{double:true}));break;
 case'g13_Lord':if(v)put(s,task('putCreature',t.p,t.source,v));break;
 case'g13_Murder':put(s,task('discardChosen',1-t.p,t.source,{uid:v,n:1,causedBy:t.p}));break;
 case'g13_Borrow':if(v){const x=s.players[1-t.p].grave.find(x=>x.uid===v);put(s,{...t,op:'g13_BorrowAbility',target:v,serial:x.zoneSerial||0});}break;
 case'g13_BorrowAbility':{put(s,{...t,op:'g13_BorrowBottom'});if(v){const entry=v.entry;log(s,t.p,'borrowEntry',card(t.source).name+'で'+card(entry.original).name+'の登場時能力を使う',{cardId:t.source});api.resolveEntry(s,entry);}break;}
 case'g13_Makua':if(v==='mana')put(s,task('g13_Ramp',t.p,t.source));else if(v==='grave')put(s,task('g13_GravePlayer',t.p,t.source));else{const list=s.players[1-t.p].battle.filter(x=>!x.sealed&&card(x).type!=='creature'&&cost(card(x))<=5);if(list.length)move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'mana',destroy:false})));}break;
 case'g13_ManaHand':{const x=policyRemove(s,t.p,'mana',v,api);if(x){clear(x,'hand');own.hand.push(x);}break;}
 case'g13_GravePlayer':{const all=policyTake(s,v,'grave',api);for(const x of all)clear(x,'deck');s.players[v].deck.push(...api.shuffled(all,Math.floor(api.random(s)*4294967296)));break;}
 case'g13_Mill':if(v)api.mill(s,t.p,5);break;
 case'g13_FootRecover':if(v){const x=policyRemove(s,t.p,'grave',v,api);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g13_Seal':if(v)api.seal(s,1-t.p,[v]);break;
 case'g13_Bella':if(v){put(s,task('g13_BellaMode',t.p,t.source));move(s,[{player:t.p,uid:t.uid,to:'grave'}]);}break;
 case'g13_BellaMode':put(s,v==='discard'?task('discard',1-t.p,t.source,{n:1,random:true,causedBy:t.p}):task('g13_BellaRamp',t.p,t.source));break;
 case'g13_SB':if(v){const x=own.hand.find(x=>x.uid===v.uid);if(t.window&&s.triggers){s.triggers.undeclared=s.triggers.undeclared.filter(uid=>uid!==v.cost);s.triggers.gsUndeclared=s.triggers.gsUndeclared.filter(uid=>uid!==v.cost);s.triggers.declared.push(v.uid);(s.triggers.sbDeclared??=[]).push(v.uid);(s.triggers.sbSerials??={})[v.uid]=x.zoneSerial||0;s.triggers.faceByUid[v.uid]=0;}put(s,{...t,costs:t.costs.filter(uid=>uid!==v.cost),declared:[...(t.declared||[]),x.uid]});api.discardSelected(s,task('discard',t.p,x.cardId,{n:1,causedBy:t.p}),[v.cost]);}else if(!t.window)put(s,...(t.declared||[]).map(uid=>task('g13_SBCast',t.p,t.source,{uid})));break;
 default:throw Error('未実装のアビス選択：'+t.op);
 }return true;}
 return {run(s,t){if(t.op==='g13_BellaRamp'){api.resolveEffect(s,t.p,{...card(t.source),effect:'ramp1'});return true;}return run(s,t);},chosen,
 effect(s,p,c,uid,entry){const op={abyssJaga:'Jaga',abyssSis:'Sis',abyssMurder:'Murder',abyssMakua:'Makua',abyssMill:'Mill',abyssMek:'Mek',abyssSeal:'Seal',abyssBella:'Bella'}[c.effect];if(!op)return false;put(s,task('g13_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 entry(s,p,x,options){if(!api.isCreature(s,x)||options.origin!=='deck')return;for(const y of creatures(s,p))if(effective(y,s).abyssJaga&&(y.uid!==x.uid||!options.selfMuted&&!api.selfStopped(s,p))){const key=y.uid+'@'+(y.incarnation||0);if(s.g13JagaUsed?.[key]!==s.turn)on(s,p,y,'g13_JagaRevive',{key,max:cost(card(x))});}},
 played(s,p,c,x,origin,permit){if(origin==='grave'&&permit==='abyssRush')grant(s,x,false);},
 discount(s,p,c){return c.type==='creature'&&c.summonOrigin==='grave'?creatures(s,p).filter(x=>effective(x,s).abyssLordGrave).length*2:0;},
 mainActions(s,p){const granted=creatures(s,p).some(x=>effective(x,s).abyssLordGrave);return s.players[p].grave.filter(x=>card(x).type==='creature'&&(card(x).abyssRush||granted&&abyss(card(x)))&&api.canCast(s,p,card(x))&&api.canEnter(s,p,card(x),{origin:'grave',execution:true})&&api.canPay(s,p,{...card(x),summonOrigin:'grave'})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length)).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'grave',manaPermit:'abyssRush',cost:api.summonCost(s,p,{...card(x),summonOrigin:'grave'}),label:'墓地の'+card(x).name+'をアビスラッシュで召喚'}));},
 playerPermission(s,x){return !x.sealed&&api.allLayers(x).some(y=>y.g13Rush?.some(r=>r.turn===s.turn));},
 attack(s,p,x){for(const y of api.allLayers(x))for(const r of y.g13Rush||[])if(r.turn===s.turn)r.attacked=true;if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.abyssWMek)on(s,p,x,'g13_WMek');if(c.abyssMurder&&darkCount(s,p)>=3)on(s,p,x,'g13_Borrow',{lastKnownPower:api.power(x,false,s)});},
 attackFilter(s,p,actions){const first=s.g23Attacks?.[p]?.turn!==s.turn||!s.g23Attacks[p].count;const forced=creatures(s,1-p).filter(x=>effective(x,s).bairas||first&&effective(x,s).abyssLord).map(x=>x.uid);if(!forced.length)return actions;return actions.filter(a=>a.kind!=='attack'||!actions.some(b=>b.kind==='attack'&&b.uid===a.uid&&forced.includes(b.target))||forced.includes(a.target));},
 discarded(s,p){for(const y of creatures(s,1-p))if(effective(y,s).abyssTeresco)on(s,1-p,y,'optionalDrawOne');},
 start(s,p){return creatures(s,1-p).filter(x=>effective(x,s).abyssTeresco).map(x=>({player:1-p,uid:x.uid,source:x.cardId,effect:'extended',task:task('discard',p,x.cardId,{n:1,causedBy:1-p,random:true})}));},
 end(s){const out=[];for(const p of[0,1])for(const x of s.players[p].battle){for(const y of api.allLayers(x))if(y.g13Rush?.some(r=>r.turn===s.turn&&(!r.conditional||r.attacked)))out.push({player:p,uid:y.uid,source:y.cardId,effect:'extended',task:task('g13_Return',p,y.cardId,{uid:y.uid,incarnation:y.incarnation||0})});if(p===s.active&&!x.sealed){if(effective(x,s).abyssLord)out.push({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g13_Lord',p,x.cardId)});if(effective(x,s).abyssFoot)out.push({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g13_Foot',p,x.cardId)});}}return out;},
 hasSB(s,p,all){return sbPairs(s,{p,costs:all.map(x=>x.uid)}).length>0;},
 beginSB(s,p,all,window=false){if(this.hasSB(s,p,all))put(s,task('g13_SB',p,all[0].cardId,{costs:all.map(x=>x.uid),declared:[],window}));},
 };
}
