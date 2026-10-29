import {getLegalActions,card} from './engine.js';

// Presentation state contains only public board identities and zone counts.
export function publicBoardSnapshot(s){return {actions:s.actions,turn:s.turn,players:s.players.map(p=>({battle:p.battle.map(x=>({uid:x.uid,cardId:x.cardId})),mana:p.mana.length,shields:p.shields.length}))};}
export function boardChanges(before,after){
 if(!before)return [];
 return after.players.flatMap((p,player)=>{
  const old=before.players[player],arrived=p.battle.filter(x=>!old.battle.some(y=>y.uid===x.uid&&y.cardId===x.cardId)),departed=old.battle.filter(x=>!p.battle.some(y=>y.uid===x.uid));
  return [...arrived.map(x=>({player,zone:'battle',uid:x.uid,cardId:x.cardId,kind:'arrived'})),...(departed.length?[{player,zone:'battle',kind:'departed',delta:-departed.length}]:[]),...['mana','shields'].filter(zone=>p[zone]!==old[zone]).map(zone=>({player,zone,kind:'count',delta:p[zone]-old[zone]}))];
 });
}
export function updateBoardFeedback(previous,s,now=Date.now()){
 const snapshot=publicBoardSnapshot(s);
 if(!previous||s.actions<previous.snapshot.actions||s.turn<previous.snapshot.turn)return {snapshot,feedback:null};
 const changes=boardChanges(previous.snapshot,snapshot);
 return {snapshot,feedback:changes.length?{items:changes,at:now}:previous.feedback};
}
export function previewAttackAction(s,ui){
 const a=ui.attackChoice;if(!a||s.winner!==null)return null;
 return getLegalActions(s).find(x=>x.player===0&&x.kind==='attack'&&x.id===a.id&&x.uid===a.uid&&x.target===a.target&&x.shield===a.shield)||null;
}
export function attackRoute(s,ui={}){
 const preview=previewAttackAction(s,ui),a=preview||s.attack;if(!a||s.winner!==null)return null;
 const player=preview?0:s.active,opponent=1-player,attacker=s.players[player].battle.find(x=>x.uid===(a.uid||a.attacker));if(!attacker)return null;
 const from={key:`creature:${player}:${attacker.uid}`,label:card(attacker).name};let to;
 if(a.target!=='player'){
  const target=s.players[opponent].battle.find(x=>x.uid===a.target);if(!target)return null;
  to={key:`creature:${opponent}:${target.uid}`,label:card(target).name};
 }else if(a.shield&&s.players[opponent].shields.some(x=>x.uid===a.shield)){
  to={key:`shield:${opponent}:${a.shield}`,label:`${opponent?'相手':'自分'}のシールド ${s.players[opponent].shields.findIndex(x=>x.uid===a.shield)+1}`};
 }else to={key:`player:${opponent}`,label:`${opponent?'相手':'自分'}${s.players[opponent].shields.length?'のシールド':'へダイレクトアタック'}`};
 return {from,to,preview:!!preview,player};
}

const rect=r=>({left:r.left,top:r.top,right:r.right??r.left+r.width,bottom:r.bottom??r.top+r.height});
const intersect=(a,b)=>({left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Off-screen endpoints point to the relevant viewport edge. Never draw outside it.
export function attackArrowGeometry(viewport,from,to,{fromClip=null,toClip=null}={}){
 const v=rect(viewport),w=v.right-v.left,h=v.bottom-v.top;
 if(![v.left,v.top,w,h].every(Number.isFinite)||w<24||h<24)return null;
 const anchor=(r,clip)=>{
  r=rect(r);if(!Object.values(r).every(Number.isFinite))return null;
  const c=clip?intersect(v,rect(clip)):v,visible=intersect(r,c),clipped=visible.left>=visible.right||visible.top>=visible.bottom;
  const edge=c.left<c.right&&c.top<c.bottom?c:v;
  return {x:clamp(clipped?(r.left+r.right)/2:(visible.left+visible.right)/2,Math.min(edge.left+5,v.right-10),Math.max(edge.right-5,v.left+10))-v.left,y:clamp(clipped?(r.top+r.bottom)/2:(visible.top+visible.bottom)/2,Math.min(edge.top+5,v.bottom-10),Math.max(edge.bottom-5,v.top+10))-v.top,clipped};
 };
 const start=anchor(from,fromClip),end=anchor(to,toClip);if(!start||!end)return null;
 const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);if(length<15)return null;
 const tip={x:end.x-dx/length*7,y:end.y-dy/length*7};
 const mid={x:clamp((start.x+tip.x)/2+Math.min(42,length*.12),10,w-10),y:(start.y+tip.y)/2};
 return {width:w,height:h,start,end:tip,clipped:start.clipped||end.clipped,path:`M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${tip.x} ${tip.y}`};
}

// Scroll/resize only updates the SVG; it never re-renders or advances the game.
export function bindAttackArrow(area,svg,route,view=globalThis.window){
 if(!area||!svg||!route)return ()=>{};
 const find=key=>[...area.querySelectorAll('[data-visual-key]')].find(el=>el.dataset.visualKey===key);
 const draw=()=>{
  const from=find(route.from.key),to=find(route.to.key);if(!from||!to){svg.style.display='none';return;}
  const scale=Number(area.closest?.('.battle-zoom-canvas')?.dataset.battleZoomScale)||1;
  const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left/scale,top:r.top/scale,right:(r.right??r.left+r.width)/scale,bottom:(r.bottom??r.top+r.height)/scale,width:r.width/scale,height:r.height/scale};};
  const bounds=rect(area),frame=rect(area.parentElement);
  const geometry=attackArrowGeometry(bounds,rect(from),rect(to),{fromClip:from.closest('.play-creatures,.shield-tiles')?rect(from.closest('.play-creatures,.shield-tiles')):undefined,toClip:to.closest('.play-creatures,.shield-tiles')?rect(to.closest('.play-creatures,.shield-tiles')):undefined});
  if(!geometry){svg.style.display='none';return;}
  svg.style.display='block';svg.style.left=`${bounds.left-frame.left}px`;svg.style.top=`${bounds.top-frame.top}px`;svg.style.width=`${geometry.width}px`;svg.style.height=`${geometry.height}px`;svg.setAttribute('viewBox',`0 0 ${geometry.width} ${geometry.height}`);
  svg.querySelector('.attack-arrow-line').setAttribute('d',geometry.path);svg.querySelector('.attack-arrow-origin').setAttribute('cx',geometry.start.x);svg.querySelector('.attack-arrow-origin').setAttribute('cy',geometry.start.y);svg.classList.toggle('has-clipped-end',geometry.clipped);
  const note=area.parentElement.querySelector('.attack-offscreen-note');if(note)note.textContent=geometry.clipped?'画面外の対象あり・盤面をスクロール':'';
 };
 area.parentElement.addEventListener?.('battlezoomchange',draw);area.addEventListener('scroll',draw,{capture:true,passive:true});view?.addEventListener('resize',draw);
 const Observer=view?.ResizeObserver||globalThis.ResizeObserver,observer=Observer?new Observer(draw):null;observer?.observe(area);draw();
 return ()=>{area.parentElement.removeEventListener?.('battlezoomchange',draw);area.removeEventListener('scroll',draw,true);view?.removeEventListener('resize',draw);observer?.disconnect();};
}
