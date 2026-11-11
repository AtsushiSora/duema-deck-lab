import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const POISON='dm22-014',SERGEANT='dm15-010',MURAMASA='dm06-095',PRINTS=['dmc64-021','dmex16-043'];
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GEAR='dm14-110',SHAMAN='dm16-033',DRAGON='dm08-045',DUAL='dm22ex1-007',NONARIS='dm16-s03';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const picks=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}

test('Phase 927 supports three complete card definitions and resolves both Sergeant reprints to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-927.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[POISON,SERGEANT,MURAMASA]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),PRINTS.map(id=>[id,SERGEANT]));
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:927}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:927}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===POISON?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId){assert.deepEqual(row.faces,original.faces);assert.equal(CARD_IMAGES[id],row.image);}
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase927',name:'連龍毒とタップ能力の検証',cards:[POISON,PRINTS[0],MURAMASA,LIGHT,WATER,DARK,FIRE,NATURE,GEAR,DRAGON].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Poison first destroys one, then selects an atomic group using current allied Dragon and Phoenix counts',()=>{
 let s=field();
 put(s,0,'battle',DRAGON);put(s,0,'battle',DUAL);
 put(s,0,'battle',FIRE,{under:[inst(DRAGON)]});
 const sealed=put(s,0,'battle',DRAGON,{sealed:true});put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 put(s,0,'battle',GEAR);
 const [first,second,third,other]=[FIRE,WATER,LIGHT,DRAGON].map(id=>put(s,1,'battle',id));
 const safe=put(s,1,'battle','dmrp05-028'); // 異端流し オニカマス
 play(s,POISON);const all=physical(s);
 assert.deepEqual(picks(s),[first,second,third,other].map(x=>x.uid));
 pick(s,first);
 assert.ok(find(s,1,'grave',first));
 assert.deepEqual(picks(s),[second,third,other].map(x=>x.uid));
 pick(s,second);
 assert.ok(find(s,1,'battle',second));
 assert.deepEqual(picks(s),[third.uid,other.uid]);
 s=restore(s);pick(s,third);drain(s);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[other.uid,safe.uid]);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[first.uid,second.uid,third.uid]);
 assert.deepEqual(physical(s),all);
});

test('Poison can choose the first creature again when EX Life replaces the first destruction',()=>{
 const s=field();
 put(s,0,'battle',DRAGON);
 const survivor=put(s,1,'battle','dmrp17-s07',{exLifeShieldUid:s.players[1].shields[0].uid});
 const other=put(s,1,'battle',FIRE);
 play(s,POISON);pick(s,survivor);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(find(s,1,'battle',survivor));
 assert.deepEqual(picks(s),[survivor.uid,other.uid]);
 pick(s,survivor);drain(s);
 assert.ok(find(s,1,'grave',survivor)&&find(s,1,'battle',other));
});

test('Poison with zero allied Dragons or Phoenixes destroys only one and can also resolve with no target',()=>{
 for(const count of [0,2]){
  const s=field();
  const enemies=Array.from({length:count},()=>put(s,1,'battle',FIRE));
  const spell=play(s,POISON);
  if(count)pick(s,enemies[0]);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].battle.length,Math.max(0,count-1));
  assert.ok(find(s,0,'grave',spell));
 }
});

test('Sergeant crosses either attached or unattached gear without paying mana, using the existing cross triggers',()=>{
 for(const attached of [false,true]){
  let s=field(),sergeant=put(s,0,'battle',SERGEANT),host=put(s,0,'battle',SHAMAN);
  const gear=put(s,0,'battle',GEAR),other=put(s,0,'battle',GEAR),enemy=put(s,1,'battle',GEAR);
  if(attached)act(s,'crossGear',a=>a.uid===gear.uid&&a.target===sergeant.uid);
  give(s,0,'mana',[]);
  s.phase='attack';const size=s.players[0].deck.length,all=physical(s);
  act(s,'tapAbility',a=>a.uid===sergeant.uid);
  assert.ok(find(s,0,'battle',sergeant).tapped&&!s.attack);
  assert.deepEqual(picks(s),[gear.uid,other.uid]);
  pick(s,gear);
  assert.deepEqual(picks(s),attached?[host.uid]:[sergeant.uid,host.uid]);
  s=restore(s);pick(s,host);drain(s);
  assert.deepEqual(find(s,0,'battle',gear).crossedTo,{uid:host.uid,incarnation:0});
  assert.equal(find(s,1,'battle',enemy).crossedTo,undefined);
  assert.equal(s.players[0].deck.length,size-1);
  assert.equal(s.players[0].mana.length,1);
  assert.ok(s.players[0].mana[0].tapped);
  assert.equal(e.power(find(s,0,'battle',host),false,s),e.card(SHAMAN).power+2000);
  assert.ok(!legal(s,'crossGear'));
  assert.deepEqual(physical(s),all);
 }
});

test('Sergeant is gated by the attack step, summoning sickness and compulsory attacks',()=>{
 const s=field(),sergeant=put(s,0,'battle',SERGEANT,{entered:s.turn});
 const tap=()=>legal(s,'tapAbility',a=>a.uid===sergeant.uid);
 put(s,0,'battle',GEAR);
 assert.ok(!tap());
 s.phase='attack';assert.ok(!tap());
 sergeant.entered=0;assert.ok(tap());
 const nonaris=put(s,1,'battle',NONARIS,{tapped:true});
 assert.ok(!tap());
 nonaris.tapped=false;assert.ok(tap());
});

test('Muramasa can tap on entry and grants only the chosen ally speed until turn end',()=>{
 const s=field(),muramasa=play(s,MURAMASA),fresh=play(s,FIRE),other=play(s,WATER);
 const enemy=put(s,1,'battle',DARK);
 s.phase='attack';
 const attacks=x=>legal(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 assert.ok(attacks(muramasa)&&!attacks(fresh)&&!attacks(other));
 act(s,'tapAbility',a=>a.uid===muramasa.uid);
 assert.deepEqual(picks(s),[muramasa.uid,fresh.uid,other.uid]);
 assert.ok(!picks(s).includes(enemy.uid));
 pick(s,fresh);
 assert.ok(e.effectiveCard(fresh,s).speedAttacker&&!e.effectiveCard(other,s).speedAttacker);
 assert.ok(attacks(fresh)&&!attacks(muramasa)&&!attacks(other));
 act(s,'endTurn');
 assert.ok(!e.effectiveCard(fresh,s).speedAttacker);
});
