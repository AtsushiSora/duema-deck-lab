import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN}from'./target-fixture.mjs';import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';import{UTILITY159_DECKS}from'../tools/fixtures/utility159.mjs';
const STONE='dmrp14-084',CO='dm26rp3-020',N='dm01-108',W='dm01-083',F='dm01-097',B='dm01-076',AP='dmrp22-042',GEAR='dm23ex1-058',DIS='dm26ex4-029';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-159.json',import.meta.url))),photos=JSON.parse(fs.readFileSync(new URL('../tools/photo159-photographs.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,v){const a=options(s).find(a=>a.value===v||a.value?.uid===v);assert.ok(a,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(x=>x.id===a.id));}

test('all nineteen photo cards match official faces, images, limits and catalogue support',()=>{const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,19);for(const row of m.cards){const c=e.card(row.id),f=row.faces[0];assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(c.cost,f.cost);assert.deepEqual(c.civilizations,f.civilizations.filter(c=>['光','水','闇','火','自然'].includes(c)));assert.equal(c.supportBatch,'phase-159');assert.equal(c.limit,m.regulationVerification.limits[c.id]);assert.equal(CARD_IMAGES[c.id],row.image);assert.ok(registry.get(c.id).supported);}for(const deck of UTILITY159_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(registry.coverage(deck).unsupported,0);assert.equal(deck.cards.reduce((n,r)=>n+r.count,0),40);}assert.deepEqual([...new Set(UTILITY159_DECKS.flatMap(d=>d.cards.map(r=>r.id)))].sort(),m.cards.map(c=>c.id).sort());});

test('ten photographed forty-card lists contain107 unique names; all400 slots now have effect support',()=>{const registry=createCatalogue(snapshot,data.cards,details);assert.equal(photos.decks.length,10);assert.equal(photos.uniqueCards,107);assert.equal(photos.addedCards,19);assert.equal(photos.alreadySupported,88);let n=0;for(const d of photos.decks){assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);assert.equal(registry.coverage(d).unsupported,0);for(const r of d.cards)assert.equal(e.card(r.id).name,r.name);n+=40;}assert.equal(n,400);});

test('Stone puts two top cards into tapped mana, then lets its owner choose one current mana to send to the graveyard',()=>{let s=setup();give(s,0,'hand',[STONE]);give(s,0,'deck',[W,F,N]);const added=s.players[0].deck.slice(0,2).map(x=>x.uid),old=s.players[0].mana[0].uid,n=s.players[0].mana.length,before=physical(s);act(s,'play',a=>a.cardId===STONE);assert.equal(s.decision.player,0);assert.equal(s.decision.task.op,'g61_ManaGrave');assert.ok(added.every(uid=>s.players[0].mana.some(x=>x.uid===uid&&x.tapped)));s=JSON.parse(JSON.stringify(s));pick(s,old);assert.equal(s.players[0].mana.length,n+1);assert.ok(s.players[0].grave.some(x=>x.uid===old));assert.deepEqual(physical(s),before);assert.ok(s.players[0].grave.some(x=>x.cardId===STONE));});

test('Stone may choose one of the newly added mana and respects graveyard redirection or mana departure prohibition',()=>{for(const locked of[false,true]){const s=setup();give(s,0,'deck',[W,F,N]);const uid=s.players[0].deck[0].uid;if(locked)give(s,1,'battle',[AP]);const n=s.players[0].mana.length;cast(s,STONE);if(locked){assert.equal(s.decision,null);assert.equal(s.players[0].mana.length,n+2);}else{pick(s,uid);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.equal(s.players[0].mana.length,n+1);}}const s=setup();give(s,0,'deck',[W,F,N]);give(s,1,'battle',['dm22ex1-086']);const ids=s.players[0].deck.slice(0,2).map(x=>x.uid);cast(s,STONE);pick(s,s.players[0].mana[0].uid);assert.ok(ids.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));});

test('Stone is ignored by Genmu and emptying the deck through mana is a loss rather than a Shako draw win',()=>{const s=setup();give(s,1,'battle',[GEN]);const deck=s.players[0].deck.length,mana=s.players[0].mana.length;cast(s,STONE);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[0].mana.length,mana);const t=setup();give(t,0,'battle',['dmrp03-s03']);give(t,0,'deck',[N,W]);cast(t,STONE);assert.equal(t.winner,1);});

test('Condama untaps a placed multicolor Dispector but not an unrelated multicolor card',()=>{for(const id of[DIS,'dmbd02-009']){const s=setup();give(s,0,'battle',[CO]);give(s,0,'hand',[id]);s.phase='charge';const uid=s.players[0].hand[0].uid;act(s,'charge',a=>a.uid===uid);drain(s);assert.equal(s.players[0].mana.find(x=>x.uid===uid).tapped,id!==DIS);}});

