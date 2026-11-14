import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BOL='dm23rp4-006',SHEKE='dm23rp4-016',BARBAT='dm23rp4-S06';
const FIRE='dm01-097',GREEN='dm01-108',ARMOR='dm23rp4-020',ARMOR_TWIN='dm23rp2-066';
const CARLY='dm23rp4-047',MAGIC='dm23rp4-043',PLAIN_MAGIC='dmrp11-074',DIAMOND='dmrp22-027',VOL='dm23rp4-S05';
const SEED='dm22rp2-035',KILL='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1292.json');

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

test('nine reference prints resolve to their three canonical IDs with complete official abilities',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[BOL,SHEKE,BARBAT]);
 assert.equal(manifest.printAliases.length,6);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[front,back]=row.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1292}),row.spec);
  if(back)assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
   [back.name,back.cost,back.civilizations,back.abilityText]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.find(x=>x.id===row.id),{id:row.id,canonicalId:id,name:row.name,image:row.image,source:row.source});
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

function change(s,from){
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,from.uid);
}

test('Bolshugos exchanges with Armored, attacks on entry and grants Blocker only to allied creatures',()=>{
 const s=field(),ally=add(s,0,'battle',FIRE),seed=add(s,0,'battle',SEED);
 const enemy=add(s,1,'battle',FIRE),attacker=add(s,0,'battle',ARMOR);
 const bol=add(s,0,'hand',BOL);
 attack(s,attacker.uid);
 change(s,attacker);
 assert.ok(has(s,0,'hand',attacker)&&has(s,0,'battle',bol));
 assert.ok(e.effectiveCard(ally,s).blocker);
 assert.ok(![bol,enemy,seed].some(x=>e.effectiveCard(x,s).blocker));
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 const paid=field(),summoned=play(paid,BOL);
 attack(paid,summoned.uid);
 drain(paid);
 assert.equal(paid.players[1].shields.length,4);
});

for(const selected of [true,false]){
 test('Bolshugos looks at five, optionally reveals one Armored and orders remaining cards '+selected,()=>{
  const s=field(),ids=[FIRE,ARMOR_TWIN,GREEN,FIRE,GREEN,ARMOR];
  give(s,0,'deck',ids);
  const cards=[...s.players[0].deck],spell=play(s,BOL,1);
  const revealed=()=>s.log.filter(x=>x.type==='reveal').map(x=>x.cardId);
  assert.deepEqual(picks(s),[cards[1].uid,null]);
  assert.deepEqual(s.decision.task.ids,cards.slice(0,5).map(x=>x.uid));
  assert.deepEqual(revealed(),[]);
  pick(s,selected?cards[1].uid:null);
  assert.equal(s.decision?.task?.op,'g34_Order');
  const remaining=cards.slice(0,5).filter(x=>!selected||x!==cards[1]).reverse();
  for(const x of remaining.slice(0,-1))pick(s,x.uid);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),[cards[5],...remaining].map(x=>x.uid));
  assert.deepEqual(revealed(),selected?[ARMOR_TWIN]:[]);
  assert.equal(has(s,0,'hand',cards[1]),selected);
  assert.ok(has(s,0,'grave',spell));
 });
}

for(const [origin,removal] of [['hand','dm01-086'],['mana','dmc27-055'],['grave',KILL],['shields','dm22rp1-030']]){
 test('Bolshugos ends its aura and may cast through Mega Last Burst from '+origin,()=>{
  let s=field(1);
  const bol=add(s,0,'battle',BOL),ally=add(s,0,'battle',FIRE);
  assert.equal(e.effectiveCard(ally,s).blocker,true);
  give(s,0,'deck',[ARMOR,FIRE,GREEN,FIRE,GREEN,GREEN]);
  const top=s.players[0].deck[0];
  play(s,removal);
  pick(s,bol.uid);
  assert.ok(has(s,0,origin,bol));
  assert.ok(!e.effectiveCard(ally,s).blocker);
  if(origin==='shields'){
   assert.equal(s.decision,null);
   return;
  }
  assert.equal(s.decision.task.op,'g21Mega');
  s=structuredClone(s);
  pick(s,true);
  pick(s,top.uid);
  drain(s);
  assert.ok(has(s,0,'hand',top)&&has(s,0,'grave',bol));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 });
}

test('Shekedan forces existing opposing creatures to attack whenever able until its next turn',()=>{
 const s=field(),first=add(s,1,'battle',FIRE),own=add(s,0,'battle',FIRE);
 const sheke=play(s,SHEKE);
 assert.ok(e.effectiveCard(sheke,s).blocker);
 assert.equal(e.effectiveCard(sheke,s).breaker,2);
 assert.ok(e.effectiveCard(first,s).mustAttack);
 assert.ok(!e.effectiveCard(own,s).mustAttack);
 end(s);
 s.phase='main';
 const late=play(s,CARLY);
 drain(s);
 assert.ok(!e.effectiveCard(late,s).mustAttack);
 s.phase='attack';
 const canEnd=()=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
 assert.ok(!canEnd());
 attack(s,first.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(canEnd());
 first.tapped=false;
 assert.ok(!canEnd());
 first.tapped=true;
 end(s);
 assert.ok(!e.effectiveCard(first,s).mustAttack);
});

test('Domestic Eye offers only the opposing player’s eligible untapped creatures',()=>{
 const s=field(),target=add(s,1,'battle',FIRE),tapped=add(s,1,'battle',FIRE,{tapped:true});
 const seed=add(s,1,'battle',SEED),protectedUnit=add(s,1,'battle',GREEN);
 add(s,0,'battle',FIRE);
 (s.extLimits??=[]).push({kind:'g521Grant',g565External:true,ref:{uid:protectedUnit.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'end',who:0});
 const spell=play(s,SHEKE,1);
 assert.equal(s.decision.player,1);
 assert.deepEqual(picks(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'grave',spell));
 assert.ok([tapped,seed,protectedUnit].every(x=>has(s,1,'battle',x)));
});

test('Domestic Eye is a free S-Trigger and excludes the tapped attacker',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),target=add(s,0,'battle',FIRE);
 const shield=trigger(s,attacker,SHEKE,{face:1});
 assert.equal(s.decision.player,0);
 assert.deepEqual(picks(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,0,'grave',target)&&has(s,1,'grave',shield));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});

