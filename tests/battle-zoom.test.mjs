import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_ZOOM_KEY,clampBattleZoom,readBattleZoom,saveBattleZoom,fitBattleZoom,bindBattleZoom} from '../dist/battle-zoom.js';

test('display preferences are independent on phone and desktop, bounded and safe when storage fails',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(readBattleZoom(storage,'mobile'),{profile:'mobile',percent:100,mode:'manual'});
 saveBattleZoom(storage,{profile:'desktop',percent:160,mode:'manual'});
 saveBattleZoom(storage,{profile:'mobile',percent:74,mode:'fit'});
 assert.equal(readBattleZoom(storage,'desktop').percent,160);
 assert.deepEqual(readBattleZoom(storage,'mobile'),{profile:'mobile',percent:74,mode:'fit'});
 data.set(BATTLE_ZOOM_KEY,'broken JSON');assert.equal(readBattleZoom(storage,'mobile').percent,100);
 saveBattleZoom(storage,{profile:'mobile',percent:999,mode:'unknown'});assert.equal(readBattleZoom(storage,'mobile').percent,200);assert.equal(readBattleZoom(storage,'mobile').mode,'manual');
 data.set(BATTLE_ZOOM_KEY,JSON.stringify({mobile:{percent:'<script>'}}));assert.equal(readBattleZoom(storage,'mobile').percent,100);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
 assert.equal(readBattleZoom(blocked,'mobile').percent,100);assert.doesNotThrow(()=>saveBattleZoom(blocked,{profile:'mobile',percent:120}));
 assert.equal(clampBattleZoom(Infinity),100);assert.equal(clampBattleZoom(NaN),100);assert.equal(clampBattleZoom(-50),10);assert.equal(clampBattleZoom(136.6),137);
 assert.doesNotThrow(()=>bindBattleZoom(null,{})());
});
test('fit considers both board and whole hand, fits downwards and never magnifies a small hand',()=>{
 const board={width:367,height:421,contentWidth:367,contentHeight:421},phoneHand={width:355,height:96,contentWidth:504,contentHeight:96};
 assert.equal(fitBattleZoom([board,phoneHand]),70);
 assert.equal(fitBattleZoom([{width:438,height:160,contentWidth:438,contentHeight:380}]),42);
 assert.equal(fitBattleZoom([{width:500,height:500,contentWidth:100,contentHeight:100}]),100);
 assert.equal(fitBattleZoom([]),100);assert.equal(fitBattleZoom([{width:0,height:0,contentWidth:0,contentHeight:0}]),100);
});
