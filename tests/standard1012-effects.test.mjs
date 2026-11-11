import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BELL='dmr21-021',MAR='dmr22-008',GUER='dmr22-005';
const NATURE='dm01-108',WATER='dm01-083',FIRE_DRAGON='dmr21-005',WATER_DRAGON='dmr23-008';
const DARK_DRAGON='dmr15-042',BIG='dm05-s04',HAND='dm01-027',LIGHT='dm06-085';
const RYUSEI='dmr02-s03',PROTECTION='dmr14-036',ZUBATTO='dmr02-027',SEARCH='dm01-110',BOUNCE='dm01-086';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(22).fill(NATURE));give(s,p,'grave',[]);}
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
test('Phase 1012 pins three official single prints, characteristics, art and limits',()=>{
 const m=read('tools/support-phase-1012.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BELL,MAR,GUER]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1012}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1012}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1012');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

for(const id of [BELL,MAR])test('Multicolor dragon enters mana tapped '+id,()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

for(const [id,attacker,eligible] of [
 [BELL,WATER_DRAGON,true],[BELL,DARK_DRAGON,false],[MAR,DARK_DRAGON,true],[MAR,FIRE_DRAGON,false]
])test('Revolution change and the resulting double break '+id+'/'+attacker,()=>{
 const s=field(),a=put(s,0,'battle',attacker),x=put(s,0,'hand',id);
 attack(s,a.uid);
 if(eligible){
  assert.equal(s.decision.task.op,'revDeclare');
  pick(s,true);
  pick(s,a.uid);
 }
 drain(s);
 assert.ok(has(s,0,eligible?'battle':'hand',x));
 assert.ok(has(s,0,eligible?'hand':'battle',a));
 assert.equal(s.players[1].shields.length,5-(eligible?2:(e.card(attacker).breaker||1)));
});

const skips=s=>s.log.filter(x=>x.type==='skipTurn'&&x.cardId===BELL).length;
function destroy(s,x){
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

for(const tapped of [false,true])test('Bellfarre checks its pre-destruction tapped state '+tapped,()=>{
 const s=field(1),x=put(s,0,'battle',BELL,{tapped}),turn=s.turn;
 destroy(s,x);
 drain(s);
 assert.ok(has(s,0,'grave',x)&&!x.tapped);
 assert.equal(skips(s),Number(tapped));
 assert.equal(s.turn,turn+Number(tapped));
});

test('Bellfarre waits for a Shield Trigger spell after a break',()=>{
 let s=field(1);
 const a=put(s,1,'battle',BIG),x=put(s,0,'battle',BELL,{tapped:true}),turn=s.turn;
 give(s,0,'shields',[HAND]);
 const [shield]=s.players[0].shields,before=physical(s);
 attack(s,a.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'trigger');
 assert.equal(skips(s),0);
 s=JSON.parse(JSON.stringify(s));
 act(s,'useTrigger',z=>z.uid===shield.uid);
 act(s,'effect',z=>z.targets.some(t=>t.uid===a.uid));
 drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',shield)&&has(s,1,'grave',a));
 assert.equal(skips(s),1);
 assert.equal(s.turn,turn+1);
 assert.deepEqual(physical(s),before);
});

test('Bellfarre ignores an untapped break and a shield added to hand outside a break',()=>{
 const s=field(1),x=put(s,0,'battle',BELL),z=put(s,1,'battle',ZUBATTO);
 const first=s.players[0].shields[0];
 attack(s,z.uid);
 pick(s,first.uid);
 drain(s);
 assert.equal(s.metrics[1].breaks,1);
 assert.equal(skips(s),0);
 assert.equal(s.active,1);
 assert.ok(has(s,0,'hand',first));

 const t=field(1),a=put(t,1,'battle',ZUBATTO),b=put(t,0,'battle',BELL,{tapped:true});
 give(t,0,'shields',[HAND,NATURE,NATURE]);
 const [shield]=t.players[0].shields;
 attack(t,a.uid);
 pick(t,shield.uid);
 act(t,'useTrigger',y=>y.uid===shield.uid);
 act(t,'effect',y=>y.targets.some(w=>w.uid===a.uid));
 drain(t);
 assert.equal(t.metrics[1].breaks,0);
 assert.equal(skips(t),0);
 assert.ok(has(t,0,'battle',b)&&has(t,1,'grave',a));
});

test('Bellfarre ends the turn after a break caused by a creature ability',()=>{
 const s=field(1),x=put(s,0,'battle',BELL,{tapped:true}),target=put(s,0,'battle','dm01-001');
 const [shield]=s.players[0].shields,turn=s.turn;
 play(s,'dmr22-004');
 assert.ok(has(s,0,'grave',target));
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,shield.uid);
 drain(s);
 assert.ok(has(s,0,'hand',shield)&&has(s,0,'battle',x));
 assert.equal(skips(s),1);
 assert.equal(s.turn,turn+1);
});

test('Marvatz gives the opponent a private discard decision per drawn card',()=>{
 let s=field(1);
 put(s,0,'battle',MAR);
 const discard=put(s,1,'hand',WATER),initial=s.players[0].hand.length;
 play(s,LIGHT);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===MAR);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.choices.length,4);
 assert.ok(choices(s).includes(discard.uid));
 assert.deepEqual(e.observation(s,0).players[1].hand,Array(3).fill({hidden:true}));
 s=JSON.parse(JSON.stringify(s));
 pick(s,discard.uid);
 assert.ok(has(s,1,'grave',discard));
 assert.equal(s.players[0].hand.length,initial);
 assert.equal(s.decision.player,1);
 pick(s,null);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[true,null]);
 pick(s,true);
 assert.equal(s.players[0].hand.length,initial+2);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.decision,null);
});

