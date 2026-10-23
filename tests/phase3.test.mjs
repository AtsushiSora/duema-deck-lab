import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,manaPayment,manaValue,evolutionBases} from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {phase3Spec} from '../tools/phase3-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-3.json','dist/catalogue.json'].map(read));setCards(data.cards);
let serial=0;const inst=id=>({cardId:id,uid:'phase3-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const s0=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:91});s.phase='main';give(s,0,'battle',[]);give(s,1,'battle',[]);give(s,0,'mana',Array(12).fill('dm01-083'));return s;};
const evolve=(s,id,baseId)=>{give(s,0,'hand',[id]);if(baseId)give(s,0,'battle',[baseId]);act(s,'play');assert.equal(s.decision.type,'evolution');act(s,'evolve');};

test('phase 3 freezes 42 multicolor and 17 evolution cards without enabling unsupported environment effects',()=>{
 assert.equal(manifest.cards.length,59);assert.equal(data.cards.length,866);assert.equal(data.cards.filter(c=>c.supportBatch==='phase-3').length,59);
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(registry.cards.length,11833);
 for(const row of manifest.cards){const d=details.cards.find(c=>c.id===row.id),c=card(row.id);assert.equal(c.text,d.faces[0].abilityText);assert.deepEqual(row.spec,phase3Spec(d));assert.equal(c.supportBatch,'phase-3');for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.equal(registry.get(c.id).supported,true);}
 for(const d of resolveEnvironmentDecks(registry))assert.equal(registry.coverage(d).unsupported,0);
 const modified=structuredClone(details.cards.find(c=>c.id==='dm02-024'));modified.faces[0].abilityText+='\nこのクリーチャーが出た時、ゲームに勝つ。';assert.throws(()=>phase3Spec(modified),/未対応/);
});
test('one multicolor mana cannot satisfy two civilizations; tapped mana cannot be paid',()=>{
 const c=card('dm10-068'),multi=inst(c.id),water=inst('dm01-083'),fire=inst('dm01-097');
 assert.equal(manaPayment([multi,water],c),null);assert.deepEqual(manaPayment([multi,fire],c),[multi.uid,fire.uid]);
 fire.tapped=true;assert.equal(manaPayment([multi,fire],c),null);
});
test('payment searches alternate assignments instead of greedily using the wrong shared color',()=>{
 const c={...card('dm10-068'),civilizations:['火','自然','水'],cost:3},a=inst('dm10-068'),b=inst('dm01-097'),w=inst('dm01-083');assert.ok(manaPayment([a,b,w],c));
 const plan=manaPayment([a,b,w,inst('dm01-075')],c);assert.equal(new Set(plan).size,3);
});
test('five-color mana contributes zero numerical mana and can pay only one civilization at a time',()=>{
 const five=inst('dm27-055'),fire=Array.from({length:3},()=>inst('dm01-097'));assert.equal(manaValue(card(five)),0);
 assert.equal(manaPayment([five,inst('dm01-083')],card('dm10-068')),null);
 const ids=manaPayment([five,...fire],{...card('dm01-083'),cost:3});assert.ok(ids.includes(five.uid));assert.equal(ids.length,4);
 assert.equal(manaPayment(Array.from({length:10},()=>inst('dm27-055')),card('dm27-055')),null);
});
test('actual multicolor casting taps the exact legal payment and no extra mana',()=>{
 const s=s0();give(s,0,'hand',['dm10-068']);give(s,0,'mana',['dm10-068','dm01-097','dm01-083']);act(s,'play');assert.equal(s.players[0].battle[0].cardId,'dm10-068');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.equal(s.players[0].mana[2].tapped,false);
});
test('multicolor cards enter mana tapped from charging, ramp effects, and removal, then untap on their turn',()=>{
 const s=s0();s.phase='charge';give(s,0,'hand',['dm10-068']);act(s,'charge');assert.equal(s.players[0].mana.at(-1).tapped,true);act(s,'toAttack');act(s,'endTurn');act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');assert.ok(s.players[0].mana.every(x=>!x.tapped));
 const t=s0();give(t,0,'mana',['dm01-108','dm01-108']);give(t,0,'hand',['dm06-110']);t.players[0].deck.unshift(inst('dm10-068'));act(t,'play');assert.equal(t.players[0].mana.at(-1).tapped,true);
 const u=s0();give(u,0,'mana',Array(6).fill('dm01-108'));give(u,0,'hand',['dm01-039']);give(u,1,'battle',['dm10-068']);act(u,'play');act(u,'effect');assert.equal(u.players[1].mana.at(-1).tapped,true);
});
test('evolution requires a matching owned top creature and cannot pay or play without a base',()=>{
 const s=s0();give(s,0,'hand',['dm02-024']);give(s,1,'battle',['dm01-084']);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'battle',['dm01-097']);assert.ok(!getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'battle',['dm01-084','dm01-080']);const mana=s.players[0].mana.filter(x=>x.tapped).length;act(s,'play');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);assert.equal(getLegalActions(s).filter(a=>a.kind==='evolve').length,2);act(s,'cancelEvolution');assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});
