import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TWIN='dm24ex2-060',DRAG='dm08-015',JACK='dm30-031',MISS='dmx07-001',DEATH='dmx08-002';
const NATURE='dm01-108',DRAGON='dm01-s08',ALIEN='dmr02-054',ALIEN_EVO='dmx05-s02';
const DESTROY='dm01-027',HEAVY='dmex17-033',METAL='dmex17-059',RAPIA='dmx21-058';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1184.json',import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const value=c=>c.value?.uid??c.value;
const picks=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face&&!a.alternative);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pass=s=>{s.phase='attack';act(s,'endTurn');};

test('the six official prints resolve to four distinct playable names',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[TWIN,JACK,MISS,DEATH]);
 assert.deepEqual(manifest.printAliases.map(x=>x.canonicalId),[JACK,JACK]);
 assert.notEqual(registry.get(DRAG).id,registry.get(TWIN).id);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1184}),row.spec);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.limit],[f.cost,Number(f.powerText),f.race,f.civilizations,manifest.regulationVerification.limits[row.id]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  const changed=structuredClone(row);changed.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec({...changed,status:'complete'},{phase:1184}));
 }
 assert.equal(e.card(TWIN).spellFace.trigger,true);
 assert.equal(e.card(JACK).text,manifest.cards[1].currentPrint.faces[0].abilityText);
});

