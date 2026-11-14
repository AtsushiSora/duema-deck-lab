import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ODANGO='dm23rp3-031',SHINAI='dm23rp3-049',TANEDA='dm23rp3-048';
const SMALL='dm01-108',DESTROY='dm01-027';
const BIG='dm23rp2-010';
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

test('three official Twinpact prints match the active IDs, both faces, images and four-copy limits',()=>{
 const m=read('support-phase-1215.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ODANGO,SHINAI,TANEDA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:1215}),row.spec);
  for(const i of d.faces.keys()){
   const changed=structuredClone(d);
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1215}));
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

test('Odango blocks a stronger creature and returns to hand instead of being destroyed',()=>{
 const s=field(),odango=add(s,1,'battle',ODANGO),attacker=add(s,0,'battle',BIG);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===odango.uid);
 assert.ok(has(s,1,'hand',odango)&&has(s,0,'battle',attacker));
 assert.deepEqual(s.players[1].grave,[]);
 assert.equal(s.players[1].shields.length,5);
});

test('Odango spell may select up to two distinct opponents before moving either to its owner',()=>{
 for(const n of [0,1,2]){
  let s=field();
  const spell=add(s,0,'hand',ODANGO),own=add(s,0,'battle',SMALL);
  const one=add(s,1,'battle',SMALL,{cardOwner:0}),two=add(s,1,'battle',SMALL),three=add(s,1,'battle',SMALL);
  castSide(s,spell);
  assert.deepEqual(new Set(values(s)),new Set([one.uid,two.uid,three.uid,null]));
  if(n){
   pick(s,one.uid);
   assert.ok(has(s,1,'battle',one)&&!values(s).includes(one.uid));
   s=clone(s);pick(s,n===2?two.uid:null);
  }else pick(s,null);
  assert.equal(has(s,0,'hand',one),n>0);
  assert.equal(has(s,1,'hand',two),n===2);
  assert.ok(has(s,0,'battle',own)&&has(s,1,'battle',three)&&has(s,0,'grave',spell));
 }
});

test('Odango spell can be used as an S Trigger with no mana payment',()=>{
 const s=field(),{attacker,source}=startTrigger(s,ODANGO);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'hand',attacker)&&has(s,0,'grave',source));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Shinai can attack an untapped creature on entry but cannot attack the player that turn',()=>{
 const s=field(),shinai=add(s,0,'hand',SHINAI),enemy=add(s,1,'battle',SMALL);
 castSide(s,shinai,0);s.phase='attack';
 assert.ok(attacks(s,shinai,enemy.uid)&&!attacks(s,shinai));
});

test('Shinai spell draws after targeting and prevents attacks and blocks only until caster’s next turn',()=>{
 const s=field(),blocker=add(s,1,'battle',BIG),ally=add(s,0,'battle',SMALL);
 const draw=s.players[0].deck[0],spell=add(s,0,'hand',SHINAI);
 castSide(s,spell);assert.ok(!has(s,0,'hand',draw));pick(s,blocker.uid);
 assert.ok(has(s,0,'hand',draw)&&has(s,0,'grave',spell));
 attack(s,ally.uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 noBlock(s);drain(s);
 pass(s);ready(s);assert.ok(!attacks(s,blocker));
 pass(s);ready(s);
 attack(s,ally.uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('Shinai S Trigger still draws when no opposing creature can be chosen',()=>{
 const s=field();
 // A resolved Just Diver is already active on the attacking body.
 s.active=1;give(s,0,'shields',[SHINAI]);
 const diver=add(s,1,'hand',TANEDA);
 castSide(s,diver,0);
 diver.entered=-1;
 const shield=s.players[0].shields[0],draw=s.players[0].deck[0];
 attack(s,diver.uid);noBlock(s);act(s,'useTrigger',a=>a.uid===shield.uid&&a.face===1);
 assert.ok(has(s,0,'hand',draw)&&has(s,1,'battle',diver)&&has(s,0,'grave',shield));
});

test('Taneda Just Diver protects a normally summoned body from opposing selection and attack for one turn',()=>{
 const s=field(),diver=add(s,0,'hand',TANEDA),attacker=add(s,1,'battle',SMALL);
 castSide(s,diver,0);diver.tapped=true;
 pass(s);if(s.phase==='charge')act(s,'skipCharge');
 play(s,add(s,1,'hand',DESTROY));
 assert.equal(s.decision,null);assert.ok(has(s,0,'battle',diver));
 s.phase='attack';assert.ok(!attacks(s,attacker,diver.uid));
 pass(s);pass(s);if(s.phase==='charge')act(s,'skipCharge');
 play(s,add(s,1,'hand',DESTROY));target(s,diver);
 assert.ok(has(s,0,'grave',diver));
});

test('Taneda spell uses current power including modifiers, ignores protected targets, and works as an S Trigger',()=>{
 const s=field(),high=add(s,1,'battle','dm23rp2-009'),low=add(s,1,'battle',SMALL),protectedUnit=add(s,1,'hand',TANEDA);
 s.active=1;castSide(s,protectedUnit,0);
 high.powerModifiers=[{amount:4000-e.power(high,false,s),expires:'end',who:1}];
 low.powerModifiers=[{amount:2001,expires:'end',who:1}];
 const {attacker,source}=startTrigger(s,TANEDA);
 assert.deepEqual(new Set(values(s)),new Set([high.uid,attacker.uid]));
 pick(s,high.uid);
 assert.ok(has(s,1,'grave',high)&&has(s,0,'grave',source));
 assert.ok(has(s,1,'battle',low)&&has(s,1,'battle',protectedUnit));
});
