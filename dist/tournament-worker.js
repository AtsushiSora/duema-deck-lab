import {setCards} from './engine.js?v=0.722.11';
import {simulateTournamentMatch} from './tournament-simulation.js?v=0.722.11';
self.onmessage=({data})=>{try{setCards(data.cards);for(const job of data.jobs){const result=simulateTournamentMatch(job.decks,job);postMessage({type:'result',matchId:job.id,...result});}postMessage({type:'done'});}catch(e){postMessage({type:'error',message:e.message});}};
