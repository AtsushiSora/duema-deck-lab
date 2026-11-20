import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1406.json',import.meta.url))),colors={'水':'dm01-083','自然':'dm01-108','光':'dm01-075','闇':'dm01-090','火':'dm01-097'};
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,...['dmsd11-014','dmsd08-016','dmrp09-081'].slice(0,6-ids.length)].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1406}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1406}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1406});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
for(const row of manifest.cards)for(const mode of['below','exact','above','wrong','hidden'])test(row.name+' continuously grants its keyword only while mana-drive is true: '+mode,()=>{
 const s=setup();s.active=0;s.format='advance';const x=inst(row.id),filter=row.spec.g260Self.filter.all,n=filter[0].g334ZoneCount.min,color=filter[1].g1064ManaColors[0],[key,amount]=Object.entries(row.spec.g260Self.grants)[0],enabled=['exact','above'].includes(mode),filler=color==='闇'?'dm01-108':'dm01-090';s.players[0].mana=Array.from({length:n+(mode==='below'?-1:mode==='above'?1:0)},(_,i)=>inst(i===0&&mode!=='wrong'?colors[color]:filler));if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].gr=[x];s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');drain(s);assert.equal(e.effectiveCard(x,s)[key]||false,enabled?amount:false);
 if(key==='speedAttacker')assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'),enabled);
 if(key==='machFighter'){const target=inst('dm01-108');s.players[1].battle=[target];assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target.uid),enabled);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));}
 if(key==='g38BattleBonus'){const target=inst('dm01-108');s.players[1].battle=[target];assert.equal(e.power(x,false,s),e.card(row.id).power);assert.equal(e.matchupPower(x,target,true,s),e.card(row.id).power+(enabled?3000:0));assert.equal(e.matchupPower(x,target,false,s),e.card(row.id).power+(enabled?3000:0));}
 if(key==='blocker'){const enemy=inst('dm01-108');s.players[1].battle=[enemy];s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid),enabled);}
 if(key==='attackBonus')assert.equal(e.power(x,true,s),e.card(row.id).power+(enabled?3000:0));
 if(key==='slayer'){x.entered=0;const target=inst('dm01-108');target.tapped=true;target.powerModifiers=[{amount:100000}];s.players[1].battle=[target];act(s,'attack',a=>a.uid===x.uid&&a.target===target.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].grave.includes(target),enabled);}
 if(key==='guardman'){const friend=inst('dm01-108'),enemy=inst('dm01-108');friend.tapped=true;s.players[0].battle.push(friend);s.players[1].battle=[enemy];s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target===friend.uid);assert.equal(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===x.uid),enabled);}
});
for(const row of manifest.cards)test(row.name+' immediately loses a continuous grant when mana changes or abilities are ignored',()=>{
 const s=setup();s.active=0;const x=inst(row.id),all=row.spec.g260Self.filter.all,n=all[0].g334ZoneCount.min,color=all[1].g1064ManaColors[0],[key,amount]=Object.entries(row.spec.g260Self.grants)[0];s.players[0].battle=[x];s.players[0].mana=Array.from({length:n},(_,i)=>inst(i===0?colors[color]:color==='闇'?'dm01-108':'dm01-090'));assert.equal(e.effectiveCard(x,s)[key],amount);s.players[0].mana[0].faceDown=true;assert.ok(!e.effectiveCard(x,s)[key]);delete s.players[0].mana[0].faceDown;assert.equal(e.effectiveCard(x,s)[key],amount);x.g35Ignored=s.turn;assert.ok(!e.effectiveCard(x,s)[key]);
});
