import {parentPort,workerData} from 'node:worker_threads';
import * as live from '../dist/engine.js';
import {arrangeStrongestCPU} from '../dist/strongest-cpu.js';
const {cards,game,baselineUrl,policy}=workerData,baseline=await import(baselineUrl);live.setCards(cards);baseline.setCards(cards);
const s=live.createGame([game.target,game.cpu],{seed:game.seed,first:game.first});arrangeStrongestCPU(s);
const physical=()=>live.physicalCards(s).map(x=>x.uid).sort(),ids=JSON.stringify(physical()),latency=[];let decisions=0;
while(s.winner===null&&s.actions<1000&&s.turn<80){
 const player=live.getLegalActions(s)[0]?.player;if(player===undefined)break;
 const chooser=player===1&&policy==='current'?live:baseline,start=performance.now(),a=chooser.chooseAI(s);
 if(player===1){latency.push(performance.now()-start);decisions++;}
 if(!a||!live.getLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)))throw Error('Illegal action '+game.id);
 live.step(s,a);
 if(JSON.stringify(physical())!==ids)throw Error('Physical card conservation failed '+game.id);
}
latency.sort((a,b)=>a-b);parentPort.postMessage({id:game.id,category:game.category,targetId:game.target.id,target:game.target.name,policy,seed:game.seed,first:game.first,winner:s.winner,cpuWon:s.winner===1,turns:s.turn,actions:s.actions,unresolved:s.winner===null,reason:s.winner===null?'action-or-turn-bound':null,decisions,latencyMs:{median:latency[Math.floor(latency.length*.5)]||0,p95:latency[Math.floor(latency.length*.95)]||0,max:latency.at(-1)||0},physicalCards:live.physicalCards(s).length});
