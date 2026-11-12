import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const TREE='dm25rp2-053', SONG='dm25rp2-058', SEEK='dm25rp2-063', FAIRY='dm25rp1-029';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', GREEN='dm01-108';
const CADDY='dm22rp1-049';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function begin(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function summon(s,id,base){
 const x=begin(s,id);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Four complete official NEO definitions, base colors, images and deck limits',()=>{
 const m=read('tools/support-phase-1055.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 const baseColors=[[LIGHT,WATER,GREEN],[LIGHT,WATER,DARK],[WATER,DARK,FIRE],[LIGHT,WATER,GREEN]];
 assert.deepEqual(m.cards.map(x=>x.id),[TREE,SONG,SEEK,FAIRY]);
 assert.deepEqual(m.printAliases,[]);
 for(const [i,row] of m.cards.entries()){
  const c=e.card(row.id),f=row.faces[0];
  assert.equal(cat.get(row.id).id,row.id);
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[row.id]]);
  assert.deepEqual(c.neoEvolution.any,baseColors[i].map(id=>({civilization:e.civilizations(e.card(id))[0]})));
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1055}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

for(const id of [TREE,SONG,SEEK,FAIRY])test(id+' enters normally even with a legal base and leaves the effects idle',()=>{
 const s=field(),water=add(s,0,'battle',WATER),enemy=add(s,1,'battle',FIRE);
 const x=summon(s,id);
 assert.ok(live(s,0,'battle',water));
 assert.ok(!e.isEvolution(x)&&!enemy.tapped);
 assert.equal(s.decision,null);
 assert.deepEqual(['hand','deck','grave','shields'].map(z=>s.players[0][z].length),[0,12,0,5]);
});

test('Tree targets an already tapped opponent and locks its first start-step untap after restore',()=>{
 let s=field();
 const base=add(s,0,'battle',GREEN),ally=add(s,0,'battle',LIGHT),wrong=add(s,0,'battle',FIRE);
 const target=add(s,1,'battle',WATER,{tapped:true}),other=add(s,1,'battle',FIRE,{tapped:true});
 const tree=begin(s,TREE),before=physical(s);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[undefined,base.uid,ally.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(e.isEvolution(tree)&&live(s,0,'battle',wrong));
 assert.deepEqual(choices(s),[target.uid,other.uid]);
 s=restore(s);
 pick(s,target.uid);
 const locked=live(s,1,'battle',target);
 assert.ok(e.skipsStartUntap(s,locked));
 end(s);
 assert.ok(locked.tapped&&!live(s,1,'battle',other).tapped);
 end(s);
 end(s);
 assert.ok(!locked.tapped);
 assert.deepEqual(physical(s),before);
});

test('Tree taps from underneath a newly evolved creature, using the former source',()=>{
 const s=field(),base=add(s,0,'battle',TREE),enemy=add(s,1,'battle',FIRE);
 const host=summon(s,SONG,base);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===TREE);
 pick(s,enemy.uid);
 pick(s,0);
 assert.ok(host.under.some(x=>x.uid===base.uid));
 assert.ok(enemy.tapped&&e.skipsStartUntap(s,enemy));
});

test('Two Song effects can be ordered either way and resolve independently',()=>{
 for(const first of ['base','entrant']){
  const s=field(),base=add(s,0,'battle',SONG),top=s.players[0].deck[0];
  const host=summon(s,SONG,base),before=physical(s);
  assert.equal(s.decision.type,'effectOrder');
  assert.ok(host.under.includes(base));
  const entries=s.pendingEffects.filter(x=>x.source===SONG);
  assert.deepEqual(new Set(entries.map(x=>x.uid)),new Set([base.uid,host.uid]));
  act(s,'orderEffect',a=>entries.find(x=>x.effectId===a.effectId)?.uid===(first==='base'?base.uid:host.uid));
  pick(s,1);
  pick(s,0);
  assert.deepEqual(s.players[0].hand,[top]);
  assert.equal(s.players[0].deck.length,11);
  assert.deepEqual(physical(s),before);
 }
});

test('Sixfall moves Song under another creature, triggering it only under a NEO host',()=>{
 for(const hostId of [WATER,SONG]){
  let s=field();
  const source=add(s,0,'battle',SONG),host=add(s,0,'battle',hostId);
  const six=data.cards.find(c=>c.g35Role==='sixfall'),before=physical(s);
  assert.ok(six);
  s.extTasks=[{op:'g35_Custom',p:1,source:six.id,name:'sixfall',owner:0}];
  act(s,'toAttack');
  pick(s,host.uid);
  s=restore(s);
  pick(s,source.uid);
  if(hostId===SONG){
   assert.equal(s.decision.task.op,'g34_Draw');
   pick(s,1);
  }
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,hostId===SONG?1:0);
  assert.ok(live(s,0,'battle',host).under.some(y=>y.uid===source.uid));
  assert.deepEqual(physical(s),before);
 }
});

