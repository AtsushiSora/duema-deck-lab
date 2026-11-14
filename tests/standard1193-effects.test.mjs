import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ARMOR='dm22-023',BOLZARD='dm24ex4-090',PROMO='promoy23-118',GALAXY='dmrp13-085';
const SMALL='dm01-108',FIRE='dm01-097',DEMON='dm01-027',CADDY='dm22rp1-049';
const NO_DISCOUNT='dmrp22-027',SEED='dm22ex2-050',HOLY='dm01-015';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('three official cards and one reprint preserve canonical IDs, complete printed data, images and limits',()=>{
 const m=read('tools/support-phase-1193.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[ARMOR,BOLZARD,GALAXY]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[PROMO,BOLZARD]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.civilizations.filter(x=>x!=='無色'),f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1193}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1193}));
 }
});

const values=s=>s.decision?.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function invoke(s,source,...defs){
 s.phase='main';
 s.extTasks=[{op:'g34_Sequence',p:s.active,source,defs}];
 act(s,'toAttack');
}
function exact(s,p,x,to='grave'){
 invoke(s,DEMON,{op:'ExactMove',owner:p,target:x.uid,to,filter:{element:true}});
}
function next(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
}
function playBolzard(s){
 const x=put(s,0,'hand',BOLZARD);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Armor protects its current and later creatures for this turn against destruction only',()=>{
 const s=field();
 const old=put(s,0,'battle',SMALL),enemy=put(s,1,'battle',SMALL),seed=put(s,0,'battle',SEED);
 const later=put(s,0,'hand',SMALL),bounce=put(s,0,'battle',SMALL);
 cast(s,ARMOR);
 act(s,'play',a=>a.uid===later.uid);
 exact(s,0,bounce,'hand');
 assert.ok(has(s,0,'hand',bounce));
 invoke(s,DEMON,{op:'Sweep',both:true,to:'grave',element:true});
 assert.ok(has(s,0,'battle',old)&&has(s,0,'battle',later));
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'grave',seed));
 next(s);
 exact(s,0,old);
 assert.ok(has(s,0,'grave',old)&&has(s,0,'battle',later));
});

for(const mode of ['stay','mana'])test('Armor competes with another mandatory destruction replacement: '+mode,()=>{
 let s=field();
 const caddy=put(s,0,'battle',CADDY);
 cast(s,ARMOR);
 exact(s,0,caddy);
 assert.equal(s.decision?.type,'leaveReplace');
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceStay577','replaceYamata']);
 s=restore(s);
 act(s,mode==='stay'?'replaceStay577':'replaceYamata');
 assert.ok(has(s,0,mode==='stay'?'battle':'mana',caddy));
 assert.ok(!has(s,0,'grave',caddy));
});

test('Armor allows a competing return to hand, with no option to destroy the creature',()=>{
 const s=field(),ally=put(s,0,'battle','dm23-024');
 cast(s,ARMOR);
 exact(s,0,ally);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceOmega','replaceStay577']);
 act(s,'replaceOmega');
 assert.ok(has(s,0,'hand',ally));
});

test('Armor remains applicable at zero power and expires before the next turn',()=>{
 const s=field(),small=put(s,0,'battle',SMALL);
 cast(s,ARMOR);
 small.powerModifiers=[{amount:-2000}];
 act(s,'toAttack');
 assert.equal(e.power(small,false,s),0);
 assert.ok(has(s,0,'battle',small));
 next(s);
 assert.ok(has(s,0,'grave',small));
});

test('Armor shields an allied creature from battle loss after being cast as a Shield Trigger',()=>{
 const s=field(),ally=put(s,1,'battle',SMALL,{tapped:true});
 give(s,1,'shields',[ARMOR]);
 const breaker=put(s,0,'battle',SMALL),strong=put(s,0,'battle','dmx22b-009');
 attack(s,breaker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 drain(s);
 assert.equal(s.metrics[1].triggers,1);
 attack(s,strong.uid,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'battle',ally));
});

test('Armor’s resolved spell effect is suppressed by Genmu Emperor',()=>{
 const s=field(),ally=put(s,0,'battle',SMALL);
 cast(s,ARMOR);
 put(s,1,'battle',GEN);
 exact(s,0,ally);
 assert.ok(has(s,0,'grave',ally));
});

for(const reduction of [0,1])test('Bolzard pays the chosen cost and only its own reduction causes a shield break: '+reduction,()=>{
 let s=field();
 give(s,0,'shields',[HOLY,SMALL]);
 const [trigger,untouched]=s.players[0].shields;
 put(s,1,'battle',SMALL);
 const x=playBolzard(s);
 assert.ok(values(s).includes(0)&&values(s).includes(1));
 s=restore(s);
 pick(s,reduction);
 assert.equal(tapped(s,0),5-reduction);
 if(reduction){
  assert.deepEqual(values(s),[trigger.uid,untouched.uid]);
  pick(s,trigger.uid);
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  drain(s);
  assert.equal(s.metrics[0].triggers,1);
  assert.ok(s.players[1].battle[0].tapped);
  assert.ok(has(s,0,'grave',trigger));
 }
 assert.equal(s.players[0].shields.length,2-reduction);
 assert.ok(has(s,0,'shields',untouched)&&has(s,0,'battle',x));
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});

