import fs from'node:fs';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{nameKey}from'../dist/catalogue.js';
const baseline='e3b37e559497fb8c60daa914bb188fe0839762d8';
const old=JSON.parse(execFileSync('git',['show',baseline+':dist/cards.json'],{encoding:'utf8',maxBuffer:32*1024*1024})).cards;
const now=JSON.parse(fs.readFileSync('dist/cards.json')).cards,ids=new Map(now.map(c=>[c.id,c])),names=new Set(now.map(c=>nameKey(c.name))),progress=JSON.parse(fs.readFileSync('tools/card-support-progress.json'));
assert.equal(old.length,8074);assert.equal(now.length,8500);assert.equal(ids.size,8500);assert.equal(names.size,8500);for(const c of old)assert.deepEqual(ids.get(c.id),c,'Existing definition changed: '+c.id);
const newRows=now.filter(c=>!old.some(x=>x.id===c.id));assert.equal(newRows.length,426);
for(const c of newRows){assert.ok(['effect','vanilla','keyword'].includes(c.supportKind));const phase=Number(c.supportBatch.replace('phase-','')),m=JSON.parse(fs.readFileSync('tools/support-phase-'+phase+'.json')),r=m.cards.find(r=>r.id===c.id);assert.ok(r,c.id);assert.equal(nameKey(r.name),nameKey(c.name));for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v,c.id+':'+k);assert.ok(r.verification.facesMatched,c.id);}
assert.equal(progress.resume.registrationTarget.status,'complete');assert.equal(progress.resume.registrationTarget.currentCount,8500);assert.equal(progress.resume.registrationTarget.remaining,0);assert.equal(progress.resume.workInProgress,null);
console.log(JSON.stringify({baseline,originalDefinitionsUnchanged:old.length,added:newRows.length,uniqueNames:names.size,uniqueIds:ids.size,partialNewDefinitions:0,duplicateNames:0}));
