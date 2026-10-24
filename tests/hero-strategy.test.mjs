import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,PRESETS,setup,give,inst} from './target-fixture.mjs';
import {chooseHeroOpening,heroCardRole,chooseHeroDraw} from '../dist/hero-draw.js';
const heroes=JSON.parse(fs.readFileSync(new URL('../dist/hero-decks.json',import.meta.url))).heroes;
const options=h=>({heroId:h.id,seat:1,signature:h.signature});
test('opening correction stays in the CPU non-shield pool and supplies an early route at five cards',()=>{
 for(const h of heroes)for(const seed of [1,17,103,702]){
  const d={name:h.name,cards:h.cards},plain=e.createGame([PRESETS[0],d],{seed}),s=e.createGame([PRESETS[0],d],{seed,challenge:options(h)});
  assert.deepEqual(s.players[0],plain.players[0]);assert.deepEqual(s.players[1].shields,plain.players[1].shields);
  assert.equal(s.players[1].hand.length,5);assert.equal(s.players[1].deck.length,30);
  assert.ok(s.players[1].hand.some(x=>heroCardRole(h.id,x.cardId)==='setup'));
  assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),e.physicalCards(plain).map(x=>x.uid).sort());
  assert.deepEqual(e.createGame([PRESETS[0],d],{seed,challenge:options(h)}),s);
 }
});
test('opening beam is bounded, pure and handles a small remaining pool',()=>{
 const c=(id,more={})=>({id,uid:id,faces:[{cost:2,type:'creature',civilizations:[],...more}]}),rows=[c('dmsd01-012'),c('a'),c('b')],copy=structuredClone(rows);
 assert.deepEqual(chooseHeroOpening(rows,'joe'),rows.map(x=>x.uid));assert.deepEqual(rows,copy);
 const pool=Array.from({length:35},(_,i)=>({...c(i===0?'dmsd01-012':'x'+i),uid:'u'+i})),selected=chooseHeroOpening(pool,'joe');assert.equal(selected.length,5);assert.equal(new Set(selected).size,5);assert.ok(selected.every(id=>pool.some(x=>x.uid===id)));
});
test('hero charges on turn one, preserves the sole early reducer and casts it on turn two',()=>{
 const s=setup();s.active=1;s.turn=1;s.phase='charge';s.challenge=options(heroes[2]);
 give(s,1,'mana',[]);give(s,1,'hand',['dmsd01-012','dmex12-s03','dm23ex2-017','dm24ex2-071','dmr10-039']);
 const a=e.chooseAI(s);assert.equal(a.kind,'charge');assert.notEqual(a.cardId,'dmsd01-012');e.step(s,a);
 s.phase='charge';s.turn=3;for(const x of s.players[1].mana)x.tapped=false;
 const b=e.chooseAI(s);assert.equal(b.kind,'charge');assert.notEqual(b.cardId,'dmsd01-012');e.step(s,b);
 assert.equal(e.chooseAI(s).cardId,'dmsd01-012');
});
test('hero planning uses only public enemy information and samples its own unknown cards',()=>{
 for(const h of heroes){const d={name:h.name,cards:h.cards},s=e.createGame([PRESETS[0],d],{seed:1701,first:1,challenge:options(h)}),before=structuredClone(s),a=e.analyzeAI(s),t=structuredClone(s);
  t.seed=93;t.rng=847;t.players[0].hand.forEach(x=>x.cardId='dm01-108');t.players[0].knownDeck=[{id:'dm01-108',count:40}];
  for(const p of t.players){p.deck.reverse();p.deck.forEach(x=>x.cardId='dm01-108');p.shields.forEach(x=>x.cardId='dm01-108');}
  assert.deepEqual(e.analyzeAI(t),a);assert.deepEqual(s,before);assert.ok(a.nodes<=80);assert.ok(e.getLegalActions(s).some(x=>x.id===a.action.id));
 }
});
test('hero stops returning Jokers once its Joragon payment is available',()=>{
 const s=setup();s.active=1;s.challenge=options(heroes[2]);give(s,1,'mana',Array(7).fill('dm01-108'));give(s,1,'battle',['dmsd01-012','dm24bd2-001']);give(s,1,'hand',['dmrp05-m02']);
 const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.alternative==='fifteenPhoto');assert.ok(a);e.step(s,a);assert.equal(s.decision.task.name,'alternative');
 const pick=e.chooseAI(s);assert.equal(s.decision.choices[pick.choice].value,null);e.step(s,pick);
 assert.ok(s.players[1].battle.some(x=>x.cardId==='dmsd01-012'));assert.ok(s.players[1].battle.some(x=>x.cardId==='dm24bd2-001'));
});
test('hero declines a redundant revolution that reduces its ready finisher damage',()=>{
 const s=setup();s.active=1;s.phase='attack';s.challenge=options(heroes[2]);give(s,1,'battle',['dm24bd2-001']);give(s,1,'hand',['dmex12-s03']);
 const source=s.players[1].hand[0],attacker=s.players[1].battle[0];s.attack={attacker:attacker.uid,target:'player',player:1};
 s.decision={type:'extended',player:1,source:source.cardId,task:{op:'revResolve',p:1,source:source.cardId,uid:source.uid,attacker:attacker.uid},choices:[{label:'入れ替える',value:attacker.uid,score:25,cardId:source.cardId},{label:'使わない',value:null,score:0}]};
 assert.equal(s.decision.choices[e.chooseAI(s).choice].value,null);
});
test('hero G Strike targets a ready threat instead of an already tapped larger creature',()=>{
 const s=setup();s.active=0;s.turn=6;s.challenge=options(heroes[3]);give(s,0,'battle',['dmc27-004','dm01-097']);s.players[0].battle[0].tapped=true;
 s.decision={type:'extended',player:1,source:'dmsd17-014',task:{op:'gsTarget',p:1,source:'dmsd17-014'},choices:[...s.players[0].battle.map(x=>({label:e.card(x).name,value:x.uid,score:e.card(x).cost,cardId:x.cardId})),{label:'選ばない',value:null,score:0}]};
 assert.equal(s.decision.choices[e.chooseAI(s).choice].value,s.players[0].battle[1].uid);
});
test('public attacking pressure increases the priority of playable defense',()=>{
 const c=(id,more)=>({id,uid:id,faces:[{cost:4,type:'creature',usable:true,...more}]}),blocker=c('guard',{blocker:true}),attacker=c('ace',{speedAttacker:true}),p={heroId:'win',mana:4,hand:[],battle:[],shields:4,enemyShields:5,enemyBattle:[{breaker:3},{breaker:2}]};
 assert.equal(chooseHeroDraw([attacker,blocker],p),'guard');
});
test('a finished normal or hero game has no next AI action',()=>{
 for(const challenge of [null,options(heroes[0])]){const s=setup();s.challenge=challenge;s.winner=0;assert.equal(e.chooseAI(s),null);}
});
