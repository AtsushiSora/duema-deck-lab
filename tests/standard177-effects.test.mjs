import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD177_DECKS} from '../tools/fixtures/standard177.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-177.json',import.meta.url)));
const N='dm01-108',F='dm01-097',UNTAP='dmrp05-058',END='dm33-038',MANA='dmrp06-093',SYN='dm23rp3-013';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,uid){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const removals=m.cards.filter(c=>c.spec.g34Tasks?.[0].filter?.maxPower);
test('eleven complete definitions have official art, limits and coverage in two legal forty-card fixtures',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,11);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:177}));assert.equal(e.card(row.id).supportBatch,'phase-177');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD177_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}
 for(const d of STANDARD177_DECKS){assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of removals)test(row.name+': exact live-power boundary and correct destination survive saving',()=>{
 let s=setup();give(s,1,'battle',[N,F]);const [low,high]=s.players[1].battle,task=row.spec.g34Tasks[0],max=task.filter.maxPower;low.powerModifiers=[{amount:max-e.power(low,false,s)}];high.powerModifiers=[{amount:max+1-e.power(high,false,s)}];play(s,row.id);assert.equal(s.decision.type,'extended');const choices=s.decision.choices.map(c=>c.value?.uid);assert.ok(choices.includes(low.uid));assert.ok(!choices.includes(high.uid));const ids=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,low.uid);drain(s);assert.ok(s.players[1][task.to].some(y=>y.uid===low.uid));assert.ok(s.players[1].battle.some(y=>y.uid===high.uid));assert.deepEqual(physical(s),ids);
});
test('classifier rejects unknown restrictions and leaves all earlier phase definitions unchanged',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:176}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:177}));}
 const d=structuredClone(details.cards.find(x=>x.id==='dmr01-102'));for(const line of['相手のタップしているクリーチャーを１体破壊する。','パワー3000以下の相手のパワー4000以下のクリーチャーを１体破壊する。','相手のクリーチャーを２体破壊する。']){d.faces[0].abilityText=line;assert.throws(()=>standardCardSpec(d,{phase:177}));}
 for(const phase of[168,169,170,171,172,173,174,175,176])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('any-owner removal can choose own creatures, while opponent-only versions cannot',()=>{
 for(const row of removals){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[F]);const own=s.players[0].battle[0];for(const p of s.players)for(const x of p.battle)x.powerModifiers=[{amount:1000-e.power(x,false,s)}];play(s,row.id);const choices=s.decision.choices.map(c=>c.value?.uid);assert.equal(choices.includes(own.uid),!!row.spec.g34Tasks[0].anyOwner);if(row.spec.g34Tasks[0].anyOwner){pick(s,own.uid);drain(s);assert.ok(s.players[0][row.spec.g34Tasks[0].to].some(x=>x.uid===own.uid));}else drain(s);}
});
test('spell and creature removal respect target protection, forced targets and battle-only power',()=>{
 const s=setup();give(s,1,'battle',['dmrp03-081',SYN]);const [bonus,syn]=s.players[1].battle;bonus.powerModifiers=[{amount:4000-e.power(bonus,false,s)}];syn.powerModifiers=[{amount:4000-e.power(syn,false,s)}];play(s,'dm22rp2-074');assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[syn.uid]);pick(s,syn.uid);drain(s);play(s,'dmrp08-095');assert.ok(s.decision.choices.some(c=>c.value.uid===bonus.uid));pick(s,bonus.uid);drain(s);assert.ok(s.players[1].mana.some(x=>x.uid===bonus.uid));
 const t=setup();give(t,1,'battle',['dm11-007',N]);const protectedBody=t.players[1].battle[0];play(t,'dm22rp2-074');assert.ok(!t.decision.choices.some(c=>c.value?.uid===protectedBody.uid));drain(t);
});
test('no eligible removal target completes normally without moving a card or hanging',()=>{
 for(const row of removals){const s=setup();give(s,1,'battle',[N]);s.players[1].battle[0].powerModifiers=[{amount:30000}];const uid=s.players[1].battle[0].uid;play(s,row.id);drain(s);assert.equal(s.decision,null);assert.ok(s.players[1].battle.some(x=>x.uid===uid));assert.equal(s.winner,null);}
});
test('optional untap can select either owner or decline, and CPU favors a tapped friendly creature',()=>{
 for(const owner of[0,1,null]){let s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[F]);const own=s.players[0].battle[0],opp=s.players[1].battle[0];own.tapped=opp.tapped=true;play(s,UNTAP);assert.equal(s.decision.task.untap,true);const cpu=s.decision.choices[e.chooseAI(s).choice];assert.equal(cpu.value.uid,own.uid);const ids=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,owner===0?own.uid:owner===1?opp.uid:null);drain(s);assert.equal(s.players[0].battle.find(x=>x.uid===own.uid).tapped,owner!==0);assert.equal(s.players[1].battle.find(x=>x.uid===opp.uid).tapped,owner!==1);assert.deepEqual(physical(s),ids);}
});
test('untap restrictions prevent the change and an already-untapped card does not retrigger untap watchers',()=>{
 for(const mode of['ready','locked','tapped']){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',['dm26rp2-S007']);const x=s.players[0].battle[0];x.tapped=mode!=='ready';if(mode==='locked')x.tapLocks=[{who:1,afterTurns:99}];play(s,UNTAP);const score=s.decision.choices.find(c=>c.value?.uid===x.uid).score;assert.equal(score>0,mode==='tapped');pick(s,x.uid);drain(s);assert.equal(x.tapped,mode==='locked');assert.equal(!!x.g35NoAttack?.length,mode==='tapped');assert.equal(s.winner,null);}
});
test('own-end untap only triggers on the owning end, can choose itself and cannot untap the opponent',()=>{
 const s=setup();give(s,0,'battle',[END,N]);give(s,1,'battle',[F]);const [r,x]=s.players[0].battle,y=s.players[1].battle[0];r.tapped=x.tapped=y.tapped=true;s.phase='attack';act(s,'endTurn');assert.equal(s.decision.task.untap,true);assert.ok(s.decision.choices.some(c=>c.value.uid===r.uid));assert.ok(!s.decision.choices.some(c=>c.value.uid===y.uid));pick(s,x.uid);drain(s);assert.equal(x.tapped,false);assert.equal(r.tapped,true);r.tapLocks=[{who:0,afterTurns:99}];end(s);assert.equal(s.decision,null);assert.equal(r.tapped,true);
});
test('self-mana move precedes opponent selection, is not destruction and CPU preserves expensive creatures',()=>{
 let s=setup();give(s,0,'battle',[N,'dmx22b-007']);give(s,1,'battle',[F]);const own=s.players[0].battle[0],enemy=s.players[1].battle[0];play(s,MANA);assert.equal(s.decision.task.owner,'self');assert.equal(s.decision.choices[e.chooseAI(s).choice].value.uid,own.uid);const ids=physical(s);pick(s,own.uid);assert.ok(s.players[0].mana.some(x=>x.uid===own.uid));assert.equal(s.decision.task.owner,undefined);s=JSON.parse(JSON.stringify(s));pick(s,enemy.uid);drain(s);assert.ok(s.players[1].mana.some(x=>x.uid===enemy.uid));assert.ok(!s.players[0].grave.some(x=>x.uid===own.uid));assert.deepEqual(physical(s),ids);
});
test('Dangerous Trap still resolves the second instruction with no own creature and respects prevented movement',()=>{
 for(const protectedBody of[false,true]){const s=setup();if(protectedBody){give(s,0,'battle',[N]);s.players[0].battle[0].g26Stay=true;}give(s,1,'battle',[F]);const enemy=s.players[1].battle[0];play(s,MANA);drain(s);assert.ok(s.players[1].mana.some(x=>x.uid===enemy.uid));assert.equal(s.players[0].battle.length,protectedBody?1:0);assert.equal(s.winner,null);}
});
test('Genmu and GG suppress entry untap; ignored end untap does not trigger',()=>{
 for(const id of[GEN,GG]){const s=setup();give(s,0,'battle',[N]);s.players[0].battle[0].tapped=true;give(s,1,'battle',[id]);if(id===GG)s.players[1].battle[0].under=[inst(N)];play(s,UNTAP);drain(s);assert.equal(s.players[0].battle[0].tapped,true);}
 const s=setup();give(s,0,'battle',[END]);s.players[0].battle[0].g35Ignored=s.turn;end(s);assert.equal(s.decision,null);
});
test('trigger cards can be declared and completed from shields without losing physical identities',()=>{
 for(const row of m.cards.filter(c=>c.spec.trigger)){const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[row.id]);const ids=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));act(s,'useTrigger');drain(s);assert.equal(s.winner,null);assert.deepEqual(physical(s),ids);assert.ok(e.card(row.id).type==='creature'?s.players[1].battle.some(x=>x.cardId===row.id):s.players[1].grave.some(x=>x.cardId===row.id));}
});
test('two CPU forty-card fixtures finish with saved continuation and eighty conserved physical cards',()=>{
 for(const[i,d]of STANDARD177_DECKS.entries()){let s=e.createGame([d,PRESETS[i]],{seed:17701+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
