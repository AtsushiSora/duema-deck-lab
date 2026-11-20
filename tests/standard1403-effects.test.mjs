import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1403.json',import.meta.url))),cases=[['dmrp12-029',6,'nature','mana'],['dmrp12-045',5,'dark','discard'],['dmrp12-051',4,'fire','destroy'],['dmrp12-034',4,'light','tap'],['dmrp12-039',4,'water','draw']],colors={water:'dm01-083',nature:'dm01-108',light:'dm01-075',dark:'dm01-090',fire:'dm01-097'};
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,'dmsd11-014'].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1403}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1403}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1403});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
for(const[id,n,color,effect]of cases)for(const mode of['below','wrong','hidden','decline','accept'])test(e.card(id).name+' optional sacrifice and mana-drive '+mode,()=>{
 const s=setup();s.active=0;s.format='advance';const x=inst(id),enemy=inst('dm01-108'),hand=inst('dm01-108'),enabled=['decline','accept'].includes(mode),accept=mode==='accept';s.players[0].gr=[x,inst('dmsd08-016')];s.players[0].mana=Array.from({length:n-(mode==='below'?1:0)},(_,i)=>inst(i===0&&mode!=='wrong'?colors[color]:(color==='dark'?'dm01-108':'dm01-090')));if(mode==='wrong')s.players[0].mana.forEach(x=>x.cardId=color==='dark'?'dm01-108':'dm01-090');if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[1].battle=[enemy];s.players[1].hand=[hand];const deck=s.players[0].deck.length;s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');
 if(enabled){assert.equal(s.decision?.task?.op,'g34_SelfSacrifice407');act(s,'extended',a=>s.decision.choices[a.choice].value===(accept?true:null));}drain(s);assert.equal(s.players[0].battle.includes(x),!accept);assert.equal(s.players[0].gr.includes(x),accept);assert.ok(!s.players[0].grave.includes(x));
 if(effect==='draw')assert.equal(s.players[0].deck.length,deck-(accept?2:0));
 if(effect==='mana')assert.equal(s.players[1].mana.includes(enemy),accept);
 if(effect==='discard')assert.equal(s.players[1].grave.includes(hand),accept);
 if(effect==='destroy')assert.equal(s.players[1].grave.includes(enemy),accept);
 if(effect==='tap'){assert.equal(enemy.tapped,accept);if(accept){s.phase='attack';act(s,'endTurn');drain(s);assert.ok(enemy.tapped);}}
});
test('Sazan has no sacrifice offer or draw when removed before its entry ability resolves',()=>{const s=setup();s.active=0;s.format='advance';const x=inst('dmrp12-039');s.players[0].gr=[x];s.players[0].mana=[...Array.from({length:4},()=>inst('dm01-083'))];const n=s.players[0].deck.length;s.extTasks=[{op:'g34_Sequence',p:0,source:'dmsd11-018',defs:[{op:'AuraGr1353'},{op:'Target',owner:'self',to:'grave'}]}];act(s,'toAttack');act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);drain(s);assert.ok(!s.players[0].battle.includes(x));assert.equal(s.players[0].gr.at(-1),x);assert.equal(s.players[0].deck.length,n);assert.equal(s.decision,null);});
test('Sazan attempts destruction of an indestructible source and still draws after accepting',()=>{const s=setup();s.active=0;s.format='advance';const x=inst('dmrp12-039');s.players[0].gr=[x];s.players[0].mana=Array.from({length:4},()=>inst('dm01-083'));const n=s.players[0].deck.length;s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');assert.equal(s.decision.task.op,'g34_SelfSacrifice407');x.g34Grants=[{turn:s.turn,g465DestroySafe:true}];act(s,'extended',a=>s.decision.choices[a.choice].value===true);drain(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].deck.length,n-2);});
