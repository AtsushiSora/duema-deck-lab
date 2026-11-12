import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PUR='dmr16s-024',LINK='dmr16g-015',DIO='dmr16s-026',SADO='dmr16s-019',AIRA='dmr16s-028';
const PRINTS=[['dmr16s-015',LINK],['promoy13-098',DIO],['promoy13-089',AIRA]];
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',LIGHT='dm01-075';
const DRAGON='dm01-008',HAND='dm01-027',FUJ='dmrp22-037',BLOCKER='dm01-076',TIG='dmr14-036',GO='dmr16s-003';
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

test('Phase 989 registers five official definitions and maps three reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-989.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PUR,LINK,DIO,SADO,AIRA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:LINK,count:1},{id:DIO,count:1},{id:AIRA,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:989}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:989}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===LINK?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-989');
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
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:989}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const manaTapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function seal(s,p,host,under=NATURE){
 host.sealed=true;
 return put(s,p,'seals',under,{sealOf:host.uid,faceDown:true});
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

function passBlock(s){
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}
function useBack(s,source,cost){
 assert.equal(s.decision.task.op,'g13_SB');
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return v?.uid===source.uid&&v.cost===cost.uid;
 });
}

test('T Pururun may exchange the new face-down shield or a whole existing shield stack',()=>{
 for(const mode of ['new','old','decline']){
  let s=field();
  const old=s.players[0].shields[0],added=put(s,0,'hand',HAND);
  old.shieldStack=[inst(HAND),inst(NATURE)];
  const returned=[old,...old.shieldStack];
  play(s,PUR);
  const all=physical(s);
  assert.deepEqual(choices(s),[added.uid,null]);
  pick(s,mode==='decline'?null:added.uid);
  if(mode==='decline'){
   assert.equal(s.decision,null);
   assert.equal(s.players[0].shields.length,5);
   assert.ok(has(s,0,'hand',added));
  }else{
   assert.equal(s.decision.task.op,'g55_ShieldHand');
   assert.ok(!find(s,0,'shields',added).faceUp);
   s=restore(s);
   pick(s,mode==='new'?added.uid:old.uid);
   assert.equal(s.decision,null);
   assert.equal(s.players[0].shields.length,5);
   assert.equal(has(s,0,'hand',added),mode==='new');
   assert.equal(returned.every(x=>has(s,0,'hand',x)),mode==='old');
  }
  assert.deepEqual(physical(s),all);
 }
});

test('T Pururun uses Shield Trigger and offers no exchange with an empty hand',()=>{
 const s=field();
 s.active=1;
 give(s,0,'mana',[]);
 give(s,0,'shields',[PUR]);
 const pur=s.players[0].shields[0],foe=put(s,1,'battle',FIRE);
 attack(s,foe.uid);
 passBlock(s);
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',pur));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].mana.length,0);
});

test('T Pururun proceeds after attempting a prohibited shield addition',()=>{
 const s=field(),added=put(s,0,'hand',FIRE),old=s.players[0].shields[0];
 put(s,1,'battle',FUJ);
 assert.equal(e.canAddShield(s,0),false);
 play(s,PUR);
 pick(s,added.uid);
 assert.ok(has(s,0,'hand',added));
 pick(s,old.uid);
 assert.ok(has(s,0,'hand',old));
});

test('Each S Back creature uses only the matching shield, can decline, and spends no mana',()=>{
 for(const [id,color] of [[DIO,DARK],[SADO,LIGHT],[AIRA,FIRE]])for(const mode of ['use','decline','wrong']){
  let s=field();
  s.active=1;
  give(s,0,'mana',[]);
  give(s,0,'shields',[mode==='wrong'?NATURE:color]);
  const source=put(s,0,'hand',id),other=put(s,0,'hand',color);
  const shield=s.players[0].shields[0],foe=put(s,1,'battle',FIRE);
  const all=physical(s);
  attack(s,foe.uid);
  passBlock(s);
  if(mode==='wrong')assert.notEqual(s.decision?.task?.op,'g13_SB');
  else {
   assert.deepEqual(s.decision.choices.map(c=>c.value),[{uid:source.uid,cost:shield.uid},null]);
   s=restore(s);
   if(mode==='use')useBack(s,source,shield);
   else pick(s,null);
  }
  assert.equal(has(s,0,'battle',source),mode==='use');
  assert.equal(has(s,0,'grave',shield),mode==='use');
  assert.equal(has(s,0,'hand',shield),mode!=='use');
  assert.ok(has(s,0,'hand',other));
  assert.equal(s.players[0].mana.length,0);
  assert.deepEqual(physical(s),all);
 }
});

