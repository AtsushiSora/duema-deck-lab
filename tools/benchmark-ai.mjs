import {readFile,writeFile} from 'node:fs/promises';
import * as e from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const read=async name=>JSON.parse(await readFile(new URL('../dist/'+name,import.meta.url),'utf8'));
const [data,snapshot,details]=await Promise.all(['cards.json','catalogue.json','details.json'].map(read));
e.setCards(data.cards);const registry=createCatalogue(snapshot,data.cards,details);
const decks=[...resolveStarter25Decks(registry),...resolveEnvironmentDecks(registry)].filter(d=>!registry.coverage(d).unsupported);
const rounds=Number(process.env.AI_ROUNDS||2),only=process.env.AI_DECK?.split(',');
const results=[],timings=[];let totalNodes=0,fallbacks=0;
for(const deck of decks.filter(d=>!only||only.includes(d.id))){
 const row={id:deck.id,name:deck.name,wins:0,losses:0,unresolved:0,newFirstCreature:[],oldFirstCreature:[]};
 for(let seed=1;seed<=rounds;seed++)for(const seat of [0,1]){
  const s=e.createGame([deck,deck],{seed:61000+seed,first:seed%2});
  while(s.winner===null&&s.actions<2500&&s.turn<160){
   const p=e.getLegalActions(s)[0]?.player;if(p===undefined)break;
   let action;if(p===seat){const start=performance.now(),plan=e.analyzeAI(s);timings.push(performance.now()-start);totalNodes+=plan.nodes;fallbacks+=plan.fallbacks;action=plan.action;}
   else action=e.chooseHeuristicAI(s);
   if(!action)break;e.step(s,action);
  }
  if(s.winner===null)row.unresolved++;else if(s.winner===seat)row.wins++;else row.losses++;
  row.newFirstCreature.push(s.metrics[seat].firstCreature);row.oldFirstCreature.push(s.metrics[1-seat].firstCreature);
 }
 results.push(row);console.log(JSON.stringify(row));
}
timings.sort((a,b)=>a-b);const completed=results.reduce((n,r)=>n+r.wins+r.losses,0),wins=results.reduce((n,r)=>n+r.wins,0);
const report={aiVersion:e.AI_VERSION,engineVersion:e.ENGINE_VERSION,rounds,method:'Same-deck paired matches; policies swap seats with the same seeds and first player. No hidden identities in planner.',
 completed,wins,losses:completed-wins,rate:completed?wins/completed:null,unresolved:results.reduce((n,r)=>n+r.unresolved,0),
 latencyMs:{median:timings[Math.floor(timings.length*.5)]||0,p95:timings[Math.floor(timings.length*.95)]||0,max:timings.at(-1)||0},totalNodes,fallbacks,results};
if(process.env.AI_REPORT)await writeFile(process.env.AI_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined},null,2));
