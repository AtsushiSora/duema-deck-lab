import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const WILD='dmr13-040',DESTRO='dmr14-s03',ZORO='dmr12-s04',ESPOIR='dmr13-001';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',DARK='dm01-090',BLOCKER='dm01-076';
const BOUNCE='dm01-086',DESTROY='dm01-027',TWIN='dmrp06-006',SIX='dm05-024',ORACLE='dmr10-034';
const YOMI='dmr12-s01',GOD='dmex17-059',EVO='dm02-033',GEAR='dm14-110',UNTOUCHABLE='dmr14-007';
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

test('Phase 994 registers four official definitions',()=>{
 const m=read('tools/support-phase-994.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[WILD,DESTRO,ZORO,ESPOIR]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:994}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:994}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-994');
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
const startTurn=(s,p)=>{s.active=p;s.phase='main';};
const ids=rows=>rows.map(x=>x.uid);
const bottom=(s,p,n)=>ids(s.players[p].deck.slice(-n));

test('Wild reveals three cards and compares printed creature costs on a twinpact',()=>{
 let s=field();
 give(s,0,'deck',[TWIN,ORACLE,SIX,...Array(15).fill(NATURE)]);
 const [twin,same,six]=s.players[0].deck,previous=physical(s);
 const spell=play(s,WILD);
 assert.deepEqual(choices(s),[twin.uid,same.uid,six.uid,null]);
 assert.ok(s.log.some(r=>[TWIN,ORACLE,SIX].every(id=>JSON.stringify(r).includes(e.card(id).name))));
 pick(s,twin.uid);s=restore(s);
 assert.deepEqual(choices(s),[six.uid,null]);
 pick(s,six.uid);drain(s);
 assert.deepEqual(ids(s.players[0].hand),[twin.uid,six.uid]);
 assert.deepEqual(bottom(s,0,1),[same.uid]);
 assert.deepEqual(physical(s).filter(uid=>uid!==spell.uid),previous);
});

test('Wild can take zero creatures, excludes spell-only cards, and orders all remaining cards',()=>{
 const s=field();
 give(s,0,'deck',[FIRE,BOUNCE,WATER,...Array(15).fill(NATURE)]);
 const [fire,spell,water]=s.players[0].deck;
 play(s,WILD);
 assert.deepEqual(choices(s),[fire.uid,water.uid,null]);
 pick(s,null);
 assert.deepEqual(choices(s),[fire.uid,spell.uid,water.uid]);
 pick(s,water.uid);pick(s,fire.uid);
 assert.deepEqual(bottom(s,0,3),[water.uid,fire.uid,spell.uid]);
 assert.deepEqual(s.players[0].hand,[]);
});

test('Destrokill recovers one Darkness creature and destroys one enemy on entry and attack',()=>{
 const s=field();
 const dark=put(s,0,'grave',DARK),twin=put(s,0,'grave',TWIN);
 const nature=put(s,0,'grave',NATURE),spell=put(s,0,'grave',DESTROY);
 const a=put(s,1,'battle',FIRE),b=put(s,1,'battle',WATER);
 const x=play(s,DESTRO);
 assert.deepEqual(choices(s),[dark.uid,twin.uid,null]);
 pick(s,dark.uid);pick(s,a.uid);
 assert.ok(has(s,0,'hand',dark)&&has(s,1,'grave',a));
 assert.equal(e.effectiveCard(x,s).breaker,3);
 x.entered=s.turn-1;
 attack(s,x.uid);
 assert.deepEqual(choices(s),[twin.uid,null]);
 pick(s,twin.uid);pick(s,b.uid);drain(s);
 assert.ok(has(s,0,'hand',twin)&&has(s,1,'grave',b));
 assert.ok(has(s,0,'grave',nature)&&has(s,0,'grave',spell));
});

test('Destrokill can recover without an enemy, but decline or lack of a Darkness creature prevents destruction',()=>{
 for(const mode of ['empty','decline','recover']){
  const s=field(),foe=mode==='recover'?null:put(s,1,'battle',FIRE);
  const dark=put(s,0,'grave',mode==='empty'?NATURE:DARK);
  play(s,DESTRO);
  if(mode!=='empty')pick(s,mode==='recover'?dark.uid:null);
  assert.equal(s.decision,null);
  if(foe)assert.ok(has(s,1,'battle',foe));
  assert.equal(has(s,0,'hand',dark),mode==='recover');
 }
});

for(const via of [BOUNCE,DESTROY])test('Solo Destrokill may discard exactly two creature cards for '+via,()=>{
 let s=field();startTurn(s,1);
 const x=put(s,0,'battle',DESTRO),first=put(s,0,'hand',FIRE),twin=put(s,0,'hand',TWIN),spell=put(s,0,'hand',BOUNCE);
 const sealed=put(s,0,'battle',WATER,{sealed:true});
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 play(s,via);targetCard(s,x);
 act(s,'replaceJashin');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='leaveHand').map(a=>a.uid),[first.uid,twin.uid]);
 act(s,'leaveHand',a=>a.uid===first.uid);s=restore(s);
 assert.ok(has(s,0,'hand',first));
 act(s,'leaveHand',a=>a.uid===twin.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'hand',spell));
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',twin));
});

