// All cards receive a cell inside the available region; no scrolling or omission.
export function fitBoardGrid(count,width,height,{shield=false,rail=false}={}){
 if(!Number.isSafeInteger(count)||count<0||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 if(!count)return {columns:1,rows:1,gap:0,cellWidth:width,cellHeight:height,dense:false,tiny:false};
 let best=null;
 const verticalGap=Math.min(3,width/5,height/(count*5)),verticalHeight=(height-verticalGap*(count-1))/count;
 const keepColumn=rail&&width<=56&&count<=10&&verticalHeight>=18;
 for(let columns=1;columns<=(keepColumn?1:count);columns++){
  const rows=Math.ceil(count/columns),gap=Math.min(3,width/(columns*5),height/(rows*5)),cellWidth=(width-gap*(columns-1))/columns,cellHeight=(height-gap*(rows-1))/rows;
  const score=Math.min(cellWidth/(shield?38:70),cellHeight/(shield?32:74));
  if(!best||score>best.score+1e-9)best={columns,rows,gap,cellWidth,cellHeight,score};
 }
 const {score,...grid}=best;return {...grid,dense:grid.cellWidth<58||grid.cellHeight<58,tiny:grid.cellWidth<30||grid.cellHeight<28};
}
// Resize card cells inside a fixed zone, rather than scaling the zone itself.
export function sizedBoardGrid(count,width,height,{scale=1,maxWidth=132,...options}={}){
 const base=fitBoardGrid(count,width,height,options);if(!base||!count||scale===1)return base;
 scale=Number.isFinite(scale)?Math.max(.1,Math.min(2,scale)):1;
 const cellWidth=Math.min(maxWidth,base.cellWidth)*scale,cellHeight=base.cellHeight*scale,gap=base.gap;
 const columns=Math.max(1,Math.min(count,Math.floor((width+gap)/(cellWidth+gap)))),rows=Math.ceil(count/columns);
 return {columns,rows,gap,cellWidth,cellHeight,dense:cellWidth<58||cellHeight<58,tiny:cellWidth<30||cellHeight<28};
}
export function bindFittedBoard(area,view=globalThis.window){
 if(!area?.querySelectorAll)return ()=>{};
 const grids=[...area.querySelectorAll('[data-fit-grid]')];
 const fit=()=>{for(const el of grids){const bounds=el.getBoundingClientRect(),scale=Number(area.dataset?.cardScale)||1,shield=el.dataset.fitGrid==='shields',count=Number(el.dataset.fitCount),g=sizedBoardGrid(count,el.clientWidth??bounds.width,el.clientHeight??bounds.height,{scale,maxWidth:shield?48:view?.matchMedia?.('(max-width: 850px)').matches?126:132,shield,rail:el.dataset.fitLayout==='rail'});if(!g)continue;
  el.classList.toggle('is-card-sized',scale!==1&&count>0);
  for(const [name,value]of [['cols',g.columns],['rows',g.rows],['gap',g.gap+'px'],['height',g.cellHeight+'px'],['width',g.cellWidth+'px']])el.style.setProperty('--fit-'+name,String(value));el.classList.toggle('is-dense',g.dense);el.classList.toggle('is-tiny',g.tiny);el.classList.toggle('is-rail-micro',scale===1&&el.dataset.fitLayout==='rail'&&Math.min(g.cellWidth,g.cellHeight)<11);
 }};
 area.addEventListener?.('battlecardsizechange',fit);view?.addEventListener('resize',fit);const Observer=view?.ResizeObserver||globalThis.ResizeObserver,observer=Observer?new Observer(fit):null;for(const el of grids)observer?.observe(el);fit();
 return ()=>{area.removeEventListener?.('battlecardsizechange',fit);view?.removeEventListener('resize',fit);observer?.disconnect();};
}
export function pageWindow(items,page=0,size=6){
 size=Math.max(1,Math.min(20,Number.isSafeInteger(size)?size:6));const pages=Math.max(1,Math.ceil(items.length/size)),index=Math.max(0,Math.min(pages-1,Number.isSafeInteger(page)?page:0));return {items:items.slice(index*size,(index+1)*size),index,pages};
}
