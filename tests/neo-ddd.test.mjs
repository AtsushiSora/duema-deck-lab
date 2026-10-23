import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,runGame,physicalCards,evolutionBases,isEvolution,selfTriggersStopped,validateDeck,observation,ENGINE_VERSION} from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,environmentSupport,ENVIRONMENT_TARGET} from '../dist/environment.js';
const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const [data,details,snapshot,manifest]=await Promise.all(['dist/cards.json','dist/details.json','dist/catalogue.json','tools/support-phase-12.json'].map(read));setCards(data.cards);
const GG='dm25rp3-S09',DREAM='dm24ex2-019',ROD='dm23ex2-016',Y='dm26rp1-S002',KIRA='dm25rp3-012',RS='dm22ex1-030',ONI='dm23ex3-S07';
let serial=0;const inst=id=>({cardId:id,uid:'neo-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,pred=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:1212});s.phase='main';for(const p of [0,1]){give(s,p,'hand',[]);give(s,p,'battle',[]);give(s,p,'mana',['dm01-075','dm01-097','dm01-108','dm01-083','dm01-090'].flatMap(id=>Array(10).fill(id)));give(s,p,'shields',Array(5).fill('dm01-108'));}return s;};
const cast=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const gg=(s,p,evolved=true)=>{const c=inst(GG);if(evolved)c.under=[inst('dm01-108')];s.players[p].battle.push(c);return c;};
const attack=(s,uid=s.players[s.active].battle[0].uid,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);};
const drain=s=>{for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<200);step(s,chooseAI(s));}};

