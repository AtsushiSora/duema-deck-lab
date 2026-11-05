// Read-only grants from cards physically underneath a creature. Never grant the prefix.
export function inheritSoul404(c,inst,card,layers){
 if(c.type!=='creature'||!inst.under?.length)return c;
 const sources=inst.under.flatMap(layers).filter(x=>!x.faceDown&&card(x)?.g404Soul);
 if(!sources.length)return c;
 const out={...c,g404Inherited:sources.map(x=>({uid:x.uid,source:x.cardId,grants:card(x).g404Soul}))};
 let slayers=c.g208SlayerCount||Number(!!c.slayer);
 for(const {grants:g}of out.g404Inherited){
  for(const k of['blocker','unblockable','spellUntargetable'])if(g[k])out[k]=true;
  if(g.slayer){out.slayer=true;slayers++;}
  for(const k of['g38BattleBonus','g38EnemyTurnBonus'])if(g[k])out[k]=(out[k]||0)+g[k];
 }
 if(slayers>1)out.g208SlayerCount=slayers;
 return out;
}
