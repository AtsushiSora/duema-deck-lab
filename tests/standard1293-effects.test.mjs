import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const YURU='dm23rp4-015',ALDE='dm23rp4-027',TANK='dm23rp4-062';
const BRAIN='dm01-052',SHAPER='dm03-011',WOZ='dmrp09-003',PAT='dm23rp3-046',SHEKE='dm22rp1-2A';
const CARLY='dm23rp4-047',FIRE='dm01-097',GREEN='dm01-108',KILL='dm01-027',SEED='dm22rp2-035';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',DIAMOND='dmrp22-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1293.json');

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

test('seven official prints preserve three canonical IDs and their complete abilities',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[YURU,ALDE,TANK]);
 assert.equal(manifest.printAliases.length,4);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[front]=row.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1293}),row.spec);
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

test('Yurufuwa declares before the first water spell resolves, then enters and can block',()=>{
 let s=field(),first=add(s,0,'hand',YURU),second=add(s,0,'hand',YURU);
 const drawn=s.players[0].deck[0];
 play(s,'dm24rp1-066');
 drain(s);
 play(s,BRAIN);
 assert.equal(s.decision.task.op,'g34_YurufuwaDeclare1293');
 assert.ok(!has(s,0,'hand',drawn));
 s=structuredClone(s);
 pick(s,true);
 assert.equal(s.decision.task.op,'g34_YurufuwaDeclare1293');
 pick(s,null);
 assert.equal(s.decision.type,'draw');
 assert.ok(!has(s,0,'battle',first));
 act(s,'draw',a=>a.n===1);
 assert.ok(has(s,0,'hand',drawn)&&has(s,0,'hand',second)&&has(s,0,'battle',first));
 assert.ok(e.effectiveCard(first,s).blocker);
});

test('Yurufuwa drawn by the first water spell cannot declare, including on the second spell (QA 44191)',()=>{
 const s=field(),drawn=inst(YURU);
 s.players[0].deck.unshift(drawn);
 play(s,BRAIN);
 assert.equal(s.decision.type,'draw');
 act(s,'draw',a=>a.n===3);
 assert.ok(has(s,0,'hand',drawn));
 play(s,BRAIN);
 assert.equal(s.decision.type,'draw');
 act(s,'draw',a=>a.n===0);
 assert.ok(has(s,0,'hand',drawn)&&!has(s,0,'battle',drawn));
});

test('Yurufuwa can declare on the opponent’s turn from its own S-Trigger and again next turn',()=>{
 const s=field(),yuru=add(s,1,'hand',YURU),other=add(s,1,'hand',YURU),attacker=add(s,0,'battle',FIRE);
 trigger(s,attacker,CARLY,{face:1});
 assert.equal(s.decision.player,1);
 pick(s,true);
 pick(s,null);
 pick(s,attacker.uid);
 pick(s,'deck');
 drain(s);
 assert.ok(has(s,1,'battle',yuru)&&has(s,1,'hand',other));
 end(s);
 play(s,BRAIN);
 assert.equal(s.decision.task.op,'g34_YurufuwaDeclare1293');
 pick(s,true);
 act(s,'draw',a=>a.n===0);
 assert.ok(has(s,1,'battle',other));
});

test('Yurufuwa declares for the spell’s physical owner when the opponent casts it (QA 44190)',()=>{
 const s=field(),yuru=add(s,1,'hand',YURU),shaper=add(s,1,'grave',SHAPER);
 const before=s.players[0].deck.map(x=>x.uid);
 play(s,WOZ);
 pick(s,shaper.uid);
 pick(s,shaper.uid);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_YurufuwaDeclare1293');
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
 pick(s,true);
 drain(s);
 assert.ok(has(s,1,'battle',yuru)&&has(s,1,'deck',shaper));
});

