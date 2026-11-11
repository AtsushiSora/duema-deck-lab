import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack,PRESETS} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BASH='dmrp01-021',KABE='dmrp03-043',KING='dmrp01-008',LUTZ='dmrp03-010',BUGLE='dmrp04s-082';
const GREEN='dm01-108',BLUE='dm01-083',DEATH='dm01-027',BOUNCE='dm01-086',LARGE='dmr23-072';
const INFERNO='dmc44-001',BANG='dmrp10-s11',EDDIE='dm25rp1-006',SEED='dmsd20-016';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(GREEN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 974 verifies five canonical cards and the Bash reprint',()=>{
 const m=read('tools/support-phase-974.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BASH,KABE,KING,LUTZ,BUGLE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex06-064',BASH]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:974}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:973}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:974}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,id===BUGLE?40:4]);
  assert.equal(c.supportBatch,'phase-974');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:974}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

test('Bash requires one creature of at most 1000 power from its own grave after destruction',()=>{
 let s=field();
 const x=put(s,0,'battle',BASH),weak=put(s,0,'grave',BLUE);
 put(s,0,'grave',GREEN);
 put(s,0,'grave',BOUNCE);
 put(s,1,'grave',BLUE);
 s.active=1;
 cast(s,DEATH);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
 assert.ok(inZone(s,0,'grave',x));
 assert.deepEqual(s.decision.choices.map(value),[weak.uid]);
 const before=physical(s);
 s=restore(s);
 pick(s,weak.uid);
 assert.ok(inZone(s,0,'battle',weak));
 assert.deepEqual(physical(s),before);
});

test('Bash uses Slayer against a stronger creature that destroys it in battle',()=>{
 const s=field(),x=put(s,0,'battle',BASH),enemy=put(s,1,'battle',LARGE,{tapped:true});
 const weak=put(s,0,'grave',BLUE);
 attack(s,x.uid,enemy.uid);
 act(s,'noBlock');
 pick(s,weak.uid);
 drain(s);
 assert.ok(inZone(s,0,'grave',x));
 assert.ok(inZone(s,0,'battle',weak));
 assert.ok(inZone(s,1,'grave',enemy));
});

for(const self of [false,true])test('Kabedon waits until the attack ends '+self,()=>{
 let s=field();
 const kabe=put(s,0,'battle',KABE),attacker=self?kabe:put(s,0,'battle',BLUE);
 const before=physical(s);
 attack(s,attacker.uid);
 assert.ok(inZone(s,0,'battle',kabe));
 assert.equal(s.attackLifecycle.g542After[0].uid,kabe.uid);
 s=restore(s);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(inZone(s,0,'grave',kabe));
 assert.deepEqual(physical(s),before);
});

test('Kabedon does not schedule destruction for a card that enters after the attack declaration',()=>{
 const s=field(),attacker=put(s,0,'battle',BLUE);
 attack(s,attacker.uid);
 const late=put(s,0,'battle',KABE);
 act(s,'noBlock');
 drain(s);
 assert.ok(inZone(s,0,'battle',late));
});

test('Kabedon can block an enemy without scheduling its own destruction',()=>{
 const s=field(),kabe=put(s,0,'battle',KABE),attacker=put(s,1,'battle',BLUE);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===kabe.uid);
 drain(s);
 assert.ok(inZone(s,0,'battle',kabe));
 assert.ok(inZone(s,1,'grave',attacker));
 assert.equal(s.players[0].shields.length,5);
});

test('Kabedon destroys itself after a shield trigger interrupts the attack',()=>{
 const s=field(),kabe=put(s,0,'battle',KABE),attacker=put(s,0,'battle',BLUE);
 give(s,1,'shields',[DEATH,GREEN,GREEN,GREEN,GREEN]);
 const shield=s.players[1].shields[0];
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.shield===shield.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 act(s,'useTrigger',a=>a.cardId===DEATH);
 act(s,'effect',a=>a.targets[0].uid===attacker.uid);
 drain(s);
 assert.ok(inZone(s,0,'grave',attacker));
 assert.ok(inZone(s,0,'grave',kabe));
});

