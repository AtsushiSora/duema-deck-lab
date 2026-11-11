import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MISTER='dmr16g-023',NEWIE='dmr16s-035',RAGA='dmr14-050',DEAD='dmr13-s03',FLOM='dmr13-041';
const PRINTS=[['dmr16s-023',MISTER]];
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',HAND='dm01-027',BOUNCE='dm01-086';
const WIPE='dm14-015',GHOST='dm01-094',JENNY='dmr01-056',TYPHOON='dm11-043';
const FUUJIN='dmrp22-037',GIANT='dm10-006',SACRIFICE='dm36-058';
const CORPS=['dmr16s-040','dmr16g-046','dmr16g-043','dmr16g-051'];
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 990 registers five official definitions and maps the reprint to their canonical IDs',()=>{
 const m=read('tools/support-phase-990.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MISTER,NEWIE,RAGA,DEAD,FLOM]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:MISTER,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:990}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:990}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,id===NEWIE?40:4]);
  assert.equal(c.supportBatch,'phase-990');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:990}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const attackOptions=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
const targets=(s,x)=>attackOptions(s,x).map(a=>a.target);

function destroy(s,x){
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}

test('Mister reveals three and collects every printed blank creature',()=>{
 const s=field();
 give(s,0,'deck',[FIRE,HAND,WATER,NATURE]);
 const [fire,spell,water,last]=s.players[0].deck;
 const x=put(s,0,'hand',MISTER),before=physical(s);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[fire.uid,water.uid]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[last.uid,spell.uid]);
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.cardId===MISTER&&row.text.includes(e.card(HAND).name)));
 assert.deepEqual(physical(s),before);
});

test('Mister excludes creatures with abilities and orders the remaining cards after reload',()=>{
 let s=field();
 give(s,0,'deck',[DEAD,FIRE,HAND,NATURE]);
 const [ability,blank,spell,last]=s.players[0].deck;
 play(s,MISTER);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[blank.uid]);
 assert.equal(s.decision.task.op,'g34_Order');
 assert.deepEqual(new Set(choices(s)),new Set([ability.uid,spell.uid]));
 s=restore(s);
 pick(s,spell.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[last.uid,spell.uid,ability.uid]);
});

test('Mister may replace discard by opposing spells and creature effects',()=>{
 for(const source of [GHOST,JENNY])for(const accept of [true,false]){
  let s=field();
  const x=put(s,1,'hand',MISTER);
  play(s,source);
  if(s.decision?.task?.op!=='discardChosen')drainUntilDiscard(s);
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.op,'discardChosen');
  s=restore(s);
  pick(s,accept);
  assert.equal(has(s,1,'battle',x),accept);
  assert.equal(has(s,1,'grave',x),!accept);
  assert.equal(s.players[1].hand.length,accept?3:0);
 }
});

function drainUntilDiscard(s){
 for(let n=0;s.decision&&s.decision.task?.op!=='discardChosen';n++){
  assert.ok(n<10);
  e.step(s,e.chooseAI(s));
 }
}

test('Mister reaches the grave when its controller discards it',()=>{
 const s=field(),x=put(s,0,'hand',MISTER);
 play(s,TYPHOON);
 pick(s,0);
 pick(s,x.uid);
 assert.ok(has(s,0,'grave',x));
 assert.ok(!has(s,0,'battle',x));
});

test('Newie counts all allies for player attacks and separately counts the Corps for power and breaking',()=>{
 const s=field(),x=put(s,0,'battle',NEWIE),target=put(s,1,'battle',FIRE,{tapped:true});
 for(const id of CORPS.slice(0,3))put(s,0,'battle',id);
 put(s,1,'battle',CORPS[3]);
 const sealed=put(s,0,'battle',CORPS[3],{sealed:true});
 put(s,0,'seals',FIRE,{faceDown:true,sealOf:sealed.uid});
 s.phase='attack';
 assert.deepEqual(targets(s,x),[target.uid]);
 assert.equal(e.power(x,false,s),1000);
 const ordinary=put(s,0,'battle',WATER);
 assert.ok(targets(s,x).includes('player'));
 assert.equal(e.power(x,false,s),1000);
 assert.equal(e.effectiveCard(x,s).breaker??1,1);
 ordinary.cardId=CORPS[3];
 assert.equal(e.power(x,false,s),6000);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 const shields=s.players[1].shields.length;
 attack(s,x.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,shields-2);
});

