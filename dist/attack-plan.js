// Visible-board finish routes only. A blocker may be spent once; no hidden
// shields, future draws, attack triggers or hypothetical revolution cards.
export function visibleFinishRoutes(attackers,blockers,shields,{protectedPlayer=false,maxNodes=1800}={}){
 const winning=new Set(),memo=new Map();let nodes=0;
 if(protectedPlayer||attackers.length>8||blockers.length>5||shields>10)return {winning,nodes};
 const visit=(am,bm,n)=>{
  if(!am)return false;
  const key=am+':'+bm+':'+n;if(memo.has(key))return memo.get(key);
  if(nodes++>=maxNodes)return false;
  for(let i=0;i<attackers.length;i++)if(am&(1<<i))if(take(i,am,bm,n)){memo.set(key,true);return true;}
  memo.set(key,false);return false;
 };
 const take=(i,am,bm,n)=>{
  const a=attackers[i],rest=am&~(1<<i);
  if(n>0&&!visit(rest,bm,Math.max(0,n-a.damage)))return false;
  // The defending player chooses whether and with what to block.
  for(let j=0;j<blockers.length;j++)if(bm&(1<<j)&&a.blockers.includes(blockers[j])&&!visit(rest,bm&~(1<<j),n))return false;
  return true;
 };
 const am=(1<<attackers.length)-1,bm=(1<<blockers.length)-1;
 for(let i=0;i<attackers.length;i++)if(take(i,am,bm,shields))winning.add(attackers[i].uid);
 return {winning,nodes:Math.min(nodes,maxNodes)};
}
