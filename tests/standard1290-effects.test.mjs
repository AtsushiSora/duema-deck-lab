import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SHU='dm23rp4-046',BEKA='dm23rp4-022',RICH='dm23rp4-004';
const S_TRIGGER='dmrp04m-012',KILL='dm01-027',FIRE='dm01-097';
const GREEN='dm01-108',SMALL='dm01-083',ABYSS='dm23rp4-049';
const ABYSS_SPELL='dm23rp2-039',DOKI='dm23rp3-013';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1290.json');

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(GREEN));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const picks=s=>s.decision?.choices?.map(({value})=>value?.uid??value);
const pick=(s,value)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets.some(target=>target.uid===value)):
 act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

function trigger(s,attacker,id,{last=true,face=0}={}){
 give(s,1-s.active,'shields',last?[id]:[id,GREEN]);
 const shield=s.players[1-s.active].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type!=='trigger'&&e.getLegalActions(s).some(a=>a.kind==='breakShields'))
  act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===face);
 return shield;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 if(s.phase==='charge')act(s,'skipCharge');
}

test('twelve official prints preserve three canonical card definitions and deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[SHU,BEKA,RICH]);
 assert.equal(manifest.printAliases.length,9);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),[front,back]=x.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,parseInt(front.powerText,10),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1290}),x.spec);
  if(back)assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
   [back.name,back.cost,back.civilizations,back.abilityText]);
  assert.equal(catalogue.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Schwarzring can put a whole shield into the graveyard and the opponent chooses their own creature',()=>{
 const s=field(),target=add(s,1,'battle',GREEN),spare=add(s,1,'battle',FIRE);
 const shield=inst(S_TRIGGER),extra=inst(S_TRIGGER);
 s.players[0].shields=[shield];
 shield.shieldStack=[extra];
 const creature=play(s,SHU);
 assert.equal(s.decision.player,0);
 pick(s,shield.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(picks(s),[target.uid,spare.uid]);
 assert.ok([shield,extra].every(x=>has(s,0,'grave',x)));
 pick(s,spare.uid);
 assert.ok(has(s,1,'grave',spare)&&has(s,1,'battle',target)&&has(s,0,'battle',creature));
 assert.equal(s.players[0].shields.length,0);
});

