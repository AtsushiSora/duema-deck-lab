import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,power,effectiveCard,canUntap,canCastSpell,evolutionBases,observation,physicalCards,runGame,validateDeck,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,environmentSupport,ENVIRONMENT_TARGET} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-9.json','dist/catalogue.json'].map(read));setCards(data.cards);
const Y='dm26rp1-S002',ROD='dm23ex2-016',DREAM='dm24ex2-019',HAND='dm01-027',BRAIN='dm01-052',BOUNCE='dm01-086',FREI='dm01-043';let serial=0;
const inst=id=>({cardId:id,uid:'chakra-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,pred=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:901});s.phase='main';for(const p of [0,1]){give(s,p,'battle',[]);give(s,p,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108'].flatMap(id=>Array(12).fill(id)));give(s,p,'shields',Array(5).fill('dm01-108'));}return s;};
const cast=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const drain=s=>{let n=0;while(s.decision&&s.winner===null){assert.ok(n++<80);step(s,chooseAI(s));}};
const end=s=>{if(s.phase==='charge')act(s,'skipCharge');if(s.phase==='main')act(s,'toAttack');act(s,'endTurn');if(s.decision?.type==='untap')act(s,'endUntap',a=>!a.yes);};
const hit=(s,attacker='dm01-097',pred=()=>true)=>{s.phase='attack';const x=inst(attacker);s.players[s.active].battle.push(x);act(s,'attack',a=>a.uid===x.uid&&a.target==='player'&&pred(a));act(s,'noBlock');return x;};

