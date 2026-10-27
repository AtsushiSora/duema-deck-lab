import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,inst,give,setup,act,cast,drain,attack,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,GOLGY_TARGET} from '../dist/environment.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {boardChoice,newManualUI} from '../dist/manual-ui.js';
import {shieldCards} from '../dist/shield-state.js';
import {handCardModel} from '../dist/hand-ui.js';
const layers=x=>[x,...(x.under||[]).flatMap(layers)];
const G='dm25rp2-S07',K='dm25rp2-013',B='dm25rp4-050',C='dm25rp2-S01',H='dm25rp2-024',W='dm25rp1-S02',A='dm23rp4-014',F='dm25rp4-030',P='dm25rp1-047',J='dmsd20-015',N='dm01-108',L='dm01-075',U='dm01-083',D='dm01-090',O='dm25rp2-012',QQ='dmrp07-m01';
const registry=createCatalogue(snapshot,data.cards,details),env=resolveEnvironmentDecks(registry),target=env.find(d=>d.id===GOLGY_TARGET),opponents=[...resolveStarter25Decks(registry),...env];
const pick=(s,v)=>{const i=s.decision?.choices?.findIndex(c=>typeof v==='function'?v(c.value,c):JSON.stringify(c.value)===JSON.stringify(v));assert.ok(i>=0,JSON.stringify(s.decision));act(s,'extended',a=>a.choice===i);};
const task=(s,op,p=0,more={})=>{s.phase='main';s.extTasks=[{op,p,source:G,...more}];act(s,'toAttack');};
const neo=(s,id,base=null)=>{give(s,s.active,'hand',[id]);act(s,'play',a=>a.cardId===id&&!a.alternative);act(s,'evolve',a=>base?a.baseUid===base:!a.baseUid);};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const conserve=s=>{const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);};
const chain=(s,p,id,n)=>{const x=inst(id);x.under=Array.from({length:n-1},()=>inst(N));s.players[p].battle.push(x);return x;};
function op(s,wanted){for(let n=0;s.decision?.type==='effectOrder'&&n<30;n++){const effects=s.pendingEffects,found=effects.find(x=>x.player===s.decision.player&&(x.task?.op===wanted||wanted==='entry'&&x.effect==='entry'));assert.ok(found,JSON.stringify(effects));act(s,'resolveEffect',a=>a.effectId===found.effectId);}assert.equal(s.decision?.task?.op,wanted);}

test('Golgy adds ten complete effect cards and a legal official40 with31 configured opponents',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-43.json',import.meta.url)));assert.equal(m.cards.length,10);assert.equal(data.cards.length,1470);assert.equal(opponents.length,49);assert.equal(registry.coverage(target).supported,40);assert.deepEqual(e.validateDeck(target),[]);assert.equal(target.cards.length,13);assert.equal(target.tournament.player,'デンネ');assert.equal(target.tournament.result,'TOP8');for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(x=>x.id===r.id).faces);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(e.card(r.id)[k],v);}
});
test('Golgy costs9 without a base and reduces by every physical base card with its own floor3',()=>{
 const s=setup(),base=chain(s,0,B,1);assert.equal(e.summonCost(s,0,e.card(G)),9);assert.equal(e.summonCost(s,0,{...e.card(G),g27BaseUid:base.uid}),7);base.under=[inst(K),inst(J)];assert.equal(e.summonCost(s,0,{...e.card(G),g27BaseUid:base.uid}),2);give(s,1,'battle',[GEN]);assert.equal(e.summonCost(s,0,{...e.card(G),g27BaseUid:base.uid}),3);
});
test('Golgy cheaper base choices are legal with insufficient mana for an unevolved summon',()=>{
 const s=setup(),base=chain(s,0,B,3);give(s,0,'mana',[L,U,N]);give(s,0,'hand',[G]);assert.ok(e.getLegalActions(s).some(a=>a.alternative==='golgy'&&a.baseUid===base.uid&&a.cost===3));act(s,'play',a=>a.alternative==='golgy');pick(s,0);pick(s,null);assert.equal(s.players[0].battle[0].cardId,G);assert.equal(layers(s.players[0].battle[0]).length,4);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});
