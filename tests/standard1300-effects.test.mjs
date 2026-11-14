import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const ZOLE='dmrp09-019',LUNA='dm23rp1-018',KUZU='dm25rp3-068',PYRO='dm25rp4-042';
const HEAVEN='dmex12-032',VANILLA='dm01-108',NIGHTMARE='dmr13-087',DARK='dmrp12-s08',MIST='dm04-024';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=Object.assign(setup(),{active:0});
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(VANILLA));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 s.phase='main';
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const value=({value})=>value?.uid??value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const order=(s,id)=>act(s,s.decision.type==='entryOrder'?'orderEntry':'orderEffect',a=>a.cardId===id);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const advance=s=>act(s,'skipCharge');
const uses=s=>s.extLimits.filter(r=>r.kind==='g1300DoubleEntry').length;

test('nine verified prints map to four unchanged canonical IDs and legal decks',()=>{
 const m=read('tools/support-phase-1300.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[ZOLE,LUNA,KUZU,PYRO]);
 assert.equal(m.printAliases.length,5);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,image,source,faces,spec,canonicalId=id}=row,c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({...row,status:'complete'},{phase:1300}));
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [f.cost,parseInt(f.powerText,10),1,f.civilizations,f.race,4]);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Zolego destroys a chosen creature on entry and breaks two shields',()=>{
 const s=field(),victim=add(s,1,'battle',VANILLA);
 const zole=play(s,ZOLE);
 pick(s,victim.uid);
 assert.ok(has(s,1,'grave',victim));
 zole.entered=0;
 attack(s,zole.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Heaven resolves two separate modes after the spell, with Mist Rias triggering once (QA 38609, 31938, 43939)',()=>{
 let s=field();
 play(s,ZOLE,1);
 assert.equal(uses(s),1);
 play(s,VANILLA);
 assert.equal(uses(s),1);
 add(s,0,'battle',MIST);
 const enemy=add(s,1,'battle',VANILLA),revival=add(s,0,'grave',NIGHTMARE);
 play(s,HEAVEN);
 const queue=s.triggers?.entries??s.pendingEffects;
 assert.equal(queue.filter(x=>x.source===HEAVEN).length,2);
 assert.equal(queue.filter(x=>x.source===MIST).length,1);
 assert.equal(uses(s),0);
 s=JSON.parse(JSON.stringify(s));
 order(s,HEAVEN);pick(s,0);pick(s,enemy.uid);
 order(s,HEAVEN);pick(s,1);pick(s,revival.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',revival));
});

test('two optional entry triggers consume the spell when both are declined (QA 43938)',()=>{
 const s=field();
 play(s,ZOLE,1);
 add(s,0,'hand',VANILLA);
 play(s,KUZU);
 order(s,KUZU);
 pick(s,null);
 pick(s,null);
 assert.equal(uses(s),0);
 play(s,LUNA);
 assert.equal(s.decision.task.op,'g34_Mill');
 assert.equal((s.triggers?.entries??s.pendingEffects??[]).filter(x=>x.source===LUNA).length,0);
});

test('an unused doubling expires when the turn ends',()=>{
 const s=field();
 play(s,ZOLE,1);
 end(s);
 assert.equal(uses(s),0);
 assert.equal(s.active,1);
});

test('Luna mills exactly to five on entry or at start and may decline',()=>{
 for(const initial of [0,4,5]){
  const s=field();
  give(s,0,'grave',Array(initial).fill(VANILLA));
  play(s,LUNA);
  if(initial<5){assert.equal(s.decision.task.n,5-initial);pick(s,true);}
  assert.equal(s.players[0].grave.length,5);
 }
 const s=field();
 play(s,LUNA);
 pick(s,null);
 assert.equal(s.players[0].grave.length,0);
 end(s);advance(s);end(s);
 assert.equal(s.decision.task.n,5);
 pick(s,true);
 assert.equal(s.players[0].grave.length,5);
});

test('two Lunas revived by the official spell do not draw from their own departures (QA 43059)',()=>{
 const s=field(),a=add(s,0,'grave',LUNA),b=add(s,0,'grave',LUNA);
 play(s,DARK);
 pick(s,1);pick(s,1);
 pick(s,a.uid);
 if(s.decision?.task?.op==='g34_Mill')pick(s,null);
 pick(s,b.uid);
 drain(s);
 assert.ok(has(s,0,'battle',a)&&has(s,0,'battle',b));
 assert.equal(s.players[0].hand.length,0);
});

test('a Luna already in play draws on the first own-turn departure only',()=>{
 const s=field();
 add(s,0,'battle',LUNA);
 const a=add(s,0,'grave',NIGHTMARE),b=add(s,0,'grave',NIGHTMARE);
 play(s,HEAVEN);pick(s,1);pick(s,a.uid);drain(s);
 assert.equal(s.players[0].hand.length,1);
 play(s,HEAVEN);pick(s,1);pick(s,b.uid);drain(s);
 assert.equal(s.players[0].hand.length,1);
});

test('Kuzutrain discards one to draw two on entry and on the first grave departure on either turn',()=>{
 const s=field(),discard=add(s,0,'hand',VANILLA);
 play(s,KUZU);
 pick(s,discard.uid);
 assert.ok(has(s,0,'grave',discard));
 assert.equal(s.players[0].hand.length,2);
 const grave=add(s,0,'grave',NIGHTMARE);
 const heaven=inst(HEAVEN);
 s.players[0].shields=[heaven];
 s.active=1;
 attack(s,add(s,1,'battle',VANILLA).uid);
 act(s,'noBlock');act(s,'useTrigger',a=>a.uid===heaven.uid);
 pick(s,1);pick(s,grave.uid);
 assert.equal(s.decision.source,KUZU);
 pick(s,s.players[0].hand[0].uid);
 drain(s);
 assert.equal(s.players[0].hand.length,3);
});

test('Pyro counts Abyss cards for powered breaker and may fight after its first grave departure',()=>{
 const s=field(),pyro=add(s,0,'battle',PYRO);
 add(s,0,'grave',LUNA);add(s,0,'grave',LUNA);
 const nightmare=add(s,0,'grave',NIGHTMARE),enemy=add(s,1,'battle',VANILLA);
 assert.equal(e.power(pyro,false,s),6000);
 play(s,HEAVEN);pick(s,1);pick(s,nightmare.uid);
 pick(s,enemy.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 attack(s,pyro.uid);act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('all of the entrant’s own abilities double independently (QA 31937)',()=>{
 const s=field();
 play(s,ZOLE,1);
 play(s,'dmrp20-074');
 const queue=s.triggers?.entries??s.pendingEffects;
 assert.equal(queue.length,4);
 assert.equal(queue.filter(x=>x.label==='マナ武装4').length,2);
 drain(s);
 assert.equal(s.players[0].grave.length,5);
});

test('the active player’s doubled entry takes priority over Brakkio (QA 33614)',()=>{
 const s=field();
 add(s,1,'battle','dmrp14-s05');
 play(s,ZOLE,1);
 add(s,0,'grave',NIGHTMARE);
 play(s,HEAVEN);
 assert.equal((s.triggers?.entries??s.pendingEffects).filter(x=>x.source===HEAVEN).length,2);
 assert.equal(uses(s),0);
 drain(s);
});
