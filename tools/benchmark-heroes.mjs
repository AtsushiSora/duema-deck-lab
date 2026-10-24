// Four public opponents, paired seeds and both first-player positions. Optional
// HERO_BASELINE_DIR points to a saved dist/ (inside an ES module package).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as current from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,ENVIRONMENT_TARGET} from '../dist/environment.js';
import {PHOTO_FIFTEEN_DECKS} from './fixtures/photo-fifteen-decks.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),root=new URL('../dist/',import.meta.url);
const cards=read(new URL('cards.json',root)).cards;current.setCards(cards);
const registry=createCatalogue(read(new URL('catalogue.json',root)),cards,read(new URL('details.json',root)));
const opponents=[PRESETS[0],resolveEnvironmentDecks(registry).find(d=>d.id===ENVIRONMENT_TARGET),PHOTO_FIFTEEN_DECKS[3],PHOTO_FIFTEEN_DECKS[12]];
const configs=[{mode:'after',engine:current,manifest:read(new URL('hero-decks.json',root))}];
if(process.env.HERO_BASELINE_DIR){const dir=path.resolve(process.env.HERO_BASELINE_DIR),engine=await import(pathToFileURL(path.join(dir,'engine.js')));engine.setCards(read(path.join(dir,'cards.json')).cards);configs.unshift({mode:'before',engine,manifest:read(path.join(dir,'hero-decks.json'))});}
const rounds=Number(process.env.HERO_ROUNDS||1);if(!Number.isInteger(rounds)||rounds<1||rounds>20)throw Error('HERO_ROUNDS must be 1–20');
const only=process.env.HERO_IDS?.split(','),results=[],timings=[];
for(const {mode,engine:e,manifest} of configs)for(const h of manifest.heroes.filter(h=>!only||only.includes(h.id))){
 const deck={id:'hero-'+h.id,name:h.name,cards:h.cards},games=[];
 if(e.validateDeck(deck).length)throw Error('Invalid hero list: '+h.id);
 for(let round=0;round<rounds;round++)for(let oi=0;oi<opponents.length;oi++)for(const first of [0,1]){
  const seed=88800+round*1009+oi*101+first*17,s=e.createGame([opponents[oi],deck],{seed,first,challenge:{heroId:h.id,seat:1,signature:h.signature}});
  while(s.winner===null&&s.actions<1400&&s.turn<100){const start=performance.now(),a=e.chooseAI(s);if(mode==='after'&&a?.player===1)timings.push(performance.now()-start);if(!a)throw Error('No legal AI action');e.step(s,a);const all=e.physicalCards(s);if(all.length!==80||new Set(all.map(x=>x.uid)).size!==80)throw Error('Physical card conservation failed');}
  if(s.winner===null)throw Error('Unresolved game: '+h.id);
  games.push({opponent:opponents[oi].id,first,seed,winner:s.winner,turn:s.turn,actions:s.actions,heroFirstCreature:s.metrics[1].firstCreature,heroPlayed:s.metrics[1].played,reason:s.reason});
 }
 const result={mode,heroId:h.id,wins:games.filter(g=>g.winner===1).length,total:games.length,games};results.push(result);console.log(JSON.stringify({...result,games:undefined}));
}
timings.sort((a,b)=>a-b);
const report={engineVersion:current.ENGINE_VERSION,aiVersion:current.AI_VERSION,rounds,method:'Four fixed public opponents; same seeds and both first-player positions for each old/new hero. All actions legal, eighty unique physical cards preserved.',note:'少数条件でのCPU対戦比較。対人勝率や全対面の強さを保証する数値ではありません。',totalGames:results.reduce((n,r)=>n+r.total,0),latencyMs:{median:timings[Math.floor(timings.length*.5)]||0,p95:timings[Math.floor(timings.length*.95)]||0,max:timings.at(-1)||0},results};
if(process.env.HERO_REPORT)fs.writeFileSync(process.env.HERO_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined}));
