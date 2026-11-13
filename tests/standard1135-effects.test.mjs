import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BRAND='dm26ex1-N013',BAZAGA='dm26ex1-N001',EARTH='dm26ex1-N005';
const NATURE='dm01-108',DRAGON='dm08-045',GEAR='dm14-110',DEMON_HAND='dm01-027';
const JAOGA='dm26ex2-012';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const permit=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&a.origin==='mana'&&a.manaPermit?.startsWith('g450:'));
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
};

test('three official definitions and all eight prints resolve without duplicate card IDs',()=>{
 const manifest=read('tools/support-phase-1135.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(row=>row.id),[BRAND,BAZAGA,EARTH]);
 assert.equal(manifest.printAliases.length,5);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(c=>c.id===id).spec;
  assert.deepEqual(standardCardSpec(detail,{phase:1135}),spec);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(ref=>ref.id===row.id&&ref.canonicalId===id&&ref.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  detail.faces=structuredClone(row.faces);
  detail.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(detail,{phase:1135}));
 }
});

test('Brand ramps from hand and pays for one creature added to mana after its entry',()=>{
 const s=field(),target=put(s,0,'hand',NATURE);
 play(s,BRAND);
 pick(s,target.uid);
 assert.ok(s.players[0].mana.includes(target));
 const action=permit(s,target),tapped=s.players[0].mana.filter(x=>x.tapped).length;
 assert.equal(action.cost,e.card(target).cost);
 e.step(s,action);
 assert.ok(s.players[0].battle.includes(target));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped+action.cost);
 assert.ok(!permit(s,s.players[0].mana.find(x=>x.cardId===NATURE)));
});

test('Brand can decline the ramp and loses its unused permission on leaving or on a later turn',()=>{
 for(const leave of [false,true]){
  const s=field(),target=put(s,0,'hand',NATURE),brand=play(s,BRAND);
  pick(s,null);
  assert.ok(s.players[0].hand.includes(target));
  const mana=s.players[0].mana.find(x=>x.cardId===NATURE);
  assert.ok(permit(s,mana));
  if(leave){
   s.extTasks=[{op:'g34_ExactMove',p:0,source:BRAND,owner:0,to:'hand',target:brand.uid,targetIncarnation:brand.incarnation||0}];
   act(s,'toAttack');
   drain(s);
   assert.ok(s.players[0].hand.includes(brand));
  }else{
   s.phase='attack';act(s,'endTurn');drain(s);
   s.phase='attack';act(s,'endTurn');drain(s);
  }
  s.phase='main';
  assert.ok(!permit(s,mana));
 }
});

test('Brand gains speed and draws on attack only with an empty hand after a shield leaves',()=>{
 for(const empty of [true,false]){
  const s=field(),ally=put(s,0,'battle',NATURE),brand=play(s,BRAND);
  if(!empty)put(s,0,'hand',NATURE);
  s.phase='attack';
  assert.equal(e.power(brand,false,s),3000);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===brand.uid));
  attack(s,ally.uid);act(s,'noBlock');drain(s);
  assert.equal(e.power(brand,false,s),5000);
  assert.equal(e.effectiveCard(brand,s).speedAttacker,true);
  const n=s.players[0].hand.length,top=s.players[0].deck[0];
  attack(s,brand.uid);drain(s);
  assert.equal(s.players[0].hand.length,n+Number(empty));
  if(empty)assert.ok(s.players[0].hand.includes(top));
  act(s,'endTurn');drain(s);
  s.phase='attack';act(s,'endTurn');drain(s);
  assert.equal(e.power(brand,false,s),3000);
 }
});

test('Jaoga does not inherit Brand’s unlocked Hyper Mode (official Q&A 49085)',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),brand=play(s,BRAND);
 attack(s,ally.uid);act(s,'noBlock');drain(s);
 assert.ok(brand.hyperActive);
 s.phase='main';
 const evolved=play(s,JAOGA);
 act(s,'evolve',a=>a.baseUid===brand.uid);
 if(s.decision?.type==='extended')pick(s,null);
 drain(s);
 assert.ok(s.players[0].battle.includes(evolved));
 assert.ok(!evolved.hyperActive);
});

