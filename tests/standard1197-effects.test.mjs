import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FALL='dm22rp1-039',PANZER='dmrp04m-007',O6='dm23rp1-028';
const BIG='dm01-s01',SMALL='dm01-108',SPEED='dmr17-081',STOP='dmsd01-010';
const TWIN='dmrp06-s09',INFINITE='dmrp15-km1',TRIGGER='dm01-086';
const MECHA='dm24rp3-055',SWEEP='dm38-013';
const put=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,v)=>act(s,'extended',a=>{
 const x=s.decision.choices[a.choice].value;
 return (x?.uid??x)===v;
});
const order=(s,source)=>act(s,'orderEffect',a=>s.pendingEffects.some(
 x=>x.effectId===a.effectId&&x.source===source
));
function play(s,id,attrs={}){
 s.phase='main';
 const x=put(s,s.active,'hand',id,attrs);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('complete official text, image, restrictions and one canonical ID for each new card',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1197.json');
 const refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[FALL,PANZER,O6]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const id=row.id,live=e.card(id),[face]=row.faces;
  const official=details.cards.find(x=>x.id===id);
  assert.deepEqual(official.faces,row.faces);
  assert.deepEqual(standardCardSpec(official,{phase:1197}),row.spec);
  const bad=structuredClone(official);
  bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1197}));
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([live.type,live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   ['creature',face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[id],4);
  assert.equal(refs.find(x=>x.id===id&&x.canonicalId===id)?.image,row.image);
  assert.equal(CARD_IMAGES[id],row.image);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

for(const newAttacker of [true,false])test('Fall Man acts on the attack declaration and waits for the actual shield break '+newAttacker,()=>{
 const s=setup(),fall=put(s,1,'battle',FALL);
 const x=newAttacker?play(s,SPEED):put(s,0,'battle',SPEED);
 give(s,1,'shields',[SMALL]);
 const first=s.players[1].shields[0],before=physical(s);
 attack(s,x.uid);
 assert.ok(has(s,0,'battle',x));
 act(s,'noBlock');
 assert.ok(has(s,1,'hand',first)&&has(s,1,'battle',fall));
 assert.equal(has(s,0,'grave',x),newAttacker);
 assert.equal(has(s,0,'battle',x),!newAttacker);
 assert.deepEqual(physical(s),before);
});

test('Fall Man waits through an S Trigger and Kirifuda Dash after saving and restoring',()=>{
 let s=setup();
 put(s,1,'battle',FALL);
 const x=play(s,SPEED),dash=put(s,0,'hand','dmrp16-077');
 give(s,1,'shields',[TRIGGER]);
 const target=put(s,1,'battle',SMALL);
 attack(s,x.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',x));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===target.uid));
 assert.equal(s.decision?.task?.op,'g14_DashDeclare');
 assert.ok(has(s,0,'battle',x));
 s=structuredClone(s);
 pick(s,true);
 assert.equal(s.decision?.task?.op,'g14_DashResolve');
 assert.ok(has(s,0,'battle',x));
 const execute=s.decision.choices.find(c=>c.value!==null).value;
 pick(s,execute);
 drain(s);
 assert.ok(has(s,0,'battle',dash));
 assert.ok(has(s,0,'grave',x));
});

test('Fall Man resolves after an attack is stopped and no shield was broken',()=>{
 const s=setup(),fall=put(s,1,'battle',FALL),stopper=put(s,1,'battle',STOP);
 const attacker=play(s,SPEED);
 attack(s,attacker.uid);
 if(s.decision?.type==='effectOrder')order(s,STOP);
 assert.equal(s.decision?.task?.op,'g34_TapToStopAttack979');
 pick(s,true);
 if(s.decision?.type==='effectOrder')order(s,FALL);
 assert.ok(stopper.tapped);
 assert.ok(has(s,0,'grave',attacker)&&has(s,1,'battle',fall));
 assert.equal(s.players[1].shields.length,5);
});

test('Fall Man destroys the creature that continued its attack after invasion',()=>{
 const s=setup(),fall=put(s,1,'battle',FALL);
 const original=play(s,SPEED),invader=put(s,0,'hand','dmr17-l02');
 attack(s,original.uid);
 assert.equal(s.decision?.task?.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'g23_Invade');
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'grave',original)&&has(s,0,'grave',invader));
 assert.equal(s.players[1].shields.length,2);
 assert.ok(has(s,1,'grave',fall));
});

test('Fall Man follows a reconstructed attacker after a card leaves at attack end',()=>{
 const s=setup();
 put(s,1,'battle',FALL);
 const original=play(s,SPEED),invader=put(s,0,'hand','dm22ex1-011');
 attack(s,original.uid);
 assert.equal(s.decision?.task?.op,'g23_Declare');
 pick(s,true);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'grave',invader)&&has(s,0,'grave',original));
 assert.equal(s.players[1].shields.length,3);
});

