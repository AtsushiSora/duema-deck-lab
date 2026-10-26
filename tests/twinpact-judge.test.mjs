import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,playFaces,createGame,getLegalActions,step,chooseAI,power,isDragon,physicalCards,observation,runGame,validateDeck,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,environmentSupport,ENVIRONMENT_TARGET} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-11.json','dist/catalogue.json'].map(read));setCards(data.cards);
const RS='dm22ex1-030',Y='dm26rp1-S002',ROD='dm23ex2-016',DREAM='dm24ex2-019',KIRA='dm25rp3-012',TERRA='sp-020',BRAIN='dm01-052',HAND='dm01-027';let serial=0;
const inst=id=>({cardId:id,uid:'twin-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,pred=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:1111});s.phase='main';for(const p of [0,1]){give(s,p,'battle',[]);give(s,p,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108'].flatMap(id=>Array(10).fill(id)));give(s,p,'shields',Array(5).fill('dm01-108'));}return s;};
const cast=(s,id=RS,face=0)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&(a.face||0)===face);};
const attack=s=>{s.phase='attack';act(s,'attack',a=>a.cardId===undefined&&a.target==='player'&&s.players[s.active].battle.find(x=>x.uid===a.uid)?.cardId===RS);};
const judgeDecks=(s,own=[TERRA,'dm01-108','dm01-108'],opp=['dm01-108','dm01-108','dm01-108'])=>{give(s,0,'deck',own);give(s,1,'deck',opp);};
const drain=s=>{let n=0;while(s.decision&&s.winner===null){assert.ok(n++<120);step(s,chooseAI(s));}};

