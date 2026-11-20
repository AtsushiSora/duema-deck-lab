// Additional colored costs are paid with the execution, before reductions.
export function overdrivePayment1439(c,mask){
 const colors=c.g1439ODrive.options.flatMap((o,i)=>mask&(1<<i)?o.colors:[]);
 return {g1439Handled:true,g1439Mask:mask,g1439ExtraCost:colors.length,
  g1439TextColors:colors,g568PaymentColors:[...(c.g568PaymentColors??c.civilizations??String(c.civ||'').split('/').filter(Boolean)),...colors]};
}
export function overdriveEntry1439(c,mask){
 if(!c?.g1439ODrive||!mask||c.g1439Compiled)return c;
 const tasks=[...(c.g34Tasks||[]),...c.g1439ODrive.options.flatMap((o,i)=>mask&(1<<i)?structuredClone(o.defs):[])];
 return {...c,g1439Compiled:true,effect:'sixPhoto',g34Tasks:tasks};
}