test('Bazaga can generate a gear first, recross an attached gear, split them across allies, and stop',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE);
 const old=put(s,0,'battle',GEAR,{crossedTo:{uid:ally.uid,incarnation:0}});
 const unused=put(s,0,'battle',GEAR);
 const fresh=put(s,0,'hand',GEAR),bazaga=play(s,BAZAGA);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.task?.op==='g18_Generate');
 pick(s,fresh.uid);
 assert.equal(s.decision.task.op,'g18_ChooseFreeCross927');
 assert.ok(values(s).includes(old.uid)&&values(s).includes(fresh.uid));
 pick(s,old.uid);pick(s,bazaga.uid);
 assert.ok(!values(s).includes(old.uid));
 pick(s,fresh.uid);pick(s,ally.uid);
 pick(s,null);
 assert.equal(old.crossedTo.uid,bazaga.uid);
 assert.equal(fresh.crossedTo.uid,ally.uid);
 assert.equal(unused.crossedTo,undefined);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.equal(e.effectiveCard(bazaga,s).blocker,true);
 assert.equal(e.effectiveCard(bazaga,s).breaker,2);
});

test('four attached cross gears prevent Bazaga from leaving and three do not',()=>{
 for(const count of [3,4]){
  const s=field(),bazaga=put(s,1,'battle',BAZAGA);
  for(let i=0;i<count;i++)put(s,1,'battle',GEAR,{crossedTo:{uid:bazaga.uid,incarnation:0}});
  play(s,DEMON_HAND);drain(s);
  assert.equal(s.players[1].battle.includes(bazaga),count===4);
  assert.equal(s.players[1].grave.includes(bazaga),count===3);
 }
});

test('Gorgeous Earth reduces by five per allied Dragon creature down to five and keeps its printed combat keywords',()=>{
 const s=field(),c=e.card(EARTH);
 put(s,1,'battle',DRAGON);
 put(s,0,'battle',DRAGON,{sealed:true});
 put(s,0,'battle',NATURE,{under:[inst(DRAGON)]});
 for(let n=0;n<=6;n++){
  assert.equal(e.summonCost(s,0,c),Math.max(5,25-5*n));
  put(s,0,'battle',DRAGON);
 }
 const x=play(s,EARTH);
 const effective=e.effectiveCard(x,s);
 assert.ok(effective.speedAttacker&&effective.machFighter&&effective.justDiver&&effective.slayer);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Dragon World Breaker prepares each selected shield before all opposing shields break',()=>{
 const s=field();
 give(s,0,'shields',[]);
 give(s,1,'shields',[NATURE,NATURE,NATURE]);
 const top=s.players[0].deck.slice(0,3);
 const earth=put(s,0,'battle',EARTH);
 attack(s,earth.uid);act(s,'noBlock');
 assert.match(s.decision.title,/ドラゴン・ワールド・ブレイカー/);
 pick(s,'new');
 assert.equal(s.players[1].shields.length,3);
 pick(s,'stack');pick(s,top[0].uid);
 assert.equal(s.players[1].shields.length,3);
 pick(s,'new');
 drain(s);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[top[0].uid,top[2].uid]);
 assert.deepEqual(s.players[0].shields[0].shieldStack.map(x=>[x.uid,x.faceUp]),[[top[1].uid,true]]);
 assert.equal(s.players[1].shields.length,0);
});

test('an independent W Breaker does not add shields through Dragon World Breaker',()=>{
 const s=field();
 give(s,1,'shields',[NATURE,NATURE,NATURE]);
 const earth=put(s,0,'battle',EARTH,{g34Grants:[{turn:s.turn,breaker:2,g633DoubleBreaker:true}]});
 const before=s.players[0].deck.length;
 attack(s,earth.uid);act(s,'noBlock');
 assert.deepEqual(values(s),[2,'world']);
 pick(s,2);
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
 assert.equal(s.players[0].deck.length,before);
});
