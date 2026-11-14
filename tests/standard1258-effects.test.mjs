import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GITARO='dmrp06-029',SLIME='dm02-046',TACCO='dmrp06-040';
const REPRINTS=['dmc27-046','dmc42-072','dmx22b-139','dmsd16-013'];
const WATER='dm01-083',FIRE='dm01-097',NATURE='dm01-108',SMALL='dm10-076';
const GATE='dm01-086',CLUB='dmrp18-087',FLASH='dm01-046',THUNDER='dmr12-036',SPARK='dm01-015';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
function closeTurn(s){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');drain(s);act(s,'skipCharge');
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const nativeTargets=s=>s.decision?.targets?.map(x=>x.uid)??[];
const choose=(s,x)=>act(s,'effect',a=>a.targets.length===1&&a.targets[0].uid===x.uid);
const selected=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const power=(s,x)=>e.power(x,false,s);

test('all seven verified prints map to three existing canonical IDs with full definitions and reference art',()=>{
 const m=read('tools/support-phase-1258.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GITARO,SLIME,TACCO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),REPRINTS.map(id=>[id,SLIME]));
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1258}),row.spec);
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>['光','水','闇','火','自然'].includes(x)),1,4]);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],image);assert.equal(c.text,f.abilityText);
  }
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Gitaro forces the opponent’s S-trigger to select it even when the opponent’s own creature is eligible',()=>{
 const s=field(),attacker=add(s,0,'battle',WATER),own=add(s,1,'battle',NATURE);
 const git=add(s,0,'hand',GITARO);act(s,'play',a=>a.uid===git.uid);
 give(s,1,'shields',[GATE]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===GATE);
 assert.deepEqual(nativeTargets(s),[git.uid]);choose(s,git);
 assert.ok(has(s,0,'hand',git)&&has(s,0,'battle',attacker)&&has(s,1,'battle',own));
});

test('Gitaro cannot force an illegal choice and a second target can be another creature (QA 45129)',()=>{
 for(const protectedGitaro of [false,true]){
  const s=field(),attacker=add(s,0,'battle',WATER),other=add(s,0,'battle',NATURE);
  const git=add(s,0,'hand',GITARO);act(s,'play',a=>a.uid===git.uid);
  if(protectedGitaro)git.g34Grants=[{turn:s.turn,untargetable:true}];
  give(s,1,'shields',[FLASH]);
  // This legacy spell is in a shield that already has a granted S・トリガー.
  s.players[1].shields[0].g19ShieldST=1;
  attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===FLASH);
  const choices=e.getLegalActions(s).filter(a=>a.kind==='effect').map(a=>a.targets.map(t=>t.uid));
  if(protectedGitaro)assert.deepEqual(choices,[[],[attacker.uid],[attacker.uid,other.uid],[other.uid]]);
  else{
   assert.ok(choices.some(x=>x.length===2&&x.includes(git.uid)&&x.includes(other.uid)));
   assert.ok(choices.filter(x=>x.length).every(x=>x.includes(git.uid)));
  }
  drain(s);closeTurn(s);
  cast(s,CLUB);assert.deepEqual(selected(s),[attacker.uid,other.uid,git.uid]);
 }
});

test('Gitaro takes the first slot in a two-target spell without removing the second slot',()=>{
 const s=field(),attacker=add(s,0,'battle',WATER),other=add(s,0,'battle',NATURE);
 const git=add(s,0,'hand',GITARO);act(s,'play',a=>a.uid===git.uid);
 give(s,1,'shields',[THUNDER]);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===THUNDER);
 assert.deepEqual(selected(s),[git.uid,null]);
 act(s,'extended',a=>selected(s)[a.choice]===git.uid);
 assert.ok(selected(s).includes(other.uid));
 act(s,'extended',a=>selected(s)[a.choice]===other.uid);
 assert.ok(git.tapped&&other.tapped);
});

test('Slime survives attacking a creature or blocking, but is destroyed after attacking a player',()=>{
 for(const mode of ['creature','block','player','blockedPlayer']){
  const s=field(),slime=add(s,0,'battle',SLIME,{cardOwner:1});
  if(mode==='block'){
   closeTurn(s);
   attack(s,add(s,1,'battle',SMALL).uid);act(s,'block',a=>a.uid===slime.uid);drain(s);
  }else{
   const weak=add(s,1,'battle',mode==='blockedPlayer'?'dm01-051':SMALL,{tapped:mode==='creature'});
   // Ensure the battle is won when a player attack gets blocked.
   if(mode==='blockedPlayer')weak.powerModifiers=[{amount:-500}];
   attack(s,slime.uid,mode==='creature'?weak.uid:'player');
   if(mode==='blockedPlayer')act(s,'block',a=>a.uid===weak.uid);else act(s,'noBlock');
   drain(s);
   if(mode==='player')assert.equal(s.players[1].shields.length,4);
  }
  const playerAttack=mode==='player'||mode==='blockedPlayer';
  assert.equal(has(s,1,'grave',slime),playerAttack);
  assert.equal(has(s,0,'battle',slime),!playerAttack);
 }
});

test('Tacco blocks but cannot attack, and each own cast adds 4000 until its next start',()=>{
 const s=field(),tacco=add(s,0,'battle',TACCO);
 for(let i=0;i<2;i++)cast(s,SPARK);
 assert.equal(power(s,tacco),10000);
 act(s,'toAttack');assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===tacco.uid));
 closeTurn(s);
 const a=add(s,1,'battle',FIRE);
 cast(s,'dm01-052');drain(s);assert.equal(power(s,tacco),10000);
 attack(s,a.uid);act(s,'block',x=>x.uid===tacco.uid);drain(s);
 assert.ok(has(s,0,'battle',tacco)&&has(s,1,'grave',a));
 closeTurn(s);assert.equal(power(s,tacco),2000);
});

test('Tacco also gains power after its own S-trigger on the opponent’s turn',()=>{
 const s=field(),tacco=add(s,1,'battle',TACCO),a=add(s,0,'battle',FIRE),b=add(s,0,'battle',WATER);
 give(s,1,'shields',[GATE]);
 attack(s,a.uid);act(s,'noBlock');act(s,'useTrigger',x=>x.cardId===GATE);
 assert.equal(power(s,tacco),2000);
 choose(s,b);
 assert.equal(power(s,tacco),6000);assert.ok(has(s,0,'hand',b));
 closeTurn(s);assert.equal(power(s,tacco),2000);
});
