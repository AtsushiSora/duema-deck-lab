import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1395.json',import.meta.url))),cases=[['promoy18-024',3,'water','freeze'],['dmrp10-021',3,'dark','discard'],['dmrp11-045',5,'dark','recover'],['dmrp11-019',6,'dark','destroy'],['dmrp11-016',6,'water','draw']],colors={water:'dm01-083',dark:'dm01-090'};
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,'dmsd11-014'].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1395}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1395}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1395});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
function field(id,n,color,mode){const s=setup();s.active=0;s.format='advance';const x=inst(id),target=inst('dm01-108');target.cardOwner=1;s.players[1].battle=[target];s.players[0].mana=Array.from({length:n},(_,i)=>inst(i===0&&mode!=='wrong'?colors[color]:'dm01-108'));if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].gr=[x,inst('dmsd11-014')];const hand=Array.from({length:3},()=>inst('dm01-108'));s.players[1].hand=[...hand];const recover=inst('dm01-090'),miss=inst('dm01-108');s.players[0].grave=[recover,miss];return{s,x,target,hand,recover,miss};}
function summon(s){s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');}
for(const[id,n,color,effect]of cases)for(const mode of['below','exact','above','wrong','hidden'])test(e.card(id).name+' mana-drive boundary '+mode,()=>{
 const {s,x,target,hand,recover,miss}=field(id,n+(mode==='below'?-1:mode==='above'?1:0),color,mode),enabled=['exact','above'].includes(mode),before=s.players[0].deck.length;summon(s);drain(s);assert.ok(s.players[0].battle.includes(x));
 if(['freeze','discard','recover'].includes(effect)){x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');drain(s);}
 if(effect==='freeze')assert.equal(s.extLimits?.some(l=>l.g190Freeze&&(l.ref?.uid||l.uid)===target.uid)||false,enabled);
 if(effect==='discard'){assert.equal(s.players[1].grave.filter(x=>hand.includes(x)).length,enabled?1:0);assert.equal(s.players[1].hand.filter(x=>hand.includes(x)).length,enabled?2:3);}
 if(effect==='recover'){assert.equal(s.players[0].hand.includes(recover),enabled);assert.ok(s.players[0].grave.includes(miss));}
 if(effect==='destroy')assert.equal(s.players[1].grave.includes(target),enabled);
 if(effect==='draw')assert.equal(s.players[0].deck.length,before-(enabled?3:0));
});
test('Maijin lets the opposing player choose exactly one of its own creatures',()=>{
 const {s,target}=field('dmrp11-019',6,'dark','exact'),other=inst('dm01-097');s.players[1].battle.push(other);summon(s);assert.equal(s.decision.player,1);assert.deepEqual(s.decision.choices.filter(c=>c.value).map(c=>c.value.uid).sort(),[target.uid,other.uid].sort());act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===other.uid);drain(s);assert.ok(s.players[1].grave.includes(other));assert.ok(s.players[1].battle.includes(target));
});
test('Tenkei permits declining all three draws',()=>{const {s}=field('dmrp11-016',6,'water','exact'),before=s.players[0].deck.length;summon(s);assert.equal(s.decision.task.op,'g34_Offer');act(s,'extended',a=>s.decision.choices[a.choice].value===null);drain(s);assert.equal(s.players[0].deck.length,before);});
test('Yomotsu can recover a dark spell-side twin while rejecting non-dark grave cards',()=>{
 const {s,x}=field('dmrp11-045',5,'dark','exact'),twin=inst('dmbd17-007');s.players[0].grave=[twin,inst('dm01-108')];summon(s);drain(s);x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');drain(s);assert.ok(s.players[0].hand.includes(twin));
});
