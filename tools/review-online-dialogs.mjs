// Isolated audit. A passing REPRO means the issue is present at the tested commit.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),source=fs.readFileSync(path.join(root,'tests/online-app.test.mjs'),'utf8'),marker=source.indexOf("test('actual app offers");
if(marker<0)throw Error('Online app fixture boundary changed');
const prefix=source.slice(0,marker).replace("row.version=String(++version);await click('online-refresh');","row.version=String(++version);await read('onlineClient.refresh()');");
const file=path.join(root,'tests',`.online-dialog-review-${process.pid}.test.mjs`);
try{
 fs.writeFileSync(file,prefix+fs.readFileSync(new URL('./online-dialog-review-cases.txt',import.meta.url),'utf8'),{flag:'wx'});
 const r=spawnSync(process.execPath,['--test',file],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});if(r.error)throw r.error;process.exitCode=r.status??1;
}finally{if(fs.existsSync(file))fs.unlinkSync(file);}