test('Block King switches between opposing tap-in and an aura for other allies',()=>{
 const s=field(),king=put(s,0,'battle',KING),ally=put(s,0,'battle',GREEN);
 assert.equal(e.power(ally,false,s),2000);
 s.active=1;
 cast(s,BLUE);
 const first=s.players[1].battle[0];
 assert.equal(first.tapped,true);
 s.active=0;
 attack(s,king.uid,first.uid);
 assert.equal(e.power(ally,false,s),9000);
 assert.equal(e.power(king,true,s),7000);
 assert.equal(e.power(first,false,s),1000);
 act(s,'noBlock');
 s.active=1;s.phase='main';
 cast(s,BLUE);
 assert.equal(s.players[1].battle.at(-1).tapped,false);
 assert.equal(e.power(ally,false,s),9000);
 king.tapped=false;
 assert.equal(e.power(ally,false,s),2000);
});

test('Block King tap-in affects deployment as well as summoning and respects ability suppression',()=>{
 for(const ignore of [true,false]){
  const s=field(),king=put(s,0,'battle',KING);
  if(ignore)king.g35Ignored=s.turn;
  const x=put(s,1,'grave',BLUE);
  s.active=1;
  cast(s,INFERNO);
  pick(s,x.uid);
  assert.ok(inZone(s,1,'battle',x));
  assert.equal(s.players[1].battle[0].tapped,!ignore);
 }
});

test('Block King breaks two shields against an unblocked player',()=>{
 const s=field(),king=put(s,0,'battle',KING);
 attack(s,king.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Lutz from hand moves itself to mana even with an eligible opposing creature',()=>{
 const s=field(),x=put(s,0,'hand',LUTZ),enemy=put(s,1,'battle',BLUE);
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(inZone(s,0,'mana',x));
 assert.ok(inZone(s,1,'battle',enemy));
 assert.equal(s.decision,null);
});

for(const origin of ['grave','mana'])test('Lutz from '+origin+' chooses an enemy creature and stays in play',()=>{
 let s=field();
 const x=put(s,0,origin,LUTZ),enemy=put(s,1,'battle',BLUE),other=put(s,1,'battle',GREEN);
 put(s,1,'battle',SEED);
 if(origin==='grave'){
  cast(s,INFERNO);
  pick(s,x.uid);
 }else{
  put(s,0,'battle',BANG);
  act(s,'play',a=>a.uid===x.uid&&a.origin==='mana');
 }
 assert.deepEqual(s.decision.choices.map(value),[enemy.uid,other.uid]);
 const before=physical(s);
 s=restore(s);
 pick(s,enemy.uid);
 assert.ok(inZone(s,1,'mana',enemy));
 assert.ok(inZone(s,1,'battle',other));
 assert.ok(inZone(s,0,'battle',x));
 assert.deepEqual(physical(s),before);
 assert.equal(e.card(x).breaker,3);
});

test('Lutz from outside the hand remains when there is no enemy creature',()=>{
 const s=field(),x=put(s,0,'grave',LUTZ);
 cast(s,INFERNO);
 pick(s,x.uid);
 assert.ok(inZone(s,0,'battle',x));
 assert.equal(s.decision,null);
});

test('Bugle Puzzle can fill a legal forty and counts only visible copies in its own battle and grave',()=>{
 const s=field(),x=put(s,0,'hand',BUGLE);
 const deck={id:'bugle',name:'バグル・パズル',cards:[{id:BUGLE,count:40}]};
 assert.deepEqual(e.validateDeck(deck),[]);
 assert.ok(e.validateDeck({...deck,cards:[{id:BUGLE,count:41}]}).length);
 const match=e.createGame([deck,PRESETS[0]],{first:0,seed:974});
 assert.equal(e.physicalCards(match).filter(y=>y.cardId===BUGLE).length,40);
 const cost=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid).cost;
 put(s,1,'battle',BUGLE);
 put(s,1,'grave',BUGLE);
 put(s,0,'hand',BUGLE);
 put(s,0,'mana',BUGLE);
 put(s,0,'battle',GREEN,{under:[inst(BUGLE)]});
 assert.equal(cost(),3);
 put(s,0,'battle',BUGLE);
 assert.equal(cost(),2);
 put(s,0,'grave',BUGLE);
 put(s,0,'grave',BUGLE);
 assert.equal(cost(),1);
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(inZone(s,0,'battle',x));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,1);
});

test('Bugle Puzzle in the grave cannot discount its own summon',()=>{
 const s=field(),x=put(s,0,'grave',BUGLE);
 put(s,0,'battle',EDDIE);
 const quote=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='grave'&&a.uid===x.uid).cost;
 assert.equal(quote(),3);
 put(s,0,'grave',BUGLE);
 assert.equal(quote(),2);
 act(s,'play',a=>a.uid===x.uid&&a.origin==='grave');
 assert.ok(inZone(s,0,'battle',x));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
});