test('GG pins its complete official face, adds one canonical name, and preserves complete target-deck support',()=>{
 assert.equal(ENGINE_VERSION,'0.37.0');assert.equal(data.cards.length,856);assert.equal(data.supportExpansion.phase,38);const row=manifest.cards[0],c=card(GG),d=details.cards.find(x=>x.id===GG);assert.deepEqual(row.face,d.faces[0]);assert.equal(row.source,c.source);assert.equal(c.text,d.faces[0].abilityText);assert.equal(c.cost,10);assert.equal(c.power,18000);assert.equal(c.limit,4);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);
 const registry=createCatalogue(snapshot,data.cards,details),target=resolveEnvironmentDecks(registry).find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.unsupported.length,0);assert.equal(p.unsupported.reduce((n,x)=>n+x.count,0),0);assert.equal(registry.cards.filter(c=>!c.supported).length,10977);assert.deepEqual(validateDeck(target),[]);
 for(const bad of [{...c,id:'bad',ddd:{cost:6}},{...c,id:'bad',neoEvolution:{race:'ドラゴン'}},{...c,id:'bad',breaker:5}])assert.throws(()=>setCards([...data.cards,bad]),/未実装/);assert.ok(card(GG));
});
test('normal summoning requires ten mana with all three civilizations; choosing or cancelling evolution pays nothing early',()=>{
 const s=setup();give(s,0,'hand',[GG]);give(s,0,'mana',Array(10).fill('dm01-108'));assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'mana',['dm01-075','dm01-097',...Array(8).fill('dm01-108')]);act(s,'play');assert.equal(s.decision.type,'evolution');assert.ok(s.players[0].mana.every(x=>!x.tapped));act(s,'cancelEvolution');assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].battle.length,0);act(s,'play');act(s,'evolve',a=>!a.baseUid);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,10);assert.equal(isEvolution(s.players[0].battle[0]),false);assert.equal(selfTriggersStopped(s,1),false);s.phase='attack';assert.ok(!getLegalActions(s).some(a=>a.kind==='attack'));
});
test('NEO bases accept light, fire or nature including multicolor and another NEO, but reject pure water and darkness',()=>{
 const s=setup();give(s,0,'battle',['dm01-075','dm01-097','dm01-108','dm01-083','dm01-090',GG,DREAM]);assert.deepEqual(evolutionBases(s,0,card(GG)).map(x=>x.cardId),['dm01-075','dm01-097','dm01-108',GG,DREAM]);cast(s,GG);act(s,'evolve',a=>a.baseUid===s.players[0].battle[0].uid);const top=s.players[0].battle.at(-1);assert.equal(isEvolution(top),true);assert.equal(selfTriggersStopped(s,1),true);s.phase='attack';assert.ok(getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===top.uid));
});
test('NEO evolution inherits tapped state, temporary effects, locks and the complete nested stack',()=>{
 const s=setup(),base=gg(s,0);base.tapped=true;base.buff=2000;base.unblocked=true;base.tapLocks=[1];const lower=base.under[0].uid;cast(s,GG);act(s,'evolve',a=>a.baseUid===base.uid);const top=s.players[0].battle[0];assert.equal(top.tapped,true);assert.equal(top.buff,2000);assert.equal(top.unblocked,true);assert.deepEqual(top.tapLocks,[1]);assert.equal(top.under[0].under[0].uid,lower);s.phase='attack';assert.ok(!getLegalActions(s).some(a=>a.kind==='attack'));
});
test('Dream Dragon may reveal GG either as a normal creature without a base or as an evolved creature',()=>{
 for(const evolved of [false,true]){const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'deck',[GG,'dm01-108']);attack(s);assert.equal(s.decision.type,'revealEvolution');act(s,'revealEvolve',a=>!!a.baseUid===evolved);const c=s.players[0].battle.find(x=>x.cardId===GG);assert.equal(isEvolution(c),evolved);assert.equal(s.players[0].deck.length,1);assert.equal(s.metrics[0].triggers,0);drain(s);assert.ok(!s.log.some(x=>x.type==='dddSummon'));}
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'deck',[GG]);attack(s);act(s,'revealEvolve',a=>!a.baseUid);assert.equal(s.winner,1);assert.ok(s.players[0].battle.some(x=>x.cardId===GG));
});
test('DDD declares before attack effects, pays seven only on resolution, evolves the attacker and continues with four breaks',()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,0,'hand',[GG]);const base=s.players[0].battle[0];attack(s);assert.equal(s.decision.type,'dddDeclare');assert.ok(s.players[0].mana.every(x=>!x.tapped));act(s,'declareDDD');assert.equal(s.decision.type,'dddSummon');act(s,'summonDDD',a=>a.baseUid===base.uid);const top=s.players[0].battle[0];assert.equal(top.cardId,GG);assert.equal(s.attack.attacker,top.uid);assert.equal(top.tapped,true);assert.equal(top.under[0].uid,base.uid);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);assert.equal(card(top).cost,10);assert.equal(s.metrics[0].played[GG],1);assert.equal(s.metrics[0].triggers,0);assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.decision.type,'breakChoice');act(s,'breakShields');assert.equal(s.players[1].shields.length,1);assert.equal(s.metrics[0].breaks,4);
});
test('DDD can use another base or no base and never transfers the original attack to a different creature',()=>{
 for(const mode of ['other','none']){const s=setup();give(s,0,'battle',['dm01-108','dm01-075']);give(s,0,'hand',[GG]);const [attacker,other]=s.players[0].battle;attack(s,attacker.uid);act(s,'declareDDD');act(s,'summonDDD',a=>mode==='other'?a.baseUid===other.uid:!a.baseUid);const c=s.players[0].battle.find(x=>x.cardId===GG);assert.equal(s.attack.attacker,attacker.uid);assert.equal(c.tapped,false);assert.equal(isEvolution(c),mode==='other');act(s,'noBlock');assert.equal(s.players[1].shields.length,4);assert.equal(getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid),mode==='other');}
});
test('DDD cannot pay with missing colors, tapped mana or insufficient mana, and respects the Rod entry limit',()=>{
 for(const mode of ['colors','tapped','count','limit']){const s=setup();give(s,0,'battle',['dm01-108']);give(s,0,'hand',[GG]);if(mode==='colors')give(s,0,'mana',Array(10).fill('dm01-108'));if(mode==='tapped')s.players[0].mana.forEach(x=>x.tapped=true);if(mode==='count')s.players[0].mana.splice(6);if(mode==='limit'){s.players[0].entryLimitThisTurn=true;s.players[0].enteredThisTurn=1;}attack(s);act(s,'declareDDD');assert.ok(!getLegalActions(s).some(a=>a.kind==='summonDDD'));act(s,'skipDDDSummon');assert.equal(s.players[0].hand[0].cardId,GG);assert.equal(s.decision.type,'block');}
});
test('every hand DDD is declared before any payment or existing attack effect, and a declined declaration cannot be reopened',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'hand',[GG,GG]);give(s,0,'deck',['dm01-108','dm01-108']);attack(s);act(s,'declareDDD');assert.equal(s.decision.type,'dddDeclare');assert.equal(s.players[0].deck.length,2);assert.ok(s.players[0].mana.every(x=>!x.tapped));act(s,'skipDDD');assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',a=>a.cardId===GG);act(s,'summonDDD',a=>!!a.baseUid);assert.equal(s.players[0].hand.length,1);assert.ok(!getLegalActions(s).some(a=>a.kind==='declareDDD'));drain(s);assert.equal(s.log.filter(x=>x.type==='dddDeclare').length,1);assert.equal(s.log.filter(x=>x.type==='reveal').length,1);
});
test('two declared copies recheck remaining mana separately; the second stays in hand without consuming mana',()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,0,'hand',[GG,GG]);give(s,0,'mana',['dm01-075','dm01-097',...Array(5).fill('dm01-108')]);attack(s);act(s,'declareDDD');act(s,'declareDDD');act(s,'orderEffect');act(s,'summonDDD',a=>!!a.baseUid);assert.equal(s.decision.type,'dddSummon');assert.deepEqual(getLegalActions(s).map(a=>a.kind),['skipDDDSummon']);act(s,'skipDDDSummon');assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
});
test('declared DDD rechecks colors after an earlier entry effect returns the only light mana to the library',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'hand',[GG]);give(s,0,'mana',['dm01-075','dm01-097',...Array(5).fill('dm01-108')]);give(s,0,'deck',['dm23bd4-008',...Array(6).fill('dm01-108')]);attack(s);act(s,'declareDDD');act(s,'orderEffect',a=>a.cardId===DREAM);act(s,'orderEffect',a=>a.cardId==='dm23bd4-008');act(s,'manaTop',a=>a.cardId==='dm01-075');act(s,'orderEffect',a=>a.cardId===DREAM);assert.equal(s.decision.type,'dddSummon');assert.ok(!getLegalActions(s).some(a=>a.kind==='summonDDD'));act(s,'skipDDDSummon');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.equal(s.players[0].hand[0].cardId,GG);
});
test('a card acquired after declaration timing cannot add a new DDD declaration to that attack',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'deck',[GG,'dm01-108']);attack(s);assert.equal(s.decision.type,'revealEvolution');s.players[0].hand.push(inst(GG));act(s,'revealEvolve',a=>!a.baseUid);drain(s);assert.equal(s.log.filter(e=>e.type==='dddDeclare').length,0);assert.ok(s.players[0].hand.some(x=>x.cardId===GG));
});
test('declared DDD still resolves after the attack target leaves, with no phantom continuation of the original attack',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'hand',[GG]);give(s,1,'battle',['dm01-075']);const target=s.players[1].battle[0];target.tapped=true;give(s,0,'deck',[ROD,'dm01-108','dm01-108']);attack(s,s.players[0].battle[0].uid,target.uid);act(s,'declareDDD');act(s,'orderEffect',a=>a.cardId===DREAM);act(s,'orderEffect',a=>a.cardId===ROD);act(s,'effect',a=>a.targets[0].uid===target.uid);assert.equal(s.attack,null);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===GG));assert.equal(s.players[1].shields.length,5);assert.ok(!s.log.some(e=>e.type==='battle'));
});
test('evolved GG suppresses enemy own entry effects including Rod while EX life still adds a shield',()=>{
 const s=setup();gg(s,1);const hand=s.players[0].hand.length;cast(s,ROD);assert.equal(s.players[0].shields.length,6);assert.ok(s.players[0].battle[0].exLifeShieldUid);assert.equal(s.players[1].entryLimitNextTurn,undefined);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,hand);assert.ok(s.log.some(e=>e.type==='triggerPrevented'&&e.cardId===ROD));assert.ok(!s.log.some(e=>e.type==='entryLimit'));
});
test('a normal GG has no suppression and a base card under GG contributes no entry or attack ability',()=>{
 const s=setup();gg(s,1,false);cast(s,KIRA);assert.ok(s.players[1].battle[0].tapped);assert.ok(!s.log.some(e=>e.type==='triggerPrevented'));const t=setup();const c=gg(t,0);c.under=[inst(DREAM)];attack(t,c.uid);assert.equal(t.decision.type,'block');assert.ok(!t.log.some(e=>e.type==='reveal'));
});
test('GG stops the entering Dream Dragons own trigger but preserves an existing Dream Dragons reaction to another dragon',()=>{
 const s=setup();gg(s,1);cast(s,DREAM);assert.equal(s.decision,null);assert.equal(s.log.filter(e=>e.type==='dragonTap').length,0);const own=s.players[0].battle[0];cast(s,'dm01-s08');assert.equal(s.decision.type,'dragonTap');act(s,'dragonTap');assert.ok(s.players[1].battle[0].tapped);assert.ok(s.players[0].battle.includes(own));
});
test('GG stops enemy Dream reveal and RS judge only at attack declaration, while ordinary attacks still proceed',()=>{
 for(const id of [DREAM,RS]){const s=setup();gg(s,1);give(s,0,'battle',[id]);const before=s.players[0].deck.length;attack(s);assert.equal(s.decision.type,'block');assert.equal(s.players[0].deck.length,before);assert.equal(s.judge,undefined);assert.ok(!s.log.some(e=>e.type==='reveal'||e.type==='judgeReveal'));act(s,'noBlock');drain(s);assert.ok(s.players[1].shields.length<5);}
});
test('a pending entry effect remains effective if GG becomes evolved after that ability already triggered',()=>{
 const s=setup();give(s,1,'battle',['dm01-075']);cast(s,ROD);assert.equal(s.decision.type,'effect');gg(s,1);act(s,'effect');assert.equal(s.players[1].entryLimitNextTurn,true);assert.ok(s.log.some(e=>e.type==='entryLimit'));
});
test('GG never suppresses hand DDD, spells or shield-entry reactions',()=>{
 const s=setup();gg(s,1);give(s,0,'battle',['dm01-108']);give(s,0,'hand',[GG]);attack(s);act(s,'declareDDD');act(s,'summonDDD',a=>!!a.baseUid);assert.ok(s.players[0].battle.some(x=>x.cardId===GG));
 const t=setup();gg(t,1);give(t,0,'battle',[Y]);cast(t,ROD);assert.equal(t.decision.effect,'shieldEntryTapLock');act(t,'effect');assert.ok(t.players[1].battle[0].tapLocks);cast(t,RS);assert.equal(t.decision,null);give(t,0,'hand',[RS]);act(t,'play',a=>a.face===1);drain(t);assert.ok(t.log.some(e=>e.type==='judgeResult'));assert.ok(t.log.some(e=>e.type==='charger'));
});
test('a four-break batch declares every S trigger before using any and resolves suppressed creature entries without their entry effects',()=>{
 const s=setup(),c=gg(s,0);give(s,1,'shields',[KIRA,KIRA,'dm01-108','dm01-108']);attack(s,c.uid);act(s,'noBlock');assert.equal(s.players[1].shields.length,0);act(s,'useTrigger');assert.equal(s.players[1].battle.length,0);act(s,'useTrigger');assert.equal(s.decision.type,'triggerOrder');act(s,'orderTrigger');assert.equal(s.players[1].battle.length,2);assert.ok(s.players[1].battle.every(x=>x.cardId===KIRA));assert.equal(s.metrics[1].triggers,2);assert.equal(s.log.filter(e=>e.type==='triggerPrevented').length,2);assert.ok(!s.log.some(e=>e.type==='effect'&&e.cardId===KIRA));
});
test('soul shield protection removes all bases from NEO GG, immediately switching off evolution and suppression',()=>{
 const s=setup(),c=gg(s,1);c.under=[inst(KIRA)];c.entered=s.turn;give(s,1,'shields',['dm01-108']);give(s,0,'battle',['dm01-108']);attack(s);act(s,'noBlock');assert.equal(s.decision.type,'shieldGuard');act(s,'guardShield');assert.equal(isEvolution(c),false);assert.equal(selfTriggersStopped(s,0),false);assert.equal(c.under,undefined);s.active=1;s.phase='attack';assert.ok(!getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid));s.active=0;s.phase='main';cast(s,KIRA);assert.ok(c.tapped);assert.equal(s.players[1].shields.length,1);
});
test('GG with an EX-life base keeps the association public, never gains the base protection, and whole-stack bounce conserves cards',()=>{
 const s=setup();cast(s,ROD);drain(s);const rod=s.players[0].battle[0],shield=rod.exLifeShieldUid;cast(s,GG);act(s,'evolve',a=>a.baseUid===rod.uid);const c=s.players[0].battle[0];s.active=1;cast(s,'dm01-086');act(s,'effect',a=>a.targets[0].uid===c.uid);assert.ok(s.players[0].hand.some(x=>x.cardId===GG));assert.ok(s.players[0].hand.some(x=>x.cardId===ROD));assert.ok(s.players[0].shields.some(x=>x.uid===shield));assert.equal(rod.exLifeShieldUid,undefined);
});
test('a pending RS attack judge completes before the remaining DDD, then evolves RS without replaying its attack ability',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,0,'hand',[GG]);give(s,0,'deck',[GG,'dm01-108','dm01-108']);give(s,1,'deck',['dm01-108','dm01-108']);attack(s);act(s,'declareDDD');act(s,'orderEffect',a=>a.cardId===RS);assert.equal(s.decision.type,'judgeContinue');assert.equal(s.players[0].hand[0].cardId,GG);act(s,'stopJudge');act(s,'judgeBreak');assert.equal(s.decision.type,'dddSummon');act(s,'summonDDD',a=>!!a.baseUid);assert.equal(s.decision.type,'block');assert.equal(s.log.filter(e=>e.type==='judgeResult').length,1);act(s,'noBlock');assert.equal(s.players[1].shields.length,0);
});
test('an already triggered RS attack judge still resolves after DDD evolves its source, then the continuing attack uses GG',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,0,'hand',[GG]);give(s,0,'deck',[GG,'dm01-108','dm01-108']);give(s,1,'deck',['dm01-108','dm01-108']);attack(s);act(s,'declareDDD');act(s,'orderEffect',a=>a.cardId===GG);act(s,'summonDDD',a=>!!a.baseUid);assert.equal(s.decision.type,'judgeContinue');assert.equal(s.players[0].battle[0].cardId,GG);act(s,'stopJudge');act(s,'judgeBreak');assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.players[1].shields.length,0);assert.equal(s.log.filter(e=>e.type==='judgeResult').length,1);
});
test('AI declaration, ordering and NEO choices are pure and independent of opponent hidden information',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'hand',[GG]);give(s,0,'deck',[ROD,'dm01-108','dm01-108']);attack(s);for(let n=0;n<30&&s.decision;n++){const before=structuredClone(s),choice=chooseAI(s);assert.deepEqual(s,before);s.players[1].deck.reverse();s.players[1].hand.forEach(x=>x.cardId=GG);s.players[1].shields.forEach(x=>x.cardId=KIRA);assert.deepEqual(chooseAI(s),choice);assert.ok(observation(s,0).players[1].hand.every(x=>x.hidden));step(s,choice);if(s.decision?.type==='block')break;}
});
test('mixed NEO/DDD games conserve all eighty unique cards through every action and finish with reproducible seeds',()=>{
 const deck={name:'NEO / DDD validation',format:'original',cards:[GG,DREAM,ROD,Y,KIRA,ONI,'dmx11-012','dm23bd4-008',RS,'dm01-075'].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let declarations=0,summons=0,suppressed=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?PRESETS[1]:deck],{seed:seed*127,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){assert.ok(getLegalActions(s).length);const before=structuredClone(s),a=chooseAI(s);assert.deepEqual(s,before);step(s,a);const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);declarations+=s.log.filter(e=>e.type==='dddDeclare').length;summons+=s.log.filter(e=>e.type==='dddSummon').length;suppressed+=s.log.filter(e=>e.type==='triggerPrevented').length;}
 assert.ok(declarations>0&&summons>0&&suppressed>0,{declarations,summons,suppressed});assert.deepEqual(runGame([deck,deck],{seed:1212}),runGame([deck,deck],{seed:1212}));
});

