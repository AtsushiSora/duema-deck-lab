import {policyRemove} from './champion-zone-policy.js';
// No.01: entry-trigger copies retain their own controller and reference creature.
export function createMaruruRules(api){
 const {card,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move}=api;
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canPut=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const bounceRows=(s,selected)=>selected.flatMap(uid=>{const player=s.players.findIndex(p=>p.battle.some(x=>x.uid===uid));return player<0?[]:[{player,uid,to:'hand'}];});
 function run(s,t){if(!t.op.startsWith('g1_'))return false;const own=s.players[t.p];switch(t.op){
 case'g1_Look':{const x=own.deck[0];if(x)choice(s,t,'マルル：山札の上のカードをどちらへ？',[opt('手札に加える','hand',own.mana.length>=8?20:8,api.deckLocked(s,t.p)?null:x.cardId),opt('タップしてマナへ置く','mana',own.mana.length<8?20:5,api.deckLocked(s,t.p)?null:x.cardId)]);break;}
 case'g1_Orugate':choice(s,t,'オルゲイト：相手1体を手札に戻す？',[...api.targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
 case'g1_Kiinary':choice(s,t,'キーナリー：相手のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g1_KiinaryBounce':choice(s,t,'選んだクリーチャーを手札に戻す？',[opt('手札に戻す',true,20,t.targetCard),skip()]);break;
 case'g1_KiinaryRevive':choice(s,t,'墓地からコスト'+t.max+'以下を1体出す',own.grave.filter(x=>canPut(s,t.p,x,'grave')&&cost(card(x))<=t.max).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)));break;
 case'g1_WatchBounce':{const selected=t.selected||[],list=api.targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)].filter(x=>!selected.includes(x.uid))).map(x=>({...x,score:own.battle.some(y=>y.uid===x.value)?-10:x.score}));if(selected.length===2||!list.length){const rows=bounceRows(s,selected);if(rows.length)move(s,rows);break;}choice(s,{...t,selected},'ジ・ウォッチ：手札に戻すクリーチャーを2体まで選ぶ（'+selected.length+'/2）',[...list,opt('ここまでで確定',null,0)]);break;}
 case'g1_Skip':choice(s,t,'ジ・ウォッチ：今のターンの残りを飛ばす？',[opt('ターンの残りを飛ばす',true,t.p!==s.active?50:-10),skip()]);break;
 case'g1_Bunker':{const x=api.takeTop(s,t.p);if(x){const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);api.addZone(s,own,to,x);api.log(s,t.p,'ramp','ジゴクバンカーで山札の上1枚を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:t.source});api.deckCheck(s,t.p);}put(s,task('g1_ManaHand',t.p,t.source));break;}
 case'g1_ManaHand':choice(s,t,'マナからカード1枚を手札に戻す？',[...own.mana.map(x=>opt(card(x).name,x.uid,own.mana.length>7?cost(card(x)):cost(card(x))-12,x.cardId)),skip()]);break;
 case'g1_Sky':choice(s,t,'スカイソード：相手1体をマナへ置く？',[...api.targetOptions(s,t.p,creatures(s,1-t.p)),skip()]);break;
 case'g1_SkyDeploy':choice(s,t,'自分のマナ枚数よりコストが小さいクリーチャーを出す？',[...own.mana.filter(x=>canPut(s,t.p,x,'mana')&&cost(card(x))<own.mana.length).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g1_Copy':choice(s,t,'オルゲイト：'+card(t.original.source).name+'の登場時能力を使う？',[opt('この能力を使う',true,20,t.original.source),skip()]);break;
 default:throw Error('未実装のマルル効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g1_'))return false;const own=s.players[t.p];switch(t.op){
 case'g1_Look':{const x=api.takeTop(s,t.p);if(x){const to=v==='mana'&&api.deckRedirect(s,t.p)?'grave':v;clear(x,to);if(to==='mana')x.tapped=true;api.addZone(s,own,to,x);api.log(s,t.p,'maruruLook','マルルで山札の上1枚を'+(to==='hand'?'手札':to==='mana'?'タップしてマナ':'墓地')+'へ',{cardId:t.source,...(to==='hand'?{privateFor:t.p}:{})});api.deckCheck(s,t.p);}break;}
 case'g1_Orugate':if(v)move(s,[{player:1-t.p,uid:v,to:'hand'}]);break;
 case'g1_Kiinary':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)put(s,{...t,op:'g1_KiinaryBounce',target:v,targetCard:x.cardId,max:cost(card(x))});break;}
 case'g1_KiinaryBounce':put(s,{...t,op:'g1_KiinaryRevive'});if(v)move(s,[{player:1-t.p,uid:t.target,to:'hand'}]);break;
 case'g1_KiinaryRevive':put(s,task('putCreature',t.p,t.source,{origin:'grave',uid:v}));break;
 case'g1_WatchBounce':if(v)put(s,{...t,selected:[...t.selected,v]});else{const rows=bounceRows(s,t.selected);if(rows.length)move(s,rows);}break;
 case'g1_Skip':if(v)api.skipTurn(s,t.p,t.source);break;
 case'g1_ManaHand':if(v){const x=policyRemove(s,t.p,'mana',v,api);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g1_Sky':put(s,{...t,op:'g1_SkyDeploy'});if(v)move(s,[{player:1-t.p,uid:v,to:'mana'}]);break;
 case'g1_SkyDeploy':if(v)put(s,task('putCreature',t.p,t.source,{origin:'mana',uid:v}));break;
 case'g1_Copy':if(v){const e=structuredClone(t.original),source=api.copySource(e.source,t.source);e.player=t.p;e.uid=t.uid;e.incarnation=t.incarnation;e.source=source;e.lastKnownPower=t.lastKnownPower;const copyKey='copy:'+t.uid+':'+(s.copySerial=(s.copySerial||0)+1);if(e.key)e.key=copyKey;if(e.task){const old=e.task;e.task={...old,p:old.p===t.original.player?t.p:1-t.p,source,uid:t.uid,incarnation:t.incarnation};for(const field of ['causedBy','controller','player','owner','who'])if(old[field]===0||old[field]===1)e.task[field]=1-old[field];if(old.key)e.task.key=copyKey;if(old.op==='g19Yobi')e.task.max=cost(card(t.source));}api.log(s,t.p,'copyEntry','オルゲイトで'+card(t.original.source).name+'の能力を使う',{cardId:t.source});api.resolveEntry(s,e);}break;
 default:throw Error('未実装のマルル選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){const op={maruruOrugate:'Orugate',maruruKiinary:'Kiinary',maruruWatch:'WatchBounce',maruruBunker:'Bunker',maruruSky:'Sky'}[c.effect];if(!op)return false;put(s,task('g1_'+op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 entry(s,p,x){if(!api.isCreature(s,x))return;for(const y of creatures(s,p))if(effective(y,s).secondEntryLook&&s.players[p].enteredThisTurn===2)on(s,p,y,'g1_Look');for(const y of creatures(s,1-p))if(effective(y,s).watch)on(s,1-p,y,'g1_Skip');},
 spellCast(s,p){for(const y of creatures(s,1-p))if(effective(y,s).watch)on(s,1-p,y,'g1_Skip');},
 attack(s,p,x){if(effective(x,s).watch&&!api.selfStopped(s,p))on(s,p,x,'g1_WatchBounce');},
 copyEntry(s,p,x,e){if(s.active!==p)return;for(const y of creatures(s,1-p))if(effective(y,s).entryCopy)on(s,1-p,y,'g1_Copy',{original:{...structuredClone(e),player:p},lastKnownPower:api.power(y,false,s)});},
 };
}