test('the Twinpact creature deploys a Dragon when destroyed',()=>{
 const s=field(1),source=add(s,0,'battle',TWIN),dragon=add(s,0,'hand',DRAGON);
 add(s,0,'hand',NATURE);
 play(s,add(s,1,'hand',DESTROY));
 act(s,'effect',a=>a.targets.some(t=>t.uid===source.uid));
 assert.deepEqual(picks(s),[dragon.uid,null]);pick(s,dragon.uid);drain(s);
 assert.ok(has(s,0,'battle',dragon)&&has(s,0,'grave',source));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('the spell uses only the front name, across players, without selecting protected creatures',()=>{
 const s=field(),twin=add(s,0,'battle',TWIN),single=add(s,1,'battle',DRAG);
 const petro=[add(s,0,'battle','dm09-s01'),add(s,1,'battle','dm09-s01')];
 const lone=add(s,0,'battle',NATURE),hidden=add(s,1,'battle',NATURE,{sealed:true});
 s.players[1].seals.push({...inst(NATURE),sealOf:hidden.uid,faceDown:true});
 const spell=add(s,0,'hand',TWIN),all=physical(s);
 play(s,spell,1);drain(s);
 for(const [p,x] of [[0,twin],[1,single],[0,petro[0]],[1,petro[1]]])assert.ok(has(s,p,'grave',x));
 assert.ok(has(s,0,'battle',lone)&&has(s,1,'battle',hidden)&&has(s,0,'grave',spell));
 assert.deepEqual(physical(s),all);
});

test('the shield spell sees a shared linked God name and uses the usual unlink choice',()=>{
 const s=field(1),attacker=add(s,1,'battle',NATURE);
 const root=add(s,0,'battle',METAL),part=inst(HEAVY),other=add(s,1,'battle',HEAVY);
 root.godLinks=[part];
 give(s,0,'shields',[TWIN]);
 const [shield]=s.players[0].shields,all=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===1);
 act(s,'godLeave',a=>a.uid===root.uid);
 drain(s);
 assert.ok(has(s,0,'grave',root)&&has(s,0,'battle',part)&&has(s,1,'grave',other));
 assert.ok(has(s,1,'battle',attacker));
 assert.deepEqual(physical(s),all);
});

test('Jack’s search uses exact shared races and can recover or decline before shuffling',()=>{
 for(const accept of [false,true]){
  let s=field();
  const [same,prefix,nonEvo,samurai]=['dmc62-002','dmr02-s04',DRAGON,'dm30-009'].map(inst);
  s.players[0].deck=[same,prefix,nonEvo,samurai,inst(NATURE),inst(NATURE)];
  const jack=add(s,0,'hand',JACK),all=physical(s),before=s.rng;
  play(s,jack);
  assert.deepEqual(picks(s),[same.uid,samurai.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,accept?same.uid:null);
  assert.equal(has(s,0,'hand',same),accept);
  assert.equal(has(s,0,'deck',same),!accept);
  assert.ok(!s.players[0].g34Protected?.length);
  assert.notDeepEqual(s.rng,before);
  assert.deepEqual(physical(s),all);
 }
});

test('Jack’s search uses races granted to the active creature',()=>{
 const s=field();
 add(s,0,'battle',RAPIA);
 const phe=inst('dm22-s01'),other=inst('dmr02-s04');
 s.players[0].deck=[phe,other,inst(NATURE)];
 play(s,add(s,0,'hand',JACK));
 assert.deepEqual(picks(s),[phe.uid,other.uid,null]);
 pick(s,phe.uid);
 assert.ok(has(s,0,'hand',phe));
});

test('Missokatsu revives only an eligible Alien at the beginning of its own turn',()=>{
 const s=field(),miss=add(s,0,'battle',MISS),alien=add(s,0,'grave',ALIEN);
 add(s,0,'grave',NATURE);
 const evo=add(s,0,'grave',ALIEN_EVO);
 assert.equal(e.effectiveCard(miss,s).breaker,2);
 pass(s);assert.equal(s.decision,null);
 pass(s);assert.equal(s.decision?.player,0);
 assert.deepEqual(picks(s),[alien.uid,evo.uid,null]);
 pick(s,evo.uid);pick(s,miss.uid);drain(s);
 assert.ok(has(s,0,'grave',alien));
 assert.equal(s.players[0].battle.find(x=>x.uid===evo.uid)?.under[0].uid,miss.uid);
});

test('Missokatsu may decline and cannot take an Alien from a locked graveyard',()=>{
 for(const locked of [false,true]){
  const s=field(1),alien=add(s,0,'grave',ALIEN);
  add(s,0,'battle',MISS);
  if(locked)add(s,1,'battle','dmrp08-014');
  pass(s);
  if(!locked)pick(s,null);
  assert.ok(has(s,0,'grave',alien));
  assert.equal(s.decision,null);
 }
});

test('Death Six destroys each side’s creatures costing at most six in one batch',()=>{
 const s=field(),own=add(s,0,'battle',DRAG),enemy=add(s,1,'battle','dm01-001');
 const higher=add(s,1,'battle',MISS),seed=add(s,1,'battle','dm25rp4-013');
 const dragon=add(s,0,'hand',DRAGON),source=add(s,0,'hand',DEATH),all=physical(s);
 play(s,source);
 assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',enemy));
 assert.ok(has(s,1,'battle',higher)&&has(s,1,'battle',seed));
 pick(s,dragon.uid);drain(s);
 assert.ok(has(s,0,'battle',dragon));
 assert.equal(e.effectiveCard(source,s).breaker,2);
 assert.deepEqual(physical(s),all);
});

test('Jack retains the last races when an earlier trigger destroys its source',()=>{
 const s=field(1),phoenix=inst('dm22-s01'),jack=add(s,0,'hand',JACK);
 add(s,0,'battle',RAPIA);
 const drag=add(s,0,'battle',DRAG);
 add(s,1,'battle','dm24ex1-019');
 give(s,0,'mana',[]);
 s.players[0].deck=[phoenix,inst(NATURE),inst(NATURE)];
 play(s,add(s,1,'hand',DESTROY));
 act(s,'effect',a=>a.targets.some(t=>t.uid===drag.uid));
 pick(s,jack.uid);
 assert.ok(has(s,0,'grave',jack));
 assert.deepEqual(picks(s),[phoenix.uid,null]);
 pick(s,phoenix.uid);
 assert.ok(has(s,0,'hand',phoenix));
});

test('the spell completes all simultaneous moves when one namesake uses a destruction replacement',()=>{
 const s=field(),first=add(s,0,'battle',MISS),second=add(s,1,'battle',MISS);
 const saver=add(s,1,'battle','dmrp04s-m02');
 const [shield]=s.players[1].shields;
 shield.faceUp=true;
 play(s,add(s,0,'hand',TWIN),1);
 act(s,'replaceSavak',a=>a.shieldCard===shield.uid);
 drain(s);
 assert.ok(has(s,0,'grave',first)&&has(s,1,'battle',second)&&has(s,1,'battle',saver));
 assert.ok(has(s,1,'grave',shield));
});
