import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const HIGH='dm25rp2-054',WALL='dm25rp2-032',SHOT='dm25rp4-034',DOCRUS='dm25rp4-017';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const GNEO='dm25rp2-017',EVO='dm02-033',SEED='dm22ex1-086',SPELL='dm01-027',GENJI='dmex17-036';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const lookup=(s,p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);

function add(s,p,zone,id,properties={}){
 const x=Object.assign(inst(id),properties);
 s.players[p][zone].push(x);
 return x;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}

test('Four official definitions and two reprints retain canonical IDs, images, text and limits',()=>{
 const m=read('tools/support-phase-1060.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[HIGH,WALL,SHOT,DOCRUS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy24-103',SHOT],['dm25ex3-012',DOCRUS]]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1060}),row.spec);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 for(const row of m.printAliases){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:2},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:4}]);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId,row.image]]);
 }
});

test('Hycrid takes a revealed NEO or G-NEO from the deck without asking',()=>{
 for(const [id,evolve] of [[DOCRUS,false],[GNEO,true]]){
  const s=setup(),base=evolve?add(s,0,'battle',GREEN):undefined;
  give(s,0,'deck',[id,FIRE,DARK]);
  const [top,next]=s.players[0].deck;
  const body=summon(s,HIGH,base);
  assert.equal(e.isEvolution(lookup(s,0,body)),evolve);
  assert.equal(s.decision,null);
  assert.deepEqual(ids(s,0,'hand'),[top.uid]);
  assert.equal(s.players[0].deck[0].uid,next.uid);
 }
});

test('Hycrid may send a non-NEO to the bottom or leave it on top',()=>{
 for(const [card,use] of [[EVO,true],[SPELL,false]]){
  let s=setup();
  give(s,0,'deck',[card,FIRE,GREEN]);
  const before=ids(s,0,'deck');
  summon(s,HIGH);
  s=restore(s);
  pick(s,use?true:null);
  assert.deepEqual(ids(s,0,'deck'),use?[before[1],before[2],before[0]]:before);
  assert.deepEqual(ids(s,0,'hand'),[]);
 }
});

test('Wall Raid takes one legal base, orders the other two and keeps Just Diver',()=>{
 let s=setup();
 give(s,0,'deck',[FIRE,DARK,WATER,GREEN]);
 const [fire,dark,water,green]=ids(s,0,'deck');
 const body=summon(s,WALL);
 assert.deepEqual(new Set(values(s)),new Set([dark,water,null]));
 s=restore(s);
 pick(s,dark);
 pick(s,water);
 assert.deepEqual(ids(s,0,'deck'),[green,water,fire]);
 const wall=lookup(s,0,body);
 assert.deepEqual(wall.under.map(y=>y.uid),[dark]);
 assert.ok(e.isEvolution(wall));

 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===wall.uid));
 s.active=1;
 s.phase='main';
 const removal=add(s,1,'hand',SPELL);
 act(s,'play',a=>a.uid===removal.uid);
 drain(s);
 assert.ok(lookup(s,0,wall));
});

test('Wall Raid can be declined after a normal NEO evolution, preserving its initial base',()=>{
 const s=setup(),base=add(s,0,'battle',LIGHT);
 give(s,0,'deck',[DARK,FIRE,SPELL,GREEN]);
 const [dark,fire,spell,green]=ids(s,0,'deck');
 const body=summon(s,WALL,base);
 pick(s,null);
 pick(s,spell);
 pick(s,dark);
 assert.deepEqual(ids(s,0,'deck'),[green,spell,dark,fire]);
 assert.deepEqual(lookup(s,0,body).under.map(y=>y.uid),[base.uid]);
});

test('Shot must return an eligible opposing creature to the physical owner',()=>{
 const s=setup(),ally=add(s,0,'battle',FIRE);
 const stolen=add(s,1,'battle',LIGHT,{cardOwner:0});
 const protectedEnemy=add(s,1,'battle','dmrp01-041'),seed=add(s,1,'battle',SEED);
 summon(s,SHOT);
 assert.deepEqual(values(s),[stolen.uid]);
 pick(s,stolen.uid);
 assert.ok(ids(s,0,'hand').includes(stolen.uid));
 assert.deepEqual(ids(s,1,'battle'),[protectedEnemy.uid,seed.uid]);
 assert.ok(lookup(s,0,ally));
});

test('An evolved Shot selects up to the number of available creatures and returns entire stacks to their owners',()=>{
 const s=setup(),base=add(s,0,'battle',WATER,{under:[inst(DARK)]});
 const foreignBase=Object.assign(inst(GREEN),{cardOwner:0});
 const enemy=add(s,1,'battle',GENJI,{cardOwner:1,under:[foreignBase]});
 const second=add(s,1,'battle',DARK);
 summon(s,SHOT,base);
 assert.deepEqual(new Set(values(s)),new Set([enemy.uid,second.uid]));
 pick(s,second.uid);
 assert.ok(lookup(s,1,second));
 pick(s,enemy.uid);
 assert.ok(ids(s,0,'hand').includes(foreignBase.uid));
 assert.deepEqual(new Set(ids(s,1,'hand')),new Set([enemy.uid,second.uid]));
 assert.equal(s.decision,null);
});

