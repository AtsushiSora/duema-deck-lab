import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const HIME='dm25rp4-051',SCHOPEN='dmsp01-004',TENSAY='dm25rp2-050';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108',LIGHT='dm01-075';
const GG='dm25rp3-S09',DARK_NEO='dm25rp4-064',DARK_EVO='dmx20-003';
const SEED='dmsd20-015',APUL='dmrp22-042',DIAMON='dmrp22-027',UNTAP='dm33-038',BOUNCE='dmrp01-039';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const paid=(s,p=0)=>s.players[p].mana.filter(y=>y.tapped).length;

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
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function alt(s,x){
 return e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&a.role==='paidAlt568');
}

test('Three official definitions and two reprints keep canonical IDs, costs, limits and images',()=>{
 const m=read('tools/support-phase-1064.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[HIME,SCHOPEN,TENSAY]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dm25ex3-059',HIME],['promoy24-055',TENSAY]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(cat.get(id).supported,true);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1064}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(details.cards.find(r=>r.id===id).faces,row.faces);
  assert.deepEqual(data.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('HIMEGYA checks mana-zone civilizations independently of the two colorless payments',()=>{
 const s=field(),x=add(s,0,'hand',HIME),base=add(s,0,'battle',LIGHT);
 add(s,0,'battle',WATER);
 give(s,0,'mana',[DARK,WATER]);
 assert.deepEqual(alt(s,x),[]);
 const all=add(s,0,'mana',HIME,{tapped:true,faceDown:true});
 assert.deepEqual(alt(s,x),[]);
 delete all.faceDown;
 assert.deepEqual(alt(s,x).map(a=>[a.baseUid,a.cost]),[[null,2],[base.uid,2]]);
 act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568'&&a.baseUid===base.uid);
 assert.equal(paid(s),3);
 const y=s.players[0].battle.find(y=>y.uid===x.uid);
 assert.equal(y.under[0].uid,base.uid);
 assert.deepEqual(e.civilizations(e.effectiveCard(y,s)),['光','火','自然']);
 assert.equal(e.card(y).cost,3);
});

test('HIMEGYA stacks live DDD reductions and pays the quoted amount after save restoration',()=>{
 let s=field();
 const attacker=add(s,0,'battle',LIGHT);
 add(s,0,'battle',HIME);
 add(s,0,'battle',HIME);
 const x=add(s,0,'hand',GG);
 give(s,0,'mana',[LIGHT,FIRE,GREEN]);
 attack(s,attacker.uid);
 act(s,'declareDDD');
 s=restore(s);
 const actions=e.getLegalActions(s).filter(a=>a.kind==='summonDDD');
 assert.ok(actions.length&&actions.every(a=>a.cost===3));
 act(s,'summonDDD',a=>a.baseUid===attacker.uid);
 assert.equal(paid(s),3);
 assert.equal(s.attack.attacker,x.uid);
 drain(s);
});

test('HIMEGYA never makes DDD free and loses its discount while sealed or ignored',()=>{
 for(const mode of ['normal','sealed','ignored','opponent','prevented']){
  const s=field(),owner=mode==='opponent'?1:0;
  for(let i=0;i<4;i++)add(s,owner,'battle',HIME,mode==='sealed'?{sealed:true}:mode==='ignored'?{g35Ignored:s.turn}:{});
  if(mode==='prevented')add(s,1,'battle',DIAMON);
  const c=e.card(GG),payment=e.dddPayment(s,0,c);
  assert.equal(e.summonCost(s,0,{...c,...payment,g28DDD:true}),mode==='normal'?1:7);
  assert.equal(e.summonCost(s,0,c),10);
 }
});

test('Schopenhauer requires a valid grave creature and allows NEO evolution as it enters',()=>{
 let s=field();
 const base=add(s,0,'battle',DARK,{tapped:true});
 const x=add(s,0,'hand',SCHOPEN);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 const small=add(s,0,'grave',DARK),neo=add(s,0,'grave',DARK_NEO);
 const others=['dm01-027',DARK_EVO,GG].map(id=>add(s,0,'grave',id));
 const target=add(s,0,'battle',WATER);
 end(s);
 assert.deepEqual(new Set(values(s)),new Set([small.uid,neo.uid]));
 s=restore(s);
 pick(s,neo.uid);
 pick(s,target.uid);
 drain(s);
 assert.equal(s.active,1);
 assert.equal(s.players[0].battle.find(y=>y.uid===neo.uid).under[0].uid,target.uid);
 assert.deepEqual(new Set(ids(s,0,'grave')),new Set([small.uid,...others.map(y=>y.uid)]));
});

test('Schopenhauer resolves the tap condition at its own end step and respects grave locks',()=>{
 for(const mode of ['untapped','opponent','blocked','untapped first','tapped first']){
  const s=field();
  s.active=mode==='opponent'?1:0;
  const x=add(s,0,'battle',SCHOPEN,{tapped:mode!=='untapped'});
  const y=add(s,0,'grave',DARK);
  if(mode==='blocked')add(s,1,'battle',APUL);
  const ordered=mode.endsWith('first');
  if(ordered)add(s,0,'battle',UNTAP);
  end(s);
  if(ordered){
   act(s,'orderEffect',a=>a.cardId===(mode==='untapped first'?UNTAP:SCHOPEN));
   if(mode==='untapped first')pick(s,x.uid);
   if(mode==='tapped first')pick(s,y.uid);
  }
  drain(s);
  assert.equal(ids(s,0,'battle').includes(y.uid),mode==='tapped first',mode);
 }
});

test('Schopenhauer reads the last tapped state when another end-step ability returns it to hand',()=>{
 for(const tapped of [true,false]){
  let s=field();
  const x=add(s,0,'battle',SCHOPEN,{tapped});
  const y=add(s,0,'grave',DARK);
  add(s,0,'battle',BOUNCE);
  end(s);
  act(s,'orderEffect',a=>a.cardId===BOUNCE);
  pick(s,x.uid);
  s=restore(s);
  if(tapped)pick(s,y.uid);
  drain(s);
  assert.ok(ids(s,0,'hand').includes(x.uid));
  assert.equal(ids(s,0,'battle').includes(y.uid),tapped);
 }
});

test('Schopenhauer reads its pre-seal tapped state if it is sealed after triggering',()=>{
 const s=field(),x=add(s,0,'battle',SCHOPEN,{tapped:true}),y=add(s,0,'grave',DARK);
 add(s,0,'battle',BOUNCE);
 end(s);
 const other=s.pendingEffects.find(q=>q.source===BOUNCE);
 other.task={...other.task,op:'g34_Custom',uid:x.uid,name:'sealSelf',n:1};
 act(s,'orderEffect',a=>a.cardId===BOUNCE);
 assert.equal(x.sealed,true);
 pick(s,y.uid);
 drain(s);
 assert.ok(ids(s,0,'battle').includes(y.uid));
});

test('TENSAY can pay from mana with its own physical card and resolves Soul Raid after summoning',()=>{
 let s=field();
 add(s,1,'battle',LIGHT);
 give(s,0,'mana',[FIRE,GREEN]);
 const x=add(s,0,'mana',TENSAY);
 give(s,0,'deck',[WATER,LIGHT,DARK,GREEN,GREEN]);
 const base=s.players[0].deck[1],before=physical(s);
 assert.deepEqual(alt(s,x).map(a=>[a.origin,a.cost,a.baseUid]),[['mana',3,null]]);
 s=restore(s);
 act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568');
 assert.ok(!ids(s,0,'mana').includes(x.uid));
 assert.equal(paid(s),2);
 assert.deepEqual(new Set(values(s)),new Set([base.uid,null]));
 pick(s,base.uid);
 drain(s);
 assert.equal(s.players[0].battle[0].uid,x.uid);
 assert.equal(s.players[0].battle[0].under[0].uid,base.uid);
 assert.ok(e.isEvolution(s.players[0].battle[0]));
 assert.deepEqual(physical(s),before);
});

test('TENSAY checks noncreature elements, own versus opposing cards, and each required payment color',()=>{
 for(const mode of ['hand','seed','creature','mana lock','no fire','tapped source','sealed']){
  const s=field();
  give(s,0,'mana',mode==='no fire'?[GREEN,GREEN]:[FIRE,GREEN]);
  const x=add(s,0,mode==='hand'?'hand':'mana',TENSAY,{tapped:mode==='tapped source'});
  if(mode==='mana lock')add(s,1,'battle',APUL);
  if(mode==='seed')add(s,0,'battle',SEED);
  if(mode==='creature'||mode==='sealed')add(s,0,'battle',LIGHT,{sealed:mode==='sealed'});
  assert.equal(alt(s,x).length,mode==='sealed'?1:0,mode);
 }
});
