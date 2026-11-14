import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const WATT='dm23rp2-044',FISH='dm23rp2-032',DAIDAI='dm23rp2-048';
const SMALL='dm01-108',DRAGON='dmsd18-008',GEAR='dm23ex1-024',DRAGON_SEED='dmrp21-069';
const MAGIC='dm23rp2-057',LARGE_MAGIC='dm23rp2-040',ONI='dmrp01-041';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const add=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
const canAttack=(s,x,target='player')=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
const clone=s=>JSON.parse(JSON.stringify(s));
const ids=xs=>xs.map(x=>x.uid);
function pass(s){
 s.phase='attack';act(s,'endTurn');
}
function noBlock(s){
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
}

test('eleven official editions resolve to the three canonical cards and keep one four-copy limit',()=>{
 const m=read('support-phase-1212.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[WATT,FISH,DAIDAI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm23rp2x-044',WATT],['dm23rp2x-032',FISH],['dm24ex4-064',FISH],['dm24ex4-PR024',FISH],
  ['dm23rp2x-048',DAIDAI],['dm24bd5-042',DAIDAI],['dm24ex4-076',DAIDAI],['dm24ex4-PR036',DAIDAI]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1212}),row.spec);
  for(const i of row.faces.keys()){
   const changed=structuredClone({...row,status:'complete'});
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1212}));
  }
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual([c.manaValue,c.limit,m.regulationVerification.limits[row.id]],[1,4,4]);
  assert.deepEqual(e.playFaces(c).map(face=>[face.type,face.cost,face.power,face.race,face.civilizations]),
   row.faces.map((face,i)=>[i?'spell':'creature',face.cost,i?undefined:+face.powerText,face.race,face.civilizations]));
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Watt counts Dragon elements regardless of type or tap state, only on its own battlefield',()=>{
 const s=field(),watt=add(s,0,'hand',WATT);
 play(s,watt);
 const enemy=add(s,1,'battle',DRAGON,{tapped:true});
 const dragon=add(s,0,'battle',DRAGON,{tapped:true});
 add(s,0,'mana',DRAGON);add(s,0,'grave',DRAGON);
 add(s,0,'battle',SMALL,{under:[inst(DRAGON)]});
 s.turn++;s.phase='attack';
 assert.ok(!canAttack(s,watt)&&!canAttack(s,watt,enemy.uid));
 const seed=add(s,0,'battle',DRAGON_SEED);
 assert.ok(canAttack(s,watt)&&canAttack(s,watt,enemy.uid));
 s.players[0].battle.splice(s.players[0].battle.indexOf(seed),1);
 const gear=add(s,0,'battle',GEAR);
 assert.ok(canAttack(s,watt));
 gear.sealed=true;s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:gear.uid}];
 assert.ok(!canAttack(s,watt));
 assert.ok(dragon.tapped);
});

test('Watt redirects an attack on its ally while its own attack restriction is active',()=>{
 const s=field();s.active=1;
 const attacker=add(s,1,'battle',SMALL),friend=add(s,0,'battle',SMALL,{tapped:true});
 const watt=add(s,0,'battle',WATT);
 attack(s,attacker.uid,friend.uid);act(s,'guardman',a=>a.uid===watt.uid);drain(s);
 assert.ok(watt.tapped&&has(s,0,'battle',friend)&&has(s,0,'battle',watt)&&has(s,1,'grave',attacker));
});

test('Watt uses optional G Strike from shields and stops another attacker',()=>{
 const s=field();s.active=1;
 give(s,0,'shields',[WATT,SMALL]);
 const shield=s.players[0].shields[0],first=add(s,1,'battle',SMALL),later=add(s,1,'battle',SMALL);
 attack(s,first.uid);noBlock(s);
 if(s.decision?.task?.op==='gsDeclare')pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);
 assert.ok(has(s,0,'hand',shield)&&!later.tapped&&!canAttack(s,later));
});

test('Fish can decline on its own turn start or return and use Magic Mekraid 5',()=>{
 for(const accept of [false,true]){
  let s=field();
  const fish=add(s,0,'battle',FISH);
  give(s,0,'deck',[MAGIC,LARGE_MAGIC,SMALL,SMALL,...Array(8).fill(SMALL)]);
  const [hit,large,miss,draw,...tail]=s.players[0].deck;
  pass(s);assert.equal(s.active,1);assert.equal(s.decision,null);
  pass(s);assert.equal(s.active,0);assert.equal(s.decision.task.op,'g34_Offer');
  pick(s,accept?true:null);
  if(!accept){assert.ok(has(s,0,'battle',fish)&&has(s,0,'hand',hit));continue;}
  assert.ok(has(s,0,'hand',fish)&&!has(s,0,'hand',draw));
  assert.equal(s.decision.task.op,'g34_RaidPick');
  assert.ok(s.decision.choices.some(c=>c.value?.uid===hit.uid&&c.value.face===0));
  assert.ok(!values(s).includes(miss.uid));
  s=clone(s);
  act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return v?.uid===hit.uid&&v.face===0;});
  pick(s,miss.uid);
  assert.ok(has(s,0,'battle',hit)&&has(s,0,'hand',draw));
  assert.deepEqual(ids(s.players[0].deck),ids([...tail,miss,large]));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 }
});

