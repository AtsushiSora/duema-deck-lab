// No.21: Twinpact faces, pending cards, simultaneous targets and last-known abilities.
export function createKiyonagaRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,draw,move,cast,enter,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),twin=x=>!!card(x).spellFace;
 const on=(s,p,source,op,more={})=>api.enqueue(s,p,{uid:more.uid,source,effect:'extended',task:task(op,p,source,more)});
 const ramp=(s,p,n)=>{const own=s.players[p],all=own.deck.splice(0,n),to=api.deckRedirect(s)?'grave':'mana';for(const x of all){clear(x,to);own[to].push(x);}log(s,p,'ramp','山札の上から'+all.length+'枚を'+(to==='mana'?'マナ':'墓地')+'へ');api.deckCheck(s,p);return all;};
 const distinct=(list,seen=[])=>!list.length||faces(card(list[0])).some(c=>!seen.includes(c.cost)&&distinct(list.slice(1),[...seen,c.cost]));
 const canPut=(s,p,x,origin,execution=false)=>api.canEnter(s,p,card(x),{origin,execution})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function kiyoRest(s,t){const own=s.players[t.p],to=api.deckRedirect(s)?'grave':'mana',all=[...(own.g21Holding||[]),...t.rest.flatMap(uid=>{const x=remove(own.deck,uid);return x?[x]:[];})];own.g21Holding=[];delete own.g21Protected;for(const x of all){clear(x,to);own[to].push(x);}if(all.length)api.deckCheck(s,t.p);log(s,t.p,'kiyonagaMana','清永で残り'+all.length+'枚を'+(to==='mana'?'マナ':'墓地')+'へ',{cardId:t.source});}
 function run(s,t){if(!t.op.startsWith('g21'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g21KiyoReveal':{const all=own.deck.slice(0,3);log(s,t.p,'reveal','清永で公開：'+all.map(x=>card(x).name).join('、'),{cardId:t.source});if(distinct(all))put(s,task('g21KiyoSelect',t.p,t.source,{uids:all.map(x=>x.uid),selected:[]}));else kiyoRest(s,{...t,rest:all.map(x=>x.uid)});break;}
  case'g21KiyoSelect':{const list=t.uids.filter(uid=>!t.selected.includes(uid)).map(uid=>own.deck.find(x=>x.uid===uid)).filter(x=>x&&card(x).type!=='spell'&&cost(card(x))<=9);choice(s,t,'使うコスト9以下のエレメントをすべて選ぶ（'+t.selected.length+'枚）',[...list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),opt('選択を確定',null,0)]);break;}
  case'g21KiyoUse':{const list=(own.g21Holding||[]).filter(x=>canPut(s,t.p,x,'deck',true)&&api.canCast(s,t.p,card(x)));if(!list.length){kiyoRest(s,t);break;}choice(s,t,'清永で次に使うエレメントを選ぶ',list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;}
  case'g21Gohaten':{for(const p of[s.active,1-s.active]){const own=s.players[p];own.g21ManaPending=own.mana.filter(x=>card(x).type==='creature');own.mana=own.mana.filter(x=>card(x).type!=='creature');}put(s,task('g21GohatenUse',s.active,t.source,{next:1-s.active}));break;}
  case'g21GohatenUse':{const list=(own.g21ManaPending||[]).filter(x=>canPut(s,t.p,x,'mana'));if(!list.length){own.mana.push(...(own.g21ManaPending||[]));own.g21ManaPending=[];if(t.next!==undefined)put(s,task('g21GohatenUse',t.next,t.source));break;}choice(s,t,'轟破天で次にマナから出すクリーチャーを選ぶ',list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;}
  case'g21Enter':{const x=own[t.zone]?.find(x=>x.uid===t.uid);if(!x||!canPut(s,t.p,x,t.origin,t.execution))break;const c=card(x),bases=api.evolutionBases(s,t.p,c);if(c.evolution||c.neoEvolution)choice(s,t,'進化元を選ぶ',[...(c.neoEvolution?[opt('進化させずに出す',false,1)]:[]),...bases.map(x=>opt(card(x).name,x.uid,2,x.cardId))]);else doEnter(s,t,null);break;}
  case'g21BreakNine':{const shields=opp.shields,n=Math.min(9,shields.length);if(n===shields.length){if(n)api.breakShields(s,1-t.p,shields.map(x=>x.uid));}else put(s,task('g21BreakChoose',t.p,t.source,{selected:[],n}));break;}
  case'g21BreakChoose':choice(s,t,'効果でブレイクする9つのシールドを選ぶ',opp.shields.filter(x=>!t.selected.includes(x.uid)).map((x,i)=>opt('シールド'+(opp.shields.indexOf(x)+1),x.uid,1)));break;
  case'g21ZenonRamp':if(creatures(s,t.p).some(twin))ramp(s,t.p,1);break;
  case'g21Zenon':if((s.g21ZenonUsed||{})[t.key]!==s.turn&&api.canCast(s,t.p,faces(card(t.attackerSource))[1]))choice(s,t,'ゼノンで攻撃中のツインパクトの呪文側を唱える？',[opt('呪文側を唱える',true,15,t.attackerSource),skip()]);break;
  case'g21CobaltDraw':choice(s,t,'メヂカラでカードを2枚引く？',[opt('2枚引く',true,own.deck.length>2?10:-10),skip()]);break;
  case'g21CobaltLock':api.lock(s,t.p,{kind:'attack',player:1-t.p,expires:'end',who:s.active});break;
  case'g21Shutter':{const list=creatures(s,1-t.p).filter(x=>!t.selected.includes(x.uid));if(t.selected.length===2||!list.length){finishShutter(s,t);break;}choice(s,t,'タップして次のターン起こさない相手を2体まで選ぶ',[...targetOptions(s,t.p,list),opt('ここまでで確定',null,0)]);break;}
  case'g21DokiBounce':put(s,task('s6Bounce',t.p,t.source),task('draw',t.p,t.source,{n:1}));break;
  case'g21Mega':{const x=own[t.origin].find(x=>x.uid===t.uid&&x.cardId===t.source&&(x.zoneSerial||0)===t.zoneSerial);if(x&&api.canCast(s,t.p,faces(card(x))[1]))choice(s,t,'メガ・ラスト・バーストで呪文側を唱える？',[opt(faces(card(x))[1].name+'を唱える',true,10,x.cardId),skip()]);break;}
  case'g21MinoRecover':choice(s,t,'墓地からマナに置くツインパクトカードを選ぶ',own.grave.filter(twin).map(x=>opt(card(x).name,x.uid,10,x.cardId)));break;
  case'g21MinoAttack':{const n=own.mana.filter(twin).length,list=own.mana.filter(x=>card(x).type==='creature'&&cost(card(x))<n&&canPut(s,t.p,x,'mana'));choice(s,t,'マナのツインパクト'+n+'枚よりコストが小さい1体を出す',[...list.map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;}
  case'g21Hazard':{const x=ramp(s,t.p,1)[0];if(x&&twin(x)&&s.winner===null)draw(s,t.p,1);break;}
  case'g21Fortress':if(t.selected.length===3||!opp.shields.some(x=>!t.selected.includes(x.uid))){finishFortress(s,t);break;}choice(s,t,'墓地に置く相手のシールドを3つまで選ぶ',[...opp.shields.filter(x=>!t.selected.includes(x.uid)).map(x=>opt('シールド'+(opp.shields.indexOf(x)+1),x.uid,10)),opt('ここまでで確定',null,0)]);break;
  case'g21CasaUntap':{const x=own.mana.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.zoneSerial);if(x)x.tapped=false;break;}
  case'g21CasaBounce':{const list=[0,1].flatMap(p=>creatures(s,p).filter(x=>cost(card(x))>=5).map(x=>({player:p,uid:x.uid,to:'hand'})));if(list.length)move(s,list);break;}
  default:throw Error('未実装の清永デッキ効果：'+t.op);
 }return true;}
 function doEnter(s,t,base){const own=s.players[t.p],x=own[t.zone].find(x=>x.uid===t.uid);if(!x)return;if(t.execution){x.g5Origin=t.origin;cast(s,t.p,x.uid,true,base,0,null,t.zone,'清永');api.deckCheck(s,t.p);}else{remove(own[t.zone],x.uid);enter(s,t.p,x,base,{origin:t.origin,execution:false,ignoreEntry:!!t.ignoreEntry});}}
 function finishShutter(s,t){for(const uid of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===uid);if(x){api.tap(s,1-t.p,x);x.skipUntap=true;}}}
 function finishFortress(s,t){for(const uid of t.selected){const x=api.removeShield(s,1-t.p,uid);if(x){clear(x,'grave');s.players[1-t.p].grave.push(x);}}log(s,t.p,'shieldGrave','フォートレスでシールド'+t.selected.length+'つを墓地へ（ブレイクしない）',{cardId:t.source});}
 function chosen(s,t,value){if(!t.op.startsWith('g21'))return false;const own=s.players[t.p];switch(t.op){
  case'g21KiyoSelect':if(value)put(s,{...t,selected:[...t.selected,value]});else{const rest=t.uids.filter(x=>!t.selected.includes(x));own.g21Protected=rest;own.g21Holding=t.selected.map(uid=>remove(own.deck,uid)).filter(Boolean);put(s,task('g21KiyoUse',t.p,t.source,{rest}));if(own.g21Holding.length)api.deckCheck(s,t.p);}break;
  case'g21KiyoUse':put(s,task('g21Enter',t.p,t.source,{zone:'g21Holding',origin:'deck',uid:value,execution:true}),t);break;
  case'g21GohatenUse':put(s,task('g21Enter',t.p,t.source,{zone:'g21ManaPending',origin:'mana',uid:value,execution:false,ignoreEntry:true}),t);break;
  case'g21Enter':doEnter(s,t,value||null);break;
  case'g21BreakChoose':{const selected=[...t.selected,value];if(selected.length===t.n)api.breakShields(s,1-t.p,selected);else put(s,{...t,selected});break;}
  case'g21Zenon':if(value&&(s.g21ZenonUsed||{})[t.key]!==s.turn){(s.g21ZenonUsed??={})[t.key]=s.turn;api.castBattleSpell(s,t.p,t.attacker,t.incarnation,t.attackerSource,'アカシック・ゼノン');}break;
  case'g21CobaltDraw':if(value)draw(s,t.p,2);break;
  case'g21Shutter':if(value)put(s,{...t,selected:[...t.selected,value]});else finishShutter(s,t);break;
  case'g21Mega':if(value){const x=own[t.origin].find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.zoneSerial);if(x){if(t.origin==='grave')api.castBattleSpell(s,t.p,x.uid,0,t.source,'メガ・ラスト・バースト');else cast(s,t.p,x.uid,true,null,1,null,t.origin,'メガ・ラスト・バースト');}}break;
  case'g21MinoRecover':{const x=remove(own.grave,value);if(x){clear(x,'mana');own.mana.push(x);}break;}
  case'g21MinoAttack':if(value)put(s,task('putCreature',t.p,t.source,{uid:value,origin:'mana'}));break;
  case'g21Fortress':if(value)put(s,{...t,selected:[...t.selected,value]});else finishFortress(s,t);break;
  default:throw Error('未実装の清永デッキ選択：'+t.op);
 }return true;}
 return {run,chosen,
  effect(s,p,c){switch(c.effect){case'kiyonagaReveal':put(s,task('g21KiyoReveal',p,c.id));break;case'gohaten':put(s,task('g21Gohaten',p,c.id));break;case'zenonRamp':put(s,task('g21ZenonRamp',p,c.id));break;case'wiseShutter':put(s,task('g21Shutter',p,c.id,{selected:[]}));break;case'dokiBounce':put(s,task('g21DokiBounce',p,c.id));break;case'minogamiRecover':put(s,task('g21MinoRecover',p,c.id));break;case'hazardPact':put(s,task('g21Hazard',p,c.id));break;case'fortress':put(s,task('g21Fortress',p,c.id,{selected:[]}));break;case'casablancaBounce':put(s,task('g21CasaBounce',p,c.id));break;default:return false;}return true;},
  attack(s,p,x){const c=effective(x,s);if(!api.selfStopped(s,p)){if(c.kiyonaga)on(s,p,x.cardId,'g21KiyoReveal');if(c.minogami)on(s,p,x.cardId,'g21MinoAttack');}if(twin(x))for(const z of creatures(s,p))if(effective(z,s).zenon&&(s.g21ZenonUsed||{})[key(z)]!==s.turn)on(s,p,z.cardId,'g21Zenon',{key:key(z),attacker:x.uid,incarnation:x.incarnation||0,attackerSource:x.cardId});},
  entry(s,p,x){if(api.isCreature(s,x))for(const y of creatures(s,1-p))if(effective(y,s).cobalt)on(s,1-p,y.cardId,'g21CobaltLock');},
  spellCast(s,p,c){for(const x of creatures(s,1-p))if(effective(x,s).cobalt)on(s,1-p,x.cardId,'g21CobaltDraw');},
  handMana(s,p,x){for(const c of creatures(s,p))if(effective(c,s).casablanca)on(s,p,c.cardId,'g21CasaUntap',{uid:x.uid,zoneSerial:x.zoneSerial||0});},
  spellShieldTrigger:(s,p)=>creatures(s,p).some(x=>effective(x,s).elizabeth),
  leaveSnapshot(s,rows){return Object.fromEntries(rows.flatMap(({player,uid})=>{const x=s.players[player].battle.find(x=>x.uid===uid);return x&&effective(x,s).megaLastBurst?[[uid,true]]:[];}));},
  leaving(s,p,x,snapshot,to){if(snapshot?.[x.uid]&&['hand','mana','grave'].includes(to))on(s,p,x.cardId,'g21Mega',{uid:x.uid,origin:to,zoneSerial:(x.zoneSerial||0)+1});},
  forceActions(s,p,actions){const entries=a=>a.targets||(['fight','dragonTap'].includes(a.kind)?[{player:1-p,uid:a.target||a.uid}]:[]),forced=t=>{const x=s.players[t.player]?.battle.find(x=>x.uid===t.uid);return t.player!==p&&x&&api.isCreature(s,x)&&effective(x,s).forceTarget;},possible=new Map();for(const a of actions)for(const t of entries(a))if(forced(t)){const set=possible.get(a.kind)||new Set();set.add(t.uid);possible.set(a.kind,set);}return actions.filter(a=>{const ts=entries(a),need=Math.min(ts.length,possible.get(a.kind)?.size||0);return ts.filter(forced).length>=need;});},
 };
}
