import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,observation,summonCost,exLifeShields,exLifeShieldInfo,canEnterCreature,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_TARGET,environmentSupport,resolveEnvironmentDecks} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-8.json','dist/catalogue.json'].map(read));setCards(data.cards);
const ROD='dm23ex2-016',DREAM='dm24ex2-019',ONI='dm23ex3-S07',TERRA='sp-020',SURFER='dm05-024';let serial=0;
const inst=id=>({cardId:id,uid:'rod-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,pred=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:277});s.phase='main';for(const p of [0,1]){give(s,p,'battle',[]);give(s,p,'mana',[...Array(10).fill(ROD),...Array(10).fill('dmr13-079'),...Array(10).fill('dmr19-081')]);give(s,p,'shields',Array(5).fill('dm01-108'));}return s;};
const cast=(s,p,id=ROD)=>{s.players[p].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const end=(s)=>{if(s.phase==='charge')act(s,'skipCharge');if(s.phase==='main')act(s,'toAttack');act(s,'endTurn');};
const destroy=data.cards.find(c=>c.type==='spell'&&c.effect==='destroy').id;
const manaRemoval=data.cards.find(c=>c.type==='spell'&&c.effect==='manaRemoval').id;

test('Rod Zocia freezes all official abilities and retains all abilities as target progress advances',()=>{
 assert.equal(ENGINE_VERSION,'0.26.0');assert.equal(data.cards.length,744);assert.equal(data.supportExpansion.phase,27);const c=card(ROD),d=details.cards.find(c=>c.id===ROD),row=manifest.cards[0];assert.equal(manifest.cards.length,1);assert.deepEqual(row.face,d.faces[0]);assert.equal(c.text,d.faces[0].abilityText);assert.equal(c.source,row.source);assert.equal(c.cost,7);assert.equal(c.power,11000);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);
 const registry=createCatalogue(snapshot,data.cards,details),target=resolveEnvironmentDecks(registry).find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.totalTypes,14);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));
});
test('cost reduction counts light-or-fire mana cards once each, including tapped and five-color cards',()=>{
 const s=setup(),c=card(ROD);give(s,0,'mana',Array(4).fill(ROD));assert.equal(summonCost(s,0,c),7);give(s,1,'mana',Array(5).fill(ROD));assert.equal(summonCost(s,0,c),7);s.players[0].mana.push(inst('dm27-055'));s.players[0].mana.forEach(x=>x.tapped=true);assert.equal(summonCost(s,0,c),4);give(s,0,'hand',[ROD]);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));s.players[0].mana.forEach(x=>x.tapped=false);act(s,'play');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);assert.equal(card(s.players[0].battle[0]).cost,7);
 const t=setup();give(t,0,'mana',[...Array(4).fill('dm01-097'),...Array(3).fill('dm01-083')]);give(t,0,'hand',[ROD]);assert.equal(summonCost(t,0,c),7);assert.ok(!getLegalActions(t).some(a=>a.kind==='play'));give(t,0,'mana',[...Array(3).fill('dm01-075'),...Array(2).fill('dm01-097')]);assert.equal(getLegalActions(t).find(a=>a.kind==='play').cost,4);act(t,'play');assert.equal(t.players[0].mana.filter(x=>x.tapped).length,4);
});
test('EX life obligatorily shields the actual top card before entry effects without disclosing its identity',()=>{
 const s=setup();give(s,0,'deck',['dm01-086','dm01-108','dm01-108']);give(s,1,'battle',['dm01-075']);const top=s.players[0].deck[0];cast(s,0);const rod=s.players[0].battle[0];assert.equal(s.players[0].shields.at(-1).uid,top.uid);assert.equal(s.players[0].shields.length,6);assert.equal(s.players[0].deck.length,2);assert.deepEqual(exLifeShields(s,0,rod).map(x=>x.uid),[top.uid]);assert.deepEqual(exLifeShieldInfo(s,0,top.uid),{sourceUid:rod.uid,sourceCardId:ROD,active:true});assert.equal(s.decision.type,'effect');assert.ok(!s.log.some(e=>e.text.includes('スパイラル・ゲート')));assert.equal(observation(s,1).players[0].shields,6);assert.ok(!JSON.stringify(exLifeShieldInfo(s,0,top.uid)).includes(top.cardId));act(s,'effect');assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].entryLimitNextTurn,true);
});
test('EX life applies when Dream Dragon reveals Rod, using the card below Rod and continuing the attack after removal',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',[DREAM]);give(s,1,'battle',['dm01-084']);give(s,0,'deck',[ROD,'dm01-108','dm01-083','dm01-108']);const shield=s.players[0].deck[1].uid;act(s,'attack',a=>a.target==='player');assert.equal(s.players[0].battle[1].cardId,ROD);assert.equal(s.players[0].shields.at(-1).uid,shield);assert.equal(s.players[0].deck[0].cardId,'dm01-083');assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',a=>a.cardId===ROD);act(s,'effect');assert.equal(s.decision.type,'block');assert.ok(!getLegalActions(s).some(a=>a.kind==='block'));assert.equal(s.players[1].entryLimitNextTurn,true);assert.equal(s.metrics[0].triggers,0);assert.ok(s.log.findIndex(e=>e.type==='exLifeAdd')<s.log.findIndex(e=>e.type==='entryLimit'));
});
test('EX life emptying the library loses immediately before removal or delayed restrictions',()=>{
 for(const fromDeck of [false,true]){const s=setup();give(s,1,'battle',['dm01-075']);if(fromDeck){s.phase='attack';give(s,0,'battle',[DREAM]);give(s,0,'deck',[ROD,'dm01-108']);act(s,'attack');}else{give(s,0,'deck',['dm01-108']);cast(s,0);}assert.equal(s.winner,1);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].entryLimitNextTurn,undefined);assert.deepEqual(getLegalActions(s),[]);assert.ok(s.players[0].battle.some(x=>x.cardId===ROD));assert.equal(s.players[0].shields.length,6);}
});
test('destruction, bounce, and mana removal must spend EX life first, then a second removal moves the creature',()=>{
 for(const [effect,destination]of [[destroy,'grave'],['dm01-086','hand'],[manaRemoval,'mana']]){
  const s=setup();s.active=1;cast(s,1);const rod=s.players[1].battle[0],shield=rod.exLifeShieldUid;s.active=0;s.players[0].mana.push(...Array(10).fill('dm01-090').map(inst));cast(s,0,effect);act(s,'effect',a=>a.targets[0].uid===rod.uid);assert.ok(s.players[1].battle.includes(rod));assert.ok(s.players[1].grave.some(x=>x.uid===shield));assert.equal(exLifeShields(s,1,rod).length,0);assert.ok(!s.players[1].hand.some(x=>x.uid===shield));assert.equal(s.metrics[1].triggers,0);cast(s,0,effect);act(s,'effect',a=>a.targets[0].uid===rod.uid);assert.ok(!s.players[1].battle.includes(rod));assert.ok(s.players[1][destination].some(x=>x.uid===rod.uid));assert.equal(rod.exLifeShieldUid,undefined);if(destination==='mana')assert.equal(rod.tapped,true);
 }
});
test('losing a battle may consume EX life and remain, but Slayer still applies afterward as a separate removal',()=>{
 const slayer=data.cards.find(c=>c.slayer&&c.power<11000&&!c.death),s=setup();cast(s,0);s.phase='attack';give(s,1,'battle',[slayer.id]);s.players[1].battle[0].tapped=true;const rod=s.players[0].battle[0],shield=rod.exLifeShieldUid;act(s,'attack',a=>a.target!=='player');act(s,'noBlock');assert.ok(s.players[0].battle.includes(rod));assert.ok(s.players[0].grave.some(x=>x.uid===shield));assert.equal(s.players[1].battle.length,0);
 const t=setup();cast(t,0);t.phase='attack';give(t,1,'battle',[TERRA]);t.players[1].battle[0].tapped=true;const survivor=t.players[0].battle[0];act(t,'attack',a=>a.target!=='player');act(t,'noBlock');assert.ok(t.players[0].battle.includes(survivor));assert.equal(exLifeShields(t,0,survivor).length,0);
});
test('breaking the EX shield reveals its trigger normally and permanently removes that shield link',()=>{
 const s=setup();s.active=1;give(s,1,'deck',['dmr22-036','dm01-108','dm01-108']);cast(s,1);const rod=s.players[1].battle[0],shield=rod.exLifeShieldUid;s.active=0;s.phase='attack';give(s,0,'battle',['dm01-097']);act(s,'attack',a=>a.shield===shield);act(s,'noBlock');assert.equal(s.decision.type,'trigger');assert.equal(rod.exLifeShieldUid,undefined);assert.equal(exLifeShieldInfo(s,1,shield),null);act(s,'useTrigger');assert.ok(s.players[1].battle.some(x=>x.uid===shield));assert.equal(s.metrics[1].triggers,1);assert.equal(exLifeShields(s,1,rod).length,0);
});
test('an evolution over Rod retains the marked shield but has no EX-life replacement of its own',()=>{
 const s=setup();cast(s,0);const rod=s.players[0].battle[0],shield=rod.exLifeShieldUid;cast(s,0,TERRA);act(s,'evolve',a=>a.baseUid===rod.uid);const top=s.players[0].battle[0];assert.equal(exLifeShields(s,0,top).length,0);assert.deepEqual(exLifeShieldInfo(s,0,shield),{sourceUid:rod.uid,sourceCardId:ROD,active:false});s.active=1;cast(s,1,'dm01-086');act(s,'effect',a=>a.targets[0].uid===top.uid);assert.ok(!s.players[0].battle.length);assert.equal(s.players[0].shields.length,6);assert.equal(exLifeShieldInfo(s,0,shield),null);assert.ok(s.players[0].hand.some(x=>x.uid===rod.uid));assert.ok(s.players[0].hand.some(x=>x.uid===top.uid));
});
test('entry removal selects only strictly lower enemy power, and the restriction happens even with no legal target',()=>{
 const s=setup();give(s,1,'battle',['dm01-075',DREAM,TERRA]);cast(s,0);assert.equal(s.decision.type,'effect');const opts=getLegalActions(s);assert.equal(opts.length,1);assert.equal(opts[0].targets[0].uid,s.players[1].battle[0].uid);act(s,'effect');assert.equal(s.players[1].battle.length,2);assert.equal(s.players[1].entryLimitNextTurn,true);
 const t=setup();give(t,1,'battle',[DREAM,TERRA]);cast(t,0);assert.equal(t.decision,null);assert.equal(t.players[1].entryLimitNextTurn,true);assert.equal(t.players[1].battle.length,2);
});
test('a waiting Rod entry effect uses the evolved top and its last-known power after that stack leaves',()=>{
 const s=setup();cast(s,0);const rod=s.players[0].battle[0];cast(s,0,TERRA);act(s,'evolve');const top=s.players[0].battle[0],surfer=inst(SURFER);s.players[0].battle.push(surfer);give(s,1,'battle',[DREAM,TERRA]);
 // Reproduce an already waiting entry effect whose source was subsequently covered.
 s.pendingEffects=[{uid:rod.uid,incarnation:rod.incarnation,lastKnownPower:11000,source:ROD,effect:'entry',player:0,effectId:100},{uid:surfer.uid,source:SURFER,effect:'entry',player:0,effectId:101}];act(s,'toAttack');act(s,'orderEffect',a=>a.cardId===SURFER);act(s,'effect',a=>a.targets[0].uid===top.uid);assert.equal(s.decision.type,'effect');assert.equal(getLegalActions(s).length,1);assert.equal(getLegalActions(s)[0].targets[0].uid,s.players[1].battle[0].uid);act(s,'effect');assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].battle[0].cardId,TERRA);
});
test('reusing the same physical shield for a later Rod never restores the original creatures EX life',()=>{
 const s=setup();s.active=1;cast(s,1);const old=s.players[1].battle[0],uid=old.exLifeShieldUid;s.active=0;s.phase='attack';give(s,0,'battle',['dm01-097']);act(s,'attack',a=>a.shield===uid);act(s,'noBlock');assert.equal(old.exLifeShieldUid,undefined);const index=s.players[1].hand.findIndex(x=>x.uid===uid),[recycled]=s.players[1].hand.splice(index,1);s.players[1].deck.unshift(recycled);s.active=1;s.phase='main';cast(s,1);assert.equal(exLifeShields(s,1,old).length,0);assert.equal(s.players[1].battle[1].exLifeShieldUid,uid);assert.equal(exLifeShieldInfo(s,1,uid).sourceUid,s.players[1].battle[1].uid);
});
test('the next-opponent-turn restriction survives removing Rod, expires after that turn, and multiple Rods do not stack it to zero',()=>{
 const s=setup();cast(s,0);cast(s,0);cast(s,0,SURFER);act(s,'effect',a=>a.targets[0].player===0&&a.targets[0].uid===s.players[0].battle[0].uid);act(s,'toAttack');act(s,'endTurn');assert.equal(s.active,1);assert.equal(s.players[1].entryLimitThisTurn,true);assert.equal(s.players[1].entryLimitNextTurn,false);assert.equal(canEnterCreature(s,1),true);act(s,'skipCharge');cast(s,1,'dm01-097');assert.equal(s.players[1].enteredThisTurn,1);assert.equal(canEnterCreature(s,1),false);s.players[1].hand.push(inst('dm01-097'));assert.ok(!getLegalActions(s).some(a=>a.kind==='play'&&a.cardId==='dm01-097'));end(s);assert.equal(s.players[1].entryLimitThisTurn,false);end(s);assert.equal(s.players[1].entryLimitThisTurn,false);assert.equal(canEnterCreature(s,1),true);
});
test('the limit still activates after its source is fully bounced out of the battle zone',()=>{
 const s=setup();cast(s,0);const rod=s.players[0].battle[0];for(let i=0;i<2;i++){cast(s,0,SURFER);act(s,'effect',a=>a.targets[0].uid===rod.uid);}assert.ok(!s.players[0].battle.includes(rod));assert.ok(s.players[0].hand.includes(rod));end(s);assert.equal(s.players[1].entryLimitThisTurn,true);
});
test('when Rod enters during the opponent turn it limits their following turn, not the current one',()=>{
 const s=setup();s.active=1;s.phase='attack';give(s,1,'battle',['dm01-097']);give(s,0,'shields',['dm01-097']);
 // An entry already produced by a resolving effect on the opponent turn.
 const rod=inst(ROD);rod.incarnation=1;s.players[0].battle.push(rod);s.pendingEffects=[{uid:rod.uid,incarnation:1,lastKnownPower:11000,source:ROD,effect:'entry',player:0,effectId:1}];act(s,'attack');assert.equal(s.decision.player,0);assert.equal(s.decision.type,'effect');act(s,'effect');assert.equal(s.players[1].entryLimitThisTurn,undefined);assert.equal(s.players[1].entryLimitNextTurn,true);assert.equal(s.attack,null);end(s);assert.equal(s.active,0);assert.equal(s.players[1].entryLimitNextTurn,true);end(s);assert.equal(s.active,1);assert.equal(s.players[1].entryLimitThisTurn,true);
});
test('one entry can be an evolution, then normal and evolution creatures are both blocked while spells remain usable',()=>{
 const s=setup();cast(s,0);end(s);act(s,'skipCharge');give(s,1,'battle',['dm01-s08']);cast(s,1,TERRA);act(s,'evolve');assert.equal(s.players[1].enteredThisTurn,1);s.players[1].hand.push(inst('dm01-097'),inst(TERRA),inst('dm01-086'));assert.ok(getLegalActions(s).some(a=>a.kind==='play'&&a.cardId==='dm01-086'));assert.ok(!getLegalActions(s).some(a=>a.kind==='play'&&card(a.cardId).type==='creature'));
});
test('Dream Dragon cannot bypass the entry limit and leaves both normal and evolution dragons on top',()=>{
 for(const top of [ROD,TERRA]){const s=setup();cast(s,0);end(s);act(s,'skipCharge');cast(s,1,DREAM);act(s,'skipDragonTap');s.phase='attack';give(s,1,'deck',[top,'dm01-108']);act(s,'attack',a=>a.target==='player');assert.equal(s.players[1].deck[0].cardId,top);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].shields.length,5);assert.equal(s.decision.type,'block');assert.ok(s.log.some(e=>e.type==='revealStay'&&e.text.includes('登場制限')));}
});
test('a dragon revealed by a previous-turn attacker can be the one allowed entry, and a second attacker cannot add another',()=>{
 const s=setup();cast(s,0);end(s);act(s,'skipCharge');s.phase='attack';give(s,1,'battle',[DREAM,DREAM]);give(s,1,'deck',['dm01-s08','dm01-s08','dm01-108']);act(s,'attack',a=>a.uid===s.players[1].battle[0].uid&&a.target==='player');assert.equal(s.players[1].enteredThisTurn,1);act(s,'orderEffect');act(s,'skipDragonTap');act(s,'skipDragonTap');act(s,'noBlock');act(s,'breakShields');act(s,'attack',a=>a.uid===s.players[1].battle[1].uid&&a.target==='player');assert.equal(s.players[1].deck[0].cardId,'dm01-s08');assert.equal(s.players[1].battle.length,3);assert.equal(s.players[1].enteredThisTurn,1);
});
test('multiple declared creature shield triggers can all be declared but only the first can enter under a one-entry limit',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',[DREAM]);give(s,0,'deck',['dm01-108','dm01-108']);give(s,1,'shields',[SURFER,SURFER]);s.players[1].entryLimitThisTurn=true;s.players[1].enteredThisTurn=0;act(s,'attack');act(s,'noBlock');act(s,'useTrigger');act(s,'useTrigger');assert.equal(s.decision.type,'triggerOrder');act(s,'orderTrigger');assert.equal(s.metrics[1].triggers,1);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].hand.filter(x=>x.cardId===SURFER).length,1);assert.equal(s.decision.type,'effect');act(s,'skipEffect');assert.equal(s.triggers,null);assert.ok(s.log.some(x=>x.type==='entryPrevented'));
});
test('EX shield choices are public and AI choices never depend on the hidden shield card or either library order',()=>{
 const s=setup();s.active=1;cast(s,1);const rod=s.players[1].battle[0];s.active=0;s.phase='attack';give(s,0,'battle',[DREAM]);give(s,0,'deck',['dm01-108','dm01-108','dm01-108']);act(s,'attack');act(s,'noBlock');assert.equal(s.decision.type,'breakChoice');const chosen=chooseAI(s);assert.ok(chosen.shields.includes(rod.exLifeShieldUid));s.players[1].shields.forEach(x=>x.cardId=ONI);s.players[1].hand.forEach(x=>x.cardId=ONI);s.players.forEach(p=>p.deck.reverse());assert.deepEqual(chooseAI(s),chosen);assert.equal(observation(s,0).players[1].shields,6);assert.equal(exLifeShieldInfo(s,1,rod.exLifeShieldUid).sourceCardId,ROD);
});
test('Rod/dragon games conserve 80 unique physical cards through EX-life replacement, limits and evolution, and reproduce seeds',()=>{
 const deck={name:'Rod foundations',format:'original',cards:[ROD,DREAM,ONI,'dmx11-012','dm23bd4-008','dm25sp2-014',TERRA,'dm01-s08','dmr22-036','dm10-068'].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let shields=0,replacements=0,limits=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?deck:PRESETS[0]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);shields+=s.log.filter(x=>x.type==='exLifeAdd').length;replacements+=s.log.filter(x=>x.type==='exLifeReplace').length;limits+=s.log.filter(x=>x.type==='entryLimit').length;}
 assert.ok(shields>0);assert.ok(replacements>0);assert.ok(limits>0);assert.deepEqual(runGame([deck,PRESETS[1]],{seed:1908}),runGame([deck,PRESETS[1]],{seed:1908}));
});
