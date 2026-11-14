import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CROWN='dm22rp2-020',PROTECTOR='dm14-028',ELBA='dm22rp2-028',GYRO='dm22rp2-047';
const PLAIN='dm01-108',FIRE_FIVE='dm01-059',FIRE_SIX='dm01-s08',WATER='dm01-083';
const HAND='dm01-027',SPIRAL='dm01-086',ATLANTIS='dmrp22-013',SIGN='dmr13-016',DRAGON='dmr14-034';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1281.json',import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(PLAIN));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;
}
const pick=(s,wanted)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===wanted;
});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const cross=(s,gear,target)=>act(s,'crossGear',a=>a.uid===gear.uid&&a.target===target.uid);
const passBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const chooseShield=(s,shield)=>{passBlock(s);if(s.decision?.type==='breakShields')act(s,'breakShields',a=>a.shields.includes(shield.uid));};

test('nine official prints share four original definitions and valid deck limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[CROWN,PROTECTOR,ELBA,GYRO]);
 assert.equal(manifest.printAliases.length,5);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,definition=e.card(id);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(definition.limit,4);
  assert.equal(nameKey(definition.name),nameKey(x.name));
  if(x.canonicalId)assert.equal(snapshot.aliases[x.id],id);
  else assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  assert.deepEqual(standardCardSpec({status:'complete',id:x.id,faces:x.faces},{phase:1281}),x.spec);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
  assert.equal(registry.get(x.id).id,id);
 }
});

test('Crown triggers on an unpaid opposing creature, draws before choosing, and restricts the creature to fire and cost five',()=>{
 const s=field(1),crown=add(s,0,'battle',CROWN),dragon=add(s,1,'hand',DRAGON);
 const drawn=inst(FIRE_FIVE);s.players[0].deck.unshift(drawn);
 const expensive=add(s,0,'hand',FIRE_SIX),water=add(s,0,'hand',WATER);
 cast(s,SIGN);pick(s,dragon.uid);drainUntilCrown(s);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(has(s,0,'grave',crown)&&has(s,0,'hand',drawn));
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value).filter(Boolean),[drawn.uid]);
 pick(s,drawn.uid);drain(s);
 assert.ok(has(s,0,'battle',drawn)&&has(s,0,'hand',expensive)&&has(s,0,'hand',water));
});

function drainUntilCrown(s){
 for(let n=0;s.decision?.source!==CROWN&&s.decision;n++){
  assert.ok(n<20);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.decision?.source,CROWN);
}

test('Crown can decline for an unpaid Tamaseed played by its opponent on that opponent’s turn',()=>{
 const s=field(1),crown=add(s,0,'battle',CROWN);
 const other=add(s,1,'battle','dmrp22-070'),grave=add(s,1,'grave','dmrp21-057');
 play(s,ATLANTIS);pick(s,other.uid);pick(s,grave.uid);
 drainUntilCrown(s);pick(s,null);drain(s);
 assert.ok(has(s,0,'battle',crown)&&!s.players[0].hand.length&&has(s,1,'battle',grave));
 assert.ok(has(s,1,'grave',other));
});

test('Crown ignores paid entries and unpaid entry during its controller’s own turn',()=>{
 for(const active of [0,1]){
  const s=field(active),crown=add(s,0,'battle',CROWN);
  if(active===1){play(s,DRAGON);play(s,ATLANTIS);drain(s);}
  else{
   const attacker=add(s,0,'battle',PLAIN);
   give(s,1,'shields',[ELBA]);attack(s,attacker.uid);chooseShield(s,s.players[1].shields[0]);
   act(s,'useTrigger');drain(s);
   assert.ok(s.players[1].battle.some(x=>x.cardId===ELBA));
  }
  assert.ok(has(s,0,'battle',crown)&&!s.players[0].hand.length);
 }
});

