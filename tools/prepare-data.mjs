import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const rows=JSON.parse(await readFile(new URL('tools/research/official-cards.json',root),'utf8'));
const spec={40:{effect:'teamBuff'},42:{},43:{endUntap:true},46:{effect:'tapTwo'},48:{blocker:true,noAttack:true},49:{unblockable:true},50:{death:'hand'},51:{blocker:true},52:{effect:'drawUpTo3',trigger:true},54:{effect:'discard'},55:{blocker:true},75:{},76:{blocker:true,noPlayerAttack:true},77:{effect:'unblock'},78:{effect:'tap',trigger:true},79:{blocker:true,noAttack:true},80:{effect:'optionalDraw'},81:{unblockable:true},82:{blocker:true,noAttack:true},83:{},84:{blocker:true,noAttack:true},85:{effect:'tap'},86:{effect:'bounce',trigger:true},87:{},88:{slayer:true},89:{blocker:true,noAttack:true,afterBattleDie:true},90:{},91:{blocker:true,noAttack:true},93:{effect:'destroyUntapped'},94:{effect:'discard',trigger:true},95:{attackBonus:2000},97:{},98:{attackBonus:2000},100:{mustAttack:true},101:{effect:'destroySmall'},102:{effect:'buff'},103:{},104:{attackBonus:2000},105:{death:'mana'},106:{effect:'ramp1'},107:{noPlayerAttack:true},108:{},109:{effect:'ramp2'},110:{effect:'searchCreature',trigger:true}};
const regulation=await(await fetch('https://dm.takaratomy.co.jp/rule/regulation/')).text();
await writeFile(new URL('tools/research/regulation.html',root),regulation);
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const reg=strip(regulation);
const banned=reg.slice(reg.indexOf('※デッキに1枚も入れる'),reg.indexOf('※デッキに1枚ずつ'));
const limited=reg.slice(reg.indexOf('※デッキに1枚ずつ'));
const cards=rows.filter(x=>spec[Number(x.id.slice(-3))]).map(x=>{
 const t=x.text,n=Number(x.id.slice(-3)),name=x.title.split('(')[0],effectText=t.split('特殊能力')[1]?.split('フレーバー')[0]?.trim()||'能力なし';
 return {id:x.id,name,civ:t.match(/文明 (\S+)/)?.[1],type:t.includes('カードの種類 呪文')?'spell':'creature',cost:Number(t.match(/コスト (\d+)/)?.[1]),power:Number(t.match(/パワー (\d+)/)?.[1]||0),race:t.match(/種族 (.*?) イラストレーター/)?.[1]||'',text:effectText,source:x.url,limit:banned.includes(name)?0:limited.includes(name)?1:4,...spec[n]};
});
await writeFile(new URL('dist/cards.json',root),JSON.stringify({checkedAt:'2026-10-20',rules:'1.53',cards},null,2));
await mkdir(new URL('dist/vendor',root),{recursive:true});
const downloads=[['https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js','tesseract.min.js'],['https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js','worker.min.js'],['https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm.js'],['https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm','tesseract-core-lstm.wasm'],['https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-simd-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'],['https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-simd-lstm.wasm','tesseract-core-simd-lstm.wasm'],['https://tessdata.projectnaptha.com/4.0.0_fast/jpn.traineddata.gz','jpn.traineddata.gz'],['https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/LICENSE.md','TESSERACT-LICENSE.md'],['https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/LICENSE','TESSERACT-CORE-LICENSE']];
for(const [url,name]of downloads){const r=await fetch(url);if(!r.ok)throw Error(`${name}: ${r.status}`);await writeFile(new URL('dist/vendor/'+name,root),Buffer.from(await r.arrayBuffer()));console.log('Downloaded',name);}
console.log('Supported cards:',cards.length,'restricted:',cards.filter(x=>x.limit<4).map(x=>[x.name,x.limit]));
