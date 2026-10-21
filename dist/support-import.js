import {normalizeName} from './recognition.js';

// Each grid cell is one physical card. OCR text never supplies its quantity.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=a=>a.map((_,i)=>a.slice(Math.max(0,i-1),i+2).reduce((x,y)=>x+y,0)/Math.min(3,i+2,a.length-i+1));
export function gridProjections({data,width,height}){
 if(!data||data.length<width*height*4||width<40||height<40)throw Error('画像の大きさを確認してください');
 const x=Array(width).fill(0),y=Array(height).fill(0),start=Math.floor(height*.05),end=Math.ceil(height*.97);
 for(let yy=0;yy<height-2;yy++)for(let xx=0;xx<width-2;xx++){const i=(yy*width+xx)*4;for(let c=0;c<3;c++){y[yy]+=Math.abs(data[i+c]-data[i+8+c])/(width*3);if(yy>=start&&yy<end)x[xx]+=Math.abs(data[i+c]-data[i+width*8+c])/((end-start)*3);}}
 return {x:smooth(x),y:smooth(y),width,height};
}
function runs(values,threshold){const out=[];let first=null;for(let i=0;i<=values.length;i++){if(i<values.length&&values[i]>threshold){first??=i;}else if(first!==null){if(i-first>=5)out.push([first,i]);first=null;}}return out;}
function regularity(a){const sizes=a.map(([l,r])=>r-l),avg=sizes.reduce((x,y)=>x+y,0)/sizes.length;return sizes.reduce((n,v)=>n+Math.abs(v-avg)/avg,0)/sizes.length;}
export function detectGridFromProjections({x,y,width,height}){
 let best=null;for(const threshold of [3,4,5,6,7,8,10,12,15,18,22]){
  const xs=runs(x,threshold),ys=runs(y,threshold);
  if(![4,5,8,10].includes(xs.length)||xs.length*ys.length!==40)continue;
  if(regularity(xs)>.12||regularity(ys)>.12)continue;
  const cw=xs.reduce((n,[l,r])=>n+r-l,0)/xs.length,ch=ys.reduce((n,[l,r])=>n+r-l,0)/ys.length,aspect=cw/ch;
  if(aspect<.56||aspect>.85)continue;
  const score=regularity(xs)+regularity(ys)+Math.abs(aspect-.714)*.3;
  // Keep the first valid outer edges: higher thresholds shrink into the printed title.
  if(!best)best={columns:xs.length,rows:ys.length,xRuns:xs,yRuns:ys,score,detected:true};
 }
 if(!best)return makeSupportGrid(width,height);
 const left=best.xRuns[0][0],top=best.yRuns[0][0],right=best.xRuns.at(-1)[1],bottom=best.yRuns.at(-1)[1];
 return {...best,width,height,bounds:{left:left/width,top:top/height,right:right/width,bottom:bottom/height},cells:best.yRuns.flatMap(([t,b],r)=>best.xRuns.map(([l,rr],c)=>({index:r*best.columns+c,x:l,y:t,width:rr-l,height:b-t})))};
}
export function makeSupportGrid(width,height,{columns=8,bounds={left:.02,top:.03,right:.97,bottom:.98}}={}){
 if(![4,5,8,10].includes(Number(columns)))throw Error('カードの列数を確認してください');columns=Number(columns);
 const b=Object.fromEntries(['left','top','right','bottom'].map(k=>[k,clamp(Number(bounds[k]),0,1)]));
 if(Object.values(b).some(x=>!Number.isFinite(x))||b.right-b.left<.2||b.bottom-b.top<.2)throw Error('カード範囲を広げてください');
 const rows=40/columns,stepX=(b.right-b.left)*width/(columns-.06),stepY=(b.bottom-b.top)*height/(rows-.04);
 return {columns,rows,width,height,bounds:b,detected:false,cells:Array.from({length:40},(_,index)=>({index,x:b.left*width+(index%columns)*stepX,y:b.top*height+Math.floor(index/columns)*stepY,width:stepX*.94,height:stepY*.96}))};
}
export function scaleSupportGrid(grid,width,height){const sx=width/grid.width,sy=height/grid.height;return {...grid,width,height,cells:grid.cells.map(c=>({...c,x:c.x*sx,y:c.y*sy,width:c.width*sx,height:c.height*sy}))};}
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
const clean=s=>normalizeName(s).replace(/[^\p{L}\p{N}∞]/gu,'');
const bigrams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
export function createTitleMatcher(cards){
 const byGram=new Map(),entries=[];
 for(const c of cards){const names=new Set([c.name,...(c.faces||[]).map(f=>f.name)].filter(Boolean));for(const name of names){const n=clean(name);if(n.length<3)continue;const entry={id:c.id,name:c.name,n,grams:bigrams(n)};entries.push(entry);for(const g of entry.grams){if(!byGram.has(g))byGram.set(g,[]);byGram.get(g).push(entry);}}}
 return (text,confidence=0)=>{
  const n=clean(String(text).replace(/^\s*\d{1,2}\s+/,''));if(n.length<3)return {id:'',confirmed:false,candidates:[],original:String(text).trim(),confidence,score:0};
  const exact=entries.filter(e=>e.n.length>=4&&n===e.n);let scored;
  if(exact.length){const longest=Math.max(...exact.map(e=>e.n.length));scored=exact.filter(e=>e.n.length===longest).map(e=>({...e,score:1}));}
  else{
   const votes=new Map();for(const g of bigrams(n))for(const e of byGram.get(g)||[])votes.set(e,(votes.get(e)||0)+1);
   const pool=[...votes].filter(([e,v])=>v>=2||e.n.length<=5&&v>=1).sort((a,b)=>b[1]-a[1]).slice(0,100);
   scored=pool.map(([e,v])=>{const ratio=Math.min(n.length,e.n.length)/Math.max(n.length,e.n.length);if(ratio<.45)return {...e,score:0};const similarity=1-editDistance(n,e.n)/Math.max(n.length,e.n.length),dice=2*v/(bigrams(n).size+e.grams.size);return {...e,score:.8*similarity+.2*dice};}).filter(e=>e.score>=.38).sort((a,b)=>b.score-a.score);
  }
  const unique=[];for(const e of scored)if(!unique.some(x=>x.id===e.id))unique.push({id:e.id,name:e.name,score:e.score});
  const top=unique[0],gap=top?top.score-(unique[1]?.score||0):0;
  const certain=exact.length>0&&!!top&&top.score>=.9&&gap>=.12&&confidence>=45;
  // A weak match remains empty, rather than turning an OCR miss into a wrong card.
  return {id:top&&(top.score>=.63&&gap>=.06)?top.id:'',confirmed:certain,candidates:unique.slice(0,5),original:String(text).trim(),confidence,score:top?.score||0};
 };
}
export function aggregateScreenshotSlots(slots){
 const out=[];for(const [i,s] of slots.entries()){const old=out.find(r=>s.id?r.id===s.id:!r.id&&s.visualGroup!==undefined&&r.visualGroup===s.visualGroup);if(old){old.count++;old.confirmed&&=!!s.confirmed;old.slots.push(i+1);for(const c of s.candidates||[])if(!(old.candidates||[]).some(x=>x.id===c.id))(old.candidates??=[]).push(c);}else out.push({...s,id:s.id||'',count:1,confirmed:!!s.id&&!!s.confirmed,slots:[i+1]});}return out;
}
export function screenshotReview(rows,registry){
 const total=rows.reduce((n,r)=>n+(Number.isSafeInteger(r.count)?r.count:0),0),errors=[];
 if(total!==40)errors.push(`40枚必要です（現在${total}枚）`);
 if(!rows.length||rows.some(r=>!registry.get(r.id)))errors.push('カード名を選んでください');
 if(rows.some(r=>!r.confirmed))errors.push('不確かなカードを確認してください');
 if(rows.some(r=>!Number.isSafeInteger(r.count)||r.count<1||r.count>40))errors.push('枚数は1〜40で指定してください');
 let cards=[];if(!errors.length){try{cards=registry.resolveRows(rows);errors.push(...registry.validate({cards,format:'original'}));}catch(e){errors.push(e.message);}}
 const unsupported=rows.reduce((n,r)=>n+(registry.get(r.id)&&!registry.get(r.id).supported?r.count:0),0);
 return {total,unresolved:rows.filter(r=>!r.id).length,unconfirmed:rows.filter(r=>!r.confirmed).length,unsupported,errors:[...new Set(errors)],cards,ready:!errors.length};
}
