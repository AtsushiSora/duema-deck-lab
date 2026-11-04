export const DISPLAY_PREFERENCES_KEY='duema.displayPreferences.v1';
export const normalizeDisplayPreferences=value=>({textSize:['normal','large','largest'].includes(value?.textSize)?value.textSize:'normal',motion:['system','full','reduced'].includes(value?.motion)?value.motion:'system'});
export function readDisplayPreferences(storage){try{return normalizeDisplayPreferences(JSON.parse(storage.getItem(DISPLAY_PREFERENCES_KEY)||'null'));}catch{return normalizeDisplayPreferences();}}
export function saveDisplayPreferences(storage,value){try{storage.setItem(DISPLAY_PREFERENCES_KEY,JSON.stringify(normalizeDisplayPreferences(value)));return true;}catch{return false;}}
export function applyDisplayPreferences(doc,value){const prefs=normalizeDisplayPreferences(value);doc.documentElement?.setAttribute('data-text-size',prefs.textSize);doc.documentElement?.setAttribute('data-motion',prefs.motion);}
// Read all original sizes before changing any ancestor; inherited sizes never compound.
const originalSizes=new WeakMap();
export function applyTextSize(root,size,view=globalThis.window){
 if(!root?.querySelectorAll||!view?.getComputedStyle)return;
 const factor=size==='largest'?1.3:size==='large'?1.15:1;
 const nodes=[...root.querySelectorAll('h1,h2,h3,h4,p,small,label,button,input,select,textarea,dt,dd,strong,span,summary,output,option')].filter(el=>!el.closest('svg,.card-art,.mini-card,.battle-zoom-canvas'));
 if(factor===1){for(const el of nodes){const old=originalSizes.get(el);if(old){if(old.inline)el.style.fontSize=old.inline;else el.style.removeProperty('font-size');}}return;}
 const sizes=nodes.map(el=>{if(!originalSizes.has(el))originalSizes.set(el,{px:parseFloat(view.getComputedStyle(el).fontSize)||14,inline:el.style.fontSize||''});return originalSizes.get(el);});
 nodes.forEach((el,i)=>{el.style.fontSize=Math.round(sizes[i].px*factor*100)/100+'px';});
}
