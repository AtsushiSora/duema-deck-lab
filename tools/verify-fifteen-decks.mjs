// Test-only matrix. It never registers decks or accesses an account.
// App AI is tested separately in-browser; this matrix uses its reproducible heuristic baseline.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as e from '../dist/engine.js';
import {PHOTO_FIFTEEN_DECKS} from './fixtures/photo-fifteen-decks.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const read=async p=>JSON.parse(await readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const [data,names,details]=await Promise.all(['cards.json','catalogue.json','details.json'].map(read));
e.setCards(data.cards);
const registry=createCatalogue(names,data.cards,details),opponents=[...resolveStarter25Decks(registry),...resolveEnvironmentDecks(registry)],results=[];
for(const [i,deck] of PHOTO_FIFTEEN_DECKS.entries()){
 if(process.env.PHOTO_NUMBERS&&!process.env.PHOTO_NUMBERS.split(',').map(Number).includes(i+1))continue;for(const [j,opponent] of opponents.entries()){if(process.env.OPPONENT_NUMBER&&j!==Number(process.env.OPPONENT_NUMBER)-1)continue;
  const s=e.createGame([deck,opponent],{seed:520000+i*1000+j,first:j%2});
  while(s.winner===null&&s.actions<2500&&s.turn<160){
   const action=e.chooseHeuristicAI(s);assert.ok(action,deck.name+' / '+opponent.name+': no legal move');e.step(s,action);
   const all=e.physicalCards(s);assert.equal(all.length,80,deck.name+' / '+opponent.name);assert.equal(new Set(all.map(x=>x.uid)).size,80);
   if(s.actions%37===0)assert.deepEqual(e.getLegalActions(JSON.parse(JSON.stringify(s))),e.getLegalActions(s));
  }
  if(s.winner===null)await writeFile('/private/tmp/fifteen-unfinished.json',JSON.stringify(s,null,2));assert.notEqual(s.winner,null,deck.name+' / '+opponent.name+': did not finish within the normal bounds');
  results.push({image:i+1,opponent:opponent.id,winner:s.winner,actions:s.actions,turn:s.turn});
 }
 console.log('Image '+(i+1)+': '+opponents.length+' opponents passed');
}
const summary={version:e.ENGINE_VERSION,policy:'chooseHeuristicAI',games:results.length,completed:results.filter(x=>x.winner!==null).length,maxActions:Math.max(...results.map(x=>x.actions)),maxTurns:Math.max(...results.map(x=>x.turn))};
console.log(JSON.stringify(summary));
const at=process.argv.indexOf('--report');if(at>=0){assert.ok(process.argv[at+1],'--report requires a path');await writeFile(process.argv[at+1],JSON.stringify({summary,results},null,2)+'\n');}