test('Bolzard excludes unaffordable payment choices and can cancel without paying',()=>{
 const s=field();
 give(s,0,'mana',Array(4).fill(FIRE));
 const x=playBolzard(s);
 assert.deepEqual(values(s),[1,false]);
 pick(s,false);
 assert.equal(tapped(s,0),0);
 assert.ok(has(s,0,'hand',x));
 assert.equal(s.players[0].shields.length,5);
});

test('Bolzard skips the break for free deployment or a reduction prohibition',()=>{
 for(const free of [false,true]){
  const s=field();
  if(free){
   put(s,0,'hand',BOLZARD);
   invoke(s,DEMON,{op:'Select',origin:'hand',n:1,deploy:true,filter:{exactId:BOLZARD}});
   drain(s);
  }else{
   put(s,1,'battle',NO_DISCOUNT);
   playBolzard(s);
  }
  assert.equal(tapped(s,0),free?0:5);
  assert.ok(!s.decision&&s.players[0].battle.some(x=>x.cardId===BOLZARD));
  assert.equal(s.players[0].shields.length,5);
 }
});

test('Another creature’s cost reduction does not cause Bolzard to break a shield',()=>{
 const s=field();
 put(s,0,'battle','dmbd15-006');
 const x=playBolzard(s);
 pick(s,0);
 assert.equal(tapped(s,0),3);
 assert.ok(has(s,0,'battle',x)&&!s.decision);
 assert.equal(s.players[0].shields.length,5);
});

test('Bolzard can still summon with the reduction when there is no shield',()=>{
 const s=field();
 give(s,0,'shields',[]);
 const x=playBolzard(s);
 pick(s,1);
 assert.ok(has(s,0,'battle',x)&&!s.decision);
 assert.equal(tapped(s,0),4);
});

function breakOwnShield(s,uid){
 invoke(s,DEMON,{op:'Break497',owner:'self',n:1});
 if(s.decision?.task?.op==='g34_Break497')pick(s,uid);
}
test('Galaxy gives all cards of the chosen shield a trigger, draws once and leaves other shields unmodified',()=>{
 let s=field();
 const [root,other]=s.players[0].shields;
 const under=inst(SMALL),later=inst(SMALL),top=s.players[0].deck[0];
 root.shieldStack=[under];
 cast(s,GALAXY);
 assert.equal(s.players[0].hand.length,0);
 s=restore(s);
 pick(s,root.uid);
 assert.ok(has(s,0,'hand',top));
 const chosen=s.players[0].shields.find(x=>x.uid===root.uid);
 chosen.shieldStack.push(later);
 breakOwnShield(s,other.uid);
 assert.ok(!s.decision&&has(s,0,'hand',other)&&s.metrics[0].triggers===0);
 breakOwnShield(s,root.uid);
 for(const uid of [root.uid,under.uid])act(s,'useTrigger',a=>a.uid===uid);
 drain(s);
 assert.ok(has(s,0,'battle',root)&&has(s,0,'battle',under)&&has(s,0,'hand',later));
 assert.equal(s.metrics[0].triggers,2);
});

for(const mode of ['opponent','next own','Genmu'])test('Galaxy trigger duration and suppression: '+mode,()=>{
 let s=field();
 const root=s.players[0].shields[0];
 cast(s,GALAXY);
 pick(s,root.uid);
 if(mode==='Genmu'){
  put(s,1,'battle',GEN);
  breakOwnShield(s,root.uid);
 }else{
  next(s);
  if(mode==='next own'){
   next(s);
   s.phase='main';
   breakOwnShield(s,root.uid);
  }else{
   s.players[0].shields=s.players[0].shields.filter(x=>x.uid===root.uid);
   const attacker=put(s,1,'battle',SMALL);
   attack(s,attacker.uid);
   act(s,'noBlock');
   s=restore(s);
   act(s,'useTrigger',a=>a.uid===root.uid);
   drain(s);
  }
 }
 const fired=mode==='opponent';
 assert.equal(s.metrics[0].triggers,fired?1:0);
 assert.ok(has(s,0,fired?'battle':'hand',root));
});

test('Galaxy draws even with no shield to choose',()=>{
 const s=field();
 give(s,0,'shields',[]);
 const top=s.players[0].deck[0];
 cast(s,GALAXY);
 assert.ok(!s.decision&&has(s,0,'hand',top));
});