test('Golgy clamp applies before ordinary reducers and noCostReduction removes all reductions',()=>{
 const s=setup(),base=chain(s,0,B,4);s.players[0].battle.push(inst(K));assert.equal(e.summonCost(s,0,{...e.card(G),g27BaseUid:base.uid}),2);const lock=data.cards.find(c=>c.noCostReduction);give(s,1,'battle',[lock.id]);assert.equal(e.summonCost(s,0,{...e.card(G),g27BaseUid:base.uid}),9);
});
test('Kohaku super-soul supplies one reducer per physical copy under an active creature',()=>{
 const s=setup(),base=chain(s,0,B,1);base.under=[inst(K),inst(K)];assert.equal(e.summonCost(s,0,e.card(H)),2);assert.equal(e.summonCost(s,0,e.card(N)),2);give(s,1,'battle',[GEN]);assert.equal(e.summonCost(s,0,e.card(H)),4);
});
test('Kohaku protection follows evolution and ends at its next own turn',()=>{
 const s=setup();cast(s,K);const base=s.players[0].battle[0];assert.equal(base.g26Stay,0);s.phase='main';neo(s,B,base.uid);drain(s);const x=s.players[0].battle[0];assert.equal(x.g26Stay,0);task(s,'bounceAny',0);pick(s,x.uid);assert.equal(s.players[0].battle[0].uid,x.uid);end(s);end(s);assert.equal(x.g26Stay,undefined);
});
test('Inserting Kohaku under another creature grants discount but never its old stay ability',()=>{
 const s=setup(),base=chain(s,0,C,1);give(s,0,'deck',[K,N,N,N]);task(s,'g27_Raid',0,{source:C,uid:base.uid});pick(s,s.players[0].deck[0].uid);drain(s);assert.equal(base.g26Stay,undefined);assert.equal(e.effectiveCard(base,s).g27KohakuCount,1);
});
test('Big can pay fixed colorless2 under a reduction lock if all three mana civilizations exist',()=>{
 const s=setup();give(s,0,'mana',[B,B]);s.players[0].mana[0].tapped=true;give(s,0,'hand',[B]);assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='golgy'));s.players[0].mana[0].tapped=false;give(s,1,'battle',[data.cards.find(c=>c.noCostReduction).id]);assert.ok(e.getLegalActions(s).some(a=>a.alternative==='golgy'&&!a.baseUid&&a.cost===2));act(s,'play',a=>a.alternative==='golgy');pick(s,v=>v?.to==='mana');assert.equal(s.players[0].battle[0].cardId,B);assert.equal(s.players[0].mana.length,3);
});
test('Big looks at two, sends exactly one to the chosen zone and the other to bottom',()=>{
 const s=setup();give(s,0,'deck',[G,J,K]);const [g,j,k]=s.players[0].deck;neo(s,B);assert.equal(s.decision.task.op,'g27_BigPick');pick(s,{uid:g.uid,to:'hand'});assert.ok(s.players[0].hand.some(x=>x.uid===g.uid));assert.deepEqual(s.players[0].deck.map(x=>x.uid),[k.uid,j.uid]);assert.equal(s.players[0].g27Protected.length,0);
});
test('Q.Q.QX blocks Big Raid Blueprint and West look but allows direct Jasmine ramp',()=>{
 for(const [id,op]of[[B,'g27_Big'],[C,'g27_Raid'],[P,'g27_Blueprint'],[W,'g27_WestLook']]){const s=setup();give(s,1,'battle',[QQ]);const deck=s.players[0].deck.map(x=>x.uid);task(s,op,0,{source:id});assert.ok(!s.decision);assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);assert.ok(!s.players[0].g27Protected?.length);}
 const s=setup();give(s,1,'battle',[QQ]);const n=s.players[0].mana.length;cast(s,J);assert.equal(s.players[0].mana.length,n+1);assert.ok(s.players[0].mana.at(-1).tapped);
});
test('Kan raid accepts shinkalize and all three base colors, but no fire creature or spell',()=>{
 const s=setup(),x=chain(s,0,C,1);give(s,0,'deck',[J,'dm01-097',P,N]);task(s,'g27_Raid',0,{source:C,uid:x.uid});assert.equal(s.decision.choices.filter(c=>c.value).length,1);pick(s,s.players[0].deck[0].uid);drain(s);assert.equal(x.under[0].cardId,J);assert.ok(e.isEvolution(x));
});
test('Kan raid and shieldify are separate sortable entry triggers',()=>{
 const s=setup();give(s,1,'battle',[N]);give(s,0,'deck',[J,N,K,N,N]);neo(s,C);assert.equal(s.decision.type,'effectOrder');assert.ok(s.pendingEffects.some(e=>e.task?.op==='g27_Raid'));assert.ok(s.pendingEffects.some(e=>e.effect==='entry'));drain(s);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].shields.length,6);
});
test('Kan destruction sends all prior bases as a single faceup shield without itself',()=>{
 const s=setup(),x=chain(s,0,C,3),ids=layers(x).slice(1).map(y=>y.uid);task(s,'destroyPower',1,{max:6000});pick(s,x.uid);assert.equal(s.decision.task.op,'g27_KanDeath');pick(s,'shield');assert.equal(s.players[0].shields.length,6);const sh=s.players[0].shields.at(-1);assert.deepEqual(shieldCards(sh).map(y=>y.uid),ids);assert.ok(shieldCards(sh).every(y=>y.faceUp));assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
});
test('Kan destruction can restore bases under a NEO creature that currently has no base',()=>{
 const s=setup(),x=chain(s,0,C,3),to=chain(s,0,G,1);task(s,'destroyPower',1,{max:6000});pick(s,x.uid);pick(s,to.uid);assert.equal(layers(to).length,3);assert.equal(s.players[0].grave.length,1);
});
test('Kan can choose the impossible under mode and leave its bases in grave',()=>{
 const s=setup(),x=chain(s,0,C,2);task(s,'destroyPower',1,{max:6000});pick(s,x.uid);pick(s,null);assert.equal(s.players[0].grave.length,2);assert.equal(s.players[0].shields.length,5);
});
test('Kan base identity checks prevent recapturing a card that already left and returned to grave',()=>{
 const s=setup(),x=chain(s,0,C,2);task(s,'destroyPower',1,{max:6000});pick(s,x.uid);const base=s.players[0].grave.find(y=>y.uid!==x.uid);base.zoneSerial++;pick(s,'shield');assert.equal(s.players[0].grave.length,2);assert.equal(s.players[0].shields.length,5);
});
test('Kan bounce never fires its destroyed ability',()=>{
 const s=setup(),x=chain(s,0,C,2);task(s,'bounceAny',0);pick(s,x.uid);assert.ok(!s.decision);assert.equal(s.players[0].hand.length,2);
});
test('Herc draws two then untaps distinct mana equal to current contained count',()=>{
 const s=setup(),x=chain(s,0,H,3);for(const m of s.players[0].mana)m.tapped=true;const n=s.players[0].hand.length;task(s,'g27_Herc',0,{source:H,uid:x.uid});assert.equal(s.players[0].hand.length,n+2);for(let i=0;i<3;i++)pick(s,s.decision.choices[0].value);assert.equal(s.players[0].mana.filter(x=>!x.tapped).length,3);assert.ok(!s.decision);
});
test('Herc can select already untapped mana and observes the LKI count after leaving',()=>{
 const s=setup();give(s,0,'mana',[N,N,N,N]);s.players[0].mana[0].tapped=true;task(s,'g27_Herc',0,{source:H,uid:'gone',lastKnownCount:2});pick(s,s.players[0].mana[1].uid);pick(s,s.players[0].mana[2].uid);assert.ok(s.players[0].mana[0].tapped);assert.ok(!s.decision);
});
test('West reduces only evolved summons and permits light water dark bases, not nature',()=>{
 const s=setup();give(s,0,'battle',[L,U,D,N]);give(s,0,'hand',[W]);const opts=e.getLegalActions(s).filter(a=>a.alternative==='golgy');assert.equal(opts.length,3);assert.ok(opts.every(a=>a.cost===3));assert.equal(e.summonCost(s,0,e.card(W)),6);assert.equal(e.summonCost(s,0,{...e.card(W),g27BaseUid:s.players[0].battle[2].uid}),3);
});
test('West draws three then puts one chosen hand card on top privately',()=>{
 const s=setup();give(s,0,'deck',[G,J,P,N,N]);neo(s,W);assert.equal(s.players[0].hand.length,3);const uid=s.players[0].hand[0].uid;pick(s,uid);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].deck[0].uid,uid);assert.ok(!s.log.some(x=>JSON.stringify(x).includes('ゴルギーオージャー')));
});
test('West may decline an early attack and use its once-per-turn look on a later player attack',()=>{
 const s=setup();give(s,0,'battle',[N,N]);give(s,1,'battle',[W]);give(s,1,'deck',[J,N,N]);attack(s,s.players[0].battle[0].uid);assert.equal(s.decision.task.op,'g27_West');pick(s,null);drain(s);attack(s,s.players[0].battle[1].uid);assert.equal(s.decision?.task?.op,'g27_West');pick(s,true);pick(s,null);drain(s);s.players[0].battle.push(inst(N));attack(s,s.players[0].battle.at(-1).uid);assert.ok(s.decision?.task?.op!=='g27_West');
 const t=setup();give(t,0,'battle',[N]);give(t,1,'battle',[W]);t.players[1].battle[0].tapped=true;attack(t,t.players[0].battle[0].uid,t.players[1].battle[0].uid);assert.ok(t.decision?.task?.op!=='g27_West');
});
test('West can execute a seed for free from the library and does not consume a hand card',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[W]);give(s,1,'hand',[N,N]);give(s,1,'deck',[J,N,N,N]);attack(s);pick(s,true);assert.equal(s.decision.task.op,'g27_WestUse');pick(s,v=>v?.uid);drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===J));assert.equal(s.players[1].mana.length,51);
});
test('West uses the chosen twinpact face and can add an overcost card to hand instead',()=>{
 const twin=data.cards.find(c=>c.spellFace&&c.spellFace.cost<=2);const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[W]);give(s,1,'hand',[N,N]);give(s,1,'deck',[twin.id,N,N,N]);attack(s);pick(s,true);assert.ok(s.decision.choices.some(c=>c.value?.face===1));pick(s,null);assert.ok(s.players[1].hand.some(x=>x.cardId===twin.id));assert.equal(s.players[1].g27Protected.length,0);
});
test('West honors spell entry and origin locks before offering a free execution',()=>{
 const s=setup();give(s,0,'battle',[N,O]);s.players[1].spellsThisTurn=1;give(s,1,'battle',[W]);give(s,1,'hand',[N,N]);give(s,1,'deck',[P,N,N,N]);attack(s);pick(s,true);assert.equal(s.decision.choices.length,1);pick(s,null);
});
test('Aophe attacks using revolution change, draws two only on that entry and blocks all entry-turn attacks',()=>{
 const s=setup();cast(s,A);assert.equal(s.players[0].hand.length,0);s.players[0].battle=[];s.players[0].hand.push(inst(A));const base=chain(s,0,B,1);attack(s,base.uid);pick(s,true);pick(s,base.uid);assert.equal(s.players[0].hand.length,3);assert.ok(s.players[0].hand.some(x=>x.uid===base.uid));assert.equal(s.players[0].battle[0].cardId,A);assert.equal(s.attack.attacker,s.players[0].battle[0].uid);drain(s);
 const t=setup();give(t,1,'battle',[A]);const speed=data.cards.find(c=>c.speedAttacker&&c.type==='creature');give(t,0,'battle',[speed.id,G]);for(const x of t.players[0].battle){x.entered=t.turn;x.under=[inst(N)];}t.phase='attack';assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));
});
test('Gin taps one distinct target per contained card and locks until its next own turn',()=>{
 const s=setup(),x=chain(s,0,F,2);give(s,1,'battle',[N,N,N]);task(s,'g27_Gin',0,{source:F,uid:x.uid});pick(s,s.players[1].battle[0].uid);pick(s,s.players[1].battle[1].uid);assert.equal(s.players[1].battle.filter(x=>x.tapped).length,2);assert.ok(!e.canUntap(s.players[1].battle[0]));end(s);assert.ok(s.players[1].battle[0].tapped);end(s);assert.ok(e.canUntap(s.players[1].battle[0]));
});
test('Blueprint includes GNEO and takes a separate Fusionner then orders every remainder',()=>{
 const s=setup();give(s,0,'deck',[G,K,N,N,P,J,N]);const before=s.players[0].deck.map(x=>x.uid);cast(s,P);pick(s,{uid:before[0],category:'neo'});pick(s,{uid:before[1],category:'fusion'});drain(s);assert.equal(s.players[0].hand.length,2);assert.deepEqual(new Set(s.players[0].hand.map(x=>x.cardId)),new Set([G,K]));assert.equal(s.players[0].deck[0].uid,before[6]);assert.equal(s.players[0].g27Protected.length,0);
});
test('Blueprint chooses Fusionner first too and never counts one physical card twice',()=>{
 const s=setup();give(s,0,'deck',[K,G,N,N,N,N,N]);cast(s,P);pick(s,v=>v?.category==='fusion');assert.ok(s.decision.choices.every(c=>c.value.category==='neo'));pick(s,v=>v?.category==='neo');drain(s);assert.equal(s.players[0].hand.length,2);
});
test('Jasmine remains a noncreature seed and can be used as a NEO evolution base',()=>{
 const s=setup();cast(s,J);const x=s.players[0].battle[0];assert.equal(e.isCreature(s,x),false);assert.ok(e.evolutionBases(s,0,e.card(G)).some(y=>y.uid===x.uid));assert.ok(!e.evolutionBases(s,0,e.card(W)).some(y=>y.uid===x.uid));assert.equal(e.card(J).type,'seed');
});
test('Golgy wins at ten physical cards but not nine and respects no-lose protection',()=>{
 const s=setup(),x=chain(s,0,G,10);attack(s,x.uid);assert.equal(s.winner,0);const t=setup(),y=chain(t,0,G,9);attack(t,y.uid);assert.equal(t.winner,null);const u=setup(),z=chain(u,0,G,10);u.g26Extreme=[false,true];attack(u,z.uid);assert.equal(u.winner,null);assert.ok(u.log.some(x=>x.type==='lossPrevented'));
});
test('Golgy ramp count is chosen before simultaneous movement and multicolor enters tapped',()=>{
 const s=setup(),x=chain(s,0,G,3);give(s,0,'deck',[B,J,N,N]);task(s,'g27_Golgy',0,{source:G,uid:x.uid});const ids=s.players[0].deck.map(x=>x.uid),n=s.players[0].mana.length;pick(s,2);assert.equal(s.players[0].mana.length,n+2);assert.ok(s.players[0].mana.at(-2).tapped);assert.ok(!s.players[0].mana.at(-1).tapped);pick(s,ids[0]);pick(s,ids[1]);pick(s,null);assert.equal(s.players[0].mana.length,n);assert.ok(s.players[0].hand.some(x=>x.uid===ids[0]));
});
test('NEO card and mana targets can be operated directly from the manual board and hand',()=>{
 const s=setup();give(s,0,'hand',[G]);task(s,'g27_HandTop',0,{source:W});assert.ok(boardChoice(s,newManualUI(),0,'hand',s.players[0].hand[0].uid));assert.ok(handCardModel(s,s.players[0].hand[0].uid).canUse);pick(s,s.players[0].hand[0].uid);task(s,'g27_Recover',0,{source:G});assert.ok(boardChoice(s,newManualUI(),0,'mana',s.players[0].mana[0].uid));
});
test('Golgy random actions preserve eighty identities and serializable pending choices',()=>{
 for(let seed=1;seed<=8;seed++){const s=e.createGame([target,opponents[seed*3%opponents.length]],{seed:seed*4301,first:seed%2}),rng={rng:seed};for(let n=0;n<350&&s.winner===null;n++){const actions=e.getLegalActions(s);assert.ok(actions.length);e.step(s,actions[Math.floor(e.random(rng)*actions.length)]);conserve(s);assert.deepEqual(e.getLegalActions(JSON.parse(JSON.stringify(s))),e.getLegalActions(s));}}
});
test('Golgy AI games complete against all31 configured opponents with deterministic replay',()=>{
 for(let i=0;i<opponents.length;i++){const s=e.createGame([target,opponents[i]],{seed:43000+i,first:i%2}),actions=[];for(let n=0;n<2000&&s.winner===null;n++){const a=e.chooseAI(s);assert.ok(a,'no action '+JSON.stringify(s.decision));actions.push(a);e.step(s,a);conserve(s);}assert.notEqual(s.winner,null,'unresolved '+opponents[i].id);const replay=e.createGame([target,opponents[i]],{seed:43000+i,first:i%2});for(const a of actions)e.step(replay,a);assert.equal(replay.winner,s.winner);assert.deepEqual(e.runSummary(replay),e.runSummary(s));}
});
test('Golgy production worker completes62 games without unresolved matches',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{await import('../dist/worker.js?golgy43');await self.onmessage({data:{cards:data.cards,deck:target,opponents,count:2,first:'random',seed:4343}});assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages.filter(x=>x.type==='error')));const done=messages.find(x=>x.type==='done');assert.ok(done);assert.equal(done.results.length,31);for(const r of done.results){assert.equal(r.stats.completed,2);assert.equal(r.stats.unresolved,0);}}finally{delete globalThis.self;delete globalThis.postMessage;}
});
test('Expired Kohaku stay is removed from every layer and cannot revive after an evolution peels away',()=>{
 const s=setup();cast(s,K);const k=s.players[0].battle[0];s.phase='main';neo(s,B,k.uid);drain(s);const top=s.players[0].battle[0];end(s);end(s);assert.equal(top.g26Stay,undefined);assert.equal(k.g26Stay,undefined);
});
test('Golgy base alternatives can decline an optional Garden reducer and only spend it when selected',()=>{
 const s=setup(),base=chain(s,0,B,3),garden=inst('dm26rp1-024');garden.faceUp=true;s.players[0].shields.push(garden);give(s,0,'hand',[G]);const opts=e.getLegalActions(s).filter(a=>a.alternative==='golgy'&&a.baseUid===base.uid);assert.ok(opts.some(a=>a.cost===2));assert.ok(opts.some(a=>a.cost===3&&a.g26Reducers?.length===0));act(s,'play',a=>a.alternative==='golgy'&&a.g26Reducers?.length===0);pick(s,0);pick(s,null);assert.ok(!s.g26GardenUsed);
});
test('GNEO replacement moves all bases instead of destroying Golgy and does not trigger a buried Kan death',()=>{
 const s=setup(),x=chain(s,0,G,1);x.under=[inst(C),inst(K)];task(s,'destroyPower',1,{max:15000});pick(s,x.uid);assert.equal(s.players[0].battle[0].uid,x.uid);assert.equal(s.players[0].battle[0].under,undefined);assert.equal(s.players[0].grave.length,2);assert.ok(!s.decision);assert.equal(s.players[0].shields.length,5);
});
test('Blueprint dual-category assignment must take two distinct cards whenever a complete pair exists',()=>{
 const dual={...e.card(B),race:'ジャイアント/フュージョナー'};e.setCards(data.cards.map(c=>c.id===B?dual:c));try{const s=setup();give(s,0,'deck',[B,G,N,N,N,N,N]);cast(s,P);assert.ok(!s.decision.choices.some(c=>c.cardId===B&&c.value.category==='neo'));pick(s,v=>v.category==='fusion');pick(s,v=>v.category==='neo');drain(s);assert.deepEqual(new Set(s.players[0].hand.map(x=>x.cardId)),new Set([B,G]));}finally{e.setCards(data.cards);}
});
test('Copied Raid on an ordinary Orugate reveals three but cannot create an illegal evolution base',()=>{
 const s=setup(),copier=data.cards.find(c=>c.entryCopy),x=chain(s,0,copier.id,1);give(s,0,'deck',[J,K,G,N]);const original=s.players[0].deck.map(y=>y.uid);task(s,'g27_Raid',0,{source:e.copySource(C,copier.id),uid:x.uid});assert.equal(s.decision.choices.length,1);pick(s,null);drain(s);assert.equal(x.under.length,0);assert.equal(s.players[0].deck[0].uid,original[3]);assert.equal(s.players[0].deck.length,4);
});
