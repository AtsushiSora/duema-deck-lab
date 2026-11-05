// Only the marked ability is shared. Re-read physical sources, never forwarded grants.
export function decorateSurvivor406(s,p,inst,c,{card,ignored,isCreature}){
 if(c.type!=='creature'||!String(c.race).split('/').includes('サバイバー'))return c;
 const sources=s.players[p].battle.filter(x=>x.uid!==inst.uid&&!x.sealed&&card(x)?.g406Survivor&&isCreature(s,x)&&!ignored(s,x));
 if(!sources.length)return c;
 const out={...c,g406Inherited:sources.map(x=>({uid:x.uid,source:x.cardId,grants:card(x).g406Survivor}))};
 let slayers=c.g208SlayerCount||Number(!!c.slayer);
 for(const {grants:g}of out.g406Inherited){
  for(const k of['speedAttacker','blocker','unblockable'])if(g[k])out[k]=true;
  if(g.slayer){out.slayer=true;slayers++;}
  if(g.attackBonus)out.attackBonus=(out.attackBonus||0)+g.attackBonus;
  if(g.breaker)out.breaker=out.breaker==='∞'?'∞':Math.max(Number(out.breaker)||1,g.breaker);
 }
 if(slayers>1)out.g208SlayerCount=slayers;
 return out;
}
