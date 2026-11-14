import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LEGO='dm23rp2-030',POST='dm24rp2-019',ZEOS='dm26ex3-026';
const SMALL='dm01-108',BIG='dm01-s01',FIRE='dmr17-081',HYPER='dm24rp2-045';
const DRAGON='dm08-049',COUNCIL='dm26ex3-057',BOUNCE='dm01-086';
const put=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative&&a.face!==1);
 return x;
}
function next(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
}
function bounce(s,x){
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}
function evolve(s,id,base){
 const x=play(s,id);
 act(s,'evolve',a=>a.uid===x.uid&&a.baseUid===base.uid);
 drain(s);
 return x;
}
function chooseReturn(s,x){
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.equal(s.decision?.task?.uid,x.uid);
 pick(s,true);
}

test('each official print maps to one supported card with its full spec and image',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1198.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[LEGO,POST,ZEOS]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dm23rp2x-030','dm24ex3-021','dm26ex3-SSP003']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const canonical=row.canonicalId??row.id,live=e.card(canonical),[face]=row.faces;
  const parsed={...row,status:'complete'};
  if(!row.canonicalId)assert.deepEqual(details.cards.find(c=>c.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec(parsed,{phase:1198}),row.spec);
  const bad=structuredClone(parsed);
  bad.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1198}));
  assert.equal(catalogue.get(canonical).supported,true);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:canonical,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[canonical]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===canonical)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[row.id],row.image);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

for(const already of [false,true])test('Legomeal locks only the selected creature over multiple turns, even if already tapped '+already,()=>{
 let s=setup();
 const enemy=put(s,1,'battle',SMALL,{tapped:already}),other=put(s,1,'battle',BIG,{tapped:true});
 const source=play(s,LEGO);
 pick(s,enemy.uid);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,true);
 assert.equal(e.canUntap(enemy),false);
 assert.equal(e.canUntap(other),true);
 s=JSON.parse(JSON.stringify(s));
 next(s);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,true);
 assert.equal(s.players[1].battle.find(x=>x.uid===other.uid).tapped,false);
 bounce(s,source);
 assert.equal(e.canUntap(s.players[1].battle.find(x=>x.uid===enemy.uid)),true);
 next(s); next(s);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,false);
});

test('Legomeal restriction follows its target into evolution and expires if source leaves',()=>{
 const s=setup(),enemy=put(s,1,'battle',SMALL);
 const source=play(s,LEGO);
 pick(s,enemy.uid);
 next(s);
 const evolved=evolve(s,'dmrp02-010',enemy);
 assert.equal(evolved.tapped,true);
 assert.equal(e.canUntap(evolved),false);
 bounce(s,source);
 assert.equal(e.canUntap(evolved),true);
});

test('Legomeal beneath an evolution no longer applies its continuous restriction',()=>{
 const s=setup(),enemy=put(s,1,'battle',SMALL);
 const source=play(s,LEGO); pick(s,enemy.uid);
 evolve(s,'dmr16s-005',source);
 assert.equal(e.canUntap(enemy),true);
});

for(const accept of [false,true])test('Potter must mill, then may recover even the Hyper card it just milled '+accept,()=>{
 const s=setup(),own=s.players[0],top=inst(HYPER);
 own.deck.unshift(top);
 const nonHyper=put(s,0,'grave',SMALL),down=put(s,0,'grave',HYPER,{faceDown:true});
 play(s,POST);
 assert.ok(has(s,0,'grave',top));
 assert.equal(s.decision?.task?.op,'g34_Select');
 const options=s.decision.choices.map(x=>x.value?.uid??x.value);
 assert.ok(options.includes(top.uid)&&!options.includes(nonHyper.uid)&&!options.includes(down.uid));
 pick(s,accept?top.uid:null);
 drain(s);
 assert.equal(has(s,0,accept?'hand':'grave',top),true);
});

for(const accept of [false,true])test('Potter sees a friendly Hyper entrant from the grave, with an optional return '+accept,()=>{
 const s=setup(),post=put(s,0,'grave',POST),other=put(s,1,'grave',POST);
 play(s,SMALL);
 assert.equal(s.decision,null);
 play(s,HYPER);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.equal(s.decision.task.uid,post.uid);
 pick(s,accept?true:null);
 assert.equal(has(s,0,accept?'hand':'grave',post),true);
 assert.ok(has(s,1,'grave',other));
});

