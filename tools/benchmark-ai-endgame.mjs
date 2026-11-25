import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as e from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {buildStrongestCPU} from '../dist/strongest-cpu.js';

const args=new Map(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];})),reference=args.get('--baseline')||'06c3cfc4',policy=args.get('--policy')||'current',output=args.get('--output');
assert.match(reference,/^[a-f0-9]{7,40}$/i);assert.ok(['baseline','current'].includes(policy));
const buildPolicy=args.get('--build')||'current';assert.ok(['baseline','current'].includes(buildPolicy));
const seedOffset=Number(args.get('--seed-offset')||0),categories=args.get('--categories')?.split(',');
assert.ok(Number.isSafeInteger(seedOffset)&&seedOffset>=0&&seedOffset<=1000000,'Invalid seed offset');
if(categories)assert.ok(categories.length&&categories.every(x=>['rush','blocker-control','graveyard','spell-engine','revolution','evolution'].includes(x)),'Invalid category');
const root=new URL('../',import.meta.url),directory=new URL('tmp/ai-endgame-'+reference+'/',root);fs.mkdirSync(directory,{recursive:true});
for(const [name,dest]of[['engine.js','baseline-engine.mjs'],['strategic-ai.js','baseline-strategic.mjs'],['attack-plan.js','baseline-attack.mjs'],['strongest-cpu.js','baseline-builder.mjs'],['strongest-card-roles.js','baseline-roles.mjs']]){
 const source=execFileSync('git',['show',reference+':dist/'+name],{cwd:fileURLToPath(root),maxBuffer:16e6}).toString(),local={'./engine.js':'baseline-engine.mjs','./strategic-ai.js':'baseline-strategic.mjs','./attack-plan.js':'baseline-attack.mjs','./strongest-card-roles.js':'baseline-roles.mjs'};
 fs.writeFileSync(new URL(dest,directory),source.replace(/(['"])(\.\/[\w-]+\.js)(\?v=[^'"]*)?\1/g,(_,q,path,query)=>q+(local[path]?new URL(local[path],directory).href:new URL('dist/'+path.slice(2),root).href+(query||''))+q));
}
const read=name=>JSON.parse(fs.readFileSync(new URL('dist/'+name,root))),data=read('cards.json');e.setCards(data.cards);
const baselineEngine=await import(new URL('baseline-engine.mjs',directory));baselineEngine.setCards(data.cards);
const builder=buildPolicy==='baseline'?(await import(new URL('baseline-builder.mjs',directory))).buildStrongestCPU:buildStrongestCPU;
const registry=createCatalogue(read('catalogue.json'),data.cards,read('details.json')),decks=[...PRESETS,...resolveEnvironmentDecks(registry),...resolveStarter25Decks(registry)],config=[['rush','practice-rg'],['blocker-control','practice-wu'],['graveyard','env-scs9-niigata-rose'],['spell-engine','env-gospel-practice'],['revolution','starter25-07'],['evolution','starter25-23']],games=[];
for(const [index,[category,id]]of config.entries()){
 if(categories&&!categories.includes(category))continue;
 const target=decks.find(d=>d.id===id);assert.ok(target,id);assert.deepEqual(e.validateDeck(target),[]);
 const cpu=builder(target,decks,data.cards).deck;
 for(const first of[0,1])games.push({id:category+'-'+first,category,target,cpu,first,seed:95100+index+seedOffset});
}
const results=[],report={baseline:reference,engineVersion:e.ENGINE_VERSION,aiVersion:e.AI_VERSION,cards:data.cards.length,policy,buildPolicy,seedOffset,categories:categories||config.map(x=>x[0]),method:'Paired real opposing archetypes with recorded CPU lists. Opponent always uses the frozen baseline AI. Build and CPU turn policy are selected independently; compare targetCaseHash for builder comparisons and caseHash when decks must also match. Physical80-card identities checked after every action. Each isolated case has a60-second process safety limit; game rules and AI decisions never use that wall clock.',cases:games.map(({target,cpu,...x})=>({...x,targetId:target.id,cpuCards:cpu.cards})),caseHash:createHash('sha256').update(JSON.stringify(games)).digest('hex'),targetCaseHash:createHash('sha256').update(JSON.stringify(games.map(({cpu,...x})=>x))).digest('hex'),results};
const save=()=>{if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');};save();
async function run(game){return await new Promise(resolve=>{
 const worker=new Worker(new URL('./benchmark-ai-endgame-worker.mjs',import.meta.url),{workerData:{cards:data.cards,game,baselineUrl:new URL('baseline-engine.mjs',directory).href,baselineBuildUrl:new URL('baseline-builder.mjs',directory).href,policy,buildPolicy}});let done=false;
 const finish=async row=>{if(done)return;done=true;clearTimeout(timer);await worker.terminate();resolve(row);};
 const failed=reason=>({id:game.id,category:game.category,targetId:game.target.id,policy,seed:game.seed,first:game.first,winner:null,cpuWon:false,unresolved:true,reason});
 const timer=setTimeout(()=>finish(failed('60-second-safety-limit')),60000);
 worker.once('message',row=>finish(row));worker.once('error',error=>finish(failed(error.message)));
 worker.once('exit',code=>{if(!done)finish(failed('worker-exit-'+code));});
 });}
let next=0;await Promise.all(Array.from({length:2},async()=>{while(next<games.length){const game=games[next++],row=await run(game);results.push(row);save();console.log(JSON.stringify(row));}}));
report.summary={games:results.length,completed:results.filter(r=>!r.unresolved).length,cpuWins:results.filter(r=>r.cpuWon).length,unresolved:results.filter(r=>r.unresolved).length};save();console.log(JSON.stringify(report.summary));
if(report.summary.unresolved)process.exitCode=1;
