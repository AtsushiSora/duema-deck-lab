import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import path from 'node:path';
// Diagnostic assertions below confirm an existing defect; they are not passing acceptance tests.
fs.mkdirSync('tmp/duema-wide-review',{recursive:true});
const root=process.cwd(),original=path.join(root,'tests/online-app.test.mjs');let source=fs.readFileSync(original,'utf8').split("\ntest('actual app offers")[0];assert.ok(source.includes('function harness('));
source=source.replaceAll("new URL('../dist/app.js',import.meta.url)",'new URL('+JSON.stringify(pathToFileURL(path.join(root,'dist/app.js')).href)+')');
source=source.replace(/(from\s*['"]|import\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_,a,p,b)=>a+pathToFileURL(path.resolve(path.dirname(original),p)).href+b);
assert.ok(source.includes('let version=0,watch;'));source=source.replace('let version=0,watch;',"let version=0,watch,activeIdentity='u1';");
assert.ok(source.includes("getIdToken:async()=> 'u1'"));source=source.replace("getIdToken:async()=> 'u1'",'getIdToken:async()=>activeIdentity');
assert.ok(source.includes('return{root,dialog,read,click,'));source=source.replace('return{root,dialog,read,click,',"return{authChange:async user=>{activeIdentity=user?.uid||'u1';await watch(user);for(let i=0;i<4;i++)await tick();},root,dialog,read,click,");
fs.writeFileSync('tmp/duema-wide-review/harness.mjs',source+'\nexport {harness};\n');
const {harness}=await import(pathToFileURL(path.join(root,'tmp/duema-wide-review/harness.mjs')).href);
const results=[];
{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-confirm-resign');
 assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/投了しますか/);const before={uid:h.read('accountState.user.uid'),seat:h.read('onlineState.room.seat')};
 await h.authChange(null);assert.equal(h.dialog.open,true);await h.authChange({uid:'u2',name:'友達',email:'friend@example.test'});
 assert.equal(h.read('accountState.user.uid'),'u2');assert.equal(h.read('onlineState.room.seat'),1);assert.equal(h.dialog.open,true,'diagnostic: old confirmation remains');assert.match(h.dialog.innerHTML,/data-action="online-resign"/);
 await h.click('online-resign');assert.equal(h.game().winner,0);assert.match(h.game().reason,/友達が投了/);
 results.push({id:'stale-resign-confirmation',confirmed:true,before,after:{uid:'u2',seat:1,winner:h.game().winner,reason:h.game().reason},evidence:'前のアカウントが開いた投了確認が残り、切替後のアカウントが投了する。'});h.read('onlineClient.dispose()');
}
{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-confirm-resign');await h.authChange(null);
 assert.equal(h.read('onlineState.room'),null);assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/data-action="online-resign"/);
 results.push({id:'stale-resign-confirmation',variant:'sign-out',confirmed:true,evidence:'ログアウト後も投了確認だけが開いたまま残る。'});h.read('onlineClient.dispose()');
}
fs.writeFileSync('tmp/duema-wide-review/diagnostic.json',JSON.stringify({diagnosticMeaning:'合格は不具合の再現を確認したという意味。修正後の期待動作ではない。',results},null,2)+'\n');console.log(JSON.stringify({confirmedDefects:1,reproductions:results.length,results}));
