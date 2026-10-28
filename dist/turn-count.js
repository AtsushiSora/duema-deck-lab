// Display rounds are separate from the engine's per-player turn serial.
// The serial must keep advancing for summoning sickness and timed effects.
export function displayTurn(state){
 return Number.isSafeInteger(state?.round)&&state.round>0?state.round:Math.max(1,Math.ceil((state?.turn??state?.turns??1)/2));
}
export function completeDisplayTurn(state,player){
 state.round=displayTurn(state);
 // Resume older saves in the corresponding half of their displayed round.
 state.roundEnded??=(state.turn%2===0?1<<state.first:0);
 state.roundEnded|=1<<player;
 if(state.roundEnded===3){state.round++;state.roundEnded=0;}
}
