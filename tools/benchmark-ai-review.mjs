// Paired matches against the preceding planner, with identical rules and decks.
// The reference commit and bounded test seeds are recorded in the report.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import * as current from '../dist/engine.js';import {createCatalogue} from '../dist/catalogue.js';import {resolveEnvironmentDecks} from '../dist/environment.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root))),git=process.env.GIT_BIN||'git',reference='8396b00f9f3a40a27e56412bbbb4d18f299b5ce8',tmp=fs.mkdtempSync(path.join(os.tmpdir(),'duema-ai-review-'));
try{
 const source=p=>execFileSync(git,['show',reference+':'+p],{cwd:root,encoding:'utf8',maxBuffer:4e6});
 const oldAI=source('dist/strategic-ai.js').replace(/from '(\.\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL(p,new URL('dist/strategic-ai.js',root)).href));
 fs.writeFileSync(path.join(tmp,'planner.mjs'),oldAI);
 const oldEngine=source('dist/engine.js').replace(/from '(\.\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(p.startsWith('./strategic-ai.js')?new URL('file://'+path.join(tmp,'planner.mjs')).href:new URL(p,new URL('dist/engine.js',root)).href));
 fs.writeFileSync(path.join(tmp,'engine.mjs'),oldEngine);const previous=await import(new URL('file://'+path.join(tmp,'engine.mjs')).href),data=read('dist/cards.json'),registry=createCatalogue(read('dist/catalogue.json'),data.cards,read('dist/details.json')),decks=resolveEnvironmentDecks(registry).filter(d=>d.historicalId);
 for(const engine of[current,previous])engine.setCards(data.cards);
 const games=[],times=[];let nodes=0,fallbacks=0;
 for(const[i,deck]of decks.entries())for(const seat of[0,1]){
  const seed=930000+i*101,first=i%2,s=current.createGame([deck,deck],{seed,first}),physical=current.physicalCards(s).map(x=>x.uid).sort();
  while(s.winner===null&&s.actions<2500&&s.turn<160){const actor=current.getLegalActions(s)[0]?.player;assert.notEqual(actor,undefined,deck.name);let a;if(actor===seat){const t=performance.now(),plan=current.analyzeAI(s);times.push(performance.now()-t);nodes+=plan.nodes;fallbacks+=plan.fallbacks;a=plan.action;}else a=previous.chooseAI(s);assert.ok(a);current.step(s,a);assert.deepEqual(current.physicalCards(s).map(x=>x.uid).sort(),physical);}
  assert.notEqual(s.winner,null,deck.name+' unresolved');games.push({deck:deck.id,seed,first,currentSeat:seat,winner:s.winner,currentWon:s.winner===seat,turns:s.turn,actions:s.actions});console.log('PASS',deck.id,'new seat',seat,'winner',s.winner,'turns',s.turn,'actions',s.actions);
 }
 times.sort((a,b)=>a-b);const wins=games.filter(x=>x.currentWon).length,report={reference,beforeAI:previous.AI_VERSION,afterAI:current.AI_VERSION,engine:current.ENGINE_VERSION,method:'Seven identical historical deck mirrors. Same seed and first player in each seat-swapped pair. Public information only; no hidden-card access. This small sample is a regression check, not a measured overall win rate.',games:games.length,wins,losses:games.length-wins,unresolved:0,physicalCardsPerAction:80,nodes,fallbacks,latencyMs:{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)},results:games};
 const output=process.env.AI_REPORT||new URL('tools/ai-review-v0.93.0.json',root);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined},null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
