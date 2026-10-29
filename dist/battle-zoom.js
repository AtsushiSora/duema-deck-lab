// Presentation preferences only: never change game state or card actions.
export const BATTLE_ZOOM_KEY='duema.cardSize.v1';
export const clampBattleZoom=value=>Number.isFinite(Number(value))?Math.max(10,Math.min(200,Math.round(Number(value)))):100;
export function readBattleZoom(storage,profile){
 try{const entry=JSON.parse(storage?.getItem(BATTLE_ZOOM_KEY)||'{}')[profile];if(entry&&typeof entry.percent==='number')return {kind:'cards',profile,percent:clampBattleZoom(entry.percent),mode:entry.mode==='fit'?'fit':'manual'};}catch{}
 return {kind:'cards',profile,percent:100,mode:'manual'};
}
export function saveBattleZoom(storage,setting){
 try{let all;try{all=JSON.parse(storage.getItem(BATTLE_ZOOM_KEY)||'{}');}catch{}if(!all||typeof all!=='object'||Array.isArray(all))all={};all[setting.profile]={percent:clampBattleZoom(setting.percent),mode:setting.mode==='fit'?'fit':'manual'};storage.setItem(BATTLE_ZOOM_KEY,JSON.stringify(all));}catch{}
}
export function fitBattleZoom(regions){
 const ratios=regions.flatMap(({width,height,contentWidth,contentHeight})=>width>0&&height>0&&contentWidth>0&&contentHeight>0?[width/contentWidth,height/contentHeight]:[]);
 return clampBattleZoom(Math.floor(Math.min(1,...ratios)*100));
}
export function battleZoomControlsHTML(){
 return `<div class="battle-zoom-tools"><button class="icon-btn battle-zoom-toggle" type="button" aria-label="カードサイズを調整" title="カードサイズ" aria-expanded="false" aria-controls="battle-zoom-panel"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M6.5 10h7M10 6.5v7"/></svg></button><section id="battle-zoom-panel" class="battle-zoom-panel" aria-label="カードサイズ" hidden><div class="battle-zoom-heading"><strong>カードサイズ</strong><output for="battle-zoom-range">100%</output><button type="button" class="battle-zoom-close" aria-label="カードサイズを閉じる">×</button></div><p>場と手札のカードだけを調整</p><div class="battle-zoom-slider"><button type="button" data-zoom-step="-10" aria-label="10パーセント縮小">−</button><input id="battle-zoom-range" data-focus-key="battle-zoom-range" type="range" min="10" max="200" step="1" value="100" aria-label="カードの表示倍率"><button type="button" data-zoom-step="10" aria-label="10パーセント拡大">＋</button></div><div class="battle-zoom-presets"><button type="button" data-zoom-fit>画面に合わせる</button><button type="button" data-zoom-reset>元に戻す</button></div><small>盤面・枚数表示・操作ボタンは元の大きさ</small></section></div>`;
}