test('Marvatz offers both draws after a discard replacement',()=>{
 const s=field(1);
 put(s,0,'battle',MAR);
 const r=put(s,1,'hand',RYUSEI);
 play(s,LIGHT);
 act(s,'orderEffect');
 pick(s,r.uid);
 assert.equal(s.decision.player,1);
 assert.match(s.decision.title,/かわりに/);
 pick(s,true);
 assert.ok(has(s,1,'battle',r));
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision.player,1);
 pick(s,null);
 pick(s,null);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision,null);
});

test('Marvatz handles protected hands, and only an opponent draw triggers it',()=>{
 const s=field(1);
 put(s,0,'battle',MAR);
 put(s,1,'battle',PROTECTION);
 play(s,LIGHT);
 act(s,'orderEffect');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[true,null]);
 pick(s,null);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[1].hand.length,2);
 const t=field();
 put(t,0,'battle',MAR);
 play(t,LIGHT);
 assert.equal(t.players[0].hand.length,2);
 assert.equal(t.decision,null);

 const u=field(1);
 put(u,0,'battle',MAR);
 play(u,SEARCH);
 assert.equal(u.decision.type,'search');
 act(u,'search',a=>a.uid===u.players[1].deck[0].uid);
 assert.equal(u.players[1].hand.length,1);
 assert.equal(u.decision,null);
});

for(const tap of [false,true])test('Guerrilla can tap after entering and then directs legal enemy attacks '+tap,()=>{
 const s=field(),g=play(s,GUER),foe=put(s,1,'battle',WATER);
 assert.equal(s.decision.player,0);
 assert.ok(has(s,0,'battle',g)&&!g.tapped);
 pick(s,tap?true:null);
 assert.equal(g.tapped,tap);
 s.active=1;
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===foe.uid);
 assert.deepEqual([...new Set(attacks.map(a=>a.target))],[tap?g.uid:'player']);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});

for(const n of [5,6])test('Guerrilla gains Shield Trigger with six mana cards '+n,()=>{
 const s=field(1),a=put(s,1,'battle',WATER);
 give(s,0,'mana',Array(n).fill(NATURE));
 s.players[0].mana[0].faceDown=true;
 give(s,0,'shields',[GUER]);
 const [x]=s.players[0].shields;
 attack(s,a.uid);
 act(s,'noBlock');
 if(n===6){
  assert.equal(s.decision.type,'trigger');
  act(s,'useTrigger',y=>y.uid===x.uid);
  assert.ok(has(s,0,'battle',x)&&!x.tapped);
  pick(s,true);
  assert.ok(x.tapped);
 }else assert.ok(has(s,0,'hand',x));
 assert.equal(s.decision,null);
});

test('Guerrilla defeated in battle may deploy a visible Nature creature up to cost six',()=>{
 let s=field(1);
 const g=put(s,0,'battle',GUER,{tapped:true}),a=put(s,1,'battle',BIG);
 give(s,0,'mana',[]);
 const legal=put(s,0,'mana',NATURE),six=put(s,0,'mana','dm29-052');
 put(s,0,'mana',WATER);
 put(s,0,'mana',GUER);
 put(s,0,'mana',SEARCH);
 put(s,0,'mana',NATURE,{faceDown:true});
 const before=physical(s);
 attack(s,a.uid,g.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',g));
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(choices(s)),new Set([legal.uid,six.uid,null]));
 s=JSON.parse(JSON.stringify(s));
 pick(s,six.uid);
 drain(s);
 assert.ok(has(s,0,'battle',six)&&!has(s,0,'mana',six));
 assert.deepEqual(physical(s),before);

 const t=field(1),b=put(t,0,'battle',GUER,{tapped:true});
 destroy(t,b);
 pick(t,null);
 assert.ok(has(t,0,'grave',b)&&t.players[0].battle.length===0);
});

test('Guerrilla breaks two shields and its mana deployment only follows destruction',()=>{
 const s=field(),g=put(s,0,'battle',GUER);
 attack(s,g.uid);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);

 const t=field(1),x=put(t,0,'battle',GUER,{tapped:true});
 play(t,BOUNCE);
 act(t,'effect',a=>a.targets.some(y=>y.uid===x.uid));
 assert.ok(has(t,0,'hand',x));
 assert.equal(t.decision,null);
});
