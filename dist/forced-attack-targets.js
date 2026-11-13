// Determine compulsory targets from the legal attacks, rather than granting a
// new permission to attack an untapped, protected or otherwise illegal target.
export function forceAttackTargets(s,p,actions,api){
 const previous=s.g23Attacks?.[p],first=previous?.turn!==s.turn||!previous.count;
 const firstEnoki=s.g160NAttacks?.[p]?.turn!==s.turn||!s.g160NAttacks[p].n;
 const lures=(s.g42Lures||[]).filter(l=>l.p!==p&&!api.spellIgnored(s,{type:'spell',cost:l.cost,spellSource:l.source}));
 const totems=s.players[1-p].battle.some(x=>!x.sealed&&api.effective(x,s).g477TotemLure);
 const requiredTargets=new Set(),creatureOnlyTargets=new Set();
 const targets=new Set(s.players[1-p].battle.filter(x=>!x.sealed).filter(x=>{
  const c=api.effective(x,s);
  if(c.g926MandatoryAttackTarget){requiredTargets.add(x.uid);return true;}
  if(c.forceCreatureAttackTarget)creatureOnlyTargets.add(x.uid);
  return c.g431AttackMe||c.g477AttackMeTapped&&x.tapped||totems&&String(c.race||'').includes('ミステリー・トーテム')||c.bairas||c.g393JDonJungle||first&&(c.abyssLord||c.g792FirstAttackTarget)||firstEnoki&&c.g160NRole==='enoki'||x.godLinks?.length&&c.g31GodHeavy||lures.length&&api.layers(x).some(y=>lures.some(l=>l.uid===y.uid&&l.incarnation===(y.incarnation||0)));
 }).map(x=>x.uid));
 const attackers=new Set(actions.filter(a=>a.kind==='attack'&&targets.has(a.target)).map(a=>a.uid));
 const requiredAttackers=new Set(actions.filter(a=>a.kind==='attack'&&requiredTargets.has(a.target)).map(a=>a.uid));
 const creatureAttackers=new Set(actions.filter(a=>a.kind==='attack'&&creatureOnlyTargets.has(a.target)).map(a=>a.uid));
 // A player-attack obligation applies only when that creature can legally attack the player.
 // Competing compulsory targets remain alternatives; neither grants an attack permission.
 const requiredPlayers=new Set(actions.filter(a=>a.kind==='attack'&&a.target==='player'&&api.effective(s.players[p].battle.find(x=>x.uid===a.uid),s).g540MustPlayer).map(a=>a.uid));
 // Defender instructions constrain a declared attack without forcing an attack this turn.
 const defendPlayer=s.players[1-p].battle.some(x=>!x.sealed&&api.effective(x,s).g896AttackPlayer);
 const players=new Set([...requiredPlayers,...(defendPlayer?actions.filter(a=>a.kind==='attack'&&a.target==='player').map(a=>a.uid):[])]);
 const powerLimits=new Map(s.players[p].battle.flatMap(x=>{
  if(x.sealed||!api.card(x).g1157AttackMaxPower)return [];
  const limit=api.effective(x,s).g1157AttackMaxPower;
  return limit===undefined?[]:[[x.uid,limit]];
 }));
 const scores=new Map(),best=new Map();
 for(const a of actions){
  if(a.kind!=='attack'||!powerLimits.has(a.uid))continue;
  const target=s.players[1-p].battle.find(x=>x.uid===a.target);
  const score=Number(!!target&&api.power(target,false,s)<=powerLimits.get(a.uid))+
   Number(a.target==='player'&&players.has(a.uid))+
   Number(targets.has(a.target))+Number(creatureOnlyTargets.has(a.target));
  scores.set(a,score);
  best.set(a.uid,Math.max(best.get(a.uid)??0,score));
 }
 return actions.filter(a=>{
  if(a.kind==='endTurn')return !requiredPlayers.size&&!requiredAttackers.size;
  if(a.kind==='tapAbility')return !requiredAttackers.has(a.uid)&&
   (!a.requiresUnforcedAttack||!attackers.has(a.uid)&&!players.has(a.uid));
  if(a.kind!=='attack')return true;
  if(scores.has(a))return scores.get(a)===best.get(a.uid);
  if(a.target==='player')return !attackers.has(a.uid)||players.has(a.uid);
  const forced=attackers.has(a.uid)||creatureAttackers.has(a.uid);
  return forced?(targets.has(a.target)||creatureOnlyTargets.has(a.target)):!players.has(a.uid);
 });
}
