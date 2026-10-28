import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {shieldCards} from '../dist/shield-state.js';import {UTILITY141_DECKS} from '../tools/fixtures/utility141.mjs';
const DOLL='dm25rp2-061',HAMMER='dmrp16-041',SOCKET='dmrp02-049',NOTO='dmr17-067',PMOMY='dmr21-032',DIS='dmrp20-026',N='dm01-108',F='dm01-097',W='dm01-083',B='dm01-076',S='dmsd20-016',GEAR='dm23ex1-058',FIELD='dmrp08-005',FU='dmrp22-037',SH='dmrp03-s03',SYNC='dm23rp3-013';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-141.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,uid){const o=options(s).find(a=>a.value===uid||a.value?.uid===uid||a.targets?.some(t=>t.uid===uid));assert.ok(o,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(a=>a.id===o.id));}
function end(s){s.phase='attack';act(s,'endTurn');}
const play=(s,id)=>act(s,'play',a=>a.cardId===id);

test('six creatures match official faces, race, cost, power, artwork and current limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification.allSixUnrestricted);
 for(const r of manifest.cards){const c=e.card(r.id),f=r.faces[0];assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(c.supportBatch,'phase-141');assert.equal(c.type,'creature');assert.equal(c.cost,f.cost);assert.equal(c.power,Number(f.powerText));assert.equal(c.race,f.race);assert.equal(c.limit,4);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 for(const d of UTILITY141_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
});

test('all six summon for their printed mana and preserve physical cards through the entry effect',()=>{
 for(const id of [DOLL,HAMMER,SOCKET,NOTO,PMOMY,DIS]){const s=setup();give(s,0,'hand',[id,N]);give(s,1,'battle',[N]);const before=physical(s);play(s,id);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===id));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.deepEqual(physical(s),before);assert.equal(s.decision,null);}
});

test('Doll draws one then requires one own hand discard, including the card just drawn after JSON resume',()=>{
 for(const drawn of [false,true]){let s=setup();give(s,0,'hand',[DOLL,N]);give(s,0,'deck',[F,W,N]);give(s,1,'hand',[W]);const fresh=s.players[0].deck[0].uid,held=s.players[0].hand[1].uid,opponent=s.players[1].hand[0].uid,before=physical(s);play(s,DOLL);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].deck.length,2);assert.equal(s.decision.player,0);assert.ok(!options(s).some(x=>x.value===opponent));s=JSON.parse(JSON.stringify(s));const chosen=drawn?fresh:held;pick(s,chosen);assert.ok(s.players[0].grave.some(x=>x.uid===chosen));assert.equal(s.players[0].hand.length,1);assert.deepEqual(physical(s),before);assert.equal(s.decision,null);}
});

test('Doll must discard its sole new card and neither Doll nor Noto can attack after summoning sickness ends',()=>{
 const s=setup();give(s,0,'hand',[DOLL]);const drawn=s.players[0].deck[0].uid;play(s,DOLL);assert.deepEqual(options(s).map(x=>x.value),[drawn]);pick(s,drawn);assert.equal(s.players[0].hand.length,0);
 for(const id of [DOLL,NOTO]){const t=setup();give(t,0,'battle',[id]);t.phase='attack';assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));}
});

test('forced entry draws lose on the final card or win through Shako before any discard',()=>{
 for(const id of [DOLL,NOTO])for(const shako of [false,true]){const s=setup();give(s,0,'deck',[N]);if(shako)give(s,0,'battle',[SH]);cast(s,id);assert.equal(s.winner,shako?0:1);assert.equal(s.decision,null);}
});

test('Hammer can remove a cost-three creature, seed, cross gear or field without targeting own cards',()=>{
 for(const id of [N,'dm01-051',S,GEAR,FIELD]){const s=setup();give(s,0,'hand',[HAMMER]);give(s,0,'battle',[S]);give(s,1,'battle',[id,'dm01-004']);const x=s.players[1].battle[0];if(id===FIELD)x.under=[inst('dm06-085')];const uid=x.uid,before=physical(s);play(s,HAMMER);assert.deepEqual(options(s).map(a=>a.targets[0].uid).sort(),[uid,...(x.under||[]).map(y=>y.uid)].sort());pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.ok(s.players[1].battle.some(x=>x.cardId==='dm01-004'));assert.ok(s.players[0].battle.some(x=>x.cardId===S));assert.deepEqual(physical(s),before);}
});

test('Hammer completes with no target and respects destruction replacement',()=>{
 const s=setup();give(s,1,'battle',['dm01-004']);cast(s,HAMMER);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',['dm31-041']);const uid=t.players[1].battle[0].uid;cast(t,HAMMER);pick(t,uid);drain(t);assert.ok(t.players[1].hand.some(x=>x.uid===uid));
});