test('S Back excludes sources received in the same movement for both a W Break and a shield stack return',()=>{
 for(const mode of ['break','stack']){
  const s=field();
  give(s,0,'shields',[DIO,DARK]);
  const [inside,payment]=s.players[0].shields;
  if(mode==='break'){
   s.active=1;
   const attacker=put(s,1,'battle',GO);
   attack(s,attacker.uid);
   passBlock(s);
   if(s.decision?.task?.op==='g34_Target')pick(s,null);
  }else{
   inside.shieldStack=[s.players[0].shields.pop()];
   const offered=put(s,0,'hand',FIRE);
   play(s,PUR);
   pick(s,offered.uid);
   pick(s,inside.uid);
  }
  assert.notEqual(s.decision?.task?.op,'g13_SB');
  assert.ok(has(s,0,'hand',inside)&&has(s,0,'hand',payment));
 }
});

test('Returning a shield with T Pururun allows S Back while prohibiting that shield’s S Trigger',()=>{
 const s=field();
 give(s,0,'shields',[HAND]);
 const shield=s.players[0].shields[0],dio=put(s,0,'hand',DIO),offered=put(s,0,'hand',FIRE);
 play(s,PUR);
 pick(s,offered.uid);
 pick(s,shield.uid);
 useBack(s,dio,shield);
 assert.ok(has(s,0,'battle',dio)&&has(s,0,'grave',shield));
 assert.equal(s.decision,null);
});

test('Sadoniaras can block and can only attack a creature',()=>{
 const s=field(),guard=play(s,SADO),foe=put(s,1,'battle',FIRE);
 end(s);
 attack(s,foe.uid);
 act(s,'block',a=>a.uid===guard.uid);
 assert.ok(guard.tapped&&has(s,1,'grave',foe));
 const prey=put(s,1,'battle',FIRE,{tapped:true});
 end(s);
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===guard.uid).map(a=>a.target),[prey.uid]);
});

test('Linkwood G Zero counts three live allied Dragons, and paid casting still works',()=>{
 for(const mode of ['two','enemy','sealed','three','paid']){
  const s=field();
  give(s,0,'mana',mode==='paid'?Array(6).fill(FIRE):[]);
  put(s,0,'battle',DRAGON);
  put(s,0,'battle',DRAGON);
  if(mode!=='two'&&mode!=='paid'){
   const third=put(s,mode==='enemy'?1:0,'battle',DRAGON);
   if(mode==='sealed')seal(s,0,third);
  }
  const link=put(s,0,'hand',LINK);
  const legal=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===link.uid);
  assert.equal(!!legal,mode==='three'||mode==='paid');
  if(legal){
   assert.equal(legal.freeSpell==='G・ゼロ',mode==='three');
   act(s,'play',a=>a.uid===link.uid);
   assert.equal(manaTapped(s,0),mode==='paid'?6:0);
  }
 }
});