test('Newie can block with fewer than five creatures and can fill an original deck',()=>{
 const s=field(),x=put(s,1,'battle',NEWIE),foe=put(s,0,'battle',FIRE);
 assert.deepEqual(e.validateDeck({format:'original',cards:[{id:NEWIE,count:40}]}),[]);
 attack(s,foe.uid);
 act(s,'block',a=>a.uid===x.uid);
 drain(s);
 assert.ok(has(s,1,'grave',x));
 assert.equal(s.players[1].shields.length,5);
});

test('Lagavulin lets itself and later arrivals attack the selected untapped creature while summoning sick',()=>{
 let s=field();
 const target=put(s,1,'battle',NATURE),other=put(s,1,'battle',WATER);
 const tapped=put(s,1,'battle',FIRE,{tapped:true}),ally=put(s,0,'battle',WATER);
 const source=play(s,RAGA);
 assert.deepEqual(new Set(choices(s)),new Set([target.uid,other.uid]));
 pick(s,target.uid);
 const late=put(s,0,'battle',FIRE,{entered:s.turn});
 s=restore(s);
 s.phase='attack';
 assert.deepEqual(targets(s,source),[target.uid]);
 assert.deepEqual(targets(s,late),[target.uid]);
 assert.ok(targets(s,ally).includes(target.uid)&&targets(s,ally).includes(tapped.uid));
 assert.ok(!targets(s,ally).includes(other.uid));
 act(s,'endTurn');drain(s);
 s.phase='attack';
 act(s,'endTurn');drain(s);
 s.phase='attack';
 assert.ok(!targets(s,source).includes(target.uid));
});

test('Dead Ryusei destroys an opposing creature on entry and draws optionally from either side',()=>{
 const s=field(),target=put(s,1,'battle',FIRE),ally=put(s,0,'battle',WATER);
 const top=s.players[0].deck[0];
 const x=play(s,DEAD);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
 pick(s,1);
 assert.ok(has(s,0,'hand',top));
 destroy(s,ally);
 pick(s,0);
 assert.equal(s.players[0].hand.length,1);
});

test('Dead Ryusei sees only its own death when it dies simultaneously with other creatures',()=>{
 let s=field();
 const x=put(s,0,'battle',DEAD),top=s.players[0].deck[0];
 for(const p of [0,1])for(let n=0;n<3;n++)put(s,p,'battle',FIRE);
 s.active=1;
 play(s,WIPE);
 assert.ok(has(s,0,'grave',x));
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,1);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),[top.uid]);
});

test('Flomyraum replaces destruction with a face-down shield, including in battle',()=>{
 for(const inBattle of [false,true]){
  const s=field(),x=put(s,0,'battle',FLOM,{tapped:true}),before=s.players[0].shields.length;
  assert.equal(e.effectiveCard(x,s).breaker,2);
  if(inBattle){
   const foe=put(s,1,'battle',GIANT);
   s.active=1;
   attack(s,foe.uid,x.uid);
   drain(s);
  }else destroy(s,x);
  const shield=s.players[0].shields.find(y=>y.uid===x.uid);
  assert.ok(shield&&!shield.faceUp);
  assert.equal(s.players[0].shields.length,before+1);
  assert.ok(!has(s,0,'grave',x));
 }
});

test('Flomyraum can be bounced and dies if a new shield cannot be added',()=>{
 const bounced=field(),x=put(bounced,1,'battle',FLOM);
 play(bounced,BOUNCE);
 drain(bounced);
 assert.ok(has(bounced,1,'hand',x));
 assert.equal(bounced.players[1].shields.length,5);
 const locked=field(),y=put(locked,0,'battle',FLOM);
 put(locked,1,'battle',FUUJIN);
 play(locked,SACRIFICE);
 pick(locked,y.uid);
 drain(locked);
 assert.ok(has(locked,0,'grave',y));
 assert.equal(locked.players[0].shields.length,5);
});
