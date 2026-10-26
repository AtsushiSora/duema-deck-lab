// Original champion seed decks. Every continuation contains references, never card objects.
export function createSeedChampionRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),ref=x=>({uid:x.uid,incarnation:x.incarnation||0});
 const active=(s,p,flag)=>s.players[p].battle.filter(x=>!api.ignored(s,x)&&effective(x,s)[flag]);
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g47_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g47_'+op,p,x.cardId,{...ref(x),...more})});
 const movable=(s,p,origin)=>!api.canMoveZone||api.canMoveZone(s,p,origin);
 const findRef=(s,p,r)=>s.players[p].battle.find(x=>key(x)===key(r)||(x.g47ElementRefs||[]).some(v=>key(v)===key(r)));
 const neo=(s,x)=>!!card(x).neoEvolution||api.isEvolution(x);
 const usable=(s,p,x,c,origin)=>movable(s,p,origin)&&api.canCast(s,p,c,origin)&&(c.type==='spell'||api.canEnter(s,p,c,{origin,execution:true}))&&(!c.evolution||api.evolutionBases(s,p,c).length);
 function executeOptions(s,t){return(t.origins||['hand']).flatMap(origin=>s.players[t.p][origin].flatMap(x=>faces(card(x)).flatMap((c,face)=>cost(c)<=t.max&&(!t.spellOnly||c.type==='spell')&&(!t.noncreature||c.type!=='creature')&&usable(s,t.p,x,c,origin)?[opt(({hand:'手札：',grave:'墓地：',mana:'マナ：'}[origin]||'')+c.name,{uid:x.uid,origin,face},25+cost(c)*2,x.cardId)]:[])));}
 function execute(s,t,base=null){const x=s.players[t.p][t.origin]?.find(x=>x.uid===t.target),c=x&&faces(card(x))[t.face||0];if(!x||!usable(s,t.p,x,c,t.origin))return;if(t.bottom)x.finishTo='deck';api.cast(s,t.p,x.uid,true,base,t.face||0,null,t.origin,'カードの能力');}
 function look(s,t,n){const own=s.players[t.p],reserved=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));n=api.lookCount?api.lookCount(s,t.p,n):api.deckLocked(s,t.p)?0:n;const xs=own.deck.filter(x=>!reserved.has(x.uid)).slice(0,n);(own.g34Protected??=[]).push(...xs.map(x=>x.uid));const isPublic=t.mode==='blue'||api.lookPublic?.(s,t.p);api.log(s,t.p,isPublic?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚'+(isPublic?'を公開：'+xs.map(x=>card(x).name).join('・'):'を確認'),{cardId:t.source});queue(s,t,'LookPick',{ids:xs.map(x=>x.uid),selected:[],stage:0});}
 function lookPick(s,t){const own=s.players[t.p],xs=t.ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(Boolean),stage=t.stage||0;
  if(t.mode==='blue'&&stage>=2||t.mode!=='blue'&&(t.selected.length||stage>=1)){put(s,task('g34_Order',t.p,t.source,{ids:xs.map(x=>x.uid),ordered:[],rest:'bottom'}));return;}
  const list=xs.filter(x=>t.mode==='blue'?(card(x).type==='creature')===(stage===0):t.mode==='blueprint'?card(x).type==='creature':true);
  if(!list.length){queue(s,t,'LookPick',{stage:stage+1});return;}
  choice(s,t,t.mode==='blue'?(stage===0?'クリーチャーを1枚まで手札に加える':'クリーチャーではないカードを1枚まで手札に加える'):t.mode==='blueprint'?'クリーチャーを1体まで公開して手札に加える':'1枚を手札に加える',[...list.map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),...(t.mode!=='kerora'?[skip()]:[])]);
 }
 function handMana(s,t){choice(s,t,'手札を1枚マナゾーンに置いてもよい',[...s.players[t.p].hand.map(x=>{const c=card(x);return opt(c.name,x.uid,8+cost(c)-(c.g47Vanilla||c.g47Teacher||c.g47Dokkoi?30:0),x.cardId);}),skip()]);}
 const deploy=(s,t)=>{if(movable(s,t.p,'mana'))put(s,task('g34_Select',t.p,t.source,{origin:'mana',n:1,optional:true,deploy:true,filter:{creatureOrSeed:true,max:3},title:'マナからコスト3以下のクリーチャーかタマシードを1枚まで出す'}));};
 function shinka(s,p,x){const type=effective(x,s).g47Shinka;if(type&&!api.ignored(s,x))on(s,p,x,type==='Party'?'PartyShinka':'Leviya');}
 function attach(s,t,ordered){const own=s.players[t.p],x=findRef(s,t.p,t.targetRef),host=own.battle.find(x=>key(x)===key(t.host));if(!x||!host||x===host||!api.isCreature(s,host)||!neo(s,host))return;
  // Becoming an evolution base triggers shinka power, even when no evolution occurs (QA48122).
  if(api.evolutionBase)api.evolutionBase(s,t.p,x);else shinka(s,t.p,x);
  if(api.attachUnder){api.attachUnder(s,t.p,x.uid,host.uid,ordered);return;}
  const all=api.allLayers(x);if(api.recordLastPower)api.recordLastPower(s,t.p,x,all);api.remove(own.battle,x.uid);const cards=ordered.map(uid=>all.find(y=>y.uid===uid)).filter(Boolean);for(const y of cards){api.clear(y,'battle');delete y.g47ElementRefs;}(host.under??=[]).push(...cards);for(const seal of [...(own.seals||[])].filter(y=>y.sealOf===x.uid))api.moveSeal(s,t.p,seal.uid,'grave');api.log(s,t.p,'under',card(x).name+'を'+card(host).name+'の下へ置いた',{cardId:x.cardId});
 }
 const stratoCards=(s,p,x)=>api.allLayers(x).filter(y=>y!==x||!api.isCreature(s,x)||!api.manaMoveForbidden?.(s,p));
 function strataCards(s,t){const row=s.leaving?.rows.find(r=>r.uid===t.rowUid&&r.player===t.owner),x=row&&s.players[t.owner].battle.find(x=>x.uid===t.rowUid);if(!x)return;const remaining=stratoCards(s,t.owner,x).filter(x=>!t.selected.includes(x.uid));choice(s,t,'かわりにマナへ置く相手のカードを選ぶ（'+t.selected.length+'枚）',[...remaining.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),...(t.selected.length?[opt('選んだ'+t.selected.length+'枚をマナへ置く',null,0)]:[opt('置換を使わない',null,0)])]);}
 function run(s,t){if(!t.op?.startsWith('g47_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g47_Blueprint':look(s,{...t,mode:'blueprint'},6);break;
 case'g47_Kerora':look(s,{...t,mode:'kerora'},4);break;
 case'g47_GreatBlue':look(s,{...t,mode:'blue'},3);break;
 case'g47_LookPick':lookPick(s,t);break;
 case'g47_BlueDrache':queue(s,t,'Execute',{origins:['hand','grave'],max:5,spellOnly:true,bottom:true});break;
 case'g47_Execute':choice(s,t,'コストを支払わず実行するカードを選ぶ',[...executeOptions(s,t),skip()]);break;
 case'g47_ExecuteBase':{const x=own[t.origin]?.find(x=>x.uid===t.target),c=x&&faces(card(x))[t.face||0];if(c)choice(s,t,'進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',null,1)]:[]),...api.evolutionBases(s,t.p,c).filter(x=>x.uid!==t.target).map(x=>opt(card(x).name,x.uid,10,x.cardId))]);break;}
 case'g47_Fight':{const list=targetOptions(s,t.p,creatures(s,t.p)).map(o=>({...o,score:api.power(s.players[t.p].battle.find(x=>x.uid===o.value),false,s)/1000}));if(list.length)choice(s,t,'バトルする自分のクリーチャーを選ぶ',list);break;}
 case'g47_FightEnemy':{const ownTarget=own.battle.find(x=>key(x)===key(t.self)),list=targetOptions(s,t.p,creatures(s,1-t.p)).map(o=>{const x=opp.battle.find(x=>x.uid===o.value);return {...o,score:o.score+(ownTarget&&api.power(ownTarget,false,s)>=api.power(x,false,s)?50:0)};});if(list.length)choice(s,t,'バトルする相手のクリーチャーを選ぶ',list);break;}
 case'g47_Wakanna':{const top=opp.deck.find(x=>!Object.entries(opp).some(([k,v])=>/Protected$|Reveals$/.test(k)&&Array.isArray(v)&&v.includes(x.uid)));if(!top)break;const max=Math.max(...faces(card(top)).map(cost));api.mill(s,1-t.p,1);if(s.winner===null)queue(s,t,'WakannaTarget',{max});break;}
 case'g47_WakannaTarget':choice(s,t,'墓地に置いたカード以下のコストの相手エレメントを手札へ戻す',targetOptions(s,t.p,opp.battle.filter(x=>cost(card(x))<=t.max)));break;
 case'g47_Trap':put(s,task('g34_Target',t.p,t.source,{anyOwner:true,element:true,filter:{creatureOrSeed:true,max:4},to:'mana',title:'コスト4以下のクリーチャーかタマシードをマナへ置く'}));break;
 case'g47_Party':choice(s,t,'墓地をシャッフルして山札の下に置くプレイヤーを選ぶ',[opt('自分',t.p,own.deck.length<8?40:own.grave.length?10:0),opt('相手',1-t.p,opp.grave.length?3:0)]);break;
 case'g47_PartyShinka':put(s,task('g34_Ramp',t.p,t.source,{n:2,tapped:true}),task('g47_ManaHand',t.p,t.source));break;
 case'g47_ManaHand':if(movable(s,t.p,'mana'))choice(s,t,'自分のマナから1枚を手札に戻す',own.mana.map(x=>opt(card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g47_Leviya':deploy(s,t);break;
 case'g47_Manhattan':{const list=targetOptions(s,t.p,creatures(s,t.p));if(list.length)choice(s,t,'マナに置かず残す自分のクリーチャーを選ぶ',list);else queue(s,t,'ManhattanEnemy',{self:null});break;}
 case'g47_ManhattanEnemy':{const list=targetOptions(s,t.p,creatures(s,1-t.p)).map(o=>({...o,score:-o.score}));if(list.length)choice(s,t,'マナに置かず残す相手のクリーチャーを選ぶ',list);else manhattan(s,{...t,enemy:null});break;}
 case'g47_DokkoiTap':put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}),task('g47_HandMana',t.p,t.source));break;
 case'g47_HandMana':handMana(s,t);break;
 case'g47_Teacher':put(s,task('g34_Draw',t.p,t.source,{n:1,optional:true}));break;
 case'g47_StrataRamp':case'g47_ManaSeedRamp':put(s,task('g34_Ramp',t.p,t.source,{n:1,tapped:t.op==='g47_ManaSeedRamp',optional:true}));break;
 case'g47_Attach':{const x=findRef(s,t.p,t.targetRef);if(!x)break;const hosts=own.battle.filter(y=>y!==x&&api.isCreature(s,y)&&neo(s,y));choice(s,t,'出たタマシードをNEO・進化クリーチャーの下に置く？',[...hosts.map(y=>opt(card(y).name,ref(y),card(x).g47Shinka?35:card(x).g47SoulBlue?20:4,y.cardId)),skip()]);break;}
 case'g47_AttachOrder':{const x=findRef(s,t.p,t.targetRef);if(!x)break;const ids=api.allLayers(x).map(y=>y.uid).filter(uid=>!t.ordered.includes(uid));if(ids.length<=1){attach(s,t,[...t.ordered,...ids]);break;}choice(s,t,'下に重ねる順序を選ぶ（先に選ぶカードが上）',ids.map(uid=>{const y=api.allLayers(x).find(y=>y.uid===uid);return opt(card(y).name,uid,0,y.cardId);}));break;}
 case'g47_StrataCards':strataCards(s,t);break;
 default:throw Error('未実装の優勝タマシード効果：'+t.op);
 }return true;}
 function manhattan(s,t){const rows=[0,1].flatMap(p=>creatures(s,p).filter(x=>x.uid!==(p===t.p?t.self:t.enemy)).map(x=>({player:p,uid:x.uid,to:'mana',destroy:false})));if(rows.length)api.move(s,rows);}
 function chosen(s,t,v){if(!t.op?.startsWith('g47_'))return false;const own=s.players[t.p];switch(t.op){
 case'g47_LookPick':{const x=v&&api.remove(own.deck,v);if(x){own.g34Protected=(own.g34Protected||[]).filter(uid=>uid!==v);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);if(t.mode==='blueprint')api.log(s,t.p,'reveal',card(x).name+'を公開して手札に加えた',{cardId:x.cardId});}queue(s,t,'LookPick',{ids:t.ids.filter(uid=>uid!==v),selected:[...t.selected,...(x?[v]:[])],stage:t.stage+1});break;}
 case'g47_Execute':if(v){const x=own[v.origin]?.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];if(c){const next={...t,...v,target:v.uid};if(c.evolution||c.neoEvolution)queue(s,next,'ExecuteBase');else execute(s,next);}}break;
 case'g47_ExecuteBase':execute(s,t,v);break;
 case'g47_Fight':{const x=own.battle.find(x=>x.uid===v);if(x)queue(s,t,'FightEnemy',{self:ref(x)});break;}
 case'g47_FightEnemy':{const a=own.battle.find(x=>key(x)===key(t.self)),b=s.players[1-t.p].battle.find(x=>x.uid===v);if(a&&b)api.battle(s,t.p,a,1-t.p,b,s.attack?.attacker);break;}
 case'g47_WakannaTarget':if(v)api.move(s,[{player:1-t.p,uid:v,to:'hand',destroy:false}]);break;
 case'g47_Party':if(movable(s,v,'grave')){const xs=own===s.players[v]?own.grave:s.players[v].grave,all=api.shuffled(xs.splice(0),Math.floor(api.random(s)*4294967296));for(const x of all)api.clear(x,'deck');api.addZone(s,v,'deck',...all);}break;
 case'g47_ManaHand':if(v&&movable(s,t.p,'mana')){const x=api.remove(own.mana,v);if(x){api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 case'g47_Manhattan':queue(s,t,'ManhattanEnemy',{self:v});break;
 case'g47_ManhattanEnemy':manhattan(s,{...t,enemy:v});break;
 case'g47_HandMana':if(v){const x=api.remove(own.hand,v);if(x){const to=api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);}}break;
 case'g47_Attach':if(v)queue(s,t,'AttachOrder',{host:v,ordered:[]});break;
 case'g47_AttachOrder':queue(s,t,'AttachOrder',{ordered:[...t.ordered,v]});break;
 case'g47_StrataCards':if(v){strataCards(s,{...t,selected:[...t.selected,v]});}else{const row=s.leaving?.rows.find(r=>r.uid===t.rowUid&&r.player===t.owner);if(row){if(t.selected.length)row.plan={kind:'g47',replacement:'strato',source:t.source,cards:t.selected};else{row.g47StratoDeclined=true;delete row.plan;}}}break;
 default:throw Error('未実装の優勝タマシード選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c){if(!c.g47Effect)return false;put(s,task('g47_'+c.g47Effect,p,c.id));return true;},
 entry(s,p,x){x.g47ElementRefs=[...(x.g47ElementRefs||[]),ref(x)];if(card(x).type==='seed')for(const watcher of active(s,p,'g47Drache'))on(s,p,watcher,'Attach',{targetRef:ref(x)});},
 inherit(s,base,x){x.g47ElementRefs=[...(x.g47ElementRefs||[]),...(base.g47ElementRefs||[ref(base)])];},
 evolutionBase:shinka,
 summoned(s,p,x){const c=card(x),text=String(c.text||'').replace(/\([^)]*\)|（[^）]*）/g,'').trim(),plain=c.g47Vanilla||!text||text==='能力なし';if(plain)for(const w of active(s,p,'g47Teacher'))on(s,p,w,'Teacher');},
 tapped(s,p,x){if(!api.isCreature(s,x))return;for(const w of active(s,1-p,'g47Dokkoi'))if(w.hyperActive)on(s,1-p,w,'DokkoiTap');},
 attack(s,p,x){if(api.ignored(s,x))return;for(const y of api.allLayers(x).slice(1))if(card(y).g47SoulBlue)on(s,p,x,'Execute',{origins:['hand'],max:4,noncreature:true});},
 discount(s,p,c){return c.type==='seed'?2*active(s,p,'g47Drache').length:0;},
 mainActions(s,p){if(s.active!==p||!movable(s,p,'mana'))return[];return active(s,p,'g47Drache').filter(w=>s.g47ManaSeedUsed?.[key(w)]!==s.turn).flatMap(w=>s.players[p].mana.filter(x=>card(x).type==='seed'&&usable(s,p,x,card(x),'mana')&&api.canPay(s,p,card(x))).map(x=>({kind:'play',alternative:'g47Seed',uid:x.uid,cardId:x.cardId,origin:'mana',g47Drache:ref(w),label:card(x).name+'をマナから実行する',cost:api.summonCost(s,p,card(x))})));},
 alternative(s,p,a){const w=s.players[p].battle.find(x=>key(x)===key(a.g47Drache)&&!api.ignored(s,x)&&effective(x,s).g47Drache);if(!w||s.g47ManaSeedUsed?.[key(w)]===s.turn||!movable(s,p,'mana'))return;(s.g47ManaSeedUsed??={})[key(w)]=s.turn;api.cast(s,p,a.uid,false,null,0,null,'mana','創世竜 Drache der’Zen');put(s,task('g47_ManaSeedRamp',p,w.cardId));},
 manaLeft(s,p,watchers=null){const first=s.g47ManaLeft?.[p]!==s.turn;(s.g47ManaLeft??=[])[p]=s.turn;if(first)for(const w of watchers??active(s,p,'g47Strato'))on(s,p,w,'StrataRamp');},
 noLose(s,p,kind){return kind!=='directAttack'&&active(s,p,'g47Valhalla').length>0;},
 canAddTurn(s,p){return active(s,1-p,'g47Valhalla').length===0;},
 replaceEntry(s,p,x,base,options={}){if(s.active!==p||card(x).type!=='creature'||(s.players[p].enteredThisTurn||0)<2||!active(s,1-p,'g47Manhattan').length)return false;api.clear(x,'mana');api.addZone(s,p,'mana',x);api.log(s,p,'entryReplace',card(x).name+'はマンハッタンの心絵によりマナゾーンへ',{cardId:x.cardId});return true;},
 // Core leave processing chooses the active player's replacement before the other player's.
 destructionReplacements(s,p){return active(s,p,'g47Dokkoi').map(x=>({uid:x.uid,cardId:x.cardId,owner:p,mandatory:true,destinations:['hand','mana']}));},
 stratoReplacements(s,p){return active(s,1-p,'g47Strato').map(x=>({uid:x.uid,cardId:x.cardId,owner:1-p,optional:true,to:'mana'}));},
 leaveOptions(s,row){const x=s.players[row.player].battle.find(x=>x.uid===row.uid);if(!x||row.selfDeath)return[];const out=[];if(row.to==='grave'&&row.destroy!==false&&api.isCreature(s,x)&&!api.manaMoveForbidden?.(s,row.player))for(const w of active(s,row.player,'g47Dokkoi'))for(const to of ['hand','mana'])out.push({label:card(w).name+'：かわりに'+(to==='hand'?'手札へ戻す':'マナへ置く'),value:{replacement:'dokkoi',to,source:w.cardId},controller:row.player,mandatory:true});if(row.to!=='mana'&&!row.g47StratoDeclined&&stratoCards(s,row.player,x).length)for(const w of active(s,1-row.player,'g47Strato'))out.push({label:card(w).name+'：かわりにマナへ置くカードを選ぶ',value:{replacement:'strato',source:w.cardId},controller:1-row.player,mandatory:false});return out;},
 beginReplacement(s,row,value){if(value.replacement==='strato')strataCards(s,{op:'g47_StrataCards',p:1-row.player,owner:row.player,rowUid:row.uid,source:value.source,selected:[]});else row.plan={kind:'g47',...value};},
 replaceLeaving(s,row,plan){const own=s.players[row.player],x=own.battle.find(x=>x.uid===row.uid);if(!x)return;if(row.exchange&&plan.replacement==='strato'){api.log(s,row.player,'swapFailed','ストラトバッグにより入れ替えできず、元のクリーチャーが攻撃を続ける',{cardId:x.cardId});return;}const all=api.allLayers(x),selected=new Set(plan.cards||all.map(x=>x.uid)),original=row.to==='grave'&&row.death?row.death:row.to,dest=y=>plan.replacement==='dokkoi'?plan.to:selected.has(y.uid)?'mana':row.cardOnly&&y.uid!==x.uid?'grave':original,to=dest(x);if(api.recordLastPower)api.recordLastPower(s,row.player,x,all);if(api.leaving)api.leaving(s,row.player,x,row.leaveKaku,s.leaving?.snapshot,to,to==='grave'&&row.destroy!==false);api.remove(own.battle,x.uid);if(s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(x.uid))s.attack=null;const groups={};for(const y of all){const z=dest(y);api.clear(y,z);delete y.g47ElementRefs;if(row.tapped&&z==='mana')y.tapped=true;(groups[z]??=[]).push(y);}for(const [z,cards]of Object.entries(groups)){if(z==='deckTop')own.deck.unshift(...cards);else if(z==='shields'&&row.shieldAttach)for(const y of cards)api.addShieldCard(s,row.player,row.shieldAttach,y);else{api.addZone(s,row.player,z,...cards);if(z==='shields')for(const y of cards)api.notifyShieldAdded(s,row.player,y);}}api.log(s,row.player,'g47Replace',card(x).name+'の移動を'+(plan.replacement==='dokkoi'?'ドッコイ':'ストラトバッグ')+'で置換した',{cardId:x.cardId});},
 };
}
