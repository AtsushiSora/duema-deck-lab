import {manualLayout} from './battle-layout.js?v=0.225.0';
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
// Keep the entire printed card at its own aspect ratio, even in short viewports.
export function portraitBoardGrid(count,width,height,{maxWidth=126,tools=0,scale=1,aspectRatio=5/7}={}){
 if(!fitBoardGrid(count,width,height))return null;
 if(!count)return fitBoardGrid(0,width,height);
 aspectRatio=Number.isFinite(aspectRatio)&&aspectRatio>0?aspectRatio:5/7;
 let best=null;
 for(let columns=1;columns<=count;columns++){
  const rows=Math.ceil(count/columns),gap=Math.min(6,width/(columns*5),height/(rows*5)),availableWidth=(width-gap*(columns-1))/columns,availableHeight=(height-gap*(rows-1))/rows;
  const toolHeight=Math.min(tools,availableHeight*.2),cardWidth=Math.max(.1,Math.min(maxWidth,availableWidth,(availableHeight-toolHeight)*aspectRatio));
  if(!best||cardWidth>best.baseWidth+1e-6)best={columns,rows,gap,baseWidth:cardWidth,baseHeight:cardWidth/aspectRatio+toolHeight,toolHeight};
 }
 scale=Number.isFinite(scale)?Math.max(.1,Math.min(2,scale)):1;
 const cellWidth=best.baseWidth*scale,cellHeight=best.baseHeight*scale;
 const columns=scale===1?best.columns:Math.max(1,Math.min(count,Math.floor((width+best.gap)/(cellWidth+best.gap)))),rows=Math.ceil(count/columns);
 return {...best,columns,rows,cellWidth,cellHeight,scale,dense:best.baseWidth<58||best.baseHeight<58,tiny:best.baseWidth<30||best.baseHeight<28};
}
// Reserve scaled cells; their contents are rendered once at the base dimensions.
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
 const fit=()=>{for(const el of grids){const bounds=el.getBoundingClientRect(),scale=Number(area.dataset?.cardScale)||1,shield=el.dataset.fitGrid==='shields',count=Number(el.dataset.fitCount),layout=manualLayout(view),mobile=layout.mobile||layout.landscape,style=view?.getComputedStyle?.(el),padding=key=>parseFloat(style?.[key])||0,width=(el.clientWidth??bounds.width)-padding('paddingLeft')-padding('paddingRight'),height=(el.clientHeight??bounds.height)-padding('paddingTop')-padding('paddingBottom');
  const slots=shield?[]:[...(el.querySelectorAll?.(':scope > .board-card-slot')||[])];
  const ratios=slots.map(slot=>{const img=slot.querySelector?.('.official-card-image'),ratio=img&&!img.hidden&&img.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:Number(slot.dataset.cardAspect);return Number.isFinite(ratio)&&ratio>0?ratio:5/7;});
  const aspectRatio=ratios.length?Math.min(...ratios):5/7;
  const g=shield?sizedBoardGrid(count,width,height,{scale,maxWidth:48,shield:true,rail:el.dataset.fitLayout==='rail'}):portraitBoardGrid(count,width,height,{scale,aspectRatio,maxWidth:(mobile?126:132)*Math.max(1,aspectRatio),tools:mobile?0:24});if(!g)continue;
  el.classList.toggle('is-card-sized',scale!==1&&count>0);
  el.classList.toggle('has-card-slots',count>0);
  const base=shield?fitBoardGrid(count,width,height,{shield:true,rail:el.dataset.fitLayout==='rail'}):g;
  const baseWidth=shield?Math.min(48,base.cellWidth):g.baseWidth,baseHeight=shield?base.cellHeight:g.baseHeight;
  for(const [name,value]of [['base-card-width',baseWidth+'px'],['base-card-height',baseHeight+'px'],['card-render-scale',scale],['card-tools-height',(g.toolHeight||0)+'px']])el.style.setProperty('--'+name,String(value));
  for(const [name,value]of [['cols',g.columns],['rows',g.rows],['gap',g.gap+'px'],['height',g.cellHeight+'px'],['width',g.cellWidth+'px']])el.style.setProperty('--fit-'+name,String(value));el.classList.toggle('is-dense',g.dense);el.classList.toggle('is-tiny',g.tiny);el.classList.toggle('is-rail-micro',scale===1&&el.dataset.fitLayout==='rail'&&Math.min(g.cellWidth,g.cellHeight)<11);
  slots.forEach((slot,i)=>{const ratio=ratios[i],cardWidth=Math.min(g.baseWidth,(g.baseHeight-g.toolHeight)*ratio),cardHeight=cardWidth/ratio+g.toolHeight,tap=slot.querySelector?.('.creature-tap'),tapStyle=tap?view?.getComputedStyle?.(tap):null,edge=key=>parseFloat(tapStyle?.[key])||0;
   const innerWidth=Math.max(.1,cardWidth-edge('borderLeftWidth')-edge('borderRightWidth')),innerHeight=Math.max(.1,cardHeight-g.toolHeight-edge('borderTopWidth')-edge('borderBottomWidth')),artWidth=Math.min(innerWidth,innerHeight*ratio),tappedWidth=Math.min(innerHeight,innerWidth*ratio);
   for(const [key,value] of [['base-card-width',cardWidth+'px'],['base-card-height',cardHeight+'px'],['card-aspect-ratio',ratio],['card-slot-offset',(g.cellWidth-cardWidth*scale)/2+'px'],['card-art-width',artWidth+'px'],['card-art-height',artWidth/ratio+'px'],['tapped-card-width',tappedWidth+'px'],['tapped-card-height',tappedWidth/ratio+'px']])slot.style.setProperty('--'+key,String(value));
  });
 }};
 area.addEventListener?.('battlecardsizechange',fit);area.addEventListener?.('load',fit,true);view?.addEventListener('resize',fit);const Observer=view?.ResizeObserver||globalThis.ResizeObserver,observer=Observer?new Observer(fit):null;for(const el of grids)observer?.observe(el);fit();
 return ()=>{area.removeEventListener?.('battlecardsizechange',fit);area.removeEventListener?.('load',fit,true);view?.removeEventListener('resize',fit);observer?.disconnect();};
}
export function pageWindow(items,page=0,size=6){
 size=Math.max(1,Math.min(20,Number.isSafeInteger(size)?size:6));const pages=Math.max(1,Math.ceil(items.length/size)),index=Math.max(0,Math.min(pages-1,Number.isSafeInteger(page)?page:0));return {items:items.slice(index*size,(index+1)*size),index,pages};
}
