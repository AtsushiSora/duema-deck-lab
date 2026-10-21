import test from 'node:test';import assert from 'node:assert/strict';
import {gridProjections,detectGridFromProjections,makeSupportGrid,scaleSupportGrid,createTitleMatcher,aggregateScreenshotSlots,screenshotReview} from '../dist/support-import.js';
import {recognizeSupportCells,combineTitleResults,groupScreenshotSlots} from '../dist/support-reader.js';
import {supportScreenshotHTML} from '../dist/support-ui.js';
const cards=[{id:'bronze',name:'青銅の鎧',supported:true,limit:4},{id:'aqua',name:'アクア・ハルカス',supported:true,limit:4},{id:'oni',name:'異端流し オニカマス',supported:false},{id:'numeric',name:'5000の切り札',supported:false}];
const registry={get:id=>cards.find(c=>c.id===id),resolveRows(rows){const m=new Map();for(const r of rows)m.set(r.id,(m.get(r.id)||0)+r.count);return [...m].map(([id,count])=>({id,count}));},validate({cards:rows}){return rows.flatMap(r=>r.id==='bronze'&&r.count>4?['青銅の鎧は4枚までです']:[]);}};
const pixels=(columns,rows)=>{const w=columns*40+20,h=rows*56+20,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,inside=x>=10&&x<columns*40+10&&y>=10&&y<rows*56+10&&(x-10)%40<36&&(y-10)%56<52;const v=inside?((x+y)%4<2?220:35):20;data.set([v,v,v,255],i);}return{width:w,height:h,data};};
test('automatic segmentation finds forty separate rectangles for supported column counts, with a safe fallback for a blank image',()=>{
 for(const columns of [4,5,8,10]){const image=pixels(columns,40/columns),grid=detectGridFromProjections(gridProjections(image));assert.equal(grid.detected,true);assert.equal(grid.columns,columns);assert.equal(grid.cells.length,40);assert.equal(grid.cells[39].index,39);for(const c of grid.cells){assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=image.width&&c.y+c.height<=image.height);}}
 const blank={width:400,height:500,data:new Uint8ClampedArray(400*500*4)};assert.equal(detectGridFromProjections(gridProjections(blank)).detected,false);
});
test('manual bounds and resized image coordinates preserve forty cells and reject invalid layouts',()=>{
 const g=makeSupportGrid(1200,1000,{columns:8,bounds:{left:.02,right:.98,top:.03,bottom:.99}}),big=scaleSupportGrid(g,2400,2000);assert.equal(big.cells.length,40);assert.equal(big.cells[0].x,g.cells[0].x*2);assert.throws(()=>makeSupportGrid(1200,1000,{columns:7}));assert.throws(()=>makeSupportGrid(1200,1000,{bounds:{left:.8,right:.2,top:0,bottom:1}}));assert.throws(()=>gridProjections({width:20,height:20,data:[]}));
});
test('exact title recognition is independent of art edition and never interprets printed costs as quantities',()=>{
 const match=createTitleMatcher(cards),a=match('3 青銅の鎧',90),b=match('青銅の鎧',80);assert.equal(a.id,'bronze');assert.equal(a.confirmed,true);const rows=aggregateScreenshotSlots([a,b]);assert.equal(rows.length,1);assert.equal(rows[0].count,2);assert.equal(rows[0].confirmed,true);
});
test('short junk and missing OCR text retain an empty card with finite scores, and fuzzy guesses require review',()=>{
 const m=createTitleMatcher(cards);for(const text of ['', '7','!?','ての']){const r=m(text,90);assert.equal(r.id,'');assert.equal(r.confirmed,false);assert.equal(r.score,0);}const f=m('異端消し オニカマス',70);assert.equal(f.candidates[0].id,'oni');assert.equal(f.confirmed,false);assert.ok(Number.isFinite(combineTitleResults(m('',0),f).score));
});
test('ambiguous mono/twinpact title faces stay unassigned instead of silently picking the mono card',()=>{
 const m=createTitleMatcher([{id:'mono',name:'青銅の鎧'},{id:'twin',name:'青銅の鎧 / 青銅の魔法',faces:[{name:'青銅の鎧'},{name:'青銅の魔法'}]}]);const r=m('青銅の鎧',99);assert.equal(r.id,'');assert.equal(r.confirmed,false);assert.equal(r.candidates.length,2);assert.equal(m('青銅の鎧 / 青銅の魔法',99).id,'twin');
});
test('conflicting OCR passes cannot confirm different names, and all unknown cells remain counted',()=>{
 const m=createTitleMatcher(cards),r=combineTitleResults(m('青銅の鎧',99),m('アクア・ハルカス',99));assert.equal(r.confirmed,false);const rows=aggregateScreenshotSlots(Array.from({length:40},(_,i)=>i<4?m('青銅の鎧',99):m('',0)));assert.equal(rows.reduce((n,r)=>n+r.count,0),40);assert.equal(rows.filter(r=>!r.id).length,36);
});
test('near-identical full-card images may share an unresolved row without dropping or confirming copies',()=>{
 const slots=[{id:'',confirmed:false,appearance:[20,30,40],candidates:[]},{id:'',confirmed:false,appearance:[21,31,40],candidates:[]},{id:'',confirmed:false,appearance:[90,110,140],candidates:[]}];const grouped=groupScreenshotSlots(slots),rows=aggregateScreenshotSlots(grouped);assert.deepEqual(rows.map(r=>r.count),[2,1]);assert.ok(rows.every(r=>!r.confirmed));assert.ok(grouped.every(r=>!r.appearance));
});
test('the reader reports progress for all forty slots, retries uncertain titles, and preserves images on OCR misses',async()=>{
 const calls=[],progress=[];const r=await recognizeSupportCells({cells:makeSupportGrid(1200,1000).cells,cards,makeImages:c=>({title:c.index,alternate:()=>c.index+100,thumbnail:'thumb-'+c.index}),recognize:async(i,psm)=>{calls.push([i,psm]);return{confidence:95,text:i<4?'青銅の鎧':''};},onProgress:(done,total)=>progress.push([done,total])});assert.equal(r.slots.length,40);assert.equal(r.rows.reduce((n,r)=>n+r.count,0),40);assert.equal(r.rows[0].count,4);assert.equal(calls.length,76);assert.deepEqual(progress.at(-1),[40,40]);assert.ok(r.rows.slice(1).every(r=>r.thumbnail&&r.id===''));
});
test('cancelled and failed recognition never returns partial cards for automatic registration',async()=>{
 const options={cells:makeSupportGrid(1200,1000).cells,cards,makeImages:()=>({title:'x',alternate:()=>'',thumbnail:''})};let cancelled=false;const r=await recognizeSupportCells({...options,recognize:async()=>{cancelled=true;return{text:'青銅の鎧',confidence:99};},cancelled:()=>cancelled});assert.equal(r,null);await assert.rejects(()=>recognizeSupportCells({...options,recognize:async()=>{throw Error('offline');}}),/offline/);await assert.rejects(()=>recognizeSupportCells({...options,cells:[]}),/40枚/);
});
test('review rejects missing names, unconfirmed guesses, invalid quantities and canonical totals over a card limit',()=>{
 assert.equal(screenshotReview([{id:'oni',count:40,confirmed:true}],registry).ready,true);for(const rows of [[{id:'',count:40,confirmed:true}],[{id:'oni',count:40,confirmed:false}],[{id:'oni',count:39,confirmed:true}],[{id:'oni',count:NaN,confirmed:true}],[{id:'bronze',count:2,confirmed:true},{id:'bronze',count:3,confirmed:true},{id:'oni',count:35,confirmed:true}]])assert.equal(screenshotReview(rows,registry).ready,false);
 const r=screenshotReview([{id:'oni',count:40,confirmed:true}],registry);assert.equal(r.unsupported,40);assert.deepEqual(r.cards,[{id:'oni',count:40}]);
});
test('mobile review presents original crops, exact counts, candidate corrections, confirmation and both save destinations',()=>{
 const p={source:'support',url:'blob:test',rows:[{id:'oni',count:40,confirmed:true,thumbnail:'data:image/jpeg;base64,AA',slots:[1]}]},before=structuredClone(p);for(const role of ['mine','opponent']){const html=supportScreenshotHTML(p,registry,{role});assert.match(html,/40 \/ 40枚/);assert.match(html,/data-action="support-register"/);assert.ok(!/data-action="support-register" disabled/.test(html));assert.ok(html.includes(role==='mine'?'マイデッキに登録':'相手デッキに登録'));assert.match(html,/効果未対応 40枚/);assert.match(html,/画像は端末内で処理/);}assert.deepEqual(p,before);
 const bad=supportScreenshotHTML({...p,rows:[{id:'',count:40,confirmed:false,candidates:[{id:'oni',name:'異端流し オニカマス'}]}]},registry);assert.match(bad,/data-action="support-candidate"/);assert.match(bad,/data-action="support-register" disabled/);assert.match(bad,/要確認/);
});
test('numeric card names retain their leading digits and source thumbnails offer an enlargement control',()=>{
 assert.equal(createTitleMatcher(cards)('5000の切り札',95).id,'numeric');const html=supportScreenshotHTML({source:'support',rows:[{id:'oni',count:40,confirmed:true,thumbnail:'data:image/jpeg;base64,AA'}]},registry);assert.match(html,/data-action="support-zoom"/);assert.match(html,/aria-label="元のカード画像を拡大"/);
});
test('a partial exact substring never overrides a longer nearly matching card or confirms OCR garbage',()=>{
 const m=createTitleMatcher([{id:'base',name:'ボルシャック・ドラゴン'},{id:'long',name:'ボルシャック・ドラゴン・サイン'}]);const r=m('ボルシャック・ドラゴン・サイソ',95);assert.equal(r.confirmed,false);assert.equal(r.candidates[0].id,'long');assert.equal(createTitleMatcher(cards)('ゴミ文字アクア・ハルカス追加文字',95).confirmed,false);
 const review=screenshotReview([{id:'',count:40,confirmed:false}],registry);assert.equal(review.unsupported,0);assert.match(supportScreenshotHTML({source:'support',rows:[{id:'',count:40,confirmed:false}]},registry),/効果の対応状況はカード名の確定後/);
});
test('image preparation bounds both full-size and detection canvases and rejects extremely tall scroll captures',async()=>{
 const {supportImageSize}=await import('../dist/support-reader.js');for(const [w,h]of [[1206,1030],[4000,16000],[16000,4000],[12000,12000]]){const s=supportImageSize(w,h);assert.ok(s.width*s.height<=8000000);assert.ok(s.sampleWidth*s.sampleHeight<=600000);assert.ok(s.sampleWidth<=600);assert.ok(s.sampleHeight<=1200);}assert.throws(()=>supportImageSize(320,30000),/カード一覧/);assert.throws(()=>supportImageSize(100,100),/小さすぎ/);
});
test('confident image matches read all forty slots without initializing OCR',async()=>{
 let calls=0;const r=await recognizeSupportCells({cells:makeSupportGrid(1200,1000).cells,cards,makeImages:()=>({fingerprints:[new Uint8Array(288)],thumbnail:'crop'}),matchImage:()=>({id:'bronze',confirmed:true,candidates:[{id:'bronze',name:'青銅の鎧',score:.99}],score:.99,method:'image'}),recognize:async()=>{calls++;throw Error('OCR should not start');}});assert.equal(calls,0);assert.equal(r.slots.length,40);assert.equal(r.rows[0].count,40);assert.equal(r.rows[0].confirmed,true);assert.equal(r.rows[0].method,'image');
});
test('uncertain image matches use OCR and conflicting names remain unconfirmed',async()=>{
 let calls=0;const r=await recognizeSupportCells({cells:makeSupportGrid(1200,1000).cells,cards,makeImages:()=>({fingerprints:[new Uint8Array(288)],title:'crop',alternate:()=>''}),matchImage:()=>({id:'oni',confirmed:false,candidates:[{id:'oni',name:'異端流し オニカマス',score:.9}],score:.9,imageError:.1}),recognize:async()=>{calls++;return{text:'青銅の鎧',confidence:99};}});assert.equal(calls,40);assert.ok(r.rows.every(r=>!r.confirmed));assert.equal(r.slots.length,40);
});
