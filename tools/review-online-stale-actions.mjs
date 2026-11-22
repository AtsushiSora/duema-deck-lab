import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
fs.mkdirSync('tmp/duema-followup-review',{recursive:true});
const root=process.cwd(),original=path.join(root,'tests/online-app.test.mjs');let source=fs.readFileSync(original,'utf8').split("\ntest('actual app offers")[0];
source=source.replaceAll("new URL('../dist/app.js',import.meta.url)",'new URL('+JSON.stringify(pathToFileURL(path.join(root,'dist/app.js')).href)+')');
source=source.replace(/(from\s*['"]|import\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_,a,p,b)=>a+pathToFileURL(path.resolve(path.dirname(original),p)).href+b);
assert.ok(source.includes("code:()=> '1122334455667788'"));source=source.replace('let version=0,watch,', 'let roomNumber=0,version=0,watch,').replace("code:()=> '1122334455667788'","code:()=>String(++roomNumber).padStart(16,'0')");
fs.writeFileSync('tmp/duema-followup-review/harness.mjs',source+'\nexport {harness};\n');
const {harness}=await import(pathToFileURL(path.join(root,'tmp/duema-followup-review/harness.mjs')).href);const results=[];
async function start(){const h=harness();await h.login();await h.click('online-create');await h.friend();return h;}
async function button(h){await h.click('online-menu');await h.click('online-all-actions');const room=h.read('onlineState.room');const a=room.game.actions.find(x=>x.kind==='charge')||room.game.actions[0];assert.ok(a);assert.ok(h.root.innerHTML.includes('data-index="'+a.id+'"'));assert.ok(h.root.innerHTML.includes('data-revision="'+room.revision+'"'));return{action:'online-move',index:String(a.id),revision:String(room.revision),room:room.code,kind:a.kind};}
{
 const h=await start(),old=await button(h);await h.click('online-menu');await h.click('online-account');assert.equal(h.read('view'),'account');const before=h.read('onlineState.room.revision');await h.dispatch(old.action,{index:old.index,revision:old.revision});results.push({id:'stale-move-after-leaving-view',old,before,after:h.read('onlineState.room.revision'),currentView:h.read('view'),reproduced:h.read('onlineState.room.revision')>before});h.read('onlineClient.dispose()');
}
{
 const h=await start(),old=await button(h);await h.service.resign({code:old.room,revision:Number(old.revision),requestId:'opponent-finish-12345678'},{uid:'u2',name:'friend'},'u2');await h.read('onlineClient.refresh()');await h.click('online-back');await h.click('online-create');await h.friend();const room=h.read('onlineState.room');assert.notEqual(room.code,old.room);assert.equal(String(room.revision),old.revision);assert.ok(room.game.actions.some(x=>String(x.id)===old.index));const before=room.revision;await h.dispatch(old.action,{index:old.index,revision:old.revision});results.push({id:'stale-move-in-another-room',old,newRoom:room.code,before,after:h.read('onlineState.room.revision'),reproduced:h.read('onlineState.room.revision')>before});h.read('onlineClient.dispose()');
}
const controls=[];
{
 const h=await start(),current=await button(h);await h.click(current.action,{index:current.index,revision:current.revision});const after=h.read('onlineState.room.revision');assert.equal(after,Number(current.revision)+1);await h.dispatch(current.action,{index:current.index,revision:current.revision});assert.equal(h.read('onlineState.room.revision'),after);controls.push({freshVisibleActionAccepted:true,staleRevisionInSameRoomRejected:true});h.read('onlineClient.dispose()');
}
assert.ok(results.every(x=>x.reproduced),'Expected existing guard gap to reproduce; convert to acceptance checks after a fix.');
fs.writeFileSync('tmp/duema-followup-review/probe-results.json',JSON.stringify({meaning:'Diagnostic reproductions, not fixed-behavior acceptance tests.',results,controls},null,2)+'\n');console.log(JSON.stringify({results,controls}));