test('quadruple breaker caps at the shields left, never wins from excess breaks and can still be blocked',()=>{
 for(const block of [false,true]){const s=setup(),c=gg(s,0);give(s,1,'shields',Array(2).fill('dm01-108'));give(s,1,'battle',['dm01-084']);attack(s,c.uid);act(s,block?'block':'noBlock');assert.equal(s.players[1].shields.length,block?2:0);assert.equal(s.winner,null);}
});
test('GG leaves continuous Z rush and EX life replacement active, including the resulting shield-state change',()=>{
 const s=setup();gg(s,1);give(s,0,'battle',[Y]);cast(s,ROD);act(s,'effect');const rod=s.players[0].battle.find(x=>x.cardId===ROD),y=s.players[0].battle.find(x=>x.cardId===Y),shield=rod.exLifeShieldUid;s.active=1;cast(s,'dm01-086');act(s,'effect',a=>a.targets[0].uid===rod.uid);assert.ok(s.players[0].battle.includes(rod));assert.equal(rod.exLifeShieldUid,undefined);assert.ok(s.players[0].grave.some(x=>x.uid===shield));assert.equal(y.hyperActive,true);assert.ok(s.log.some(x=>x.type==='exLifeReplace'));assert.ok(s.log.some(x=>x.type==='hyper'));
});
test('DDD rejects fabricated or stale choices without mutating the state, including a base with the wrong civilization',()=>{
 const s=setup();give(s,0,'battle',['dm01-108','dm01-083']);give(s,0,'hand',[GG]);attack(s);act(s,'declareDDD');const a=getLegalActions(s).find(x=>x.kind==='summonDDD'&&x.baseUid),before=structuredClone(s);assert.throws(()=>step(s,{...a,baseUid:s.players[0].battle[1].uid}),/選択できない/);assert.deepEqual(s,before);act(s,'skipDDDSummon');const after=structuredClone(s);assert.throws(()=>step(s,a),/選択できない/);assert.deepEqual(s,after);
});