test('the twinpact pins both official faces and advances only verified support while the target tournament deck is complete',()=>{
 assert.equal(ENGINE_VERSION,'0.71.0');assert.equal(data.cards.length,1404);assert.equal(data.supportExpansion.phase,71);const c=card(RS),d=details.cards.find(c=>c.id===RS),r=manifest.cards[0];assert.equal(manifest.cards.length,1);assert.deepEqual(r.faces,d.faces);assert.equal(c.cost,7);assert.equal(c.power,5000);assert.equal(c.type,'creature');assert.equal(c.source,r.source);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.ok(c.text.includes(d.faces[1].abilityText));assert.equal(playFaces(c)[1].cost,3);assert.equal(playFaces(c)[1].type,'spell');assert.equal(playFaces(c)[1].id,RS);assert.equal(isDragon(c),true);assert.equal(playFaces(c)[1].speedAttacker,undefined);
 const registry=createCatalogue(snapshot,data.cards,details),target=resolveEnvironmentDecks(registry).find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.unsupported.length,0);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));
 assert.throws(()=>setCards([...data.cards,{...c,id:'bad-twin',spellFace:{...c.spellFace,effect:'unhandled'}}]),/未実装/);assert.ok(card(RS));
});
test('main phase exposes two choices for one physical card; only the selected face determines the cost and destination',()=>{
 const s=setup();give(s,0,'hand',[RS]);const uid=s.players[0].hand[0].uid;let opts=getLegalActions(s).filter(a=>a.kind==='play');assert.deepEqual(opts.map(a=>[a.face,a.cost]),[[0,7],[1,3]]);assert.ok(opts.every(a=>a.uid===uid));give(s,0,'mana',Array(3).fill('dm01-097'));opts=getLegalActions(s).filter(a=>a.kind==='play');assert.deepEqual(opts.map(a=>a.face),[1]);judgeDecks(s);act(s,'play');assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].mana.at(-1).uid,uid);assert.equal(s.players[0].mana.length,4);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].grave.length,0);
});
test('creature casting pays seven, has printed power 5000 and speed attacker, and performs no spell judge or charger',()=>{
 const s=setup();give(s,1,'battle',[]);cast(s);const c=s.players[0].battle[0];assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);assert.equal(power(c,false,s),5000);assert.equal(s.decision,null);assert.ok(!s.log.some(e=>e.type==='judgeResult'||e.type==='charger'));s.phase='attack';assert.ok(getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid));
});
test('both forms still require fire mana and cannot pay with tapped mana',()=>{
 const s=setup();give(s,0,'hand',[RS]);give(s,0,'mana',Array(9).fill('dm01-108'));assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'mana',Array(9).fill('dm01-097'));s.players[0].mana.forEach(x=>x.tapped=true);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));
});
test('winning spell judge rotates actual top cards, then obligatorily draws the new top and charges the same physical card untapped',()=>{
 const s=setup();judgeDecks(s,[TERRA,'dm01-083','dm01-108'],['dm01-108','dm01-075']);const own=s.players[0].deck.map(x=>x.uid),opp=s.players[1].deck.map(x=>x.uid),hand=s.players[0].hand.length;cast(s,RS,1);assert.deepEqual(s.players[0].deck.map(x=>x.uid),[own[2],own[0]]);assert.deepEqual(s.players[1].deck.map(x=>x.uid),[opp[1],opp[0]]);assert.equal(s.players[0].hand.at(-1).uid,own[1]);assert.equal(s.players[0].hand.length,hand+1);assert.equal(s.players[0].mana.at(-1).cardId,RS);assert.equal(s.players[0].mana.at(-1).tapped,false);assert.equal(s.resolvingSpell,null);assert.equal(s.judge,null);assert.ok(s.log.some(e=>e.type==='judgeResult'&&e.text.includes('勝ち')));assert.ok(s.log.findIndex(e=>e.type==='draw')<s.log.findIndex(e=>e.type==='charger'));
});
test('losing spell judge draws nothing but still completes charger; equal cost wins for the judge user',()=>{
 for(const won of [false,true]){const s=setup();judgeDecks(s,won?[KIRA,'dm01-108','dm01-108']:['dm01-108','dm01-108'],won?[KIRA,'dm01-108','dm01-108']:[TERRA,'dm01-108']);const hand=s.players[0].hand.length;cast(s,RS,1);assert.equal(s.players[0].hand.length,hand+(won?1:0));assert.equal(s.players[0].mana.at(-1).cardId,RS);assert.equal(s.players[0].mana.at(-1).tapped,false);assert.ok(s.log.some(e=>e.type==='judgeResult'&&e.text.includes(won?'勝ち':'負け')));}
});
test('revealing and rotating a one-card deck does not lose, but the following mandatory winning draw loses before charger',()=>{
 const s=setup();judgeDecks(s,[TERRA],['dm01-108']);cast(s,RS,1);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);assert.equal(s.players[0].hand.at(-1).cardId,TERRA);assert.equal(s.resolvingSpell.inst.cardId,RS);assert.ok(!s.players[0].mana.some(x=>x.cardId===RS));assert.ok(!s.log.some(e=>e.type==='charger'));assert.deepEqual(getLegalActions(s),[]);
 const t=setup();give(t,0,'battle',[RS]);judgeDecks(t,[TERRA],['dm01-108']);attack(t);assert.equal(t.winner,null);assert.equal(t.players[0].deck.length,1);assert.equal(t.decision.type,'judgeContinue');act(t,'stopJudge');assert.equal(t.decision.type,'judgeBreak');
});
test('each owner chooses their own revealed twinpact cost, in turn-player order, with pending spell conservation',()=>{
 const s=setup();judgeDecks(s,[RS,'dm01-108','dm01-108'],[RS,'dm01-108','dm01-108']);const before=physicalCards(s).length;cast(s,RS,1);assert.equal(s.decision.type,'judgeCost');assert.equal(s.decision.player,0);assert.equal(s.resolvingSpell.inst.cardId,RS);assert.equal(s.players[0].grave.length,0);assert.equal(physicalCards(s).length,before+1);assert.deepEqual(getLegalActions(s).map(a=>a.cost),[7,3]);act(s,'judgeCost',a=>a.cost===3);assert.equal(s.decision.player,1);act(s,'judgeCost',a=>a.cost===7);assert.ok(s.log.some(e=>e.type==='judgeResult'&&e.text.includes('3 対 7、負け')));assert.equal(s.players[0].mana.at(-1).cardId,RS);assert.equal(s.resolvingSpell,null);assert.equal(physicalCards(s).length,before+1);
});
test('the chosen three-cost spell face is blocked by Chakra while the seven-cost creature face and own spells remain usable',()=>{
 const s=setup();give(s,1,'battle',[Y]);s.players[1].battle[0].hyperActive=true;give(s,0,'hand',[RS]);assert.deepEqual(getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.face),[0]);s.players[1].battle=[];give(s,0,'battle',[Y]);s.players[0].battle[0].hyperActive=true;assert.deepEqual(getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.face),[0,1]);s.players[0].entryLimitThisTurn=true;s.players[0].enteredThisTurn=1;assert.deepEqual(getLegalActions(s).filter(a=>a.kind==='play').map(a=>a.face),[1]);
});
test('Dream Dragon and Mendelssohn use the creature identity, while charger mana is usable immediately and counts as a dragon',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);judgeDecks(s,[RS,'dm01-108','dm01-108']);s.phase='attack';act(s,'attack',a=>a.target==='player');assert.ok(s.players[0].battle.some(x=>x.cardId===RS));assert.ok(!s.log.some(e=>e.type==='judgeResult'||e.type==='charger'));drain(s);
 const t=setup();judgeDecks(t,[RS,'dm01-108','dm01-108']);cast(t,'dmx11-012');assert.equal(t.players[0].mana.at(-1).cardId,RS);assert.equal(t.players[0].mana.at(-1).tapped,true);
 const u=setup();give(u,0,'mana',Array(3).fill('dm01-097'));judgeDecks(u);cast(u,RS,1);const charged=u.players[0].mana.at(-1);assert.equal(isDragon(card(charged)),true);give(u,0,'hand',['dm01-100']);assert.ok(getLegalActions(u).some(a=>a.kind==='play'));act(u,'play');assert.equal(charged.tapped,true);
});
test('battle-zone cost is seven and spell casting never creates a creature or counts toward the Rod entry limit',()=>{
 const s=setup();give(s,1,'battle',[RS,'dm01-075']);const rs=s.players[1].battle[0];cast(s,'dmr07-043');assert.equal(s.decision.effect,'bounceSmall');assert.ok(getLegalActions(s).every(a=>a.targets.every(x=>x.uid!==rs.uid)));act(s,'effect');assert.ok(s.players[1].battle.includes(rs));assert.equal(s.players[1].battle.length,1);
 const t=setup();judgeDecks(t);cast(t,RS,1);assert.equal(t.players[0].enteredThisTurn||0,0);assert.equal(t.metrics[0].firstCreature,null);assert.equal(t.metrics[0].triggers,0);
});
test('the first attack judge is compulsory, a win may be stopped immediately, and a loss proceeds to normal blocking',()=>{
 const s=setup();give(s,0,'battle',[RS]);judgeDecks(s);attack(s);assert.equal(s.decision.type,'judgeContinue');assert.ok(!getLegalActions(s).some(a=>a.kind==='noBlock'));assert.equal(s.log.filter(e=>e.type==='judgeResult').length,1);act(s,'stopJudge');assert.equal(s.decision.type,'judgeBreak');act(s,'judgeBreak');assert.equal(s.players[1].shields.length,4);assert.equal(s.decision.type,'block');act(s,'noBlock');if(s.decision?.type==='breakChoice')act(s,'breakShields');assert.equal(s.players[1].shields.length,3);
 const t=setup();give(t,0,'battle',[RS]);judgeDecks(t,['dm01-108','dm01-108'],[TERRA,'dm01-108']);attack(t);assert.equal(t.decision.type,'block');assert.ok(!getLegalActions(t).some(a=>a.kind==='stopJudge'));assert.equal(t.players[1].shields.length,5);
});
test('successive wins rotate the libraries each time; losing fixes the number of separate effect breaks',()=>{
 const s=setup();give(s,0,'battle',[RS]);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108','dm01-108',TERRA]);attack(s);act(s,'judgeAgain');assert.equal(s.judge.wins,2);act(s,'judgeAgain');assert.equal(s.judge.stage,'breaks');assert.equal(s.judge.remaining,2);assert.equal(s.log.filter(e=>e.type==='judgeResult').length,3);assert.deepEqual(s.players[0].deck.map(x=>x.cardId),[TERRA,TERRA,'dm01-108']);act(s,'judgeBreak');assert.equal(s.players[1].shields.length,4);assert.equal(s.decision.type,'judgeBreak');act(s,'judgeBreak');assert.equal(s.players[1].shields.length,3);assert.equal(s.decision.type,'block');assert.equal(s.metrics[0].breaks,2);
});
test('every effect break completes its S trigger and entry effect before the next shield is chosen',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,1,'shields',[KIRA,BRAIN,'dm01-108']);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108','dm01-108',TERRA]);attack(s);act(s,'judgeAgain');act(s,'stopJudge');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);assert.equal(s.decision.type,'trigger');assert.equal(s.players[1].shields.length,2);act(s,'useTrigger');assert.ok(s.players[1].battle.some(x=>x.cardId===KIRA));assert.ok(s.log.some(e=>e.type==='effect'&&e.cardId===KIRA));assert.equal(s.decision.type,'judgeBreak');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);assert.equal(s.decision.type,'trigger');act(s,'useTrigger');assert.equal(s.decision.type,'draw');assert.equal(s.judge.remaining,0);act(s,'draw',a=>a.n===0);assert.equal(s.decision.type,'block');
});
test('removing the attacker during the first effect break stops the attack but does not cancel the already resolving remaining breaks',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,1,'shields',['dm05-024','dm01-108','dm01-108']);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108','dm01-108',TERRA]);const uid=s.players[0].battle[0].uid;attack(s);act(s,'judgeAgain');act(s,'stopJudge');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);act(s,'useTrigger');act(s,'effect',a=>a.targets[0].uid===uid);assert.equal(s.attack,null);assert.equal(s.decision.type,'judgeBreak');assert.ok(s.players[0].hand.some(x=>x.uid===uid));act(s,'judgeBreak');assert.equal(s.players[1].shields.length,1);assert.equal(s.decision,null);assert.equal(s.judge,null);assert.equal(s.winner,null);
});
test('a shield guard replaces only that one effect break; later breaks can select the surviving shield again',()=>{
 const s=setup();give(s,0,'battle',[RS]);const guard=inst(TERRA);guard.under=[inst(KIRA)];s.players[1].battle.push(guard);give(s,1,'shields',['dm01-108']);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108','dm01-108',TERRA]);attack(s);act(s,'judgeAgain');act(s,'stopJudge');const shield=s.players[1].shields[0].uid;act(s,'judgeBreak');assert.equal(s.decision.type,'shieldGuard');act(s,'guardShield');assert.equal(s.metrics[0].breaks,0);assert.equal(s.judge.remaining,1);assert.equal(s.decision.type,'judgeBreak');act(s,'judgeBreak',a=>a.shield===shield);assert.equal(s.players[1].shields.length,0);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.winner,0);
});
test('breaking all shields by the attack ability permits the continuing original player attack to win, without turning an effect break into damage',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,1,'shields',['dm01-108']);judgeDecks(s);attack(s);act(s,'stopJudge');act(s,'judgeBreak');assert.equal(s.players[1].shields.length,0);assert.equal(s.winner,null);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.winner,0);
 const t=setup();give(t,0,'battle',[RS]);give(t,1,'battle',['dm01-075']);t.players[1].battle[0].tapped=true;give(t,1,'shields',['dm01-108']);judgeDecks(t);t.phase='attack';act(t,'attack',a=>a.target!=='player');act(t,'stopJudge');act(t,'judgeBreak');act(t,'noBlock');assert.equal(t.winner,null);assert.ok(t.log.some(e=>e.type==='battle'));
});
test('effect breaks happen before blocker declaration even against an unblockable target choice or a direct player attack',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,1,'battle',['dm01-084']);give(s,1,'shields',['dm01-108']);judgeDecks(s);attack(s);act(s,'stopJudge');act(s,'judgeBreak');assert.equal(s.decision.type,'block');assert.ok(getLegalActions(s).some(a=>a.kind==='block'));act(s,'block');assert.equal(s.winner,null);assert.equal(s.players[1].shields.length,0);
 const t=setup();give(t,0,'battle',[RS]);give(t,1,'shields',[]);judgeDecks(t);attack(t);assert.equal(t.log.filter(e=>e.type==='judgeResult').length,1);act(t,'stopJudge');assert.equal(t.decision.type,'block');assert.equal(t.winner,null);
});
test('a game-ending draw during the first shield trigger stops the remaining effect breaks',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,1,'shields',[BRAIN,'dm01-108','dm01-108']);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108']);attack(s);act(s,'judgeAgain');act(s,'stopJudge');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);act(s,'useTrigger');act(s,'draw',a=>a.n===1);assert.equal(s.winner,0);assert.equal(s.players[1].shields.length,2);assert.equal(s.judge.remaining,1);assert.deepEqual(getLegalActions(s),[]);
});
test('separate effect breaks reevaluate Chakra spell restrictions before each new declaration',()=>{
 const s=setup();give(s,0,'battle',[RS,Y]);give(s,1,'shields',[BRAIN,BRAIN,'dm01-108']);judgeDecks(s,[TERRA,TERRA,'dm01-108'],['dm01-108','dm01-108',TERRA]);attack(s);act(s,'judgeAgain');act(s,'stopJudge');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);assert.equal(s.decision.type,'trigger');act(s,'useTrigger');assert.equal(s.metrics[1].triggers,0);assert.equal(s.decision.type,'judgeBreak');act(s,'judgeBreak',a=>a.shield===s.players[1].shields[0].uid);assert.equal(s.decision.type,'block');assert.equal(s.metrics[1].triggers,0);assert.equal(s.log.filter(e=>e.type==='declare').length,1);assert.equal(s.players[1].hand.filter(x=>x.cardId===BRAIN).length,2);
});
test('evolving over RS removes its speed-attacker/attack-judge ability and does not cast the base spell face',()=>{
 const s=setup();give(s,0,'battle',[RS]);cast(s,TERRA);act(s,'evolve');const c=s.players[0].battle[0];s.phase='attack';act(s,'attack',a=>a.uid===c.uid);assert.equal(s.decision.type,'block');assert.ok(!s.log.some(e=>e.type==='judgeResult'||e.type==='charger'));
});
test('AI chooses faces and judge costs using only legal actions and revealed cards, never future deck order or shields',()=>{
 const s=setup();judgeDecks(s,[RS,'dm01-108','dm01-108'],[RS,'dm01-108','dm01-108']);cast(s,RS,1);const a=chooseAI(s);assert.equal(a.cost,7);s.players[0].deck.splice(1,s.players[0].deck.length-1,...s.players[0].deck.slice(1).reverse());s.players[1].deck.splice(1,s.players[1].deck.length-1,...s.players[1].deck.slice(1).reverse());s.players[0].shields.forEach(x=>x.cardId=HAND);s.players[1].shields.forEach(x=>x.cardId=BRAIN);s.players[1].hand.forEach(x=>x.cardId=TERRA);assert.deepEqual(chooseAI(s),a);const v=observation(s,0);assert.equal(v.judge.revealed[0].cardId,RS);assert.equal(v.resolvingSpell.cardId,RS);assert.ok(v.players[1].hand.every(x=>x.hidden&&!x.cardId));assert.ok(!('deck'in v.players[0]));step(s,a);assert.equal(chooseAI(s).cost,7);
 const t=setup();give(t,0,'hand',[RS]);give(t,0,'mana',Array(3).fill('dm01-097'));const b=chooseAI(t);assert.equal(b.kind,'play');assert.equal(b.face,1);t.players[0].deck.reverse();t.players[1].deck.reverse();assert.deepEqual(chooseAI(t),b);
});
test('mixed twinpact/dragon games finish, preserve all 80 physical cards including a pending spell, and replay deterministically',()=>{
 const deck={name:'Twinpact validation',format:'original',cards:[RS,Y,KIRA,ROD,DREAM,'dm23ex3-S07','dmx11-012','dm23bd4-008','dm25sp2-014',TERRA].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let chargers=0,judges=0,pending=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?PRESETS[1]:deck],{seed:seed*113,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);assert.ok(a);step(s,a);const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);if(s.resolvingSpell)pending++;}assert.notEqual(s.winner,null);chargers+=s.log.filter(e=>e.type==='charger').length;judges+=s.log.filter(e=>e.type==='judgeResult').length;}
 assert.ok(chargers>0&&judges>0&&pending>0);assert.deepEqual(runGame([deck,PRESETS[1]],{seed:1111}),runGame([deck,PRESETS[1]],{seed:1111}));
});

