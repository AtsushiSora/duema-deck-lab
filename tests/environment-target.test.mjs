import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,observation,isDragon,evolutionBases,ENGINE_VERSION} from '../dist/engine.js';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_TARGET,environmentSupport,resolveEnvironmentDecks} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-5.json','dist/catalogue.json'].map(read));setCards(data.cards);
let serial=0;const inst=id=>({cardId:id,uid:'target-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:49});s.phase='main';give(s,0,'battle',[]);give(s,1,'battle',[]);give(s,0,'mana',['dm01-075','dm01-097','dm01-108',...Array(9).fill('dm01-108')]);return s;};
const cast=(s,id)=>{give(s,0,'hand',[id]);act(s,'play');};

test('four fully pinned cards retain their fields while the unchanged tournament list retains its current progress',()=>{
 assert.equal(ENGINE_VERSION,'0.25.0');assert.equal(data.cards.length,732);assert.equal(manifest.cards.length,4);assert.equal(data.supportExpansion.phase,26);
 const registry=createCatalogue(snapshot,data.cards,details),decks=resolveEnvironmentDecks(registry),target=decks.find(d=>d.id===ENVIRONMENT_TARGET),p=environmentSupport(target,registry);
 assert.equal(p.supportedCopies,40);assert.equal(p.totalCopies,40);assert.equal(p.supportedTypes,14);assert.equal(p.totalTypes,14);assert.equal(p.unsupported.reduce((n,r)=>n+r.count,0),0);assert.deepEqual(validateDeck(target),[]);assert.doesNotThrow(()=>createGame([target,PRESETS[0]]));
 for(const row of manifest.cards){const d=details.cards.find(c=>c.id===row.id),c=card(row.id);assert.deepEqual(row.face,d.faces[0]);assert.equal(row.name,c.name);assert.equal(row.source,c.source);assert.equal(c.text,row.face.abilityText);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.equal(c.supportBatch,'phase-5');}
 for(const d of decks.filter(d=>d.id!==ENVIRONMENT_TARGET))assert.equal(environmentSupport(d,registry).supportedCopies,40);
});
test('dragon category checks creature race rather than name, flavor text, or civilization',()=>{
 for(const id of ['dm01-s08','dm23bd4-008','dm25sp2-014','sp-020'])assert.equal(isDragon(card(id)),true);
 for(const id of ['dm01-097','dmx11-012','dm01-108'])assert.equal(isDragon(card(id)),false);
 assert.equal(isDragon({type:'creature',name:'ドラゴン',race:'ヒューマノイド'}),false);assert.equal(isDragon({type:'spell',race:'アーマード・ドラゴン'}),false);
});
test('Mendelssohn reveals the actual top two and puts only dragons into mana, always tapped',()=>{
 for(const top of [['dm01-s08','dm25sp2-014'],['dm01-s08','dm01-097'],['dm01-097','dm25sp2-014'],['dm01-097','dm01-108']]){
  const s=setup(),deck=s.players[0].deck;give(s,0,'deck',[...top,'dm01-108','dm01-108']);give(s,0,'mana',['dm01-097','dm01-108']);const expected=top.filter(id=>isDragon(card(id)));cast(s,'dmx11-012');assert.equal(s.players[0].deck.length,2);assert.deepEqual(s.players[0].mana.slice(2).map(x=>x.cardId),expected);assert.ok(s.players[0].mana.every(x=>x.tapped));assert.deepEqual(s.players[0].grave.map(x=>x.cardId),[...top.filter(id=>!isDragon(card(id))),'dmx11-012']);assert.ok(s.log.some(x=>x.type==='reveal'&&top.every(id=>x.text.includes(card(id).name))));assert.equal(s.decision,null);assert.equal(s.winner,null);
 }
});
test('Mendelssohn loses immediately on a one- or two-card library regardless of dragon hits',()=>{
 for(const ids of [['dm01-s08'],['dm01-097'],['dm01-s08','dm01-097']]){const s=setup();give(s,0,'deck',ids);cast(s,'dmx11-012');assert.equal(s.winner,1);assert.deepEqual(getLegalActions(s),[]);assert.equal(s.players[0].mana.length,12+ids.filter(id=>isDragon(card(id))).length);}
});
test('Lupia Turn moves two cards tapped and must return one from the entire mana zone, including old untapped mana',()=>{
 const s=setup();give(s,0,'deck',['dm01-s08','dm01-097','dm01-108']);cast(s,'dm23bd4-008');assert.equal(s.decision.type,'manaTop');assert.equal(s.decision.count,1);assert.equal(s.players[0].mana.length,14);assert.ok(s.players[0].mana.slice(-2).every(x=>x.tapped));assert.equal(getLegalActions(s).length,14);assert.ok(!getLegalActions(s).some(a=>a.kind==='skipEffect'));
 const old=s.players[0].mana.find(x=>!x.tapped),uid=old.uid;act(s,'manaTop',a=>a.uid===uid);assert.equal(s.players[0].deck[0].uid,uid);assert.equal(s.players[0].deck[0].tapped,false);assert.equal(s.players[0].mana.length,13);assert.equal(s.decision,null);
});
test('Lupia Turn may return a just-ramped card and cannot save itself from an empty library',()=>{
 const s=setup();give(s,0,'deck',['dm01-s08','dm01-097','dm01-108']);cast(s,'dm23bd4-008');const x=s.players[0].mana.at(-1);act(s,'manaTop',a=>a.uid===x.uid);assert.equal(s.players[0].deck[0].uid,x.uid);
 const t=setup();give(t,0,'deck',['dm01-s08','dm01-097']);cast(t,'dm23bd4-008');assert.equal(t.winner,1);assert.equal(t.decision,null);assert.equal(t.players[0].mana.length,14);assert.equal(t.players[0].deck.length,0);
});
test('Marron offers a true decline without revealing, moving mana, or changing deck order',()=>{
 const s=setup();const uids=s.players[0].deck.map(x=>x.uid),mana=s.players[0].mana.map(x=>x.uid);cast(s,'dm25sp2-014');assert.equal(s.decision.type,'optionalRamp');assert.deepEqual(getLegalActions(s).map(a=>a.kind),['useRamp','skipRamp']);act(s,'skipRamp');assert.deepEqual(s.players[0].deck.map(x=>x.uid),uids);assert.deepEqual(s.players[0].mana.map(x=>x.uid),mana);assert.equal(s.players[0].battle[0].cardId,'dm25sp2-014');assert.equal(s.decision,null);
});
test('Marron moves four at once, then commits two distinct mana cards in the selected top-to-bottom order',()=>{
 const s=setup();give(s,0,'deck',['dm01-s08','dm01-097','dm01-108','dm25sp2-014','dm01-083']);cast(s,'dm25sp2-014');act(s,'useRamp');assert.equal(s.players[0].mana.length,16);assert.ok(s.players[0].mana.slice(-4).every(x=>x.tapped));assert.equal(s.players[0].deck.length,1);assert.equal(s.decision.count,2);
 const first=s.players[0].mana[3],second=s.players[0].mana.at(-1),before=s.players[0].deck[0].uid;act(s,'manaTop',a=>a.uid===first.uid);assert.equal(s.players[0].mana.length,16);assert.equal(s.players[0].deck.length,1);assert.ok(!getLegalActions(s).some(a=>a.uid===first.uid));act(s,'manaTop',a=>a.uid===second.uid);assert.deepEqual(s.players[0].deck.map(x=>x.uid),[first.uid,second.uid,before]);assert.equal(s.players[0].mana.length,14);assert.equal(s.decision,null);assert.match(s.log.at(-1).text,/順序は非公開/);assert.ok(!s.log.at(-1).text.includes(card(first).name));
 // The next normal draw uses exactly the chosen first card.
 act(s,'toAttack');act(s,'endTurn');act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');assert.equal(s.players[0].hand.at(-1).uid,first.uid);
});
test('Marron cannot choose fewer than four to ramp and loses before returning mana if the library empties',()=>{
 for(const n of [1,3,4]){const s=setup();give(s,0,'deck',Array(n).fill('dm01-s08'));cast(s,'dm25sp2-014');act(s,'useRamp');assert.equal(s.winner,1);assert.equal(s.players[0].mana.length,12+n);assert.equal(s.players[0].deck.length,0);assert.equal(s.decision,null);}
});
test('Bajulaz Terra requires a dragon base and removes all non-dragon mana from both players',()=>{
 const s=setup();give(s,0,'hand',['sp-020']);give(s,0,'battle',['dm01-097']);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'battle',['dm01-s08']);assert.equal(evolutionBases(s,0,card('sp-020')).length,1);give(s,1,'mana',['dm25sp2-014','dm01-097','dmx11-012','sp-020']);s.players[1].mana[0].tapped=true;act(s,'play');act(s,'evolve');assert.equal(s.players[0].mana.length,0);assert.deepEqual(s.players[1].mana.map(x=>x.cardId),['dm25sp2-014','sp-020']);assert.equal(s.players[1].mana[0].tapped,true);assert.deepEqual(s.players[1].grave.map(x=>x.cardId),['dm01-097','dmx11-012']);assert.equal(s.players[0].battle[0].under[0].cardId,'dm01-s08');act(s,'toAttack');assert.ok(getLegalActions(s).some(a=>a.kind==='attack'&&a.label.includes('3枚')));
});
test('Bajulaz Terra mana movement ignores creature death replacement abilities',()=>{
 const s=setup();give(s,0,'battle',['dm01-s08']);give(s,1,'mana',['dm01-050','dm01-105']);cast(s,'sp-020');act(s,'evolve');assert.equal(s.players[1].mana.length,0);assert.deepEqual(s.players[1].grave.map(x=>x.cardId),['dm01-050','dm01-105']);
});
test('AI handles mana choices and ramp without looking at hidden library, hand, or shields',()=>{
 const s=setup();give(s,0,'mana',['dm01-075','dm01-097','dm01-108','dm01-108','dm01-108']);cast(s,'dm25sp2-014');assert.equal(chooseAI(s).kind,'useRamp');give(s,0,'deck',Array(4).fill('dm01-s08'));assert.equal(chooseAI(s).kind,'skipRamp');
 const t=setup();cast(t,'dm23bd4-008');const a=chooseAI(t);t.players[0].deck.reverse();t.players[1].deck.reverse();t.players[1].hand.forEach(x=>x.cardId='sp-020');t.players[0].shields.reverse();assert.deepEqual(chooseAI(t),a);const v=observation(t,0);assert.ok(!('deck'in v.players[0]));assert.ok(!('chosen'in v.decision));assert.ok(v.players[1].hand.every(x=>x.hidden&&!x.cardId));
});
test('mana-order choices scale linearly with many mana cards and reject stale or duplicate selections',()=>{
 const s=setup();give(s,0,'mana',Array.from({length:50},()=> 'dm25sp2-014'));cast(s,'dm25sp2-014');act(s,'useRamp');assert.equal(getLegalActions(s).length,54);const first=getLegalActions(s)[0];step(s,first);assert.equal(getLegalActions(s).length,53);assert.throws(()=>step(s,first),/選択/);act(s,'manaTop');assert.equal(s.decision,null);
});
test('mixed dragon practice games preserve 80 unique cards through every movement and replay deterministically',()=>{
 const deck={name:'target foundations',format:'original',cards:['dmx11-012','dm23bd4-008','dm25sp2-014','sp-020','dm01-s08','dm01-s10','dm09-053','dm06-108','dm01-075','dmr22-067'].map(id=>({id,count:4}))};assert.deepEqual(validateDeck(deck),[]);
 let choices=0,purges=0,reveals=0;
 for(let seed=1;seed<=100;seed++){const s=createGame([deck,seed%2?deck:PRESETS[0]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){if(s.decision?.type==='manaTop')choices++;step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);purges+=s.log.filter(x=>x.type==='manaLeave').length;reveals+=s.log.filter(x=>x.type==='reveal').length;}
 assert.ok(choices>0);assert.ok(purges>0);assert.ok(reveals>0);assert.deepEqual(runGame([deck,PRESETS[0]],{seed:293}),runGame([deck,PRESETS[0]],{seed:293}));
});
