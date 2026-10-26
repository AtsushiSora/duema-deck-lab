import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {officialChampionSource,officialArchiveSource} from '../dist/champions.js';
import {createCatalogue}from'../dist/catalogue.js';import{parseOfficialDeckLists}from'./champion-parser.mjs';
const root=new URL('../',import.meta.url).pathname,read=f=>JSON.parse(fs.readFileSync(root+f)),registry=createCatalogue(read('dist/catalogue.json'),read('dist/cards.json').cards,read('dist/details.json')),data=read('tools/champion-sources-v0.97.0.json'),cacheIndex=process.argv.indexOf('--cache'),cache=cacheIndex>=0?process.argv[cacheIndex+1]:null,pages=new Map();
const evidenceSource=r=>r.archiveSource||r.source;
for(const r of data.records){assert.ok(officialChampionSource(r.source));assert.ok(officialArchiveSource(r.archiveSource,r.source));}
for(const source of new Set(data.records.map(evidenceSource))){const url=new URL(source);let html;
 if(cache){const file=path.join(cache,url.pathname.replaceAll('/','_')+url.search.replace(/[^a-zA-Z0-9]/g,'_')+'.html');html=fs.readFileSync(file,'utf8');}
 else{const response=await fetch(source,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok,source);html=await response.text();}
 pages.set(source,parseOfficialDeckLists(html,registry));
}
const signature=cards=>JSON.stringify(cards.map(r=>[r.id,r.name,r.count,r.zone]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
for(const r of data.records){const original=structuredClone(pages.get(evidenceSource(r)).find(d=>JSON.stringify(d.header)===JSON.stringify(r.header)));assert.ok(original,r.id+' official header');
 for(const correction of r.sourceCorrections||[]){
  const missing=original.cards[correction.index];assert.ok(missing&&!missing.id&&!missing.printedName);assert.equal(missing.count,correction.count);
  const url=new URL(correction.imageSource);assert.equal(url.origin,'https://dm.takaratomy.co.jp');const bytes=cache?fs.readFileSync(path.join(cache,url.pathname.replaceAll('/','_')+'.image')):Buffer.from(await(await fetch(url)).arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),correction.imageSha256,'pinned official image');
  Object.assign(missing,{id:correction.id,printedName:correction.name});
 }
 const expected=[...r.cards.map(c=>({...c,zone:'main'})),...r.extraZones.flatMap(z=>z.cards.map(c=>({...c,zone:z.name})))];
 const actual=original.cards.map(c=>({...c,name:c.printedName}));assert.equal(signature(actual),signature(expected),r.id+' official cards/counts/zones');
 assert.equal(original.mainCount,r.mainCount);assert.equal(original.extraCount,r.extraCount);
}
console.log(`Verified ${data.records.length} unchanged champion recipes against ${pages.size} official deck-list pages, including every extra zone.`);