test('Chakra pins both full faces and enables only the verified card, including both tournament lists',()=>{
 assert.equal(ENGINE_VERSION,'0.108.0');assert.equal(data.cards.length,1607);assert.equal(data.supportExpansion.phase,106);const c=card(Y),d=details.cards.find(c=>c.id===Y),r=manifest.cards[0];assert.equal(manifest.cards.length,1);assert.deepEqual(r.faces,d.faces);assert.equal(c.cost,3);assert.equal(c.power,4000);assert.equal(c.blocker,undefined);assert.equal(c.breaker,undefined);assert.equal(c.source,r.source);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.ok(c.text.includes(d.faces[1].abilityText));
 const registry=createCatalogue(snapshot,data.cards,details),decks=resolveEnvironmentDecks(registry),target=decks.find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.equal(p.totalTypes,14);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));assert.equal(environmentSupport(decks.find(d=>d.id==='env-gp2026-sara'),registry).supportedCopies,40);
 assert.throws(()=>setCards([...data.cards,{...c,id:'bad-hyper',hyper:{...c.hyper,breaker:5}}]),/未実装/);assert.ok(card(Y));
});
test('entry obligatorily shields the actual top, keeps its identity private and taps exactly one enemy',()=>{
 const s=setup();give(s,0,'deck',[BRAIN,'dm01-108','dm01-108']);give(s,1,'battle',['dm01-075',FREI]);const top=s.players[0].deck[0];cast(s,Y);assert.equal(s.players[0].shields.at(-1).uid,top.uid);assert.equal(s.players[0].deck.length,2);assert.equal(s.decision.effect,'shieldEntryTapLock');assert.ok(!getLegalActions(s).some(a=>a.kind==='skipEffect'));assert.ok(getLegalActions(s).every(a=>a.targets.length===1&&a.targets[0].player===1));act(s,'effect',a=>a.targets[0].uid===s.players[1].battle[1].uid);assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.players[1].battle[1].tapped,true);assert.equal(canUntap(s.players[1].battle[1]),false);assert.ok(!s.log.some(e=>e.text.includes(card(BRAIN).name)));assert.equal(observation(s,1).players[0].shields,6);assert.equal(s.players[0].battle[0].hyperActive,undefined);
});
test('shielding the last library card loses immediately before the shield-entry tap resolves',()=>{
 const s=setup();give(s,0,'deck',['dm01-108']);give(s,1,'battle',[FREI]);cast(s,Y);assert.equal(s.winner,1);assert.equal(s.players[0].shields.length,6);assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.decision,null);assert.deepEqual(getLegalActions(s),[]);
});
test('each owned Chakra triggers on shield placement, including Rod EX life, with independent ordering',()=>{
 const s=setup();give(s,0,'battle',[Y,Y]);give(s,1,'battle',[Y,FREI]);cast(s,ROD);assert.equal(s.decision.type,'effectOrder');assert.equal(s.pendingEffects.filter(e=>e.effect==='shieldEntryTapLock').length,2);assert.ok(s.pendingEffects.every(e=>e.player===0));act(s,'orderEffect',a=>a.cardId===Y);act(s,'effect',a=>a.targets[0].uid===s.players[1].battle[1].uid);assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',a=>a.cardId===Y);act(s,'effect',a=>a.targets[0].uid===s.players[1].battle[1].uid);assert.equal(s.decision.effect,'destroyWeakerLimitNextTurn');act(s,'effect',a=>a.targets[0].uid===s.players[1].battle[0].uid);assert.equal(s.players[1].battle[0].tapped,true);assert.deepEqual(s.players[1].battle[0].tapLocks,[0]);assert.ok(s.players[0].battle.filter(x=>x.cardId===Y).every(x=>!x.hyperActive));
});
test('new Chakra also sees its own shield added alongside the existing copies',()=>{
 const s=setup();give(s,0,'battle',[Y]);give(s,1,'battle',[FREI]);cast(s,Y);assert.equal(s.decision.type,'effectOrder');assert.equal(s.pendingEffects.filter(e=>e.effect==='shieldEntryTapLock').length,2);drain(s);assert.equal(s.players[1].battle[0].tapped,true);
});
test('tap lock survives source removal and stops both normal and end-of-turn untapping until the sources next turn',()=>{
 const s=setup();give(s,1,'battle',[FREI]);cast(s,Y);act(s,'effect');const target=s.players[1].battle[0],y=s.players[0].battle[0];end(s);assert.equal(s.active,1);assert.equal(target.tapped,true);assert.equal(canUntap(target),false);act(s,'skipCharge');cast(s,HAND);act(s,'effect',a=>a.targets[0].uid===y.uid);assert.equal(s.players[0].battle.length,0);assert.equal(canUntap(target),false);end(s);assert.equal(s.active,0);assert.equal(s.decision,null);assert.equal(canUntap(target),true);assert.equal(target.tapped,true);end(s);assert.equal(s.active,1);assert.equal(target.tapped,false);
});
test('a lock made on the enemy turn expires at the imminent source-controller turn and multiple controllers expire separately',()=>{
 const s=setup();give(s,0,'battle',[FREI]);give(s,1,'battle',[Y]);s.players[0].battle[0].tapped=true;
 // A waiting shield-placement ability belongs to the non-active player.
 s.pendingEffects=[{uid:s.players[1].battle[0].uid,source:Y,effect:'shieldEntryTapLock',player:1,effectId:1}];act(s,'toAttack');act(s,'effect');const target=s.players[0].battle[0];assert.deepEqual(target.tapLocks,[1]);target.tapLocks.push(0);end(s);assert.equal(s.active,1);assert.deepEqual(target.tapLocks,[0]);assert.equal(canUntap(target),false);end(s);assert.equal(s.active,0);assert.deepEqual(target.tapLocks,[]);assert.equal(target.tapped,false);
});
test('normal evolution inherits the untap lock, but leaving and replaying clears it',()=>{
 const s=setup();give(s,1,'battle',['dm01-084']);cast(s,Y);act(s,'effect');end(s);act(s,'skipCharge');const base=s.players[1].battle[0];cast(s,'dm32-072');act(s,'evolve',a=>a.baseUid===base.uid);const top=s.players[1].battle[0];assert.equal(top.tapped,true);assert.equal(canUntap(top),false);cast(s,BOUNCE);act(s,'effect',a=>a.targets[0].player===1);assert.equal(top.tapLocks,undefined);assert.equal(base.tapLocks,undefined);act(s,'play',a=>a.uid===base.uid);assert.equal(base.tapped,false);assert.equal(canUntap(base),true);
});
test('either players shield leaving immediately unlocks every top Chakra, including before shield-trigger effects',()=>{
 for(const owner of [0,1]){const s=setup();give(s,owner,'battle',[Y]);give(s,1,'shields',[BRAIN,'dm01-108']);const y=s.players[owner].battle[0];hit(s);assert.equal(y.hyperActive,true);assert.equal(power(y,false,s),7500);assert.equal(effectiveCard(y,s).blocker,true);assert.equal(effectiveCard(y,s).breaker,2);assert.equal(s.decision?.type,'trigger');act(s,'useTrigger');if(owner===0){assert.equal(s.metrics[1].triggers,0);assert.ok(s.players[1].hand.some(x=>x.cardId===BRAIN));}else{assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===0);}}
});
test('EX-life replacement shield loss activates Z rush without invoking an S trigger',()=>{
 const s=setup();give(s,1,'battle',[Y]);give(s,1,'deck',[BRAIN,'dm01-108','dm01-108']);s.active=1;cast(s,ROD);drain(s);const rod=s.players[1].battle.find(x=>x.cardId===ROD),shield=rod.exLifeShieldUid;s.active=0;cast(s,HAND);act(s,'effect',a=>a.targets[0].uid===rod.uid);assert.ok(s.players[1].battle.includes(rod));assert.equal(s.players[1].grave.find(x=>x.uid===shield).cardId,BRAIN);assert.equal(s.players[1].battle[0].hyperActive,true);assert.equal(s.metrics[1].triggers,0);assert.equal(s.triggers,undefined);
});
test('hyper lasts through the enemy turn and resets before the next own turn; the other players hyper expires independently',()=>{
 const s=setup();give(s,0,'battle',[Y]);give(s,1,'battle',[Y]);const a=s.players[0].battle[0],b=s.players[1].battle[0];hit(s);end(s);assert.equal(s.active,1);assert.equal(power(a,false,s),7500);assert.equal(power(b,false,s),4000);assert.equal(effectiveCard(b,s).blocker,undefined);end(s);assert.equal(s.active,0);assert.equal(power(a,false,s),4000);assert.equal(a.tapped,false);
});
test('Chakra entering after a previous shield loss is base mode and a returned physical card loses old hyper',()=>{
 const s=setup();hit(s);s.phase='main';cast(s,Y);const y=s.players[0].battle.find(x=>x.cardId===Y);assert.equal(y.hyperActive,undefined);hit(s);assert.equal(y.hyperActive,true);s.phase='main';cast(s,BOUNCE);act(s,'effect',a=>a.targets[0].uid===y.uid);assert.equal(y.hyperActive,undefined);act(s,'play',a=>a.uid===y.uid);assert.equal(power(y,false,s),4000);assert.equal(card(y).cost,3);assert.equal(power({...y,hyperActive:true}),4000);
});
test('hyper blocker may block the next attack with 7500 power and W breaker applies on its own next attack',()=>{
 const s=setup();give(s,1,'battle',[Y]);const y=s.players[1].battle[0];hit(s);const next=inst('dm01-075');s.players[0].battle.push(next);act(s,'attack',a=>a.uid===next.uid);assert.ok(getLegalActions(s).some(a=>a.kind==='block'&&a.uid===y.uid));act(s,'block',a=>a.uid===y.uid);assert.ok(s.players[1].battle.includes(y));assert.ok(!s.players[0].battle.includes(next));assert.ok(s.log.some(e=>e.type==='battle'&&e.text.includes('(7500)')));
 const t=setup();give(t,0,'battle',[Y]);const own=t.players[0].battle[0];hit(t);act(t,'attack',a=>a.uid===own.uid&&a.target==='player');act(t,'noBlock');assert.equal(t.decision.type,'breakChoice');assert.equal(t.decision.count,2);act(t,'breakShields');assert.equal(t.players[1].shields.length,2);assert.equal(t.winner,null);
});
test('blocker-dependent evolution and blocker bounce use the active hyper abilities, then the base loses them under evolution',()=>{
 const s=setup();give(s,0,'battle',[Y]);const y=s.players[0].battle[0];assert.equal(evolutionBases(s,0,card('dm32-072')).length,0);hit(s);assert.equal(evolutionBases(s,0,card('dm32-072'))[0].uid,y.uid);s.phase='main';cast(s,'dm32-072');act(s,'evolve');const top=s.players[0].battle.find(x=>x.cardId==='dm32-072');assert.equal(power(top,false,s),card(top).power);assert.equal(effectiveCard(y,s).blocker,undefined);assert.equal(canCastSpell(s,1,card(BRAIN)),true);
 const t=setup();give(t,0,'battle',[Y,'dm01-083']);const yt=t.players[0].battle[0];hit(t);t.phase='main';cast(t,'dm02-s02');act(t,'evolve',a=>a.baseUid===t.players[0].battle[1].uid);assert.ok(!t.players[0].battle.some(x=>x.uid===yt.uid));assert.ok(t.players[0].hand.some(x=>x.uid===yt.uid));assert.equal(yt.hyperActive,undefined);
});
test('hyper locks only opposing spells of printed cost five or less, leaving high-cost spells and creatures legal',()=>{
 const s=setup();give(s,1,'battle',[Y]);hit(s);s.phase='main';give(s,0,'hand',[BOUNCE,BRAIN,HAND,Y]);assert.equal(canCastSpell(s,0,card(BRAIN)),false);assert.equal(canCastSpell(s,1,card(BRAIN)),true);const plays=getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.cardId);assert.ok(!plays.includes(BOUNCE));assert.ok(!plays.includes(BRAIN));assert.ok(plays.includes(HAND));assert.ok(plays.includes(Y));cast(s,HAND);act(s,'effect',a=>a.targets[0].cardId===Y||a.targets[0].uid===s.players[1].battle[0].uid);assert.ok(getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===BRAIN));
});
test('official QA 48474: both triggers declare before Z rush, Demon Hand removes the lock, then Cyber Brain casts',()=>{
 const s=setup();give(s,0,'battle',[Y]);give(s,1,'shields',[BRAIN,HAND]);hit(s,ROD);assert.equal(s.decision.type,'trigger');act(s,'useTrigger');assert.equal(s.decision.type,'trigger');assert.equal(s.metrics[1].triggers,0);act(s,'useTrigger');assert.equal(s.decision.effect,'destroy');assert.equal(s.metrics[1].triggers,1);assert.ok(s.players[1].hand.some(x=>x.cardId===BRAIN));act(s,'effect',a=>a.targets[0].uid===s.players[0].battle[0].uid);assert.equal(s.metrics[1].triggers,2);assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===1);assert.equal(s.triggers,null);assert.ok(!s.players[1].hand.some(x=>x.cardId===BRAIN));
});
test('an already active hyper prevents low-cost trigger declaration, even if another trigger later removes it',()=>{
 const s=setup();give(s,0,'battle',[Y]);hit(s);give(s,1,'shields',[BRAIN,HAND]);hit(s,ROD);assert.equal(s.decision.source,HAND);act(s,'useTrigger');assert.equal(s.decision.effect,'destroy');act(s,'effect',a=>a.targets[0].uid===s.players[0].battle[0].uid);assert.equal(s.metrics[1].triggers,1);assert.ok(s.players[1].hand.some(x=>x.cardId===BRAIN));assert.equal(s.decision,null);
});
test('declared but blocked spells stay in hand and two Chakras keep the lock after only one is removed',()=>{
 for(const copies of [1,2]){const s=setup();give(s,0,'battle',Array(copies).fill(Y));give(s,1,'shields',copies===1?[BRAIN]:[BRAIN,HAND]);hit(s,copies===1?'dm01-097':ROD);act(s,'useTrigger');if(copies===2){act(s,'useTrigger');act(s,'effect',a=>a.targets[0].uid===s.players[0].battle[0].uid);}assert.equal(s.decision,null);assert.equal(s.triggers,null);assert.ok(s.players[1].hand.some(x=>x.cardId===BRAIN));assert.ok(!s.players[1].grave.some(x=>x.cardId===BRAIN));assert.equal(s.metrics[1].triggers,copies===1?0:1);assert.ok(s.log.some(e=>e.type==='spellPrevented'));}
});
test('creature shield triggers remain usable under the spell lock and enter after the shield-loss event in base mode',()=>{
 const s=setup();give(s,0,'battle',[Y]);give(s,1,'shields',['dmr22-036']);hit(s);act(s,'useTrigger');assert.equal(s.metrics[1].triggers,1);assert.ok(s.players[1].battle.some(x=>x.cardId==='dmr22-036'));assert.ok(!s.decision);
});
test('AI uses public hyper power and tap locks, never hidden shield identities, opponent hands or library order',()=>{
 const s=setup();give(s,1,'battle',[Y,FREI]);cast(s,Y);const a=chooseAI(s);s.players[0].deck.reverse();s.players[1].deck.reverse();s.players[0].shields.forEach(x=>x.cardId=HAND);s.players[1].shields.forEach(x=>x.cardId=BRAIN);s.players[1].hand.forEach(x=>x.cardId=DREAM);assert.deepEqual(chooseAI(s),a);act(s,'effect');hit(s);const y=s.players[0].battle[0],v=observation(s,0);assert.equal(power(y,false,v),7500);assert.equal(effectiveCard(y,v).blocker,true);assert.equal(v.players[0].shields,6);assert.ok(v.players[1].hand.every(x=>x.hidden&&!x.cardId));assert.ok(!('deck'in v.players[0]));
});
test('Chakra mixed games terminate, reproduce seeds, and preserve 80 unique physical cards after every legal action',()=>{
 const deck={name:'Chakra validation',format:'original',cards:[Y,ROD,DREAM,'dm23ex3-S07','dmx11-012','dm23bd4-008','dm25sp2-014','dm01-075',HAND,BRAIN].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let shields=0,hyper=0,locks=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?PRESETS[1]:deck],{seed:seed*79,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);assert.ok(a);step(s,a);const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);for(const p of s.players)for(const x of [...p.hand,...p.grave,...p.mana])assert.ok(!x.hyperActive&&!x.tapLocks?.length);}assert.notEqual(s.winner,null);shields+=s.log.filter(e=>e.type==='shieldAdd').length;hyper+=s.log.filter(e=>e.type==='hyper').length;locks+=s.log.filter(e=>e.type==='effect'&&e.cardId===Y).length;}
 assert.ok(shields>0&&hyper>0&&locks>0);assert.deepEqual(runGame([deck,PRESETS[1]],{seed:907}),runGame([deck,PRESETS[1]],{seed:907}));
});
