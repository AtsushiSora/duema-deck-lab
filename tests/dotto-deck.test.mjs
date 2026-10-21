import test from 'node:test';import assert from 'node:assert/strict';
import {e,data,details,snapshot,target,DOGI,VEG,GEN,ROD,RS,inst,give,setup,act,cast,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {resolveEnvironmentDecks,environmentSupport} from '../dist/environment.js';
import {manualScreenHTML,newManualUI,manualModel} from '../dist/manual-ui.js';
const GAIA='dmex17-021',HERO='dmbd16-009',FRIEND='dm23bd4-008';
const registry=createCatalogue(snapshot,data.cards,details),dotto=resolveEnvironmentDecks(registry).find(d=>d.id==='env-nationals2025-dotto');
const end=s=>{s.phase='attack';act(s,'endTurn');};
const deploy=(s,id=ROD)=>{give(s,0,'hand',[DOGI,id]);act(s,'play',a=>a.cardId===DOGI);act(s,'evolve',a=>!a.baseUid);act(s,'deploy',a=>a.cardId===id);drain(s);};
const aiToEnd=s=>{let n=0;while(s.endStep&&s.winner===null){assert.ok(n++<100);e.step(s,e.chooseAI(s));}};

test('the official dotto list keeps its exact thirteen types, forty copies and separate tournament provenance',()=>{
 assert.ok(dotto);assert.equal(dotto.cards.length,13);assert.equal(dotto.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(environmentSupport(dotto,registry).supportedCopies,40);assert.deepEqual(e.validateDeck(dotto),[]);
 assert.equal(dotto.tournament.player,'dotto');assert.match(dotto.tournament.event,/全国大会2025/);assert.equal(dotto.tournament.source,'https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/');assert.equal(dotto.tournament.result,'出場');
 assert.equal(dotto.cards.find(x=>x.id===GAIA).count,2);assert.equal(dotto.cards.find(x=>x.id===HERO).count,2);assert.equal(dotto.cards.find(x=>x.id==='sp-020').count,2);assert.equal(dotto.cards.some(x=>x.id===VEG),false);
 for(const id of [GAIA,HERO]){const c=e.card(id),d=details.cards.find(x=>x.id===id);assert.equal(c.source,d.source);assert.equal(c.supportBatch,'phase-14');for(const f of d.faces)assert.ok(c.text.includes(f.abilityText));}
});
test('normal Gaia summon pays both civilizations and six mana, then draws exactly two without qualifying a free play',()=>{
 const s=setup(),before=s.players[0].hand.length;cast(s,GAIA);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);assert.equal(s.players[0].hand.length,before+2);assert.ok(!s.noManaUse?.[0]);assert.equal(s.decision,null);
});
test('Gaia only stops attacks at its controller on the entry turn, including speed attackers and evolutions',()=>{
 const s=setup();give(s,0,'battle',[RS,'dm01-108']);give(s,1,'battle',[GAIA,'dm01-108']);s.players[0].battle[0].entered=s.turn;s.players[1].battle[1].tapped=true;s.phase='attack';
 let acts=e.getLegalActions(s).filter(a=>a.uid===s.players[0].battle[0].uid);assert.ok(acts.some(a=>a.target===s.players[1].battle[1].uid));assert.ok(!acts.some(a=>a.target==='player'));
 s.players[0].battle[0].entered=s.turn-1;assert.ok(e.getLegalActions(s).some(a=>a.uid===s.players[0].battle[0].uid&&a.target==='player'));
 const neo=inst(DOGI);neo.under=[s.players[0].battle[1]];neo.entered=s.turn;s.players[0].battle=[neo];assert.ok(!e.getLegalActions(s).some(a=>a.target==='player'));give(s,1,'battle',[]);assert.ok(e.getLegalActions(s).some(a=>a.target==='player'));
});
test('Gaia reductions stack by printed cost and apply to Mugen Crime while preserving the required two civilizations and four taps',()=>{
 const s=setup();give(s,0,'battle',[GAIA]);assert.equal(e.summonCost(s,0,e.card('dm25rp3-S09')),6);assert.equal(e.card('dm25rp3-S09').cost,10);assert.equal(e.summonCost(s,0,e.card(DOGI)),8);
 s.players[0].battle.push(inst(GAIA));assert.equal(e.summonCost(s,0,e.card('dm25rp3-S09')),2);
 give(s,0,'battle',[GAIA,'dm01-108','dm01-108','dm01-108']);give(s,0,'hand',[GEN]);give(s,0,'mana',['dm01-083','dm01-090']);const a=e.getLegalActions(s).find(a=>a.kind==='mugenStart');assert.ok(a);assert.equal(a.cost,2);e.step(s,a);
 for(let i=0;i<4;i++)act(s,'mugenTap');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.equal(s.players[0].battle.filter(x=>x.tapped).length,4);assert.ok(s.players[0].battle.some(x=>x.cardId===GEN));
 const t=setup();give(t,0,'battle',[GAIA,'dm01-108','dm01-108','dm01-108']);give(t,0,'hand',[GEN]);give(t,0,'mana',['dm01-083','dm01-083']);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='mugenStart'));
});
test('an effect deployment qualifies Gaia at the end of the opponent turn, with all declarations before resolution and only one copy entering',()=>{
 const s=setup();give(s,1,'hand',[GAIA,GAIA]);deploy(s);assert.equal(s.noManaUse[0],true);assert.equal(s.players[1].battle.length,0);end(s);assert.equal(s.decision.type,'gaiaDeclare');assert.equal(s.decision.player,1);
 act(s,'declareGaia');assert.equal(s.decision.type,'gaiaDeclare');act(s,'declareGaia');assert.equal(s.decision.type,'gaiaSummon');const before=s.players[1].hand.length;e.step(s,e.getLegalActions(s).find(a=>a.kind==='summonGaia'));aiToEnd(s);
 assert.equal(s.players[1].battle.filter(x=>x.cardId===GAIA).length,1);assert.equal(s.players[1].hand.length,before-1+2+1);assert.equal(s.active,1);assert.equal(s.phase,'charge');assert.deepEqual(s.noManaUse,[false,false]);assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});
