import test from 'node:test';
import assert from 'node:assert/strict';
import {fitBoardGrid,bindFittedBoard,pageWindow} from '../dist/board-fit.js';

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
