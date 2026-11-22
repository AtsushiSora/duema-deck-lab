// Reproduce phase1653's comparison against the engine before provenance tracking.
// Run from the repository root: node --test tools/verify-mana-origin-compatibility.mjs
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{execFileSync}from'node:child_process';import test from'node:test';import assert from'node:assert/strict';
import{e,data,PRESETS}from'../tests/target-fixture.mjs';
const baseline='e0abff30',dir=path.resolve('tmp/duema-phase-1653/legacy-reference');fs.mkdirSync(dir,{recursive:true});
for(const file of fs.readdirSync('dist').filter(f=>f.endsWith('.js')&&f!=='engine.js')){const target=path.join(dir,file);if(!fs.existsSync(target))fs.symlinkSync(path.resolve('dist',file),target);}
fs.writeFileSync(path.join(dir,'engine.js'),execFileSync('git',['show',baseline+':dist/engine.js'],{maxBuffer:16*1024*1024}));
const previous=await import(pathToFileURL(path.join(dir,'engine.js')).href);previous.setCards(data.cards);
const comparable=s=>{const c=structuredClone(s);delete c.version;return c;};
for(const i of[0,1,2])test('Existing decks retain identical actions and complete state before and after provenance tracking '+i,()=>{const decks=[PRESETS[i],PRESETS[(i+1)%3]],old=previous.createGame(decks,{seed:165390+i,first:i%2}),s=e.createGame(decks,{seed:165390+i,first:i%2});assert.deepEqual(comparable(s),comparable(old));while(s.winner===null&&s.actions<2000&&s.turn<160){assert.deepEqual(e.getLegalActions(s),previous.getLegalActions(old));const a=e.chooseAI(s);assert.ok(a);e.step(s,a);previous.step(old,a);assert.deepEqual(comparable(s),comparable(old));}assert.notEqual(s.winner,null);assert.equal(s.winner,old.winner);assert.equal(e.physicalCards(s).length,80);});
