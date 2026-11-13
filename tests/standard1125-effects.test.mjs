import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HURRICANE='dm37-003',JESTER='dm37-026',IROHAS='dm39-022';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',BLOCKER='dm01-076';
const OFLAME='dm36-059',GILL='dm25ex4-046',BOLSHACK='dm36-s07',HERO='dm37-021';
const SWEEP='dm38-013',BOLT='dm17-032',HAND='dm01-027',SPARK='dm01-015',CRISIS='dm06-034';
const add=(s,p,z,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][z].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);

test('four official prints match full effects, limits and three canonical names',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1125.json',import.meta.url)));
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[HURRICANE,JESTER,IROHAS]);
 assert.equal(manifest.printAliases.length,1);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id;
  const detail={id:row.id,name:row.name,faces:row.faces,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1125}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(cat.get(row.id).id,id);
  assert.ok(cat.get(row.id).supported);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const altered=structuredClone(detail);
  altered.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(altered,{phase:1125}));
 }
});

test('Hurricane can deploy a fire Psychic before an unblocked creature battle',()=>{
 const s=setup();
 s.format='advance';
 const hitter=add(s,0,'battle',HURRICANE),victim=add(s,1,'battle',NATURE,{tapped:true});
 const yes=add(s,0,'extra',OFLAME),twoFaces=add(s,0,'extra',GILL);
 add(s,0,'extra',BOLSHACK);
 add(s,0,'extra',HERO);
 attack(s,hitter.uid,victim.uid);
 act(s,'noBlock');
 assert.equal(s.decision.source,HURRICANE);
 assert.ok(s.players[1].battle.includes(victim));
 assert.ok(values(s).includes(yes.uid));
 assert.equal(values(s).filter(uid=>uid===twoFaces.uid).length,2);
 assert.equal(values(s).filter(Boolean).length,3);
 pick(s,yes.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(yes));
 assert.ok(s.players[1].grave.includes(victim));
});

test('Hurricane does not offer a deployment after being blocked and retains W-breaker',()=>{
 const s=setup();
 s.format='advance';
 const hitter=add(s,0,'battle',HURRICANE);
 add(s,0,'extra',OFLAME);
 const blocker=add(s,1,'battle',BLOCKER);
 attack(s,hitter.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.players[0].extra.length,1);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(e.effectiveCard(hitter,s).breaker,2);
});

test('Jester lets the opponent decline all shields after the caster draws three',()=>{
 const s=setup();
 cast(s,JESTER);
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.decision.player,1);
 pick(s,null);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.metrics[0].breaks,0);
});

test('Jester returns any chosen hand card after the opponent’s S-Trigger without a break (QA 36098–36099)',()=>{
 const s=setup();
 const old=add(s,0,'hand',NATURE);
 give(s,1,'shields',[SPARK,FIRE,WATER,NATURE]);
 const [first,second]=s.players[1].shields;
 const before=s.players[0].deck.length;
 cast(s,JESTER);
 pick(s,first.uid);
 pick(s,second.uid);
 pick(s,null);
 assert.equal(s.decision.type,'trigger');
 assert.equal(s.decision.player,1);
 act(s,'useTrigger',a=>a.uid===first.uid);
 drainUntilJesterBottom(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.n,2);
 const secondBottom=s.players[0].hand.find(x=>x.uid!==old.uid);
 pick(s,old.uid);
 pick(s,secondBottom.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[old.uid,secondBottom.uid]);
 assert.equal(s.players[0].deck.length,before-1);
 assert.ok(s.players[1].hand.includes(second));
 assert.ok(s.players[1].grave.includes(first));
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[1].brokenThisTurn||0,0);
});

function drainUntilJesterBottom(s){
 for(let n=0;s.decision&&s.decision.task?.op!=='g34_Select';n++){
  assert.ok(n<20);
  e.step(s,e.chooseAI(s));
 }
}

test('Jester counts a shield pile once and limits the opponent to three shields',()=>{
 const s=setup();
 give(s,1,'shields',[NATURE,NATURE,NATURE,NATURE]);
 const [pile,second,third,fourth]=s.players[1].shields;
 const under=inst(FIRE);
 pile.shieldStack=[under];
 cast(s,JESTER);
 for(const shield of [pile,second,third])pick(s,shield.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.n,3);
 assert.ok(s.players[1].shields.includes(fourth));
 assert.equal(s.players[1].hand.length,4);
});

test('Irohas cannot be attacked by fire but can be attacked by another civilization',()=>{
 const s=setup(),x=add(s,1,'battle',IROHAS,{tapped:true});
 const fire=add(s,0,'battle',FIRE),water=add(s,0,'battle',WATER);
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.target===x.uid);
 assert.deepEqual(attacks.map(a=>a.uid),[water.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===fire.uid&&a.target==='player'));
});

test('Irohas rejects targeted opponent fire spells and is still affected by a sweep (QA 36204–36205)',()=>{
 const s=setup(),x=add(s,1,'battle',IROHAS),other=add(s,1,'battle',WATER);
 cast(s,BOLT);
 assert.ok(!values(s).includes(x.uid));
 assert.ok(values(s).includes(other.uid));
 drain(s);
 cast(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
 assert.ok(s.players[1].grave.includes(x));
 const second=add(s,1,'battle',IROHAS);
 cast(s,SWEEP);
 drain(s);
 assert.ok(s.players[1].grave.includes(second));
});

test('Irohas can be chosen by its own controller under an opposing fire spell (QA 36207)',()=>{
 const s=setup(),x=add(s,1,'battle',IROHAS);
 cast(s,CRISIS);
 assert.equal(s.decision.player,1);
 assert.ok(values(s).includes(x.uid));
 drain(s);
});

test('Irohas can be summoned as an S-Trigger from a shield',()=>{
 const s=setup(),attacker=add(s,0,'battle',WATER);
 give(s,1,'shields',[IROHAS]);
 const x=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===x.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(x));
});

test('Jester excludes a shield that is put in the graveyard by Shield Go',()=>{
 const s=setup();
 give(s,1,'shields',['dmr09-054',NATURE,NATURE]);
 const [shieldGo,regular]=s.players[1].shields;
 shieldGo.faceUp=true;
 cast(s,JESTER);
 pick(s,shieldGo.uid);
 pick(s,regular.uid);
 pick(s,null);
 assert.equal(s.decision.task.n,1);
 assert.ok(s.players[1].grave.includes(shieldGo));
 assert.ok(s.players[1].hand.includes(regular));
});

test('Irohas can be chosen by a fire creature ability and by its own fire spell (QA 36206, 36208)',()=>{
 const s=setup(),x=add(s,1,'battle',IROHAS);
 cast(s,'dmr13-099');
 assert.ok(values(s).includes(x.uid));
 drain(s);
 const own=add(s,0,'battle',IROHAS);
 cast(s,'dm09-032');
 assert.ok(values(s).includes(own.uid));
});
