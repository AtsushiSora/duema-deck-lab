import {historicalMetadata} from './historical-regulations.js';
import {setCards,runGame,runSummary,aggregate} from './engine.js?v=0.173.0';
self.onmessage=async({data})=>{
 try{setCards(data.cards);const results=[];
 for(let oi=0;oi<data.opponents.length;oi++){
  const opponent=data.opponents[oi],games=[];
  for(let i=0;i<data.count;i++){
   const first=data.first==='random'?i%2:data.first==='second'?1:0;
   const seed=(data.seed+Math.imul(i+1,2654435761)+Math.imul(oi,2246822519))>>>0;
   games.push(runSummary(runGame([data.deck,opponent],{seed,first})));
   if((i+1)%20===0||i+1===data.count)postMessage({type:'progress',completed:oi*data.count+i+1,total:data.opponents.length*data.count,current:opponent.name,stats:aggregate(games)});
  }
  results.push({opponent:{id:opponent.id,name:opponent.name,cards:opponent.cards,format:'original',...historicalMetadata(opponent)},games,stats:aggregate(games)});
 }
 postMessage({type:'done',results});
 }catch(e){postMessage({type:'error',message:e.message});}
};
