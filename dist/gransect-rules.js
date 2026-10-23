// No.16: current battlefield types, optional choices and serialized reveal continuations.
export function createGransectRules(api){
 const {card,faces,cost,colors,effective,power,creatures,put,task,choice,opt,skip,remove,clear,draw,move,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(s,p,source,op,more={})=>api.enqueue(s,p,{source,uid:more.uid,effect:'extended',task:task(op,p,source,more)});
 function ramp(s,p,n,tapped=false){const own=s.players[p],all=own.deck.splice(0,n),to=api.deckRedirect(s,p)?'grave':'mana';for(const x of all){clear(x,to);if(tapped&&to==='mana')x.tapped=true;own[to].push(x);}log(s,p,'ramp','山札の上から'+all.length+'枚を'+(to==='mana'?'マナ':'墓地')+'へ');api.deckCheck(s,p);return all;}
 function finishReveal(s,t){const own=s.players[t.p];for(const uid of t.selected){const x=remove(own.deck,uid);if(x){clear(x,'hand');own.hand.push(x);}}if(t.selected.length)api.deckCheck(s,t.p);const rest=t.uids.filter(uid=>!t.selected.includes(uid));if(t.bottom)put(s,task('g20Bottom',t.p,t.source,{uids:rest}));else{let moved=0;for(const uid of rest){const x=remove(own.deck,uid);if(x){const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);if(to==='mana')x.tapped=true;own[to].push(x);moved++;}}if(moved)api.deckCheck(s,t.p);}}
 function run(s,t){if(!t.op.startsWith('g16'))return false;const own=s.players[t.p];switch(t.op){
  case'g16ShakoRecycle':{const all=own.grave.splice(0);for(const x of all)clear(x,'deck');own.deck=api.shuffled([...own.deck,...all],Math.floor(api.random(s)*4294967296));log(s,t.p,'shuffleGrave','シャコガイルで自分の墓地を山札に戻してシャッフル',{cardId:t.source});break;}
  case'g16ShakoStart':put(s,task('draw',t.p,t.source,{n:5}),task('discard',t.p,t.source,{causedBy:t.p,n:3}));break;
  case'g16Nacht':ramp(s,t.p,2);put(s,task('g16ManaReturn',t.p,t.source));break;
  case'g16ManaReturn':choice(s,t,'マナから手札に戻すクリーチャーを選ぶ',own.mana.filter(x=>card(x).type==='creature').map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)));break;
  case'g16NachtReturn':{const x=own.mana.find(x=>x.uid===t.uid);if(x&&card(x).manaReturnStart)choice(s,t,'ジーク・ナハトファルターをマナから手札に戻す？',[opt('手札に戻す',true,own.hand.length<3?10:-1,x.cardId),skip()]);break;}
  case'g16NaturalGo':{const list=['hand','mana'].flatMap(origin=>own[origin].filter(x=>card(x).type==='creature'&&colors(card(x)).includes('自然')&&cost(card(x))<=6&&api.canEnter(s,t.p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,t.p,card(x)).length)).map(x=>opt((origin==='hand'?'手札：':'マナ：')+card(x).name,{uid:x.uid,origin},15+cost(card(x)),x.cardId)));choice(s,t,'自然のコスト6以下を手札かマナから出す',[...list,skip()]);break;}
  case'g16RecyclePlayer':choice(s,t,'墓地をシャッフルして山札の下に置くプレイヤー',[opt('自分',t.p,own.grave.length),opt('相手',1-t.p,s.players[1-t.p].grave.length)]);break;
  case'g16HercAttack':put(s,task('g16ManaTarget',t.p,t.source,{max:'∞'}),task('g16OptionalRamp',t.p,t.source));break;
  case'g16OptionalRamp':choice(s,t,'山札の上から何枚マナに置く？',[0,1,2].map(n=>opt(n+'枚',n,n&&own.deck.length>n?5+n:0)));break;
  case'g16ManaTarget':choice(s,t,'マナに置く相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>t.max==='∞'||power(x,x.uid===s.attack?.attacker,s)<=t.max)));break;
  case'g16Howl':{const p=1-t.p,max=s.players[p].mana.length,list=creatures(s,p).filter(x=>cost(card(x))>max);if(list.length)move(s,list.map(x=>({player:p,uid:x.uid,to:'mana'})));break;}
  case'g16Reveal':{const uids=own.deck.slice(0,t.n).map(x=>x.uid),hits=uids.filter(uid=>{const x=own.deck.find(x=>x.uid===uid);return card(x).type==='creature'&&Number(card(x).power)>=12000;});log(s,t.p,'reveal','山札の上'+t.n+'枚を公開：'+own.deck.slice(0,t.n).map(x=>card(x).name).join('、'),{cardId:t.source});if(t.all||!hits.length)finishReveal(s,{...t,uids,selected:hits});else put(s,{...t,op:'g16RevealSelect',uids,hits,selected:[]});break;}
  case'g16RevealSelect':{const list=t.hits.filter(uid=>!t.selected.includes(uid));if(!list.length){finishReveal(s,t);break;}choice(s,t,'手札に加えるパワー12000以上を選ぶ（'+t.selected.length+'枚）',[...list.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,10+cost(card(x)),x.cardId);}),opt('ここまでで確定',null,0)]);break;}
  case'g16Plant':{const x=ramp(s,t.p,1)[0];if(x&&card(x).type==='creature'&&Number(card(x).power)>=12000&&s.winner===null)ramp(s,t.p,1);break;}
  case'g16Smash':{const c=card(t.source);if(faces(c)[1]&&api.canCast(s,t.p,faces(c)[1]))choice(s,t,'スマッシュ・バーストで呪文側を唱える？',[opt('ソニック・ダンスを唱える',true,creatures(s,1-t.p).some(x=>power(x,false,s)<=7000)?20:-1,c.id),skip()]);break;}
  case'g16Defend':api.defend(s,t.p,t.uid,t.kind,t.incarnation);break;
  case'g16DefenseSelect':{const list=api.defenseOptions(s,t.p).filter(x=>!t.selected.some(y=>y.kind===x.kind&&y.uid===x.uid));choice(s,t,'使うブロッカー・ガードマンをすべて選ぶ（'+t.selected.length+'件）',[...list.map(x=>opt(x.label,{kind:x.kind,uid:x.uid},5,x.cardId)),opt('選択を確定',null,t.selected.length?10:0)]);break;}
  case'g16Deathmatch':{const a=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation),b=s.players[t.owner].battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetIncarnation);if(a&&b&&api.isCreature(s,a)&&api.isCreature(s,b))choice(s,t,'デスマッチ・ビートルで出たクリーチャーとバトルする？',[opt('バトルする',true,power(a,false,s)>power(b,false,s)?20:-10,a.cardId),skip()]);break;}
  default:throw Error('未実装のグランセクト効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g16'))return false;const own=s.players[t.p];switch(t.op){
  case'g16ManaReturn':{const x=remove(own.mana,value);if(x){clear(x,'hand');own.hand.push(x);}break;}
  case'g16NachtReturn':if(value){const x=remove(own.mana,t.uid);if(x){clear(x,'hand');own.hand.push(x);}}break;
  case'g16NaturalGo':if(value)put(s,task('putCreature',t.p,t.source,value));break;
  case'g16RecyclePlayer':{const p=s.players[value],all=api.shuffled(p.grave.splice(0),Math.floor(api.random(s)*4294967296));for(const x of all)clear(x,'deck');p.deck.push(...all);log(s,t.p,'shuffleGrave','選んだプレイヤーの墓地をシャッフルして山札の下へ',{cardId:t.source});break;}
  case'g16OptionalRamp':if(value)ramp(s,t.p,value);break;
  case'g16ManaTarget':if(value)move(s,[{player:1-t.p,uid:value,to:'mana'}]);break;
  case'g16RevealSelect':if(value)put(s,{...t,selected:[...t.selected,value]});else finishReveal(s,t);break;
  case'g16Smash':if(value)api.castBattleSpell(s,t.p,t.uid,t.incarnation,t.source);break;
  case'g16DefenseSelect':if(value)put(s,{...t,selected:[...t.selected,value]});else if(s.attack){s.attack.stage='redirecting';for(const x of t.selected){const inst=own.battle.find(y=>y.uid===x.uid);if(inst)on(s,t.p,inst.cardId,'g16Defend',{uid:x.uid,kind:x.kind,incarnation:inst.incarnation||0});}}break;
  case'g16Deathmatch':if(value){const a=own.battle.find(x=>x.uid===t.uid),b=s.players[t.owner].battle.find(x=>x.uid===t.target);if(a&&b)api.battle(s,t.p,a,t.owner,b,s.attack?.attacker);}break;
  default:throw Error('未実装のグランセクト選択：'+t.op);
 }return true;}
 return{run,chosen,manaPermits(s,p){return s.players[p].battle.filter(x=>effective(x,s).hercules&&s.g16UsedMana?.[key(x)]!==s.turn).map(x=>'g16:'+key(x));},
  effect(s,p,c){switch(c.effect){case'shakoRecycle':put(s,task('g16ShakoRecycle',p,c.id));break;case'naturalGo':put(s,task('g16NaturalGo',p,c.id));break;case'herculesRecycle':put(s,task('g16RecyclePlayer',p,c.id));break;case'jurassicHowl':put(s,task('g16Howl',p,c.id));break;case'corenReveal':put(s,task('g16Reveal',p,c.id,{n:3}));break;case'plantRamp':put(s,task('g16Plant',p,c.id));break;case'sonicMana':put(s,task('g16ManaTarget',p,c.id,{max:7000}));break;case'jumboReveal':put(s,task('g16Reveal',p,c.id,{n:4,all:true,bottom:true}));break;case'granRamp':put(s,task('g20Ramp',p,c.id,{n:1}));break;default:return false;}return true;},
  discount(s,p,c){if(c.type!=='creature')return 0;const n=creatures(s,p).filter(x=>power(x,false,s)>=12000).length,grants=(c.summonOrigin||'hand')==='hand'?creatures(s,p).filter(x=>effective(x,s).gale).length*2:0;return n*((c.sympathyBig||0)+grants);},
  start(s,p){const list=[];for(const x of s.players[p].mana)if(card(x).manaReturnStart)list.push({player:p,source:x.cardId,uid:x.uid,effect:'extended',task:task('g16NachtReturn',p,x.cardId,{uid:x.uid})});for(const x of creatures(s,1-p))if(effective(x,s).shako)list.push({player:1-p,source:x.cardId,uid:x.uid,effect:'extended',task:task('g16ShakoStart',1-p,x.cardId)});return list;},
  entry(s,p,x,options){if(!api.isCreature(s,x))return;for(const y of creatures(s,p))if(effective(y,s).nacht&&power(x,false,s)>=12000&&(y.uid!==x.uid||!(options.selfMuted||api.selfStopped(s,p))))on(s,p,y.cardId,'g16Nacht');if(p===s.active&&!options.costPaid)for(const y of creatures(s,1-p))if(effective(y,s).deathmatch)on(s,1-p,y.cardId,'g16Deathmatch',{uid:y.uid,incarnation:y.incarnation||0,owner:p,target:x.uid,targetIncarnation:x.incarnation||0});},
  spellCast(s,p,c){if(c.name.includes('トラップ'))for(const x of creatures(s,p))if(effective(x,s).naturalGo)on(s,p,x.cardId,'g16NaturalGo');},
  attack(s,p,x){const c=effective(x,s);if(!api.selfStopped(s,p)){if(c.hercules)on(s,p,x.cardId,'g16HercAttack');if(c.smashBurst)on(s,p,x.cardId,'g16Smash',{uid:x.uid,incarnation:x.incarnation||0});}},
  mainActions(s,p){const own=s.players[p],sources=own.battle.filter(x=>effective(x,s).hercules&&(s.g16UsedMana||{})[key(x)]!==s.turn);return sources.flatMap(source=>own.mana.filter(x=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin:'mana',execution:true})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length)&&api.canPay(s,p,{...card(x),summonOrigin:'mana'})).map(x=>({kind:'play',origin:'mana',manaPermit:'g16:'+key(source),uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,{...card(x),summonOrigin:'mana'}),label:'ヘラクレスでマナの'+card(x).name+'を召喚'})));},
  played(s,p,c,inst,origin,permit){if(origin==='mana'&&permit?.startsWith('g16:'))(s.g16UsedMana??={})[permit.slice(4)]=s.turn;},
 };
}
