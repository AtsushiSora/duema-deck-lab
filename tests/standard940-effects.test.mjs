import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const RELOAD='dm30-025',DENDEN='dm23-019',CAPSULE='dm22-043',CAPTAIN='dm21-s01';
const PLAIN='dm01-108',GALAXY='dm26rp1-S001',MARY='dm21-048',MULTI='dmr02-054';
const LASER='dm28-073',HUSTLE='dm21-036',RUBY='dm01-044',GUARD='dmrp01-027';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=cards=>cards.map(x=>x.uid);
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const blocks=s=>e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function trigger(s,id){
 s.active=1;
 const [shield]=give(s,0,'shields',[id]);
 const attacker=put(s,1,'battle',PLAIN);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 return shield;
}

test('Phase 940 verifies four complete official cards and preserves canonical deck identities',()=>{
 const m=read('tools/support-phase-940.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[RELOAD,DENDEN,CAPSULE,CAPTAIN]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),f=row.faces[0],c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:940}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:939}));
  const extra=structuredClone(d);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:940}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],[f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-940');
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase940',name:'シールド・フォースと種族',cards:[RELOAD,DENDEN,CAPSULE,CAPTAIN,PLAIN,GALAXY,MARY,MULTI,LASER,HUSTLE].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const redeploy of [true,false])test('Force Reloaded offers only the exact returned creature and resets its old state '+redeploy,()=>{
 let s=field();
 const old=put(s,0,'battle',GALAXY,{tapped:true,buff:4000,g35ShieldForce:'missing',incarnation:4});
 const duplicate=put(s,0,'hand',GALAXY);
 put(s,0,'battle',GALAXY,{g35Ignored:s.turn});
 put(s,1,'battle',GALAXY);
 put(s,0,'battle',PLAIN);
 const spell=play(s,RELOAD);
 assert.deepEqual(values(s),[old.uid]);
 pick(s,old);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(find(s,0,'hand',old));
 s=restore(s);pick(s,redeploy?true:null);
 if(redeploy){
  const shield=s.players[0].shields[1];
  assert.equal(s.decision.task.name,'shieldForce');
  pick(s,shield);
  const live=find(s,0,'battle',old);
  assert.ok(live.incarnation>4);
  assert.equal(live.g35ShieldForce,shield.uid);
  assert.equal(e.power(live,false,s),9000);
  assert.equal(live.tapped,false);
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===live.uid));
 }else assert.ok(find(s,0,'hand',old));
 assert.ok(find(s,0,'grave',spell)&&find(s,0,'hand',duplicate));
});

