import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD180_DECKS} from '../tools/fixtures/standard180.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-180.json',import.meta.url)));
const N='dm01-108',F='dm01-097',L='dm01-075',CHARGER='dmrp16-063',OPTIONAL='dmr13-011',SEED='dmrp21-051',ATTACK='dmsd02-004',MYSTERY='dm04-019',ZAMBARA='dm38-017',JET='dm26-042',BOUNDARY='dmd08-011',EVO='dmd23-003';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve');}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
test('fourteen whole definitions have official art, restrictions and coverage in two legal forty-card lists',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,14);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:180}));assert.equal(e.card(row.id).supportBatch,'phase-180');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD180_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}
 for(const d of STANDARD180_DECKS){assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': moves the actual top card into a new hidden shield and conserves identities',()=>{
 const s=setup();give(s,0,'battle',[L]);give(s,1,'battle',['dm01-076']);const top=s.players[0].deck[0].uid,old=s.players[0].shields.map(x=>x.uid);if(row.spec.g34Attack){give(s,0,'battle',[row.id]);s.phase='attack';act(s,'attack',a=>a.uid===s.players[0].battle[0].uid&&a.target==='player');act(s,'noBlock');}else{play(s,row.id);drain(s);}drain(s);assert.equal(s.players[0].shields.length,6);assert.ok(s.players[0].shields.some(x=>x.uid===top&&!x.faceUp&&!x.shieldStack?.length));assert.ok(old.every(uid=>s.players[0].shields.some(x=>x.uid===uid)));const ids=physical(s);assert.equal(new Set(ids).size,ids.length);const view=e.observation(s,1);assert.equal(view.players[0].shields,6);assert.ok(!view.players[0].publicShields.some(x=>x.uid===top));if(row.spec.g34Attack)assert.equal(s.players[1].shields.length,4);else if(e.card(row.id).type==='creature')assert.ok(s.players[0].battle.some(x=>x.cardId===row.id));
});
test('classifier rejects face-up, multi-card and unknown conditional shield clauses and preserves every earlier phase',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:179}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:180}));}
 const d=structuredClone(details.cards.find(x=>x.id===MYSTERY));for(const line of['自分の山札の上から２枚をシールド化する。','自分の山札の上から１枚を表向きでシールド化する。','自分の山札の上から１枚をシールド化する。それがクリーチャーならカードを１枚引く。','自分の墓地から１枚をシールド化する。']){d.faces[0].abilityText=line;assert.throws(()=>standardCardSpec(d,{phase:180}));}
 for(const phase of[168,169,170,171,172,173,174,175,176,177,178,179])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('optional shield additions can be accepted or declined and saved without consuming the top card early',()=>{
 for(const id of[OPTIONAL,EVO,BOUNDARY])for(const accept of[false,true]){let s=setup();give(s,0,'battle',[L]);give(s,1,'battle',[N]);const deck=s.players[0].deck.length,top=s.players[0].deck[0].uid;play(s,id);if(s.decision?.task?.to==='grave')pick(s,s.players[1].battle[0].uid);assert.equal(s.decision.task.op,'g34_Offer');assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[0].shields.length,5);const ids=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,accept?true:null);drain(s);assert.equal(s.players[0].shields.length,accept?6:5);assert.equal(s.players[0].deck.length,deck-(accept?1:0));assert.equal(s.players[0].shields.some(x=>x.uid===top),accept);assert.deepEqual(physical(s),ids);}
});
test('CPU declines optional shielding of the last card, even with Shako, and accepts a safe addition',()=>{
 for(const shako of[false,true])for(const n of[1,2]){const s=setup();if(shako)give(s,0,'battle',['dmrp03-s03']);give(s,0,'deck',Array(n).fill(N));play(s,OPTIONAL);assert.equal(s.decision.choices[e.chooseAI(s).choice].value,n===1?null:true);drain(s);assert.equal(s.winner,null);assert.equal(s.players[0].shields.length,n===1?5:6);}
});
test('mandatory shielding of the last library card loses instead of invoking Shako draw victory',()=>{
 for(const shako of[false,true]){const s=setup();if(shako)give(s,0,'battle',['dmrp03-s03']);give(s,0,'deck',[N]);const uid=s.players[0].deck[0].uid;play(s,MYSTERY);drain(s);assert.equal(s.winner,1);assert.equal(s.players[0].hand.length,0);assert.ok(s.players[0].shields.some(x=>x.uid===uid));}
});
test('Shield Charger pays selected mana then moves the same resolved spell into mana rather than grave',()=>{
 const s=setup();give(s,0,'hand',[CHARGER]);const uid=s.players[0].hand[0].uid,top=s.players[0].deck[0].uid,ids=physical(s);e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===uid),{manualMana:true});assert.equal(s.decision.type,'manaPayment');const d=s.decision,selected=e.manaPayment(d.pool,{cost:d.cost,civilizations:d.colors});assert.equal(selected.length,4);for(const id of selected)act(s,'selectMana',a=>a.uid===id);act(s,'confirmMana');drain(s);assert.ok(s.players[0].shields.some(x=>x.uid===top));assert.ok(s.players[0].mana.some(x=>x.uid===uid));assert.equal(s.players[0].mana.length,51);assert.ok(!s.players[0].grave.some(x=>x.uid===uid));assert.deepEqual(physical(s),ids);
});
test('Zambara shields first then mills the next three real cards, and stops immediately on library loss',()=>{
 for(const count of[1,4,5]){const s=setup();give(s,0,'deck',Array(count).fill(N));const ids=s.players[0].deck.map(x=>x.uid);play(s,ZAMBARA);drain(s);assert.ok(s.players[0].shields.some(x=>x.uid===ids[0]));assert.deepEqual(s.players[0].grave.map(x=>x.uid),ids.slice(1,4));assert.equal(s.winner,count<=4?1:null);assert.equal(s.players[0].deck.length,Math.max(0,count-4));}
});
test('Jet shields before destroying a blocker and Boundary destroys before offering a shield',()=>{
 const s=setup();give(s,1,'battle',['dm01-076',N]);const uid=s.players[1].battle[0].uid;play(s,JET);assert.equal(s.players[0].shields.length,6);assert.ok(s.players[1].battle.some(x=>x.uid===uid));assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[uid]);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));
 const t=setup();give(t,1,'battle',[N]);const victim=t.players[1].battle[0].uid;play(t,BOUNDARY);assert.equal(t.players[0].shields.length,5);pick(t,victim);assert.ok(t.players[1].grave.some(x=>x.uid===victim));assert.equal(t.decision.task.op,'g34_Offer');pick(t,true);drain(t);assert.equal(t.players[0].shields.length,6);
});
test('Sokora triggers on attacking rather than entering or blocking, and grows a shield before block selection',()=>{
 const s=setup();play(s,ATTACK);drain(s);assert.equal(s.players[0].shields.length,5);const x=s.players[0].battle[0];end(s);end(s);const top=s.players[0].deck[0].uid;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');assert.equal(s.decision.type,'block');assert.equal(s.players[0].shields.length,6);assert.ok(s.players[0].shields.some(x=>x.uid===top));act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,4);
});
test('shield prohibition does not remove the deck top, and redirection moves it to grave rather than shielding',()=>{
 const s=setup();give(s,1,'battle',['dmrp22-037']);const top=s.players[0].deck[0].uid,n=s.players[0].deck.length;play(s,MYSTERY);drain(s);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].deck[0].uid,top);
 const t=setup();give(t,1,'battle',['dm22ex1-086']);const uid=t.players[0].deck[0].uid;play(t,MYSTERY);drain(t);assert.equal(t.players[0].shields.length,5);assert.ok(t.players[0].grave.some(x=>x.uid===uid));
});
test('a new shield notifies existing shield-entry abilities, and ignored sources cannot add shields',()=>{
 const s=setup();give(s,0,'battle',['dm26rp1-S002']);give(s,1,'battle',[N]);play(s,MYSTERY);drain(s);assert.equal(s.players[0].shields.length,6);assert.equal(s.players[1].battle[0].tapped,true);assert.ok(s.players[1].battle[0].tapLocks.includes(0));assert.equal(e.canUntap(s.players[1].battle[0]),false);end(s);assert.equal(s.players[1].battle[0].tapped,true);end(s);assert.equal(e.canUntap(s.players[1].battle[0]),true);
 for(const id of[GEN,GG]){const t=setup();give(t,1,'battle',[id]);if(id===GG)t.players[1].battle[0].under=[inst(N)];play(t,'dmsp01-011');drain(t);assert.equal(t.players[0].shields.length,5);}
});
test('Shildoite requires a light evolution base and the seed can become an evolution base afterward',()=>{
 const s=setup();give(s,0,'hand',[EVO]);give(s,0,'battle',[N]);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===EVO));give(s,0,'battle',[]);play(s,SEED);drain(s);const base=s.players[0].battle[0].uid;act(s,'play',a=>a.cardId===EVO);act(s,'evolve',a=>a.baseUid===base);pick(s,true);drain(s);assert.ok(e.isEvolution(s.players[0].battle[0]));assert.ok(s.players[0].battle[0].under.some(x=>x.uid===base));assert.equal(s.players[0].shields.length,7);
});
test('new shield triggers add a defender shield and finish without spending mana or duplicating a card',()=>{
 for(const row of m.cards.filter(c=>c.spec.trigger)){const s=setup();give(s,0,'battle',[N]);give(s,1,'mana',[]);give(s,1,'shields',[row.id]);const top=s.players[1].deck[0].uid,ids=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.equal(s.players[1].shields.length,1);assert.equal(s.players[1].shields[0].uid,top);assert.equal(s.players[1].mana.length,0);assert.deepEqual(physical(s),ids);assert.equal(s.winner,null);}
});
test('two CPU fixtures finish with JSON continuation and eighty conserved physical cards',()=>{
 for(const[i,d]of STANDARD180_DECKS.entries()){let s=e.createGame([d,PRESETS[i]],{seed:18001+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
