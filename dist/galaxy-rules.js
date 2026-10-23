// No.22: serializable continuations and permissions for the Galaxy list.
export function createGalaxyRules(api){
 const {card,faces,cost,colors,effective,power,creatures,put,task,choice,opt,skip,remove,clear,move,cast,draw,log,targetOptions}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),snow=c=>String(c.race).includes('スノーフェアリー');
 const blocked=(s,p)=>creatures(s,1-p).some(x=>effective(x,s).noCostReduction);
 const reducers=(s,p,c)=>snow(c)&&!blocked(s,p)?creatures(s,p).filter(x=>effective(x,s).snowDiscount&&(s.g22UsedDiscount||{})[key(x)]!==s.turn):[];
 const chosenReducers=(s,p,c)=>reducers(s,p,c).filter(x=>!c.snowReducers||c.snowReducers.includes(key(x)));
 const manaAuthorities=(s,p)=>creatures(s,p).filter(x=>effective(x,s).manaOnce&&(s.g22UsedMana||{})[key(x)]!==s.turn);
 const effect=(s,p,source,op,more={})=>api.enqueue(s,p,{source,effect:'extended',task:task(op,p,source,more)});
 const discardSequence=(s,t,n,follow,optional=false)=>{const id=String(s.g22Serial=(s.g22Serial||0)+1);(s.g22Discards??={})[id]=[];put(s,task('discard',t.p,t.source,{causedBy:t.p,n,optional,galaxyKey:id}),task(follow,t.p,t.source,{key:id}));};
 function run(s,t){if(!t.op.startsWith('g22'))return false;const own=s.players[t.p],opp=s.players[1-t.p];switch(t.op){
  case'g22Blaze':put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}),task('draw',t.p,t.source,{n:1}));break;
  case'g22Master':put(s,{...t,op:'g22MasterDiscard'});if(own.mana.some(x=>api.manaColors(card(x),s,t.p).includes('火')))draw(s,t.p,1);break;
  case'g22MasterDiscard':discardSequence(s,t,own.hand.length,'g22AfterMaster',true);break;
  case'g22AfterMaster':{const n=s.g22Discards[t.key].length;delete s.g22Discards[t.key];put(s,...Array.from({length:n},()=>task('destroyPower',t.p,t.source,{max:6000})));break;}
  case'g22UntapMana':{const list=own.mana.filter(x=>x.tapped&&!t.selected.includes(x.uid));if(t.selected.length===2||!list.length){for(const uid of t.selected){const x=own.mana.find(x=>x.uid===uid);if(x)x.tapped=false;}break;}choice(s,t,'アンタップするマナを2枚まで選ぶ',[...list.map(x=>opt(card(x).name,x.uid,10,card(x).id)),opt('ここまでで確定',null,0)]);break;}
  case'g22FairySpell':discardSequence(s,t,1,'g22AfterFairy');break;
  case'g22AfterFairy':{const ids=s.g22Discards[t.key];delete s.g22Discards[t.key];put(s,task('destroyPower',t.p,t.source,{max:6000}),...(ids.some(id=>faces(card(id)).some(snow))?[task('destroyPower',t.p,t.source,{max:6000})]:[]));break;}
  case'g22Shuffle':choice(s,t,'山札に戻してシャッフルする墓地を選ぶ',[opt('自分の墓地',t.p,own.deck.length<8?30:5),opt('相手の墓地',1-t.p,opp.grave.length)]);break;
  case'g22ManaPermit':choice(s,t,'このターン、マナから召喚できるクリーチャーを選ぶ',own.mana.filter(x=>card(x).type==='creature').map(x=>opt(card(x).name,x.uid,cost(card(x)),card(x).id)));break;
  case'g22Speed':if(own.mana.some(x=>api.manaColors(card(x),s,t.p).includes('火')))choice(s,t,'スピードアタッカーを与える他のクリーチャーを選ぶ',creatures(s,t.p).filter(x=>x.uid!==t.uid).map(x=>opt(card(x).name,x.uid,x.entered===s.turn?20:0,x.cardId)));break;
  case'g22BounceEnd':{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x)move(s,[{player:t.p,uid:x.uid,to:'hand'}]);break;}
  case'g22Replace':choice(s,t,'バトルゾーンに出ることを置き換える効果を選ぶ',s.g22Entry.choices.map((x,i)=>opt(card(x.source).name+'：'+(x.to==='mana'?'マナへ':'墓地へ'),i,x.to==='grave'?5:10,x.source)));break;
  default:throw Error('未実装のギャラクシー効果：'+t.op);
 }return true;}
 function chosen(s,t,value){if(!t.op.startsWith('g22'))return false;const own=s.players[t.p];switch(t.op){
  case'g22UntapMana':if(value)put(s,{...t,selected:[...t.selected,value]});else for(const uid of t.selected){const x=own.mana.find(x=>x.uid===uid);if(x)x.tapped=false;}break;
  case'g22Shuffle':{const p=s.players[value],all=p.grave.splice(0);for(const x of all)clear(x,'deck');api.shuffleLibrary(s,value,all,t.source);log(s,t.p,'shuffleGrave','選んだプレイヤーの墓地を山札に戻してシャッフルする',{cardId:t.source});break;}
  case'g22ManaPermit':{const x=own.mana.find(x=>x.uid===value);if(x)x.g22ManaAllowed=s.turn;break;}
  case'g22Speed':{const x=own.battle.find(x=>x.uid===value);if(x)x.gospelSpeed=s.turn;break;}
  case'g22Replace':applyReplacement(s,value);break;
  default:throw Error('未実装のギャラクシー選択：'+t.op);
 }return true;}
 function replacementOptions(s,p,c,origin,execution=true){const list=[];if(api.wouldEnterCreature(s,p,c)&&!String(c.race).includes('ドラゴン'))for(const owner of[0,1])for(const x of creatures(s,owner))if(effective(x,s).dragonOnlyEntry)list.push({source:x.cardId,owner,to:'grave'});if(origin==='deck')for(const owner of[0,1])for(const x of s.players[owner].battle)if(effective(x,s).deckRedirect)list.push({source:x.cardId,owner,to:'grave'});for(const x of creatures(s,1-p)){const d=effective(x,s);if(d.gaiaEntry&&c.type==='creature'&&/このクリーチャー(?:が|を)(?:バトルゾーンに)?(?:召喚によって)?出(?:た|した)(?:時|とき)/.test(c.text||''))list.push({source:x.cardId,owner:1-p,to:'mana'});if(d.noNonsummonEntry&&s.active===p&&c.type==='creature'&&execution===false)list.push({source:x.cardId,owner:1-p,to:'grave'});if(d.magnum&&s.active===1-p&&c.type==='creature')list.push({source:x.cardId,owner:1-p,to:'grave'});if(d.tokoshie&&origin!=='hand')list.push({source:x.cardId,owner:1-p,to:'mana'});if(d.caddy&&s.active===p&&c.type==='creature'&&cost(c)>s.players[p].mana.length)list.push({source:x.cardId,owner:1-p,to:'mana'});if(d.segare&&c.type==='creature'&&cost(c)>s.players[p].mana.length)list.push({source:x.cardId,owner:1-p,to:'mana',segare:x.uid});}return list;}
 function applyReplacement(s,index){const e=s.g22Entry,r=e.choices[index],own=s.players[e.p],x=e.inst;delete s.g22Entry;if(e.options.mugenBases&&!card(r.source).tokoshie)api.attachMugenBases(s,e.p,x,e.options.mugenBases);const all=api.layers(x);for(const y of all)if(e.options.origin!==r.to||y!==x)clear(y,r.to);api.addZone(s,e.p,r.to,...all);log(s,e.p,'entryReplace',card(r.source).name+'でバトルゾーンのかわりに'+(r.to==='mana'?'マナ':'墓地')+'へ',{cardId:x.cardId});if(r.segare&&s.players[1-e.p].battle.some(x=>x.uid===r.segare))move(s,[{player:1-e.p,uid:r.segare,to:'mana'}]);}
 function variants(s,p,c){const list=reducers(s,p,c).map(key),subsets=list.reduce((all,x)=>[...all,...all.map(a=>[...a,x])],[[]]);return subsets.filter(x=>x.length!==list.length);}
 function playAllowed(s,p,c,origin){return api.canCast(s,p,c)&&api.canEnter(s,p,c,{origin,execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length);}
 return {run,chosen,manaPermits(s,p,x){return [...(x.g22ManaAllowed===s.turn?[null]:[]),...manaAuthorities(s,p).map(key)];},
  effect(s,p,c){switch(c.effect){case'destroy6000':put(s,task('destroyPower',p,c.id,{max:6000}));break;case'masterGGGLoot':put(s,task('g22Master',p,c.id));break;case'untapTwoMana':put(s,task('g22UntapMana',p,c.id,{selected:[]}));break;case'fairyDiscard6000':put(s,task('g22FairySpell',p,c.id));break;case'graveShuffle':put(s,task('g22Shuffle',p,c.id));break;case'permitManaSummon':put(s,task('g22ManaPermit',p,c.id));break;default:return false;}return true;},
  discount:(s,p,c)=>chosenReducers(s,p,c).length,
  played(s,p,c,inst,origin,permit){for(const x of chosenReducers(s,p,c))(s.g22UsedDiscount??={})[key(x)]=s.turn;if(origin==='mana'){delete inst.g22ManaAllowed;if(permit)(s.g22UsedMana??={})[permit]=s.turn;}},
  discarded(s,t,x,actual){if(t.galaxyKey&&actual)s.g22Discards[t.galaxyKey].push(x.cardId);},
  attack(s,p,x){const d=effective(x,s);if(api.selfStopped(s,p))return;if(d.giveSpeedOnAttack)effect(s,p,x.cardId,'g22Speed',{uid:x.uid});if(d.blazeLoot)effect(s,p,x.cardId,'g22Blaze');},
  end(s){return creatures(s,s.active).filter(x=>effective(x,s).bounceUntappedEnd&&!x.tapped).map(x=>({player:s.active,source:x.cardId,effect:'extended',task:task('g22BounceEnd',s.active,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
  entryWouldReplace:(s,p,c,origin='hand',execution=true)=>replacementOptions(s,p,c,origin,execution).length>0,
  replaceEntry(s,p,inst,baseUid,options){const all=replacementOptions(s,p,card(inst),options.origin||'hand',options.execution);if(!all.length)return false;const owner=all.some(x=>x.owner===s.active)?s.active:1-s.active,choices=all.filter(x=>x.owner===owner);s.g22Entry={p,inst,baseUid,options,choices};if(choices.length===1)applyReplacement(s,0);else put(s,task('g22Replace',owner,inst.cardId));return true;},
  mainActions(s,p){const own=s.players[p],out=[];for(const inst of own.hand){for(const [face,c]of faces(card(inst)).entries())if(playAllowed(s,p,c,'hand')){for(const keys of variants(s,p,c)){const pay={...c,snowReducers:keys};if(api.canPay(s,p,pay))out.push({kind:'play',uid:inst.uid,cardId:inst.cardId,face,cost:api.summonCost(s,p,pay),snowReducers:keys,label:c.name+'を軽減の使用先を選んで使う'});}if(c.type==='creature'&&(c.masterGGG&&own.hand.length===1||c.gZeroFour&&creatures(s,p).length>=4&&!creatures(s,p).some(x=>x.cardId===c.id)))out.push({kind:'play',uid:inst.uid,cardId:inst.cardId,cost:0,freeSummon:c.masterGGG?'マスターG・G・G':'G・ゼロ',label:c.name+'を'+(c.masterGGG?'マスターG・G・G':'G・ゼロ')+'で召喚'});}}
   const authorities=manaAuthorities(s,p);for(const x of own.mana)if(card(x).type==='creature'&&(x.g22ManaAllowed===s.turn||authorities.length)&&playAllowed(s,p,card(x),'mana')){for(const permit of[...(x.g22ManaAllowed===s.turn?[null]:[]),...authorities.map(key)]){if(card(x).gZeroFour&&creatures(s,p).length>=4&&!creatures(s,p).some(y=>y.cardId===x.cardId))out.push({kind:'play',origin:'mana',uid:x.uid,cardId:x.cardId,cost:0,manaPermit:permit,freeSummon:'G・ゼロ',label:'マナから'+card(x).name+'をG・ゼロで召喚'});for(const keys of[undefined,...variants(s,p,card(x))]){const c={...card(x),summonOrigin:'mana',...(keys?{snowReducers:keys}:{})};if(api.canPay(s,p,c))out.push({kind:'play',origin:'mana',uid:x.uid,cardId:x.cardId,cost:api.summonCost(s,p,c),manaPermit:permit,...(keys?{snowReducers:keys}:{}),label:'マナから'+c.name+'を召喚する'});}}}
   return out;
  },
 };
}