test('Force Reloaded has no replay when the selected creature could not leave',()=>{
 const s=field();
 const galaxy=put(s,0,'battle',GALAXY,{g35ShieldForce:s.players[0].shields[0].uid});
 const spell=play(s,RELOAD);
 pick(s,galaxy);
 assert.ok(find(s,0,'battle',galaxy)&&find(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

test('Force Reloaded is also available as an S-Trigger and respects a non-execution entry lock',()=>{
 const s=field();
 const galaxy=put(s,0,'battle',GALAXY);
 put(s,1,'battle','dm26rp1-S008');
 const spell=trigger(s,RELOAD);
 pick(s,galaxy);
 assert.ok(find(s,0,'hand',galaxy)&&find(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

for(const n of [0,1,2])test('Dokokara Denden can add up to one card per live friendly Dreammate '+n,()=>{
 const s=field();
 put(s,0,'battle',MARY);
 put(s,0,'battle',MULTI);
 const sealed=put(s,0,'battle',MARY,{sealed:true});
 s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:sealed.uid});
 put(s,1,'battle',MARY);
 put(s,0,'battle',PLAIN,{under:[inst(MARY)]});
 const top=give(s,0,'deck',[MULTI,PLAIN,MARY,PLAIN]).slice(),before=s.players[0].mana.length;
 const denden=play(s,DENDEN);
 assert.equal(s.decision.task.op,'g34_Ramp');
 assert.deepEqual(values(s),[0,1,2]);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 pick(s,n);
 assert.ok(find(s,0,'battle',denden));
 assert.deepEqual(ids(s.players[0].mana.slice(before)),ids(top.slice(0,n)));
 assert.deepEqual(ids(s.players[0].deck),ids(top.slice(n)));
 if(n)assert.equal(find(s,0,'mana',top[0]).tapped,true);
 if(n===2)assert.equal(find(s,0,'mana',top[1]).tapped,false);
});

test('Dokokara Denden’s S-Trigger uses the normal deck-to-mana replacement',()=>{
 const s=field();
 const [top]=give(s,0,'deck',[MULTI,PLAIN,PLAIN]);
 put(s,0,'battle',MARY);
 put(s,1,'battle','dm22ex1-086');
 const denden=trigger(s,DENDEN);
 assert.equal(s.decision.player,0);
 pick(s,1);
 assert.ok(find(s,0,'battle',denden)&&find(s,0,'grave',top));
 assert.ok(!find(s,0,'mana',top));
 assert.equal(s.metrics[0].triggers,1);
});

test('Dokokara Denden with no Dreammates leaves the library untouched',()=>{
 const s=field(),deck=ids(s.players[0].deck);
 put(s,1,'battle',MARY);
 play(s,DENDEN);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),deck);
});

test('Future Capsule privately splits and orders both ends without changing untouched cards',async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');
 let s=field();
 const [a,b,c,d,f,u,v]=give(s,0,'deck',[MARY,MULTI,GALAXY,HUSTLE,LASER,PLAIN,RUBY]);
 const spell=play(s,CAPSULE);
 const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
 const publicGame=projectRoom(room,{uid:'b'},1).game;
 assert.equal(publicGame.inspectedCards,undefined);
 assert.ok(!JSON.stringify(publicGame).includes(GALAXY));
 assert.deepEqual(new Set(values(s)),new Set([a.uid,b.uid,c.uid,d.uid,f.uid,null]));
 pick(s,c);pick(s,a);pick(s,null);
 assert.equal(s.decision.task.op,'g34_Order');
 s=restore(s);
 pick(s,f);pick(s,d);
 assert.deepEqual(ids(s.players[0].deck),ids([c,a,u,v,f,d,b]));
 assert.ok(find(s,0,'grave',spell));
 assert.equal(s.players[0].g34Protected.length,0);
});

for(const keepAll of [true,false])test('Future Capsule can keep all or zero cards on top with a short deck '+keepAll,()=>{
 const s=field();
 const [a,b,c]=give(s,0,'deck',[MARY,PLAIN,LASER]);
 const spell=trigger(s,CAPSULE);
 if(keepAll){pick(s,c);pick(s,b);pick(s,a);}
 else{pick(s,null);pick(s,c);pick(s,b);}
 assert.deepEqual(ids(s.players[0].deck),ids([c,b,a]));
 assert.equal(s.winner,null);
 assert.ok(find(s,0,'grave',spell));
 assert.equal(s.metrics[0].triggers,1);
});

for(const owner of [0,1])test('Captain grants Blocker to both tribes on either team while preserving printed Blocker '+owner,()=>{
 const s=field();
 const captain=put(s,owner,'battle',CAPTAIN);
 const laser=put(s,1,'battle',LASER),hustle=put(s,1,'battle',HUSTLE),ruby=put(s,1,'battle',RUBY);
 const attacker=put(s,0,'battle',PLAIN);
 assert.ok(e.effectiveCard(captain,s).blocker);
 attack(s,attacker.uid);
 assert.deepEqual(new Set(blocks(s)),new Set([laser.uid,hustle.uid,...(owner===1?[captain.uid]:[])]));
 assert.ok(e.effectiveCard(ruby,s).blocker);
 act(s,'noBlock');drain(s);
});

test('Captain’s block restriction does not stop Guardman and ends when the Captain’s ability is ignored',()=>{
 const s=field();
 const captain=put(s,0,'battle',CAPTAIN);
 const attacker=put(s,0,'battle',PLAIN);
 const ruby=put(s,1,'battle',RUBY),victim=put(s,1,'battle',PLAIN,{tapped:true});
 const guard=put(s,1,'battle',GUARD);
 attack(s,attacker.uid,victim.uid);
 assert.ok(!blocks(s).includes(ruby.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===guard.uid));
 captain.g35Ignored=s.turn;
 assert.ok(blocks(s).includes(ruby.uid));
});
