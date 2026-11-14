import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const EED='dm23rp1-017',PAT='dm23rp3-046',HARIA='dm22rp1-027';
const SMALL='dm01-108',DESTROY='dm01-027',BOUNCE='dm01-086';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const add=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const clone=s=>JSON.parse(JSON.stringify(s));
function pass(s){s.phase='attack';act(s,'endTurn');}
function noBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}

test('five official prints resolve to the three active IDs and share four-copy limits',()=>{
 const m=read('support-phase-1216.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[EED,PAT,HARIA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23sp1-009',EED],['promoy22-001',EED]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:1216}),row.spec);
  for(const i of d.faces.keys()){
   const changed=structuredClone(d);
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1216}));
  }
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual(e.playFaces(c).map(f=>[f.type,f.cost,f.race,f.civilizations]),
   row.faces.map((f,i)=>[i?'spell':'creature',f.cost,f.race,f.civilizations]));
  assert.deepEqual([c.manaValue,c.limit,m.regulationVerification.limits[row.id]],[1,4,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

function castSide(s,x,face=1){act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);}
function startTrigger(s,id){
 s.active=1;
 give(s,0,'shields',[id]);
 const attacker=add(s,1,'battle',SMALL),source=s.players[0].shields[0];
 attack(s,attacker.uid);noBlock(s);
 act(s,'useTrigger',a=>a.uid===source.uid&&a.face===1);
 return {attacker,source};
}
const attacks=(s,x,target='player')=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
function ready(s){if(s.phase==='charge')act(s,'skipCharge');s.phase='attack';}

test('Eed destroys one opposing creature on entry and may recover any own grave card during an attack',()=>{
 let s=field();
 const eed=add(s,0,'hand',EED),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',SMALL);
 const recovery=add(s,0,'grave',BOUNCE),other=add(s,1,'grave',SMALL);
 castSide(s,eed,0);
 assert.deepEqual(values(s),[enemy.uid]);pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',ally));
 s.turn++;
 attack(s,eed.uid);assert.deepEqual(values(s),[recovery.uid,null]);
 s=clone(s);pick(s,recovery.uid);
 assert.ok(has(s,0,'hand',recovery)&&has(s,1,'grave',other));
 noBlock(s);
 const triple=e.getLegalActions(s).find(a=>a.kind==='breakShields'&&a.shields.length===3);
 assert.ok(triple);e.step(s,triple);
 assert.equal(s.players[1].shields.length,2);
});

test('Eed may decline the attack recovery, while its spell side mills exactly the top two cards',()=>{
 const s=field(),eed=add(s,0,'battle',EED),spell=add(s,0,'hand',EED);
 const [first,second,third]=s.players[0].deck;
 castSide(s,spell);
 assert.deepEqual(ids(s.players[0].grave),[first.uid,second.uid,spell.uid]);
 assert.equal(s.players[0].deck[0].uid,third.uid);
 attack(s,eed.uid);pick(s,null);noBlock(s);drain(s);
 assert.equal(s.players[0].hand.length,0);
});

test('Patfar can choose itself or either player’s creature, and prevents destruction and bounce until its caster’s next turn',()=>{
 for(const side of [0,1]){
  let s=field();
  const pat=add(s,0,'hand',PAT),victim=add(s,side,'battle',SMALL);
  castSide(s,pat,0);
  assert.deepEqual(new Set(values(s)),new Set([pat.uid,victim.uid]));
  pick(s,victim.uid);s=clone(s);
  play(s,add(s,0,'hand',BOUNCE));target(s,victim);
  assert.ok(has(s,side,'battle',victim));
  pass(s);if(s.phase==='charge')act(s,'skipCharge');
  if(side===0){
   play(s,add(s,1,'hand',DESTROY));target(s,victim);
   assert.ok(has(s,0,'battle',victim));
  }
  pass(s);if(s.phase==='charge')act(s,'skipCharge');
  play(s,add(s,0,'hand',BOUNCE));target(s,victim);
  assert.ok(has(s,side,'hand',victim)&&!has(s,side,'battle',victim));
 }
});

test('Silent Siren destroys an opposing creature as an S Trigger without paying mana',()=>{
 const s=field(),{attacker,source}=startTrigger(s,PAT);
 assert.deepEqual(values(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'grave',source));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Haria cannot attack players but can attack tapped creatures',()=>{
 const s=field(),haria=add(s,0,'battle',HARIA),victim=add(s,1,'battle',SMALL,{tapped:true});
 s.phase='attack';
 assert.ok(!attacks(s,haria)&&attacks(s,haria,victim.uid));
});

test('Haria untaps on its first block, remains tapped after the second, and resets next turn',()=>{
 const s=field(),haria=add(s,1,'battle',HARIA);
 const [one,two,three]=Array.from({length:3},()=>add(s,0,'battle',SMALL));
 attack(s,one.uid);act(s,'block',a=>a.uid===haria.uid);
 assert.ok(has(s,0,'grave',one));assert.equal(haria.tapped,false);
 attack(s,two.uid);act(s,'block',a=>a.uid===haria.uid);
 assert.ok(has(s,0,'grave',two));assert.equal(haria.tapped,true);
 pass(s);pass(s);ready(s);
 attack(s,three.uid);act(s,'block',a=>a.uid===haria.uid);
 assert.ok(has(s,0,'grave',three));assert.equal(haria.tapped,false);
});

test('only the final blocker counts when two defense abilities redirect an attack',()=>{
 for(const required of [false,true])for(const hariaLast of [false,true]){
  let s=field();
  const haria=add(s,1,'battle',HARIA),other=add(s,1,'battle',required?'dm10-047':HARIA);
  const attacker=add(s,0,'battle',SMALL),first=hariaLast?other:haria,last=hariaLast?haria:other;
  attack(s,attacker.uid);act(s,'defendMany');
  pick(s,first.uid);pick(s,last.uid);pick(s,null);
  if(!required){
   s=clone(s);
   act(s,'orderEffect',a=>a.uid===first.uid);
  }
  drain(s);
  assert.equal(s.players[1].battle.find(x=>x.uid===haria.uid)?.tapped,!hariaLast);
  assert.equal(s.players[1].battle.find(x=>x.uid===other.uid)?.tapped,required||hariaLast);
  assert.ok(has(s,0,'grave',attacker));
  assert.equal(s.players[1].shields.length,5);
 }
});
