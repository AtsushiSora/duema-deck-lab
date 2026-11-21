// Isolated local audit. REPRO passes mean an issue is present; CHECK passes confirm safe behavior.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),source=fs.readFileSync(path.join(root,'tests/online-app.test.mjs'),'utf8'),marker=source.indexOf("test('actual app offers");
if(marker<0)throw Error('Online app fixture boundary changed');
// Extend the existing native-input model to the lobby's room-code input for this audit only.
const setter="else delete nodes['#online-number'];";
if(!source.includes(setter))throw Error('Online app root fixture changed');
const prefix=source.slice(0,marker).replace(setter,setter+"const code=value.match(/id=\"online-code\"[^>]*value=\"([^\"]*)\"/);if(code)nodes['#online-code']={value:code[1]};else delete nodes['#online-code'];");
const file=path.join(root,'tests',`.online-recovery-review-${process.pid}.test.mjs`);
try{
 fs.writeFileSync(file,prefix+fs.readFileSync(new URL('./online-recovery-review-cases.txt',import.meta.url),'utf8'),{flag:'wx'});
 const r=spawnSync(process.execPath,['--test',file],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});if(r.error)throw r.error;process.exitCode=r.status??1;
}finally{if(fs.existsSync(file))fs.unlinkSync(file);}
