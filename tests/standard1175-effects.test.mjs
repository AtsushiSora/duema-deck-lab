import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SIRIES='dm23rp1-011',TABLE='dm23ex3-030',CANNON='dm23rp3-021';
const FIRE='dm01-097',NATURE='dm01-108',RITUAL='dmrp17-010';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const choices=s=>s.decision.choices.map(({value})=>value?.uid??value);
const MECHA='dm24rp2-053',SEED='dmrp22-048',CUBE='dm23ex3-026',TROY='dm23sd2-014',ZENITH='dmx13-011';

test('phase 1175 checks the three official definitions and seven print aliases',()=>{
 const m=read('tools/support-phase-1175.json'),registry=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[SIRIES,TABLE,CANNON]);
 assert.equal(m.printAliases.length,7);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1175}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   [id===TABLE?'field':'creature',f.cost,f.civilizations.filter(x=>x!=='無色'),f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(images.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'},...row.faces.slice(1)]},{phase:1175}));
 }
});

test('Siries can see its own entry and an allied Mecha tamaseed, drawing at most once per turn',()=>{
 const s=field(),own=s.players[0],before=own.deck.length;
 cast(s,SIRIES);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 cast(s,SEED);
 const draw=s.pendingEffects.find(x=>x.source===SIRIES);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.effectId===draw.effectId);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,true);
 drain(s);
 cast(s,MECHA);
 assert.equal(s.decision,null);
 assert.equal(own.deck.length,before-1);
});

test('Troy can deploy a Mecha after Siries sacrifices its other Mecha tamaseed (QA43296)',()=>{
 const s=field(),own=s.players[0],source=put(s,0,'battle',SIRIES);
 const sacrifice=put(s,0,'battle',SEED),wrong=put(s,0,'battle',FIRE),deployed=put(s,0,'hand',MECHA);
 cast(s,TROY);
 pick(s,source.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceAter').map(a=>a.uid),[sacrifice.uid]);
 act(s,'replaceAter',a=>a.uid===sacrifice.uid);
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,deployed.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 assert.ok(own.battle.includes(source)&&own.battle.includes(deployed)&&own.battle.includes(wrong));
 assert.ok(own.grave.includes(sacrifice));
});

test('Siries does not trigger for a creature with Mecha only in its name (QA43064)',()=>{
 const s=field(),own=s.players[0],before=own.deck.length;
 put(s,0,'battle',SIRIES);
 cast(s,'dm22rp2-041');
 drain(s);
 assert.equal(s.decision,null);
 assert.equal(own.deck.length,before);
 cast(s,MECHA);
 assert.equal(s.decision.task.op,'g34_Offer');
});

test('Cube queues both mana placements for the Temple, which can turn only one face down (QA45092)',()=>{
 const s=field(),own=s.players[0];
 cast(s,TABLE);
 const [first,second]=own.deck;
 cast(s,CUBE);
 assert.equal(s.decision.type,'effectOrder');
 const crystals=s.pendingEffects.filter(x=>x.source===TABLE&&x.task.op==='g34_CrystalManaDown1175');
 assert.deepEqual(crystals.map(x=>x.task.target),[first.uid,second.uid]);
 act(s,'orderEffect',a=>a.effectId===crystals[1].effectId);
 pick(s,true);
 assert.equal(s.decision,null);
 assert.ok(second.faceDown);
 assert.ok(!first.faceDown);
});

test('Temple can D-switch once per entry, untapping only the face-down mana',()=>{
 const s=field(),own=s.players[0];
 const fieldCard=put(s,0,'hand',TABLE);
 act(s,'play',a=>a.uid===fieldCard.uid);
 const [first,second,up]=own.mana;
 first.faceDown=true;
 second.faceDown=true;
 cast(s,ZENITH);
 assert.equal(s.decision.task.op,'g34_CrystalSwitch1175');
 first.tapped=second.tapped=up.tapped=true;
 pick(s,true);
 drain(s);
 assert.ok(fieldCard.g1175DSwitched);
 assert.ok(!first.tapped&&!second.tapped&&up.tapped);
 cast(s,ZENITH);
 assert.ok(s.decision?.task?.op!=='g34_CrystalSwitch1175');
 drain(s);
 cast(s,'dmd31-003');
 assert.ok(own.grave.includes(fieldCard));
 assert.ok(!fieldCard.g1175DSwitched);
});

for(const blocked of [false,true])test('Cannonball offers an own in-place spell only for an enemy arriving outside hand: '+blocked,()=>{
 const s=field(),enemy=put(s,0,'grave','dmbd09-010');
 const cannon=put(s,1,'battle',CANNON);
 if(blocked)put(s,0,'battle','dm23rp3-011');
 cast(s,FIRE);
 assert.equal(s.decision,null);
 cast(s,RITUAL);
 pick(s,enemy.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 pick(s,null);
 if(!blocked){
  assert.equal(s.decision.task.op,'g34_CastBattleTwin1175');
  assert.deepEqual(choices(s),[cannon.uid,null]);
  pick(s,cannon.uid);
  assert.equal(s.decision.task.op,'g34_Target');
  pick(s,enemy.uid);
  assert.ok(s.players[0].grave.includes(enemy));
 }else assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.includes(cannon));
 assert.ok(!s.players[1].grave.includes(cannon));
});

test('Ritual resolves the battle before Cannonball can choose a battlefield spell (QA43784)',()=>{
 const s=field(),enemy=put(s,0,'grave','dmbd09-010'),cannon=put(s,1,'battle',CANNON);
 cast(s,RITUAL);
 pick(s,enemy.uid);
 pick(s,cannon.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].grave.includes(cannon));
 assert.ok(!s.metrics[1].played[CANNON]);
 assert.ok(s.players[0].battle.includes(enemy));
});

test('Cannonball spell side is a shield trigger with the printed 12000 limit',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE,{powerModifiers:[{amount:10000}]});
 const over=put(s,0,'battle',FIRE,{powerModifiers:[{amount:10001}]});
 give(s,1,'shields',[CANNON]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===CANNON);
 assert.deepEqual(choices(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(s.players[0].grave.includes(attacker));
 assert.ok(s.players[0].battle.includes(over));
});
