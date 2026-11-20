import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1394.json',import.meta.url))),cases=[['dmrp11-038',5,'water','bounce'],['dmsd11-010',2,'water','freeze'],['dmbd12-g04',5,'dark','minus4'],['dmrp10-022',3,'dark','minus2'],['dmrp11-051',3,'fire','blocker']],colors={water:'dm01-083',dark:'dm01-090',fire:'dm01-097'};
test('official pinned full faces, image evidence, limits and the 12-card GR saved deck agree',()=>{
 const cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,'dmsd11-014'].map(id=>({id,count:2}))},before=structuredClone(deck);
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1394}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(bad,{phase:1394}));assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(e.card(row.id).manaValue,0);assert.ok(cat.get(row.id).supported);}
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:1394});assert.equal(s.players[0].gr.length,12);assert.equal(s.players[0].deck.length,30);assert.deepEqual(deck,before);
});
function field(id,n,color,mode){const s=setup();s.active=0;s.format='advance';const x=inst(id),target=inst('dm01-076');target.cardOwner=1;target.powerModifiers=[{amount:5000-e.power(target,false,s)}];s.players[1].battle=[target];s.players[0].mana=Array.from({length:n},(_,i)=>inst(i===0&&mode!=='wrong'?colors[color]:'dm01-108'));if(mode==='hidden')s.players[0].mana[0].faceDown=true;s.players[0].gr=[x,inst('dmsd11-014')];return{s,x,target};}
function summon(s){s.extTasks=[{op:'g34_AuraGr1353',p:0,source:'dmsd11-018'}];act(s,'toAttack');drain(s);}
for(const[id,n,color,effect]of cases)for(const mode of['below','exact','above','wrong','hidden'])test(e.card(id).name+' mana-drive boundary '+mode,()=>{
 const {s,x,target}=field(id,n+(mode==='below'?-1:mode==='above'?1:0),color,mode),before=e.power(target,false,s);summon(s);const enabled=['exact','above'].includes(mode);assert.ok(s.players[0].battle.includes(x));
 if(effect==='bounce')assert.equal(s.players[1].hand.includes(target),enabled);
 if(effect==='blocker')assert.equal(s.players[1].grave.includes(target),enabled);
 if(effect==='freeze'){assert.equal(s.extLimits?.some(l=>l.g190Freeze&&(l.ref?.uid||l.uid)===target.uid)||false,enabled);x.tapped=true;s.active=1;s.phase='attack';assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid),!enabled);}
 if(effect.startsWith('minus')){assert.equal(e.power(target,false,s),before-(enabled?(effect==='minus4'?4000:2000):0));s.phase='attack';act(s,'endTurn');drain(s);assert.equal(e.power(target,false,s),before);}
});
for(const initiallyEnabled of[false,true])test('QA31971 checks conditions at resolution rather than GR entry: '+initiallyEnabled,()=>{
 const {s,target}=field('dmrp11-038',initiallyEnabled?5:4,'water','exact');s.extTasks=[{op:'g34_Sequence',p:0,source:'dmsd11-018',defs:[{op:'AuraGr1353'},{op:'Offer',title:'wait before entry trigger',defs:[]}]}];act(s,'toAttack');assert.equal(s.decision?.task?.op,'g34_Offer');if(initiallyEnabled)s.players[0].mana.pop();else s.players[0].mana.push(inst('dm01-108'));act(s,'extended',a=>s.decision.choices[a.choice].value===null);drain(s);assert.equal(s.players[1].hand.includes(target),!initiallyEnabled);
});
for(const[id,n,color]of cases)test(e.card(id).name+' destruction returns below GR even when its mana condition is false',()=>{
 const {s,x}=field(id,n-1,color,'wrong');summon(s);s.players[1].battle=[];s.active=1;s.phase='main';const spell=inst('dm01-027');s.players[1].hand=[spell];act(s,'play',a=>a.uid===spell.uid);drain(s);assert.ok(!s.players[0].grave.includes(x));assert.equal(s.players[0].gr.at(-1),x);
});
