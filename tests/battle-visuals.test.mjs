import test from 'node:test';
import assert from 'node:assert/strict';
import {e,PRESETS,target,GG,inst,give,setup,attack} from './target-fixture.mjs';
import {publicBoardSnapshot,boardChanges,updateBoardFeedback,previewAttackAction,attackRoute,attackArrowGeometry,bindAttackArrow} from '../dist/battle-visuals.js';
import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
const h={art:id=>`<i data-card="${id}"></i>`,icon:n=>`<svg data-icon="${n}"></svg>`};
test('feedback tracks only public arrivals and count changes, never private identities or a starting deal',()=>{
 const s=e.createGame([target,target],{seed:72}),initial=updateBoardFeedback(null,s,100);assert.equal(initial.feedback,null);
 const before=publicBoardSnapshot(s);s.players[0].battle.push(inst('dm01-108'));s.players[0].mana.push(inst('dm01-097'));s.players[1].shields.splice(0,2);
 const changes=boardChanges(before,publicBoardSnapshot(s));assert.equal(changes.length,3);assert.ok(changes.some(x=>x.kind==='arrived'&&x.player===0));assert.ok(changes.some(x=>x.zone==='mana'&&x.delta===1));assert.ok(changes.some(x=>x.zone==='shields'&&x.delta===-2));
 s.players[1].hand=[{uid:'PRIVATE_HAND',cardId:'PRIVATE_HAND_CARD'}];s.players[1].deck=[{uid:'PRIVATE_LIBRARY',cardId:'PRIVATE_LIBRARY_CARD'}];s.players[1].shields=s.players[1].shields.map(x=>({...x,cardId:'PRIVATE_SHIELD_CARD'}));
 const current=updateBoardFeedback(initial,s,200),json=JSON.stringify(current);for(const secret of ['PRIVATE_HAND','PRIVATE_LIBRARY','PRIVATE_SHIELD'])assert.ok(!json.includes(secret));
 const html=manualScreenHTML(s,{...newManualUI(),feedback:current.feedback,feedbackAge:300},h);assert.ok(html.includes('直前の変化'));assert.ok(html.includes('シールド -2枚'));assert.ok(html.includes('マナ +1枚'));assert.ok(html.includes('arrival-tag'));assert.ok(html.includes('--change-delay:-300ms'));assert.ok(!html.includes('PRIVATE_'));
});
test('display changes retain feedback age, later changes replace it, and undo initializes without false arrivals',()=>{
 const s=setup(),initial=updateBoardFeedback(null,s,0);s.actions++;s.players[0].battle.push(inst('dm01-108'));const a=updateBoardFeedback(initial,s,100),old=structuredClone(a);assert.deepEqual(updateBoardFeedback(a,s,500).feedback,a.feedback);assert.deepEqual(a,old);
 s.actions++;s.players[1].mana.push(inst('dm01-075'));const b=updateBoardFeedback(a,s,600);assert.equal(b.feedback.items.length,1);assert.equal(b.feedback.at,600);
 s.actions=0;assert.equal(updateBoardFeedback(b,s,800).feedback,null);
});
test('attack previews use a current legal action, target public creature/shield anchors, and do not mutate state',()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,1,'battle',['dm01-075']);s.players[1].battle[0].tapped=true;s.phase='attack';const before=structuredClone(s),a=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.target!=='player'),ui={...newManualUI(),attacker:a.uid,attackChoice:a};
 assert.equal(previewAttackAction(s,ui).id,a.id);assert.equal(attackRoute(s,ui).to.key,`creature:1:${a.target}`);assert.equal(attackRoute(s,ui).preview,true);assert.deepEqual(s,before);
 const shield=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.shield),route=attackRoute(s,{...ui,attackChoice:shield});assert.ok(route.to.key.startsWith('shield:1:'));assert.ok(!JSON.stringify(route).includes('cardId'));
 s.players[1].battle[0].tapped=false;assert.equal(previewAttackAction(s,ui),null);assert.equal(attackRoute(s,ui),null);
});
test('multibreaker attacks and opponent attacks keep the correct direction and public destination after declaration',()=>{
 const s=setup();give(s,0,'battle',[GG]);s.phase='attack';const a=e.getLegalActions(s).find(a=>a.kind==='attack'),route=attackRoute(s,{attackChoice:a});assert.equal(route.to.key,'player:1');assert.match(route.to.label,/シールド/);e.step(s,a);assert.equal(attackRoute(s).preview,false);assert.equal(attackRoute(s).player,0);
 const t=setup();give(t,1,'battle',['dm01-108']);t.active=1;attack(t);assert.equal(attackRoute(t).player,1);assert.ok(attackRoute(t).from.key.startsWith('creature:1:'));assert.match(attackRoute(t).to.key,/^(player|shield):0/);
 t.attack=null;assert.equal(attackRoute(t),null);
});
test('arrow geometry follows mobile and landscape coordinates, clips both scroll directions and rejects unusable layouts',()=>{
 const v={left:20,top:60,width:360,height:300},from={left:110,top:260,width:60,height:70},to={left:180,top:90,width:44,height:44};
 const a=attackArrowGeometry(v,from,to);assert.equal(a.clipped,false);assert.ok(a.start.y>a.end.y);assert.ok(a.path.startsWith('M '));
 const horizontal=attackArrowGeometry(v,from,{...to,left:900},{toClip:{left:30,top:80,width:320,height:90}});assert.equal(horizontal.clipped,true);assert.ok(horizontal.end.x<=330);
 const vertical=attackArrowGeometry(v,{...from,top:800},to);assert.equal(vertical.clipped,true);assert.ok(vertical.start.y<=300);
 for(const width of [280,390,720])for(const height of [150,260,500])for(const left of [-500,10,900])for(const top of [-600,100,1000]){const g=attackArrowGeometry({left:0,top:0,width,height},{left,top,width:55,height:65},{left:width/2,top:height/2,width:44,height:44});if(g)for(const p of [g.start,g.end]){assert.ok(p.x>=0&&p.x<=width);assert.ok(p.y>=0&&p.y<=height);assert.ok(!g.path.includes('NaN'));}}
 assert.equal(attackArrowGeometry({left:0,top:0,width:0,height:0},from,to),null);assert.equal(attackArrowGeometry(v,{...from,left:NaN},to),null);
});
test('SVG binding redraws on nested scroll and resize, clears missing endpoints, and removes every listener on teardown',()=>{
 const listeners=new Map(),attributes=new Map(),line={setAttribute:(k,v)=>attributes.set(k,v)},origin={setAttribute(){}},classes=new Set(),note={textContent:''};let y=200,targets=true,disconnected=false;
 const el=(key,left,top)=>({dataset:{visualKey:key},getBoundingClientRect:()=>({left,top:top(),width:44,height:60}),closest:()=>null});
 const nodes=[el('from',20,()=>y),el('to',140,()=>30)];
 const area={getBoundingClientRect:()=>({left:0,top:0,width:300,height:300}),parentElement:{getBoundingClientRect:()=>({left:0,top:0}),querySelector:()=>note},querySelectorAll:()=>targets?nodes:[],addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n,f)=>{assert.equal(listeners.get(n),f);listeners.delete(n);}};
 const svg={style:{},setAttribute(){},querySelector:s=>s==='.attack-arrow-line'?line:origin,classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
 const view={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n,f)=>{assert.equal(listeners.get(n),f);listeners.delete(n);},ResizeObserver:class{observe(){}disconnect(){disconnected=true;}}};
 const stop=bindAttackArrow(area,svg,{from:{key:'from'},to:{key:'to'}},view),first=attributes.get('d');assert.equal(svg.style.display,'block');y=150;listeners.get('scroll')();assert.notEqual(attributes.get('d'),first);y=800;listeners.get('resize')();assert.ok(classes.has('has-clipped-end'));assert.ok(note.textContent.includes('画面外'));targets=false;listeners.get('scroll')();assert.equal(svg.style.display,'none');stop();assert.equal(listeners.size,0);assert.equal(disconnected,true);assert.doesNotThrow(()=>bindAttackArrow(null,null,null)());
});

