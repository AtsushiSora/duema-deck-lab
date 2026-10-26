import {createChampionRaid} from './champion-raid-helpers.js';
// Cyber champion decks: choices retain physical identity, including cards below an evolution.
export function createChampionCyberRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip}=api;
 const raid=createChampionRaid(api,'g48_'),cyber=c=>String(c.race).includes('サイバー'),live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const send=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g48_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g48_'+op,...more});
 const canMove=(s,p,z)=>!api.canMoveZone||api.canMoveZone(s,p,z);
 const handBases=(s,p,uid)=>s.players[p].hand.filter(x=>x.uid!==uid&&card(x).type==='creature');
 const sourceSoul=(s,x,kind)=>api.ignored(s,x)?[]:api.layers(x).slice(1).filter(y=>card(y).g48Soul===kind);
 const bounce=(s,t)=>{const rows=[0,1].flatMap(p=>creatures(s,p).map(x=>({p,x}))),options=rows.flatMap(({p,x})=>api.targetOptions(s,t.p,[x]).map(o=>({...o,value:{p,uid:x.uid},score:p===t.p?-cost(card(x)):20+cost(card(x))})));choice(s,t,'手札に戻すクリーチャーを選ぶ',[...options,skip()]);};
 function run(s,t){if(raid.run(s,t))return true;if(!t.op.startsWith('g48_'))return false;const own=s.players[t.p];switch(t.op){
 case'g48_Flower':choice(s,t,'フラワー・ハート：カードを1枚引く？',[opt('1枚引く',true,10),skip()]);break;
 case'g48_Loot':choice(s,t,'超魂X：1枚引いてから1枚捨てる？',[opt('1枚引いて1枚捨てる',true,10),skip()]);break;
 case'g48_Astral':{api.draw(s,t.p,3);const x=live(s,t);if(!t.fromCyber)queue(s,t,'TopHand',{n:3,selected:[]});break;}
 case'g48_TopHand':{const selected=t.selected||[],n=Math.min(t.n,own.hand.length);if(selected.length>=n){const rows=selected.map(uid=>api.remove(own.hand,uid)).filter(Boolean);for(const x of rows)api.clear(x,'deck');own.deck.unshift(...rows);break;}choice(s,{...t,selected},'山札の上に戻す手札を順に選ぶ（'+selected.length+'/'+n+'）',own.hand.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
 case'g48_Emeral':choice(s,t,'エメラル：手札1枚をシールドに加える？',[...own.hand.filter(()=>api.canAddShield(s,t.p)).map(x=>opt(card(x).name,x.uid,10-cost(card(x)),x.cardId)),skip()]);break;
 case'g48_EmeralTake':choice(s,t,'エメラル：シールドを1つ手札へ（S・トリガー不可）',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)));break;
 case'g48_Max':choice(s,t,'マクスハト：自分の他のエレメントを手札に戻す？',[...api.targetOptions(s,t.p,own.battle.filter(x=>x.uid!==t.uid)),skip()]);break;
 case'g48_MaxRaid':if(!own.battle.some(x=>x.uid===t.target))queue(s,t,'Raid',{race:'サイバー',max:5});break;
 case'g48_Shutra':put(s,...[s.active,1-s.active].map(p=>task('g48_ManaHand',p,t.source,{controller:t.p})));break;
 case'g48_ManaHand':if(canMove(s,t.p,'mana'))choice(s,t,'シュトラ：自分のマナを1枚手札に戻す',own.mana.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g48_Pakrio':choice(s,t,'パクリオ：相手の手札からシールドにするカードを選ぶ',[...s.players[1-t.p].hand.filter(()=>api.canAddShield(s,1-t.p)).map(x=>opt(card(x).name,x.uid,cost(card(x))*3,x.cardId)),skip()]);break;
 case'g48_Mimi':{const x=live(s,t);queue(s,t,'Raid',{race:'サイバー',max:t.evolved?8:5});break;}
 case'g48_Bounce':bounce(s,t);break;
 case'g48_Chaos':{const x=live(s,t),max=x?cost(effective(x,s)):t.lastCost==='∞'?Infinity:t.lastCost||0;put(s,task('g34_Select',t.p,t.source,{origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,...(max===Infinity?{}:{max})},title:'超魂X：攻撃クリーチャー以下のコストの手札を出す'}));break;}
 case'g48_Mercury':{const x=live(s,t),rows=x?api.layers(x).slice(1):[];choice(s,t,'マーキュリー：進化元を1枚墓地に置く？',[...rows.map(y=>opt(card(y).name,y.uid,20,y.cardId)),skip()]);break;}
 case'g48_MercuryBounce':{const selected=t.selected||[],rows=s.players[1-t.p].battle.filter(x=>!selected.includes(x.uid));if(selected.length>=2||!rows.length){if(selected.length)api.move(s,selected.map(uid=>({player:1-t.p,uid,to:'hand',destroy:false})));break;}choice(s,{...t,selected},'マーキュリー：相手のエレメントを2つまで戻す（'+selected.length+'/2）',[...api.targetOptions(s,t.p,rows),opt('ここまでで確定',null,0)]);break;}
 case'g48_World':for(const p of[s.active,1-s.active]){const other=s.players[p],rows=[...other.hand.splice(0),...(canMove(s,p,'grave')?other.grave.splice(0):[])];for(const x of rows)api.clear(x,'deck');api.shuffleLibrary(s,p,rows,t.source);}put(s,...[s.active,1-s.active].map(p=>task('draw',p,t.source,{n:5})));break;
 case'g48_HandBases':{const selected=t.selected||[],rows=handBases(s,t.p,t.target).filter(x=>!selected.includes(x.uid));if(selected.length===3){if(t.args){const args=[...t.args];args[2]=selected;api.cast(s,t.p,...args);}else api.enter(s,t.p,t.inst,selected,t.entryOptions);break;}if(rows.length<3-selected.length)break;choice(s,{...t,selected},'手札進化GV：重ねるクリーチャーを3枚選ぶ（'+selected.length+'/3）',rows.map(x=>opt(card(x).name,x.uid,20-cost(card(x)),x.cardId)));break;}
 default:throw Error('未実装のサイバー効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(raid.chosen(s,t,v))return true;if(!t.op.startsWith('g48_'))return false;const own=s.players[t.p];switch(t.op){
 case'g48_Flower':if(v)api.draw(s,t.p,1);break;
 case'g48_Loot':if(v){api.draw(s,t.p,1);put(s,task('discard',t.p,t.source,{n:1,causedBy:t.p}));}break;
 case'g48_TopHand':queue(s,t,'TopHand',{selected:[...t.selected,v]});break;
 case'g48_Emeral':if(v){const x=api.remove(own.hand,v);if(x){api.clear(x,'shields');api.addZone(s,t.p,'shields',x);api.notifyShieldAdded(s,t.p,x);queue(s,t,'EmeralTake');}}break;
 case'g48_EmeralTake':if(v)api.moveShield(s,t.p,v,'hand');break;
 case'g48_Max':if(v){queue(s,t,'MaxRaid',{target:v});api.move(s,[{player:t.p,uid:v,to:'hand',destroy:false}]);}break;
 case'g48_ManaHand':if(canMove(s,t.p,'mana')){const x=api.remove(own.mana,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 case'g48_Pakrio':if(v){const x=api.remove(s.players[1-t.p].hand,v);if(x){api.clear(x,'shields');api.addZone(s,1-t.p,'shields',x);api.notifyShieldAdded(s,1-t.p,x);}}break;
 case'g48_Bounce':if(v)api.move(s,[{player:v.p,uid:v.uid,to:'hand',destroy:false}]);break;
 case'g48_Mercury':if(v){const x=live(s,t);if(x&&api.layers(x).slice(1).some(y=>y.uid===v)){api.moveBattleCard(s,t.p,v,'grave');put(s,task('g34_Draw',t.p,t.source,{n:2,optional:true}),{...t,op:'g48_MercuryBounce',selected:[]});}}break;
 case'g48_MercuryBounce':if(v)queue(s,t,'MercuryBounce',{selected:[...t.selected,v]});else if(t.selected.length)api.move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'hand',destroy:false})));break;
 case'g48_HandBases':queue(s,t,'HandBases',{selected:[...t.selected,v]});break;
 default:throw Error('未実装のサイバー選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){if(!c.g48Effect)return false;put(s,task('g48_'+c.g48Effect,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0,...s.g48EntryInfo?.[uid+'@'+(entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0)]}));return true;},
 attack(s,p,x){if(api.selfStopped(s,p)||api.ignored(s,x))return;for(const y of sourceSoul(s,x,'flower'))send(s,p,x,'Loot',{soul:y.cardId});for(const y of sourceSoul(s,x,'chaos'))send(s,p,x,'Chaos',{soul:y.cardId,lastCost:cost(effective(x,s))===Infinity?'∞':cost(effective(x,s))});if(card(x).g48Mercury)send(s,p,x,'Mercury');},
 entry(s,p,x){if(card(x).g48Effect)(s.g48EntryInfo??={})[x.uid+'@'+(x.incarnation||0)]={fromCyber:api.layers(x).slice(1).some(y=>faces(card(y)).some(cyber)),evolved:api.isEvolution(x)};if(!api.isCreature(s,x)||!cyber(card(x)))return;for(const y of creatures(s,p)){if(y.uid===x.uid||!card(y).g48Mimi||api.ignored(s,y)||api.selfStopped(s,p))continue;const k=y.uid+'@'+(y.incarnation||0);if(s.g48MimiUsed?.[k]===s.turn)continue;(s.g48MimiUsed??={})[k]=s.turn;send(s,p,y,'Bounce');}},
 recordBattleCards(s,p,rows){for(const x of rows)if(card(x).g48Grave)(s.g48FromBattle??={})[p+':'+x.uid]={serial:x.zoneSerial||0,enabled:!api.ignored(s,x)};},
 graveAdded(s,p,rows){for(const x of rows){const k=p+':'+x.uid,before=s.g48FromBattle?.[k];if(!before)continue;delete s.g48FromBattle[k];if(!before.enabled||(x.zoneSerial||0)!==before.serial+1)continue;if(card(x).g48Grave==='Flower')send(s,p,x,'Flower');else if(card(x).g48Grave==='Idol')send(s,p,x,'Raid',{race:'サイバー',max:8});}},
 allowedCast(s,p,c,origin){return !c.g48HandEvolution||handBases(s,p,c.id).length-((origin==='hand'||origin==null)&&s.players[p].hand.some(x=>x.cardId===c.id)?1:0)>=3;},
 beforeCast(s,p,args){const [uid,,bases,face=0,,origin='hand']=args,x=s.players[p][origin]?.find(x=>x.uid===uid),c=x&&faces(card(x))[face];if(!c?.g48HandEvolution||Array.isArray(bases))return false;if(handBases(s,p,uid).length<3)throw Error('手札進化GVの進化元が3枚必要です');put(s,task('g48_HandBases',p,c.id,{target:uid,args,selected:[]}));return true;},
 beforeEnter(s,p,inst,bases,entryOptions){if(!card(inst).g48HandEvolution||Array.isArray(bases))return false;if(handBases(s,p,inst.uid).length<3)throw Error('手札進化GVの進化元が3枚必要です');put(s,task('g48_HandBases',p,inst.cardId,{target:inst.uid,inst,entryOptions,selected:[]}));return true;},
 attachHandEvolution(s,p,inst,bases){if(!Array.isArray(bases)||bases.length!==3||new Set(bases).size!==3||!bases.every(uid=>handBases(s,p,inst.uid).some(x=>x.uid===uid)))throw Error('手札進化GVの進化元が正しくありません');inst.under=bases.map(uid=>{const x=api.remove(s.players[p].hand,uid);api.clear(x,'battle');return x;});},
 mainActions(s,p){const out=[],own=s.players[p];for(const x of own.hand){const c=card(x);if(c.g48Aroma&&[0,1].some(p=>creatures(s,p).some(y=>/サイバー・?ロード/.test(effective(y,s).race)))&&api.canCast(s,p,c,'hand')&&api.canEnter(s,p,c,{origin:'hand',execution:true}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,cost:0,freeSummon:'G・ゼロ',label:c.name+'をG・ゼロで召喚'});if(c.g48Mercury&&(own.mana.filter(y=>faces(card(y)).some(c=>/サイバー|フェニックス/.test(c.race))).length+own.battle.filter(y=>/サイバー|フェニックス/.test(effective(y,s).race)).length)>=5&&api.canCast(s,p,c,'hand')&&api.canEnter(s,p,c,{origin:'hand',execution:true})&&api.canPay(s,p,{...c,cost:3,civilizations:['水','水'],fixedPayment:true}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,cost:3,alternative:'g48Mercury',label:c.name+'を水2/3マナで召喚'});}return out;},
 alternative(s,p,a){api.cast(s,p,a.uid,false,null,0,{cost:3,civilizations:['水','水'],fixedPayment:true},'hand');}
 };
}