test('Condamas mana trigger is suppressed by ignored abilities and belongs only to its controller',()=>{for(const side of[0,1]){const s=setup();give(s,side,'battle',[CO]);if(side===0)s.players[0].battle[0].g35Ignored=s.turn;give(s,0,'hand',[DIS]);s.phase='charge';const uid=s.players[0].hand[0].uid;act(s,'charge',a=>a.uid===uid);drain(s);assert.ok(s.players[0].mana.find(x=>x.uid===uid).tapped);}});

test('Condama grants Sasage2 to a chosen element for just its owners current turn',()=>{const s=setup();give(s,0,'battle',[CO,GEAR]);const gear=s.players[0].battle[1],source=s.players[0].battle[0];s.extTasks=[{op:'g159R_Grant',p:0,source:CO,uid:source.uid,incarnation:0}];act(s,'toAttack');assert.ok(options(s).some(o=>o.value===gear.uid));pick(s,gear.uid);assert.equal(e.effectiveCard(gear,s).sasage,2);s.phase='main';give(s,0,'hand',[DIS]);assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.alternative==='sasage'&&a.sasage.includes(gear.uid)));act(s,'toAttack');act(s,'endTurn');drain(s);assert.ok(!e.effectiveCard(gear,s).sasage);});

test('Condamas beginning-of-turn ability really creates a choice and survives a saved game',()=>{let s=setup();give(s,0,'battle',[CO,N]);act(s,'toAttack');act(s,'endTurn');drain(s);if(s.phase==='charge')act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');assert.equal(s.active,0);assert.equal(s.decision?.task?.op,'g159R_Grant');const uid=s.players[0].battle[1].uid;s=JSON.parse(JSON.stringify(s));pick(s,uid);assert.equal(e.effectiveCard(s.players[0].battle[1],s).sasage,2);});

test('CPU avoids Stones forced library loss and MomoDMs forced mana-ramp loss',()=>{for(const id of[STONE,'dm24ex2-DM03']){const s=setup();give(s,0,'deck',[N,W]);give(s,0,'hand',[id,N]);assert.equal(e.chooseAI(s).cardId,N);}});

test('CPU avoids a fatal Pucho attack-end reveal but takes an unobstructed direct win',()=>{for(const direct of[false,true]){const s=setup();give(s,0,'battle',['dm26rp2-S008']);give(s,0,'deck',[N,W,F]);give(s,1,'battle',[]);if(direct)give(s,1,'shields',[]);s.phase='attack';assert.equal(e.chooseAI(s).kind,direct?'attack':'endTurn');}});

test('CPU does not mistake a Super Guardman redirect for a safe direct win with Puchos last three cards',()=>{
 const s=setup();give(s,0,'battle',['dm26rp2-S008']);give(s,1,'battle',['dm26rp2-S008']);give(s,0,'deck',[N,W,F]);give(s,1,'shields',[]);s.phase='attack';s.players[0].battle[0].powerModifiers=[{amount:1000}];
 const attack=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.target==='player');assert.ok(attack);
 const losing=JSON.parse(JSON.stringify(s));e.step(losing,attack);assert.equal(e.chooseAI(losing).kind,'guardman');e.step(losing,e.chooseAI(losing));drain(losing);assert.equal(losing.winner,1,'redirected combat survives but the mandatory attack-end reveal empties the deck');
 assert.equal(e.chooseAI(s).kind,'endTurn');
});

test('CPU avoids fatal EXlife even when an opposing entry-silencer stops its triggered entry ability',()=>{
 const s=setup();give(s,0,'hand',['dm24ex2-021',N]);give(s,0,'deck',[N]);give(s,1,'battle',['dm23bd1-007']);
 const summon=e.getLegalActions(s).find(a=>a.kind==='play'&&a.cardId==='dm24ex2-021'&&!a.alternative);assert.ok(summon);
 const losing=JSON.parse(JSON.stringify(s));e.step(losing,summon);drain(losing);assert.equal(losing.winner,1,'EXlife still shields the last deck card under entry silence');
 assert.equal(e.chooseAI(s).cardId,N);
});

test('CPU may attack safely with an ability-ignored Pucho even when only three cards remain',()=>{
 const s=setup();give(s,0,'battle',['dm26rp2-S008']);give(s,1,'battle',[F]);give(s,0,'deck',[N,W,F]);s.phase='attack';const target=s.players[1].battle[0];target.tapped=true;s.players[0].battle[0].g35Ignored=s.turn;
 const a=e.chooseAI(s);assert.equal(a.kind,'attack');assert.equal(a.target,target.uid);e.step(s,a);drain(s);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,3);assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));
});