test('Destrokill replacement requires no other creature and may be declined',()=>{
 for(const mode of ['ally','short','decline']){
  const s=field();startTurn(s,1);
  const x=put(s,0,'battle',DESTRO),a=put(s,0,'hand',FIRE),b=put(s,0,'hand',mode==='short'?BOUNCE:WATER);
  if(mode==='ally')put(s,0,'battle',FIRE);
  play(s,BOUNCE);targetCard(s,x);
  if(mode==='decline')act(s,'allowLeave');
  assert.equal(s.decision,null,mode);
  assert.ok([x,a,b].every(y=>has(s,0,'hand',y)),mode);
 }
});

test('Zoro taps as mana and accepts only an Oracle evolution base',()=>{
 const s=field();
 const base=put(s,0,'battle',ORACLE);
 put(s,0,'battle',YOMI);put(s,0,'battle',GOD);put(s,0,'battle',FIRE);
 play(s,ZORO);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 const charged=field(),x=put(charged,0,'hand',ZORO);
 charged.phase='charge';
 act(charged,'charge',a=>a.uid===x.uid);
 assert.equal(charged.players[0].mana.find(y=>y.uid===x.uid).tapped,true);
});

test('Zoro moves both sides simultaneously and each owner orders its own moved cards and layers',()=>{
 let s=field();
 const base=put(s,0,'battle',ORACLE),ownA=put(s,0,'battle',FIRE),ownB=put(s,0,'battle',WATER);
 const protectedGod=put(s,1,'battle',GOD),protectedOraclion=put(s,1,'battle',YOMI),protectedOracle=put(s,1,'battle',ORACLE);
 const foeA=put(s,1,'battle',UNTOUCHABLE),foeB=put(s,1,'battle',EVO,{under:[inst(NATURE)]});
 const under=foeB.under[0];
 const gear=put(s,1,'battle',GEAR),sealed=put(s,1,'battle',WATER,{sealed:true});
 put(s,1,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 const x=play(s,ZORO);
 const before=physical(s);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(choices(s)),new Set([ownA.uid,ownB.uid]));
 assert.ok([foeA,foeB].every(y=>!has(s,1,'battle',y)));
 assert.deepEqual(ids(s.players[0].battle),[x.uid]);
 pick(s,ownB.uid);s=restore(s);
 assert.deepEqual(bottom(s,0,2),[ownB.uid,ownA.uid]);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(choices(s)),new Set([foeA.uid,foeB.uid,under.uid]));
 pick(s,under.uid);pick(s,foeA.uid);
 assert.deepEqual(bottom(s,1,3),[under.uid,foeA.uid,foeB.uid]);
 assert.ok([protectedGod,protectedOraclion,protectedOracle,gear,sealed].every(y=>has(s,1,'battle',y)));
 const zoro=s.players[0].battle[0];
 assert.equal(zoro.under[0].uid,base.uid);
 assert.equal(e.effectiveCard(zoro,s).breaker,3);
 assert.deepEqual(physical(s),before);
});

test('Espoir counts itself and another blocker, ignores seals, and taps before blocks',()=>{
 const s=field(),x=put(s,0,'battle',ESPOIR);
 put(s,0,'battle',BLOCKER,{tapped:true});
 const sealed=put(s,0,'battle',BLOCKER,{sealed:true});
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 put(s,0,'battle',NATURE);
 const a=put(s,1,'battle',BLOCKER),b=put(s,1,'battle',BLOCKER),c=put(s,1,'battle',WATER),safe=put(s,1,'battle',UNTOUCHABLE);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(act=>act.kind==='attack'&&act.uid===x.uid&&act.target===a.uid));
 assert.equal(e.effectiveCard(x,s).blocker,true);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 attack(s,x.uid);
 assert.deepEqual(choices(s),[a.uid,b.uid,c.uid,null]);
 pick(s,a.uid);pick(s,b.uid);drain(s);
 assert.ok(a.tapped&&b.tapped&&!c.tapped&&!safe.tapped);
 assert.equal(s.players[1].shields.length,3);
});

test('Espoir can decline to tap and leaves the declared attack target unchanged',()=>{
 const s=field(),x=put(s,0,'battle',ESPOIR),foe=put(s,1,'battle',BLOCKER);
 attack(s,x.uid);
 assert.equal(s.attack.target,'player');
 pick(s,null);
 assert.equal(s.attack.target,'player');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===foe.uid));
});
