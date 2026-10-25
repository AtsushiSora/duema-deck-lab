// Rebuild templates from their checked tournament records; retain regulation adjustments only.
import fs from 'node:fs';import assert from 'node:assert/strict';import {ENVIRONMENT_LISTS} from '../dist/environment.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),phase=read('./support-phase-55.json'),supported=new Map(phase.cards.map(x=>[x.name,x.spec.limit??4]));
const originals=['./environment-expansion-v0.89.2.json','./environment-expansion-v0.90.1.json','./environment-expansion-v0.90.2.json'].flatMap(p=>read(p).records),records=[];
for(const record of originals){const replacements=record.replacements.map(r=>Array.isArray(r)?{from:r[0],count:r[1],to:r[2]}:r).filter(r=>!supported.has(r.from)||supported.get(r.from)===0);const map=new Map(record.originalCards.map(x=>[x.name,x.count]));
 for(const r of replacements){assert.ok(map.get(r.from)>=r.count);map.set(r.from,map.get(r.from)-r.count);map.set(r.to,(map.get(r.to)||0)+r.count);}
 const before=record.list;assert.ok(ENVIRONMENT_LISTS.some(x=>x.id===record.id));const list={...before,cards:[...map].filter(([,n])=>n).map(([name,count])=>({name,count})),checkedAt:'2026-10-25'};
 if(replacements.length){list.adjustments=record.referencePlayer+'選手の構成を参考に、'+replacements.map(r=>r.from+'の'+r.count+'枚を'+r.to+'へ変更（'+(r.reason||'現行の殿堂レギュレーションを反映')+'）。').join('');}
 else{delete list.practice;delete list.adjustments;delete list.regulation;list.player=record.referencePlayer;list.event=list.event.replace('公式構成参考','大会当時の構成');list.result=record.referenceResult||'掲載';}
 records.push({...record,replacements,list,before});
}
let code=fs.readFileSync(new URL('../dist/environment.js',import.meta.url),'utf8');for(const{list}of records){const line=code.split('\n').find(x=>x.includes('"id":"'+list.id+'"'));assert.ok(line);const{cards,...meta}=list;code=code.replace(line,' '+JSON.stringify(meta).slice(0,-1)+',cards:rows('+JSON.stringify(cards.map(r=>[r.count,r.name]))+')},');}fs.writeFileSync(new URL('../dist/environment.js',import.meta.url),code);
let verification;try{verification=read('./environment-restoration-v0.91.0.json').verification;}catch{}fs.writeFileSync(new URL('./environment-restoration-v0.91.0.json',import.meta.url),JSON.stringify({checkedAt:'2026-10-25',baseCount:6,totalCount:24,seedBase:910000,records,...(verification?{verification}:{})},null,2)+'\n');console.log('Restored',records.filter(r=>!r.replacements.length&&r.before.practice).length,'templates to tournament composition; retained only regulation adjustments.');