test('Socket simultaneously destroys every enemy creature at power 1000 or below, including Just Diver',()=>{
 const s=setup();give(s,0,'hand',[SOCKET]);give(s,0,'battle',[W]);give(s,1,'battle',[W,W,N,S,SYNC,W]);const [a,b,large,seed,diver,sealed]=s.players[1].battle;b.powerModifiers=[{amount:1}];diver.powerModifiers=[{amount:1000-e.card(SYNC).power}];diver.justDiverActive=true;sealed.sealed=true;s.players[1].seals=[{...inst(N),faceDown:true,sealOf:sealed.uid}];const before=physical(s);play(s,SOCKET);assert.ok(s.players[1].grave.some(x=>x.uid===a.uid));assert.ok(s.players[1].grave.some(x=>x.uid===diver.uid));assert.ok(s.players[1].battle.some(x=>x.uid===b.uid));assert.ok(s.players[1].battle.some(x=>x.uid===large.uid));assert.ok(s.players[1].battle.some(x=>x.uid===seed.uid));assert.ok(s.players[1].battle.some(x=>x.uid===sealed.uid));assert.equal(s.players[0].battle.filter(x=>x.cardId===W).length,1);assert.deepEqual(physical(s),before);if(s.decision?.task?.op==='g21Mega')pick(s,null);
});

test('Socket summons as an S trigger without mana and clears small opposing creatures',()=>{
 const s=setup();give(s,0,'mana',[]);give(s,0,'shields',[SOCKET]);give(s,1,'battle',[W]);s.active=1;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===SOCKET);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===SOCKET));assert.ok(s.players[1].grave.some(x=>x.cardId===W));assert.equal(s.players[0].mana.length,0);
});

test('Noto blocks immediately after entry, draws exactly one, and wins against a smaller attacker',()=>{
 const s=setup();give(s,0,'hand',[NOTO]);give(s,1,'battle',[F]);const n=s.players[0].deck.length;play(s,NOTO);assert.equal(s.players[0].deck.length,n-1);const blocker=s.players[0].battle[0];s.active=1;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'block',a=>a.uid===blocker.uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.cardId===F));assert.ok(s.players[0].battle.some(x=>x.uid===blocker.uid));assert.equal(s.players[0].shields.length,5);
});

test('PMOMY moves the same top card to a face-down shield with no identity leak or S trigger',()=>{
 const s=setup();give(s,0,'hand',[PMOMY]);give(s,0,'deck',[SOCKET,N,F]);const uid=s.players[0].deck[0].uid,n=s.players[0].shields.length,before=physical(s);play(s,PMOMY);assert.equal(s.players[0].shields.length,n+1);const shield=s.players[0].shields.flatMap(shieldCards).find(x=>x.uid===uid);assert.ok(shield);assert.ok(!shield.faceUp);assert.equal(s.players[0].deck.length,2);assert.ok(!s.players[0].battle.some(x=>x.cardId===SOCKET));assert.equal(e.observation(s,1).players[0].publicShields.length,0);assert.deepEqual(physical(s),before);assert.equal(s.decision,null);
});

test('PMOMY respects shield prohibition and deck redirection; emptying the library is not a Shako draw win',()=>{
 const s=setup();give(s,1,'battle',[FU]);const n=s.players[0].deck.length,sh=s.players[0].shields.length;cast(s,PMOMY);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].shields.length,sh);
 const t=setup();give(t,1,'battle',['dm22ex1-086']);const uid=t.players[0].deck[0].uid;cast(t,PMOMY);assert.ok(t.players[0].grave.some(x=>x.uid===uid));assert.equal(t.players[0].shields.length,5);
 const u=setup();give(u,0,'battle',[SH]);give(u,0,'deck',[N]);cast(u,PMOMY);assert.equal(u.winner,1);
});

test('Dis pays all three colors, taps its target, attacks on entry and draws exactly once per attack',()=>{
 const s=setup();give(s,0,'hand',[DIS]);give(s,1,'battle',[F]);const x=s.players[1].battle[0];play(s,DIS);pick(s,x.uid);assert.ok(x.tapped);assert.ok(x.skipUntap);const dis=s.players[0].battle[0],n=s.players[0].deck.length;s.phase='attack';act(s,'attack',a=>a.uid===dis.uid&&a.target==='player');assert.equal(s.players[0].deck.length,n-1);act(s,'noBlock');drain(s);assert.equal(s.players[0].deck.length,n-1);assert.ok(dis.tapped);
 const t=setup();give(t,0,'hand',[DIS]);give(t,0,'mana',[B,W,N]);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='play'&&a.cardId===DIS));
});

test('Dis prevents the next enemy untap only once and its restriction outlives its presence',()=>{
 const s=setup();give(s,0,'hand',[DIS]);give(s,1,'battle',[F]);const target=s.players[1].battle[0];play(s,DIS);pick(s,target.uid);s.players[0].grave.push(s.players[0].battle.pop());end(s);assert.equal(s.active,1);assert.ok(target.tapped);assert.ok(!target.skipUntap);end(s);assert.equal(s.active,0);end(s);assert.equal(s.active,1);assert.equal(target.tapped,false);
});

