// Optional Aura cost reductions commit one ordinary end-of-turn sacrifice.
export function sinActions1432(s,p,{card,faces,freeSpell,canCast,canEnter,canPay,summonCost,effective}){
 if(s.decision||s.phase!=='main'||s.players[1-p].battle.some(x=>!x.sealed&&effective(x,s).noCostReduction))return [];
 return s.players[p].hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>{
  if(c.type!=='aura'&&!(c.type==='spell'&&c.g1500SinSpell)||!c.g1432Sin||freeSpell(s,p,c)||!canCast(s,p,c,'hand')||c.type!=='spell'&&!canEnter(s,p,c,{origin:'hand',execution:true}))return [];
  const payment={...c,g39Reduction:c.g1432Sin,summonOrigin:'hand',executionUid:x.uid};
  return canPay(s,p,payment)?[{kind:'play',uid:x.uid,cardId:x.cardId,face,origin:'hand',alternative:'sin1432',cost:summonCost(s,p,payment),label:c.name+'を無月の大罪'+c.g1432Sin+'で使う（終了時に自分のクリーチャーを1体破壊）'}]:[];
 }));
}