test('attack arrows keep the same card anchors at reduced and magnified battle display sizes',()=>{
 const drawAt=scale=>{
  const attrs=new Map(),line={setAttribute:(key,value)=>attrs.set(key,value)},origin={setAttribute(){}};
  const rect=(left,top,width,height)=>({left:left*scale,top:top*scale,width:width*scale,height:height*scale});
  const source={dataset:{visualKey:'from'},getBoundingClientRect:()=>rect(50,240,50,60),closest:()=>null},target={dataset:{visualKey:'to'},getBoundingClientRect:()=>rect(200,40,50,60),closest:()=>null};
  const area={closest:()=>({dataset:{battleZoomScale:String(scale)}}),getBoundingClientRect:()=>rect(10,10,300,350),parentElement:{getBoundingClientRect:()=>rect(10,10,300,350),querySelector:()=>null},querySelectorAll:()=>[source,target],addEventListener(){},removeEventListener(){}};
  const svg={style:{},setAttribute:(key,value)=>attrs.set(key,value),querySelector:selector=>selector==='.attack-arrow-line'?line:origin,classList:{toggle(){}}};
  const stop=bindAttackArrow(area,svg,{from:{key:'from'},to:{key:'to'}},{addEventListener(){},removeEventListener(){}});stop();return {path:attrs.get('d'),box:attrs.get('viewBox'),style:svg.style};
 };
 const expected=drawAt(1);for(const scale of [.5,.7,1.6,2]){const actual=drawAt(scale);assert.equal(actual.path,expected.path);assert.equal(actual.box,expected.box);assert.equal(actual.style.width,expected.style.width);assert.equal(actual.style.display,'block');}
});
