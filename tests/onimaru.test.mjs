import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,observation,power,summonCost,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_TARGET,environmentSupport,resolveEnvironmentDecks} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-6.json','dist/catalogue.json'].map(read));setCards(data.cards);
const ONI='dm23ex3-S07';let serial=0;
const inst=id=>({cardId:id,uid:'onimaru-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:49});s.phase='main';give(s,0,'battle',[]);give(s,1,'battle',[]);give(s,0,'mana',Array(10).fill('dm01-097'));return s;};
const cast=(s,id=ONI)=>{give(s,0,'hand',[id]);act(s,'play');};
const combat=(attacker,defender,watchers=[])=>{const s=setup();s.phase='attack';give(s,0,'battle',[attacker,...watchers]);give(s,1,'battle',[defender]);s.players[1].battle[0].tapped=true;act(s,'attack',a=>a.target!=='player'&&a.uid===s.players[0].battle[0].uid);act(s,'noBlock');return s;};

test('Onimaru matches the complete official snapshot and preserves current target-deck coverage',()=>{
 assert.equal(ENGINE_VERSION,'0.43.0');assert.equal(data.cards.length,914);const c=card(ONI),d=details.cards.find(c=>c.id===ONI),row=manifest.cards[0];assert.equal(manifest.cards.length,1);assert.deepEqual(row.face,d.faces[0]);assert.equal(c.text,d.faces[0].abilityText);assert.equal(c.source,row.source);assert.equal(c.cost,6);assert.equal(c.power,6000);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);
 const registry=createCatalogue(snapshot,data.cards,details),decks=resolveEnvironmentDecks(registry),target=decks.find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);assert.equal(p.supportedCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.totalTypes,14);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));assert.equal(card('dmart26-003'),undefined);
});
test('cost reduction checks only the opponents multicolor mana, including tapped five-color mana',()=>{
 const s=setup(),c=card(ONI);assert.equal(summonCost(s,0,c),6);give(s,0,'mana',Array(3).fill('dm10-068'));assert.equal(summonCost(s,0,c),6);give(s,1,'hand',['dm10-068']);give(s,1,'battle',['dm10-068']);assert.equal(summonCost(s,0,c),6);give(s,1,'mana',['dm01-097','dm01-108']);assert.equal(summonCost(s,0,c),6);give(s,1,'mana',['dm27-055']);s.players[1].mana[0].tapped=true;assert.equal(summonCost(s,0,c),3);s.players[1].grave.push(...s.players[1].mana.splice(0));assert.equal(summonCost(s,0,c),6);assert.equal(c.cost,6);
 assert.throws(()=>setCards([{...c,costReduction:'unimplemented'}]),/未実装/);assert.equal(card(ONI).cost,6);
});
test('actual summoning pays three only when the condition holds, still needs fire, and retains printed cost',()=>{
 const s=setup();give(s,0,'hand',[ONI]);give(s,0,'mana',Array(3).fill('dm01-097'));assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,1,'mana',['dm10-068']);assert.equal(getLegalActions(s).find(a=>a.kind==='play').cost,3);act(s,'play');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);assert.equal(card(s.players[0].battle[0]).cost,6);assert.match(s.log.at(-1).text,/支払い3マナ \/ 元のコスト6/);
 const t=setup();give(t,0,'hand',[ONI]);give(t,0,'mana',Array(3).fill('dm01-108'));give(t,1,'mana',['dm10-068']);assert.ok(!getLegalActions(t).some(a=>a.kind==='play'));
 const u=setup();cast(u);assert.equal(u.players[0].mana.filter(x=>x.tapped).length,6);
});
test('own-turn power is 10000 for attacks and effect battles, and immediately becomes 6000 on the other turn',()=>{
 const s=setup();give(s,0,'battle',[ONI]);const x=s.players[0].battle[0];assert.equal(power(x,false,s),10000);assert.equal(power(x,true,s),10000);x.buff=2000;assert.equal(power(x,false,s),10000);assert.equal(power(x,true,s),12000);act(s,'toAttack');act(s,'endTurn');assert.equal(power(x,false,s),6000);assert.equal(power(x,true,s),6000);assert.equal(power(x,false,observation(s,1)),6000);
 give(s,1,'battle',[ONI]);assert.equal(power(s.players[1].battle[0],false,s),10000);
});
test('entry battle may be declined and cannot target an owned creature or a hidden card',()=>{
 const s=setup();give(s,0,'battle',['dm01-097']);give(s,1,'battle',['dm01-075','dm01-108']);cast(s);assert.equal(s.decision.type,'fight');const fights=getLegalActions(s).filter(a=>a.kind==='fight');assert.equal(fights.length,2);assert.ok(fights.every(a=>s.players[1].battle.some(x=>x.uid===a.target)));assert.throws(()=>step(s,{...fights[0],target:s.players[0].battle[0].uid}),/選択/);act(s,'skipFight');assert.equal(s.players[1].battle.length,2);assert.equal(s.players[0].battle.length,2);assert.equal(s.decision,null);
 const t=setup();cast(t);assert.equal(t.decision,null);
});
test('entry battle can select an untapped opponent, does not attack or tap, and offers a separate optional draw',()=>{
 const s=setup();give(s,1,'battle',['dm01-s08']);cast(s);const x=s.players[0].battle[0],hand=s.players[0].hand.length,shields=s.players[1].shields.length;act(s,'fight');assert.equal(s.players[1].battle.length,0);assert.equal(x.tapped,false);assert.equal(s.phase,'main');assert.equal(s.players[1].shields.length,shields);assert.equal(s.attack,undefined);assert.equal(s.decision.type,'draw');assert.equal(s.decision.reason,'battleWin');assert.equal(s.decision.max,1);assert.ok(s.log.some(e=>e.type==='battle'&&e.text.includes('(10000)')&&e.text.includes('メテオ・ドラゴン(6000)')));act(s,'draw',a=>a.n===1);assert.equal(s.players[0].hand.length,hand+1);assert.equal(s.decision,null);act(s,'toAttack');assert.ok(getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});
test('losing and tied entry battles do not trigger victory draw, and the losing creature actually leaves',()=>{
 for(const targetPower of [10000,11000]){const enemy=data.cards.find(c=>c.type==='creature'&&c.power===targetPower&&!c.ownTurnBonus&&!c.death&&!c.slayer);assert.ok(enemy);const s=setup();give(s,1,'battle',[enemy.id]);cast(s);act(s,'fight');assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle.length,targetPower===10000?0:1);assert.equal(s.decision,null);assert.ok(!s.log.some(x=>x.type==='battleWin'));}
});
test('victory by any other owned creature offers draw; defeat and ties do not',()=>{
 const winner=data.cards.find(c=>c.type==='creature'&&c.power===8000&&!c.noAttack&&!c.noPlayerAttack&&!c.afterBattleDie&&!c.slayer);
 const s=combat(winner.id,'dm01-075',[ONI]);assert.equal(s.decision.reason,'battleWin');const before=s.players[0].deck.length;act(s,'draw',a=>a.n===0);assert.equal(s.players[0].deck.length,before);assert.equal(s.decision,null);
 const t=combat('dm01-097','dm01-075',[ONI]);assert.equal(t.decision,null);const u=combat('dm01-075','dm01-075',[ONI]);assert.equal(u.decision,null);
});
test('defensive victory triggers for the non-active player with 6000 power',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',['dm01-075']);give(s,1,'battle',[ONI]);s.players[1].battle[0].tapped=true;act(s,'attack',a=>a.target!=='player');act(s,'noBlock');assert.equal(s.decision.player,1);assert.equal(s.decision.reason,'battleWin');assert.ok(s.log.some(e=>e.type==='battle'&&e.text.includes('鬼丸「終斗」(6000)')));const before=s.players[1].hand.length;act(s,'draw',a=>a.n===1);assert.equal(s.players[1].hand.length,before+1);assert.equal(s.active,0);
});
test('multiple Onimaru copies each trigger once, with individually chosen order and draw/decline decisions',()=>{
 const s=combat(ONI,'dm01-075',[ONI,ONI]);assert.equal(s.decision.type,'battleWinOrder');assert.equal(getLegalActions(s).length,3);const chosen=getLegalActions(s)[2].uid;act(s,'battleWinOrder',a=>a.uid===chosen);assert.equal(s.decision.reason,'battleWin');act(s,'draw',a=>a.n===0);assert.equal(s.decision.type,'battleWinOrder');assert.ok(!getLegalActions(s).some(a=>a.uid===chosen));const before=s.players[0].hand.length;act(s,'battleWinOrder');act(s,'draw',a=>a.n===1);assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===1);assert.equal(s.players[0].hand.length,before+2);assert.equal(s.decision,null);assert.equal(s.battleResolution,null);
});
test('victory draw resolves before Slayer, including when the winning Onimaru will be destroyed',()=>{
 const slayer=data.cards.find(c=>c.type==='creature'&&c.slayer&&c.power<6000&&!c.death),s=setup();give(s,1,'battle',[slayer.id]);cast(s);const uid=s.players[0].battle[0].uid;act(s,'fight');assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.equal(s.players[1].battle.length,0);assert.equal(s.decision.type,'draw');assert.ok(!s.log.some(x=>x.type==='afterBattle'));act(s,'draw',a=>a.n===1);assert.ok(!s.players[0].battle.some(x=>x.uid===uid));assert.ok(s.players[0].grave.some(x=>x.uid===uid));const drawIndex=s.log.findIndex(x=>x.type==='draw'),afterIndex=s.log.findIndex(x=>x.type==='afterBattle');assert.ok(drawIndex>=0&&drawIndex<afterIndex);
});
test('Bloody Squito self-destruction also waits until victory draw has finished',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',['dm01-075']);give(s,1,'battle',['dm01-089',ONI]);act(s,'attack');act(s,'block',a=>a.uid===s.players[1].battle[0].uid);assert.equal(s.decision.player,1);assert.equal(s.decision.type,'draw');assert.ok(s.players[1].battle.some(x=>x.cardId==='dm01-089'));act(s,'draw',a=>a.n===0);assert.ok(!s.players[1].battle.some(x=>x.cardId==='dm01-089'));assert.equal(s.battleResolution,null);
});
test('drawing the last library card ends the game before Slayer or any further victory draws',()=>{
 const slayer=data.cards.find(c=>c.type==='creature'&&c.slayer&&c.power<6000&&!c.death),s=setup();give(s,0,'deck',['dm01-108']);give(s,1,'battle',[slayer.id]);cast(s);act(s,'fight');act(s,'draw',a=>a.n===1);assert.equal(s.winner,1);assert.equal(s.players[0].battle.length,1);assert.ok(!s.log.some(x=>x.type==='afterBattle'));assert.deepEqual(getLegalActions(s),[]);
});
test('base Onimaru loses its continuous power and victory ability when covered by evolution',()=>{
 const s=setup();give(s,0,'battle',[ONI]);give(s,1,'battle',['dm01-075']);cast(s,'sp-020');act(s,'evolve');const top=s.players[0].battle[0];assert.equal(top.under[0].cardId,ONI);assert.equal(power(top,false,s),12000);s.players[1].battle[0].tapped=true;act(s,'toAttack');act(s,'attack',a=>a.target!=='player');act(s,'noBlock');assert.equal(s.decision,null);assert.ok(!s.log.some(x=>x.type==='battleWin'));
});
test('AI uses public power and mana and never hidden hand, library order, or shield identity',()=>{
 const s=setup();give(s,1,'battle',['dm01-075']);cast(s);assert.equal(chooseAI(s).kind,'fight');const chosen=chooseAI(s);s.players[0].deck.reverse();s.players[1].deck.reverse();s.players[1].hand.forEach(x=>x.cardId=ONI);s.players[0].shields.forEach(x=>x.cardId=ONI);assert.deepEqual(chooseAI(s),chosen);
 const stronger=data.cards.find(c=>c.type==='creature'&&c.power>10000&&!c.ownTurnBonus&&!c.slayer);const t=setup();give(t,1,'battle',[stronger.id]);cast(t);assert.equal(chooseAI(t).kind,'skipFight');
});
test('mixed Onimaru/dragon games finish reproducibly and conserve all 80 physical cards after every action',()=>{
 const deck={name:'Onimaru foundations',format:'original',cards:[ONI,'dmx11-012','dm23bd4-008','dm25sp2-014','sp-020','dm01-s08','dm01-s10','dm06-108','dm01-075','dmr22-067'].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);let fights=0,wins=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?deck:PRESETS[0]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);fights+=s.log.filter(x=>x.type==='fight').length;wins+=s.log.filter(x=>x.type==='battleWin').length;}
 assert.ok(fights>0);assert.ok(wins>0);assert.deepEqual(runGame([deck,PRESETS[1]],{seed:648}),runGame([deck,PRESETS[1]],{seed:648}));
});
