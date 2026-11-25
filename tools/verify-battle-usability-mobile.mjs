// Synthetic local browser verification. Never uses production services or signed-in browser profiles.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
import {setup,inst,e,RS} from '../tests/target-fixture.mjs';
import {projectRoom} from '../server/duel-core.mjs';

{
fs.mkdirSync('tmp/battle-usability',{recursive:true});
const s=setup();s.turn=7;s.active=0;s.phase='main';
s.players[0].battle=Array.from({length:6},(_,i)=>({...inst(i%2?'dm01-108':'dm01-097'),tapped:i===1}));s.players[1].battle=Array.from({length:5},()=>inst('dm01-075'));
s.players[0].battle[0].powerModifiers=[{amount:3000,expires:'end',who:0}];s.players[0].hand=Array.from({length:10},()=>inst(RS));s.players[0].mana=s.players[0].mana.slice(0,7);s.players[0].mana.slice(3).forEach(x=>x.tapped=true);s.players[1].mana=s.players[1].mana.slice(0,5);s.players[0].grave=Array.from({length:12},()=>inst('dm01-097'));
const room={hostUid:'host',guestUid:'guest',profiles:[{name:'あなた'},{name:'友達'}],code:'LOCALPREVIEW0001',phase:'playing',revision:1,engineVersion:e.ENGINE_VERSION,expiresAt:Date.now()+3600000,updatedAt:Date.now(),events:[],game:s};
const state={room:projectRoom(room,{uid:'host'}),busy:false,connected:true};
const css=[...fs.readFileSync('dist/index.html','utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const html=`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${css.map(x=>'<link rel="stylesheet" href="/dist/'+x+'">').join('')}</head><body class="online-playing theme-online"><div id="app"><main class="main"></main></div><dialog id="dialog"></dialog><script type="module">
import {onlineScreenHTML,onlineDialogContent} from '/dist/online-ui.js';
import {bindFittedBoard} from '/dist/board-fit.js';
const state=${JSON.stringify(state)};window.previewState=state;
let handCollapsed=false,actionsOpen=false,selected=null,clean=()=>{};
const art=()=>'<span class="art-card"><img alt="レイアウト確認用の既存カード画像" src="/dist/assets/page-creatures/dmrp15-km1.jpg" style="width:100%;height:100%;object-fit:cover"></span>';
function render(){clean();document.querySelector('main').innerHTML=onlineScreenHTML(state,{user:{uid:'host'},art,handCollapsed,actionsOpen,selected});clean=bindFittedBoard(document.querySelector('.online-board'),window);}
window.previewRender=render;window.previewSelect=()=>{selected=state.room.game.players[0].battle[0].uid;actionsOpen=true;render()};
document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;if(a==='preview-close')document.querySelector('dialog').close();if(a==='online-hand-toggle'){handCollapsed=!handCollapsed;render()}if(a==='online-card'){selected=el.dataset.uid;actionsOpen=true;render()}if(a==='online-actions-close'){actionsOpen=false;render()}if(a==='online-zone'){const d=document.querySelector('dialog'),v=onlineDialogContent(state.room,{kind:'zone',player:Number(el.dataset.player),zone:el.dataset.zone},{art});d.innerHTML='<button data-action="preview-close">閉じる</button><h2>'+v.title+'</h2><div class="dialog-content">'+v.html+'</div>';d.showModal()}});
render();window.previewReady=true;
</script></body></html>`;
fs.writeFileSync('tmp/battle-usability/preview.html',html);console.log('Prepared synthetic, account-free local preview.');
}
const base=process.cwd(),dir=path.join(base,'tmp/battle-usability/chrome-'+Date.now()),results=[],errors=[];let chrome,ws;
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
const deadline=setTimeout(()=>{chrome?.kill();server.closeAllConnections();server.close();console.error('Mobile verification exceeded120seconds');process.exit(1)},120000);
const server=http.createServer((req,res)=>{const p=path.resolve(base,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(base+'/'))return res.writeHead(403).end();try{const bytes=fs.readFileSync(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes)}catch{res.writeHead(404).end()}});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(dir,{recursive:true});
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0','--user-data-dir='+dir,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','about:blank'],{stdio:'ignore'});
 let port;for(let n=0;n<100;n++){await new Promise(r=>setTimeout(r,100));try{port=fs.readFileSync(path.join(dir,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{}}assert.ok(port,'Chrome debugging endpoint');
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
 ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject,timer:setTimeout(()=>reject(Error('CDP timeout '+method)),15000)});ws.send(JSON.stringify({id:key,method,params}))});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 await call('Runtime.enable');await call('Page.enable');
 for(const [width,height]of [[320,568],[390,844],[844,390],[1280,800]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/tmp/battle-usability/preview.html'});
  for(let n=0;n<100;n++){await new Promise(r=>setTimeout(r,50));if(await evaluate('!!window.previewReady'))break;}
  assert.equal(await evaluate('!!window.previewReady'),true);
  await new Promise(r=>setTimeout(r,100));
  const measure=()=>evaluate(`(()=>{const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}:null};return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,primary:rect('[data-action="online-primary"]'),handToggle:rect('[data-action="online-hand-toggle"]'),field:rect('.own-field .online-field'),drawer:rect('.online-controls')}})()`);
  const open=await measure();fs.writeFileSync('tmp/battle-usability/mobile-'+width+'-open.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));assert.equal(open.overflow,false,JSON.stringify({width,open}));assert.ok(open.primary.bottom<=height+1&&open.primary.height>=44,'reachable primary '+width);
  await evaluate(`document.querySelector('[data-action="online-hand-toggle"]').click()`);const folded=await measure();assert.ok(folded.field.height>open.field.height,'folding enlarges board '+width);
  await evaluate('window.previewSelect()');const selected=await measure();assert.ok(selected.drawer.height>44&&selected.drawer.y>=0,'visible drawer '+width);
  const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('tmp/battle-usability/mobile-'+width+'.png',Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('[data-action="online-actions-close"]').click();document.querySelector('[data-action="online-zone"][data-zone="grave"][data-player="0"]').click()`);const zone=await evaluate(`(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return {open:d.open,x:r.x,right:r.right,bottom:r.bottom,images:d.querySelectorAll('.online-mana-art img').length}})()`);assert.ok(zone.open&&zone.x>=0&&zone.right<=width+1&&zone.bottom<=height+1);assert.equal(zone.images,12);fs.writeFileSync('tmp/battle-usability/mobile-'+width+'-zone.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));results.push({width,height,open,folded,selected,zone});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('tmp/battle-usability/mobile.json',JSON.stringify({results,errors,preview:'Synthetic projected room; local placeholder art; no accounts or production services used.'},null,2));console.log(JSON.stringify({viewports:results.length,errors,results:results.map(x=>({width:x.width,fieldHeight:x.open.field.height,foldedFieldHeight:x.folded.field.height}))}));
}finally{clearTimeout(deadline);ws?.close();chrome?.kill();server.closeAllConnections();server.close();}
