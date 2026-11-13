import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KIL='dm39-046',WORD='dm39-010',GAGA='dm39-018',BOLSHACK='dm36-s07';
const NATURE='dm01-108',WATER='dm01-083',BEETLE='dm36-105',GOEMON='dm36-039',YUKO='dm36-108';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const value=(s,a)=>s.decision?.choices[a.choice]?.value;
const pick=(s,v)=>act(s,'extended',a=>(value(s,a)?.uid??value(s,a))===v);
const legalPlay=(s,x,where)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&where(a));
const power=(s,x)=>e.power(x,false,s);

test('all three names have a unique supported ID and complete verified definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1123.json',import.meta.url)));
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[KIL,WORD,GAGA]);
 for(const row of m.cards){
  const d=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1123}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.ok(cat.get(row.id).supported);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1123}));
 }
});

test('Kilmadzhiro applies -3000 with two own Psychics and retains that amount when one leaves (QA 36242, 36243)',()=>{
 const s=setup();
 s.format='advance';
 const ally=add(s,0,'battle',BOLSHACK),other=add(s,0,'battle',BOLSHACK);
 const enemy=add(s,1,'battle',BOLSHACK);
 const initial=power(s,enemy);
 cast(s,KIL);
 pick(s,enemy.uid);
 assert.equal(power(s,enemy),initial-3000);
 s.extTasks=[{op:'g34_ExactMove',p:0,source:NATURE,owner:0,to:'grave',target:ally.uid,targetIncarnation:ally.incarnation||0}];
 act(s,'toAttack');
 assert.ok(s.players[0].extra.includes(ally));
 assert.ok(s.players[0].battle.includes(other));
 assert.equal(power(s,enemy),initial-3000);
});

test('Kilmadzhiro destroys a 1000 power creature even with no own Psychic',()=>{
 const s=setup(),enemy=add(s,1,'battle','dm01-100');
 cast(s,KIL);
 assert.equal(s.decision.source,KIL);
 pick(s,enemy.uid);
 assert.ok(s.players[1].grave.includes(enemy));
});

test('Kilmadzhiro can enter from shields and resolve its opponent-only target',()=>{
 const s=setup(),attacker=add(s,0,'battle','dm01-100');
 add(s,1,'battle',BOLSHACK);
 give(s,1,'shields',[KIL]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'trigger');
 act(s,'useTrigger');
 assert.equal(s.decision.source,KIL);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(s.players[0].grave.includes(attacker));
});

test('Words of the Beyond decides after each drawn card and can stop after one of two (QA 36233)',()=>{
 const s=setup();
 add(s,0,'battle',BOLSHACK);
 add(s,0,'battle',BOLSHACK);
 add(s,1,'battle',BOLSHACK);
 const [top,next]=s.players[0].deck;
 cast(s,WORD);
 assert.equal(s.decision.task.n,2);
 pick(s,true);
 assert.ok(s.players[0].hand.includes(top));
 assert.equal(s.decision.task.n,1);
 pick(s,null);
 assert.equal(s.players[0].deck[0],next);
});

test('Words of the Beyond sees an awakening after casting and can return either side’s creature (QA 36234)',()=>{
 const s=setup(),attacker=add(s,0,'battle',BOLSHACK);
 const own=add(s,0,'battle',NATURE),victim=add(s,1,'battle',NATURE,{tapped:true});
 const enemy=add(s,1,'battle',WATER);
 cast(s,WORD);
 pick(s,null);
 attack(s,attacker.uid,victim.uid);
 drain(s);
 assert.ok(attacker.g1085Awakened);
 attacker.tapped=false;
 attack(s,attacker.uid);
 act(s,'orderEffect',a=>s.pendingEffects.some(entry=>entry.effectId===a.effectId&&entry.source===WORD));
 assert.equal(s.decision.source,WORD);
 assert.ok(s.decision.choices.some(c=>c.value?.uid===own.uid));
 pick(s,enemy.uid);
 assert.ok(s.players[1].hand.includes(enemy));
 drain(s);
 act(s,'endTurn');
 drain(s);
 assert.ok(!s.extLimits.some(r=>r.source===WORD));
});

test('Gagamaru lets the player select zero, one or two off Mana Birth',()=>{
 for(const reduction of [0,1,2]){
  const s=setup();
  add(s,0,'battle',GAGA);
  give(s,0,'mana',[BEETLE,...Array(4).fill(NATURE)]);
  const x=s.players[0].mana[0],action=legalPlay(s,x,a=>a.role==='manaBirth296');
  assert.equal(action.cost,2);
  e.step(s,action,{manualMana:true});
  assert.deepEqual(s.decision.choices.filter(c=>typeof c.value==='number').map(c=>c.value),[2,1,0]);
  const choose=e.getLegalActions(s).find(a=>a.kind==='extended'&&value(s,a)===reduction);
  e.step(s,choose,{manualMana:true});
  assert.equal(s.decision.cost,4-reduction);
  for(const mana of s.players[0].mana.slice(0,4-reduction))act(s,'selectMana',a=>a.uid===mana.uid);
  act(s,'confirmMana');
  drain(s);
  assert.ok(s.players[0].battle.includes(x));
 }
});

test('Gagamaru applies to Goemon’s mana summons but never a hand summon (QA 36282)',()=>{
 const s=setup();
 add(s,0,'battle',GAGA);
 cast(s,GOEMON);
 const fromMana=add(s,0,'mana',BEETLE),fromHand=add(s,0,'hand',BEETLE);
 assert.equal(legalPlay(s,fromHand,a=>!a.alternative).cost,3);
 const action=legalPlay(s,fromMana,a=>a.manaPermit?.startsWith('g297:')&&!a.alternative);
 assert.equal(action.cost,1);
 e.step(s,action);
 assert.equal(s.decision.task.op,'g34_PayAura560');
 pick(s,1);
 assert.ok(s.players[0].battle.includes(fromMana));
});

test('Gagamaru’s Mana Birth reduction leaves a floor of one and requires a live allied aura',()=>{
 const s=setup();
 const aura=add(s,0,'battle',GAGA);
 const x=add(s,0,'mana',YUKO);
 assert.equal(legalPlay(s,x,a=>a.role==='manaBirth296').cost,1);
 aura.g35Ignored=s.turn;
 assert.equal(legalPlay(s,x,a=>a.role==='manaBirth296').cost,2);
});
