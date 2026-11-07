import {setCards} from './engine.js';
import {buildStrongestCPU} from './strongest-cpu.js?v=0.682.0';
self.onmessage=({data})=>{try{setCards(data.cards);const build=buildStrongestCPU(data.target,data.seeds,data.cards,{learning:data.learning,previousBuild:data.previousBuild,onProgress:progress=>postMessage({type:'progress',...progress})});postMessage({type:'done',build});}catch(e){postMessage({type:'error',message:e.message});}};
