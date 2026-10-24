// Bounded planning over public positions. Unknown cards stay unknown: no actual
// deck order, shields, opponent hand, game seed or game RNG enters this module.
export function createStrategicAI(api){
 const {card,faces,effective,power,isCreature,legal,step,rank,observe,mark}=api;
 const cap=n=>Math.min(20,Number(n)||0);
 const body=c=>c.type==='creature';
 const damage=c=>c.breaker==='∞'?20:Number(c.breaker)||1;
 const key=a=>JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k])=>k!=='id'&&k!=='label')));
 const publicCounters=['g34Executions','g34ShieldLeftTurn','g34Muku','g34Scarlet','g34Souzan','g34FirstTap','g34Discounts','g31Discounts','g31ExtraTurn','g29Grants','g29Delays','g29MolReady','challenge','g28DragonOnce','g27WestUsed','extLimits','once','extraTurns','noManaUse','creaturesEntered','finalUsed','finalHistory','g26Extreme','g26GardenUsed','darkTriggers',
  'g13JagaUsed','g12LossUsed','g12NoLose','g15StarUsed','g16UsedMana','g17ManaUsed','g19MekraidUsed',
  'g20Attacks','g21ZenonUsed','g22UsedDiscount','g22UsedMana','g23Attacks','g23BalEntered','g25ManaUsed',
  'g2Spells','g3AttackSerial','g3CycleUsed','g3Debts','g3ReverseUsed','g5NextSummons','g7Battles',
  'g7DiscountUsed','g7Entries','g7NoLose','g7TerminalUsed','g7VolUsed','g8ManaUses','g9DiscountUsed'];
 function unknown(uid){return {cardId:'face-down-mana',uid,tapped:false,entered:0,buff:0,unblocked:false};}
 function ownSample(x,shownShields=[]){
  // A player knows their submitted list, but not which unseen cards are shields.
  // Sample from the whole unseen bag, never from the actual remaining library.
  const bag=new Map((x.knownDeck||[]).map(r=>[r.id,r.count]));
  const subtract=y=>{if(!y.faceDown&&bag.has(y.cardId))bag.set(y.cardId,Math.max(0,bag.get(y.cardId)-1));for(const z of [...(y.under||[]),...(y.godLinks||[])])subtract(z);};
  for(const zone of ['hand','battle','mana','grave','extra'])for(const y of x[zone])subtract(y);
  for(const y of shownShields)subtract(y);
  const pool=[...bag].sort(([a],[b])=>a.localeCompare(b)).flatMap(([id,n])=>Array(n).fill(id));
  let rng=0x21b4;for(const y of [...x.hand,...x.battle,...x.mana,...x.grave])for(const ch of y.cardId)rng=(Math.imul(rng,31)+ch.charCodeAt(0))>>>0;
  for(let i=pool.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
 }
 function projection(s,p){
  const v=observe(s,p),out={active:v.active,first:s.first,turn:v.turn,phase:v.phase,winner:null,
   rng:0x51a7,seed:0,actions:0,decision:null,after:[],log:[],
   metrics:[0,1].map(()=>({played:{},earlyPlayed:{},firstCreature:null,charges:0,breaks:0,triggers:0,turns:0}))};
  for(const k of publicCounters)if(s[k]!==undefined)out[k]=structuredClone(s[k]);
  out.players=v.players.map((x,i)=>{
   const original=s.players[i],player={name:'Player '+i,turns:x.turns,
    hand:i===p?structuredClone(x.hand):x.hand.map((_,j)=>unknown('ai-hand-'+i+'-'+j)),
    battle:structuredClone(x.battle),mana:structuredClone(x.mana),grave:structuredClone(x.grave),
    extra:structuredClone(x.extra),seals:x.seals.map(y=>({...unknown(y.uid),...y})),
    deck:Array.from({length:x.deckCount},(_,j)=>unknown('ai-deck-'+i+'-'+j)),
    // Only the public shield shape/links are copied, never its card identity.
    shields:original.shields.map(x=>({...unknown(x.uid),...(x.shieldGroup?{shieldGroup:x.shieldGroup}:{}),
     ...(x.faceUp?{cardId:x.cardId,faceUp:true}:{}),...(x.shieldStack?{shieldStack:x.shieldStack.map(y=>({...unknown(y.uid),...(y.faceUp?{cardId:y.cardId,faceUp:true}:{})}))}:{} )}))};
   for(const k of ['enteredThisTurn','brokenThisTurn','spellsThisTurn','g26FirstEventTurn'])if(original[k]!==undefined)player[k]=original[k];
   if(i===p){const pool=ownSample(x,player.shields.flatMap(y=>[y,...y.shieldStack||[]]).filter(y=>y.faceUp));if(x.deckTop){const j=pool.indexOf(x.deckTop.cardId);if(j>=0)pool.splice(j,1);}
    player.deck=player.deck.map((y,j)=>({...y,cardId:pool[j]||y.cardId}));
    if(x.deckTop&&player.deck.length)player.deck[0]=structuredClone(x.deckTop);
   }
   for(const pos of x.sidewaysPositions||[])if(player.deck[pos-1])player.deck[pos-1].g11Sideways=true;
   return player;
  });
  mark(out);return out;
 }
 function clone(s){const out=structuredClone(s);mark(out);return out;}
 const isEngine=c=>c.graveSpellReduction||c.gachiAttack||c.newWorld||c.kurokami||c.abyssLord||c.samuraiGenerate;
 function decisionChoice(s,rows){
  const task=s.decision?.task;if(!['discard','discardSelect'].includes(task?.op))return rows[0]?.a;
  const own=observe(s,rows[0].a.player).players[rows[0].a.player];
  return rows.map(r=>{
   const choice=s.decision.choices[r.a.choice],x=own.hand.find(x=>x.uid===choice?.value);if(!x)return r;
   const c=card(x),copies=own.hand.filter(y=>y.cardId===x.cardId).length;
   return {...r,value:r.value-(isEngine(c)&&copies===1?40:0)+(copies>1?6:0)+(c.abyssRush||c.graveCast?8:0)};
  }).sort((a,b)=>b.value-a.value||a.a.id-b.a.id)[0].a;
 }
 function creatureValue(s,x){
  const c=effective(x,s);if(!isCreature(s,x))return c.type==='field'?20:c.type==='gear'?12:8;
  return 24+cap(c.cost)*1.8+Math.min(12,power(x,false,s)/2000)+Math.min(8,damage(c)*2)+
   (c.blocker?5:0)+(c.speedAttacker?4:0)+(c.unblockable?4:0)+(c.effect?3:0)+
   (c.spellLockMaxCost||c.entrySilence||c.ignoreSmall?10:0)+(c.exLife||c.starEvolution||c.gNeo?5:0);
 }
 function board(s,p){return s.players[p].battle.reduce((n,x)=>n+creatureValue(s,x),0);}
 function pressure(s,p){
  const own=s.players[p],opp=s.players[1-p],ready=own.battle.filter(x=>{
   const c=effective(x,s);return isCreature(s,x)&&!x.tapped&&!c.noAttack&&!c.noPlayerAttack&&
    (x.entered<s.turn||c.speedAttacker||c.evolution||c.neoEvolution&&x.under?.length);
  }),blocks=opp.battle.filter(x=>!x.tapped&&effective(x,s).blocker).length;
  const hits=ready.map(x=>damage(effective(x,s))).sort((a,b)=>a-b).slice(blocks);
  let shields=opp.shields.length;for(const hit of hits){if(shields===0)return 110;shields=Math.max(0,shields-hit);}
  return (opp.shields.length-shields)*5;
 }
 function value(s,p){
  if(s.winner!==null)return s.winner===p?100000:-100000;
  const own=s.players[p],opp=s.players[1-p],mana=own.mana.length;
  const counts=new Map();for(const x of own.hand)counts.set(x.cardId,(counts.get(x.cardId)||0)+1);
  const hand=own.hand.reduce((n,x)=>{const c=card(x),engine=isEngine(c);
   return n+6+(body(c)?3:0)+(api.summonCost(s,p,c)<=mana+1?2:0)+(engine?12/counts.get(x.cardId):0);},0);
  const gravePlan=(own.hand.some(x=>card(x).graveSpellReduction)?own.grave.filter(x=>faces(card(x)).some(c=>c.type==='spell')).length*4:0)+
   (own.hand.some(x=>card(x).graveCreatureReduction||card(x).graveEvolution)?own.grave.filter(x=>body(card(x))).length*2:0);
  const colors=new Set(own.mana.flatMap(x=>api.colors(card(x)))).size;
  const danger=opp.battle.filter(x=>isCreature(s,x)&&!effective(x,s).noPlayerAttack).length;
  const safety=own.shields.length===0?-30:Math.min(5,own.shields.length)*7;
  return board(s,p)-board(s,1-p)*1.08+hand+gravePlan-opp.hand.length*5+
   Math.min(mana,7)*11+Math.max(0,Math.min(mana-7,5))*3+colors*2+safety+
   pressure(s,p)-(own.shields.length<danger?18:0)-(own.deck.length<=3?(4-own.deck.length)*16:0);
 }
 function candidates(s){
  const rows=rank(s).filter(r=>!r.a.cardId||card(r.a.cardId)?.type!=='unknown');
  if(s.phase==='charge')return rows;
  const out=[],seen=new Set();
  const add=r=>{if(r&&!seen.has(key(r.a))){out.push(r);seen.add(key(r.a));}};
  rows.slice(0,5).forEach(add);
  // Include previously unrecognised spell effects even if their old score was 1.
  rows.filter(r=>r.a.kind==='play'&&faces(card(r.a.cardId))[r.a.face||0].type==='spell').slice(0,5).forEach(add);
  rows.filter(r=>r.a.kind==='toAttack').forEach(add);
  return out.slice(0,11);
 }
 function advance(s,a){
  step(s,a);
  // Choices within one action are resolved with the established effect policy.
  // A hard bound prevents optional loops from blocking the phone's UI.
  for(let i=0;s.decision&&s.winner===null&&i<24;i++){
   if((s.decision.choices?.length||0)>80)return false;
   const a=decisionChoice(s,rank(s));if(!a)return false;step(s,a);
  }
  return !s.decision;
 }
 function attackChoice(s,rows,p){
  const v=observe(s,p),ctx={...v,players:v.players.map(x=>({...x,shields:Array(x.shields).fill({})}))};
  const me=ctx.players[p],them=ctx.players[1-p],find=(who,uid)=>ctx.players[who].battle.find(x=>x.uid===uid);
  const playerAttacks=rows.filter(r=>r.a.kind==='attack'&&r.a.target==='player');
  const unique=[...new Map(playerAttacks.map(r=>[r.a.uid,r.a])).values()];
  const blockers=them.battle.filter(x=>!x.tapped&&effective(x,ctx).blocker);
  const hits=unique.filter(a=>effective(find(p,a.uid),ctx).unblockable||!blockers.length)
   .map(a=>damage(effective(find(p,a.uid),ctx))).sort((a,b)=>a-b);
  let shields=them.shields.length,lethal=false;for(const hit of hits){if(shields===0){lethal=true;break;}shields=Math.max(0,shields-hit);}
  return rows.map(r=>{
   const a=r.a;if(a.kind!=='attack')return r;
   const x=find(p,a.uid),c=effective(x,ctx);let score=r.value;
   if(a.target==='player'){
    score=28+Math.min(them.shields.length,damage(c))*7+(c.unblockable?10:0);
    if(them.shields.length===0)score+=150;
    if(lethal)score+=120+damage(c)*3;
    if(!c.unblockable&&blockers.some(y=>power(y,false,ctx)>=power(x,true,ctx)))score-=35;
    if(c.blocker&&me.shields.length===0&&!lethal)score-=35;
   }else{
    const y=find(1-p,a.target),d=effective(y,ctx);
    // The effect policy recognises destruction protection and mandatory attacks.
    // Keep those exclusions so an invulnerable target cannot cause a repeat loop.
    if(r.value>0&&power(x,true,ctx)>power(y,false,ctx)&&!d.slayer)score=30+creatureValue(ctx,y)*.25+(d.blocker?18:0);
    if(lethal)score-=100;
   }
   return {...r,value:score};
  }).sort((a,b)=>b.value-a.value||a.a.id-b.a.id)[0].a;
 }
 function analyze(s){
  const rows=rank(s);if(!rows.length)return {action:null,nodes:0,fallbacks:0};
  const p=rows[0].a.player,baseline=rows[0].a;
  if(!s.decision&&s.phase==='attack')return {action:attackChoice(s,rows,p),nodes:0,fallbacks:0};
  if(s.decision)return {action:decisionChoice(s,rows),nodes:0,fallbacks:0};
  if(!['charge','main'].includes(s.phase)||rows.length===1)return {action:baseline,nodes:0,fallbacks:0};
  // Large payment/target combinations already require substantial rules work.
  // Bound planning by position size as well as node count, without wall-clock
  // cutoffs that would make seeded replays depend on the device's speed.
  if(s.players[p].mana.length>9||s.players[p].hand.length>12||s.players[p].battle.length>5||s.players.some(x=>x.battle.length>10))return {action:baseline,nodes:0,fallbacks:0};
  const root=projection(s,p),base=value(root,p),results=[];let nodes=0,fallbacks=0;
  const complexity=1+s.players[p].mana.length+s.players[p].hand.length+s.players.reduce((n,x)=>n+x.battle.length*3,0);
  const budget=Math.max(4,Math.min(64,Math.floor(900/complexity**1.4)));
  const expand=(state,row,origin,prior)=>{
   if(nodes>=budget)return null;nodes++;
   const next=clone(state);
   try{
    const a=legal(next).find(a=>key(a)===key(row.a));
    if(!a||!advance(next,a)){fallbacks++;return null;}
    return {state:next,action:origin||row.a,score:value(next,p)+prior,prior};
   }catch{fallbacks++;return null;}
  };
  for(const row of candidates(s)){
   // Unknown reveals cannot be evaluated faithfully; retain a small policy prior.
   const prior=s.phase==='main'?Math.max(-4,Math.min(4,(row.value-5)*.05)):0;
   const node=expand(root,row,null,prior);
   if(node)results.push(node);
   else results.push({action:row.a,state:null,prior,score:base+(row.value>5?3:-1)});
  }
  // Compare up to three consecutive main actions; always score every root first.
  let beam=results.filter(x=>x.state).sort((a,b)=>b.score-a.score).slice(0,4);
  for(let depth=0;depth<2&&beam.length&&nodes<budget;depth++){
   const nextBeam=[];
   for(const node of beam){
    const state=node.state;if(state.winner!==null||state.active!==p||state.phase!=='main')continue;
    for(const row of candidates(state).slice(0,5)){
     const next=expand(state,row,node.action,node.prior);if(!next)continue;
     results.push(next);nextBeam.push(next);
    }
   }
   beam=nextBeam.sort((a,b)=>b.score-a.score||a.action.id-b.action.id).slice(0,4);
  }
  results.sort((a,b)=>b.score-a.score||a.action.id-b.action.id);
  return {action:results[0]?.action||baseline,nodes,fallbacks};
 }
 return {choose:s=>analyze(s).action,analyze};
}