test('an effect break of an EX-life shield removes only that association and resolves the shield trigger before the original attack',()=>{
 const s=setup();s.active=1;give(s,1,'deck',[KIRA,'dm01-108','dm01-108']);cast(s,ROD);const rod=s.players[1].battle[0],shield=rod.exLifeShieldUid;s.active=0;give(s,0,'battle',[RS]);judgeDecks(s);attack(s);act(s,'stopJudge');act(s,'judgeBreak',a=>a.shield===shield);assert.equal(rod.exLifeShieldUid,undefined);assert.ok(s.players[1].battle.includes(rod));assert.equal(s.decision.type,'trigger');act(s,'useTrigger');assert.equal(s.metrics[1].triggers,1);assert.ok(s.players[1].battle.some(x=>x.cardId===KIRA));assert.equal(s.decision.type,'block');assert.equal(s.winner,null);
});
test('scoring judge costs, continuation and shield choices never mutates the game state',()=>{
 const s=setup();give(s,0,'battle',[RS]);judgeDecks(s,[RS,TERRA,'dm01-108'],[RS,'dm01-108','dm01-108']);attack(s);
 for(let n=0;n<40&&s.decision;n++){const before=structuredClone(s),a=chooseAI(s);assert.deepEqual(s,before);step(s,a);if(s.decision?.type==='block')break;}
});