test('Fish still performs Mekraid if a continuous effect stops it from leaving',()=>{
 const s=field(),fish=add(s,0,'battle',FISH);
 pass(s);pass(s);
 // Apply the existing leave prevention to the pending start ability.
 (s.extLimits??=[]).push({kind:'g1087ElementsStay',player:0});
 pick(s,true);
 assert.ok(has(s,0,'battle',fish)&&!has(s,0,'hand',fish));
 assert.equal(s.decision.task.op,'g34_RaidPick');
 drain(s);
 assert.ok(s.log.some(x=>x.cardId===FISH&&x.type==='look'));
});

test('Moonsault lets the opponent pick two distinct untapped creatures in one move',()=>{
 let s=field();
 const spell=add(s,0,'hand',FISH),one=add(s,1,'battle',SMALL),two=add(s,1,'battle',ONI);
 const three=add(s,1,'battle',SMALL),tapped=add(s,1,'battle',SMALL,{tapped:true});
 add(s,0,'battle',SMALL);
 play(s,spell,1);assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[one.uid,two.uid,three.uid]);pick(s,two.uid);
 assert.ok(has(s,1,'battle',two)&&!values(s).includes(two.uid));
 s=clone(s);pick(s,one.uid);
 assert.ok(has(s,1,'hand',one)&&has(s,1,'hand',two));
 assert.ok(has(s,1,'battle',three)&&has(s,1,'battle',tapped)&&has(s,0,'grave',spell));
});

test('Moonsault uses S Trigger for free and returns the only eligible untapped creature',()=>{
 const s=field();s.active=1;
 give(s,0,'shields',[FISH,SMALL]);
 const source=s.players[0].shields[0],attacker=add(s,1,'battle',SMALL),other=add(s,1,'battle',SMALL);
 attack(s,attacker.uid);noBlock(s);
 act(s,'useTrigger',a=>a.uid===source.uid&&a.face===1);
 assert.deepEqual(values(s),[other.uid]);pick(s,other.uid);
 assert.ok(has(s,1,'battle',attacker)&&has(s,1,'hand',other)&&has(s,0,'grave',source));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

function daidaiTrigger(s,dual){
 s.active=1;
 give(s,0,'shields',[DAIDAI,SMALL,SMALL]);
 const shield=s.players[0].shields[0],attacker=add(s,1,'battle',dual?DRAGON:SMALL);
 attack(s,attacker.uid);noBlock(s);
 if(dual)act(s,'breakShields',a=>a.shields.includes(shield.uid)&&a.shields.length===2);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 return {shield,attacker};
}

test('Daidai Plus sends two own creatures, then the opponent chooses two of their own',()=>{
 let s=field();
 const ally=add(s,0,'battle',SMALL),spare=add(s,0,'battle',SMALL);
 const opponent=add(s,1,'battle',ONI),spareEnemy=add(s,1,'battle',SMALL);
 // The first step instructs a move without choosing. The second uses explicit choice.
 s.extLimits=[ally,spareEnemy].map(x=>({kind:'g521Grant',g565External:true,ref:{uid:x.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'end',who:1}));
 const {shield,attacker}=daidaiTrigger(s,true);
 assert.ok(shield.triggerPlus);
 assert.deepEqual(values(s),[ally.uid,spare.uid,shield.uid]);
 pick(s,shield.uid);assert.ok(has(s,0,'battle',shield));
 pick(s,ally.uid);
 assert.ok(has(s,0,'mana',shield)&&has(s,0,'mana',ally)&&has(s,0,'battle',spare));
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[opponent.uid,attacker.uid]);
 s=clone(s);pick(s,opponent.uid);pick(s,attacker.uid);
 assert.ok(has(s,1,'mana',opponent)&&has(s,1,'mana',attacker)&&has(s,1,'battle',spareEnemy));
});

test('Daidai Plus moves the available creatures if either side has fewer than two',()=>{
 const s=field(),{shield,attacker}=daidaiTrigger(s,true);
 assert.deepEqual(values(s),[shield.uid]);pick(s,shield.uid);
 assert.deepEqual(values(s),[attacker.uid]);pick(s,attacker.uid);
 assert.ok(has(s,0,'mana',shield)&&has(s,1,'mana',attacker));
});

test('Daidai summons from mana and a first single shield break gives only a basic trigger',()=>{
 const s=field(),x=add(s,0,'mana',DAIDAI),enemy=add(s,1,'battle',SMALL);
 act(s,'play',a=>a.uid===x.uid&&a.origin==='mana');
 assert.ok(has(s,0,'battle',x)&&!has(s,0,'mana',x)&&has(s,1,'battle',enemy));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 const t=field(),{shield,attacker}=daidaiTrigger(t,false);
 assert.ok(!shield.triggerPlus&&has(t,0,'battle',shield)&&has(t,1,'battle',attacker));
 assert.equal(t.decision,null);
});
