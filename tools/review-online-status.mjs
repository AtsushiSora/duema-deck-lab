// Read-only product audit. Reproduce observed defects against the current source.
// Assertions confirm the defects; a passing run does NOT mean those defects are fixed.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=fs.readFileSync(path.join(root,'tests/online-app.test.mjs'),'utf8');
const marker=source.indexOf("test('actual app offers");
if(marker<0)throw Error('Online app fixture boundary changed');
const file=path.join(root,'tests',`.online-status-review-${process.pid}.test.mjs`);
const cases=fs.readFileSync(new URL('./online-status-review-cases.txt',import.meta.url),'utf8');
try{
 fs.writeFileSync(file,source.slice(0,marker)+cases,{flag:'wx'});
 const r=spawnSync(process.execPath,['--test',file],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
 if(r.error)throw r.error;process.exitCode=r.status??1;
}finally{if(fs.existsSync(file))fs.unlinkSync(file);}
