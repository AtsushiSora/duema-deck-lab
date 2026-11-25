import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as e from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import * as current from '../dist/strongest-cpu.js';

const args=new Map(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
const runs=Number(args.get('--runs')||3),reference=args.get('--baseline'),output=args.get('--output');
if(!Number.isInteger(runs)||runs<1||runs>10)throw Error('--runs must be1 through10');
if(reference&&!/^[a-f0-9]{7,40}$/i.test(reference))throw Error('--baseline must be a local commit hash');
const read=f=>JSON.parse(fs.readFileSync(new URL('../dist/'+f,import.meta.url))),data=read('cards.json');e.setCards(data.cards);
const registry=createCatalogue(read('catalogue.json'),data.cards,read('details.json'));
const seeds=[...PRESETS,...resolveEnvironmentDecks(registry),...resolveStarter25Decks(registry)];
const targets=[PRESETS[0],seeds.find(d=>/墓地ソース/.test(d.name))].filter(Boolean),policies=[['current',current]];
if(reference){
 const source=execFileSync('git',['show',reference+':dist/strongest-cpu.js'],{maxBuffer:8e6}).toString();
 const directory=new URL('../tmp/strongest-benchmark-'+reference+'/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
 const file=new URL('baseline.mjs',directory);
 fs.writeFileSync(file,source.replace(/(['"])(\.\/[\w-]+\.js)(\?v=[^'"]*)?\1/g,(_,q,name)=>q+new URL('../dist/'+name.slice(2),import.meta.url).href+q));
 policies.unshift(['baseline',await import(file.href)]);
}
const results=[];
// Alternate policies at the same target/run to reduce warm-up/order bias. This
// measures construction only; it never restarts long match or full test groups.
for(const target of targets){
 const samples=new Map(policies.map(([name])=>[name,[]]));
 for(let n=0;n<runs;n++)for(const [name,cpu]of n%2?[...policies].reverse():policies){
  const start=performance.now(),build=cpu.buildStrongestCPU(target,seeds,data.cards),ms=performance.now()-start;
  const errors=e.validateDeck(build.deck);if(errors.length)throw Error(errors.join('; '));samples.get(name).push(ms);
 }
 for(const [policy,times]of samples){const ordered=[...times].sort((a,b)=>a-b);results.push({targetId:target.id,target:target.name,policy,samplesMs:times.map(n=>Math.round(n)),medianMs:Math.round(ordered[Math.floor(ordered.length/2)])});}
}
const report={engineVersion:e.ENGINE_VERSION,cards:data.cards.length,seedDecks:seeds.length,runs,baseline:reference||null,method:'Same supported card data and seed decks, alternating local construction policies. Host timings are not a phone/browser latency guarantee.',results};
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