test('Shekedan can cast Domestic Eye from the grave as Mega Last Burst',()=>{
 const s=field(1),sheke=add(s,0,'battle',SHEKE),target=add(s,1,'battle',FIRE);
 play(s,KILL);
 pick(s,sheke.uid);
 assert.equal(s.decision.task.op,'g21Mega');
 pick(s,true);
 pick(s,target.uid);
 assert.ok(has(s,0,'grave',sheke)&&has(s,1,'grave',target));
});

for(const eligible of [true,false]){
 test('Barbat Chess destroys a creature of at most 10000, then draws two even without a target '+eligible,()=>{
  const s=field(),big=add(s,1,'battle',BARBAT),top=s.players[0].deck.slice(0,2);
  const limit=eligible?add(s,1,'battle',MAGIC,{buff:1000}):null;
  const unit=play(s,BARBAT);
  if(limit){
   assert.deepEqual(picks(s),[limit.uid]);
   pick(s,limit.uid);
   assert.ok(has(s,1,'grave',limit));
  }
  assert.ok(top.every(x=>has(s,0,'hand',x)));
  assert.ok(has(s,1,'battle',big));
  attack(s,unit.uid);
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 });
}

test('Barbat Chess Revolution Change checks the attacking creature’s cost and Magic race',()=>{
 for(const [id,allowed] of [[PLAIN_MAGIC,true],[ARMOR,false],[CARLY,false]]){
  const s=field(),base=add(s,0,'battle',id),after=add(s,0,'hand',BARBAT);
  attack(s,base.uid);
  assert.equal(s.decision.task?.op==='revDeclare',allowed);
  if(allowed)change(s,base);
  drain(s);
  assert.equal(has(s,0,'battle',after),allowed);
  assert.equal(s.players[1].shields.length,allowed?3:4);
 }
});

test('Barbat Chess terminal starts before the turn draw, survives its source leaving and fires on repeated Magic uses',()=>{
 const s=field(1),barbat=add(s,0,'battle',BARBAT);
 const before=s.players[0].deck.length;
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.players[0].deck.length,before);
 assert.equal(s.decision.task.op,'g34_BarbatChessTerminal1292');
 pick(s,true);
 assert.equal(s.players[0].deck.length,before-1);
 assert.deepEqual(s.g7TerminalUsed,[true,false]);
 if(s.phase==='charge')act(s,'skipCharge');
 for(const [c,price] of [[e.card(MAGIC),3],[e.card(CARLY),1],[e.card(CARLY).spellFace,1],[e.card(FIRE),2]])
  assert.equal(e.summonCost(s,0,c),price);
 play(s,'dm01-086');
 pick(s,barbat.uid);
 assert.ok(has(s,0,'hand',barbat));
 assert.equal(e.summonCost(s,0,e.card(CARLY).spellFace),1);
 assert.equal(s.decision,null);
 for(const n of [0,1]){
  const initial=s.players[0].deck.length;
  play(s,CARLY,1);
  assert.equal(s.decision.task.op,'g34_Draw');
  pick(s,n);
  assert.equal(s.players[0].deck.length,initial-n);
 }
 const unit=play(s,PLAIN_MAGIC);
 assert.ok(has(s,0,'battle',unit));
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 assert.equal(s.decision,null);
 end(s);
 assert.equal(e.summonCost(s,0,e.card(CARLY).spellFace),4);
});

test('Barbat Chess may decline, then shares its per-player limit with other Terminal cards',()=>{
 const s=field(1);
 add(s,0,'battle',BARBAT);
 end(s);
 pick(s,null);
 assert.ok(!s.g7TerminalUsed?.[0]);
 end(s);
 end(s);
 pick(s,true);
 add(s,0,'battle',VOL);
 end(s);
 end(s);
 assert.equal(s.decision,null);
 assert.deepEqual(s.g7TerminalUsed,[true,false]);
});

test('Diamond Star nullifies the entire follow-up even after it leaves (QA 44206)',()=>{
 const s=field(1),star=add(s,1,'battle',DIAMOND);
 add(s,0,'battle',BARBAT);
 end(s);
 pick(s,true);
 assert.deepEqual(s.g7TerminalUsed,[true,false]);
 if(s.phase==='charge')act(s,'skipCharge');
 play(s,KILL);
 pick(s,star.uid);
 assert.ok(has(s,1,'grave',star));
 assert.equal(e.summonCost(s,0,e.card(CARLY).spellFace),4);
 play(s,CARLY,1);
 assert.equal(s.decision,null);
});
