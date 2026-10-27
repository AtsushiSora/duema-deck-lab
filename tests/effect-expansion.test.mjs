import {physicalCards} from '../dist/engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame} from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
const data=JSON.parse(await readFile(new URL('../dist/cards.json',import.meta.url),'utf8'));
const details=JSON.parse(await readFile(new URL('../dist/details.json',import.meta.url),'utf8'));
setCards(data.cards);
let serial=0;
const inst=id=>({cardId:id,uid:'expansion-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const action=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(x=>x.kind===kind&&predicate(x));assert.ok(a,kind);step(s,a);};
const setup=id=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:120});s.phase='main';give(s,0,'hand',[id]);give(s,0,'mana',Array.from({length:8},()=>id));give(s,0,'battle',[]);give(s,1,'battle',[]);return s;};

test('expansion adds nine fully handled abilities and fifty-one explicitly reviewed vanilla cards',()=>{
 const added=data.cards.filter(c=>c.supportBatch==='phase-1');assert.equal(added.length,60);assert.equal(added.filter(c=>c.supportKind==='effect').length,9);assert.equal(added.filter(c=>c.supportKind==='vanilla').length,51);assert.equal(data.cards.length,1625);
 for(const c of added){const d=details.cards.find(d=>d.id===c.id);assert.ok(d);assert.equal(d.faces.length,1);assert.equal(d.status,'complete');assert.equal(c.text,d.faces[0].abilityText||'能力なし');if(c.supportKind==='vanilla'){assert.equal(d.faces[0].abilityText,'');assert.equal(c.type,'creature');}}
 assert.ok(!data.cards.some(c=>c.name==='炎のたてがみ(バーニング・ヘアー)'));
});
test('unknown effects cannot silently load as cards with no working ability',()=>{
 assert.throws(()=>setCards([{...data.cards[0],effect:'notImplemented'}]),/未実装/);assert.equal(card(data.cards[0].id).name,data.cards[0].name);
});
test('Energy Light obligatorily draws two in order, and library exhaustion ends the game',()=>{
 const s=setup('dm06-085'),top=s.players[0].deck.slice(0,2).map(x=>x.uid);action(s,'play');assert.deepEqual(s.players[0].hand.map(x=>x.uid),top);assert.equal(s.players[0].deck.length,28);assert.equal(s.decision,null);
 const t=setup('dm06-085');t.players[0].deck=t.players[0].deck.slice(0,2);action(t,'play');assert.equal(t.winner,1);assert.equal(t.players[0].hand.length,2);
});
test('Demon Hand destroys tapped or untapped opposing creatures but excludes own creatures',()=>{
 const s=setup('dm01-027');give(s,0,'battle',['dm01-097']);give(s,1,'battle',['dm01-075','dm01-050']);s.players[1].battle[0].tapped=true;action(s,'play');assert.equal(getLegalActions(s).length,2);assert.ok(getLegalActions(s).every(a=>a.targets.every(t=>t.player===1)));action(s,'effect',a=>a.targets[0].uid===s.players[1].battle[0].uid);assert.equal(s.players[1].grave.at(-1).cardId,'dm01-075');
});
test('Natural Trap sends to mana instead of applying a replacement for destruction',()=>{
 const s=setup('dm01-039');give(s,1,'battle',['dm01-050']);const h=s.players[1].hand.length;action(s,'play');action(s,'effect');assert.equal(s.players[1].mana.at(-1).cardId,'dm01-050');assert.equal(s.players[1].mana.at(-1).tapped,false);assert.equal(s.players[1].hand.length,h);assert.equal(s.players[1].battle.length,0);
});
test('Holy Spark taps every opposing creature and leaves own creatures unchanged',()=>{
 const s=setup('dm01-015');give(s,0,'battle',['dm01-097']);give(s,1,'battle',['dm01-075','dm01-084']);action(s,'play');assert.ok(s.players[1].battle.every(x=>x.tapped));assert.ok(s.players[0].battle.every(x=>!x.tapped));assert.equal(s.decision,null);
});
test('Fairy Life ramps the actual top card and functions as a free shield trigger',()=>{
 const s=setup('dm06-110'),top=s.players[0].deck[0].uid;action(s,'play');assert.equal(s.players[0].mana.at(-1).uid,top);assert.equal(s.players[0].mana.at(-1).tapped,false);
 const t=createGame([PRESETS[0],PRESETS[1]],{seed:7});t.phase='attack';give(t,0,'battle',['dm01-097']);give(t,1,'battle',[]);give(t,1,'shields',['dm06-110']);const next=t.players[1].deck[0].uid;action(t,'attack');action(t,'noBlock');action(t,'useTrigger');assert.equal(t.players[1].mana.at(-1).uid,next);assert.equal(t.metrics[1].triggers,1);assert.equal(t.players[1].grave.at(-1).cardId,'dm06-110');
});
test('AI uses Fairy Life for early acceleration and avoids ramping its last library card',()=>{
 const s=setup('dm06-110');give(s,0,'mana',['dm06-110','dm06-110']);assert.equal(chooseAI(s).kind,'play');
 s.players[0].deck=s.players[0].deck.slice(0,1);assert.equal(chooseAI(s).kind,'toAttack');
});
test('Aqua Surfer has an optional entry effect including itself, and AI may decline',()=>{
 const s=setup('dm05-024');action(s,'play');assert.ok(getLegalActions(s).some(a=>a.kind==='skipEffect'));assert.ok(getLegalActions(s).some(a=>a.targets?.some(t=>t.player===0)));assert.equal(chooseAI(s).kind,'skipEffect');action(s,'skipEffect');assert.equal(s.players[0].battle.length,1);
 const t=setup('dm05-024');give(t,1,'battle',['dm01-075']);action(t,'play');action(t,'effect',a=>a.targets[0].player===1);assert.equal(t.players[1].hand.at(-1).cardId,'dm01-075');
 const u=setup('dm05-024');action(u,'play');action(u,'effect');assert.equal(u.players[0].hand[0].cardId,'dm05-024');assert.equal(u.players[0].battle.length,0);
});
test('Aqua Surfer triggers for free and resolves its optional return before play resumes',()=>{
 const s=createGame([PRESETS[0],PRESETS[1]],{seed:4});s.phase='attack';give(s,0,'battle',['dm01-097']);give(s,1,'battle',[]);give(s,1,'shields',['dm05-024']);action(s,'attack');action(s,'noBlock');action(s,'useTrigger');assert.equal(s.decision.player,1);action(s,'effect',a=>a.targets[0].player===0);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle[0].cardId,'dm05-024');assert.equal(s.players[1].mana.length,0);
});
test('Spiral Slider limits both sides to cost six or less and does not offer an optional skip',()=>{
 const seven={...card('dm17-048'),id:'fixture-seven',name:'コスト7検証用',cost:7};setCards([...data.cards,seven]);
 try{const s=setup('dmr07-043');give(s,0,'battle',['dm01-097']);give(s,1,'battle',['dm05-024','fixture-seven']);action(s,'play');const acts=getLegalActions(s);assert.ok(!acts.some(a=>a.kind==='skipEffect'));assert.equal(acts.length,2);assert.ok(acts.some(a=>a.targets[0].player===1));action(s,'effect',a=>a.targets[0].player===0);assert.equal(s.players[0].hand.at(-1).cardId,'dm01-097');}finally{setCards(data.cards);}
});
test('Lost Soul empties the opponent hand without affecting own remaining cards',()=>{
 const s=setup('dm02-029');give(s,0,'hand',['dm02-029','dm01-097']);const discarded=s.players[1].hand.map(c=>c.uid);action(s,'play');assert.equal(s.players[1].hand.length,0);assert.deepEqual(s.players[1].grave.map(c=>c.uid),discarded);assert.equal(s.players[0].hand[0].cardId,'dm01-097');
});
test('Speed attacker can attack on entry while ordinary creatures remain summoning sick',()=>{
 const s=setup('dm05-049');action(s,'play');action(s,'toAttack');assert.ok(getLegalActions(s).some(a=>a.kind==='attack'));
 const t=setup('dm10-076');action(t,'play');action(t,'toAttack');assert.ok(!getLegalActions(t).some(a=>a.kind==='attack'));
});
test('expanded-card games take legal actions, terminate, and conserve every physical card',()=>{
 const water={name:'追加効果検証',format:'original',cards:['dm06-085','dm05-024','dmr07-043','dm01-083','dm01-080','dm01-081','dm01-084','dm01-086','dm01-049','dm06-083'].map(id=>({id,count:4}))};
 const mixed={name:'追加効果混成',format:'original',cards:['dm06-110','dm01-027','dm01-039','dm01-015','dm02-029','dm05-049','dm01-097','dm01-108','dm01-106','dm10-076'].map(id=>({id,count:4}))};
 const decks=[water,mixed,...PRESETS];for(const d of decks)assert.deepEqual(validateDeck(d),[]);
 for(let i=0;i<decks.length;i++)for(let j=0;j<decks.length;j++)for(let seed=0;seed<12;seed++){
  const s=createGame([decks[i],decks[j]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(c=>c.uid)).size,80);}assert.notEqual(s.winner,null);
 }
 const options={seed:472,first:1};assert.deepEqual(runGame([water,mixed],options),runGame([water,mixed],options));
});
