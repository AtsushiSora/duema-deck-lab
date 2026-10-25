import fs from 'node:fs';import assert from 'node:assert/strict';
import * as e from '../dist/engine.js';import {PRESETS} from '../dist/decks.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/cards.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('./support-phase-56.json',import.meta.url)));e.setCards(data.cards);
const make=(id,rows)=>({id,name:id,format:'original',cards:rows.map(([id,count])=>({id,count}))});
const decks=[make('major-blue-green',[['dmex06-015',4],['dmr11-018',4],['dmrp16-085',4],['dm11-043',4],['dmr22-053',4],['dmbd18-002',4],['dmr12-023',4],['dmr17-017',1],['dmrp02-s09',4],['dm06-110',4],['dm01-108',3]]),make('major-four-color',[['dmr21-090',4],['dm02-035',4],['dm22-011',4],['dmr15-007',4],['dmbd18-002',4],['dmr22-053',4],['dmr11-018',4],['dmr12-023',4],['dmr17-017',1],['dmrp02-s09',4],['dm06-110',3]])];
const result=[];for(const d of decks)assert.deepEqual(e.validateDeck(d),[]);
for(let i=0;i<4;i++){let s=e.createGame([decks[i%2],PRESETS[i%PRESETS.length]],{seed:94100+i,first:i%2,maxTurns:100,maxActions:3000});const ids=e.physicalCards(s).map(x=>x.uid).sort();let resumed=false;
 while(s.winner===null){const actions=e.getLegalActions(s),a=e.chooseAI(s);assert.ok(actions.some(x=>JSON.stringify(x)===JSON.stringify(a)),'AI action is not legal');e.step(s,a);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);if(!resumed&&s.actions>=25){s=JSON.parse(JSON.stringify(s));resumed=true;}}
 result.push({deck:decks[i%2].id,opponent:PRESETS[i%PRESETS.length].id,seed:94100+i,first:i%2,winner:s.winner,turns:s.turn,actions:s.actions,resumed,physicalCards:80,newCardsPlayed:Object.fromEntries(manifest.cards.map(c=>[c.name,s.metrics[0].played[c.id]||0]).filter(([,n])=>n))});console.log('Completed '+(i+1)+'/4',result.at(-1));
}
const report={version:'0.94.0',engine:e.ENGINE_VERSION,checkedAt:'2026-10-25',newTypes:manifest.cards.length,focusedTests:17,games:result};fs.writeFileSync(new URL('./major-cards-v0.94.0.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
