import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CRES='dm13-037',OSSO='dmx10-002',JORO='dmex08-202';
const EVO='dm02-s02',BASE='dm01-049',NATURE='dm01-108',WYVERN='dm01-s07',SLAYER='dm01-088';
const DESTROY='dm01-027',CADDY='dm22rp1-049';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('three official cards preserve canonical IDs, complete printed data, images and limits',()=>{
 const m=read('tools/support-phase-1191.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[CRES,OSSO,JORO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations.filter(x=>x!=='無色'),f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1191}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1191}));
 }
});

test('Cres can attack tapped creatures and cannot attack the opposing player',()=>{
 const s=field(),cres=put(s,0,'battle',CRES),enemy=put(s,1,'battle',NATURE,{tapped:true});
 s.phase='attack';
 const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===cres.uid).map(a=>a.target);
 assert.deepEqual(targets,[enemy.uid]);
});

for(const mode of ['other evolution','attacking evolution','no evolution','evolution sealed','Cres ignored'])test('Cres compares power while blocking: '+mode,()=>{
 const s=field(),defender=put(s,1,'battle',CRES);
 if(mode==='Cres ignored')defender.g35Ignored=s.turn;
 const attacker=put(s,0,'battle',mode==='attacking evolution'?EVO:WYVERN);
 if(!['no evolution','attacking evolution'].includes(mode)){
  const evo=put(s,0,'battle',EVO,{under:[inst(BASE)]});
  if(mode==='evolution sealed'){
   evo.sealed=true;
   put(s,0,'seals',BASE,{faceDown:true,sealOf:evo.uid});
  }
 }
 assert.equal(e.power(defender,false,s),2000);
 if(mode==='Cres ignored'){
  assert.equal(e.effectiveCard(defender,s).g570BlockPower,undefined);
  return;
 }
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===defender.uid);
 drain(s);
 const boosted=['other evolution','attacking evolution'].includes(mode);
 assert.ok(has(s,0,boosted?'grave':'battle',attacker));
 assert.ok(has(s,1,boosted?'battle':'grave',defender));
 if(boosted)assert.equal(e.power(defender,false,s),2000);
});

test('Cres receives no bonus when attacked directly, even with an opposing evolution in play',()=>{
 const s=field(),cres=put(s,1,'battle',CRES,{tapped:true}),attacker=put(s,0,'battle',WYVERN);
 put(s,0,'battle',EVO);
 attack(s,attacker.uid,cres.uid);
 drain(s);
 assert.ok(has(s,1,'grave',cres));
});

test('Osso avoids effect selection on the opposing turn and is a legal target on its own turn',()=>{
 const s=field(),osso=put(s,1,'battle',OSSO),other=put(s,1,'battle',NATURE);
 cast(s,DESTROY);
 const targets=e.getLegalActions(s).flatMap(a=>a.targets||[]).map(x=>x.uid);
 assert.ok(targets.includes(other.uid));
 assert.ok(!targets.includes(osso.uid));
 act(s,'effect',a=>a.targets.some(x=>x.uid===other.uid));
 s.active=1;
 const ally=put(s,1,'battle',NATURE);
 s.extTasks=[{op:'g34_Target',p:0,source:DESTROY,to:'grave',filter:{creature:true}}];
 act(s,'toAttack');
 const choices=s.decision.choices.map(x=>x.value?.uid);
 assert.ok(choices.includes(osso.uid)&&choices.includes(ally.uid));
});

test('Osso can block, be attacked, and break two shields as printed',()=>{
 for(const mode of ['block','be attacked','breaker']){
  const s=field(),osso=put(s,mode==='breaker'?0:1,'battle',OSSO,{tapped:mode==='be attacked'});
  const enemy=put(s,mode==='breaker'?1:0,'battle',NATURE);
  attack(s,mode==='breaker'?osso.uid:enemy.uid,mode==='be attacked'?osso.uid:'player');
  if(mode==='block')act(s,'block',a=>a.uid===osso.uid);
  drain(s);
  if(mode==='breaker')assert.equal(s.players[1].shields.length,3);
  else assert.ok(has(s,0,'grave',enemy)&&has(s,1,'battle',osso));
 }
});

test('Jorogumo destroys the attacker before battle, bypasses selection protection and draws twice',()=>{
 let s=field();
 const joro=put(s,1,'battle',JORO),enemy=put(s,0,'battle',SLAYER,{justDiverActive:true});
 enemy.g34Grants=[{turn:s.turn,untargetable:true}];
 const top=s.players[1].deck.slice(0,2).map(x=>x.uid);
 attack(s,enemy.uid);
 s=restore(s);
 act(s,'block',a=>a.uid===joro.uid);
 drain(s);
 assert.ok(has(s,0,'grave',enemy));
 assert.ok(has(s,1,'battle',joro));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),top);
 assert.ok(!s.log.some(e=>e.type==='battle'));
});

test('Jorogumo still draws if the attacking creature replaces destruction',()=>{
 const s=field(),joro=put(s,1,'battle',JORO),enemy=put(s,0,'battle',CADDY);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===joro.uid);
 drain(s);
 assert.deepEqual(s.players[1].hand.length,2);
 assert.ok(has(s,0,'mana',enemy)&&has(s,1,'battle',joro));
});

test('Jorogumo cannot attack even if the opponent has a tapped creature',()=>{
 const s=field(),joro=put(s,0,'battle',JORO);
 put(s,1,'battle',NATURE,{tapped:true});
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===joro.uid));
});
