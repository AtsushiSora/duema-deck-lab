import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const COPPI='dm23rp4-034',SIGI='dmrp13-037',FISH='dm24rp2-014';
const LOW='dm01-108',FIRE='dm01-097',DARK='dm01-090',DESTROY='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(LOW));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision.choices.map(o=>o.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const cost=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid)?.cost;
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const manaUsed=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
const tapped=(s,p,n)=>Array.from({length:n},()=>add(s,p,'battle',LOW,{tapped:true}));

test('Three distinct official names and two reprints preserve canonical IDs and official images',()=>{
 const m=read('tools/support-phase-1240.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[COPPI,SIGI,FISH]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23rp4x-034',COPPI],['dm24ex3-011',FISH]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1240}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Coppi discards before paying three fire mana and must destroy an enemy based on current power',()=>{
 const s=field(),x=add(s,0,'hand',COPPI),fodder=add(s,0,'hand',LOW);
 const target=add(s,1,'battle',FISH,{powerModifiers:[{amount:-1000}]}),big=add(s,1,'battle',FIRE,{powerModifiers:[{amount:5000}]});
 const friendly=add(s,0,'battle',LOW),survivor=add(s,1,'battle',LOW);
 give(s,0,'mana',[FIRE,LOW,LOW]);assert.equal(cost(s,x),3);play(s,x);
 assert.deepEqual(options(s),[fodder.uid,false]);assert.equal(manaUsed(s),0);
 pick(s,fodder.uid);assert.ok(has(s,0,'grave',fodder));assert.equal(manaUsed(s),3);
 assert.deepEqual(options(s).map(o=>o.uid??o).sort(),[target.uid,survivor.uid].sort());
 pick(s,survivor.uid);drain(s);
 assert.ok(has(s,1,'grave',survivor));assert.ok(has(s,1,'battle',target)&&has(s,1,'battle',big)&&has(s,0,'battle',friendly));
 assert.equal(e.card(COPPI).cost,5);
});

test('Sigi can choose either two mana after discarding or five mana without discarding',()=>{
 for(const use of [true,false]){
  const s=field(),x=add(s,0,'hand',SIGI),fodder=add(s,0,'hand',LOW);
  give(s,0,'mana',[DARK,LOW,LOW,LOW,LOW]);assert.equal(cost(s,x),2);
  play(s,x);assert.deepEqual(options(s),[fodder.uid,null,false]);
  pick(s,use?fodder.uid:null);drain(s);
  assert.ok(has(s,0,'battle',x));assert.ok(has(s,0,use?'grave':'hand',fodder));assert.equal(manaUsed(s),use?2:5);
 }
});

test('Discard is independent of cancellation, the colored mana requirement and suppression of reduction',()=>{
 const s=field(),x=add(s,0,'hand',SIGI);
 give(s,0,'mana',[DARK,LOW]);assert.equal(cost(s,x),undefined);
 const fodder=add(s,0,'hand',LOW);
 give(s,0,'mana',[LOW,LOW]);assert.equal(cost(s,x),undefined);
 give(s,0,'mana',[DARK,LOW]);play(s,x);pick(s,false);
 assert.equal(manaUsed(s),0);assert.ok(has(s,0,'hand',x)&&has(s,0,'hand',fodder));
 add(s,1,'battle','dmrp22-027');assert.equal(cost(s,x),undefined);
 give(s,0,'mana',[DARK,LOW,LOW,LOW,LOW]);assert.equal(cost(s,x),5);play(s,x);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'hand',fodder));assert.equal(manaUsed(s),5);
});

test('Two Fish may declare together, but only one enters without a summon or mana payment',()=>{
 const s=field(),one=add(s,0,'hand',FISH),two=add(s,0,'hand',FISH),enemy=add(s,1,'hand',FISH);
 tapped(s,0,3);tapped(s,1,3);end(s);
 assert.equal(s.decision.task.uid,one.uid);pick(s,true);
 assert.equal(s.decision.task.uid,two.uid);pick(s,true);drain(s);
 const fish=[one,two].find(x=>has(s,0,'battle',x));
 assert.ok(fish?.justDiverActive);assert.ok(e.effectiveCard(fish,s).blocker);
 assert.equal(s.players[0].battle.filter(x=>x.cardId===FISH).length,1);
 assert.ok(has(s,1,'hand',enemy));assert.equal(s.metrics[0].played[FISH],undefined);assert.equal(manaUsed(s),0);
});

