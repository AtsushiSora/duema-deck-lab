import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,inst,give,setup,act,cast,drain,attack,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,VIRIDE_TARGET} from '../dist/environment.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {boardChoice,newManualUI,manualModel} from '../dist/manual-ui.js';
import {handCardModel} from '../dist/hand-ui.js';
const D='dm26rp2-DM001',V='dm24rp1-S02',Z='dm24rp3-S02',E='dm26rp2-S002',O='dm25rp2-012',P='dm23rp3-011',Q='dm25ex1-065',S='dm26rp1-057',G='dm26rp1-024',H='dm26rp1-047',N='dm01-108',L='dm01-075';
const registry=createCatalogue(snapshot,data.cards,details),environments=resolveEnvironmentDecks(registry),target=environments.find(d=>d.id===VIRIDE_TARGET),opponents=[...resolveStarter25Decks(registry),...environments];
const pick=(s,v)=>{const i=s.decision?.choices?.findIndex(c=>typeof v==='function'?v(c.value,c):JSON.stringify(c.value)===JSON.stringify(v));assert.ok(i>=0,JSON.stringify(s.decision));act(s,'extended',a=>a.choice===i);};
const task=(s,op,p=0,more={})=>{s.phase='main';s.extTasks=[{op,p,source:D,...more}];act(s,'toAttack');};
const castle=(s,p,id)=>{const x=inst(id);x.faceUp=true;s.players[p].shields.push(x);return x;};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const conserve=s=>{const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);};