test('Alde may tap its own untapped creature before paying the reduced cost',()=>{
 const s=field(),donor=add(s,0,'battle',FIRE),tapped=add(s,0,'battle',FIRE,{tapped:true});
 const seed=add(s,0,'battle',SEED),foreign=add(s,1,'battle',FIRE);
 const alde=add(s,0,'hand',ALDE);
 give(s,0,'mana',[LIGHT,GREEN,GREEN]);
 const alternatives=e.getLegalActions(s).filter(a=>a.uid===alde.uid);
 assert.deepEqual(alternatives.map(a=>[a.tapUid,a.cost]),[[donor.uid,3]]);
 act(s,'play',a=>a.tapUid===donor.uid&&a.uid===alde.uid);
 assert.ok(has(s,0,'battle',alde)&&donor.tapped);
 assert.ok(tapped.tapped&&!seed.tapped&&!foreign.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});

test('Alde can be summoned normally, and Diamond Star suppresses the alternate payment',()=>{
 const s=field(),donor=add(s,0,'battle',FIRE);
 add(s,1,'battle',DIAMOND);
 const alde=add(s,0,'hand',ALDE);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===alde.uid&&a.tapUid));
 act(s,'play',a=>a.uid===alde.uid&&!a.alternative);
 assert.ok(!donor.tapped&&has(s,0,'battle',alde));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Alde can replace destruction with Escape without using the shield’s S-Trigger',()=>{
 const s=field(1),alde=add(s,0,'battle',ALDE);
 give(s,0,'shields',[BRAIN]);
 const shield=s.players[0].shields[0];
 play(s,KILL);
 pick(s,alde.uid);
 act(s,'replaceEscape');
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',alde)&&has(s,0,'hand',shield));
});

test('Tankrio destroys only the selected donors, limits the discounted price to one and is optional',()=>{
 const s=field(),left=add(s,0,'battle',TANK),right=add(s,0,'battle',TANK);
 const summon=add(s,0,'hand',SHEKE),ordinary=add(s,0,'hand',FIRE);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===summon.uid&&!a.alternative));
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===ordinary.uid&&a.sasage));
 act(s,'play',a=>a.uid===summon.uid&&a.sasage?.length===2&&a.cost===1);
 assert.ok(has(s,0,'battle',summon)&&has(s,0,'grave',left)&&has(s,0,'grave',right));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
});

test('Tankrio discounts each summon once while Patofar prevents it from leaving (QA 44192)',()=>{
 const s=field(),tank=play(s,TANK);
 play(s,PAT);
 pick(s,tank.uid);
 for(let i=0;i<2;i++){
  const unit=add(s,0,'hand',SHEKE);
  const cost=i===0?3:1;
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.uid===unit.uid&&a.sasage).map(a=>[a.sasage,a.cost]),[[[tank.uid],cost]]);
  const before=s.players[0].mana.filter(x=>x.tapped).length;
  act(s,'play',a=>a.uid===unit.uid&&a.sasage?.[0]===tank.uid);
  if(s.decision)drain(s);
  assert.ok(has(s,0,'battle',tank)&&has(s,0,'battle',unit));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length-before,cost);
 }
});

test('Alde may tap a creature protected from ability selection and cancel manual payment',()=>{
 let s=field();
 const donor=add(s,0,'battle',FIRE),alde=add(s,0,'hand',ALDE);
 s.extLimits=[{kind:'g521Grant',g565External:true,ref:{uid:donor.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true}}];
 give(s,0,'mana',[LIGHT,GREEN,GREEN]);
 assert.ok(e.effectiveCard(donor,s).g1082ChoiceProtected);
 const action=()=>e.getLegalActions(s).find(a=>a.uid===alde.uid&&a.tapUid===donor.uid);
 e.step(s,action(),{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.equal(s.decision.cost,3);
 assert.ok(!donor.tapped);
 act(s,'cancelMana');
 assert.ok(has(s,0,'hand',alde)&&!donor.tapped);
 e.step(s,action(),{manualMana:true});
 s=structuredClone(s);
 while(s.decision?.type==='manaPayment')e.step(s,e.chooseAI(s),{manualMana:true});
 assert.ok(has(s,0,'battle',alde)&&s.players[0].battle.find(x=>x.uid===donor.uid).tapped);
});

test('Alde can combine its tap with Tankrio’s destruction in the same summon',()=>{
 const s=field(),tank=add(s,0,'battle',TANK),donor=add(s,0,'battle',FIRE);
 const alde=add(s,0,'hand',ALDE);
 give(s,0,'mana',[LIGHT]);
 const actions=e.getLegalActions(s).filter(a=>a.uid===alde.uid);
 assert.ok(actions.length>0&&actions.every(a=>a.cost===1&&a.sasage[0]===tank.uid&&a.tapUid));
 act(s,'play',a=>a.uid===alde.uid&&a.tapUid===donor.uid&&a.sasage[0]===tank.uid);
 assert.ok(has(s,0,'battle',alde)&&has(s,0,'grave',tank)&&donor.tapped);
 assert.ok(s.players[0].mana[0].tapped);
});