test('declining Gaia leaves it in hand, while paid plays, cards outside the hand and an existing same-name creature never enable an extra summon',()=>{
 const s=setup();give(s,1,'hand',[GAIA]);deploy(s);end(s);act(s,'skipGaiaDeclare');assert.equal(s.active,1);assert.ok(s.players[1].hand.some(x=>x.cardId===GAIA));assert.equal(s.players[1].battle.length,0);
 for(const mode of ['paid','grave','existing']){const t=setup();give(t,1,'hand',mode==='grave'?[]:[GAIA]);if(mode==='grave')give(t,1,'grave',[GAIA]);if(mode==='existing')give(t,1,'battle',[GAIA]);if(mode==='paid')cast(t,'dm01-108');else deploy(t,FRIEND);end(t);assert.notEqual(t.decision?.type,'gaiaDeclare');assert.equal(t.active,1);}
});
test('newly drawn Gaia cards do not join an already declared end step, and turn player untap resolves before the declared summon',()=>{
 const s=setup(),untapper=data.cards.find(c=>c.endUntap);give(s,0,'battle',[untapper.id]);s.players[0].battle[0].tapped=true;give(s,1,'hand',[GAIA]);give(s,1,'deck',[GAIA,GAIA,'dm01-108','dm01-108']);deploy(s);end(s);act(s,'declareGaia');assert.equal(s.decision.type,'untap');assert.equal(s.decision.player,0);act(s,'endUntap',a=>a.yes);assert.equal(s.decision.type,'gaiaSummon');act(s,'summonGaia');aiToEnd(s);assert.equal(s.players[1].battle.filter(x=>x.cardId===GAIA).length,1);assert.equal(s.endStep,null);
});
test('manual choices show the Gaia declaration and summon, preserve state on render and do not reveal opposing hand names',()=>{
 const s=setup();give(s,0,'hand',[GAIA]);s.active=1;s.noManaUse=[false,true];end(s);const before=structuredClone(s),ui={...newManualUI(),mobile:true,mobilePanel:'actions'},h={art:id=>`<i>${id}</i>`,icon:()=>''};
 assert.equal(s.decision.type,'gaiaDeclare');assert.equal(manualModel(s,ui).human,true);const html=manualScreenHTML(s,ui,h);assert.ok(html.includes('ガイアッシュを使うか宣言しよう'));assert.ok(html.includes('ガイアッシュの使用を宣言する'));assert.deepEqual(s,before);act(s,'declareGaia');assert.ok(manualScreenHTML(s,ui,h).includes('ガイアッシュをコストを支払わずに召喚する'));
});
test('both superhero faces use one physical card, have distinct six/two mana choices, and the spell never enters the field',()=>{
 const s=setup();give(s,0,'hand',[HERO]);const uid=s.players[0].hand[0].uid,acts=e.getLegalActions(s).filter(a=>a.kind==='play');assert.deepEqual(acts.map(a=>[a.face,a.cost]),[[0,6],[1,2]]);assert.ok(acts.every(a=>a.uid===uid));act(s,'play',a=>a.face===1);assert.equal(s.players[0].grave[0].uid,uid);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});