for(const leaves of [false,true])test('Two Shots each return two creatures after stacking, including last known count '+leaves,()=>{
 let s=setup();
 give(s,1,'shields',leaves?[SHOT,SHOT,'dmr20-053']:[SHOT,SHOT]);
 const [one,two,spell]=s.players[1].shields;
 const attacker=add(s,0,'battle','dm25rp2-074',{under:[inst(FIRE),inst(GREEN)]});
 const enemies=[attacker,...[LIGHT,DARK,WATER].map(id=>add(s,0,'battle',id))];
 const before=physical(s),firstReturned=[attacker.uid,...attacker.under.map(x=>x.uid),enemies[1].uid];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===one.uid);
 act(s,'useTrigger',a=>a.uid===two.uid);
 if(leaves)act(s,'useTrigger',a=>a.uid===spell.uid);
 act(s,'orderTrigger',a=>a.uid===one.uid);
 act(s,'triggerEvolve',a=>a.uid===one.uid&&!a.baseUid);
 if(leaves)act(s,'orderTrigger',a=>a.uid===two.uid);
 act(s,'triggerEvolve',a=>a.uid===two.uid&&a.baseUid===one.uid);
 if(leaves){
  pick(s,two.uid);
  assert.deepEqual(new Set(ids(s,1,'hand')),new Set([one.uid,two.uid]));
 }
 s=restore(s);
 for(const [index,enemy] of enemies.entries()){
  if(index===0)act(s,'orderEntry',a=>a.uid===one.uid);
  pick(s,enemy.uid);
  if(index===1)assert.deepEqual(new Set(ids(s,0,'hand')),new Set(firstReturned));
 }
 drain(s);
 assert.equal(ids(s,0,'battle').length,0);
 assert.ok(enemies.every(x=>ids(s,0,'hand').includes(x.uid)));
 if(!leaves)assert.equal(lookup(s,1,two).under[0].uid,one.uid);
 assert.deepEqual(physical(s),before);
});

test('Docrus may mill three cards on entry or leave the deck intact',()=>{
 for(const use of [true,false]){
  const s=setup();
  give(s,0,'deck',[LIGHT,WATER,DARK,FIRE,GREEN]);
  const before=ids(s,0,'deck');
  summon(s,DOCRUS);
  pick(s,use?true:null);
  assert.deepEqual(ids(s,0,'grave'),use?before.slice(0,3):[]);
  assert.deepEqual(ids(s,0,'deck'),use?before.slice(3):before);
 }
});

test('Docrus can take a creature or tamaseed from its grave while attacking',()=>{
 for(const id of [GREEN,SEED]){
  let s=setup();
  const body=add(s,0,'battle',DOCRUS),base=add(s,0,'grave',id),other=add(s,0,'grave',id===GREEN?SEED:GREEN);
  const spell=add(s,0,'grave',SPELL),enemy=add(s,1,'grave',DARK);
  assert.ok(!e.isEvolution(body));
  attack(s,body.uid);
  assert.deepEqual(new Set(values(s)),new Set([base.uid,other.uid,null]));
  s=restore(s);
  pick(s,base.uid);
  drain(s);
  assert.deepEqual(lookup(s,0,body).under.map(y=>y.uid),[base.uid]);
  assert.ok(e.isEvolution(lookup(s,0,body)));
  assert.deepEqual(ids(s,0,'grave'),[other.uid,spell.uid]);
  assert.deepEqual(ids(s,1,'grave'),[enemy.uid]);
 }
});

test('Docrus can decline to add a graveyard card',()=>{
 const s=setup(),base=add(s,0,'battle',WATER),grave=add(s,0,'grave',SEED);
 const body=summon(s,DOCRUS,base);
 pick(s,null);
 attack(s,body.uid);
 pick(s,null);
 drain(s);
 assert.deepEqual(lookup(s,0,body).under.map(y=>y.uid),[base.uid]);
 assert.deepEqual(ids(s,0,'grave'),[grave.uid]);
});

test('The deck lock prevents both Hycrid and Wall Raid from revealing or reordering cards',()=>{
 for(const id of [HIGH,WALL]){
  const s=setup();
  add(s,1,'battle','dmrp07-m01');
  give(s,0,'deck',[DOCRUS,WATER,LIGHT,GREEN]);
  const before=ids(s,0,'deck');
  const body=summon(s,id);
  drain(s);
  assert.deepEqual(ids(s,0,'deck'),before);
  assert.deepEqual(ids(s,0,'hand'),[]);
  assert.ok(!lookup(s,0,body).under?.length);
 }
});

test('A graveyard restriction keeps Docrus from placing a card under itself',()=>{
 const s=setup(),body=add(s,0,'battle',DOCRUS),grave=add(s,0,'grave',SEED);
 add(s,1,'battle','dmrp22-042');
 attack(s,body.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 drain(s);
 assert.ok(!e.isEvolution(lookup(s,0,body)));
 assert.deepEqual(ids(s,0,'grave'),[grave.uid]);
});
