// Shared, serializable G-Zero conditions. A free payment never grants zone access.
export function createGZeroRules(api){
 return {mainActions(s,p){
  const out=[];
  if(s.active!==p)return out;
  for(const origin of ['hand','mana','grave'])for(const x of s.players[p][origin]){
   if(x.faceDown)continue;
   for(const [face,c] of api.faces(api.card(x)).entries()){
    if(!c.g396Zero||!c.g396Zero.all.every(f=>api.condition(s,p,f))||!api.canMoveZone(s,p,origin)||!api.canCast(s,p,c,origin)||c.type==='creature'&&(!api.canEnter(s,p,c,{origin,execution:true})||c.evolution&&!api.evolutionBases(s,p,c).length))continue;
    for(const permit of new Set(api.permits(s,p,x,c,origin)))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,origin,manaPermit:permit,cost:0,freeSummon:'G・ゼロ',label:c.name+'を'+(origin==='hand'?'':origin==='mana'?'マナから':'墓地から')+'G・ゼロで'+(c.type==='creature'?'召喚する':'唱える')});
   }
  }
  return out;
 }};
}