test('Protector draws optionally on destruction and remains available to cross again',()=>{
 for(const accept of [false,true]){
  const s=field(),victim=add(s,0,'battle',PLAIN),gear=play(s,PROTECTOR);
  const next=add(s,0,'battle',WATER);
  cross(s,gear,victim);assert.equal(gear.crossedTo.uid,victim.uid);
  s.active=1;cast(s,HAND);act(s,'effect',a=>a.targets[0].uid===victim.uid);
  assert.equal(s.decision.source,PROTECTOR);pick(s,accept?1:0);drain(s);
  assert.equal(s.players[0].hand.length,Number(accept));
  assert.ok(has(s,0,'grave',victim)&&has(s,0,'battle',gear));
  assert.equal(gear.crossedTo,undefined);
  s.active=0;cross(s,gear,next);assert.equal(gear.crossedTo.uid,next.uid);
 }
});

test('Protector does not draw when Broccoli goes to mana after losing a battle (QA 35313)',()=>{
 const s=field(),broccoli=add(s,0,'battle','dm10-035',{tapped:true}),gear=play(s,PROTECTOR);
 cross(s,gear,broccoli);
 const enemy=add(s,1,'battle',PLAIN);s.active=1;attack(s,enemy.uid,broccoli.uid);passBlock(s);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',broccoli)&&has(s,0,'battle',gear)&&!s.players[0].hand.length);
});

test('Protector’s trigger is absent when it and the crossed creature are destroyed together',()=>{
 const s=field(),host=add(s,0,'battle',PLAIN),gear=play(s,PROTECTOR);
 cross(s,gear,host);s.active=1;
 play(s,'dm24ex4-058');act(s,'extended',a=>a.choice===0);drain(s);
 assert.ok(has(s,0,'grave',host)&&has(s,0,'grave',gear)&&!s.players[0].hand.length);
});

test('Elba declares its actual shield trigger and can block without attacking the opponent',()=>{
 const s=field(1),attacker=add(s,1,'battle',PLAIN);
 give(s,0,'shields',[ELBA]);const shield=s.players[0].shields[0];
 attack(s,attacker.uid);chooseShield(s,shield);act(s,'useTrigger');drain(s);
 assert.ok(has(s,0,'battle',shield)&&e.effectiveCard(shield,s).blocker);
 s.active=0;s.phase='attack';s.turn++;attacker.tapped=true;
 const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===shield.uid).map(a=>a.target);
 assert.deepEqual(targets,[attacker.uid]);
});

test('Elba can deploy a namesake on destruction while bounce yields no choice',()=>{
 for(const destroyed of [false,true]){
  const s=field(1),host=add(s,0,'battle',ELBA),copy=add(s,0,'hand',ELBA),other=add(s,0,'hand',PLAIN);
  cast(s,destroyed?HAND:SPIRAL);act(s,'effect',a=>a.targets[0].uid===host.uid);
  if(destroyed){
   assert.equal(s.decision.source,ELBA);assert.deepEqual(s.decision.choices.map(x=>x.value?.uid).filter(Boolean),[copy.uid]);
   pick(s,copy.uid);drain(s);
  }
  assert.equal(has(s,0,'battle',copy),destroyed);
  assert.ok(has(s,0,'hand',other)&&has(s,0,destroyed?'grave':'hand',host));
 }
});

test('Gyro buffs existing and later allies, stacks power, and removes the bonus when its source is destroyed',()=>{
 const s=field(),ally=add(s,0,'battle',FIRE_SIX),foe=add(s,1,'battle',PLAIN);
 const gyro=play(s,GYRO),newAlly=play(s,PLAIN),second=play(s,GYRO);
 assert.equal(e.power(foe,false,s),2000);
 assert.deepEqual([e.power(ally,false,s),e.power(newAlly,false,s)],[18000,14000]);
 assert.deepEqual(e.effectiveCard(ally,s).g633BreakerChoices,[2,4]);
 assert.equal(e.effectiveCard(newAlly,s).breaker,3);
 s.active=1;play(s,'dm22rp2-042');
 if(s.decision?.type==='effectOrder'||s.decision?.type==='entryOrder')act(s,s.decision.type==='effectOrder'?'orderEffect':'orderEntry');
 pick(s,gyro.uid);drain(s);
 assert.ok(has(s,0,'battle',second));
 assert.ok(has(s,0,'grave',gyro));
 assert.equal(e.power(ally,false,s),12000);
 assert.equal(e.effectiveCard(ally,s).breaker,3);
});