test('Potter waits for a real Hyper entry and cannot trigger retroactively from the grave',()=>{
 const s=setup(),p=s.players[0],late=inst(POST),down=put(s,0,'grave',POST,{faceDown:true});
 // The Hyper entrant is already on the board when a later on-entry mill resolves.
 p.deck.unshift(late);
 play(s,HYPER);
 assert.equal(s.decision,null);
 play(s,POST);
 drain(s);
 assert.ok(has(s,0,'grave',late)&&has(s,0,'grave',down));
 assert.ok(!has(s,0,'hand',late));
 play(s,HYPER);
 chooseReturn(s,late);
 assert.ok(has(s,0,'hand',late)&&has(s,0,'grave',down));
});

test('Potter has Slayer against a larger attacker',()=>{
 const s=setup();
 const potter=put(s,1,'battle',POST,{tapped:true}),attacker=put(s,0,'battle',BIG);
 attack(s,attacker.uid,potter.uid);
 drain(s);
 assert.ok(has(s,1,'grave',potter)&&has(s,0,'grave',attacker));
});

test('Potter in the grave cannot react to a creature entry suppressed by evolved GG',()=>{
 const s=setup(),post=put(s,0,'grave',POST);
 put(s,1,'battle','dm25rp3-S09',{under:[inst(SMALL)]});
 play(s,HYPER);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',post));
});

test('Zeos sees itself, can decline and accept later, and resets the use each turn',()=>{
 const s=setup(),own=s.players[0],count=own.shields.length;
 const source=play(s,ZEOS);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,null);
 play(s,SMALL);
 assert.equal(s.decision,null);
 const top=own.deck[0];
 play(s,DRAGON);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.equal(own.shields.length,count+1);
 assert.equal(own.shields.at(-1).uid,top.uid);
 assert.ok(!own.shields.at(-1).faceUp);
 play(s,DRAGON);
 drain(s);
 assert.equal(own.shields.length,count+1);
 next(s); next(s);
 play(s,DRAGON);
 pick(s,true);
 assert.equal(own.shields.length,count+2);
 assert.equal(e.effectiveCard(source,s).escape,true);
});

test('each Zeos can shield once, and only the owner’s dragons trigger it',()=>{
 const s=setup(),own=s.players[0],count=own.shields.length;
 const a=put(s,0,'battle',ZEOS),b=put(s,0,'battle',ZEOS);
 s.active=1; play(s,DRAGON); drain(s);
 assert.equal(own.shields.length,count);
 s.active=0; play(s,DRAGON);
 for(const x of [a,b]){
  if(s.decision?.type==='effectOrder')
   act(s,'orderEffect',action=>s.pendingEffects.some(y=>y.effectId===action.effectId&&y.uid===x.uid));
  assert.equal(s.decision?.task?.uid,x.uid);
  pick(s,true);
 }
 assert.equal(own.shields.length,count+2);
});

for(const [silencer,otherDragonTriggers] of [
 ['dmrp14-s05',false],['dm23bd1-007',true],['dm25rp3-S09',false],['dm24ex1-007',true]
]) test('Zeos distinguishes creature-entry suppression from another Dragon and a Dragon seed '+silencer,()=>{
 const s=setup(),own=s.players[0],count=own.shields.length;
 put(s,1,'battle',silencer,{...(silencer==='dm25rp3-S09'?{under:[inst(SMALL)]}:{})});
 if(silencer==='dm24ex1-007')for(let i=0;i<4;i++)put(s,1,'battle','dm24ex1-023');
 play(s,ZEOS);
 assert.equal(s.decision,null);
 play(s,DRAGON);
 if(otherDragonTriggers)pick(s,null);
 else assert.equal(s.decision,null);
 play(s,'dm25ex1-054');
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.equal(own.shields.length,count+1);
});

test('Zeos can block and use its own Escape to survive without enabling S Trigger',()=>{
 const s=setup(),enemy=put(s,0,'battle',BIG),source=put(s,1,'battle',ZEOS);
 const ally=put(s,1,'battle',COUNCIL),other=put(s,1,'battle',SMALL);
 const enemyCouncil=put(s,0,'battle',COUNCIL);
 for(const x of [source,ally])assert.equal(e.effectiveCard(x,s).escape,true);
 for(const x of [other,enemyCouncil])assert.equal(e.effectiveCard(x,s).escape,undefined);
 give(s,1,'shields',[BOUNCE]);
 const shield=s.players[1].shields[0];
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===source.uid);
 assert.equal(s.decision?.type,'leaveReplace');
 act(s,'replaceEscape');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',source)&&has(s,1,'hand',shield));
});

test('Zeos G Strike applies from a broken shield without tapping the target',()=>{
 const s=setup(),enemy=put(s,0,'battle',FIRE),later=put(s,0,'battle',SMALL);
 give(s,1,'shields',[ZEOS]);
 const shield=s.players[1].shields[0];
 attack(s,enemy.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'gsTarget');
 pick(s,later.uid);
 assert.ok(has(s,1,'hand',shield)&&!later.tapped);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
});