test('evolving keeps tap state and temporary effects, hides base abilities, and ignores summoning sickness',()=>{
 const s=s0();give(s,0,'battle',['dm01-084']);const base=s.players[0].battle[0];base.entered=s.turn;base.buff=2000;base.unblocked=true;evolve(s,'dm02-024');const top=s.players[0].battle[0];assert.equal(top.under[0].uid,base.uid);assert.equal(top.buff,2000);assert.equal(top.unblocked,true);assert.equal(card(top).blocker,undefined);act(s,'toAttack');assert.ok(getLegalActions(s).some(a=>a.kind==='attack'));
 const t=s0();give(t,0,'battle',['dm01-084']);t.players[0].battle[0].tapped=true;evolve(t,'dm02-024');act(t,'toAttack');assert.equal(t.players[0].battle[0].tapped,true);assert.ok(!getLegalActions(t).some(a=>a.kind==='attack'));
});
test('evolution chains move every physical card to hand, grave, or mana with independent state',()=>{
 for(const [spell,destination,mana]of [['dm01-086','hand','dm01-083'],['dm01-027','grave','dm01-090'],['dm01-039','mana','dm01-108']]){
  const s=s0();evolve(s,'dm10-017','dm01-084');evolve(s,'dm02-024');const top=s.players[0].battle[0],uids=[top.uid,top.under[0].uid,top.under[0].under[0].uid];give(s,1,'hand',[spell]);give(s,1,'mana',Array(7).fill(mana));s.active=1;s.phase='main';act(s,'play');act(s,'effect',a=>a.targets[0].player===0);assert.equal(s.players[0].battle.length,0);assert.deepEqual(s.players[0][destination].slice(-3).map(c=>c.uid),uids);assert.ok(s.players[0][destination].slice(-3).every(c=>!c.under&&!c.tapped&&c.buff===0));
 }
});
test('Crystal Paladin returns both sides blockers and their stacks without invoking base entry abilities',()=>{
 const s=s0();give(s,0,'battle',['dm01-084','dm01-079']);give(s,1,'battle',['dm01-084','dm01-097']);evolve(s,'dm02-s02');assert.deepEqual(s.players[0].battle.map(x=>x.cardId),['dm02-s02']);assert.deepEqual(s.players[1].battle.map(x=>x.cardId),['dm01-097']);assert.ok(s.players[0].hand.some(x=>x.cardId==='dm01-079'));assert.equal(s.players[1].hand.at(-1).cardId,'dm01-084');assert.equal(s.players[0].deck.length,30);
});
test('Dual Fang ramps two actual cards, respects tapped multicolor entry, and loses on library exhaustion',()=>{
 const s=s0();give(s,0,'mana',Array(6).fill('dm01-108'));s.players[0].deck.unshift(inst('dm10-068'),inst('dm01-097'));evolve(s,'dm02-s05','dm01-106');assert.equal(s.players[0].mana.at(-2).tapped,true);assert.equal(s.players[0].mana.at(-1).tapped,false);
 const t=s0();give(t,0,'mana',Array(6).fill('dm01-108'));t.players[0].deck=t.players[0].deck.slice(0,1);evolve(t,'dm02-s05','dm01-106');assert.equal(t.winner,1);
});
test('every added evolution has a supported base and can evolve using exactly that condition',()=>{
 for(const c of data.cards.filter(c=>c.supportBatch==='phase-3'&&c.evolution)){
  const s=s0();const base=data.cards.find(x=>{if(x.type!=='creature'||x.evolution)return false;give(s,0,'battle',[x.id]);return evolutionBases(s,0,c).length>0;});assert.ok(base,c.name);give(s,0,'battle',[base.id]);give(s,0,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108',...Array(10).fill('dm01-108')]);evolve(s,c.id);assert.ok(s.players[0].battle.some(x=>x.cardId===c.id),c.name);
 }
});
test('mixed multicolor/evolution games preserve all 80 physical cards, finish, and reproduce seeds',()=>{
 const water={name:'water evolution',format:'original',cards:['dm01-084','dm01-080','dm01-083','dm06-085','dm02-024','dm10-017','dm02-s02','dm14-s03','dm01-086','dm05-024'].map(id=>({id,count:4}))};
 const rainbow={name:'multicolor',format:'original',cards:['dm10-068','dmd01-002','dm10-064','dmr02-052','dm27-055','dm01-075','dm01-083','dm01-090','dm01-097','dm01-108'].map(id=>({id,count:4}))};
 for(const d of [water,rainbow])assert.deepEqual(validateDeck(d),[]);
 for(let seed=0;seed<24;seed++){const s=createGame([seed%2?rainbow:water,seed%2?water:rainbow],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){step(s,chooseAI(s));const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null);}
 assert.deepEqual(runGame([water,rainbow],{seed:791,first:1}),runGame([water,rainbow],{seed:791,first:1}));
});
test('payment matches an independent exhaustive subset and civilization-matching oracle',()=>{
 const ids=['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108','dm10-068','dm10-064','dm27-055'];let seed=710;
 const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const colors=c=>c.civilizations||c.civ.split('/');
 const oracle=(pool,c)=>{
  for(let mask=0;mask<(1<<pool.length);mask++){
   const chosen=pool.filter((_,i)=>mask>>i&1);if(chosen.some(x=>x.tapped)||chosen.reduce((n,x)=>n+manaValue(card(x)),0)!==c.cost)continue;
   const assign=(i,used)=>i===colors(c).length||chosen.some((x,j)=>!(used>>j&1)&&colors(card(x)).includes(colors(c)[i])&&assign(i+1,used|1<<j));
   if(assign(0,0))return true;
  }return false;
 };
 for(let i=0;i<160;i++){const pool=Array.from({length:7},()=>{const x=inst(ids[(rng()>>>16)%ids.length]);x.tapped=(rng()>>>16)%7===0;return x;}),c=card(['dm10-068','dm10-064','dm27-055','dm01-083'][(rng()>>>16)%4]);const paid=manaPayment(pool,c);assert.equal(paid!==null,oracle(pool,c));if(paid){assert.equal(new Set(paid).size,paid.length);assert.equal(pool.filter(x=>paid.includes(x.uid)).reduce((n,x)=>n+manaValue(card(x)),0),c.cost);}}
});
test('base replacement abilities are inactive underneath an evolution, even on destruction',()=>{
 const s=s0();evolve(s,'dm02-024','dm01-050');give(s,1,'hand',['dm01-027']);give(s,1,'mana',Array(6).fill('dm01-090'));s.active=1;s.phase='main';act(s,'play');act(s,'effect');assert.deepEqual(s.players[0].grave.slice(-2).map(x=>x.cardId),['dm02-024','dm01-050']);assert.ok(!s.players[0].hand.some(x=>x.cardId==='dm01-050'));
});