test('Linkwood buffs current allies and its block trigger untaps even a later entrant before combat',()=>{
 const s=field(),early=put(s,0,'battle',FIRE);
 const oldBlocker=put(s,1,'battle',TIG),newBlocker=put(s,1,'battle',BLOCKER);
 play(s,LINK);
 const late=put(s,0,'battle',FIRE);
 assert.equal(e.power(early,false,s),5000);
 assert.equal(e.power(late,false,s),2000);
 attack(s,early.uid);
 act(s,'block',a=>a.uid===oldBlocker.uid);
 assert.ok(!early.tapped&&has(s,1,'grave',oldBlocker));
 attack(s,early.uid);
 passBlock(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(early.tapped);
 attack(s,late.uid);
 act(s,'block',a=>a.uid===newBlocker.uid);
 assert.ok(has(s,0,'grave',late)&&has(s,1,'grave',newBlocker));
 end(s);
 assert.equal(e.power(early,false,s),2000);
 assert.ok(!s.extLimits.some(x=>x.kind==='g989BlockUntap'));
});

test('Linkwood delayed untap survives JSON and an ignored attacker while a late ally gets no extra break',()=>{
 let s=field(),unbuffed=put(s,0,'battle',NATURE);
 play(s,LINK);
 const late=put(s,0,'battle',DRAGON,{g35Ignored:s.turn});
 const blocker=put(s,1,'battle',BLOCKER);
 s=restore(s);
 attack(s,late.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(!find(s,0,'battle',late).tapped);
 attack(s,late.uid);
 passBlock(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(has(s,0,'battle',unbuffed));
});

test('Escape declares S-Back before repeated destruction and resolves it afterwards (QA42523)',()=>{
 const s=field(),escape=put(s,0,'battle','dmr16s-043',{powerModifiers:[{amount:-3000}]});
 const back=put(s,0,'hand','dmex12-035');
 const first=put(s,0,'shields',DARK),second=put(s,0,'shields',DARK);
 const enemy=put(s,1,'battle',NATURE);
 const before=physical(s);

 act(s,'toAttack');
 act(s,'replaceEscape',a=>a.shield===first.uid);
 useBack(s,back,first);
 assert.ok(has(s,0,'grave',first));
 assert.ok(has(s,0,'battle',escape));
 assert.ok(has(s,0,'hand',back));
 assert.ok(!enemy.sealed);
 assert.equal(s.decision.type,'leaveReplace');

 act(s,'replaceEscape',a=>a.shield===second.uid);
 assert.equal(s.decision.type,'leaveReplace');
 assert.ok(has(s,0,'hand',second));
 act(s,'allowLeave');
 assert.ok(has(s,0,'grave',escape));
 drain(s);
 assert.ok(has(s,0,'grave',back));
 assert.ok(enemy.sealed);
 assert.deepEqual(physical(s),before);
});

test('multiple S-Backs declared during Escape can resolve in chosen order after JSON continuation (QA42523)',()=>{
 let s=field();
 const escape=put(s,0,'battle','dmr16s-043',{powerModifiers:[{amount:-3000}]});
 const firstBack=put(s,0,'hand','dmex12-035'),secondBack=put(s,0,'hand','dmex12-035');
 const first=put(s,0,'shields',DARK),second=put(s,0,'shields',DARK);
 put(s,1,'battle',NATURE);
 put(s,1,'battle',NATURE);
 const before=physical(s);

 act(s,'toAttack');
 act(s,'replaceEscape',a=>a.shield===first.uid);
 useBack(s,firstBack,first);
 act(s,'replaceEscape',a=>a.shield===second.uid);
 useBack(s,secondBack,second);
 s=restore(s);
 assert.ok(has(s,0,'battle',escape));
 assert.ok(has(s,0,'hand',firstBack)&&has(s,0,'hand',secondBack));
 act(s,'allowLeave');
 assert.ok(has(s,0,'grave',escape));
 assert.equal(s.decision.type,'effectOrder');
 const secondEffect=s.pendingEffects.find(x=>x.task?.uid===secondBack.uid);
 assert.ok(secondEffect);
 act(s,'orderEffect',a=>a.effectId===secondEffect.effectId);
 drain(s);
 assert.ok(has(s,0,'grave',firstBack)&&has(s,0,'grave',secondBack));
 assert.ok(s.players[1].battle.every(x=>x.sealed));
 assert.deepEqual(physical(s),before);
});
