import {runGame,runSummary} from './engine.js?v=0.722.12';
export function simulateTournamentMatch(decks,{seed,first},simulate=runGame){
 let unresolved=0;
 for(let attempt=0;attempt<3;attempt++){
  const state=simulate(decks,{seed:(seed+Math.imul(attempt,2654435761))>>>0,first:unresolved%2?1-first:first});
  if(state.phase==='rematch')continue;
  const result=runSummary(state);
  if([0,1].includes(result.winner))return {...result,attempts:attempt+1};
  unresolved++;
 }
 if(unresolved<3)throw Error('強制ループが発生したため、再試合が必要です');
 return {winner:seed%2,reason:'3試合が未決着のため、抽選で勝ち上がり',attempts:3};
}
