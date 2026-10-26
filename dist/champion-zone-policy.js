// Shared zone restrictions for older effect modules. Blind draw/mill/ramp do not use this helper.
export function policyLook(s,p,n,rows,api){
 const xs=rows.slice(0,api.lookCount(s,p,n));
 if(xs.length&&api.lookPublic?.(s,p))api.log(s,p,'reveal','曲通風：山札の一番上を公開：'+xs.map(x=>api.card(x).name).join('・'),{cardId:xs[0].cardId});
 return xs;
}
export function policyRemove(s,p,zone,uid,api){return api.canMoveZone(s,p,zone)?api.remove(s.players[p][zone],uid):null;}
export function policyTake(s,p,zone,api){return api.canMoveZone(s,p,zone)?s.players[p][zone].splice(0):[];}
