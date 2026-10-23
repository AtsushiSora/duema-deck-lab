// No.14: copied entry abilities and distinct end-of-attack/after-attack windows.
export function createTravelRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,move,enter,cast,draw,targetOptions}=api;
 const joker=c=>String(c.race).includes('ジョーカーズ'),key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canPut=(s,p,x,origin)=>!x.faceDown&&['creature','seed'].includes(card(x).type)&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 const mmmReady=(s,p)=>!s.players[p].shields.length&&['光','自然'].every(c=>s.players[p].mana.some(x=>api.manaColors(card(x),s,p).includes(c)));
 function ramp(s,p,n){const added=[];for(let i=0;i<n&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);api.addZone(s,s.players[p],to,x);added.push(x);}api.deckCheck(s,p);}return added;}
 function copyAbilities(c){if(c.type!=='creature'||!joker(c))return [];return [...(c.effect?[{effect:c.effect,label:'登場時の能力'}]:[]),...(c.prisonZero?[{effect:'travelRevZero',label:'革命0の登場時能力'}]:[])];}
 function declareDash(s,t){if(!t.remaining.length){for(const d of t.declared)api.enqueue(s,t.p,{uid:d.uid,source:d.source,effect:'extended',task:task('g14_DashResolve',t.p,d.source,d)});return;}const d=t.remaining[0];choice(s,t,'キリフダッシュを宣言する？（すべて宣言してから解決）',[opt(card(d.source).name+'を宣言する',true,20,d.source),skip()]);}
 function run(s,t){if(!t.op.startsWith('g14_'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
 case'g14_Journey':{const id=String(s.g14Serial=(s.g14Serial||0)+1);(s.g14Discards??={})[id]=[];put(s,task('draw',t.p,t.source,{n:1}),task('discard',t.p,t.source,{causedBy:t.p,n:1,travelKey:id}),task('g14_Copy',t.p,t.source,{uid:t.uid,key:id}));break;}
 case'g14_Copy':{const ids=s.g14Discards?.[t.key]||[];delete s.g14Discards?.[t.key];const c=ids[0]&&card(ids[0]),abilities=c?copyAbilities(c):[];if(abilities.length)choice(s,t,'捨てたジョーカーズの登場時能力を1つ使う？',[...abilities.map(x=>opt(c.name+'：'+x.label,{id:c.id,effect:x.effect},20,c.id)),skip()]);break;}
 case'g14_Afro':put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:2}));break;
 case'g14_Katsura':{const x=own.deck.pop();if(x){clear(x,'grave');api.addZone(s,own,'grave',x);put(s,task('g14_KatsuraPut',t.p,t.source,{target:x.uid}));}api.deckCheck(s,t.p);break;}
 case'g14_KatsuraPut':{const x=own.grave.find(x=>x.uid===t.target);if(x&&card(x).type==='creature'&&joker(card(x))&&cost(card(x))<=6&&canPut(s,t.p,x,'grave'))put(s,task('g14_Put',t.p,t.source,{target:x.uid,origin:'grave'}));break;}
 case'g14_Prison':{const ids=own.deck.slice(0,4).map(x=>x.uid);(own.g14Protected??=[]).push(...ids);choice(s,{...t,ids},'上4枚からジョーカーズ・クリーチャーを1体手札へ',[...ids.map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>card(x).type==='creature'&&joker(card(x))).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;}
 case'g14_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));if(ids.length<=1){for(const uid of ids)own.deck.push(remove(own.deck,uid));own.g14Protected=(own.g14Protected||[]).filter(uid=>!t.protected.includes(uid));break;}choice(s,{...t,ids},'残りを山札の下へ置く順序を選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;}
 case'g14_RevZero':if(!own.shields.length)chooseHand(s,t,7,true,false);break;
 case'g14_MMM':if(mmmReady(s,t.p)&&own.hand.some(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial)&&api.canEnter(s,t.p,card(t.source),{origin:'hand',execution:false}))choice(s,t,'MMM-ジョーキングを手札から出す？',[opt('出す',true,30,t.source),skip()]);break;
 case'g14_MMMAttack':put(s,task('draw',t.p,t.source,{n:1}),task('g14_MMMPut',t.p,t.source));break;
 case'g14_MMMPut':chooseHand(s,t,4,false,true);break;
 case'g14_HandPick':chooseHand(s,t,t.max,t.jokerOnly,t.seed);break;
 case'g14_Put':{const x=own[t.origin].find(x=>x.uid===t.target);if(!x||!canPut(s,t.p,x,t.origin))break;if(card(x).evolution)choice(s,t,'出す進化クリーチャーの進化元を選ぶ',api.evolutionBases(s,t.p,card(x)).map(x=>opt(card(x).name,x.uid,5,x.cardId)));else deploy(s,t,null);break;}
 case'g14_G3':choice(s,t,'「シールドいらねえー！」で自分の3体にG・ブレイカーを与える？',[opt('与える',true,creatures(s,t.p).length?15:-1),skip()]);break;
 case'g14_G3Pick':{const list=creatures(s,t.p).filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=t.n||!list.length){for(const uid of t.selected){const x=own.battle.find(x=>x.uid===uid);if(x)(x.g14G??=[]).push({turn:s.turn});}break;}choice(s,t,'G・ブレイカーを与える自分のクリーチャー（'+t.selected.length+'/'+t.n+'）',targetOptions(s,t.p,list));break;}
 case'g14_Zero':choice(s,t,'「気に入らねぇやつは消す」で相手の能力すべてを無視する？',[opt('このターン無視する',true,opp.battle.length?20:1),skip()]);break;
 case'g14_Helt':choice(s,t,'ジョーカーズの数までカードを引く',Array.from({length:creatures(s,t.p).filter(x=>joker(card(x))).length+1},(_,n)=>opt(n+'枚引く',n,n<own.deck.length?n*5:-100)));break;
 case'g14_TimeWin':choice(s,t,'バトル勝利：山札の上2枚をマナへ置き、1枚手札へ戻す？',[opt('2枚マナへ置く',true,own.deck.length>2?15:-20),skip()]);break;
 case'g14_ReturnMana':choice(s,t,'マナから必ず1枚手札に戻す',own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,cost(card(x)),x.cardId)));break;
 case'g14_Ora':{const xs=ramp(s,t.p,1);if(xs.some(x=>joker(card(x))))draw(s,t.p,1);break;}
 case'g14_Chicken':choice(s,t,'相手のブロッカーを1体破壊する',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>effective(x,s).blocker)));break;
 case'g14_MomoShield':choice(s,t,'自分のシールド1つを手札に加える？（S・トリガー不可）',[...own.shields.map((x,i)=>opt('シールド'+(i+1),x.uid,own.shields.length>1?10:2)),skip()]);break;
 case'g14_Joe':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation&&x.g14Joe?.some(j=>j.key===t.key));if(x){put(s,task('g14_AfterJoe',t.p,t.source,{uid:x.uid,serial:x.zoneSerial||0}));move(s,[{player:t.p,uid:x.uid,to:'deck',destroy:false}]);}break;}
 case'g14_AfterJoe':{const x=own.deck.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial+1);if(x)draw(s,t.p,1);break;}
 case'g14_DashDeclare':declareDash(s,t);break;
 case'g14_DashResolve':{const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial),permits=x&&t.origin==='mana'?api.manaPermits(s,t.p,x):[null];if(x&&permits.length&&api.canCast(s,t.p,card(x))&&api.canEnter(s,t.p,card(x),{origin:t.origin,execution:true})&&api.canPay(s,t.p,{...card(x),cost:card(x).kirifudaDash,printedCost:card(x).cost,summonOrigin:t.origin}))choice(s,t,'キリフダッシュのコストを支払って召喚する？',[...permits.map(permit=>opt('2マナで召喚する',{permit},25,x.cardId)),skip()]);break;}
 default:throw Error('未実装の旅路効果：'+t.op);
 }return true;}
 function chooseHand(s,t,max,jokerOnly,seed){choice(s,t,'手札から'+(jokerOnly?'ジョーカーズの':'')+'コスト'+max+'以下を出す？',[...s.players[t.p].hand.filter(x=>(card(x).type==='creature'||seed&&card(x).type==='seed')&&cost(card(x))<=max&&(!jokerOnly||joker(card(x)))&&canPut(s,t.p,x,'hand')).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);}
 function deploy(s,t,base){const own=s.players[t.p],x=remove(own[t.origin],t.target);if(x)enter(s,t.p,x,base,{origin:t.origin,execution:false});}
 function chosen(s,t,v){if(!t.op.startsWith('g14_'))return false;const own=s.players[t.p];switch(t.op){
 case'g14_Copy':if(v){api.log(s,t.p,'copyEntry',card(v.id).name+'の登場時能力を旅路が使用',{cardId:v.id});api.resolveEffect(s,t.p,{...card(v.id),effect:v.effect},t.uid,{uid:t.uid});}break;
 case'g14_Prison':if(v){const x=remove(own.deck,v);clear(x,'hand');own.hand.push(x);api.deckCheck(s,t.p);}put(s,task('g14_Order',t.p,t.source,{ids:t.ids.filter(uid=>uid!==v),protected:t.ids}));break;
 case'g14_Order':own.deck.push(remove(own.deck,v));put(s,{...t,ids:t.ids.filter(uid=>uid!==v)});break;
 case'g14_RevZero':case'g14_MMMPut':case'g14_HandPick':if(v)put(s,task('g14_Put',t.p,t.source,{target:v,origin:'hand'}));break;
 case'g14_MMM':if(v)put(s,task('g14_Put',t.p,t.source,{target:t.uid,origin:'hand'}));break;
 case'g14_Put':deploy(s,t,v);break;
 case'g14_G3':if(v)put(s,task('g14_G3Pick',t.p,t.source,{selected:[],n:Math.min(3,creatures(s,t.p).length)}));break;
 case'g14_G3Pick':put(s,{...t,selected:[...t.selected,v]});break;
 case'g14_Zero':if(v){const scope=String(s.g14Serial=(s.g14Serial||0)+1);for(const x of creatures(s,1-t.p))(x.g14IgnoreScopes??=[]).push(scope);api.lock(s,t.p,{kind:'travelIgnore',player:1-t.p,scope,expires:'end',who:s.active});}break;
 case'g14_Helt':draw(s,t.p,v);break;
 case'g14_TimeWin':if(v){put(s,task('g14_ReturnMana',t.p,t.source));ramp(s,t.p,2);}break;
 case'g14_ReturnMana':{const x=remove(own.mana,v);if(x){clear(x,'hand');own.hand.push(x);}break;}
 case'g14_Chicken':move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g14_MomoShield':if(v){api.shieldTo(s,t.p,v,'hand');}break;
 case'g14_DashDeclare':{const [d,...remaining]=t.remaining;put(s,{...t,remaining,declared:v?[...t.declared,d]:t.declared});break;}
 case'g14_DashResolve':if(v)cast(s,t.p,t.uid,false,null,0,{cost:card(t.source).kirifudaDash},t.origin,'キリフダッシュ',false,v.permit);break;
 case'g14_Breaker':s.attack.g14Breaker=v;api.resolveAttack(s,null);break;
 default:throw Error('未実装の旅路選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c,uid){const op={travelJourney:'Journey',travelAfro:'Afro',travelKatsura:'Katsura',travelPrison:'Prison',travelRevZero:'RevZero',travelG3:'G3',travelZero:'Zero',travelHelt:'Helt',travelOra:'Ora',travelChicken:'Chicken'}[c.effect];if(!op)return false;put(s,task('g14_'+op,p,c.id,{uid}));return true;},
 discarded(s,t,x,actual){if(t.travelKey&&actual)s.g14Discards[t.travelKey].push(x.cardId);},
 entry(s,p,x,options){if(effective(x,s).prisonZero&&!s.players[p].shields.length&&!options.selfMuted&&!api.selfStopped(s,p))on(s,p,x,'g14_RevZero');},
 attackStart(s,p){const other=1-p;if(s.attack.target==='player'&&mmmReady(s,other))for(const x of s.players[other].hand)if(card(x).travelMMM)on(s,other,x,'g14_MMM',{serial:x.zoneSerial||0});},
 attack(s,p,x){if(effective(x,s).travelMMM&&!api.selfStopped(s,p))on(s,p,x,'g14_MMMAttack');},
 decorate(s,p,x,c){return x.g14G?.some(g=>g.turn===s.turn)?{...c,gBreaker:true}:c;},
 inherit(s,base,x){for(const k of['g14IgnoreScopes','g14G','g14Joe'])if(base[k])x[k]=structuredClone(base[k]);},
 allowedSpell(s,p){return s.active!==p||!(s.players[p].g14Spells||0)||!creatures(s,1-p).some(x=>effective(x,s).travelSpellLock);},
 spellCast(s,p){s.players[p].g14Spells=(s.players[p].g14Spells||0)+1;},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).travelMomo).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g14_MomoShield',p,x.cardId)}));},
 battleWins(s,p,w){const x=w&&s.players[p].battle.find(x=>x.uid===w.uid);return x&&effective(x,s).travelTime?[{player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g14_TimeWin',p,x.cardId)}]:[];},
 end(s){return s.players.flatMap((own,p)=>own.battle.flatMap(x=>(x.g14Joe||[]).filter(j=>j.turn===s.turn).map(j=>({player:p,uid:x.uid,source:j.source,effect:'extended',task:task('g14_Joe',p,j.source,{uid:x.uid,incarnation:x.incarnation||0,key:j.key})}))));},
 expire(s,when){if(when==='end'){for(const own of s.players){own.g14Spells=0;for(const top of own.battle)for(const x of api.layers(top)){if(x.g14G)x.g14G=x.g14G.filter(g=>g.turn!==s.turn);if(x.g14Joe)x.g14Joe=x.g14Joe.filter(g=>g.turn!==s.turn);}}}},
 selectBreaker(s,p,x){const c=effective(x,s);if(!c.gBreaker||!c.breaker||s.attack.g14Breaker)return false;choice(s,task('g14_Breaker',p,x.cardId),'この攻撃で使うブレイカーを選ぶ',[opt('G・ブレイカー（攻撃の後、自分も全ブレイク）','g',s.players[1-p].shields.length>Number(c.breaker)?30:5),opt(c.worldBreaker?'ワールド・ブレイカー':c.breaker+'枚をブレイクする','normal',15)]);return true;},
 broken(s,context,n){const a=s.attackLifecycle;if(a&&n&&context?.sourceUid===a.uid&&context.player===a.player&&!context.reverse&&!context.burn)a.broken=true;},
 attackEnd(s,a){if(a.g14G)s.g14AfterAttack=a.g14G;if(a.broken){const remaining=['hand','mana'].flatMap(origin=>s.players[a.player][origin].filter(x=>card(x).kirifudaDash&&(origin==='hand'||api.manaPermits(s,a.player,x).length)).map(x=>({uid:x.uid,source:x.cardId,serial:x.zoneSerial||0,origin})));if(remaining.length)put(s,task('g14_DashDeclare',a.player,remaining[0].source,{remaining,declared:[]}));}},
 advanceAfter(s){const a=s.g14AfterAttack;if(!a||s.attackLifecycle||s.attack||s.decision||s.pendingEffects?.length||s.extTasks?.length||s.triggers||s.judge||s.leaving||s.battleResolution||s.g19BreakSequence||s.g19Interrupt||s.breakContext||s.winner!==null)return;delete s.g14AfterAttack;const ids=s.players[a.p].shields.map(x=>x.uid);if(ids.length){s.breakContext={player:a.p,sourceUid:a.uid,source:a.source,g14Self:true};api.breakShields(s,a.p,ids);}},
 mainActions(s,p){if(creatures(s,1-p).some(x=>effective(x,s).noCostReduction))return [];const own=s.players[p],out=[];for(const origin of['hand','mana','deck'])for(const x of own[origin].filter(x=>card(x).joeDiscount)){const c=card(x),permits=origin==='mana'?api.manaPermits(s,p,x):origin==='deck'?(api.peekTop(s,p)?.uid===x.uid?[null]:[]):[null];if(!permits.length||!api.canCast(s,p,c)||!api.canEnter(s,p,c,{origin,execution:true}))continue;const payment={...c,cost:Math.max(1,cost(c)-c.joeDiscount),printedCost:c.cost,summonOrigin:origin};if(api.canPay(s,p,payment))for(const permit of permits)out.push({kind:'play',alternative:'joe',origin,uid:x.uid,cardId:x.cardId,manaPermit:permit,cost:api.summonCost(s,p,payment),label:c.name+'をJ・O・Eで軽減して召喚'});}return out;},
 beginJoe(s,p,a){const x=s.players[p][a.origin].find(x=>x.uid===a.uid);if(!x)return;const c=card(x);(x.g14Joe??=[]).push({turn:s.turn,key:String(s.g14Serial=(s.g14Serial||0)+1),source:x.cardId});cast(s,p,x.uid,false,null,0,{cost:Math.max(1,cost(c)-c.joeDiscount),printedCost:c.cost},a.origin,'J・O・E',false,a.manaPermit);},
 };
}