test('Viride adds ten complete effects and the original historical forty',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-42.json',import.meta.url)));assert.equal(m.cards.length,10);assert.equal(data.cards.length,1685);
 for(const r of m.cards){assert.deepEqual(details.cards.find(x=>x.id===r.id).faces,r.faces);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(e.card(r.id)[k],v);}
 assert.equal(registry.coverage(target).supported,40);assert.deepEqual(e.validateDeck(target),[]);assert.equal(target.cards.find(r=>r.id===S).count,4);assert.equal(e.card(S).limit,1);assert.equal(target.tournament.practice,undefined);assert.equal(target.historicalId,VIRIDE_TARGET);assert.equal(opponents.length,49);
 const bad=structuredClone(target);delete bad.historicalId;assert.ok(e.validateDeck(bad).some(x=>x.includes('1枚')));
});
test('Viride alternative summon requires strictly more shields and pays exactly two light even under reduction lock',()=>{
 const s=setup();give(s,0,'mana',[L,L]);give(s,0,'hand',[V]);assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='viride'));castle(s,0,G);assert.ok(e.getLegalActions(s).some(a=>a.alternative==='viride'));const lock=data.cards.find(c=>c.noCostReduction);give(s,1,'battle',[lock.id]);act(s,'play',a=>a.alternative==='viride');assert.equal(s.players[0].battle[0].cardId,V);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.ok(!s.g26GardenUsed);
});
test('Viride watches the first combined enemy event, draws optionally then deploys by printed event cost',()=>{
 const s=setup();give(s,1,'battle',[V]);give(s,1,'hand',[Z]);give(s,0,'hand',[N]);act(s,'play');assert.equal(s.decision.task.op,'g26_DrawDeploy');const before=s.players[1].hand.length;pick(s,null);assert.equal(s.players[1].hand.length,before);assert.equal(s.decision.task.op,'g26_Deploy');pick(s,null);s.players[0].hand.push(inst(N));act(s,'play');assert.ok(!s.decision);
});
test('Viride does not get a new first event when entering after an earlier enemy event',()=>{
 const s=setup();cast(s,N);s.players[1].battle.push(inst(V));cast(s,N);assert.ok(!s.decision);
});
test('Viride triggers on an actual enemy spell before its summoned creature and allows a deploy after declining draw',()=>{
 const s=setup();give(s,1,'battle',[V]);give(s,1,'hand',[Z]);const spell=data.cards.find(c=>c.type==='spell'&&c.effect==='ramp1');cast(s,spell.id);drain(s);assert.ok(s.log.some(x=>x.type==='draw'&&x.player===1)||s.players[1].battle.some(x=>x.cardId===Z));assert.equal(s.players[0].spellsThisTurn,1);
});
test('Viride gains shield trigger at three enemy creatures and snapshots eligibility before shields leave',()=>{
 const s=setup();give(s,0,'battle',[N,N,N]);give(s,1,'shields',[V]);attack(s);act(s,'noBlock');assert.equal(s.decision.type,'trigger');assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));const t=setup();give(t,0,'battle',[N,N]);give(t,1,'shields',[V]);attack(t);act(t,'noBlock');assert.ok(!t.decision);
});
test('Zaze enters tapped and does not untap naturally at its turn start',()=>{
 const s=setup();cast(s,Z);assert.ok(s.players[0].battle[0].tapped);end(s);end(s);assert.equal(s.active,0);assert.ok(s.players[0].battle[0].tapped);
});
test('Zaze untaps on a shield addition, offers all three modes and can draw while already untapped',()=>{
 const s=setup();cast(s,Z);const x=s.players[0].battle[0],n=s.players[0].hand.length;cast(s,S);assert.equal(s.decision.task.op,'g26_Zaze');assert.ok(!x.tapped);pick(s,'draw');assert.equal(s.players[0].hand.length,n+1);s.phase='main';cast(s,G);pick(s,'draw');assert.equal(s.players[0].hand.length,n+2);assert.ok(!s.decision);
});
test('Zaze tap mode lasts through the next enemy untap but other untaps remain possible',()=>{
 const s=setup();cast(s,Z);give(s,1,'battle',[N]);cast(s,S);pick(s,'tap');pick(s,s.players[1].battle[0].uid);assert.ok(s.players[1].battle[0].tapped);end(s);assert.equal(s.active,1);assert.ok(s.players[1].battle[0].tapped);
});
test('Zaze stay mode prevents own effects too and expires at its next turn start',()=>{
 const s=setup();cast(s,Z);cast(s,S);pick(s,'stay');const uid=s.players[0].battle[0].uid;task(s,'bounceAny',0,{source:V});pick(s,uid);assert.ok(s.players[0].battle.some(x=>x.uid===uid));end(s);end(s);assert.equal(s.players[0].battle[0].g26Stay,undefined);
});
test('Garden discounts each creature once per turn, supports declining and does not discount castles',()=>{
 const s=setup();castle(s,0,G);give(s,0,'hand',[Z,Z,S]);const play=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.cardId===Z);assert.ok(play.some(a=>a.cost===1));assert.ok(play.some(a=>a.cost===2&&a.g26Reducers.length===0));act(s,'play',a=>a.cardId===Z&&a.g26Reducers?.length===0);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.ok(e.getLegalActions(s).some(a=>a.cardId===Z&&a.cost===1));act(s,'play',a=>a.cardId===Z&&a.cost===1);assert.equal(Object.keys(s.g26GardenUsed).length,1);assert.equal(e.summonCost(s,0,e.card(S)),1);
});
test('Garden draw triggers only with strictly more own creatures at end of turn',()=>{
 const s=setup();castle(s,0,G);give(s,0,'battle',[N]);end(s);assert.ok(s.players[0].hand.length===1);const t=setup();castle(t,0,G);end(t);assert.equal(t.players[0].hand.length,0);
});
test('Hustle enters faceup, ramps one tapped card and never gains Balzark discard or leave abilities',()=>{
 const s=setup(),before=s.players[0].mana.length;cast(s,H);assert.equal(s.players[0].mana.length,before+1);assert.ok(s.players[0].mana.at(-1).tapped);assert.ok(!s.decision);const uid=s.players[0].shields.at(-1).uid;task(s,'jadowShield',0,{source:V});pick(s,uid);assert.ok(s.players[0].grave.some(x=>x.cardId===H));assert.ok(!s.players[0].hand.some(x=>x.cardId===H));assert.ok(!s.decision);
});
test('Hustle redirects nonsummoned creatures on either turn, while real summons still enter',()=>{
 const s=setup();castle(s,1,H);give(s,0,'hand',[N]);const uid=s.players[0].hand[0].uid;task(s,'putCreature',0,{uid,origin:'hand'});assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].mana.at(-1).uid,uid);s.phase='main';cast(s,N);assert.equal(s.players[0].battle.length,1);
});
test('Queen redirects creatures above mana count even after paid reductions and never sacrifices itself or attacks',()=>{
 const s=setup();give(s,1,'battle',[Q]);give(s,0,'mana',[L]);give(s,0,'hand',[Z]);castle(s,0,G);act(s,'play',a=>a.cardId===Z&&a.cost===1);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].mana.at(-1).cardId,Z);assert.equal(s.players[1].battle[0].cardId,Q);s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
});
test('OneNote limits actual spell casts and opens permission immediately after it leaves',()=>{
 const s=setup();give(s,1,'battle',[O]);const spell=data.cards.find(c=>c.type==='spell'&&c.effect==='ramp1');cast(s,spell.id);s.players[0].hand.push(inst(spell.id));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));s.players[1].battle=[];assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'));
});
test('OneNote NEO only limits creatures while evolved and counts earlier entries this turn',()=>{
 const s=setup();give(s,1,'battle',[O]);cast(s,N);cast(s,N);const x=s.players[1].battle[0];x.under=[inst(N)];s.players[0].hand.push(inst(N));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));x.under=[];assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'));give(s,1,'battle',[O,GEN]);s.players[1].battle[0].under=[inst(N)];assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'));
});
test('Poppi forbids mana grave extra and battle origins for every element but permits hand and library',()=>{
 const s=setup();give(s,1,'battle',[P]);for(const origin of ['mana','grave','extra','battle','spell'])for(const id of [N,O,S])assert.equal(e.canEnterCreature(s,0,e.card(id),{origin,execution:false}),false);for(const origin of ['hand','deck'])assert.ok(e.canEnterCreature(s,0,e.card(N),{origin}));const spell=data.cards.find(c=>c.graveCast);give(s,0,'grave',[spell.id]);assert.ok(!e.getLegalActions(s).some(a=>a.origin==='grave'));
});
test('Poppi blocks grave spell choices rather than failing after the choice is submitted',()=>{
 const s=setup();give(s,1,'battle',[P]);const spell=data.cards.find(c=>c.type==='spell');give(s,0,'grave',[spell.id]);task(s,'execute',0,{origin:'grave',max:'∞',spellOnly:true,optional:true});assert.equal(s.decision.choices.length,1);pick(s,null);assert.ok(!s.decision);
});
test('Saint redirects an entire triple break to just its own shield without triggers or Balzark leave draw',()=>{
 const s=setup();give(s,0,'battle',[D]);const shield=castle(s,1,S);attack(s);if(s.decision?.type==='breakChoice'){act(s,'breakShields');}else if(s.decision?.type==='block')act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields');assert.equal(s.decision.task.op,'g26_Saint');pick(s,shield.uid);assert.equal(s.players[1].shields.length,5);assert.ok(s.players[1].hand.some(x=>x.uid===shield.uid));assert.equal(s.players[1].grave.length,0);assert.equal(s.players[1].hand.length,1);assert.equal(s.metrics[0].breaks,1);
});
test('Everlast mana arm3 and Garden reductions combine with a minimum summon cost of one',()=>{
 const s=setup();give(s,0,'mana',[L,L,L]);assert.equal(e.summonCost(s,0,e.card(E)),5);castle(s,0,G);castle(s,0,G);assert.equal(e.summonCost(s,0,e.card(E)),3);give(s,0,'mana',[L,L]);assert.equal(e.summonCost(s,0,e.card(E)),5);
});
test('Everlast shieldifies either players elements, including itself, and supports the optional top shield alternative',()=>{
 const s=setup();give(s,1,'battle',[N]);cast(s,E);const uid=s.players[1].battle[0].uid;pick(s,uid);assert.equal(s.players[1].battle.length,0);assert.ok(s.players[1].shields.some(x=>x.uid===uid));s.phase='main';cast(s,E);pick(s,null);const n=s.players[0].shields.length;pick(s,true);assert.equal(s.players[0].shields.length,n+1);
});
test('Everlast saver reserves two distinct shields, preserves the creature and disables shield triggers',()=>{
 const s=setup();give(s,1,'battle',[E,N]);give(s,1,'mana',Array(5).fill(L));const uid=s.players[1].battle[1].uid;task(s,'destroyPower',0,{max:2000});pick(s,uid);act(s,'replaceEver');act(s,'everShield');const selected=s.decision.chosen[0];assert.ok(!e.getLegalActions(s).some(a=>a.shield===selected));act(s,'everShield');assert.ok(s.players[1].battle.some(x=>x.uid===uid));assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].shields.length,3);assert.ok(!s.triggers);
});
test('Extreme Final Revolution works without revolution change and is shared game history with other Finals',()=>{
 const s=setup();cast(s,D);assert.ok(s.g26Extreme[0]);assert.ok(s.finalHistory[0]);s.g26Extreme[0]=false;s.finalUsed=[false,false];task(s,'g26_Final');assert.ok(!s.g26Extreme[0]);const t=setup();task(t,'g11_Final');t.finalUsed=[false,false];task(t,'g26_Final');assert.ok(!t.g26Extreme?.[0]);
});
test('Extreme prevents enemy removal including later creatures, but permits own effects and state based battle defeat',()=>{
 const s=setup();cast(s,D);cast(s,N);const uid=s.players[0].battle[1].uid;task(s,'destroyPower',1,{max:2000});pick(s,uid);assert.ok(s.players[0].battle.some(x=>x.uid===uid));task(s,'bounceAny',0);pick(s,uid);assert.ok(s.players[0].hand.some(x=>x.uid===uid));give(s,1,'battle',[D]);s.players[0].battle.push(inst(N));s.players[0].battle.at(-1).tapped=true;s.active=1;attack(s,s.players[1].battle[0].uid,s.players[0].battle.at(-1).uid);act(s,'noBlock');assert.ok(!s.players[0].battle.some(x=>x.cardId===N));
});
test('Extreme prevents direct defeat for the enemy turn then expires at own turn start',()=>{
 const s=setup();cast(s,D);give(s,0,'shields',[]);end(s);give(s,1,'battle',[N]);attack(s);act(s,'noBlock');assert.equal(s.winner,null);end(s);assert.equal(s.active,0);assert.equal(s.g26Extreme[0],false);
});
test('Dogi end may decline ramp and still deploy two hand or mana creatures with total cost at most seven',()=>{
 const s=setup();give(s,0,'battle',[D]);give(s,0,'hand',[Z,E]);const a=s.players[0].hand[0].uid;const m=inst(P);s.players[0].mana.push(m);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.task.op,'g26_End');pick(s,null);assert.ok(!s.decision.choices.some(c=>c.cardId===D));pick(s,v=>v?.uid===a);assert.ok(!s.decision.choices.some(c=>c.cardId===E));pick(s,v=>v?.uid===m.uid);assert.equal(s.decision.task.op,'g26_Order');pick(s,a);assert.ok(s.players[0].battle.some(x=>x.uid===a));assert.ok(s.players[0].battle.some(x=>x.uid===m.uid));
});
test('Zaze triggers once for each physical card shieldified from an evolution stack and ignores natural tap text under Genmu',()=>{
 const s=setup();give(s,0,'battle',[Z,O]);const x=s.players[0].battle[1];x.under=[inst(N),inst(N)];task(s,'bounceAny',0,{source:E});pick(s,null);s.phase='main';cast(s,E);pick(s,x.uid);act(s,'allowLeave');const count=(s.pendingEffects||[]).filter(x=>x.task?.op==='g26_Zaze').length+(s.decision?.task?.op==='g26_Zaze'?1:0);assert.equal(count,3);drain(s);const t=setup();give(t,1,'battle',[GEN]);cast(t,Z);assert.ok(!t.players[0].battle[0].tapped);
});
test('Everlast saver returns G castles to hand under replacement rules and handles a simultaneous removal without reusing shields',()=>{
 const s=setup();give(s,1,'battle',[E,Z]);give(s,1,'mana',Array(5).fill(L));give(s,1,'shields',[]);const a=castle(s,1,G),b=castle(s,1,H);task(s,'g11_Storm',0,{source:'dm24rp4-004',uid:'gone',lastKnownPower:13000});assert.equal(s.decision.type,'leaveReplace');act(s,'replaceEver');act(s,'everShield');act(s,'everShield');assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].hand.length,2);assert.ok(s.players[1].hand.some(x=>x.uid===a.uid));assert.ok(s.players[1].hand.some(x=>x.uid===b.uid));assert.equal(s.players[1].shields.length,0);assert.ok(s.players[1].grave.some(x=>x.cardId===Z));
});
test('Poppi Escape returns a G castle without chaining its grave replacement and AI never cycles shield selection cancel',()=>{
 const s=setup();give(s,1,'battle',[P]);give(s,1,'shields',[]);const x=castle(s,1,H);task(s,'destroyPower',0,{max:4000});pick(s,s.players[1].battle[0].uid);act(s,'replaceEscape');assert.ok(s.players[1].hand.some(y=>y.uid===x.uid));assert.equal(s.players[1].grave.length,0);
 const t=setup();give(t,1,'battle',[E]);give(t,1,'mana',Array(5).fill(L));task(t,'destroyPower',0,{max:13000});pick(t,t.players[1].battle[0].uid);act(t,'replaceEver');assert.equal(e.chooseAI(t).kind,'everShield');
});
test('Saint can be declined and ordinary castle replacement is not a broken shield',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[]);castle(s,1,S);attack(s);act(s,'noBlock');pick(s,null);assert.equal(s.players[1].grave[0].cardId,S);assert.equal(s.players[1].hand.length,0);assert.equal(s.metrics[0].breaks,0);
});
test('turn-player reverse burn outranks Saint and puts G castles at library bottom, without chaining grave replacement',()=>{
 const s=setup();give(s,0,'battle',['dm26rp1-DM001']);s.players[0].battle[0].hyperActive=true;give(s,1,'shields',[]);const uid=castle(s,1,S).uid;attack(s);act(s,'noBlock');drain(s);assert.equal(s.players[1].grave.length,0);assert.ok(s.players[1].deck.some(x=>x.uid===uid));assert.equal(s.metrics[0].breaks,0);
});
test('Hustle prevents a revolution swap entirely and does not move either creature',()=>{
 const s=setup();give(s,0,'battle',[V]);give(s,0,'hand',[D]);castle(s,1,H);attack(s);pick(s,true);pick(s,s.players[0].battle[0].uid);assert.ok(s.players[0].battle.some(x=>x.cardId===V));assert.ok(s.players[0].hand.some(x=>x.cardId===D));assert.ok(s.log.some(x=>x.type==='swapFailed'));
});
test('Extreme allows battle zero-power cleanup and protects the current creature stack after evolution',()=>{
 const s=setup();cast(s,D);cast(s,N);const n=s.players[0].battle.find(x=>x.cardId===N);n.powerModifiers=[{amount:-99999}];act(s,'toAttack');assert.ok(!s.players[0].battle.some(x=>x.uid===n.uid));
 const t=setup();cast(t,Z);cast(t,S);pick(t,'stay');const uid=t.players[0].battle[0].uid;t.phase='main';cast(t,O);act(t,'evolve',a=>a.baseUid===uid);assert.equal(t.players[0].battle[0].g26Stay,0);task(t,'bounceAny',1);pick(t,t.players[0].battle[0].uid);assert.equal(t.players[0].battle[0].cardId,O);
});
test('Extreme protected Segare can replace a normal summon but cannot pay its own move against an effect summon',()=>{
 const segare=data.cards.find(c=>c.segare).id;
 const s=setup();s.g26Extreme=[false,true];give(s,1,'battle',[segare]);give(s,0,'mana',[L]);castle(s,0,G);give(s,0,'hand',[Z]);act(s,'play',a=>a.cost===1);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle.length,0);
 const t=setup();t.g26Extreme=[false,true];give(t,1,'battle',[segare]);give(t,0,'mana',[L]);give(t,0,'hand',[V]);castle(t,0,G);give(t,0,'mana',[L,L]);act(t,'play',a=>a.alternative==='viride');assert.equal(t.players[0].battle[0].cardId,V);assert.equal(t.players[1].battle[0].cardId,segare);
});
test('new target choices work directly on the board, from the hand inspector, and with two-shield progress',()=>{
 const s=setup();give(s,0,'hand',[Z]);task(s,'g26_Deploy',0,{source:V,max:2});const uid=s.players[0].hand[0].uid;assert.ok(boardChoice(s,newManualUI(),0,'hand',uid));assert.ok(handCardModel(s,uid).canUse);
 const t=setup();give(t,0,'battle',[E]);task(t,'destroyPower',1,{max:13000});pick(t,t.players[0].battle[0].uid);act(t,'replaceEver');assert.equal(manualModel(t,newManualUI()).progress,'0 / 2つ');assert.ok(boardChoice(t,newManualUI(),0,'shields',t.players[0].shields[0].uid));act(t,'everShield');assert.equal(manualModel(t,newManualUI()).progress,'1 / 2つ');
});
test('Viride random actions conserve80 cards and round-trip every pending choice and replacement',()=>{
 for(let seed=1;seed<=8;seed++){const s=e.createGame([target,opponents[seed*3%opponents.length]],{seed:seed*4201,first:seed%2}),rng={rng:seed};for(let n=0;n<350&&s.winner===null;n++){const a=e.getLegalActions(s);assert.ok(a.length);e.step(s,a[Math.floor(e.random(rng)*a.length)]);conserve(s);assert.deepEqual(e.getLegalActions(JSON.parse(JSON.stringify(s))),e.getLegalActions(s));}}
});
test('Viride production worker completes sixty-two games with no unresolved match',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{await import('../dist/worker.js?viride42');await self.onmessage({data:{cards:data.cards,deck:target,opponents,count:2,first:'random',seed:4242}});assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages.filter(x=>x.type==='error')));const done=messages.find(x=>x.type==='done');assert.ok(done);assert.equal(done.results.length,31);for(const r of done.results){assert.equal(r.stats.completed,2,JSON.stringify(r));assert.equal(r.stats.unresolved,0);}}finally{delete globalThis.self;delete globalThis.postMessage;}
});
test('Viride AI games finish against all thirty-one configured decks with replay and card conservation',()=>{
 for(let i=0;i<opponents.length;i++){const s=e.createGame([target,opponents[i]],{seed:42000+i,first:i%2}),actions=[];for(let n=0;n<1800&&s.winner===null;n++){const a=e.chooseAI(s);assert.ok(a,JSON.stringify(s.decision));actions.push(a);e.step(s,a);conserve(s);}assert.notEqual(s.winner,null,opponents[i].name);const replay=e.createGame([target,opponents[i]],{seed:42000+i,first:i%2});for(const a of actions)e.step(replay,a);assert.deepEqual(replay,s);}
});