for(const hasShield of [false,true]){
 test('Schwarzring does nothing when the shield is absent or payment is declined: '+hasShield,()=>{
  const s=field(),target=add(s,1,'battle',FIRE);
  if(!hasShield)s.players[0].shields=[];
  play(s,SHU);
  if(hasShield)pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'battle',target));
  assert.equal(s.players[0].shields.length,hasShield?5:0);
 });
}
test('Schwarzring’s spell taps the entire opposing field, including a creature with choice protection',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),untargetable=add(s,0,'battle',SMALL);
 const other=add(s,0,'battle',GREEN),own=add(s,1,'battle',SMALL);
 (s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:untargetable.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'end',who:0});
 const shield=trigger(s,attacker,SHU,{face:1});
 assert.ok(attacker.tapped&&untargetable.tapped&&other.tapped&&!own.tapped);
 assert.ok(has(s,1,'grave',shield));
});
test('Schwarzring’s opposing choice respects that player’s protected creature (QA 45224)',()=>{
 const s=field(),protectedCreature=add(s,1,'battle',FIRE),target=add(s,1,'battle',GREEN);
 (s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:protectedCreature.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'end',who:0});
 play(s,SHU);
 pick(s,s.players[0].shields[0].uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(picks(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
});

test('Bekarine buffs other allied Abyss creatures, stacks and loses its aura when it leaves',()=>{
 const s=field(),ally=add(s,0,'battle',ABYSS),plain=add(s,0,'battle',FIRE),enemy=add(s,1,'battle',ABYSS);
 const one=play(s,BEKA);
 assert.equal(e.power(one,false,s),14000);
 assert.equal(e.effectiveCard(one,s).breaker,3);
 assert.equal(e.power(ally,false,s),10000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,true);
 assert.equal(e.power(plain,false,s),2000);
 assert.equal(e.power(enemy,false,s),4000);
 const two=play(s,BEKA);
 assert.equal(e.power(one,false,s),20000);
 assert.equal(e.power(ally,false,s),16000);
 assert.deepEqual(e.effectiveCard(one,s).g633BreakerChoices,[3,4]);
 assert.equal(e.power(two,false,s),20000);
 end(s);
 play(s,KILL);
 pick(s,two.uid);
 assert.equal(e.power(one,false,s),14000);
 assert.equal(e.power(ally,false,s),10000);
 play(s,KILL);
 pick(s,one.uid);
 assert.equal(e.power(ally,false,s),4000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,undefined);
});

test('Bekarine can attack an untapped creature on entry and uses T-Breaker on subsequent turn',()=>{
 const s=field(),target=add(s,1,'battle',FIRE),bekarine=play(s,BEKA);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===bekarine.uid&&a.target==='player'));
 attack(s,bekarine.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target));
 end(s);
 end(s);
 attack(s,bekarine.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

for(const breaks of [3,4]){
 test('Bekarine can choose between T-Breaker and granted Powered Breaker: '+breaks,()=>{
  const s=field(),attacker=add(s,0,'battle',BEKA);
  play(s,BEKA);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
  assert.deepEqual(picks(s),[3,4]);
  pick(s,breaks);
  drain(s);
  assert.equal(s.players[1].shields.length,5-breaks);
 });
}

test('Underhand spell places one Abyss card, including a spell, tapped into mana',()=>{
 for(const selected of [ABYSS,ABYSS_SPELL]){
  const s=field(),twin=add(s,0,'grave',ABYSS),spell=add(s,0,'grave',ABYSS_SPELL);
  const ineligible=add(s,0,'grave',KILL),foreign=add(s,1,'grave',ABYSS);
  const underhand=play(s,BEKA,1);
  assert.deepEqual(picks(s),[twin.uid,spell.uid]);
  const moved=selected===ABYSS?twin:spell;
  pick(s,moved.uid);
  assert.ok(has(s,0,'mana',moved)&&moved.tapped&&has(s,0,'grave',underhand));
  assert.ok(has(s,0,'grave',ineligible)&&has(s,1,'grave',foreign));
 }
});

test('Underhand spell resolves without moving a non-Abyss card',()=>{
 const s=field(),ineligible=add(s,0,'grave',KILL);
 const spell=play(s,BEKA,1);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',ineligible)&&has(s,0,'grave',spell));
 assert.ok(!has(s,0,'mana',ineligible));
});

test('Richimore exchanges during an Abyss attack and the new attacker continues with the buff',()=>{
 const s=field(),abyss=add(s,0,'battle',ABYSS),rich=add(s,0,'hand',RICH);
 attack(s,abyss.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,abyss.uid);
 assert.ok(has(s,0,'hand',abyss)&&has(s,0,'battle',rich));
 pick(s,rich.uid);
 assert.equal(e.power(rich,true,s),8000);
 assert.equal(e.effectiveCard(rich,s).poweredBreaker,true);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);
 assert.equal(e.power(rich,false,s),4000);
 assert.equal(e.effectiveCard(rich,s).poweredBreaker,undefined);
});

test('Richimore has no Revolution Change from a non-Abyss attack',()=>{
 const s=field(),plain=add(s,0,'battle',FIRE),rich=add(s,0,'hand',RICH);
 attack(s,plain.uid);
 assert.notEqual(s.decision?.task?.op,'revDeclare');
 drain(s);
 assert.ok(has(s,0,'hand',rich));
 assert.equal(s.players[1].shields.length,4);
});

test('Richimore can designate its protected ally for the temporary power and Powered Breaker',()=>{
 const s=field(),ally=add(s,0,'battle',FIRE),enemy=add(s,1,'battle',DOKI);
 (s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:ally.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'end',who:0});
 const rich=play(s,RICH);
 assert.deepEqual(picks(s),[ally.uid,rich.uid]);
 pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),6000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,true);
 assert.equal(e.power(rich,false,s),4000);
 assert.equal(e.power(enemy,false,s),2000);
 end(s);
 assert.equal(e.power(ally,false,s),2000);
});

test('Richimore can attack an untapped creature on its own summon turn',()=>{
 const s=field(),target=add(s,1,'battle',FIRE),rich=play(s,RICH);
 pick(s,rich.uid);
 attack(s,rich.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'battle',rich));
});

function discardSecond(s,p){
 assert.equal(s.decision.player,p);
 assert.deepEqual(picks(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&x.label.startsWith('裏向きの手札')));
 pick(s,1);
}
test('Richimore spell discards one hidden card, chosen by the caster',()=>{
 const s=field(),first=add(s,1,'hand',FIRE),second=add(s,1,'hand',GREEN);
 const spell=play(s,RICH,1);
 discardSecond(s,0);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second)&&has(s,0,'grave',spell));
});

for(const [origin,removal] of [['hand','dm01-086'],['mana','dmc27-055'],['grave',KILL],['shields','dm22rp1-030']]){
 test('Richimore’s Mega Last Burst resolves from '+origin,()=>{
  let s=field(1);
  const rich=add(s,0,'battle',RICH),first=add(s,1,'hand',FIRE),second=add(s,1,'hand',GREEN);
  play(s,removal);
  pick(s,rich.uid);
  assert.ok(has(s,0,origin,rich));
  if(origin==='shields'){
   assert.equal(s.decision,null);
   return;
  }
  assert.equal(s.decision.task.op,'g21Mega');
  s=JSON.parse(JSON.stringify(s));
  pick(s,true);
  discardSecond(s,0);
  assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second)&&has(s,0,'grave',rich));
 });
}
