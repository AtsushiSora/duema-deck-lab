import {createChampionRaid} from './champion-raid-helpers.js';
// Fire-Bird champions and VS Jaouga: entry, destruction replacements, and extra turns.
export function createChampionFirebirdRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip}=api;
 const raid=createChampionRaid(api,'g49_'),bird=c=>String(c.race).includes('ファイアー・バード'),armored=c=>String(c.race).includes('アーマード'),darkFire=c=>colors(c).some(c=>['闇','火'].includes(c)),key=x=>x.uid+'@'+(x.incarnation||0);
 const live=(s,t)=>s.players[t.p].battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===(t.incarnation||0));
 const active=(s,p,k)=>s.players[p].battle.filter(x=>card(x)[k]&&!api.ignored(s,x));
 const send=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g49_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g49_'+op,...more});
 const canMove=(s,p,z)=>!api.canMoveZone||api.canMoveZone(s,p,z);
 const canPut=(s,p,x,origin)=>canMove(s,p,origin)&&['creature','seed','field','gear'].includes(card(x).type)&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const deploy=(s,t,origin,filter,title,more={})=>{const own=s.players[t.p],rows=own[origin].filter(x=>filter(card(x))&&canPut(s,t.p,x,origin));choice(s,{...t,op:'g49_Deploy',origin,...more},title,[...rows.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);};
 function discardChoice(s,t,op,owner=t.p){choice(s,{...t,op:'g49_'+op,owner},owner===t.p?'捨てる手札を1枚選ぶ':'相手の手札から捨てさせるカードを1枚選ぶ',s.players[owner].hand.map(x=>opt(card(x).name,x.uid,owner===t.p?-cost(card(x)):cost(card(x))*3,x.cardId)));}
 function doDiscard(s,t,uid,after){const owner=t.owner??t.p,x=s.players[owner].hand.find(x=>x.uid===uid);if(!x)return;put(s,{...t,op:'g49_'+after,discardedBird:bird(card(x)),discardedCosts:[...new Set(faces(card(x)).map(c=>cost(c)===Infinity?'∞':cost(c)))]});api.discardSelected(s,{p:owner,source:t.source,n:1,causedBy:t.p,controller:t.p},[uid]);}
 function run(s,t){if(raid.run(s,t))return true;if(!t.op.startsWith('g49_'))return false;const own=s.players[t.p];switch(t.op){
 case'g49_Yatto':put(s,task('g40_ShieldOne',t.p,t.source));break;
 case'g49_Cycle':api.mill(s,t.p,1);put(s,task('g40_ShieldOne',t.p,t.source));break;
 case'g49_Natheha':if(own.shields.length)choice(s,t,'ルピア&ガ:ナテハ：墓地に置くシールドを選ぶ',own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,5)));else api.draw(s,t.p,1);break;
 case'g49_Jaou':choice(s,t,'VSジャオウガ：シールド1つを手札へ（S・トリガー不可）',[...own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)),skip()]);break;
 case'g49_JaouReturn':choice(s,t,'鬼エンド：墓地から闇か火のカードを戻す？',[...own.grave.filter(x=>canMove(s,t.p,'grave')&&faces(card(x)).some(darkFire)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g49_JaouPut':deploy(s,t,'hand',c=>c.type==='creature'&&darkFire(c)&&cost(c)<=4,'鬼エンド：手札のコスト4以下の闇か火を出す？');break;
 case'g49_Kent':{const selected=t.selected||[],n=Math.min(4,own.mana.length),rows=own.mana.filter(x=>!selected.includes(x.uid));if(selected.length===n){for(const uid of selected){const x=own.mana.find(x=>x.uid===uid);if(x&&api.canUntap(x))x.tapped=false;}break;}choice(s,{...t,selected},'ケントナーク：アンタップするマナを4枚選ぶ（'+selected.length+'/'+n+'）',rows.map(x=>opt(card(x).name+(x.tapped?'（タップ）':'（アンタップ）'),x.uid,x.tapped?10:0,x.cardId)));break;}
 case'g49_Magician':if(own.hand.length)discardChoice(s,t,'MagicianDiscard');else api.draw(s,t.p,1);break;
 case'g49_MagicianDraw':api.draw(s,t.p,t.discardedBird?2:1);break;
 case'g49_Incoppi':if(own.battle.some(x=>x.uid!==t.uid&&armored(effective(x,s))))api.draw(s,t.p,1);break;
 case'g49_Humpty':discardChoice(s,t,'HumptyDiscard',1-t.p);break;
 case'g49_HumptyCost':if(t.discardedCosts.length>1)choice(s,{...t,p:t.owner,actor:t.p},'捨てたツインパクトの持ち主：参照するコストを選ぶ',t.discardedCosts.map(n=>opt('コスト'+n,n,0)));else queue(s,t,'HumptyDestroy',{discardedCost:t.discardedCosts[0]});break;
 case'g49_HumptyDestroy':{const n=t.discardedCost==='∞'?Infinity:t.discardedCost;choice(s,t,'ハンプティ：捨てたカードと同じコストのクリーチャーを破壊',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(effective(x,s))===n)));break;}
 case'g49_Queen':choice(s,t,'クイーン・ルピア：ファイアー・バードを1つ破壊する？',[...own.battle.filter(x=>bird(effective(x,s))).map(x=>opt(card(x).name,x.uid,25-cost(card(x)),x.cardId)),skip()]);break;
 case'g49_BalpiaPut':deploy(s,t,'hand',bird,'バルピアレスク：手札のファイアー・バードを出す？');break;
 case'g49_BalpiaEnd':{const selected=t.selected||[],rows=own.battle.filter(x=>bird(effective(x,s))),n=5;if(selected.length===n){put(s,task('g5ExtraTurn',t.p,t.source));api.move(s,selected.map(uid=>({player:t.p,uid,to:'grave',destroy:true})));break;}if(rows.length<n)break;choice(s,{...t,selected},'バルピアレスク：破壊するファイアー・バードを5つ選ぶ（'+selected.length+'/5）',[...rows.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,35-cost(card(x)),x.cardId)),skip()]);break;}
 case'g49_March':deploy(s,t,'grave',c=>c.type==='creature'&&bird(c)&&cost(c)<t.below,'マーチ・ルピア：破壊されたものより低コストを墓地から出す？');break;
 case'g49_Molnarlk':if(canMove(s,t.p,'grave'))for(const x of own.grave.filter(x=>faces(card(x)).some(bird))){api.remove(own.grave,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}break;
 case'g49_Alice':{const n=api.lookCount?api.lookCount(s,t.p,3):api.deckLocked(s,t.p)?0:3,held=new Set(own.g34Protected||[]),ids=own.deck.filter(x=>!held.has(x.uid)).slice(0,n).map(x=>x.uid);(own.g34Protected??=[]).push(...ids);api.log(s,t.p,'reveal','アリス・ルピア：'+ids.map(uid=>card(own.deck.find(x=>x.uid===uid)).name).join('・'),{cardId:t.source});queue(s,t,'AlicePick',{ids,selected:[]});break;}
 case'g49_AlicePick':{const rows=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean),selected=t.selected||[],opts=rows.filter(x=>!selected.includes(x.uid)&&card(x).type==='creature'&&bird(card(x))&&card(x).name!=='アリス・ルピア'&&canPut(s,t.p,x,'deck'));choice(s,{...t,selected},'アリス・ルピア：出すファイアー・バードを好きな数選ぶ',[...opts.map(x=>opt(card(x).name,x.uid,25+cost(card(x)),x.cardId)),opt('ここまでで確定',null,0)]);break;}
 case'g49_Interview':discardChoice(s,t,'InterviewDiscard');break;
 case'g49_InterviewCosts':if(t.discardedCosts.length>1)choice(s,t,'捨てたツインパクトのどちらのコストを使う？',t.discardedCosts.map(n=>opt('コスト'+n,n,n==='∞'?1000:n)));else queue(s,t,'InterviewTargets',{budget:t.discardedCosts[0],selected:[],spent:0});break;
 case'g49_InterviewTargets':{const max=t.budget==='∞'?Infinity:t.budget,selected=t.selected||[],rows=creatures(s,1-t.p).filter(x=>!selected.includes(x.uid)&&cost(effective(x,s))<=max-(t.spent||0));if(selected.length>=2||!rows.length){queue(s,t,'InterviewRevive');if(selected.length)api.move(s,selected.map(uid=>({player:1-t.p,uid,to:'grave',destroy:true})));break;}choice(s,{...t,selected},'合計コスト'+t.budget+'以下のクリーチャーを2体まで破壊',[...api.targetOptions(s,t.p,rows),opt('ここまでで確定',null,0)]);break;}
 case'g49_InterviewRevive':if(t.discardedBird)deploy(s,t,'grave',c=>c.type==='creature'&&cost(c)<=5,'インタビュー：コスト5以下のクリーチャーを墓地から出す？');break;
 case'g49_HatterDestroy':{const x=s.players[t.owner].battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetIncarnation);if(x)api.move(s,[{player:t.owner,uid:x.uid,to:'grave',destroy:true}]);break;}
 case'g49_Draw':choice(s,t,'熱き邪道 レッドゾーンZ：カードを1枚引く？',[opt('1枚引く',true,10),skip()]);break;
 default:throw Error('未実装のファイアー・バード効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(raid.chosen(s,t,v))return true;if(!t.op.startsWith('g49_'))return false;const own=s.players[t.p];switch(t.op){
 case'g49_Natheha':api.moveShield(s,t.p,v,'grave');api.draw(s,t.p,1);break;
 case'g49_Jaou':if(v)api.moveShield(s,t.p,v,'hand');break;
 case'g49_JaouReturn':if(v&&canMove(s,t.p,'grave')){const x=api.remove(own.grave,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}queue(s,t,'JaouPut');break;
 case'g49_Kent':queue(s,t,'Kent',{selected:[...t.selected,v]});break;
 case'g49_MagicianDiscard':doDiscard(s,t,v,'MagicianDraw');break;
 case'g49_HumptyDiscard':doDiscard(s,t,v,'HumptyCost');break;
 case'g49_HumptyCost':queue(s,{...t,p:t.actor},'HumptyDestroy',{discardedCost:v});break;
 case'g49_HumptyDestroy':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true}]);break;
 case'g49_Queen':if(v&&own.battle.some(x=>x.uid===v)){queue(s,t,'Raid',{race:'ファイアー・バード',max:8});api.move(s,[{player:t.p,uid:v,to:'grave',destroy:true}]);}break;
 case'g49_BalpiaEnd':if(v)queue(s,t,'BalpiaEnd',{selected:[...t.selected,v]});break;
 case'g49_Deploy':if(v)put(s,task('g34_Put',t.p,t.source,{origin:t.origin,target:v,execution:false,...(t.delayed?{delayed:'grave',grant:{speedAttacker:true}}:{})}));break;
 case'g49_AlicePick':if(v)queue(s,t,'AlicePick',{selected:[...t.selected,v]});else{if(t.selected.length>1)s.g34DeployBatch=true;put(s,...t.selected.map(uid=>task('g34_Put',t.p,t.source,{origin:'deck',target:uid,execution:false,delayed:'grave',grant:{speedAttacker:true}})),task('g34_Order',t.p,t.source,{ids:t.ids.filter(uid=>!t.selected.includes(uid)),rest:'grave',ordered:[]}),task('g34_Custom',t.p,t.source,{name:'finishBatch'}));}break;
 case'g49_InterviewDiscard':doDiscard(s,t,v,'InterviewCosts');break;
 case'g49_InterviewCosts':queue(s,t,'InterviewTargets',{budget:v,selected:[],spent:0});break;
 case'g49_InterviewTargets':if(v){const x=s.players[1-t.p].battle.find(x=>x.uid===v);queue(s,t,'InterviewTargets',{selected:[...t.selected,v],spent:(t.spent||0)+(x?cost(effective(x,s)):0)});}else{queue(s,t,'InterviewRevive');if(t.selected.length)api.move(s,t.selected.map(uid=>({player:1-t.p,uid,to:'grave',destroy:true})));}break;
 case'g49_Draw':if(v)api.draw(s,t.p,1);break;
 default:throw Error('未実装のファイアー・バード選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid,entry){if(!c.g49Effect)return false;put(s,task('g49_'+c.g49Effect,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0,selected:[]}));return true;},
 start(s,p){return creatures(s,p).filter(x=>card(x).g49Start&&!api.ignored(s,x)).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g49_'+card(x).g49Start,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 end(s){const p=s.active;return creatures(s,p).filter(x=>card(x).g49End&&!api.ignored(s,x)).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g49_'+card(x).g49End,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 attack(s,p,x){if(api.selfStopped(s,p)||api.ignored(s,x))return;const c=effective(x,s);if(c.g49Jaou&&s.players.some(p=>!p.shields.length))send(s,p,x,'JaouReturn');if(c.g49Queen)send(s,p,x,'Queen');if(c.g49Balpia)send(s,p,x,'BalpiaPut');if(c.g49Hatter&&x.hyperActive)send(s,p,x,'Raid',{race:'ファイアー・バード',max:5});},
 attackEnd(s,a,x){if(x&&card(x).g49Balpia&&!api.ignored(s,x))send(s,a.player,x,'BalpiaEnd',{selected:[]});},
 entry(s,p,x){if(!api.isCreature(s,x))return;for(const y of active(s,1-p,'g49Hatter'))if(cost(effective(x,s))>s.players[p].mana.length&&!api.selfStopped(s,1-p))send(s,1-p,y,'HatterDestroy',{owner:p,target:x.uid,targetIncarnation:x.incarnation||0});},
 shieldLeft(s,p,x,group){if(group===null)return;for(const y of active(s,1-p,'g49Red'))send(s,1-p,y,'Draw');},
 discount(s,p,c){return armored(c)?active(s,p,'g49Incoppi').length:0;},
 decorate(s,p,x,c){if(c.g49Hatter&&x.hyperActive)c={...c,speedAttacker:true};if(c.type==='creature'&&darkFire(c)&&s.players.reduce((n,p)=>n+p.shields.length,0)<=6&&active(s,p,'g49Jaou').length)return {...c,speedAttacker:true,slayer:true};return c;},
 battleSafe(s,x){return !!(card(x).g49Balpia&&!api.ignored(s,x));},
 triggerAllowed(s,p,c){return !c||!colors(c).includes('光')||![0,1].some(p=>active(s,p,'g49Giga').length);},
 beforeEnter(s,p,inst,baseUid,options={}){if(options.replacement||card(inst).type!=='creature'||s.active===p)return false;const q=1-p,source=active(s,q,'g49Red').find(x=>creatures(s,q).some(y=>y.uid!==x.uid&&colors(effective(y,s)).includes('火')&&String(effective(y,s).race).includes('コマンド')));if(!source)return false;if(options.origin==='grave'){const serial=inst.zoneSerial,tapped=inst.tapped;api.clear(inst,'grave');if(serial===undefined)delete inst.zoneSerial;else inst.zoneSerial=serial;inst.tapped=tapped;s.players[p].grave.push(inst);}else{api.clear(inst,'grave');api.addZone(s,p,'grave',inst);}api.log(s,q,'entryReplace','熱き邪道 レッドゾーンZ：'+card(inst).name+'を出すかわりに墓地へ',{cardId:source.cardId});return true;},
 snapshot(s){return [0,1].map(p=>active(s,p,'g49March').map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0})));},
 leaving(s,p,x,snapshot,to,destroy){if(to!=='grave'||!destroy||!api.isCreature(s,x)||!bird(effective(x,s)))return;for(const y of snapshot?.[p]||active(s,p,'g49March'))api.enqueue(s,p,{uid:y.uid,source:y.cardId,effect:'extended',task:task('g49_March',p,y.cardId,{below:cost(effective(x,s))})});},
 leaveOptions(s,row,batch){const own=s.players[row.player],x=own.battle.find(x=>x.uid===row.uid);if(!x||row.to!=='grave'||row.destroy===false||row.selfDeath)return[];const used=new Set(batch.rows.filter(r=>r.plan?.kind==='g49'&&r.plan.mode==='queen').map(r=>r.plan.target)),out=[];if(card(x).g49Queen&&!api.ignored(s,x))for(const y of own.battle.filter(y=>y.uid!==x.uid&&bird(effective(y,s))&&!used.has(y.uid)&&(!api.canLeave||api.canLeave(s,row.player,y))))out.push({label:card(y).name+'をかわりに破壊する',cardId:y.cardId,value:{mode:'queen',target:y.uid}});if(api.isCreature(s,x)&&String(effective(x,s).race).includes('アーマード・ドラゴン'))for(const source of active(s,row.player,'g49Molnarlk')){const k=key(source);if(s.g49MolUsed?.[k]===s.turn||batch.rows.some(r=>r.plan?.kind==='g49'&&r.plan.mode==='molnarlk'&&r.plan.sourceUid===source.uid))continue;for(const y of own.hand.filter(y=>bird(card(y))&&canPut(s,row.player,y,'hand'))){const c=card(y),bases=c.evolution||c.neoEvolution?api.evolutionBases(s,row.player,c).filter(b=>!batch.rows.some(r=>r.uid===b.uid)):[];for(const baseUid of [...(!c.evolution?[null]:[]),...bases.map(b=>b.uid)])out.push({label:card(source).name+'：'+c.name+'をかわりに出す'+(baseUid?'（進化）':''),cardId:y.cardId,value:{mode:'molnarlk',sourceUid:source.uid,sourceIncarnation:source.incarnation||0,target:y.uid,baseUid}});}}return out;},
 replaceLeaving(s,row,plan){if(plan.mode==='queen'){api.destroyReplacementCards(s,row.player,[plan.target],s.leaving.snapshot);return;}if(plan.mode==='molnarlk'){const x=s.players[row.player].battle.find(x=>x.uid===plan.sourceUid&&(x.incarnation||0)===plan.sourceIncarnation),y=api.remove(s.players[row.player].hand,plan.target);if(!x||!y)return;(s.g49MolUsed??={})[key(x)]=s.turn;api.clear(y,'battle');api.enter(s,row.player,y,plan.baseUid,{origin:'hand',execution:false,replacement:true});}}
 };
}
