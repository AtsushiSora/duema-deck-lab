import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {BATTLE_THEMES,DISPLAY_PREFERENCES_KEY,normalizeDisplayPreferences,readDisplayPreferences,saveDisplayPreferences,applyDisplayPreferences,battleThemeSettingsHTML} from '../dist/display-preferences.js';
const storage=initial=>{const rows=new Map(Object.entries(initial||{}));return {rows,getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)};};
test('legacy, absent, malformed or unsafe colour choices retain standard and keep text and motion preferences',()=>{
 for(const battleTheme of [undefined,null,'unknown','url(https://example.test)','blue" onclick="bad',{},['blue']])assert.deepEqual(normalizeDisplayPreferences({textSize:'large',motion:'reduced',battleTheme}),{textSize:'large',motion:'reduced',battleTheme:'standard'});
 assert.equal(readDisplayPreferences(storage({[DISPLAY_PREFERENCES_KEY]:'broken'})).battleTheme,'standard');assert.equal(readDisplayPreferences(null).battleTheme,'standard');
});
for(const [id]of BATTLE_THEMES)test('battle colour '+id+' restores from device settings without modifying deck or account storage',()=>{
 const decks='{"decks":[{"id":"unchanged","cards":[]}]}',s=storage({'duema-deck-lab-v1':decks});assert.equal(saveDisplayPreferences(s,{textSize:'largest',motion:'full',battleTheme:id}),true);const restored=readDisplayPreferences(s);assert.deepEqual(restored,{textSize:'largest',motion:'full',battleTheme:id});const attrs={};applyDisplayPreferences({documentElement:{setAttribute:(k,v)=>attrs[k]=v}},restored);assert.deepEqual(attrs,{'data-text-size':'largest','data-motion':'full','data-battle-theme':id});assert.equal(s.getItem('duema-deck-lab-v1'),decks);assert.equal(s.rows.size,2);
});
test('a failed preference write reports failure and keeps the previous saved choice',()=>{const s=storage();saveDisplayPreferences(s,{battleTheme:'blue',textSize:'large'});s.setItem=()=>{throw Error('quota');};assert.equal(saveDisplayPreferences(s,{battleTheme:'sand'}),false);assert.equal(readDisplayPreferences(s).battleTheme,'blue');assert.equal(readDisplayPreferences(s).textSize,'large');});
test('colour settings offer six labelled native radio choices, one selected option and separate playmat guidance',()=>{const html=battleThemeSettingsHTML({battleTheme:'violet'});assert.equal(BATTLE_THEMES.length,6);assert.equal(new Set(BATTLE_THEMES.map(([id])=>id)).size,6);assert.equal((html.match(/type="radio"/g)||[]).length,6);assert.equal((html.match(/ checked/g)||[]).length,1);assert.match(html,/value="violet" checked/);assert.match(html,/<legend>対戦画面の色/);assert.match(html,/プレイマットの柄はデッキ編集/);for(const[id,label]of BATTLE_THEMES){assert.ok(html.includes(label));assert.ok(html.includes('value="'+id+'"'));}});
const css=fs.readFileSync('dist/battle-colors.css','utf8');
const luminance=hex=>hex.match(/[a-f\d]{2}/gi).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const[id]of BATTLE_THEMES)test('battle palette '+id+' provides readable panel, secondary, button, board and warning text',()=>{
 const body=css.slice(css.indexOf('html[data-battle-theme="'+id+'"]')).match(/\{([^}]+)\}/)[1],v=Object.fromEntries([...body.matchAll(/--battle-([\w-]+):(#\w+);/g)].map(m=>[m[1],m[2]]));
 for(const[fg,bg]of [['ink','surface'],['ink','raised'],['muted','surface'],['muted','raised'],['on-accent','accent'],['on-soft','soft'],['highlight','surface'],['board-ink','board'],['danger','surface']])assert.ok(contrast(v[fg],v[bg])>=4.5,`${id} ${fg}/${bg}: ${contrast(v[fg],v[bg])}`);
});
