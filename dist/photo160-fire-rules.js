// Verified photographed fire cards; effect continuations retain physical identities.
export function createPhoto160FireRules(api){
 const{card,faces,cost,colors,effective,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const unit=(s,t)=>living(s,t.p).find(x=>key(x)===key(t));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g160F_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const next=(s,t,op,more={})=>put(s,{...t,op:'g160F_'+op,...more});
 const skip=()=>opt('使わない',null,0);
 const maxCost=c=>Math.max(...faces(c).map(cost));
 const battlePower=(s,x,y)=>api.battlePower(s,x,y,x.uid===s.attack?.attacker);
 function loot(s,t,revive=false){const id=String(s.g160FDiscardSerial=(s.g160FDiscardSerial||0)+1);(s.g160FDiscards??={})[id]=null;put(s,task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{n:1,random:true,causedBy:t.p,g160FDiscardKey:id}),{...t,op:'g160F_AfterLoot',discardKey:id,revive});}
 function run(s,t){if(!t.op.startsWith('g160F_'))return false;const own=s.players[t.p];switch(t.op){
 case'g160F_DaiDiscard':put(s,task('discard',1-t.p,t.source,{n:s.players[1-t.p].hand.length,causedBy:t.p}));break;
 case'g160F_ExtraTurn':put(s,task('g5ExtraTurn',t.p,t.source));break;
 case'g160F_BadEnd':{const x=unit(s,t);if(x)api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 case'g160F_Apolo':choice(s,t,'トッジョ・アポロ：使う効果を選ぶ（残り'+(t.remaining??3)+'回）',[opt('2枚引き、相手に見ないで選ばせて1枚捨てる','loot',own.deck.length>2?15:-100),opt('自分1体を+2000し、相手1体とバトル','fight',living(s,t.p).length&&living(s,1-t.p).length?25:2),opt('相手のクリーチャーではないエレメント1つを破壊','element',s.players[1-t.p].battle.some(x=>!x.sealed&&['seed','field','gear'].includes(effective(x,s).type))?30:0)]);break;
 case'g160F_Apophis':loot(s,t,true);break;
 case'g160F_AfterLoot':{const r=s.g160FDiscards?.[t.discardKey];if(s.g160FDiscards)delete s.g160FDiscards[t.discardKey];if(!t.revive||!r||!api.canMoveZone(s,t.p,'grave'))break;const x=own.grave.find(x=>x.uid===r.uid&&(x.zoneSerial||0)===r.serial),c=x&&card(x);if(x&&faces(c).some(c=>c.type==='creature'&&colors(c).includes('火'))&&api.canEnter(s,t.p,c,{origin:'grave',execution:false}))put(s,task('g34_Put',t.p,t.source,{origin:'grave',owner:t.p,target:x.uid,grant:{speedAttacker:true},delayed:'grave'}));break;}
 case'g160F_DiscardBurn':choice(s,t,'アポフィス：捨てたカード以下のコストの相手1体を破壊する',api.targetOptions(s,t.p,living(s,1-t.p).filter(x=>cost(effective(x,s))<=t.max)));break;
 case'g160F_FightOwn':choice(s,t,'このターン、パワーを+2000する自分の1体を選ぶ',api.targetOptions(s,t.p,living(s,t.p)).map(o=>{const x=living(s,t.p).find(x=>x.uid===o.value),boosted={...x,powerModifiers:[...(x.powerModifiers||[]),{amount:2000}]},scores=living(s,1-t.p).map(y=>battlePower(s,boosted,y)>battlePower(s,y,boosted)?30+cost(card(y)):-20);return{...o,score:scores.length?Math.max(...scores):5};}));break;
 case'g160F_FightEnemy':{const x=own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===(t.targetIncarnation||0));if(x)choice(s,t,'バトルする相手の1体を選ぶ？',[...api.targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const y=living(s,1-t.p).find(y=>y.uid===o.value);return{...o,score:battlePower(s,x,y)>battlePower(s,y,x)?30+cost(card(y)):-20};}),skip()]);break;}
 case'g160F_Sha':{const x=unit(s,t);if(x)choice(s,t,'シャカ車輪とバトルする相手1体を選ぶ？',[...api.targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const y=living(s,1-t.p).find(y=>y.uid===o.value);return{...o,score:battlePower(s,x,y)>battlePower(s,y,x)?30+cost(card(y)):-20};}),skip()]);break;}
 case'g160F_Element':choice(s,t,'破壊する相手のクリーチャーではないエレメント1つを選ぶ',api.targetOptions(s,t.p,s.players[1-t.p].battle.filter(x=>!x.sealed&&['seed','field','gear'].includes(effective(x,s).type))));break;
 case'g160F_Kodama':case'g160F_Blood':{const selected=t.selected||[],n=t.op==='g160F_Kodama'?1:2,rows=own.shields.filter(x=>!selected.includes(x.uid)&&!api.shieldCards(x).some(y=>y.g37ShieldHeld));if(t.done||selected.length>=n||!rows.length){let moved=0;for(const uid of selected){const all=api.moveShield(s,t.p,uid,'hand');if(all.some(x=>own.hand.some(y=>y.uid===x.uid)))moved++;}if(t.op==='g160F_Blood'&&moved)put(s,task('discard',1-t.p,t.source,{n:moved,causedBy:t.p}));break;}choice(s,{...t,selected},t.op==='g160F_Kodama'?'手札に加える自分のシールドを1つ選ぶ（S・トリガーは使えません）':'手札に加える自分のシールドを2つまで選ぶ（'+selected.length+'/2、S・トリガーは使えません）',[...rows.map((x,i)=>opt('自分のシールド '+(own.shields.indexOf(x)+1),x.uid,10)),...(t.op==='g160F_Blood'?[opt('この内容で確定',null,0)]:[])]);break;}
 case'g160F_Rowin':choice(s,t,'手札へ戻す自分のマナを1枚まで選ぶ',[...(api.canMoveZone(s,t.p,'mana')?own.mana.filter(x=>!x.faceDown&&!(own.g34ManaHeld||[]).includes(x.uid)).map(x=>opt(card(x).name,x.uid,15+cost(card(x)),x.cardId)):[]),skip()]);break;
 case'g160F_MachDestroy':{const x=s.players[t.owner].battle.find(x=>x.uid===t.target&&(x.incarnation||0)===(t.targetIncarnation||0));if(x)api.move(s,[{player:t.owner,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 default:throw Error('未実装の写真火文明効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g160F_'))return false;const own=s.players[t.p];switch(t.op){
 case'g160F_Apolo':{const remaining=(t.remaining??3)-1;if(remaining)next(s,t,'Apolo',{remaining});if(v==='loot')loot(s,t);else next(s,t,v==='fight'?'FightOwn':'Element');break;}
 case'g160F_DiscardBurn':case'g160F_Element':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g160F_FightOwn':{const x=own.battle.find(x=>x.uid===v);if(x){(x.powerModifiers??=[]).push({amount:2000,expires:'end',who:s.active});next(s,t,'FightEnemy',{target:x.uid,targetIncarnation:x.incarnation||0});}break;}
 case'g160F_FightEnemy':case'g160F_Sha':{const x=t.op==='g160F_Sha'?unit(s,t):own.battle.find(x=>x.uid===t.target&&(x.incarnation||0)===(t.targetIncarnation||0)),y=living(s,1-t.p).find(x=>x.uid===v);if(x&&y)api.battle(s,t.p,x,1-t.p,y,s.attack?.attacker);break;}
 case'g160F_Kodama':case'g160F_Blood':put(s,{...t,selected:v?[...(t.selected||[]),v]:t.selected,done:!v});break;
 case'g160F_Rowing':case'g160F_Rowin':{const x=v&&api.canMoveZone(s,t.p,'mana')&&api.remove(own.mana,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);put(s,task('g34_Select',t.p,t.source,{origin:'grave',to:'mana',n:2,optional:true,title:'墓地からマナへ置くカードを2枚まで選ぶ'}));}break;}
 default:throw Error('未実装の写真火文明選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){if(!c.g160FEffect)return false;put(s,task('g160F_'+c.g160FEffect,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0}));return true;},
 decorate(s,p,x,c){if(!s||p<0||c.type!=='creature')return c;if(c.g160FRole==='sha'&&s.players[0].shields.length+s.players[1].shields.length<=6)return{...c,power:Number(c.power)+6000,breaker:2};if(c.g160FRole==='blood')return{...c,power:Number(c.power)-s.players[p].shields.length*3000};return c;},
 start(s,p){return living(s,p).filter(x=>effective(x,s).g160FRole==='apophis').map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g160F_Apophis',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 entry(s,p,x,options={}){if(!api.isCreature(s,x)||options.execution!==false||s.active===p)return;for(const w of living(s,1-p))if(effective(w,s).g160FRole==='mach')on(s,1-p,w,'MachDestroy',{owner:p,target:x.uid,targetIncarnation:x.incarnation||0});},
 attack(s,p,x){if(!api.selfStopped(s,p)&&effective(x,s).g160FRole==='dai'&&x.entered===s.turn)on(s,p,x,'DaiDiscard');},
 allowedEntry(s,p,c){const life=s.attackLifecycle,owner=life?.player??s.active,uid=life?.uid??s.attack?.attacker,a=uid&&s.players[owner].battle.find(x=>x.uid===uid&&(!life||(x.incarnation||0)===life.incarnation));return !c||c.type!=='creature'||!a||owner===p||effective(a,s).g160FRole!=='dai';},
 canAttackPlayer(s,p){return !living(s,1-p).some(x=>effective(x,s).g160FRole==='dai');},
 discarded(s,t,x,actual){if(!actual)return;if(t.g160FDiscardKey)(s.g160FDiscards??={})[t.g160FDiscardKey]={uid:x.uid,cardId:x.cardId,serial:x.zoneSerial||0};for(const w of living(s,t.p))if(effective(w,s).g160FRole==='apophis')on(s,t.p,w,'DiscardBurn',{max:maxCost(card(x))});},
 snapshot(s,rows){return rows.flatMap(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&!api.ignored(s,x)&&card(x).g160FRole==='clash'?[{p:r.player,uid:x.uid,tapped:x.tapped}]:[];});},
 leaving(s,p,x,snapshot,to,destroy){if(destroy&&to==='grave'&&snapshot?.some(r=>r.p===p&&r.uid===x.uid&&r.tapped))on(s,p,x,'ExtraTurn');},
 shieldLeft(s,p,x,group){if(group===null)return;for(const w of living(s,p))if(effective(w,s).g160FRole==='scora'&&api.layers(w).some(y=>y.exLifeShieldUid===group||y.exLifeShieldUids?.includes(group))&&w.tapped&&!s.g31ExtraTurn)on(s,p,w,'ExtraTurn');},
 mainActions(s,p){return s.players[p].hand.filter(x=>['scora','clash'].includes(card(x).g160FRole)&&!living(s,1-p).some(x=>effective(x,s).noCostReduction)&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})&&api.canPay(s,p,{...card(x),printedCost:cost(card(x)),cost:Math.max(1,cost(card(x))-2)})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',alternative:'photo160Bad',cost:api.summonCost(s,p,{...card(x),printedCost:cost(card(x)),cost:Math.max(1,cost(card(x))-2)}),label:card(x).name+'をB・A・D 2で召喚（終了時に破壊）'}));},
 alternative(s,p,a){const x=s.players[p].hand.find(x=>x.uid===a.uid);if(!x)return;api.cast(s,p,x.uid,false,null,0,{cost:Math.max(1,cost(card(x))-2)});(s.g160FBad??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn,source:x.cardId});},
 end(s){const rows=(s.g160FBad||[]).filter(x=>x.turn===s.turn);s.g160FBad=(s.g160FBad||[]).filter(x=>x.turn!==s.turn);return rows.map(t=>({player:t.p,uid:t.uid,source:t.source,effect:'extended',task:{...t,op:'g160F_BadEnd'}}));}
 };
}
