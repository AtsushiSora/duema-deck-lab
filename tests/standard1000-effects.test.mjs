import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DASHIC='dmr17-085',HASSAMY='dmr17-045',NOI='dmr18-027',CHANG='dmr18-031',GALLOWS='dmr18-033';
const DARK='dm01-090',FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108',DRAGON='dm01-008';
const DRAGON_SPELL='dm24ex2-038',EVO='dmr17-010',HAND_EVO='dm25ex1-023',NEO='dm25rp3-S09',BLOCKER='dm01-076';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const tapped=s=>s.players[0].mana.filter(x=>x.tapped).length;
const shown=s=>s.log.filter(l=>l.type==='reveal'&&[NOI,CHANG,GALLOWS].includes(l.source));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('Phase 1000 registers exactly five unique official cards and no reprints',()=>{
 const m=read('tools/support-phase-1000.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DASHIC,HASSAMY,NOI,CHANG,GALLOWS]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1000}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1000}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1000');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

test('Dashic chooses a subset of Dragons, including a spell, in a chosen top-deck order',()=>{
 let s=field();
 const first=put(s,0,'grave',DRAGON),second=put(s,0,'grave',DRAGON_SPELL),other=put(s,0,'grave',EVO);
 const unrelated=put(s,0,'grave',FIRE),enemy=put(s,1,'grave',DRAGON),top=s.players[0].deck[0];
 play(s,DASHIC);
 assert.deepEqual(choices(s),[0,1]);pick(s,0);
 assert.deepEqual(choices(s),[first.uid,second.uid,other.uid,null]);
 pick(s,second.uid);s=JSON.parse(JSON.stringify(s));pick(s,first.uid);pick(s,null);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(x=>x.uid),[second.uid,first.uid,top.uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[other.uid,unrelated.uid]);
 assert.ok(has(s,1,'grave',enemy));
});

test('Dashic may return zero Dragons and does not also grant Power Attacker',()=>{
 const s=field(),dragon=put(s,0,'grave',DRAGON),ally=put(s,0,'battle',FIRE);
 const top=s.players[0].deck[0];play(s,DASHIC);pick(s,0);pick(s,null);
 assert.equal(s.players[0].deck[0],top);
 assert.ok(has(s,0,'grave',dragon));
 assert.equal(e.power(ally,true,s),e.power(ally,false,s));
});

test('Dashic gives Power Attacker only to another friendly creature and only for the turn',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',WATER);
 const source=play(s,DASHIC),base=e.power(ally,false,s);pick(s,1);
 assert.deepEqual(choices(s),[ally.uid]);pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),base);
 assert.equal(e.power(ally,true,s),base+2000);
 assert.equal(e.power(source,true,s),1000);
 assert.equal(e.power(enemy,true,s),e.power(enemy,false,s));
 end(s);
 assert.equal(e.power(ally,true,s),base);
});

test('Hassamy counts shield groups, grants Slayer to all friendly Darkness creatures, and loses it at three groups',()=>{
 const s=field(),hassamy=play(s,HASSAMY),ally=put(s,0,'battle',DARK),other=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',DARK);
 const slayer=x=>!!e.effectiveCard(x,s).slayer;
 give(s,1,'shields',Array(3).fill(NATURE));
 assert.ok(!slayer(hassamy)&&!slayer(ally));
 const removed=s.players[1].shields.pop();
 s.players[1].shields[0].shieldStack=[inst(NATURE),inst(NATURE)];
 assert.ok(slayer(hassamy)&&slayer(ally)&&!slayer(other)&&!slayer(enemy));
 s.players[1].shields.push(removed);
 assert.ok(!slayer(hassamy)&&!slayer(ally));
});

test('Hassamy lets a friendly Darkness creature destroy its stronger opponent after losing battle',()=>{
 const s=field(),ally=put(s,0,'battle',DARK),enemy=put(s,1,'battle',DRAGON,{tapped:true});
 play(s,HASSAMY);give(s,1,'shields',[NATURE,NATURE]);
 attack(s,ally.uid,enemy.uid);drain(s);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy));
});

for(const id of [NOI,CHANG,GALLOWS])test(id+' reveals a true Evolution from hand and reduces by exactly two',()=>{
 let s=field();
 const evo=put(s,0,'hand',EVO),handEvo=put(s,0,'hand',HAND_EVO);
 put(s,0,'hand',NEO);put(s,0,'hand',DRAGON);put(s,1,'hand',EVO);put(s,0,'grave',EVO);
 const summoned=play(s,id);
 assert.deepEqual(choices(s),[evo.uid,handEvo.uid,null,false]);
 pick(s,evo.uid);
 assert.deepEqual(choices(s),[2,false]);
 assert.equal(shown(s).length,0);
 s=JSON.parse(JSON.stringify(s));pick(s,2);drain(s);
 assert.equal(tapped(s),3);
 assert.deepEqual(shown(s).map(l=>l.cardId),[EVO]);
 assert.ok(has(s,0,'hand',evo)&&has(s,0,'battle',summoned));
});

test('Noibauten can decline the reveal and must untap at the end of its own turn',()=>{
 const s=field();put(s,0,'hand',EVO);
 const x=play(s,NOI);pick(s,null);drain(s);
 assert.equal(tapped(s),5);
 assert.equal(shown(s).length,0);
 x.tapped=true;
 end(s);
 assert.equal(x.tapped,false);
});

test('Chang G passes an available blocker and breaks a shield',()=>{
 const s=field(),blocker=put(s,1,'battle',BLOCKER),x=play(s,CHANG);
 assert.ok(e.effectiveCard(blocker,s).blocker);
 x.entered=0;
 attack(s,x.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Gallows destroys its stronger opponent with its own Slayer after losing battle',()=>{
 const s=field(),enemy=put(s,1,'battle',DRAGON,{tapped:true}),gallows=play(s,GALLOWS);
 gallows.entered=0;
 attack(s,gallows.uid,enemy.uid);drain(s);
 assert.ok(has(s,0,'grave',gallows)&&has(s,1,'grave',enemy));
});
