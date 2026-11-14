// Competing battle replacements use turn-player priority and never chain (QA 40676).
export function createRequested393SuperguardRules(api){
 const{card,effective,creatures,put,task,choice,opt,skip}=api;
 const ref=(p,x)=>({p,uid:x.uid,incarnation:x.incarnation||0});
 const live=(s,r)=>s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===(r.incarnation||0)&&!x.sealed&&api.isCreature(s,x));
 const canMove=(s,p,x,controller)=>!x.faceDown&&api.canLeave(s,p,x,{destroy:false})&&
  !api.manaMoveForbidden(s,p,x)&&(p===controller||!api.extremeProtected(s,p));
 function candidates(s,t,p){
  const participants=t.rows.map(r=>live(s,r));
  if(participants.some(x=>!x))return [];
  const out=[];
  for(let row=0;row<t.rows.length;row++){
   const r=t.rows[row],original=participants[row];if(r.p!==p)continue;
   const opposing=t.rows[1-row].p!==p,originalCard=effective(original,s);
   const giant=opposing&&String(originalCard.race||'').includes('ジャイアント');
   const fire=opposing&&(originalCard.civilizations||String(originalCard.civ||'').split('/')).includes('火');
   const replace=originalCard.g1195BattleMove;
   if(replace?.to==='mana'&&api.ownCondition(s,p,replace.condition)&&
    participants.every((x,i)=>canMove(s,t.rows[i].p,x,p)))
    out.push({row,kind:'moveBoth',mandatory:true,...ref(p,original),cardId:original.cardId});
   for(const x of creatures(s,p)){
    if(replace?.to==='hand'&&!x.sealed&&canMove(s,p,x,p))
     out.push({row,kind:'returnOwn',mandatory:true,...ref(p,x),cardId:x.cardId});
    if(x.sealed||t.rows.some(r=>r.p===p&&r.uid===x.uid))continue;
    const c=effective(x,s),kinds=[...(c.superGuardman&&!x.tapped?['super']:[]),...(giant&&c.galacticBattle?['galactic']:[]),...(fire&&c.g588FireBattleReplace?['fire']:[])];
    if(opposing&&c.g1195BattleProxy&&!x.faceDown)kinds.push('proxy');
    if(c.g1071BattleProxy)kinds.push('kenji');
    if(originalCard.g762BattleProxyRace&&String(c.race||'').includes(originalCard.g762BattleProxyRace))kinds.push('raceProxy');
    for(const kind of kinds)out.push({row,kind,...ref(p,x),cardId:x.cardId});
   }
  }
  return out;
 }
 function finish(s,t,replacement=null){
  const rows=t.rows.map((r,i)=>replacement?.row===i?ref(replacement.p,replacement):r),[a,b]=rows.map(r=>live(s,r));
  if(a&&b)api.battle(s,rows[0].p,a,rows[1].p,b,t.attacking,true,t.blockUntap,t.attackBattle);
 }
 function run(s,t){if(t.op!=='g393SG_Battle')return false;
  if(!t.owners.length){finish(s,t);return true;}
  const p=t.owners[0],rows=candidates(s,t,p);
  if(!rows.length){put(s,{...t,p:t.rows[0].p,owners:t.owners.slice(1)});return true;}
  const mandatory=rows.some(r=>r.mandatory);
  choice(s,{...t,p},mandatory?'バトルのかわりに行う処理を選ぶ':'かわりにバトルするクリーチャーを選ぶ（任意）',[
   ...rows.map(r=>{
    const x=live(s,r),other=live(s,t.rows[1-r.row]);
    if(r.kind==='moveBoth')return opt(card(x).name+'でバトルする2体をマナに置く',r,10,r.cardId);
    if(r.kind==='returnOwn')return opt(card(x).name+'を手札に戻す',r,10-api.cost(card(x)),x.cardId);
    const strong=other&&api.power(x,false,s)>api.power(other,false,s);
    return opt(card(x).name+(r.kind==='super'?'をタップしてスーパーガードマン':'でバトルを肩代わり'),r,strong?20:-5,r.cardId);
   }),
   ...(mandatory?[]:[skip()])
  ]);return true;
 }
 function chosen(s,t,v){if(t.op!=='g393SG_Battle')return false;
  const selected=v&&candidates(s,t,t.p).find(r=>r.row===v.row&&r.uid===v.uid&&r.incarnation===v.incarnation&&r.kind===v.kind);
  if(!selected){put(s,{...t,p:t.rows[0].p,owners:t.owners.slice(1)});return true;}
  const x=live(s,selected);
  if(selected.kind==='returnOwn'||selected.kind==='moveBoth'){
   const hand=selected.kind==='returnOwn',to=hand?'hand':'mana';
   const source=live(s,t.rows[selected.row]).cardId;
   api.log(s,t.p,'battleReplace',card(source).name+'でバトルをカードの移動に置き換える',{cardId:source});
   api.move(s,(hand?[selected]:t.rows).map(r=>({player:r.p,uid:r.uid,to,controller:t.p,
    replacement:true,...(hand?{toOwnerHand:true}:{toOwnerMana:true})
   })));
   return true;
  }
  if(selected.kind==='super')api.tap(s,t.p,x);
  // Tapping is part of the replacement; abilities triggered by the tap wait
  // until the replacement battle has completed instead of interrupting it.
  api.log(s,t.p,'battleReplace',card(x).name+'がかわりにバトルする',{cardId:x.cardId});
  finish(s,t,selected);return true;
 }
 return{run,chosen,
  replaceBattle(s,pa,a,pb,b,attacking=null,blockUntap,attackBattle){
   const rows=[ref(pa,a),ref(pb,b)],owners=[s.active,1-s.active],t=task('g393SG_Battle',pa,a.cardId,{rows,owners,attacking,...(blockUntap?{blockUntap}:{}),...(attackBattle?{attackBattle:true}:{})});
   // Retain the existing Galactic handler when no competing replacement is present.
   if(!owners.some(p=>candidates(s,t,p).some(r=>r.kind!=='galactic')))return false;
   put(s,t);return true;
  }
 };
}
