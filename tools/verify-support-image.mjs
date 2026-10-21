// Local-only benchmark; arguments are an image path, independent truth JSON,
// and optional report path. It never uploads the test image or its features.
import {readFile,writeFile}from'node:fs/promises';import{createRequire}from'node:module';
import {gridProjections,detectGridFromProjections,scaleSupportGrid,aggregateScreenshotSlots}from'../dist/support-import.js';
import {cardFingerprint,createImageMatcher,FINGERPRINT_INSET as inset}from'../dist/card-fingerprint.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
const[imagePath,truthPath,reportPath]=process.argv.slice(2);if(!imagePath||!truthPath)throw Error('Usage: node tools/verify-support-image.mjs image truth.json [report.json]');
const root=new URL('../',import.meta.url),index=JSON.parse(await readFile(new URL('dist/image-index.json',root),'utf8')),cards=JSON.parse(await readFile(new URL('dist/catalogue.json',root),'utf8')).cards,truth=JSON.parse(await readFile(truthPath,'utf8')),expected=new Map(truth.groups.flatMap(g=>g.positions.map(i=>[i,g.id])));if(expected.size!==40)throw Error('Independent truth must label 40 slots');
const source=await readFile(imagePath),match=createImageMatcher(index,cards),report={referenceNames:index.nameCount,referencePrints:index.printCount,variants:[]};let originalFeatures;
for(const variant of [{name:'original'},{name:'width800-jpeg65',width:800,quality:65},{name:'width600-jpeg55',width:600,quality:55}]){
 const raw=variant.width?await sharp(source).resize({width:variant.width}).jpeg({quality:variant.quality}).toBuffer():source,image=sharp(raw),meta=await image.metadata(),sample=await image.clone().resize({width:600}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),grid=scaleSupportGrid(detectGridFromProjections(gridProjections({...sample.info,data:sample.data})),meta.width,meta.height);
 if(!grid.detected)throw Error('Failed automatic grid: '+variant.name);
 const features=[];for(const cell of grid.cells){const list=[];for(const[dx,dy]of[[0,0],[-.015,0],[.015,0],[0,-.015],[0,.015]]){const data=await image.clone().extract({left:Math.round(cell.x+cell.width*(inset.x+dx)),top:Math.round(cell.y+cell.height*(inset.y+dy)),width:Math.round(cell.width*inset.width),height:Math.round(cell.height*inset.height)}).resize(36,48,{fit:'fill'}).ensureAlpha().raw().toBuffer();list.push(cardFingerprint({data,width:36,height:48}));}features.push(list);}
 const start=Date.now(),results=features.map(match),rows=aggregateScreenshotSlots(results),correct=results.filter((r,i)=>r.id===expected.get(i+1)).length,wrongConfirmed=results.filter((r,i)=>r.confirmed&&r.id!==expected.get(i+1)).length;
 report.variants.push({name:variant.name,detected:true,correct,confirmed:results.filter(r=>r.confirmed).length,wrongConfirmed,rows:rows.length,total:rows.reduce((n,r)=>n+r.count,0),matchMs:Date.now()-start});if(!variant.width)originalFeatures=features;
}
let withheldConfirmed=0;for(const group of truth.groups){const unknownMatcher=createImageMatcher({...index,entries:index.entries.filter(e=>e[0]!==group.id)},cards);for(const slot of group.positions)if(unknownMatcher(originalFeatures[slot-1]).confirmed)withheldConfirmed++;}report.withheldConfirmed=withheldConfirmed;
const blank=[new Uint8Array(288),new Uint8Array(288).fill(255)];report.blankConfirmed=blank.filter(f=>match([f]).confirmed).length;
console.log(JSON.stringify(report,null,2));if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2));
if(report.variants.some(r=>r.wrongConfirmed||r.total!==40)||report.variants[0].correct!==40||withheldConfirmed||report.blankConfirmed)process.exitCode=1;
