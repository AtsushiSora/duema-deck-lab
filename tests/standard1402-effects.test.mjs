import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1402.json',import.meta.url))),cases=[['dmsd11-003',3,'water','draw'],['dmrp10-096',3,'nature','ramp'],['dmrp10-001',4,'light','shield'],['dmrp10-034',2,'light','tap'],['dmrp11-032',5,'light','gr']],colors={water:'dm01-083',nature:'dm01-108',light:'dm01-075'};
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,'dmsd11-014'].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1402}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1402}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1402});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
for(const[id,n,color,effect]of cases)for(const mode of['below','exact','above','wrong','hidden'])test(e.card(id).name+' live mana-drive boundary '+mode,()=>{
 const s=setup();s.active=0;s.format='advance';const enabled=['exact','above'].includes(mode),x=inst(id),second=inst('dmsd08-016'),target=inst('dm01-108'),count=n+(mode==='below'?-1:mode==='above'?1:0);s.players[0].mana=Array.from({length:count},(_,i)=>inst(i===0&&mode!=='wrong'?colors[color]:'dm01-090'));if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].gr=[x,second];s.players[1].battle=[target];const deck=s.players[0].deck.length,mana=s.players[0].mana.length,shields=s.players[0].shields.length;s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');drain(s);assert.ok(s.players[0].battle.includes(x));
 if(effect==='draw'){x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');drain(s);assert.equal(s.players[0].deck.length,deck-(enabled?1:0));assert.equal(s.players[0].hand.length,enabled?1:0);}
 if(['ramp','shield'].includes(effect)){s.players[1].battle=[];s.active=1;s.phase='main';const kill=inst('dm01-027');s.players[1].hand=[kill];act(s,'play',a=>a.uid===kill.uid);drain(s);assert.ok(s.players[0].gr.includes(x));assert.ok(!s.players[0].grave.includes(x));if(effect==='ramp')assert.equal(s.players[0].mana.length,mana+(enabled?1:0));if(effect==='shield')assert.equal(s.players[0].shields.length,shields+(enabled?1:0));}
 if(effect==='tap')assert.equal(target.tapped,enabled);
 if(effect==='gr'){assert.equal(s.players[0].battle.includes(second),enabled);assert.equal(s.players[0].gr.includes(second),!enabled);}
});
test('Marchis can chain to another Marchis and stops cleanly at an empty super GR',()=>{const s=setup();s.active=0;s.format='advance';const cards=[inst('dmrp11-032'),inst('dmrp11-032')];s.players[0].gr=[...cards];s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');drain(s);assert.equal(s.players[0].gr.length,0);assert.ok(cards.every(x=>s.players[0].battle.includes(x)));assert.equal(s.decision,null);assert.equal(s.log.filter(x=>x.type==='grSummon').length,2);});