test('Seek can decline milling as an entrant and then mill two as the base',()=>{
 const s=field(),fire=add(s,0,'battle',FIRE),top=s.players[0].deck.slice(0,2);
 const seek=summon(s,SEEK,fire);
 pick(s,null);
 assert.ok(e.isEvolution(seek)&&e.effectiveCard(seek,s).noAttack);
 assert.equal(s.players[0].grave.length,0);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===seek.uid));
 s.phase='main';
 const song=summon(s,SONG,seek),before=physical(s);
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===SEEK);
 pick(s,true);
 pick(s,0);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),top.map(x=>x.uid));
 assert.ok(!e.effectiveCard(song,s).noAttack);
 assert.deepEqual(physical(s),before);
});

test('Seek also triggers when chosen as one of multiple Phoenix bases',()=>{
 const s=field(),seek=add(s,0,'battle',SEEK),fire=add(s,0,'battle',FIRE);
 const top=s.players[0].deck.slice(0,2);
 const phoenix=begin(s,'dm26ex5-S008'),before=physical(s);
 pick(s,seek.uid);
 pick(s,fire.uid);
 pick(s,null);
 assert.ok(live(s,0,'battle',phoenix).under.includes(seek));
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===SEEK);
 pick(s,true);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),top.map(x=>x.uid));
 assert.deepEqual(physical(s),before);
});

test('Fairy may use a Shield Trigger and choose whether to evolve and shield the top card',()=>{
 for(const mode of ['normal','evolve-and-decline','evolve-and-shield']){
  let s=field();
  const attacker=add(s,0,'battle',FIRE),base=add(s,1,'battle',GREEN);
  give(s,1,'shields',[FAIRY]);
  const shield=s.players[1].shields[0],top=s.players[1].deck[0],before=physical(s);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
  act(s,'useTrigger',a=>a.uid===shield.uid);
  s=restore(s);
  assert.equal(s.decision.player,1);
  act(s,'triggerEvolve',a=>a.baseUid===(mode==='normal'?undefined:base.uid));
  if(mode!=='normal')pick(s,mode==='evolve-and-shield'?true:null);
  assert.equal(s.decision,null);
  assert.equal(e.isEvolution(live(s,1,'battle',shield)),mode!=='normal');
  assert.equal(live(s,1,'shields',top)?.uid,mode==='evolve-and-shield'?top.uid:undefined);
  assert.ok(s.players[1].mana.every(x=>!x.tapped));
  assert.deepEqual(physical(s),before);
 }
});

test('Fairy makes a shield as an evolution base and remains quiet when Caddy replaces the entry',()=>{
 for(const replaced of [false,true]){
  const s=field(),base=add(s,0,'battle',FAIRY),top=s.players[0].deck[0];
  if(!replaced){
   summon(s,TREE,base);
   act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===FAIRY);
   pick(s,true);
   assert.ok(live(s,0,'shields',top));
  }else{
   add(s,1,'battle',CADDY);
   give(s,0,'mana',[LIGHT,WATER]);
   const card=add(s,0,'hand',TREE);
   s.extTasks=[{op:'g34_Put',p:0,source:FAIRY,origin:'hand',owner:0,target:card.uid,execution:false,controller:0}];
   act(s,'toAttack');
   if(s.decision)pick(s,base.uid);
   assert.ok(live(s,0,'mana',card)&&live(s,0,'battle',base));
   assert.ok(!live(s,0,'shields',top));
  }
  assert.equal(s.decision,null);
 }
});
