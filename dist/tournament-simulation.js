import {runGame,runSummary} from './engine.js?v=0.229.3';
export function simulateTournamentMatch(decks,{seed,first},simulate=runGame){
 for(let attempt=0;attempt<3;attempt++){const result=runSummary(simulate(decks,{seed:(seed+Math.imul(attempt,2654435761))>>>0,first:attempt%2?1-first:first}));if([0,1].includes(result.winner))return {...result,attempts:attempt+1};}
 return {winner:seed%2,reason:'3試合が未決着のため、抽選で勝ち上がり',attempts:3};
}
