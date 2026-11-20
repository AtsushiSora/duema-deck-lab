import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1404.json',import.meta.url))),J='dmrp18-093';
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,'dmsd11-014'].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1404}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1404}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1404});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
function start(id,n,color){const s=setup();s.active=0;s.format='advance';const x=inst(id);s.players[0].gr=[x,inst('dmsd08-016')];s.players[0].mana=Array.from({length:n},(_,i)=>inst(i===0?color:'dm01-090'));return{s,x};}
function summon(s){s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');}
function pick(s,v){act(s,'extended',a=>{const x=s.decision?.choices?.[a.choice]?.value;return(x?.uid??x)===v;});}
for(const take of[false,true])test('Christmas ramps a tapped card then can recover that same card: '+take,()=>{const{s,x}=start('dmrp12-057',3,'dm01-108'),top=s.players[0].deck[0];summon(s);pick(s,true);assert.ok(s.players[0].mana.includes(top));assert.equal(top.tapped,true);pick(s,take?top.uid:null);drain(s);assert.equal(s.players[0].mana.length,take?3:4);assert.equal(s.players[0].hand.includes(top),take);assert.equal(s.players[0].gr.at(-1),x);});
for(const mode of['below','wrong','hidden','decline','accept'])test('Patchnator requires three mana and a visible Joker, then looks at two only after sacrifice: '+mode,()=>{
 const{s,x}=start('promoy18-070',mode==='below'?2:3,mode==='wrong'?'dm01-108':J),match=inst(J),miss=inst('dm01-108'),enabled=['accept','decline'].includes(mode);if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].deck.unshift(miss,match);const n=s.players[0].deck.length;summon(s);if(enabled)pick(s,mode==='accept'?true:null);if(mode==='accept'){assert.ok(!s.decision.choices.some(c=>c.value?.uid===miss.uid));pick(s,match.uid);}drain(s);assert.equal(s.players[0].hand.includes(match),mode==='accept');assert.equal(s.players[0].gr.includes(x),mode==='accept');assert.equal(s.players[0].deck.length,n-(mode==='accept'?1:0));if(mode==='accept')assert.equal(s.players[0].deck.at(-1),miss);
});
for(const mode of['below','wrong','hidden','decline','accept'])test('God Gayondam discards one Joker optionally and draws two while staying in battle: '+mode,()=>{
 const{s,x}=start('dmrp10-s01',mode==='below'?3:4,mode==='wrong'?'dm01-108':J),joker=inst(J),other=inst('dm01-108'),n=s.players[0].deck.length,enabled=['accept','decline'].includes(mode);if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].hand=[joker,other];summon(s);if(enabled){assert.ok(!s.decision.choices.some(c=>c.value?.uid===other.uid));pick(s,mode==='accept'?joker.uid:null);}drain(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].grave.includes(joker),mode==='accept');assert.equal(s.players[0].deck.length,n-(mode==='accept'?2:0));assert.ok(s.players[0].hand.includes(other));
});
for(const mode of['below','wrong','decline','fight'])test('Burun offers an optional battle only with two mana including fire: '+mode,()=>{
 const{s,x}=start('dmrp10-052',mode==='below'?1:2,mode==='wrong'?'dm01-108':'dm01-097'),enemy=inst('dm01-108');enemy.powerModifiers=[{amount:-1999}];s.players[1].battle=[enemy];summon(s);if(['decline','fight'].includes(mode))pick(s,mode==='fight'?enemy.uid:null);drain(s);assert.equal(s.players[1].grave.includes(enemy),mode==='fight');assert.ok(s.players[0].battle.includes(x));assert.equal(x.tapped,false);
});
for(const count of[0,1,3])test('TB30 sacrifices then freezes up to three creatures even after returning to GR: '+count,()=>{
 const{s,x}=start('dmrp12-004',7,'dm01-083'),targets=Array.from({length:4},()=>inst('dm01-108'));s.players[1].battle=[...targets];summon(s);pick(s,true);for(const target of targets.slice(0,count))pick(s,target.uid);if(count<3)pick(s,null);drain(s);assert.equal(s.players[0].gr.at(-1),x);s.active=1;s.phase='attack';for(const[i,target]of targets.entries())assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid),i>=count);
});
for(const[id,n,color]of[['dmrp12-057',3,'dm01-108'],['dmrp12-004',7,'dm01-083']])test(e.card(id).name+' cannot offer sacrifice below the mana threshold',()=>{const{s,x}=start(id,n-1,color),deck=s.players[0].deck.length;summon(s);drain(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].deck.length,deck);assert.equal(s.decision,null);});
