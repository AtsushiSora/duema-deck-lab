import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GOUL='dmr18-018',GYO='dmr19-048',GAB='dmr19-006',ERI='dmr18-041';
const PRINTS=[['promoy14-028',GOUL],['dmx22b-149',ERI]];
const DARK='dm01-090',FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108';
const EVO='dmr17-010',BIG='dmr18-045',TRIGGER='dm01-015',TRIPLE='dm05-s04';
const KOONI='dm26rp3-051',CASTLE='dm26rp1-057',MULTI='dm24ex2-019';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('Phase 1002 registers exactly four unique official cards and two print aliases',()=>{
 const m=read('tools/support-phase-1002.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GOUL,GYO,GAB,ERI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),PRINTS.map(([,id])=>({id,count:1})));
 for(const {id,canonicalId,name,faces,image,verification} of m.printAliases){
  const original=m.cards.find(x=>x.id===canonicalId);
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1002}),original.spec);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.ok(verification.facesMatched);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonicalId,image]]);
 }
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1002}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1002}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1002');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

function startEnd(s){
 s.phase='attack';
 act(s,'endTurn');
}

function order(s,id){
 assert.equal(s.decision.type,'effectOrder');
 const row=s.pendingEffects.find(x=>x.source===id);
 assert.ok(row,id);
 act(s,'orderEffect',a=>a.effectId===row.effectId);
}

test('Goul resolves Revolution after another end effect lowers its shields from three to two',()=>{
 let s=field();
 give(s,0,'shields',[NATURE,NATURE,NATURE]);
 s.players[0].shields[1].shieldStack=[inst(DARK)];
 const goul=put(s,0,'grave',GOUL);
 const shield=s.players[0].shields[0];
 put(s,0,'battle',KOONI);
 startEnd(s);
 order(s,KOONI);pick(s,shield.uid);
 assert.deepEqual(choices(s),[true,null]);
 assert.equal(s.players[0].shields.length,2);
 s=JSON.parse(JSON.stringify(s));pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',goul));
 assert.equal(e.effectiveCard(s.players[0].battle.find(x=>x.uid===goul.uid),s).breaker,2);
});

for(const mode of ['decline','opponent','three'])test('Goul stays in the grave when '+mode,()=>{
 const s=field(),goul=put(s,0,'grave',GOUL);
 give(s,0,'shields',Array(mode==='three'?3:2).fill(NATURE));
 if(mode==='opponent')s.active=1;
 startEnd(s);
 if(mode==='decline'){assert.deepEqual(choices(s),[true,null]);pick(s,null);}
 else assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',goul));
});

test('Gyo moves one whole own shield into mana and may sacrifice itself to save a different shield',()=>{
 const s=field();
 give(s,0,'shields',[TRIGGER,NATURE]);
 const [moving,saved]=s.players[0].shields;
 const multi=inst(MULTI),castle=Object.assign(inst(CASTLE),{faceUp:true});
 moving.shieldStack=[multi,castle];
 const gyo=play(s,GYO);
 assert.deepEqual(choices(s),[moving.uid,saved.uid]);
 assert.equal(s.decision.choices.some(c=>c.cardId),false);
 pick(s,moving.uid);
 assert.ok(has(s,0,'mana',moving)&&has(s,0,'mana',multi)&&multi.tapped);
 assert.ok(has(s,0,'grave',castle));
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[saved.uid]);
 const attacker=put(s,1,'battle',FIRE);
 s.active=1;attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields');
 act(s,'saveShield',a=>a.uid===gyo.uid&&a.shield===saved.uid);drain(s);
 assert.ok(has(s,0,'grave',gyo)&&has(s,0,'shields',saved));
});

test('Gab sends a selected opposing shield group to the grave without a trigger',()=>{
 const s=field();
 give(s,1,'shields',[NATURE,TRIGGER]);
 const [left,chosen]=s.players[1].shields,stacked=inst(FIRE);
 chosen.shieldStack=[stacked];
 const gab=play(s,GAB);
 assert.deepEqual(choices(s),[left.uid,chosen.uid]);
 pick(s,chosen.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'grave',chosen)&&has(s,1,'grave',stacked)&&has(s,1,'shields',left));
 assert.equal(e.effectiveCard(gab,s).breaker,2);
});

test('Gab grants Blocker and Slayer only to own Darkness creatures while at two shield groups',()=>{
 const s=field(),ally=put(s,0,'battle',DARK),other=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',DARK);
 give(s,1,'shields',[]);
 const gab=play(s,GAB),flags=x=>['blocker','slayer'].map(k=>!!e.effectiveCard(x,s)[k]);
 give(s,0,'shields',[NATURE,NATURE,NATURE]);
 s.players[0].shields[0].shieldStack=[inst(NATURE)];
 assert.deepEqual(flags(ally),[false,false]);
 const spare=s.players[0].shields.pop();
 for(const x of [gab,ally])assert.deepEqual(flags(x),[true,true]);
 for(const x of [other,enemy])assert.deepEqual(flags(x),[false,false]);
 s.players[0].shields.push(spare);
 assert.deepEqual(flags(ally),[false,false]);
});

test('Erikacchu can choose either player’s non-Evolution up to cost seven, including itself',()=>{
 const s=field(),ally=put(s,0,'battle',DARK),enemy=put(s,1,'battle',GOUL);
 const evolution=put(s,1,'battle',EVO,{under:[inst(NATURE)]}),expensive=put(s,1,'battle',BIG);
 const erikacchu=play(s,ERI);
 assert.deepEqual(choices(s),[ally.uid,erikacchu.uid,enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'mana',enemy)&&has(s,1,'battle',evolution)&&has(s,1,'battle',expensive));
});

for(const [starting,breaker,eligible] of [[3,FIRE,true],[4,FIRE,false],[5,TRIPLE,true]]){
 test('Erikacchu uses the shield count after the announced break '+starting+'/'+breaker,()=>{
  const s=field(),attacker=put(s,1,'battle',breaker);
  give(s,0,'shields',[ERI,...Array(starting-1).fill(NATURE)]);
  const erikacchu=s.players[0].shields[0];
  s.active=1;attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields',a=>a.uids?.includes(erikacchu.uid)||a.shields?.includes(erikacchu.uid));
  if(eligible){
   act(s,'useTrigger',a=>a.uid===erikacchu.uid);
   assert.ok(has(s,0,'battle',erikacchu));
   const chosen=breaker===TRIPLE?erikacchu:attacker;
   pick(s,chosen.uid);
   assert.ok(has(s,breaker===TRIPLE?0:1,'mana',chosen));
  }else{
   assert.ok(has(s,0,'hand',erikacchu));
   assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
  }
 });
}
