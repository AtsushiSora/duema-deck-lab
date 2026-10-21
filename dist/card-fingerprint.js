// Compact colour signatures. Reference images and the user's image stay separate;
// only reference signatures are shipped with the app.
export const FINGERPRINT_SIZE={width:36,height:48};
export const FINGERPRINT_INSET={x:.06,y:.08,width:.88,height:.84};
export function cardFingerprint({data,width,height}){
 if(width!==36||height!==48||data.length!==width*height*4)throw Error('Invalid card fingerprint pixels');
 const values=[];
 for(let y=0;y<16;y++)for(let x=0;x<12;x++)for(let c=0;c<3;c++){
  let sum=0;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)sum+=data[((y*3+dy)*width+x*3+dx)*4+c];
  values.push(Math.round(sum/9/17));
 }
 const packed=new Uint8Array(288);for(let i=0;i<packed.length;i++)packed[i]=values[i*2]*16+values[i*2+1];return packed;
}
export const encodeFingerprint=bytes=>btoa(String.fromCharCode(...bytes));
export function decodeFingerprint(text){const binary=atob(text);if(binary.length!==288)throw Error('Invalid card fingerprint');return Uint8Array.from(binary,c=>c.charCodeAt(0));}
const distance=(a,b,stop=Infinity)=>{let sum=0;for(let i=0;i<288;i++){sum+=Math.abs((a[i]>>4)-(b[i]>>4))+Math.abs((a[i]&15)-(b[i]&15));if(sum>stop)return sum;}return sum;};
export function createImageMatcher(index,cards){
 if(index?.schemaVersion!==1||!Array.isArray(index.entries))throw Error('画像照合データの形式を確認してください');
 const names=new Map(cards.map(c=>[c.id,c.name]));
 const entries=index.entries.filter(e=>names.has(e[0])).map(([id,signature])=>({id,signature:decodeFingerprint(signature)}));
 if(!entries.length)throw Error('画像照合データが空です');
 return fingerprints=>{
  if(!Array.isArray(fingerprints))fingerprints=[fingerprints];if(!fingerprints.length||fingerprints.some(f=>f?.length!==288))return {id:'',confirmed:false,candidates:[],score:0};
  const best=new Map();let cutoff=Infinity;
  for(const e of entries){let d=Infinity;for(const f of fingerprints)d=Math.min(d,distance(f,e.signature,Math.min(cutoff,d)));if(d>cutoff)continue;if(d<(best.get(e.id)??Infinity))best.set(e.id,d);if(best.size>12){const sorted=[...best].sort((a,b)=>a[1]-b[1]);best.clear();for(const [id,value]of sorted.slice(0,8))best.set(id,value);cutoff=sorted[7][1];}}
  const ranked=[...best].sort((a,b)=>a[1]-b[1]),top=ranked[0],error=top?top[1]/8640:1,gap=top?(ranked[1]?.[1]??8640)/8640-error:0;
  const candidates=ranked.slice(0,5).map(([id,d])=>({id,name:names.get(id),score:1-d/8640}));
  // Low absolute error AND separation from another name are both necessary.
  return {id:error<=.12&&gap>=.008?top[0]:'',confirmed:error<=.045&&gap>=.025,candidates,score:1-error,imageError:error,imageGap:gap,method:'image'};
 };
}
export function combineCardEvidence(ocr,image){
 if(!image?.candidates?.length||image.imageError>.16)return ocr;
 const candidates=[...image.candidates];for(const c of ocr.candidates||[])if(!candidates.some(x=>x.id===c.id))candidates.push(c);
 if(image.confirmed)return {...ocr,...image,original:ocr.original,candidates:candidates.slice(0,5)};
 const agrees=image.id&&image.id===ocr.id;
 const result=image.id&&(!ocr.confirmed||agrees)?image:ocr;
 return {...ocr,...result,confirmed:!!(agrees&&ocr.confirmed),original:ocr.original,candidates:candidates.slice(0,5),method:agrees?'image+text':result.method||'text'};
}
