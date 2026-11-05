import {forceAttackTargets} from './forced-attack-targets.js?v=0.555.0';
// Requested Joker abilities; physical identities remain stable across choices and WD transformations.
const characterKeys=new Set(['id','name','type','cost','printedCost','power','manaValue','civ','civilizations','race','text','source','limit','supportBatch','supportKind','spellFace','g393JWDFaces']);
export function wdDefinition393(x,base){return base?.g393JWDFaces&&typeof x!=='string'?{...base,...base.g393JWDFaces[x.g393JWDBack?1:0],id:base.id,g393JWDFaces:base.g393JWDFaces}:base;}
export function copiedDefinition393(x,base,lookup){
 if(!x?.g393JCopies?.length)return base;let out={...base},maxCount=base.g393JMaxG?1:0,sigmaCount=base.g393JSigma?1:0;
 for(const row of x.g393JCopies){const copied=lookup(row.cardId);if(!copied)continue;for(const[k,v]of Object.entries(copied)){
  if(characterKeys.has(k)||k==='effect')continue;
  if(k==='g393JMaxG'){if(v)maxCount++;out[k]=!!v||out[k];}
  else if(k==='g393JSigma'){if(v)sigmaCount++;out[k]=!!v||out[k];}
  else if(k==='breaker')out.breaker=out.breaker==='∞'||v==='∞'?'∞':Math.max(out.breaker||1,v);
  else if(k==='attackBonus')out[k]=(out[k]||0)+v;
  else if(k==='g393Change'){out.g393CChangeCopies=[...(out.g393CChangeCopies||[]),structuredClone(v)];out[k]??=structuredClone(v);}
  else if(Array.isArray(v))out[k]=[...(out[k]||[]),...structuredClone(v)];
  else if(k==='g260Self'&&out.g260Self)(out.g268ManaGrants??=[]).push(structuredClone(v));
  else if(typeof v==='boolean')out[k]=!!out[k]||v;
  else if(k.endsWith('Role')&&typeof v==='string'){const roles=out.g393JCopiedRoles??={};roles[k]=[...(roles[k]||(out[k]?[out[k]]:[])),v];out[k]??=v;}
  else out[k]=structuredClone(v);
 }if(copied.sMax||copied.g34SmaxLoss)out.g393JSmaxNames=[...new Set([...(out.g393JSmaxNames||(base.sMax||base.g34SmaxLoss?[base.name]:[])),copied.name])];if(copied.effect&&!out.effect)out.effect=copied.effect;}
 if(maxCount)out.g393JMaxGCount=maxCount;if(sigmaCount)out.g393JSigmaCount=sigmaCount;return out;
}
export function hasCopiedRole393(c,key,role){return c?.[key]===role||!!c?.g393JCopiedRoles?.[key]?.includes(role);}
export function copiedRoles393(c,key){return c?.g393JCopiedRoles?.[key]||(c?.[key]?[c[key]]:[]);}
export function createRequested393JokerRules(api){
 const{card,effective,creatures,task,put,choice,opt,skip,remove,clear,draw,move,targetOptions}=api;
 const identity=x=>({uid:x.uid,incarnation:x.incarnation||0}),live=(s,p,r)=>s.players[p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===(r.incarnation||0)),race=(c,q)=>String(c.race||'').includes(q);
 const enqueue=(s,p,x,op,more={})=>api.enqueue(s,p,{...identity(x),source:x.cardId,effect:'extended',task:task('g393J_'+op,p,x.cardId,{...identity(x),...more})});
 const defs=(s,t,rows)=>put(s,...rows.map(({op,...d})=>task(op.startsWith('g393')||op.startsWith('g34_')?op:'g34_'+op,t.p,t.source,{uid:t.uid,incarnation:t.incarnation||0,...d})));
 const fieldSources=(s,p,side)=>s.players[p].battle.filter(x=>!x.sealed&&!api.ignored(s,x)&&effective(x,s)[side]);
 function flip(s,p,x,back){if(!x||!card(x).g393JWDFaces)return false;x.g393JWDBack=back;api.log(s,p,'transform',card(x).name+'側にする',{cardId:x.cardId});return true;}
 function copyCard(s,p,x,source){if(!x||!source)return;const c=card(source);if(!['creature','seed'].includes(c.type)||!['ジョーカーズ','レクスターズ'].some(q=>race(c,q)))return;(x.g393JCopies??=[]).push({key:x.uid+'@'+(x.incarnation||0)+':copy:'+(s.g393JCopySerial=(s.g393JCopySerial||0)+1),cardId:source.cardId,expiresPlayer:1-p});api.log(s,p,'abilityGrant',card(x).name+'が'+c.name+'の能力を次の相手のターンの終わりまで得る',{cardId:x.cardId});}
 function run(s,t){if(!t.op.startsWith('g393J_'))return false;const own=s.players[t.p];switch(t.op){
  case'g393J_MaxG':put(s,{...t,op:'g393J_MaxGMana'});draw(s,t.p,1);break;
  case'g393J_MaxGMana':if(own.hand.length)choice(s,t,'マナに置く自分の手札を1枚選ぶ',own.hand.map(x=>opt(card(x).name,x.uid,5,card(x).id)));break;
  case'g393J_ZeroTarget':choice(s,t,'パワーを0にする相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
  case'g393J_ZeroExact':{const y=live(s,t.owner,t.target);if(y)y.g393JZero={turn:s.turn};break;}
  case'g393J_WDStart':if(!own.shields.length)break;choice(s,t,'シールド1つを墓地へ置いて1枚引き、次の召喚を2軽減する？',[opt('使う',true,own.deck.length>1?12:-1000),skip()]);break;
  case'g393J_WDShield':{const rows=own.shields.filter(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld));if(rows.length)choice(s,t,'墓地に置く自分のシールドを1つ選ぶ',rows.map((x,i)=>opt('シールド '+(i+1),x.uid,10)));break;}
  case'g393J_WDDraw':draw(s,t.p,1);(s.g393JDiscounts??=[]).push({p:t.p,turn:s.turn,n:2});break;
  case'g393J_WDFlip':{const x=live(s,t.p,t);if(x&&effective(x,s).g393JWDBack)choice(s,t,'欲望の邪道 ニガ=アブシューム側にする？',[opt('ニガ=アブシューム側にする',true,10),skip()]);break;}
  case'g393J_Destroy':{const x=live(s,t.owner,t.target);if(x)move(s,[{player:t.owner,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
  default:throw Error('未実装の追加ジョーカーズ処理：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g393J_'))return false;switch(t.op){
  case'g393J_MaxGMana':{const x=remove(s.players[t.p].hand,v);if(x){clear(x,'mana');const dest=api.manaRedirect(s,t.p)?'grave':'mana';api.addZone(s,t.p,dest,x);if(dest==='mana'){api.handMana(s,t.p,x);copyCard(s,t.p,live(s,t.p,t),x);}}break;}
  case'g393J_ZeroTarget':{const owner=1-t.p,x=live(s,owner,{uid:v,incarnation:s.players[owner].battle.find(y=>y.uid===v)?.incarnation||0});if(x)x.g393JZero={turn:s.turn};break;}
  case'g393J_WDStart':if(v)put(s,{...t,op:'g393J_WDShield'});break;
  case'g393J_WDShield':if(v){const moved=api.moveShield(s,t.p,v,'grave');if(moved.length)put(s,{...t,op:'g393J_WDDraw'});}break;
  case'g393J_WDFlip':if(v)flip(s,t.p,live(s,t.p,t),false);break;
  default:throw Error('未実装の追加ジョーカーズ選択：'+t.op);
 }return true;}
 return{run,chosen,
  effect(s,p,c,uid,entry){const x=s.players[p].battle.find(x=>x.uid===uid);if(!x)return false;if(c.id===x.cardId)c=effective(x,s);if(!c.g393JMaxG&&!c.g393JSigma)return false;const rows=[];if(c.g393JMaxG&&x.summonedTurn===s.turn)for(let n=0;n<(c.g393JMaxGCount||1);n++)rows.push({op:'g393J_MaxG'});if(c.g393JSigma)for(let n=0;n<(c.g393JSigmaCount||1);n++)rows.push({op:'g393J_ZeroTarget'});rows.push(...(c.g34Tasks||[]));defs(s,{p,source:c.id,...identity(x)},rows);return true;},
  start(s,p){const out=[];for(const x of creatures(s,p)){const c=effective(x,s);if(!x.sealed&&c.g393JMaxG)for(let n=0;n<(c.g393JMaxGCount||1);n++)out.push({player:p,...identity(x),source:x.cardId,effect:'extended',task:task('g393J_MaxG',p,x.cardId,identity(x))});}for(const x of fieldSources(s,p,'g393JWDBack'))out.push({player:p,...identity(x),source:x.cardId,effect:'extended',task:task('g393J_WDStart',p,x.cardId,identity(x))});return out;},
  attack(s,p,x){const c=effective(x,s);if(!x.sealed&&!api.selfStopped(s,p)&&c.g393JSigma)for(let n=0;n<(c.g393JSigmaCount||1);n++)enqueue(s,p,x,'ZeroTarget');},
  attackStart(s,p,x){if(s.g23Attacks?.[p]?.turn!==s.turn||s.g23Attacks[p].count!==1)return;for(const y of creatures(s,1-p))if(!y.sealed&&effective(y,s).g393JSigma)for(let n=0;n<(effective(y,s).g393JSigmaCount||1);n++)enqueue(s,1-p,y,'ZeroExact',{owner:p,target:identity(x)});},
  canLeave(s,p,x){return !(effective(x,s).g393JSigma&&api.power(x,false,s)<=0);},
  forceActions(s,p,actions){return forceAttackTargets(s,p,actions,api);},
  shieldTrigger(s,p,x,c=card(x)){return !!c.g393JThunder&&s.players[p].battle.filter(y=>!y.sealed&&race(effective(y,s),'ジョーカーズ')).length+s.players[p].mana.filter(y=>!y.faceDown&&api.faces(card(y)).some(c=>race(c,'ジョーカーズ'))).length>=7;},
  judgeRevealed(s,p,x){if(card(x).g393JPurin)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Target',p,x.cardId,{anyOwner:true,g235TapOrUntap:true,title:'プリン：タップまたはアンタップするクリーチャーを選ぶ'})});},
  shieldLeft(s,p,card,group){if(!group)return;for(const x of fieldSources(s,p,'g393JWDBack'))enqueue(s,p,x,'WDFlip');},
  broken(s,context,count){if(!count||!context||context.reverse)return;const p=context.player,target={uid:context.sourceUid,incarnation:context.incarnation??(s.players[p].battle.find(x=>x.uid===context.sourceUid)?.incarnation||0)};if(!target.uid)return;for(const owner of[s.active,1-s.active])for(const x of fieldSources(s,owner,'g393JWDFront'))enqueue(s,owner,x,'Destroy',{owner:p,target});},
  nextDiscount(s,p){return(s.g393JDiscounts||[]).filter(r=>r.p===p&&r.turn===s.turn).reduce((n,r)=>n+r.n,0);},
  summoned(s,p){s.g393JDiscounts=(s.g393JDiscounts||[]).filter(r=>r.p!==p||r.turn!==s.turn);},
  expire(s,when,p){if(when!=='end')return;s.g393JDiscounts=(s.g393JDiscounts||[]).filter(r=>r.turn!==s.turn);for(const own of s.players)for(const x of own.battle){x.g393JCopies=(x.g393JCopies||[]).filter(r=>r.expiresPlayer!==p);if(x.g393JZero?.turn===s.turn)delete x.g393JZero;}},
  leaveOptions(s,row,batch){if(row.to!=='grave'||row.destroy===false||!api.isCreature(s,s.players[row.player].battle.find(x=>x.uid===row.uid)))return[];return fieldSources(s,row.player,'g393JWDFront').filter(x=>!batch.rows.some(r=>r.plan?.kind==='g393JWD'&&r.plan.uid===x.uid)).map(x=>opt(card(x).name+'を獄鬼夜城側にして破壊を置き換える',{uid:x.uid,incarnation:x.incarnation||0},30,x.cardId));},
  applyLeaveReplacement(s,row,plan){if(plan.kind!=='g393JWD')return false;const x=live(s,row.player,plan);if(!x||!effective(x,s).g393JWDFront)return false;flip(s,row.player,x,true);return true;}
 };
}
