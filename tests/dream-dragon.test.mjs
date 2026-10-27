import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,observation,summonCost,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_TARGET,environmentSupport,resolveEnvironmentDecks} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-7.json','dist/catalogue.json'].map(read));setCards(data.cards);
const DREAM='dm24ex2-019',ONI='dm23ex3-S07',TERRA='sp-020',DRAGON='dm01-s08';let serial=0;
const inst=id=>({cardId:id,uid:'dream-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:812});s.phase='main';give(s,0,'battle',[]);give(s,1,'battle',[]);give(s,0,'mana',[...Array(12).fill(DREAM),...Array(20).fill(DRAGON)]);return s;};
const cast=(s,id=DREAM)=>{s.players[0].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const attack=(s,top,extra=[])=>{s.phase='attack';give(s,0,'battle',[DREAM,...extra]);give(s,1,'shields',Array(5).fill('dm01-108'));give(s,0,'deck',[top,'dm01-108','dm01-108','dm01-108','dm01-108']);act(s,'attack',a=>a.uid===s.players[0].battle[0].uid&&a.target==='player');};

test('Dream Dragon pins every official field and enables exactly four more tournament copies',()=>{
 assert.equal(ENGINE_VERSION,'0.116.0');assert.equal(data.cards.length,1655);const c=card(DREAM),d=details.cards.find(c=>c.id===DREAM),row=manifest.cards[0];assert.equal(manifest.cards.length,1);assert.deepEqual(row.face,d.faces[0]);assert.equal(c.text,d.faces[0].abilityText);assert.equal(c.source,row.source);assert.equal(c.cost,7);assert.equal(c.power,11000);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);
 const registry=createCatalogue(snapshot,data.cards,details),target=resolveEnvironmentDecks(registry).find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.totalTypes,14);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));
});
test('four own dragon mana reduce seven to four, independently of tapped state, with all three colors still required',()=>{
 const s=setup(),c=card(DREAM);give(s,0,'mana',[DREAM,DRAGON,ONI]);assert.equal(summonCost(s,0,c),7);give(s,1,'mana',Array(4).fill(DREAM));assert.equal(summonCost(s,0,c),7);s.players[0].mana.push(inst(TERRA));s.players[0].mana.forEach(x=>x.tapped=true);assert.equal(summonCost(s,0,c),4);give(s,0,'hand',[DREAM]);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));
 give(s,0,'mana',[DREAM,DREAM,DREAM,DRAGON]);assert.equal(getLegalActions(s).find(a=>a.kind==='play').cost,4);act(s,'play');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);assert.equal(card(s.players[0].battle[0]).cost,7);
 const t=setup();give(t,0,'mana',Array(4).fill(DRAGON));give(t,0,'hand',[DREAM]);assert.equal(summonCost(t,0,c),4);assert.ok(!getLegalActions(t).some(a=>a.kind==='play'));give(t,0,'mana',['dm01-075','dm01-097','dm01-108',...Array(4).fill('dm01-108')]);assert.equal(getLegalActions(t).find(a=>a.kind==='play').cost,7);act(t,'play');assert.equal(t.players[0].mana.filter(x=>x.tapped).length,7);
});
test('self entry offers an optional enemy tap; declining preserves the use for a later dragon but non-dragons do not trigger it',()=>{
 const s=setup();give(s,1,'battle',['dm01-084','dm01-075']);cast(s);assert.equal(s.decision.type,'dragonTap');assert.equal(getLegalActions(s).filter(a=>a.kind==='dragonTap').length,2);assert.ok(getLegalActions(s).filter(a=>a.kind==='dragonTap').every(a=>s.players[1].battle.some(x=>x.uid===a.uid)));act(s,'skipDragonTap');cast(s,'dm01-097');assert.equal(s.decision,null);cast(s,DRAGON);assert.equal(s.decision.type,'dragonTap');act(s,'dragonTap');assert.equal(s.players[1].battle[0].tapped,true);cast(s,DRAGON);assert.equal(s.decision,null);assert.equal(s.log.filter(x=>x.type==='dragonTap').length,1);
});
test('each copy has its own use and controller-selected order, including a newly entering second copy',()=>{
 const s=setup();give(s,1,'battle',['dm01-084','dm01-075']);cast(s);act(s,'skipDragonTap');cast(s);assert.equal(s.decision.type,'effectOrder');const choices=getLegalActions(s);assert.equal(choices.length,2);act(s,'orderEffect',a=>a.uid===s.players[0].battle[1].uid);act(s,'dragonTap',a=>a.uid===s.players[1].battle[1].uid);assert.equal(s.decision.type,'dragonTap');act(s,'skipDragonTap');cast(s,DRAGON);assert.equal(s.decision.type,'dragonTap');act(s,'dragonTap',a=>a.uid===s.players[1].battle[0].uid);cast(s,DRAGON);assert.equal(s.decision,null);assert.equal(s.log.filter(x=>x.type==='dragonTap').length,2);
});
test('returning and replaying the same physical copy creates a new use, while its old use stays spent',()=>{
 const s=setup();give(s,1,'battle',['dm01-084','dm01-075']);cast(s);const uid=s.players[0].battle[0].uid;act(s,'dragonTap');const key=uid+'@1';assert.equal(s.once[key],s.turn);s.players[0].mana.push(inst('dm01-083'));cast(s,'dm01-086');act(s,'effect',a=>a.targets[0].uid===uid);assert.ok(s.players[0].hand.some(x=>x.uid===uid));act(s,'play',a=>a.uid===uid);assert.equal(s.decision.type,'dragonTap');assert.equal(s.players[0].battle[0].incarnation,2);act(s,'dragonTap',a=>a.uid===s.players[1].battle[1].uid);assert.equal(s.once[uid+'@2'],s.turn);assert.equal(s.once[key],s.turn);
});
test('an already-triggered optional tap still resolves after its source is returned, without spending a later incarnation',()=>{
 const fixture={...card(DRAGON),id:'fixture-bounce-dragon',name:'fixture-bounce',effect:'bounceOptional'};setCards([...data.cards,fixture]);try{
  const s=setup();give(s,1,'battle',['dm01-084']);attack(s,fixture.id);const uid=s.players[0].battle[0].uid;act(s,'orderEffect',a=>a.cardId===fixture.id);act(s,'effect',a=>a.targets[0].uid===uid);assert.equal(s.attack,null);assert.equal(s.decision.type,'dragonTap');act(s,'dragonTap');assert.equal(s.players[1].battle[0].tapped,true);assert.equal(s.decision,null);assert.ok(s.players[0].hand.some(x=>x.uid===uid));
 }finally{setCards(data.cards);}
});
test('the once-per-turn tap resets on the opponent turn and waits until all shield triggers have executed',()=>{
 const s=setup();give(s,1,'battle',['dm01-084']);cast(s);act(s,'dragonTap');act(s,'toAttack');act(s,'endTurn');assert.equal(s.active,1);act(s,'skipCharge');s.phase='attack';give(s,1,'battle',[DREAM]);give(s,1,'deck',['dm01-108','dm01-108']);give(s,0,'shields',['dmr22-036','dmr19-081']);act(s,'attack');act(s,'noBlock');act(s,'useTrigger');act(s,'useTrigger');assert.equal(s.decision.type,'triggerOrder');assert.equal(s.players[1].battle[0].tapped,true);act(s,'orderTrigger');assert.equal(s.metrics[0].triggers,2);assert.equal(s.decision.type,'entryOrder');assert.equal(s.log.filter(x=>x.type==='dragonTap').length,1);act(s,'orderEntry');act(s,'dragonTap');assert.equal(s.log.filter(x=>x.type==='dragonTap').length,2);assert.equal(s.decision,null);assert.equal(s.triggers,null);
});
test('attack reveals the actual top dragon without paying, summoning, or executing a shield trigger',()=>{
 const s=setup();give(s,1,'battle',[]);const mana=s.players[0].mana.map(x=>x.tapped);attack(s,DRAGON);assert.equal(s.players[0].battle.length,2);assert.equal(s.players[0].battle[1].cardId,DRAGON);assert.equal(s.players[0].battle[1].tapped,false);assert.equal(s.players[0].battle[1].entered,s.turn);assert.deepEqual(s.players[0].mana.map(x=>x.tapped),mana);assert.equal(s.metrics[0].triggers,0);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.decision.type,'breakChoice');act(s,'breakShields');assert.ok(!getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[1].uid));assert.ok(s.log.some(x=>x.type==='enter'&&x.cardId===DRAGON));
});
test('a non-dragon is obligatorily sent to grave, without casting its spell or choosing a different top card',()=>{
 const s=setup();give(s,1,'battle',[]);const hand=s.players[0].hand.length;attack(s,'dm01-086');assert.equal(s.players[0].grave.at(-1).cardId,'dm01-086');assert.equal(s.players[0].hand.length,hand);assert.equal(s.players[0].deck[0].cardId,'dm01-108');assert.equal(s.decision.type,'block');assert.equal(s.players[0].battle.length,1);
});
test('revealed Dream Dragon may tap a blocker before blocking, and remains a speed attacker itself',()=>{
 const s=setup();give(s,1,'battle',['dm01-084']);attack(s,DREAM);assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect');act(s,'dragonTap');assert.equal(s.decision.type,'dragonTap');act(s,'skipDragonTap');assert.equal(s.decision.type,'block');assert.deepEqual(getLegalActions(s).map(a=>a.kind),['noBlock']);act(s,'noBlock');act(s,'breakShields');assert.ok(getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[1].uid));assert.equal(s.log.filter(x=>x.type==='reveal').length,1);
});
test('revealed Onimaru resolves its optional battle and victory draw before resuming the original attack',()=>{
 const s=setup();give(s,1,'battle',['dm01-084','dm01-075']);attack(s,ONI);assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',a=>a.cardId===ONI);act(s,'fight',a=>a.target===s.players[1].battle[0].uid);assert.equal(s.decision.reason,'battleWin');act(s,'draw',a=>a.n===1);assert.equal(s.decision.type,'dragonTap');act(s,'dragonTap');assert.equal(s.decision.type,'block');assert.ok(!getLegalActions(s).some(a=>a.kind==='block'));assert.equal(s.attack.attacker,s.players[0].battle[0].uid);assert.equal(s.players[1].shields.length,5);assert.ok(s.log.findIndex(x=>x.type==='draw')<s.log.findIndex(x=>x.type==='dragonTap'));
});
test('removing the attacked creature during entry effects ends the attack but still resolves other waiting effects',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',[DREAM]);give(s,1,'battle',['dm01-075','dm01-084']);s.players[1].battle[0].tapped=true;give(s,0,'deck',[ONI,...Array(5).fill('dm01-108')]);const target=s.players[1].battle[0].uid;act(s,'attack',a=>a.target===target);act(s,'orderEffect',a=>a.cardId===ONI);act(s,'fight',a=>a.target===target);assert.equal(s.attack,null);act(s,'draw',a=>a.n===0);assert.equal(s.decision.type,'dragonTap');act(s,'skipDragonTap');assert.equal(s.decision,null);assert.ok(!getLegalActions(s).some(a=>a.kind==='block'||a.kind==='noBlock'));assert.equal(s.players[1].shields.length,5);
});
test('evolving the attacking Dream Dragon from the revealed top continues the same attack with triple break',()=>{
 const s=setup();give(s,1,'battle',['dm01-084']);give(s,1,'mana',['dm01-108',DRAGON]);attack(s,TERRA);assert.equal(s.decision.type,'revealEvolution');assert.deepEqual(getLegalActions(s).map(a=>a.kind),['revealEvolve']);const base=s.players[0].battle[0].uid;act(s,'revealEvolve',a=>a.baseUid===base);const top=s.players[0].battle[0];assert.equal(top.cardId,TERRA);assert.equal(top.under[0].uid,base);assert.equal(top.tapped,true);assert.equal(s.attack.attacker,top.uid);assert.equal(s.players[1].mana.length,1);assert.equal(s.players[1].mana[0].cardId,DRAGON);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.decision.type,'breakChoice');assert.equal(s.decision.count,3);act(s,'breakShields');assert.equal(s.players[1].shields.length,2);assert.equal(s.log.filter(x=>x.type==='attack').length,1);assert.equal(s.log.filter(x=>x.type==='reveal').length,1);
});
test('evolving a different dragon leaves the original attacker and its double breaker intact',()=>{
 const s=setup();give(s,1,'battle',[]);attack(s,TERRA,[DRAGON]);const attacker=s.players[0].battle[0].uid;act(s,'revealEvolve',a=>a.baseUid===s.players[0].battle[1].uid);assert.equal(s.attack.attacker,attacker);act(s,'orderEffect',a=>a.cardId===TERRA);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.decision.count,2);
});
test('a revealed evolution without a legal base stays on top, and merely revealing a last card does not lose',()=>{
 const fixture={...card(TERRA),id:'fixture-no-base',name:'fixture-only',evolution:{race:'absent-race'}};setCards([...data.cards,fixture]);try{const s=setup();s.phase='attack';give(s,0,'battle',[DREAM]);give(s,0,'deck',[fixture.id]);act(s,'attack');assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);assert.equal(s.players[0].grave.length,0);assert.equal(s.decision.type,'block');assert.ok(s.log.some(x=>x.type==='revealStay'));}finally{setCards(data.cards);}
});
test('moving the last card ends the game before entry effects or a direct attack, for both dragon and non-dragon',()=>{
 for(const id of [TERRA,DRAGON,'dm01-108']){const s=setup();s.phase='attack';give(s,0,'battle',[DREAM]);give(s,1,'mana',['dm01-108']);give(s,1,'shields',[]);give(s,0,'deck',[id]);act(s,'attack');if(s.decision?.type==='revealEvolution')act(s,'revealEvolve');assert.equal(s.winner,1);assert.deepEqual(getLegalActions(s),[]);assert.equal(s.players[1].mana.length,1);assert.ok(!s.log.some(x=>x.type==='break'));}
});
test('AI choices cannot inspect either library order, shields, or the opponent hand, including tap and effect-order choices',()=>{
 const s=setup();give(s,1,'battle',['dm01-084','dm01-075']);attack(s,ONI);for(let i=0;i<4&&s.decision;i++){const chosen=chooseAI(s),view=observation(s,chosen.player);s.players[0].deck.reverse();s.players[1].deck.reverse();s.players[1].hand.forEach(x=>x.cardId=DREAM);s.players.forEach(p=>p.shields.forEach(x=>x.cardId=DREAM));assert.deepEqual(chooseAI(s),chosen);assert.ok(!JSON.stringify(view).includes('deck":['));step(s,chosen);}
});
test('mixed dragon and evolution games finish reproducibly and conserve 80 unique physical cards at every decision',()=>{
 const deck={name:'Dream Dragon foundations',format:'original',cards:[DREAM,ONI,'dmx11-012','dm23bd4-008','dm25sp2-014',TERRA,DRAGON,'dm01-s10','dmr22-036','dm10-068'].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let reveals=0,taps=0,evolutions=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?deck:PRESETS[0]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);reveals+=s.log.filter(x=>x.type==='reveal'&&x.text.includes('ドリーム')).length;taps+=s.log.filter(x=>x.type==='dragonTap').length;evolutions+=s.log.filter(x=>x.type==='evolve').length;}
 assert.ok(reveals>0);assert.ok(taps>0);assert.ok(evolutions>0);assert.deepEqual(runGame([deck,PRESETS[1]],{seed:648}),runGame([deck,PRESETS[1]],{seed:648}));
});
