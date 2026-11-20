// Run separate bounded batches from a frozen inventory instead of the exhaustive npm test.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {borrowedEntryCases,verifyBorrowedEntry} from '../tests/borrowed-entry-fixture.mjs';
import {ENGINE_VERSION} from '../dist/engine.js';import {data} from '../tests/target-fixture.mjs';import {nameKey} from '../dist/catalogue.js';
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const root=new URL('../',import.meta.url),file=f=>new URL(f,root);
function sourceHashes(){const files=['tests/borrowed-entry-fixture.mjs','tests/target-fixture.mjs','dist/cards.json',...fs.readdirSync(file('dist')).filter(f=>f.endsWith('.js')).map(f=>'dist/'+f)];return Object.fromEntries(files.sort().map(f=>[f,hash(file(f))]));}
const [mode,planPath,startText,countText]=process.argv.slice(2);assert.ok(planPath,'pass a plan file');
if(mode==='plan'){
 const cases=borrowedEntryCases();assert.ok(cases.length>150);
 const plan={engineVersion:ENGINE_VERSION,supportedNames:new Set(data.cards.map(c=>nameKey(c.name))).size,sourceHashes:sourceHashes(),cardsInspected:data.cards.length,cases};
 fs.mkdirSync(path.dirname(planPath),{recursive:true});fs.writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({mode,cards:plan.cardsInspected,cases:cases.length,plan:planPath}));
}else if(mode==='run'){
 const plan=JSON.parse(fs.readFileSync(planPath));assert.equal(plan.engineVersion,ENGINE_VERSION);assert.deepEqual(sourceHashes(),plan.sourceHashes,'plan sources changed; create a fresh plan');
 const start=Number(startText),count=Number(countText);assert.ok(Number.isSafeInteger(start)&&start>=0&&start<plan.cases.length);assert.ok(Number.isSafeInteger(count)&&count>0);
 const cases=plan.cases.slice(start,start+count);const begun=Date.now();let failed=0;
 for(let i=0;i<cases.length;i++){const row=cases[i],t=Date.now();console.log(JSON.stringify({event:'start',ordinal:start+i,...row}));try{const result=verifyBorrowedEntry(row);console.log(JSON.stringify({event:'passed',ordinal:start+i,...row,...result,seconds:(Date.now()-t)/1000}));}catch(error){failed++;console.log(JSON.stringify({event:'failed',ordinal:start+i,...row,message:error.message,stack:error.stack,seconds:(Date.now()-t)/1000}));}}
 console.log(JSON.stringify({event:'summary',start,requested:count,completed:cases.length,passed:cases.length-failed,failed,seconds:(Date.now()-begun)/1000}));process.exitCode=failed?1:0;
}else throw Error('mode must be plan or run');
