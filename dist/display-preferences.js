export const DISPLAY_PREFERENCES_KEY='duema.displayPreferences.v1';
export const BATTLE_THEMES=[['standard','標準（白・緑）'],['blue','ブルー'],['violet','パープル'],['crimson','ボルドー'],['slate','ダーク'],['sand','ベージュ']];
export const normalizeDisplayPreferences=value=>({textSize:['normal','large','largest'].includes(value?.textSize)?value.textSize:'normal',motion:['system','full','reduced'].includes(value?.motion)?value.motion:'system',battleTheme:BATTLE_THEMES.some(([id])=>id===value?.battleTheme)?value.battleTheme:'standard'});
export function readDisplayPreferences(storage){try{return normalizeDisplayPreferences(JSON.parse(storage.getItem(DISPLAY_PREFERENCES_KEY)||'null'));}catch{return normalizeDisplayPreferences();}}
export function saveDisplayPreferences(storage,value){try{storage.setItem(DISPLAY_PREFERENCES_KEY,JSON.stringify(normalizeDisplayPreferences(value)));return true;}catch{return false;}}
export function applyDisplayPreferences(doc,value){const prefs=normalizeDisplayPreferences(value);doc.documentElement?.setAttribute('data-text-size',prefs.textSize);doc.documentElement?.setAttribute('data-motion',prefs.motion);doc.documentElement?.setAttribute('data-battle-theme',prefs.battleTheme);}
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

export function battleThemeSettingsHTML(value){const {battleTheme}=normalizeDisplayPreferences(value);return `<fieldset class="battle-theme-settings"><legend>対戦画面の色</legend><p class="small">背景・操作パネル・ボタンの配色です。プレイマットの柄はデッキ編集で選べます。</p><div class="battle-theme-grid">${BATTLE_THEMES.map(([id,label])=>`<label class="battle-theme-option" data-theme-preview="${id}"><input type="radio" name="battle-theme" data-preference="battleTheme" value="${id}" ${battleTheme===id?'checked':''}><span class="battle-theme-swatch" aria-hidden="true"><i></i><b></b></span><span>${label}</span></label>`).join('')}</div></fieldset>`;}
