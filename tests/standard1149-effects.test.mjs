import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const METEOR='dmex02-066',SHURA='dm24bd6-006',AYA='dmrp02-038';
const NAT='dm01-108',GANG='dmrp04m-051',GATE='dm16-007';
const MUTOPIA='dmrp02-066',HAND='dm01-027',SURFER='dm05-024';
function add(s,p,zone,id,attrs={}){
 const card=Object.assign(inst(id),attrs);
 s.players[p][zone].push(card);
 return card;
}
const value=c=>c.value?.uid??c.value;
const options=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const targets=s=>s.decision.targets.map(c=>c.uid);
const target=(s,uid)=>act(s,'effect',a=>a.targets.some(x=>x.uid===uid));

test('three canonical cards match official faces, images and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1149.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[METEOR,SHURA,AYA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1149}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(c.cost,f.cost);
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Meteor requires choosing a creature and may revive it and one other eligible creature',()=>{
 const s=setup(),own=s.players[0];
 const sacrificed=add(s,0,'battle',GANG),second=add(s,0,'grave',GANG),third=add(s,0,'grave',GANG);
 const wrongRace=add(s,0,'grave',NAT),highCost=add(s,0,'grave','dmrp07-072');
 const enemy=add(s,1,'battle',NAT);
 cast(s,METEOR);
 assert.deepEqual(options(s),[sacrificed.uid]);
 pick(s,sacrificed.uid);
 assert.ok(own.grave.includes(sacrificed));
 assert.deepEqual(new Set(options(s)),new Set([sacrificed.uid,second.uid,third.uid,null]));
 pick(s,sacrificed.uid);pick(s,second.uid);drain(s);
 assert.deepEqual(own.battle,[sacrificed,second]);
 assert.ok([third,wrongRace,highCost].every(c=>own.grave.includes(c)));
 assert.ok(s.players[1].battle.includes(enemy));
});

test('Meteor may choose zero or one and cannot revive without an attempted sacrifice',()=>{
 for(const count of [0,1]){
  const s=setup(),own=s.players[0],ally=add(s,0,'battle',NAT);
  const a=add(s,0,'grave',GANG),b=add(s,0,'grave',GANG);
  cast(s,METEOR);pick(s,ally.uid);
  if(count)pick(s,a.uid);
  pick(s,null);drain(s);
  assert.deepEqual(own.battle,count?[a]:[]);
  assert.ok(own.grave.includes(b));
 }
 const s=setup(),a=add(s,0,'grave',GANG);
 cast(s,METEOR);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.includes(a));
});

test('Meteor continues when the selected creature cannot leave',()=>{
 const s=setup(),ally=add(s,0,'battle',NAT,{g19Protected:true}),revived=add(s,0,'grave',GANG);
 cast(s,METEOR);pick(s,ally.uid);pick(s,revived.uid);drain(s);
 assert.deepEqual(s.players[0].battle,[ally,revived]);
});

test('Meteor resolves the revival after Stratobag replaces the destruction (QA 42955)',()=>{
 const s=setup(),ally=add(s,0,'battle',NAT),revived=add(s,0,'grave',GANG);
 add(s,1,'battle','dm22rp2-048');
 cast(s,METEOR);pick(s,ally.uid);
 for(let n=0;!s.decision?.choices?.some(c=>value(c)===revived.uid);n++){
  assert.ok(n<10);
  const a=e.chooseAI(s);
  assert.ok(a);
  e.step(s,a);
 }
 assert.ok(s.players[0].mana.includes(ally));
 pick(s,revived.uid);drain(s);
 assert.ok(s.players[0].battle.includes(revived));
});

test('Shura taps the first opposing entry per turn and leaves opposing nonlight spells legal',()=>{
 const s=setup(),shura=add(s,0,'battle',SHURA);
 const c=e.effectiveCard(shura,s);
 assert.equal(c.blocker,true);
 assert.equal(c.slayer,true);
 assert.equal(c.breaker,2);
 cast(s,NAT);
 assert.equal(s.players[0].battle.at(-1).tapped,false);
 s.active=1;
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),true);
 cast(s,NAT);cast(s,NAT);
 assert.equal(s.players[1].battle[0].tapped,true);
 assert.equal(s.players[1].battle[1].tapped,false);
 s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='main';cast(s,NAT);
 assert.equal(s.players[1].battle.at(-1).tapped,true);
});

test('Shura taps a blocker selected to enter first through Heaven’s Gate (QA 39839)',()=>{
 const s=setup();
 add(s,0,'battle',SHURA);
 s.active=1;
 const a=add(s,1,'hand','dm05-s01'),b=add(s,1,'hand','dmex15-b005');
 cast(s,GATE);pick(s,b.uid);pick(s,a.uid);drain(s);
 assert.equal(b.tapped,true);
 assert.equal(a.tapped,false);
});

test('Shura counts an incoming creature that remains a Tamaseed (QA 42928)',()=>{
 const s=setup();
 add(s,0,'battle',SHURA);
 s.active=1;
 const seed=add(s,1,'hand','dm22rp1-8A');
 act(s,'play',a=>a.uid===seed.uid);drain(s);
 assert.equal(e.isCreature(s,seed),false);
 assert.equal(seed.tapped,true);
 cast(s,NAT);
 assert.equal(s.players[1].battle.at(-1).tapped,false);
});

test('Aya protects only other allied Mutopia from opponent spell choices',()=>{
 const s=setup(),aya=add(s,0,'battle',AYA),mutopia=add(s,0,'battle',MUTOPIA);
 const other=add(s,0,'battle',NAT);
 s.active=1;cast(s,HAND);
 assert.deepEqual(new Set(targets(s)),new Set([aya.uid,other.uid]));
 target(s,aya.uid);
 cast(s,HAND);assert.ok(targets(s).includes(mutopia.uid));target(s,other.uid);
});

test('Aya’s aura does not restrict an opponent’s creature ability and never shields the opposing side',()=>{
 const s=setup(),aya=add(s,0,'battle',AYA),mutopia=add(s,0,'battle',MUTOPIA);
 const other=add(s,1,'battle',MUTOPIA);
 cast(s,HAND);assert.ok(targets(s).includes(other.uid));target(s,other.uid);
 s.active=1;cast(s,SURFER);
 assert.ok(targets(s).includes(mutopia.uid));target(s,mutopia.uid);
 assert.ok(s.players[0].battle.includes(aya)&&s.players[0].hand.includes(mutopia));
});