for(const reenter of [false,true])test('Fall Man leaves the Revolution Change entrant and any returned original alone '+reenter,()=>{
 const s=setup();
 put(s,1,'battle',FALL);
 const original=put(s,0,'battle','dmr23-072',{entered:s.turn});
 const replacement=put(s,0,'hand','dmr21-l02');
 attack(s,original.uid);
 assert.equal(s.decision?.task?.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'revResolve');
 pick(s,original.uid);
 assert.equal(s.decision?.task?.op,'g3_FinalSelect');
 if(reenter)pick(s,original.uid);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'battle',replacement));
 assert.ok(has(s,0,reenter?'battle':'hand',original));
 assert.equal(s.players[1].shields.length,2);
});

test('Fall Man has Slayer even against a creature from an earlier turn',()=>{
 const s=setup();
 const fall=put(s,1,'battle',FALL,{tapped:true}),attacker=put(s,0,'battle',SPEED);
 attack(s,attacker.uid,fall.uid);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',fall));
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(s.log.some(x=>x.type==='battle'));
});

test('Fall Man ignores an ally declaring an attack, and an ignored watcher is inactive',()=>{
 const s=setup();
 put(s,0,'battle',FALL);
 put(s,1,'battle',FALL,{g35Ignored:s.turn});
 const attacker=play(s,SPEED);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'battle',attacker));
 assert.equal(s.players[1].shields.length,4);
});

for(const mode of ['five','four','hidden','twin','infinite'])test('Tamatango shield condition counts eligible mana faces and consumes no mana '+mode,()=>{
 const s=setup();
 give(s,1,'mana',Array(mode==='five'?5:4).fill('dmrp03-087'));
 const fifth={hidden:['dmrp03-087',{faceDown:true}],twin:[TWIN,{tapped:true}],infinite:[INFINITE,{}]}[mode];
 if(fifth)put(s,1,'mana',...fifth);
 put(s,1,'mana',SMALL);
 give(s,1,'shields',[PANZER]);
 const panzer=s.players[1].shields[0],attacker=put(s,0,'battle',SMALL),next=put(s,0,'battle',SMALL);
 const mana=structuredClone(s.players[1].mana);
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(['five','twin','infinite'].includes(mode)){
  act(s,'useTrigger');
  assert.ok(has(s,1,'battle',panzer)&&panzer.tapped);
  const actions=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===next.uid);
  assert.deepEqual(actions.map(a=>a.target),[panzer.uid]);
 }else{
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'hand',panzer));
 }
 assert.deepEqual(s.players[1].mana,mana);
});

test('Tamatango enters tapped normally and triple breaks once it can attack',()=>{
 const s=setup(),panzer=play(s,PANZER);
 assert.equal(panzer.tapped,true);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
 panzer.tapped=false;
 panzer.entered=0;
 attack(s,panzer.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Duritzio adds the two top cards as distinct face-down shields and has W Breaker',()=>{
 const s=setup(),before=s.players[0].shields.length,top=s.players[0].deck.slice(0,2);
 const source=play(s,O6);
 const created=s.players[0].shields.slice(before);
 assert.deepEqual(created.map(x=>x.uid),top.map(x=>x.uid));
 assert.ok(created.every(x=>!x.faceUp&&!x.shieldStack?.length));
 assert.equal(e.effectiveCard(source,s).breaker,2);
 const ally=put(s,0,'battle',MECHA),enemy=put(s,1,'battle',MECHA);
 assert.equal(e.effectiveCard(ally,s).escape,true);
 assert.equal(e.effectiveCard(enemy,s).escape,undefined);
 assert.equal(e.effectiveCard(source,s).escape,undefined);
});

for(const use of [true,false])test('Duritzio grants Escape only to its tribe and S-Triggers cannot pay out as abilities '+use,()=>{
 const s=setup();
 const source=put(s,1,'battle',O6),ally=put(s,1,'battle',MECHA);
 const nontribe=put(s,1,'battle',SMALL);
 give(s,1,'shields',[TRIGGER]);
 const shield=s.players[1].shields[0];
 play(s,SWEEP);
 assert.equal(s.decision?.type,'leaveReplace');
 assert.equal(s.decision.uid,ally.uid);
 act(s,use?'replaceEscape':'allowLeave');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',source)&&has(s,1,'grave',nontribe));
 assert.equal(has(s,1,use?'battle':'grave',ally),true);
 assert.equal(has(s,1,use?'hand':'shields',shield),true);
});

test('Duritzio Escape is decided from the board before a simultaneous destruction',()=>{
 const s=setup(),source=put(s,1,'battle',O6),ally=put(s,1,'battle',MECHA);
 for(let i=0;i<4;i++)put(s,i%2,'battle',SMALL);
 play(s,'dm14-015');
 assert.equal(s.decision?.type,'leaveReplace');
 assert.equal(s.decision.uid,ally.uid);
 act(s,'replaceEscape');
 assert.ok(has(s,1,'grave',source)&&has(s,1,'battle',ally));
 assert.equal(e.effectiveCard(ally,s).escape,undefined);
});
