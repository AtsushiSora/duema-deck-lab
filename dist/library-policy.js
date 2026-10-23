// Every supported effect that looks at its controller's library enters here.
// Direct draw/mill/ramp moves are still allowed by Q.Q.QX.; looking is not.
const looks=new Set(['g27_Big','g27_Raid','g27_Blueprint','g27_WestLook','g10_Robo','g10_Cougar','g10_Magrul','g7Look','g8_Gyai','g8_FinalReveal',
 'g20Mikadoreo','g20Huge','g17_Mekraid','g17_Lake','g17_Space','g13_Mek',
 'g3_Katsu','g12Mekraid','g12DragonLook','g12ManaLook','g15_Look','g16Reveal',
 'g25_Plan','g25_Heart','g4_Gon','g21KiyoReveal','g19YobiReveal','g19MekraidLook',
 'g14_Prison','g2_Aqua','g2_Allocate','g18_Mekraid']);
const orders=new Set(['g27_Order','g10_Order','g13_Order','g14_Order','g15_Order','g17_Order','g18_Order','g25_Order','g3_Order','g20Bottom']);
export function blockedLibraryTask(s,t,api){
 if(!api.deckLocked(s,t.p))return false;
 if(looks.has(t.op)){
  api.log(s,t.p,'libraryLocked','Q.Q.QX.により、自分の山札を見る処理を行えない',{cardId:t.source});
  // These effects have a subsequent instruction independent of the look.
  if(t.op==='g17_Lake')api.put(s,api.task('g17_RevealHand',t.p,t.source));
  return true;
 }
 if((orders.has(t.op)||t.op==='bottomOrder')&&!t.newCards){
  const own=s.players[t.p],ids=t.protected||t.uids||t.remaining||t.ids||[];
  for(const key of ['g27Protected','g10Protected','g13Protected','g14Protected','g17Protected','g18Protected','g25Protected','g3Protected','g4Protected','g19Reveals','g7Reveals','g12Reveals'])if(own[key])own[key]=own[key].filter(uid=>!ids.includes(uid));
  if(t.after)api.put(s,t.after);if(t.bounce)api.put(s,api.task('g3_Bounce',t.p,t.source));
  return true;
 }
 return false;
}
