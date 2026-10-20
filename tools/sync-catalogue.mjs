import {readFile,writeFile,appendFile,mkdir,rename} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {extractName,extractIndex,mergeCatalogue,officialDetailURL} from './catalogue-parser.mjs';
const cache=new URL('./research/catalogue/',import.meta.url),base='https://dm.takaratomy.co.jp';
// Preserve the exact query spelling of official links, including special symbols.
const detailURL=officialDetailURL;
await mkdir(cache,{recursive:true});
const maybe=async name=>{try{return await readFile(new URL(name,cache),'utf8');}catch{return null;}};
async function get(url,init){for(let attempt=0;attempt<5;attempt++){try{const r=await fetch(url,{...init,signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.text();}catch(e){if(attempt===4)throw e;await pause(1000*2**attempt);}}}
const post=page=>get(base+'/card/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({pagenum:String(page),sort:'cardname_asc'}).toString()});
const first=extractIndex(await post(1));if(first.total<10000||first.ids.length!==50)throw Error('Unexpected official index');
const pages=Math.ceil(first.total/50),index=[];
for(let page=1;page<=pages;page++){
 const cached=await maybe(`page-${page}.json`);let data=cached?JSON.parse(cached):page===1?first:extractIndex(await post(page));
 if(data.total!==first.total)throw Error('Official catalogue changed during sync; retry with a fresh cache.');
 if(!cached)await writeFile(new URL(`page-${page}.json`,cache),JSON.stringify(data));index.push(...data.ids);
 if(page%25===0||page===pages)console.log(`Index ${page}/${pages}: ${index.length}/${first.total}`);
 if(!cached)await pause(120);
}
const ids=[...new Set(index)];if(ids.length!==first.total)throw Error(`Index is incomplete: ${ids.length}/${first.total}`);
let existing=await maybe('names.jsonl'),records=new Map();for(const line of(existing||'').split('\n').filter(Boolean)){const r=JSON.parse(line);records.set(r.id,r);}
for(const[id,row]of records)if(row.source!==detailURL(id))records.delete(id);
const missing=ids.filter(id=>!records.has(id));let completed=ids.length-missing.length,position=0;
console.log(`Names ${completed}/${ids.length}; fetching ${missing.length} details (8 workers, bounded requests)`);
await Promise.all(Array.from({length:8},async()=>{while(position<missing.length){const id=missing[position++];const source=detailURL(id);const html=await get(source);const name=extractName(html);if(!name&&!html.includes('<title>('))throw Error('Unrecognized card detail: '+id);const row={id,name,source,missingName:!name};await appendFile(new URL('names.jsonl',cache),JSON.stringify(row)+'\n');records.set(id,row);completed++;if(completed%200===0||completed===ids.length)console.log(`Names ${completed}/${ids.length}`);await pause(200);}}));
const supported=JSON.parse(await readFile(new URL('../dist/cards.json',import.meta.url),'utf8'));
const result=mergeCatalogue(ids.map(id=>records.get(id)).filter(row=>row.name),supported.cards);
const out={schemaVersion:1,checkedAt:new Date().toISOString().slice(0,10),source:base+'/card/',officialResultCount:first.total,processedRecordCount:ids.length,namedRecordCount:ids.filter(id=>records.get(id).name).length,registeredNameCount:result.cards.length,supportedCount:supported.cards.length,unnamedRecords:ids.map(id=>records.get(id)).filter(row=>!row.name).map(({id,source})=>({id,source})),cards:result.cards,aliases:result.aliases};
const target=new URL('../dist/catalogue.json',import.meta.url),temp=new URL('../dist/catalogue.json.tmp',import.meta.url);
await writeFile(temp,JSON.stringify(out));await rename(temp,target);
console.log(JSON.stringify({officialResultCount:first.total,uniqueNames:out.registeredNameCount,aliases:Object.keys(out.aliases).length,supported:out.supportedCount}));
