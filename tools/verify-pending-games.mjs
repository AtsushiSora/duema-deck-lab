// Run only the previously interrupted game scans, one named case per process.
// Completed cases can be reused only when every relevant source hash matches.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {e,data,details,snapshot,resolveOriginalTournamentDecks} from '../tests/target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';

process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const out='tmp/duema-pending-games',file=out+'/results.json';
const jobs=Number(process.argv.find(x=>x.startsWith('--jobs='))?.slice('--jobs='.length)||4);
assert.ok(Number.isInteger(jobs)&&jobs>=1&&jobs<=6,'Use 1 to 6 parallel test processes');
fs.mkdirSync(out,{recursive:true});
const registry=createCatalogue(snapshot,data.cards,details),decks=resolveStarter25Decks(registry);
const gransect=[decks[15],decks[4],decks[5],decks[19],decks[21],...resolveOriginalTournamentDecks(registry)];
const mado=[...decks.filter(x=>!registry.coverage(x).unsupported),...resolveEnvironmentDecks(registry)];
const cases=[];
const add=(suite,name,games)=>cases.push({file:'tests/'+suite+'.test.mjs',name,games});
for(const d of gransect){for(let seed=1;seed<=6;seed++)add('gransect-effects','No16 AI replay: '+d.id+' seed '+seed,2);for(let game=1;game<=20;game++)add('gransect-effects','No16 production worker: '+d.id+' game '+game,1);}
for(let seed=1;seed<=35;seed++)add('gransect-effects','No16 random legal choices: seed '+seed,1);
for(const d of mado){for(let seed=1;seed<=4;seed++)add('mado-effects','No04 AI replay: '+d.id+' seed '+seed,2);for(let game=1;game<=10;game++)add('mado-effects','No04 production worker: '+d.id+' game '+game,1);}
for(let seed=1;seed<=26;seed++)add('mado-effects','No04 random choices: seed '+seed,1);
for(let seed=1;seed<=30;seed++)add('manual-ui','manual UI complete game: seed '+seed,1);
assert.equal(new Set(cases.map(x=>x.file+' '+x.name)).size,cases.length);
const sources=['tools/verify-pending-games.mjs','tests/target-fixture.mjs',...new Set(cases.map(x=>x.file)),...fs.readdirSync('dist').filter(x=>/\.(?:js|json)$/.test(x)).map(x=>'dist/'+x)];
const hashes=Object.fromEntries(sources.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const signature=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
let report={signature,hashes,engineVersion:e.ENGINE_VERSION,startedAt:new Date().toISOString(),cases:[]};
if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));if(old.signature===signature)report=old;else throw Error('Source changed: preserve the prior evidence and use a new output directory.');}
const carry=process.argv.find(x=>x.startsWith('--carry-from='))?.slice('--carry-from='.length);
if(carry&&!report.cases.length){
 const old=JSON.parse(fs.readFileSync(carry));assert.equal(old.engineVersion,e.ENGINE_VERSION);
 const allowed=new Set(['tools/verify-pending-games.mjs','dist/release.json','tests/gransect-effects.test.mjs','tests/mado-effects.test.mjs']);
 for(const [f,h] of Object.entries(old.hashes))if(!allowed.has(f))assert.equal(hashes[f],h,'Gameplay source changed: '+f);
 // Reconstruct the previous worker-only text and compare its exact source hash.
 // This proves the AI/random/UI case bodies carried below were not changed.
 const unchangedTests=['tests/gransect-effects.test.mjs','tests/mado-effects.test.mjs','tests/manual-ui.test.mjs'].every(f=>old.hashes[f]===hashes[f]);
 if(!unchangedTests)for(const [f,suite,opponents,count,base,query] of [
  ['tests/gransect-effects.test.mjs','No16','[target,...opponents]',20,2116,'gransect'],
  ['tests/mado-effects.test.mjs','No04','opponents',10,3804,'mado04']
 ]){
  let source=fs.readFileSync(f,'utf8');
  source=source.replace(`for(const [index,opponent] of ${opponents}.entries())for(let game=0;game<${count};game++)test('${suite} production worker: '+opponent.id+' game '+(game+1),async()=>{`,`for(const [index,opponent] of ${opponents}.entries())test('${suite} production worker: '+opponent.id,async()=>{`)
   .replace(`?${query}='+index+'-'+game)`,`?${query}='+index)`)
   .replace(`const seed=(${base}+Math.imul(index,2246822519)+Math.imul(game,2654435761))>>>0;`,`const seed=(${base}+Math.imul(index,2246822519))>>>0;`)
   .replace("count:1,first:game%2?'second':'first',seed",`count:${count},first:'random',seed`)
   .replace('assert.equal(result.stats.completed,1);',`assert.equal(result.stats.completed,${count});`)
   .replace('assert.equal(r.stats.completed,1);',`assert.equal(r.stats.completed,${count});`)
   .replace('[[game%2,(seed+2654435761)>>>0]]',`Array.from({length:${count}},(_,i)=>[i%2,(seed+Math.imul(i+1,2654435761))>>>0])`);
  assert.equal(createHash('sha256').update(source).digest('hex'),old.hashes[f],'Non-worker test source changed: '+f);
 }
 report.cases=old.cases.filter(x=>x.code===0&&x.passed===1&&(unchangedTests||!/production worker/.test(x.name))).map(x=>({...x,log:fs.existsSync(x.log)?x.log:path.join(path.dirname(carry),path.basename(x.log))}));
 for(const row of report.cases)assert.equal(createHash('sha256').update(fs.readFileSync(row.log)).digest('hex'),row.logHash,'Carried log changed: '+row.log);
 assert.ok(report.cases.every(x=>cases.some(c=>c.name===x.name&&c.file===x.file)));
 report.carriedEvidence={report:carry,signature:old.signature,carried:report.cases.length,reason:unchangedTests?'All test and gameplay source hashes match; only the runner parallelism changed.':'Only worker batching and import query changed; reconstructed source hashes match exactly. All gameplay source hashes match.'};
}
report.expected=cases;report.deckCounts={gransect:gransect.length,mado:mado.length};report.parallelism=jobs;
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
save();
const children=new Set();let stopping=false;
function stop(){stopping=true;for(const child of children)try{process.kill(-child.pid,'SIGKILL');}catch{}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function run(row,index){
 const prior=report.cases.find(x=>x.name===row.name&&x.file===row.file);
 if(prior){assert.equal(prior.code,0,'Resolve the recorded failure before retrying: '+row.name);return;}
 const log=out+'/'+String(index).padStart(3,'0')+'.log',fd=fs.openSync(log,'w'),start=Date.now();
 const pattern='^'+row.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
 const args=['--test','--test-reporter=tap','--test-name-pattern',pattern,row.file];
 const child=spawn(process.execPath,args,{detached:true,stdio:['ignore',fd,fd]});
 children.add(child);
 let timedout=false;
 const timer=setTimeout(()=>{timedout=true;try{process.kill(-child.pid,'SIGKILL');}catch{}},570000);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve(code??signal));});
 clearTimeout(timer);children.delete(child);fs.closeSync(fd);
 const text=fs.readFileSync(log,'utf8'),passed=Number(text.match(/^# pass (\d+)$/m)?.[1]||0),failed=Number(text.match(/^# fail (\d+)$/m)?.[1]||0);
 const coverage=text.match(/# manual-ui-coverage (.+)/)?.[1];
 const result={...row,command:[process.execPath,...args],code,timedout,seconds:(Date.now()-start)/1000,passed,failed,log,logHash:createHash('sha256').update(text).digest('hex'),...(coverage?{coverage:JSON.parse(coverage)}:{})};
 report.cases.push(result);save();console.log(JSON.stringify({completed:report.cases.length,total:cases.length,name:row.name,code,passed,seconds:result.seconds}));
 assert.equal(code,0,row.name+' failed: '+log);assert.equal(passed,1,'Filter did not execute exactly one case: '+log);assert.equal(failed,0);
}
let next=0;
const results=await Promise.allSettled(Array.from({length:jobs},async()=>{while(next<cases.length&&!stopping){const index=next++;await run(cases[index],index);}}));
assert.ok(results.every(x=>x.status==='fulfilled'),JSON.stringify(results.filter(x=>x.status==='rejected').map(x=>x.reason.message)));
assert.equal(report.cases.length,cases.length);
const scans=report.cases.filter(x=>x.coverage).map(x=>x.coverage),types=new Set(scans.flatMap(x=>x.types));
assert.equal(scans.length,30);assert.ok(scans.reduce((n,x)=>n+x.scenes,0)>500);
for(const type of ['charge','main','attack','effect','dddSummon','deploy','leaveReplace'])assert.ok(types.has(type),type);
report.completedAt=new Date().toISOString();report.status='passed';report.games=cases.reduce((n,x)=>n+x.games,0);report.manualUICoverage={scenes:scans.reduce((n,x)=>n+x.scenes,0),types:[...types]};save();
console.log(JSON.stringify({status:report.status,tests:cases.length,games:report.games,deckCounts:report.deckCounts,manualUICoverage:report.manualUICoverage}));