test('all six entry abilities are ignored under Genmu, including Dis speed and Noto blocker',()=>{
 for(const id of [DOLL,HAMMER,SOCKET,NOTO,PMOMY,DIS]){const s=setup();give(s,0,'hand',[id]);give(s,1,'battle',[GEN,W]);const n=s.players[0].deck.length,sh=s.players[0].shields.length;play(s,id);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].shields.length,sh);assert.ok(s.players[1].battle.some(x=>x.cardId===W));const x=s.players[0].battle.find(x=>x.cardId===id);if(id===DIS)assert.ok(!e.effectiveCard(x,s).speedAttacker);if(id===NOTO)assert.ok(!e.effectiveCard(x,s).blocker);}
});

test('CPU avoids lethal forced entry draws and shield additions but can use them when ignored or with a draw-win replacement',()=>{
 const score=(s,id)=>{give(s,0,'hand',[id]);return e.rankHeuristicActions(s).find(x=>x.a.kind==='play'&&x.a.cardId===id).value;};
 for(const id of [DOLL,NOTO,PMOMY]){const s=setup(),t=setup();give(t,0,'deck',[N]);assert.ok(score(s,id)>score(t,id));assert.ok(score(t,id)<0);if(id!==PMOMY){give(t,0,'battle',[SH]);assert.ok(score(t,id)>0);}give(t,1,'battle',[GEN]);assert.ok(score(t,id)>0);}
});

test('CPU does not attack into lethal Dis draw and still attacks when Shako makes that draw win',()=>{
 const s=setup();give(s,0,'battle',[DIS]);give(s,0,'deck',[N]);s.phase='attack';const attack=e.rankHeuristicActions(s).find(x=>x.a.kind==='attack');assert.ok(attack);assert.ok(attack.value<0);assert.equal(e.chooseHeuristicAI(s).kind,'endTurn');give(s,0,'battle',[DIS,SH]);assert.ok(e.rankHeuristicActions(s).find(x=>x.a.kind==='attack'&&x.a.uid===s.players[0].battle[0].uid).value>0);
});

test('Hammer removes one low-cost evolution source and preserves every other layer, including nested sources',()=>{
 const s=setup(),top=inst('dm25rp4-DM1'),middle=inst(F),bottom=inst(N);middle.under=[bottom];top.under=[middle];s.players[1].battle=[top];give(s,0,'hand',[HAMMER]);const before=physical(s);play(s,HAMMER);assert.ok(options(s).some(a=>a.targets?.[0].uid===middle.uid));assert.ok(!options(s).some(a=>a.targets?.[0].uid===top.uid));pick(s,middle.uid);assert.equal(s.decision,null);assert.equal(top.under[0].uid,bottom.uid);assert.ok(s.players[1].grave.some(x=>x.uid===middle.uid));assert.ok(s.log.some(x=>x.type==='cardLeave'&&x.text.includes(e.card(HAMMER).name)));assert.deepEqual(physical(s),before);
});

test('Hammer removing only a cheap evolution top reconstructs its base without new entry effects',()=>{
 const s=setup(),top=inst('dm32-072'),base=inst(GEN);top.under=[base];top.tapped=true;top.entered=s.turn-1;s.players[1].battle=[top];give(s,0,'hand',[HAMMER]);const before=physical(s);play(s,HAMMER);pick(s,top.uid);assert.equal(s.players[1].battle[0].uid,base.uid);assert.equal(base.entered,0);assert.equal(base.tapped,true);assert.ok(s.players[1].grave.some(x=>x.uid===top.uid));assert.equal(s.players[1].enteredThisTurn||0,0);assert.deepEqual(physical(s),before);
});

test('Hammer sending a top creature to grave counts as destruction and runs its death ability',()=>{
 const s=setup();give(s,0,'hand',[HAMMER]);give(s,1,'battle',['dmrp01-055']);const uid=s.players[1].battle[0].uid,n=s.players[1].mana.length,before=physical(s);play(s,HAMMER);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.equal(s.players[1].mana.length,n-1);assert.deepEqual(physical(s),before);
});

test('Hammer can remove an anonymous seal without revealing it before selection or removing its host',()=>{
 const s=setup();give(s,0,'hand',[HAMMER]);give(s,1,'battle',[F]);const host=s.players[1].battle[0],seal={...inst(W),sealOf:host.uid,faceDown:true};host.sealed=true;s.players[1].seals=[seal];const before=physical(s);play(s,HAMMER);const choices=options(s);assert.ok(choices.some(a=>a.targets?.[0].uid===seal.uid));assert.ok(choices.every(a=>!a.label.includes(e.card(W).name)));pick(s,seal.uid);assert.equal(s.players[1].seals.length,0);assert.ok(s.players[1].battle.some(x=>x.uid===host.uid));assert.ok(!host.sealed);assert.ok(s.players[1].grave.some(x=>x.uid===seal.uid));assert.deepEqual(physical(s),before);
});