test('Fish needs three own tapped creatures and can decline the end declaration',()=>{
 for(const n of [2,3]){
  const s=field(),x=add(s,0,'hand',FISH);
  tapped(s,0,n);tapped(s,1,3);
  add(s,0,'battle',LOW);add(s,0,'battle','dmrp22-069',{tapped:true});
  end(s);
  assert.equal(s.decision.task.uid,x.uid);pick(s,n===2?true:null);
  drain(s);assert.ok(has(s,0,'hand',x));
 }
});

test('Fish enters normally, cannot be attacked or chosen during the protection window, and blocks',()=>{
 const s=field(),x=add(s,0,'hand',FISH),enemy=add(s,1,'battle','dm01-s01');
 play(s,x);drain(s);assert.ok(x.justDiverActive);assert.equal(manaUsed(s),5);end(s);drain(s);
 x.tapped=true;s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===x.uid));
 x.tapped=false;s.phase='main';
 play(s,add(s,1,'hand',DESTROY));drain(s);assert.ok(has(s,0,'battle',x));
 attack(s,enemy.uid);act(s,'block',a=>a.uid===x.uid);drain(s);
 assert.ok(has(s,0,'hand',x));assert.ok(!has(s,0,'grave',x));
});

test('Returning a Fish after destruction does not reset the same-turn entry record',()=>{
 const s=field(),x=add(s,0,'hand',FISH),other=add(s,0,'hand',FISH);
 tapped(s,0,3);play(s,x);drain(s);
 s.extTasks=[{op:'g34_Target',p:0,source:DESTROY,owner:'self',to:'grave',filter:{exactUid:x.uid}}];
 act(s,'toAttack');pick(s,x.uid);drain(s);
 assert.ok(has(s,0,'hand',x));
 end(s);assert.equal(s.decision.task.uid,other.uid);pick(s,true);
 assert.equal(s.decision.task.uid,x.uid);pick(s,true);drain(s);
 assert.ok(has(s,0,'hand',other)&&has(s,0,'hand',x));
});

test('A replaced discard still reduces the summon cost, including during manual payment',()=>{
 let s=field(),x=add(s,0,'hand',SIGI),fodder=add(s,0,'hand',LOW);
 add(s,0,'battle','dmrp19-s10');give(s,0,'mana',[DARK,LOW]);
 const manual=(kind,predicate=()=>true)=>{
  const a=e.getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind);e.step(s,a,{manualMana:true});
 };
 manual('play',a=>a.uid===x.uid);
 manual('extended',a=>s.decision.choices[a.choice].value===fodder.uid);
 manual('extended',a=>s.decision.choices[a.choice].value?.g1090Mana);
 assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,2);
 s=JSON.parse(JSON.stringify(s));
 for(const mana of s.players[0].mana)manual('selectMana',a=>a.uid===mana.uid);
 manual('confirmMana');drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'mana',fodder));assert.equal(manaUsed(s),2);
});

test('A mana-zone permission also allows the optional discard on a normal mana-zone summon',()=>{
 const s=field(),fodder=add(s,0,'hand',LOW);
 add(s,0,'battle','dmex10-s04');give(s,0,'mana',[SIGI,LOW]);
 const x=s.players[0].mana[0];
 act(s,'play',a=>a.uid===x.uid&&a.origin==='mana');
 pick(s,fodder.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',fodder));assert.equal(manaUsed(s),1);
});

test('Fish can declare before an end step effect supplies the third tapped creature',()=>{
 const s=field(),x=add(s,0,'hand',FISH),officer=add(s,0,'battle','dm14-017');
 const [one,two]=tapped(s,0,2);end(s);pick(s,true);
 act(s,'orderEffect',a=>a.uid===officer.uid);
 const first=options(s).find(o=>[officer.uid,one.uid,two.uid].includes(o.uid??o));
 assert.ok(first);pick(s,first.uid??first);drain(s);
 assert.ok(has(s,0,'battle',x));
});

test('An ignored Fish cannot borrow the destruction replacement of another Fish',()=>{
 const s=field(1),x=add(s,0,'battle',FISH,{g35Ignored:s.turn}),other=add(s,0,'battle',FISH);
 play(s,add(s,1,'hand',DESTROY));act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'battle',other));
});
