import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,getLegalActions,step,chooseAI,validateDeck,runGame,physicalCards,power} from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {simpleSpec,simpleFields} from '../tools/simple-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-4.json','dist/catalogue.json'].map(read));setCards(data.cards);
const added=data.cards.filter(c=>c.supportBatch==='phase-4');let serial=0;
const inst=id=>({cardId:id,uid:'simple-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const setup=()=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:41});s.phase='main';give(s,0,'battle',[]);give(s,1,'battle',[]);return s;};

test('phase 4 pins all fields of 245 simple creatures and keeps unsupported environment cards blocked',()=>{
 assert.equal(data.cards.length,1440);assert.equal(added.length,245);assert.equal(new Set(added.map(c=>c.id)).size,245);assert.equal(added.filter(c=>c.supportKind==='vanilla').length,121);assert.equal(added.filter(c=>c.attackBonus).length,47);assert.equal(added.filter(c=>c.trigger).length,84);
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(registry.cards.length,11833);assert.equal(registry.cards.filter(c=>!c.supported).length,registry.cards.length-data.cards.length);
 for(const row of manifest.cards){const d=details.cards.find(c=>c.id===row.id),c=card(row.id);assert.deepEqual(row.fields,simpleFields(d));assert.deepEqual(row.spec,simpleSpec(d));assert.equal(c.source,row.source);assert.equal(c.text,row.fields.abilityText);assert.equal(c.cost,row.fields.cost);assert.equal(c.power,Number(row.fields.powerText));assert.deepEqual(c.civilizations,row.fields.civilizations);for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.equal(registry.get(c.id).supported,true);}
 for(const d of resolveEnvironmentDecks(registry)){assert.equal(registry.coverage(d).unsupported,0);assert.equal(validateDeck(d).length>0,false);}
 for(const e of manifest.exclusions)assert.equal(card(e.id),undefined);
 assert.equal(data.supportExpansion.phase,77);assert.equal(data.supportExpansion.totalCount,data.cards.length);
});
test('simple verification rejects extra conditions, abilities, multiple power bonuses, evolution, and missing official fields',()=>{
 const original=details.cards.find(c=>c.id==='dm01-s08');
 for(const extra of ['\n自分のクリーチャーが３体以上あれば、カードを１枚引く。','\nG・ストライク','\nパワーアタッカー+1000']){const d=structuredClone(original);d.faces[0].abilityText+=extra;assert.throws(()=>simpleSpec(d));}
 const conditional=structuredClone(original);conditional.faces[0].abilityText='自分のシールドがなければ、パワーアタッカー+4000を得る。';assert.throws(()=>simpleSpec(conditional));
 for(const mutate of [d=>d.status='partial',d=>d.faces[0].typeText='進化クリーチャー',d=>d.faces[0].civilizations=['無色'],d=>d.faces[0].powerText='∞']){const d=structuredClone(original);mutate(d);assert.throws(()=>simpleSpec(d));}
});
test('every added creature can be summoned with exactly its printed cost and retains summoning sickness',()=>{
 for(const c of added){const s=setup();give(s,0,'hand',[c.id]);give(s,0,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108',...Array(9).fill('dm01-108')]);const before=s.players[0].deck.length;act(s,'play');assert.equal(s.players[0].battle[0].cardId,c.id,c.name);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,c.cost,c.name);assert.equal(s.players[0].deck.length,before);assert.equal(s.decision,null);act(s,'toAttack');assert.equal(getLegalActions(s).some(a=>a.kind==='attack'),!!c.speedAttacker&&!c.noAttack,c.name);}
});
test('every power attacker receives its exact bonus only when attacking, including temporary buffs',()=>{
 for(const c of added.filter(c=>c.attackBonus)){const x=inst(c.id);assert.equal(power(x),c.power,c.name);assert.equal(power(x,true),c.power+c.attackBonus,c.name);x.buff=2000;assert.equal(power(x),c.power);assert.equal(power(x,true),c.power+c.attackBonus+2000);}
});
test('Meteor Dragon defeats an 8000-power defender when attacking and loses when defending',()=>{
 const enemy=data.cards.find(c=>c.type==='creature'&&c.power===8000&&!c.slayer&&!c.afterBattleDie&&!c.death);
 assert.ok(enemy);
 const s=setup();s.phase='attack';give(s,0,'battle',['dm01-s08']);give(s,1,'battle',[enemy.id]);s.players[1].battle[0].tapped=true;act(s,'attack',a=>a.target!=='player');act(s,'noBlock');assert.equal(s.players[0].battle.length,1);assert.equal(s.players[1].battle.length,0);assert.ok(s.log.some(x=>x.type==='battle'&&x.text.includes('(10000)')));
 const t=setup();t.phase='attack';give(t,0,'battle',[enemy.id]);give(t,1,'battle',['dm01-s08']);t.players[1].battle[0].tapped=true;act(t,'attack',a=>a.target!=='player');act(t,'noBlock');assert.equal(t.players[0].battle.length,1);assert.equal(t.players[1].battle.length,0);assert.ok(t.log.some(x=>x.type==='battle'&&x.text.includes('メテオ・ドラゴン(6000)')));
});
test('all 84 trigger creatures offer free optional summoning; declining leaves the same card in hand',()=>{
 for(const c of added.filter(c=>c.trigger))for(const use of [true,false]){
  const s=setup();s.phase='attack';give(s,0,'battle',['dm01-097']);give(s,1,'shields',[c.id]);const uid=s.players[1].shields[0].uid;act(s,'attack');act(s,'noBlock');assert.equal(s.decision.type,'trigger',c.name);assert.equal(s.players[1].mana.length,0);assert.ok(getLegalActions(s).some(a=>a.kind==='useTrigger'));assert.ok(getLegalActions(s).some(a=>a.kind==='skipTrigger'));act(s,use?'useTrigger':'skipTrigger');assert.equal(s.players[1][use?'battle':'hand'].filter(x=>x.uid===uid).length,1,c.name);assert.equal(s.players[1][use?'hand':'battle'].some(x=>x.uid===uid),false);assert.equal(s.metrics[1].triggers,use?1:0);assert.equal(s.decision,null);if(use){assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.players[1].battle[0].entered,s.turn);}
 }
});
test('a newly triggered blocker can defend the next attack and uses its defensive power',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',['dm01-097','dm01-097']);give(s,1,'shields',['dmr22-067','dm01-075']);act(s,'attack',a=>a.shield===s.players[1].shields[0].uid);act(s,'noBlock');act(s,'useTrigger');const blocker=s.players[1].battle[0];assert.equal(power(blocker),card(blocker).power);act(s,'attack');assert.ok(getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));act(s,'block');assert.equal(s.players[1].shields.length,1);assert.ok(s.log.some(x=>x.type==='battle'&&x.text.includes('無頼護聖サソリスJr.('+card(blocker).power+')')));
});
test('all simple-card batches finish deterministically while preserving 80 distinct physical cards',()=>{
 const decks=Array.from({length:Math.ceil(added.length/10)},(_,i)=>({name:'simple '+i,format:'original',cards:[...added.slice(i*10,i*10+10).map(c=>c.id),...PRESETS[0].cards.map(c=>c.id)].slice(0,10).map(id=>({id,count:4}))}));
 for(const [i,deck]of decks.entries()){assert.deepEqual(validateDeck(deck),[]);for(let seed=1;seed<=6;seed++){const s=createGame([deck,seed%2?PRESETS[1]:decks[(i+7)%decks.length]],{seed,first:seed%2});while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);assert.ok(a);step(s,a);const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(c=>c.uid)).size,80);}assert.notEqual(s.winner,null);}}
 assert.deepEqual(runGame([decks[2],decks[9]],{seed:981}),runGame([decks[2],decks[9]],{seed:981}));
});
