import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GRATONY='dmr13-024',HEAT='dmr13-064',DOGATSU='dmr14-s04',SUPERBIA='dmr13-006';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',BOUNCE='dm01-086';
const GAIGLEN='dmr14-v02',PTERA='dmr13-065',BOLSHACK='dm01-008',MULTI='dm25bd3-020';
const EX='dmrp17-s07',UNTOUCHABLE='dmr14-007';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 995 registers four official definitions',()=>{
 const m=read('tools/support-phase-995.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GRATONY,HEAT,DOGATSU,SUPERBIA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:995}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:995}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-995');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

const targetCard=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
const withPower=(s,p,n)=>put(s,p,'battle',FIRE,{powerModifiers:[{amount:n-e.card(FIRE).power}]});

test('Gratony chooses its own creatures together and draws for EX Life replacement',()=>{
 let s=field();
 const x=put(s,0,'battle',GRATONY),ordinary=put(s,0,'battle',FIRE);
 const shield=s.players[0].shields[0],protectedUnit=put(s,0,'battle',EX,{exLifeShieldUid:shield.uid});
 const sealed=put(s,0,'battle',WATER,{sealed:true});
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 const foe=put(s,1,'battle',WATER),before=physical(s);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 attack(s,x.uid);
 assert.deepEqual(choices(s),[x.uid,ordinary.uid,protectedUnit.uid,null]);
 pick(s,ordinary.uid);s=restore(s);
 assert.ok(has(s,0,'battle',ordinary)&&has(s,0,'battle',protectedUnit));
 pick(s,protectedUnit.uid);pick(s,null);drain(s);
 assert.ok(has(s,0,'grave',ordinary)&&has(s,0,'grave',shield));
 assert.ok(has(s,0,'battle',protectedUnit)&&has(s,1,'battle',foe));
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.players[0].deck.length,16);
 assert.deepEqual(physical(s),before);
});

for(const mode of ['none','self'])test('Gratony may choose zero or destroy itself, '+mode,()=>{
 const s=field(),x=put(s,0,'battle',GRATONY);
 attack(s,x.uid);
 pick(s,mode==='self'?x.uid:null);drain(s);
 assert.equal(has(s,0,'grave',x),mode==='self');
 assert.equal(s.players[0].hand.length,mode==='self'?2:0);
 assert.equal(s.players[1].shields.length,mode==='self'?5:3);
});

test('Heat Training targets an allied creature and counts current Fire cards only during attacks',()=>{
 const s=field(),x=put(s,0,'battle',FIRE),other=put(s,0,'battle',NATURE);
 const foe=put(s,1,'battle',WATER),fire=put(s,0,'grave',FIRE);
 put(s,0,'grave',WATER);put(s,1,'grave',FIRE);
 const spell=play(s,HEAT);
 assert.deepEqual(choices(s),[x.uid,other.uid]);
 pick(s,x.uid);
 const printed=e.card(FIRE).power;
 assert.equal(e.power(x,false,s),printed);
 assert.equal(e.power(x,true,s),printed+2000);
 put(s,0,'grave',MULTI);
 assert.equal(e.power(x,true,s),printed+3000);
 assert.equal(e.power(foe,true,s),e.card(WATER).power);
 assert.ok(has(s,0,'grave',fire)&&has(s,0,'grave',spell));
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(x,true,s),printed);
});

test('Two Heat Training grants stack with Bolshack Dragon and survive saved continuation',()=>{
 let s=field();const x=put(s,0,'battle',BOLSHACK);
 play(s,HEAT);pick(s,x.uid);play(s,HEAT);pick(s,x.uid);
 s=restore(s);const saved=s.players[0].battle[0];
 assert.equal(e.power(saved,true,s),e.card(BOLSHACK).power+6000);
 assert.equal(e.power(saved,false,s),e.card(BOLSHACK).power);
});

