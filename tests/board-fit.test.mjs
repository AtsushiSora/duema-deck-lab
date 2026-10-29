import test from 'node:test';
import assert from 'node:assert/strict';
import {fitBoardGrid,sizedBoardGrid,portraitBoardGrid,bindFittedBoard,pageWindow} from '../dist/board-fit.js';

test('every one of up to eighty cards fits inside portrait and landscape regions without overflow',()=>{
 for(const width of [140,280,320,390,720])for(const height of [12,28,60,120,240])for(let n=0;n<=80;n++)for(const shield of [false,true]){
  const g=fitBoardGrid(n,width,height,{shield});assert.ok(g);assert.ok(g.columns*g.rows>=n);assert.ok(g.cellWidth>0&&g.cellHeight>0);
  assert.ok(g.columns*g.cellWidth+(g.columns-1)*g.gap<=width+1e-6);assert.ok(g.rows*g.cellHeight+(g.rows-1)*g.gap<=height+1e-6);
 }
 for(const args of [[-1,300,100],[2.3,300,100],[5,0,100],[5,300,NaN]])assert.equal(fitBoardGrid(...args),null);
});
test('hand and choice pagination keeps every item reachable once and clamps stale or invalid pages',()=>{
 const items=Array.from({length:80},(_,id)=>({id})),before=structuredClone(items);
 for(const size of [2,4,6,10]){const out=[];for(let page=0;page<pageWindow(items,0,size).pages;page++)out.push(...pageWindow(items,page,size).items);assert.deepEqual(out,items);}
 assert.deepEqual(items,before);assert.equal(pageWindow(items,999,6).index,13);assert.equal(pageWindow(items,-1,6).index,0);assert.equal(pageWindow([],0,6).pages,1);assert.equal(pageWindow(items,0,0).items.length,1);
});
test('fitted board recalculates after viewport changes and disconnects all resize listeners',()=>{
 const events=new Map(),properties=new Map(),classes=new Set();let width=300,height=120,callback,disconnected=false;
 const grid={dataset:{fitGrid:'creatures',fitCount:'15'},getBoundingClientRect:()=>({width,height}),style:{setProperty:(k,v)=>properties.set(k,v)},classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
 const view={addEventListener:(k,f)=>events.set(k,f),removeEventListener:(k,f)=>{assert.equal(events.get(k),f);events.delete(k);},ResizeObserver:class{constructor(f){callback=f;}observe(el){assert.equal(el,grid);}disconnect(){disconnected=true;}}};
 const cleanup=bindFittedBoard({querySelectorAll:()=>[grid]},view),first=properties.get('--fit-cols');assert.ok(Number(first)*Number(properties.get('--fit-rows'))>=15);width=140;height=240;events.get('resize')();assert.notEqual(properties.get('--fit-cols'),first);height=25;callback();assert.ok(classes.has('is-tiny'));cleanup();assert.equal(events.size,0);assert.equal(disconnected,true);assert.doesNotThrow(()=>bindFittedBoard(null)());
});
test('shield rails preserve a readable column and use multiple columns before cards flatten into lines',()=>{
 for(let n=1;n<=10;n++){const g=fitBoardGrid(n,40,400,{shield:true,rail:true});assert.equal(g.columns,1);assert.equal(g.rows,n);}
 assert.equal(fitBoardGrid(5,40,108,{shield:true,rail:true}).columns,1);
 for(const height of[25,40,60]){const g=fitBoardGrid(5,40,height,{shield:true,rail:true});assert.ok(g.columns>1);assert.ok(g.cellHeight>height/5);assert.ok(g.rows*g.cellHeight+(g.rows-1)*g.gap<=height+1e-6);}
 for(const n of[11,20,40,80]){const g=fitBoardGrid(n,40,60,{shield:true,rail:true});assert.ok(g.columns*g.rows>=n);assert.ok(g.columns*g.cellWidth+(g.columns-1)*g.gap<=40+1e-6);}
 assert.ok(fitBoardGrid(5,350,38,{shield:true,rail:true}).columns>1);
});

test('a transformed board fits cards in layout pixels instead of magnifying its density twice',()=>{
 const properties=new Map(),grid={clientWidth:240,clientHeight:120,dataset:{fitGrid:'creatures',fitCount:'12'},getBoundingClientRect:()=>({width:480,height:240}),style:{setProperty:(k,v)=>properties.set(k,v)},classList:{toggle(){}}};
 const stop=bindFittedBoard({querySelectorAll:()=>[grid]},{addEventListener(){},removeEventListener(){}}),expected=portraitBoardGrid(12,240,120,{maxWidth:132,tools:24});
 assert.equal(properties.get('--fit-cols'),String(expected.columns));assert.equal(properties.get('--fit-width'),expected.cellWidth+'px');assert.equal(properties.get('--fit-height'),expected.cellHeight+'px');stop();
});


test('card sizing changes card cells inside a fixed viewport and keeps all cards reachable by scrolling',()=>{
 for(const count of [1,3,10,40,80])for(const width of [40,280,720])for(const height of [60,140,300])for(const shield of [false,true]){
  const options={shield,rail:shield,maxWidth:shield?48:126},base=fitBoardGrid(count,width,height,options);
  assert.deepEqual(sizedBoardGrid(count,width,height,{...options,scale:1}),base);
  let previous=0;
  for(const scale of [.5,.75,1.5,2]){const grid=sizedBoardGrid(count,width,height,{...options,scale});assert.ok(grid.columns*grid.rows>=count);assert.ok(grid.cellWidth>previous);assert.equal(grid.cellWidth,Math.min(options.maxWidth,base.cellWidth)*scale);assert.equal(grid.cellHeight,base.cellHeight*scale);previous=grid.cellWidth;}
 }
 assert.deepEqual(sizedBoardGrid(0,300,140,{scale:2}),fitBoardGrid(0,300,140));
});


test('portrait cards preserve the complete 5:7 image and scale the entire card from stable base dimensions',()=>{
 for(const count of [1,2,3,8,40,80])for(const width of [80,280,390,700])for(const height of [28,100,200,400])for(const tools of [0,24]){
  const base=portraitBoardGrid(count,width,height,{tools});assert.ok(base.columns*base.rows>=count);assert.ok(base.cellWidth>0&&base.cellHeight>0);
  assert.ok(Math.abs((base.baseHeight-base.toolHeight)/base.baseWidth-7/5)<1e-6);assert.ok(base.columns*base.cellWidth+(base.columns-1)*base.gap<=width+1e-6);assert.ok(base.rows*base.cellHeight+(base.rows-1)*base.gap<=height+1e-6);
  for(const scale of [.5,.75,1.5,2]){const zoom=portraitBoardGrid(count,width,height,{tools,scale});assert.equal(zoom.baseWidth,base.baseWidth);assert.equal(zoom.baseHeight,base.baseHeight);assert.equal(zoom.cellWidth,base.baseWidth*scale);assert.equal(zoom.cellHeight,base.baseHeight*scale);assert.equal(zoom.dense,base.dense);assert.equal(zoom.tiny,base.tiny);assert.ok(zoom.columns*zoom.rows>=count);}
 }
 const tall=portraitBoardGrid(1,310,220);assert.equal(tall.baseWidth,126);assert.equal(tall.baseHeight,176.4);const short=portraitBoardGrid(1,310,90);assert.ok(short.baseWidth<tall.baseWidth);assert.ok(short.baseHeight<=90+1e-6);assert.equal(portraitBoardGrid(1,0,200),null);
});

test('landscape fields use their printed aspect ratio, including in a mixed battle zone and after image loading',()=>{
 const props=()=>{const values=new Map();return {values,setProperty:(k,v)=>values.set(k,v)};};
 const image={naturalWidth:0,naturalHeight:0},field={dataset:{cardAspect:String(7/5)},style:props(),querySelector:()=>image},creature={dataset:{cardAspect:String(5/7)},style:props(),querySelector:()=>null},slots=[field],events=new Map(),area={dataset:{cardScale:'1'},querySelectorAll:()=>[grid],addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const grid={clientWidth:300,clientHeight:200,dataset:{fitGrid:'creatures',fitCount:'1'},style:props(),querySelectorAll:()=>slots,getBoundingClientRect:()=>({width:300,height:200}),classList:{toggle(){}}};
 let resize;const view={matchMedia:q=>({matches:q==='(max-width: 850px)'}),addEventListener:(k,f)=>resize=f,removeEventListener:()=>resize=null};
 const stop=bindFittedBoard(area,view),number=(slot,key)=>parseFloat(slot.style.values.get('--'+key)),ratio=slot=>number(slot,'base-card-width')/number(slot,'base-card-height');
 assert.ok(Math.abs(ratio(field)-7/5)<1e-8);assert.ok(number(field,'base-card-width')>170);assert.ok(number(field,'base-card-height')<130);
 image.naturalWidth=650;image.naturalHeight=465;events.get('load')();assert.ok(Math.abs(ratio(field)-650/465)<1e-8);
 slots.push(creature);grid.dataset.fitCount='2';resize();assert.ok(Math.abs(ratio(field)-650/465)<1e-8);assert.ok(Math.abs(ratio(creature)-5/7)<1e-8);assert.ok(number(field,'base-card-height')<number(creature,'base-card-height'));
 const base=number(field,'base-card-width');area.dataset.cardScale='2';events.get('battlecardsizechange')();assert.equal(number(field,'base-card-width'),base);assert.ok(Math.abs(ratio(field)-650/465)<1e-8);
 stop();assert.equal(events.size,0);assert.equal(resize,null);
});