export function bindBattleZoom(root,ui,{view=globalThis.window,storage,onInteraction=()=>{}}={}){
 if(!root?.querySelector)return ()=>{};
 const toggle=root.querySelector('.battle-zoom-toggle'),panel=root.querySelector('.battle-zoom-panel'),range=root.querySelector('#battle-zoom-range');
 if(!toggle||!panel||!range)return ()=>{};
 const doc=root.ownerDocument,profile=ui.mobile?'mobile':'desktop';
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 if(ui.zoom?.kind!=='cards'||ui.zoom.profile!==profile)ui.zoom=readBattleZoom(storage,profile);
 ui.zoomScroll??={};
 const regions=[],disposers=[];
 function region(host,content,key,{row=false,mana=false}={}){
  if(!host||!content)return;
  const rect=content.getBoundingClientRect(),viewport=doc.createElement('div'),space=doc.createElement('div'),canvas=doc.createElement('div');
  viewport.className='battle-zoom-viewport';viewport.dataset.zoomRegion=key;viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',mana?'マナのカード・上下左右にスクロール':'手札・上下左右にスクロール');
  space.className='battle-zoom-space';canvas.className='battle-zoom-canvas';
  viewport.classList.add(mana?'battle-zoom-mana':'battle-zoom-hand');viewport.style.height=rect.height+'px';content.replaceWith(viewport);canvas.append(content);content.classList.add('battle-zoom-hand-track','battle-zoom-card-track');
  space.append(canvas);viewport.append(space);
  const item={host,content,viewport,space,canvas,key,row,width:0,height:0,contentWidth:0,contentHeight:0};regions.push(item);
  const remember=()=>{ui.zoomScroll[key]={left:viewport.scrollLeft,top:viewport.scrollTop};};viewport.addEventListener('scroll',remember,{passive:true});disposers.push(()=>{remember();viewport.removeEventListener('scroll',remember);});
 }
 const board=root.querySelector('.manual-board-area');
 const hand=root.querySelector(ui.mobile?'.hand-shelf-cards':'.manual-hand-cards');if(hand?.querySelector('.manual-hand-card,.hand-shelf-card'))region(hand.parentElement,hand,'hand',{row:ui.mobile});
 root.querySelectorAll('.board-mana-cards').forEach((track,i)=>{if(track.querySelector('.board-mana-card'))region(track.parentElement,track,'mana-'+i,{row:true,mana:true});});
 function measure(){
  for(const r of regions){
   // Restore intrinsic sizing before measuring; transformed bounds would count zoom twice.
   r.canvas.style.width=r.viewport.clientWidth+'px';r.canvas.style.height=r.viewport.clientHeight+'px';
   r.width=r.viewport.clientWidth;r.height=r.viewport.clientHeight;
   if(r.row){r.content.style.width=r.width+'px';r.content.style.height=r.height+'px';r.contentWidth=Math.max(r.width,r.content.scrollWidth);r.contentHeight=r.height;r.content.style.width=r.contentWidth+'px';}
   else{r.content.style.width=r.width+'px';r.content.style.height='auto';r.contentWidth=r.width;r.contentHeight=Math.max(r.height,r.content.scrollHeight);}
   r.canvas.style.width=r.contentWidth+'px';r.canvas.style.height=r.contentHeight+'px';
  }
 }
 let appliedPercent=100;
 function apply({center=false,restore=false}={}){
  const previous=appliedPercent/100;
  if(ui.zoom.mode==='fit')ui.zoom.percent=fitBattleZoom(regions);
  const percent=clampBattleZoom(ui.zoom.percent),scale=percent/100;ui.zoom.percent=percent;
  for(const r of regions){
   const x=(r.viewport.scrollLeft+r.width/2-Math.max(0,r.width-r.contentWidth*previous)/2)/previous,y=(r.viewport.scrollTop+r.height/2)/previous;
   r.canvas.dataset.battleZoomScale=String(scale);r.canvas.style.transform=`scale(${scale})`;
   r.space.style.width=r.contentWidth*scale+'px';r.space.style.height=r.contentHeight*scale+'px';
   if(restore){const scroll=ui.zoomScroll[r.key];r.viewport.scrollLeft=scroll?.left||0;r.viewport.scrollTop=scroll?.top||0;}
   else if(center){r.viewport.scrollLeft=x*scale-r.width/2;r.viewport.scrollTop=y*scale-r.height/2;}
   r.canvas.dispatchEvent(new view.Event('battlezoomchange',{bubbles:true}));
  }
  appliedPercent=percent;range.value=String(percent);range.setAttribute('aria-valuetext',percent+'パーセント');panel.querySelector('output').textContent=percent+'%';
  panel.querySelector('[data-zoom-fit]').setAttribute('aria-pressed',String(ui.zoom.mode==='fit'));
  root.style.setProperty('--battle-card-scale',String(scale));if(board){board.dataset.cardScale=String(scale);board.dispatchEvent(new view.Event('battlecardsizechange'));}
  toggle.classList.toggle('is-zoomed',percent!==100);toggle.title=`カードサイズ：${percent}%`;
 }
 function position(){const rect=toggle.getBoundingClientRect(),width=Math.min(306,(view.innerWidth||doc.documentElement.clientWidth)-16);panel.style.width=width+'px';panel.style.left=Math.max(8,Math.min(rect.right-width,(view.innerWidth||doc.documentElement.clientWidth)-width-8))+'px';panel.style.top=Math.min(rect.bottom+8,Math.max(8,(view.visualViewport?.height||view.innerHeight)-panel.offsetHeight-8))+'px';}
 function open(value,focus=false){ui.zoomOpen=value;panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value){position();if(focus)range.focus({preventScroll:true});}}
 const change=(percent,mode='manual')=>{ui.zoom.mode=mode;ui.zoom.percent=clampBattleZoom(percent);apply({center:true});saveBattleZoom(storage,ui.zoom);};
 const clicked=event=>{const el=event.target.closest('button');if(el===toggle){open(!ui.zoomOpen,true);return;}if(!panel.contains(el))return;if(el.matches('.battle-zoom-close')){open(false);toggle.focus({preventScroll:true});}else if(el.hasAttribute('data-zoom-step'))change(ui.zoom.percent+Number(el.dataset.zoomStep));else if(el.hasAttribute('data-zoom-fit'))change(ui.zoom.percent,'fit');else if(el.hasAttribute('data-zoom-reset')){change(100);for(const r of regions){r.viewport.scrollLeft=0;r.viewport.scrollTop=0;}}};
 const input=()=>change(Number(range.value));
 let dragging=false;
 const start=()=>{dragging=true;onInteraction(true);};
 const end=()=>{if(dragging){dragging=false;onInteraction(false);}};
 const outside=event=>{if(ui.zoomOpen&&!panel.contains(event.target)&&!toggle.contains(event.target))open(false);};
 const key=event=>{if(event.key==='Escape'&&ui.zoomOpen){event.preventDefault();event.stopPropagation();open(false);toggle.focus({preventScroll:true});}};
 const resize=()=>{measure();apply({restore:true});if(ui.zoomOpen)position();};
 root.addEventListener('click',clicked);range.addEventListener('input',input);range.addEventListener('pointerdown',start);view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);view.addEventListener('blur',end);doc.addEventListener('pointerdown',outside);doc.addEventListener('keydown',key,true);view.addEventListener('resize',resize);view.visualViewport?.addEventListener('resize',resize);
 const Observer=view.ResizeObserver,observer=Observer?new Observer(resize):null;for(const r of regions)observer?.observe(r.viewport);
 measure();apply({restore:true});open(!!ui.zoomOpen);
 return ()=>{if(dragging){dragging=false;onInteraction(false,true);}observer?.disconnect();for(const dispose of disposers)dispose();root.removeEventListener('click',clicked);range.removeEventListener('input',input);range.removeEventListener('pointerdown',start);view.removeEventListener('pointerup',end);view.removeEventListener('pointercancel',end);view.removeEventListener('blur',end);doc.removeEventListener('pointerdown',outside);doc.removeEventListener('keydown',key,true);view.removeEventListener('resize',resize);view.visualViewport?.removeEventListener('resize',resize);};
}