test('Dogatsu needs two live allied Dragons and inherits a tapped base',()=>{
 let s=field();
 const first=put(s,0,'battle',GAIGLEN),sealed=put(s,0,'battle',PTERA,{sealed:true});
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});put(s,1,'battle',BOLSHACK);
 put(s,0,'battle',FIRE);
 const x=put(s,0,'hand',DOGATSU);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
 const second=put(s,0,'battle',PTERA,{tapped:true}),before=physical(s);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(choices(s).filter(v=>v===first.uid||v===second.uid),[first.uid,second.uid]);
 pick(s,first.uid);s=restore(s);
 assert.ok(!choices(s).includes(first.uid));
 pick(s,second.uid);drain(s);
 const unit=s.players[0].battle.find(y=>y.uid===x.uid);
 assert.deepEqual(unit.under.map(y=>y.uid),[first.uid,second.uid]);
 assert.equal(unit.tapped,true);
 assert.equal(e.effectiveCard(unit,s).breaker,3);
 assert.deepEqual(physical(s),before);
});

test('Dogatsu compares current attacking power and destroys at most two eligible enemies',()=>{
 const s=field(),x=put(s,0,'battle',DOGATSU);
 const weak=withPower(s,1,10000),middle=withPower(s,1,15000),other=withPower(s,1,15500),equal=withPower(s,1,16000);
 const protectedUnit=put(s,1,'battle',UNTOUCHABLE),ally=withPower(s,0,2000);
 give(s,1,'mana',[]);
 play(s,HEAT);pick(s,x.uid);
 assert.equal(e.power(x,false,s),15000);
 attack(s,x.uid);
 assert.deepEqual(choices(s),[weak.uid,middle.uid,other.uid,null]);
 pick(s,middle.uid);assert.ok(has(s,1,'battle',middle));
 pick(s,other.uid);drain(s);
 assert.ok([weak,equal,protectedUnit].every(y=>has(s,1,'battle',y)));
 assert.ok(has(s,0,'battle',ally));
 assert.ok(has(s,1,'grave',middle)&&has(s,1,'grave',other));
 assert.equal(s.players[1].shields.length,2);
});

test('Dogatsu may decline every destruction and excludes equal power without Training',()=>{
 const s=field(),x=put(s,0,'battle',DOGATSU);
 const weak=withPower(s,1,14999),equal=withPower(s,1,15000);
 attack(s,x.uid);
 assert.deepEqual(choices(s),[weak.uid,null]);
 pick(s,null);drain(s);
 assert.ok(has(s,1,'battle',weak)&&has(s,1,'battle',equal));
});

test('Superbia stops its own direct attack from winning without leaving a pending win',()=>{
 const s=field(),x=put(s,0,'battle',SUPERBIA),ally=put(s,0,'battle',FIRE);
 give(s,1,'shields',[]);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 attack(s,x.uid);drain(s);
 assert.equal(s.winner,null);assert.equal(s.attack,null);
 s.phase='main';play(s,BOUNCE);targetCard(s,x);
 assert.equal(s.winner,null);
 attack(s,ally.uid);drain(s);
 assert.equal(s.winner,0);
});

test('Superbia protects an empty opposing deck until it leaves',()=>{
 const s=field(),x=put(s,0,'battle',SUPERBIA);
 give(s,1,'deck',[]);
 play(s,BOUNCE);targetCard(s,x);drain(s);
 assert.equal(s.winner,0);
 assert.ok(has(s,0,'hand',x));
});

test('Superbia neither protects its own controller nor works while sealed',()=>{
 for(const mode of ['opponentAttack','sealed']){
  const s=field(),x=put(s,0,'battle',SUPERBIA);
  if(mode==='sealed'){
   x.sealed=true;put(s,0,'seals',NATURE,{faceDown:true,sealOf:x.uid});
   give(s,1,'deck',[]);act(s,'toAttack');
   assert.equal(s.winner,0);
  }else{
   s.active=1;give(s,0,'shields',[]);
   const foe=put(s,1,'battle',FIRE);
   attack(s,foe.uid);drain(s);assert.equal(s.winner,1);
  }
 }
});
