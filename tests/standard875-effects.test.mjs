import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PIN='dmr06-044',ANDOU='dmr09-026',FERRET='dmr05-035';
const SMALL='dm01-108',WATER='dm01-083',DARK='dm01-090',FORMULA='dmr06-010';
const TRON='dmx11-080',EVO='dmr05-017',CAT='dm34-052',PANDA='dmr02-054',HOMER='dm32-103';
const STRATO='dm22rp2-048',DEMON='dm01-027';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
  give(s,p,'mana',[...Array(7).fill(WATER),DARK,SMALL,SMALL,SMALL]);
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
test('Phase 875 uses three verified original card IDs and full official definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-875.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PIN,ANDOU,FERRET]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:875}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:874}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:875}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});


test('Gabyou Otoko can decline and targets only tapped opposing creatures after its sacrifice',()=>{
 for(const accept of [false,true]){
  const s=field(),pin=add(s,0,'battle',PIN);
  const enemy=add(s,1,'battle',CAT,{tapped:true}),untapped=add(s,1,'battle',SMALL);
  add(s,0,'battle',SMALL,{tapped:true});
  add(s,1,'battle','dmsd20-016',{tapped:true});
  cast(s,SMALL);
  assert.equal(s.decision,null);
  cast(s,FORMULA);
  assert.equal(s.decision.task.op,'g34_SelfSacrifice407');
  pick(s,accept?true:null);
  if(accept){
   assert.ok(has(s,0,'grave',pin));
   assert.deepEqual(values(s),[enemy.uid]);
   pick(s,enemy);
   assert.ok(has(s,1,'grave',enemy));
  }else{
   assert.ok(has(s,0,'battle',pin)&&has(s,1,'battle',enemy));
  }
  assert.ok(has(s,1,'battle',untapped));
  assert.equal(s.decision,null);
 }
});

test('Gabyou Otoko ignores opposing Unknown and resolves when Strato replaces the sacrifice',()=>{
 let s=field();
 const pin=add(s,0,'battle',PIN),enemy=add(s,1,'battle',CAT,{tapped:true});
 s.active=1;
 cast(s,FORMULA);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',pin)&&has(s,1,'battle',enemy));
 s=field();
 const source=add(s,0,'battle',PIN),target=add(s,1,'battle',CAT,{tapped:true});
 const strato=add(s,1,'battle',STRATO);
 cast(s,FORMULA);
 pick(s,true);
 assert.equal(s.decision.player,1);
 act(s,'g47Replace');
 pick(s,source);
 pick(s,null);
 assert.ok(has(s,0,'mana',source));
 pick(s,target);
 assert.ok(has(s,1,'grave',target));
 assert.ok(!has(s,0,'battle',source));
 assert.ok(has(s,1,'battle',strato));
});

test('Andou Trois selects any order, makes each represented cost mandatory, and permits a new evolution base',()=>{
 let s=field();
 give(s,0,'grave',[TRON,EVO,SMALL,CAT,CAT,FERRET,DEMON]);
 const [one,evolution,two,firstThree,secondThree,big,spell]=s.players[0].grave;
 cast(s,ANDOU);
 assert.deepEqual(values(s),[one.uid,two.uid,firstThree.uid,secondThree.uid]);
 pick(s,secondThree);
 assert.deepEqual(values(s),[one.uid,two.uid]);
 s=restore(s);
 pick(s,one);
 assert.deepEqual(values(s),[evolution.uid,two.uid]);
 pick(s,evolution);
 if(s.decision)pick(s,one);
 assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[ANDOU,CAT,EVO]);
 assert.deepEqual(s.players[0].battle.at(-1).under.map(x=>x.uid),[one.uid]);
 for(const x of [two,firstThree,big,spell])assert.ok(has(s,0,'grave',x));
 assert.equal(s.decision,null);
 assert.equal(s.g34DeployBatch,undefined);
});

test('Andou Trois completes the available costs and waits to resolve resulting entry abilities',()=>{
 const s=field(),first=add(s,0,'grave','dm24ex1-086'),last=add(s,0,'grave',CAT);
 const c=e.card(first.cardId);
 assert.equal(c.cost,2);
 assert.deepEqual(c.g34Tasks,[{op:'Draw',n:1}]);
 cast(s,ANDOU);
 pick(s,first);
 assert.equal(s.players[0].hand.length,0);
 assert.deepEqual(values(s),[last.uid]);
 pick(s,last);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision,null);
});

test('Andou Trois applies entry replacements in the chosen order (QA 33425)',()=>{
 const s=field();
 add(s,1,'battle','dmrp13-046');
 give(s,0,'grave',[TRON,SMALL,CAT]);
 const [one,two,three]=s.players[0].grave;
 cast(s,ANDOU);
 pick(s,three);
 assert.ok(has(s,0,'battle',three));
 pick(s,one);
 assert.ok(has(s,0,'mana',one));
 assert.deepEqual(values(s),[two.uid]);
 pick(s,two);
 assert.ok(has(s,0,'mana',two));
 assert.equal(s.decision,null);
});

function destroyFerret(s,replace=false){
 s.active=1;
 const source=add(s,0,'battle',FERRET);
 const strato=replace?add(s,1,'battle',STRATO):null;
 cast(s,DEMON);
 act(s,'effect',a=>a.targets[0].uid===source.uid);
 if(strato){
  act(s,'g47Replace');
  pick(s,source);
  pick(s,null);
 }
 return source;
}

test('Ferret can decline both or use a first Dream Mate as the second one’s evolution base',()=>{
 for(const accept of [false,true]){
  let s=field();
  const base=add(s,0,'mana',PANDA,{tapped:true}),evolution=add(s,0,'mana',HOMER);
  const source=destroyFerret(s);
  assert.ok(has(s,0,'grave',source));
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[base.uid,null]);
  pick(s,accept?base:null);
  if(accept){
   assert.deepEqual(values(s),[evolution.uid]);
   s=restore(s);
   pick(s,evolution);
   if(s.decision)pick(s,base);
   assert.deepEqual(s.players[0].battle.map(x=>x.uid),[evolution.uid]);
   assert.deepEqual(s.players[0].battle[0].under.map(x=>x.uid),[base.uid]);
  }else{
   assert.ok(has(s,0,'mana',base)&&has(s,0,'mana',evolution));
  }
  assert.equal(s.decision,null);
  assert.equal(s.g34DeployBatch,undefined);
 }
});

test('Ferret handles one or zero eligible cards and does not trigger if destruction is replaced',()=>{
 for(const [available,replace] of [[true,false],[false,false],[true,true]]){
  const s=field(),eligible=available?add(s,0,'mana',CAT):null;
  const source=destroyFerret(s,replace);
  if(available&&!replace){
   pick(s,eligible);
   assert.ok(has(s,0,'battle',eligible));
  }
  if(replace)assert.ok(has(s,0,'mana',source)&&has(s,0,'mana',eligible));
  assert.equal(s.decision,null);
 }
});