test('Gyro’s shield G-Strike locks the selected future attacker',()=>{
 const s=field(1),attacker=add(s,1,'battle',PLAIN),future=add(s,1,'battle',PLAIN);
 give(s,0,'shields',[GYRO]);const shield=s.players[0].shields[0];
 attack(s,attacker.uid);chooseShield(s,shield);
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,future.uid);drain(s);
 assert.ok(has(s,0,'hand',shield)&&e.attackLocked(s,1,future));
});

test('Protector stays crossed through evolution and draws when the evolved creature is destroyed',()=>{
 const s=field(),base=add(s,0,'battle',PLAIN),gear=play(s,PROTECTOR);
 cross(s,gear,base);
 const evolved=add(s,0,'hand','dm02-033');
 act(s,'play',a=>a.uid===evolved.uid);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.equal(gear.crossedTo.uid,evolved.uid);
 s.active=1;cast(s,HAND);act(s,'effect',a=>a.targets[0].uid===evolved.uid);
 assert.equal(s.decision.source,PROTECTOR);pick(s,1);drain(s);
 assert.ok(has(s,0,'grave',evolved)&&has(s,0,'grave',base)&&has(s,0,'battle',gear));
 assert.equal(s.players[0].hand.length,1);
});

test('Protector draws when the crossed linked God is destroyed and follows the remaining card',()=>{
 const s=field(),metal=add(s,0,'battle','dmex17-059'),gear=play(s,PROTECTOR);
 cross(s,gear,metal);
 const heavy=play(s,'dmex17-033');pick(s,metal.uid);pick(s,null);drain(s);
 s.active=1;cast(s,HAND);act(s,'effect',a=>a.targets[0].uid===metal.uid);
 act(s,'godLeave',a=>a.uid===metal.uid);
 assert.equal(s.decision.source,PROTECTOR);pick(s,1);drain(s);
 assert.ok(has(s,0,'battle',heavy)&&has(s,0,'grave',metal));
 assert.equal(gear.crossedTo.uid,heavy.uid);
});

test('Crown still resolves its draw when Stratobag replaces its attempted destruction (QA 42955)',()=>{
 const s=field(1),crown=add(s,0,'battle',CROWN),dragon=add(s,1,'hand',DRAGON);
 add(s,1,'battle','dm22rp2-048');
 cast(s,SIGN);pick(s,dragon.uid);drainUntilCrown(s);pick(s,true);
 act(s,'g47Replace',a=>a.choice?.replacement==='strato');
 pick(s,crown.uid);pick(s,null);drain(s);
 assert.ok(has(s,0,'mana',crown));
 assert.equal(s.players[0].hand.length,1);
});

test('Crown does not trigger when Pegasus suppresses both players’ entry effects (QA 44182)',()=>{
 const s=field(1),crown=add(s,0,'battle',CROWN),pegasus=add(s,1,'battle','dmex16-076');
 const entrant=add(s,1,'mana',FIRE_FIVE);
 attack(s,pegasus.uid);pick(s,0);pick(s,entrant.uid);pick(s,null);pick(s,entrant.uid);drain(s);
 assert.ok(has(s,1,'battle',entrant)&&has(s,0,'battle',crown));
 assert.equal(s.players[0].hand.length,5-s.players[0].shields.length);
 assert.ok(!s.log.some(x=>x.cardId===CROWN));
});
