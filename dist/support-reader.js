import {gridProjections,detectGridFromProjections,scaleSupportGrid,createTitleMatcher,aggregateScreenshotSlots} from './support-import.js';
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
export function supportImageSize(w,h){
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<320||h<320)throw Error('画像が小さすぎます。元のスクリーンショットを選んでください');
 if(w/h<.25||w/h>4)throw Error('カード一覧が全体に写った画像を選ぶか、カードの部分を切り抜いてください');
 const ratio=Math.min(1,2400/w,Math.sqrt(8000000/(w*h))),width=Math.max(1,Math.floor(w*ratio)),height=Math.max(1,Math.floor(h*ratio)),sampleRatio=Math.min(600/width,1200/height,Math.sqrt(600000/(width*height)));
 return {width,height,sampleWidth:Math.max(1,Math.floor(width*sampleRatio)),sampleHeight:Math.max(1,Math.floor(height*sampleRatio))};
}
export async function prepareSupportScreenshot(file,url){
 let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{image=await new Promise((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(Error('画像を開けませんでした。JPEGかPNGでお試しください'));x.src=url;});}
 const w=image.width||image.naturalWidth,h=image.height||image.naturalHeight;
 let sizes;try{sizes=supportImageSize(w,h);}catch(e){image.close?.();throw e;}
 const full=canvas(sizes.width,sizes.height);full.getContext('2d').drawImage(image,0,0,full.width,full.height);image.close?.();
 const sample=canvas(sizes.sampleWidth,sizes.sampleHeight),ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(full,0,0,sample.width,sample.height);
 const grid=scaleSupportGrid(detectGridFromProjections(gridProjections(ctx.getImageData(0,0,sample.width,sample.height))),full.width,full.height);
 return {canvas:full,grid};
}
export function screenshotCellImages(source,cell){
 const thumb=canvas(134,188);thumb.getContext('2d').drawImage(source,cell.x,cell.y,cell.width,cell.height,0,0,134,188);
 const make=(top,height)=>{const w=cell.width*.83,h=cell.height*height,c=canvas(w*6+24,h*6+24),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,cell.x+cell.width*.135,cell.y+cell.height*top,w,h,12,12,c.width-24,c.height-24);return c.toDataURL('image/png');};
 const small=canvas(12,16),ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(thumb,0,0,12,16);const rgba=ctx.getImageData(0,0,12,16).data,appearance=Array.from(rgba).filter((_,i)=>i%4!==3);
 return {appearance,thumbnail:thumb.toDataURL('image/jpeg',.8),title:make(.0425,.096),alternate:()=>make(.032,.106)};
}
export function combineTitleResults(primary,alternate){
 if(!alternate)return primary;
 const best=alternate.score>primary.score?alternate:primary,other=best===primary?alternate:primary;
 const candidates=[...best.candidates];for(const c of other.candidates)if(!candidates.some(x=>x.id===c.id))candidates.push(c);
 const conflict=primary.id&&alternate.id&&primary.id!==alternate.id;
 return {...best,confirmed:best.confirmed&&!conflict,candidates:candidates.sort((a,b)=>b.score-a.score).slice(0,5),original:[primary.original,alternate.original].filter(Boolean).join(' / ')};
}
export async function recognizeSupportCells({cells,makeImages,recognize,cards,onProgress=()=>{},cancelled=()=>false}){
 if(cells.length!==40)throw Error('40枚の配置を確認してください');
 const match=createTitleMatcher(cards),slots=[];
 for(const cell of cells){
  if(cancelled())return null;
  const images=await makeImages(cell),r=await recognize(images.title,7);if(cancelled())return null;
  let result=match(r.text||'',r.confidence||0);
  if(!result.confirmed){const a=await recognize(images.alternate(),6);if(cancelled())return null;result=combineTitleResults(result,match(a.text||'',a.confidence||0));}
  slots.push({...result,appearance:images.appearance,thumbnail:images.thumbnail});onProgress(slots.length,40);
 }
 return {slots,rows:aggregateScreenshotSlots(groupScreenshotSlots(slots)),text:slots.map((s,i)=>`${i+1}: ${s.original||'読み取りなし'}`).join('\n')};
}
export function readSupportScreenshot(prepared,options){return recognizeSupportCells({...options,cells:prepared.grid.cells,makeImages:cell=>screenshotCellImages(prepared.canvas,cell)});}

// Only almost identical full-card thumbnails share an unknown-card review row.
export function groupScreenshotSlots(slots){
 const groups=[];for(const slot of slots){let group=slot.appearance&&groups.find(g=>g.appearance&&g.appearance.length===slot.appearance.length&&g.appearance.reduce((n,v,i)=>n+Math.abs(v-slot.appearance[i]),0)/g.appearance.length/255<.018);if(!group){group={appearance:slot.appearance,slots:[]};groups.push(group);}group.slots.push(slot);}
 for(const [index,g]of groups.entries()){const ids=[...new Set(g.slots.map(s=>s.id).filter(Boolean))],known=g.slots.filter(s=>s.id===ids[0]).sort((a,b)=>b.score-a.score)[0];for(const s of g.slots){s.visualGroup=index;if(ids.length===1&&!s.id){s.id=known.id;s.confirmed=false;s.candidates=known.candidates;}delete s.appearance;}}return slots;
}
