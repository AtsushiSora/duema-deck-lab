// Payment replacement and additional payments leave the printed cost intact.
export const buzzAdditional1411=c=>(c.g1411BuzzN||0)*(c.g1411BuzzRenda?.cost||0);
export function tunePayment1411(s,p,c,effective,cost){
 return c.id&&c.type&&c.type!=='creature'&&!c.crossing&&cost({...c,cost:c.printedCost??c.cost})<=7&&
  s.players[1-p].battle.some(x=>!x.sealed&&!x.faceDown&&effective(x,s).g1411TunePayment);
}
export function buzzEntry1411(c,n){
 if(!c.g1411BuzzRenda||!n)return c;
 const count=c.g1411BuzzRenda.taskCount??c.g34Tasks.length;
 const repeated=c.g34Tasks.slice(0,count),after=c.g34Tasks.slice(count);
 return {...c,g34Tasks:[...Array.from({length:n+1},()=>structuredClone(repeated)).flat(),...after,...(c.g1505BuzzExtraTurn&&n>=3?[{op:'Custom',name:'extraTurn'}]:[])]};
}
export function buzzVariants1411(s,p,actions,{card,faces,freeSpell,canPay,summonCost}){
 if(s.decision||s.phase!=='main')return actions;
 const extra=[];
 for(const a of actions){
  if(a.kind!=='play'||a.alternative||a.freeSummon||a.freeSpell)continue;
  const c=faces(card(a.cardId))[a.face||0];
  if(!c?.g1411BuzzRenda||freeSpell(s,p,c))continue;
  for(let n=1;;n++){
   const payment={...c,g1411BuzzN:n,summonOrigin:a.origin||'hand',executionUid:a.uid};
   if(!canPay(s,p,payment))break;
   extra.push({...a,alternative:'buzzRenda1411',g1411BuzzN:n,cost:summonCost(s,p,payment),
    label:c.name+'をバズレンダ追加'+n+'回で'+(c.type==='creature'?'召喚':'使用')});
  }
 }
 return [...actions,...extra];
}
