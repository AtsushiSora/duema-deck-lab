// Determine compulsory targets from the legal attacks, rather than granting a
// new permission to attack an untapped, protected or otherwise illegal target.
export function forceAttackTargets(s,p,actions,api){
 const previous=s.g23Attacks?.[p],first=previous?.turn!==s.turn||!previous.count;
 const firstEnoki=s.g160NAttacks?.[p]?.turn!==s.turn||!s.g160NAttacks[p].n;
 const lures=(s.g42Lures||[]).filter(l=>l.p!==p&&!api.spellIgnored(s,{type:'spell',cost:l.cost,spellSource:l.source}));
 const totems=s.players[1-p].battle.some(x=>!x.sealed&&api.effective(x,s).g477TotemLure);
 const requiredTargets=new Set();
 const targets=new Set(s.players[1-p].battle.filter(x=>!x.sealed).filter(x=>{
  const c=api.effective(x,s);
  if(c.g926MandatoryAttackTarget){requiredTargets.add(x.uid);return true;}
  return c.g431AttackMe||c.g477AttackMeTapped&&x.tapped||totems&&String(c.race||'').includes('ミステリー・トーテム')||c.bairas||c.g393JDonJungle||first&&(c.abyssLord||c.g792FirstAttackTarget)||firstEnoki&&c.g160NRole==='enoki'||x.godLinks?.length&&c.g31GodHeavy||lures.length&&api.layers(x).some(y=>lures.some(l=>l.uid===y.uid&&l.incarnation===(y.incarnation||0)));
 }).map(x=>x.uid));
 const attackers=new Set(actions.filter(a=>a.kind==='attack'&&targets.has(a.target)).map(a=>a.uid));
 const requiredAttackers=new Set(actions.filter(a=>a.kind==='attack'&&requiredTargets.has(a.target)).map(a=>a.uid));
 // A player-attack obligation applies only when that creature can legally attack the player.
 // Competing compulsory targets remain alternatives; neither grants an attack permission.
 const requiredPlayers=new Set(actions.filter(a=>a.kind==='attack'&&a.target==='player'&&api.effective(s.players[p].battle.find(x=>x.uid===a.uid),s).g540MustPlayer).map(a=>a.uid));
 // Defender instructions constrain a declared attack without forcing an attack this turn.
 const defendPlayer=s.players[1-p].battle.some(x=>!x.sealed&&api.effective(x,s).g896AttackPlayer);
 const players=new Set([...requiredPlayers,...(defendPlayer?actions.filter(a=>a.kind==='attack'&&a.target==='player').map(a=>a.uid):[])]);
 return actions.filter(a=>{
  if(a.kind==='endTurn')return !requiredPlayers.size&&!requiredAttackers.size;
  if(a.kind==='tapAbility')return !requiredAttackers.has(a.uid)&&
   (!a.requiresUnforcedAttack||!attackers.has(a.uid)&&!players.has(a.uid));
  return a.kind!=='attack'||!attackers.has(a.uid)&&!players.has(a.uid)||attackers.has(a.uid)&&targets.has(a.target)||players.has(a.uid)&&a.target==='player';
 });
}
