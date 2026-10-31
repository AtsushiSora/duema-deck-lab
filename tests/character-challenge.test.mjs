import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,drain}from'./target-fixture.mjs';import{createCatalogue}from'../dist/catalogue.js';
import{resolveHeroDecks,resolveRivalDecks,challengeOptions,recordHeroResult}from'../dist/hero-challenge.js';
import{resolveCharacterDecks,characterChallengeHTML}from'../dist/character-challenge.js';
import{CHARACTER_ERAS,EXTRA_CHARACTER_IDS,characterCleared,characterUnlockState,recordCharacterUnlocks,challengeKind}from'../dist/character-roster.js';
import{CHARACTER_PLANS}from'../dist/character-plans.js';import{CHALLENGER_IDS,heroCardRole,chooseHeroDraw}from'../dist/hero-draw.js';
import{manualScreenHTML,newManualUI}from'../dist/manual-ui.js';
const json=f=>JSON.parse(fs.readFileSync(new URL('../dist/'+f+'-decks.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details),manifest=json('character'),extras=resolveCharacterDecks(manifest,registry),decks=[...resolveHeroDecks(json('hero'),registry),...resolveRivalDecks(json('rival'),registry),...extras];
test('four complete generations contain 28 normal characters, eight bosses and distinct legal Original lists',()=>{
 assert.equal(decks.length,36);assert.equal(CHARACTER_ERAS.flatMap(e=>e.normal).length,28);assert.equal(CHARACTER_ERAS.flatMap(e=>e.bosses).length,8);assert.equal(new Set(CHALLENGER_IDS).size,36);assert.deepEqual(new Set(decks.map(d=>d.hero.id)),new Set(CHALLENGER_IDS));assert.deepEqual(new Set(extras.map(d=>d.hero.id)),new Set(EXTRA_CHARACTER_IDS));
 const signatures=new Set();for(const d of decks){assert.deepEqual(e.validateDeck(d),[],d.name);assert.equal(registry.coverage(d).unsupported,0,d.name);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);assert.equal(d.format,'original');assert.ok(d.hero.signature.every(id=>d.cards.some(r=>r.id===id&&r.count>0)));signatures.add(JSON.stringify([...d.cards].sort((a,b)=>a.id.localeCompare(b.id))));}assert.equal(signatures.size,36);
 for(const d of extras){const plan=CHARACTER_PLANS[d.hero.id];assert.ok(plan);for(const role of['setup','bridge','engine'])for(const id of plan[role]){assert.ok(d.cards.some(r=>r.id===id));assert.equal(heroCardRole(d.hero.id,id),role);}}
});
test('malformed, duplicate, unsupported or missing character data cannot become playable',()=>{
 for(const corrupt of[m=>m.characters.pop(),m=>m.characters[0].id='fake',m=>m.characters[0]=m.characters[1],m=>m.characters[0].cards[0].count=99,m=>m.characters[0].signature=['not-a-card'],m=>m.characters[0].boss=true,m=>m.characters[0].era='win',m=>m.characters[0].cards[0].id='unknown']){const m=structuredClone(manifest);corrupt(m);assert.throws(()=>resolveCharacterDecks(m,registry));}
});
test('legacy wins contribute to the matching era; losses, unfinished games and other eras do not unlock bosses',()=>{
 let p=recordHeroResult({},'shobu','old-win',0);p=recordHeroResult(p,'hakuoh','loss',1);assert.equal(characterUnlockState('zakira',{progress:p}).unlocked,false);assert.equal(characterUnlockState('zakira',{progress:p}).remaining.length,5);assert.equal(characterUnlockState('kurojo').unlocked,true);assert.equal(characterUnlockState('unknown').unlocked,false);
 for(const id of CHARACTER_ERAS[0].normal.slice(1))p=recordHeroResult(p,id,id,0);assert.equal(characterUnlockState('zakira',{progress:p}).unlocked,true);assert.equal(characterUnlockState('yomi',{progress:p}).unlocked,false);assert.equal(recordHeroResult(p,'kurojo','unfinished',null),p);assert.equal(recordHeroResult(p,'kurojo','kurojo',0),p);
});
test('each era independently unlocks all its bosses and persists permanently through losses, reloads and deck changes',()=>{
 let progress={},unlocks={};for(const era of CHARACTER_ERAS){for(const id of era.normal.slice(0,-1))progress=recordHeroResult(progress,id,id,0);assert.equal(characterUnlockState(era.bosses[0],{progress,unlocks}).unlocked,false);const last=era.normal.at(-1);progress=recordHeroResult(progress,last,last,0);unlocks=recordCharacterUnlocks(unlocks,progress);for(const boss of era.bosses)assert.equal(unlocks[boss],true);}
 assert.equal(Object.keys(unlocks).length,8);assert.equal(recordCharacterUnlocks(unlocks,progress),unlocks);const stored=JSON.parse(JSON.stringify({unlocks}));for(const era of CHARACTER_ERAS)for(const id of era.bosses)assert.equal(characterUnlockState(id,{unlocks:stored.unlocks,progress:{shobu:{wins:0,losses:9}}}).unlocked,true);
});
test('character-specific manual results recover prerequisites without borrowing composition-based wins',()=>{
 const era=CHARACTER_ERAS[2],manualResults=Object.fromEntries(era.normal.map(id=>['character:'+id,{wins:1,losses:0}]));assert.equal(characterUnlockState('zero',{manualResults}).unlocked,true);assert.equal(characterUnlockState('zero',{manualResults:{'deck-v1:fake':{wins:99}}}).unlocked,false);for(const value of[NaN,Infinity,-1,'1',0])assert.equal(characterCleared('joe',{joe:{wins:value}}),false);
});
test('era UI lists normal characters, remaining prerequisite names, locked starts, deck previews and clear marks',()=>{
 for(const era of CHARACTER_ERAS){let html=characterChallengeHTML(decks,era.id,{});assert.equal((html.match(/data-action="hero-start"/g)||[]).length,era.normal.length+era.bosses.length);assert.equal((html.match(/disabled/g)||[]).length,era.bosses.length);assert.ok(html.includes('あと<strong>'+era.normal.length+'人'));const progress=Object.fromEntries(era.normal.map(id=>[id,{wins:1,losses:2}]));html=characterChallengeHTML(decks,era.id,{progress});assert.ok(!html.includes('disabled'));assert.equal((html.match(/撃破済み/g)||[]).length,era.normal.length);assert.ok(html.includes('解放済み'));assert.equal((characterChallengeHTML(decks,era.id,{progress},{ready:false}).match(/disabled/g)||[]).length,era.normal.length+era.bosses.length);}
});
test('all added characters use the same CPU opening rules without extra cards, shields or human changes',()=>{
 for(const d of extras){const opts={seed:83,first:0},plain=e.createGame([PRESETS[0],d],opts),s=e.createGame([PRESETS[0],d],{...opts,challenge:challengeOptions(d)});assert.equal(s.challenge.heroId,d.hero.id);assert.deepEqual(s.players[0],plain.players[0]);assert.deepEqual(s.players[1].shields,plain.players[1].shields);assert.equal(s.players[1].hand.length,5);assert.equal(s.players[1].deck.length,30);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),e.physicalCards(plain).map(x=>x.uid).sort());}
});
test('new CPU draw scoring is deterministic, uses its own theme and does not mutate candidates',()=>{
 for(const d of extras){const rows=d.cards.map(r=>({id:r.id,uid:r.id,faces:[{...e.card(r.id),usable:true}]})),pos={heroId:d.hero.id,signature:d.hero.signature,mana:6,hand:[],battle:[],enemyBattle:[],shields:5,enemyShields:4},before=structuredClone(rows),choice=chooseHeroDraw(rows,pos);assert.ok(rows.some(r=>r.uid===choice));assert.equal(chooseHeroDraw(rows,pos),choice);assert.deepEqual(rows,before);}
});
test('new normal and boss matches have correct labels while old protagonist/rival labels remain compatible',()=>{
 for(const id of['shobu','hakuoh','kurojo','zakira']){const d=decks.find(d=>d.hero.id===id),s=e.createGame([PRESETS[0],d],{seed:7,challenge:challengeOptions(d)});s.winner=0;s.reason='決着';const html=manualScreenHTML(s,newManualUI(),{art:()=>'',icon:()=>'',displayCard:()=>''});assert.ok(html.includes(challengeKind(id)+'戦'));assert.ok(html.includes(challengeKind(id)+'撃破！'));}
});
test('Tenchi has a complete evolution-to-ultimate-to-MAX route using only his forty cards',()=>{
 const d=extras.find(d=>d.hero.id==='tenchi'),id=name=>data.cards.find(c=>c.name===name).id,s=setup();s.active=1;give(s,1,'battle',[id('とこしえの超人')]);const route=['大作家 シンボー','神羅ケンジ・キングダム','超神羅ギュンター・ペガサス'];give(s,1,'hand',route.map(id));for(const name of route){assert.ok(d.cards.some(r=>r.id===id(name)));act(s,'play',a=>a.cardId===id(name));drain(s);}assert.ok(s.players[1].battle.some(c=>c.cardId===id(route.at(-1))));
});
test('Hyde has a Cyber Lord base for Marco rather than an unusable evolution card',()=>{
 const d=extras.find(d=>d.hero.id==='hyde'),id=name=>data.cards.find(c=>c.name===name).id,s=setup();s.active=1;for(const name of['クゥリャン','エンペラー・マルコ'])assert.ok(d.cards.some(r=>r.id===id(name)));give(s,1,'battle',[id('クゥリャン')]);give(s,1,'hand',[id('エンペラー・マルコ')]);act(s,'play',a=>a.cardId===id('エンペラー・マルコ'));drain(s);assert.ok(s.players[1].battle.some(c=>c.cardId===id('エンペラー・マルコ')));
});
test('final Basara can prepare an invasion finisher before its printed mana cost',()=>{
 const cardId='dmr17-l02',rows=[{id:'dm01-108',uid:'ramp',faces:[{...e.card('dm01-108'),usable:false}]},{id:cardId,uid:'ace',faces:[{...e.card(cardId),usable:false}]}],position={heroId:'basara-final',signature:[cardId],mana:3,hand:[],battle:[{...e.card('dm26ex2-020'),tapped:false}],enemyBattle:[],shields:5,enemyShields:5};assert.equal(chooseHeroDraw(rows,position),'ace');
});
