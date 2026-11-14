import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const PAL='dm10-019',CASH='promoy18-087',TRITON='dmd26-007',REPRINT='dmex18-056';
const SMALL='dm01-108',VIRUS='dm06-083',SEA='dmr21-066',AMO='dmrp19-s10';
const TWIN='dm23bd7-003',SURVIVOR='dm05-054';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(SMALL));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

test('four official prints resolve to three catalogue cards with their original stats and artwork',()=>{
 const m=read('tools/support-phase-1254.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PAL,CASH,TRITON]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,TRITON]]);
 for(const {id,canonicalId=id,name,faces:[f],image} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId);
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(id===canonicalId){assert.equal(CARD_IMAGES[id],image);assert.equal(c.text,f.abilityText);}
  assert.equal(refs.find(x=>x.id===id&&x.canonicalId===canonicalId)?.image,image);
 }
});

test('Paltan chooses up to two discards, then distinct creatures on either side go to their owners',()=>{
 const s=field(),pal=add(s,0,'battle',PAL),virus=add(s,0,'hand',VIRUS);
 const chips=[add(s,0,'hand',SMALL),add(s,0,'hand',SMALL)],kept=add(s,0,'hand',SMALL);
 const enemy=add(s,1,'battle',SMALL,{cardOwner:0});
 play(s,virus);
 for(const x of chips)pick(s,x.uid);
 assert.equal(s.players[0].grave.length,2);
 assert.deepEqual(new Set(values(s)),new Set([pal.uid,virus.uid,enemy.uid]));
 pick(s,virus.uid);
 assert.ok(has(s,0,'battle',virus));
 assert.deepEqual(new Set(values(s)),new Set([pal.uid,enemy.uid]));
 pick(s,enemy.uid);
 assert.ok([enemy,virus,kept].every(x=>has(s,0,'hand',x)));
 assert.ok(has(s,0,'battle',pal));
});

test('Paltan sees an allied Cyber Virus Sea but ignores opposing entrants and permits zero discards',()=>{
 for(const id of [VIRUS,SEA]){
  const s=field(),pal=add(s,0,'battle',PAL),held=add(s,0,'hand',SMALL);
  play(s,add(s,0,'hand',id));
  assert.equal(s.decision?.task?.op,'discardSelect');
  pick(s,null);drain(s);
  assert.ok(has(s,0,'hand',held)&&has(s,0,'battle',pal));
 }
 const s=field(1),pal=add(s,0,'battle',PAL),held=add(s,0,'hand',SMALL);
 play(s,add(s,1,'hand',VIRUS));
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',held)&&has(s,0,'battle',pal));
});

test('Paltan does not return a creature for a discard replaced by Amodegoras',()=>{
 const s=field(),pal=add(s,0,'battle',PAL),enemy=add(s,1,'battle',SMALL);
 add(s,0,'battle',AMO);
 const chip=add(s,0,'hand',SMALL);
 play(s,add(s,0,'hand',VIRUS));
 pick(s,chip.uid);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.g1090Mana);
 drain(s);
 assert.ok(has(s,0,'mana',chip)&&has(s,0,'battle',pal)&&has(s,1,'battle',enemy));
});

test('Cash can decline the reveal or reveal one single-faced card for its printed cost',()=>{
 for(const [mode,n] of [['empty',0],['skip',0],['reveal',e.card(SMALL).cost]]){
  const s=field(),cash=add(s,0,'hand',CASH);
  const held=mode!=='empty'&&add(s,0,'hand',SMALL);
  play(s,cash);
  if(held){assert.deepEqual(values(s),[held.uid,null]);pick(s,mode==='reveal'?held.uid:null);}
  drain(s);
  assert.ok(has(s,0,'battle',cash));
  if(held)assert.ok(has(s,0,'hand',held));
  assert.equal(s.players[0].deck.length,22-n);
 }
});

test('Cash chooses either printed Twinpact cost after revealing the physical card (201.2b)',()=>{
 for(const n of [10,7]){
  const s=field(),held=add(s,0,'hand',TWIN);
  play(s,add(s,0,'hand',CASH));pick(s,held.uid);
  assert.deepEqual(values(s),[10,7]);
  pick(s,n);
  assert.equal(s.players[0].deck.length,22-n);
  assert.ok(has(s,0,'hand',held));
 }
});

test('Triton grants optional attack draw to itself and allied Survivors only',()=>{
 for(const [id,active,draw] of [[TRITON,0,true],[SURVIVOR,0,true],[SURVIVOR,1,false],[SMALL,0,false]]){
  const s=field(active);
  if(id!==TRITON)add(s,0,'battle',TRITON);
  const x=add(s,active,'battle',id);
  attack(s,x.uid);
  if(draw){assert.deepEqual(values(s),[0,1]);pick(s,1);}
  else assert.deepEqual(values(s),[]);
  assert.equal(s.players[active].deck.length,draw?21:22);
 }
});

test('two Tritons grant separate optional draws and a Triton in the grave does not grant one',()=>{
 const s=field(),attacker=add(s,0,'battle',TRITON);
 add(s,0,'battle',TRITON);add(s,0,'grave',TRITON);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===TRITON).length,2);
 act(s,'orderEffect');
 assert.deepEqual(values(s),[0,1]);pick(s,0);
 assert.deepEqual(values(s),[0,1]);pick(s,1);
 assert.equal(s.players[0].deck.length,21);
 assert.deepEqual(values(s),[]);
});