test('superhero destroys the current 3000-or-less creatures on both sides together and preserves larger creatures and shields',()=>{
 const s=setup();give(s,0,'battle',['dm01-108',GAIA]);give(s,1,'battle',['dm01-083',GAIA]);const saved=s.players[0].battle[1].uid,shields=s.players.map(p=>p.shields.map(x=>x.uid));cast(s,HERO);drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===saved));assert.equal(s.players[0].grave.filter(x=>x.cardId==='dm01-108').length,1);assert.equal(s.players[1].grave.filter(x=>x.cardId==='dm01-083').length,1);assert.ok(s.players[1].battle.some(x=>x.cardId===GAIA));assert.deepEqual(s.players.map(p=>p.shields.map(x=>x.uid)),shields);
});
test('superhero time selects a single low-cost evolution base through a protected large creature and preserves every other layer',()=>{
 const s=setup(),top=inst(DOGI),middle=inst('dm01-097'),bottom=inst('dm01-108');middle.under=[bottom];top.under=[middle];give(s,1,'battle',[VEG]);s.players[1].battle.push(top);give(s,0,'hand',[HERO]);const before=e.physicalCards(s).length;act(s,'play',a=>a.face===1);
 const choices=e.getLegalActions(s);assert.ok(!choices.some(a=>a.targets?.[0].uid===top.uid));assert.ok(choices.some(a=>a.targets?.[0].uid===middle.uid));act(s,'effect',a=>a.targets[0].uid===middle.uid);assert.equal(s.decision,null);assert.equal(top.under[0].uid,bottom.uid);assert.equal(s.players[1].grave.at(-1).uid,middle.uid);assert.equal(e.physicalCards(s).length,before);
});
test('removing only a cheap evolution top reconstructs its base without entry effects or a new entry turn',()=>{
 const s=setup(),top=inst('dm32-072'),base=inst(GEN);top.under=[base];top.entered=s.turn-1;top.tapped=true;s.players[1].battle=[top];give(s,0,'hand',[HERO]);const before=e.physicalCards(s).length;act(s,'play',a=>a.face===1);act(s,'effect',a=>a.targets[0].uid===top.uid);
 assert.equal(s.players[1].battle[0].uid,base.uid);assert.equal(base.entered,s.turn-1);assert.equal(base.tapped,true);assert.equal(s.players[1].grave.at(-1).uid,top.uid);assert.equal(s.players[1].enteredThisTurn||0,0);assert.equal(e.physicalCards(s).length,before);assert.equal(s.decision,null);
});
test('the new official deck plays seeded games against itself and the existing deck with all eighty cards conserved',()=>{
 for(let seed=1;seed<=30;seed++){const pair=seed%2?[dotto,target]:[target,dotto],s=e.runGame(pair,{seed,first:seed%2}),again=e.runGame(pair,{seed,first:seed%2});assert.notEqual(s.winner,null);assert.ok(s.actions<2500);const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);assert.deepEqual(e.runSummary(s),e.runSummary(again));}
});

test('a buried twinpact can be selected by its spell cost while its creature top on the field keeps only the creature cost',()=>{
 const s=setup(),top=inst(DOGI),buried=inst(RS);top.under=[buried];give(s,1,'battle',[RS,HERO]);s.players[1].battle.push(top);give(s,0,'hand',[HERO]);act(s,'play',a=>a.face===1);const choices=e.getLegalActions(s);assert.equal(choices.length,1);assert.equal(choices[0].targets[0].uid,buried.uid);assert.match(choices[0].label,/の下/);assert.equal(e.chooseAI(s).id,choices[0].id);act(s,'effect');assert.equal(s.players[1].grave.at(-1).uid,buried.uid);assert.equal(top.under.length,0);assert.equal(s.players[1].battle.length,3);
});
test('free spell casts during the opposing turn do not qualify a Gaia summon for the active player',()=>{
 const s=setup();give(s,1,'hand',[GAIA]);s.noManaUse=[false,true];end(s);assert.equal(s.active,1);assert.equal(s.players[1].battle.length,0);assert.notEqual(s.decision?.type,'gaiaDeclare');
});
test('the production worker simulates the new deck against both available tournament decks',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{await import('../dist/worker.js?dotto-deck');await self.onmessage({data:{cards:data.cards,deck:dotto,opponents:[target,dotto],count:20,first:'random',seed:2800}});assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages));const done=messages.find(x=>x.type==='done');assert.ok(done);assert.equal(done.results.length,2);for(const r of done.results){assert.equal(r.stats.completed,20);assert.equal(r.stats.unresolved,0);assert.equal(r.stats.groups[0].count,10);assert.equal(r.stats.groups[1].count,10);assert.ok(r.games.every(x=>x.version===e.ENGINE_VERSION));}}finally{delete globalThis.self;delete globalThis.postMessage;}
});
