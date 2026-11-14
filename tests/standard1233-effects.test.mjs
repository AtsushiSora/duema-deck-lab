import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GARDEN='dm24rp1-002',LIGATE='dm24rp2-030',CASTOFF='dm24rp2-070',VOL='dm24rp2-S07';
const NON='dm01-108',HIGH='dm01-s06',TRIGGER='dm01-110',DESTROY='dm01-027',BOUNCE='dm01-086';
const BLACK='dm22ex1-086',QX='dmrp07-m01',AMO='dmrp19-s10';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function top(s,p,id){const x=inst(id);s.players[p].deck.unshift(x);return x;}
function pick(s,wanted){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];

test('the official versions preserve the three original IDs and link the Garden reprint',()=>{
 const m=read('tools/support-phase-1233.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GARDEN,LIGATE,CASTOFF]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm24ex3-rp1002']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1233}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Garden recovers at most five creatures and has Blocker and Triple Breaker',()=>{
 const s=field(),recovery=Array.from({length:6},()=>add(s,0,'grave',NON));
 const spell=add(s,0,'grave',TRIGGER),enemy=add(s,1,'grave',NON),g=add(s,0,'hand',GARDEN);
 act(s,'play',a=>a.uid===g.uid);
 assert.deepEqual(choices(s),[...recovery.map(x=>x.uid),null]);
 for(const x of recovery.slice(0,5))pick(s,x.uid);
 assert.equal(s.players[0].hand.length,5);
 assert.ok(has(s,0,'grave',recovery[5])&&has(s,0,'grave',spell)&&has(s,1,'grave',enemy));
 const definition=e.effectiveCard(g,s);
 assert.ok(definition.blocker);assert.equal(definition.breaker,3);
 const t=field();const decline=add(t,0,'grave',NON);cast(t,GARDEN);pick(t,null);
 assert.ok(has(t,0,'grave',decline));
});

test('Garden selects any number before discarding and reduces all current opposing creatures once',()=>{
 for(const n of [0,1,2,3]){
  const s=field(),garden=add(s,0,'battle',GARDEN),ally=add(s,0,'battle',NON);
  const large=add(s,1,'battle',HIGH),small=add(s,1,'battle',NON);
  const hand=Array.from({length:3},()=>add(s,0,'hand',NON));
  attack(s,garden.uid);for(const x of hand.slice(0,n))pick(s,x.uid);
  if(n<3)pick(s,null);
  assert.equal(s.players[0].grave.length,n);
  assert.equal(e.power(ally,false,s),2000);
  assert.equal(has(s,1,'grave',small),n>0);
  assert.equal(has(s,1,'grave',large),n===3);
  if(n<3)assert.equal(e.power(large,false,s),7000-3000*n);
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  if(n<3){end(s);assert.equal(e.power(large,false,s),7000);}
 }
});

test('Garden handles a one-card hand and excludes a discard replaced by Amodegoras',()=>{
 for(const replace of [false,true]){
  const s=field(),garden=add(s,0,'battle',GARDEN),hand=add(s,0,'hand',NON);
  const large=add(s,1,'battle',HIGH);
  if(replace)add(s,0,'battle',AMO);
  attack(s,garden.uid);pick(s,hand.uid);
  if(replace)pick(s,v=>v?.g1090Mana);
  assert.equal(has(s,0,replace?'mana':'grave',hand),true);
  assert.equal(e.power(large,false,s),replace?7000:4000);
 }
});

test('Ligate privately inspects the deck top, adds exactly that face-down shield, then retrieves one without S Trigger',()=>{
 const s=field(),known=top(s,0,TRIGGER);
 give(s,0,'shields',[NON]);cast(s,LIGATE);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[TRIGGER]);
 assert.ok(!s.log.some(x=>x.cardId===known.cardId));
 assert.equal(s.players[0].deck[0],known);
 pick(s,true);
 assert.equal(s.players[0].shields.at(-1),known);
 assert.ok(!known.faceUp);
 pick(s,known.uid);
 assert.ok(has(s,0,'hand',known)&&!s.triggers);
 assert.equal(s.players[0].shields.length,1);
 assert.equal(s.players[0].g34Protected.length,0);
});

test('Ligate still takes a shield after QX prevents looking or Kareiko redirects the top card',()=>{
 for(const lock of [QX,BLACK]){
  const s=field(),known=top(s,0,TRIGGER);
  give(s,0,'shields',[NON]);const [shield]=s.players[0].shields;
  add(s,1,'battle',lock);cast(s,LIGATE);
  if(lock===BLACK)pick(s,true);
  pick(s,shield.uid);
  assert.ok(has(s,0,'hand',shield)&&!s.players[0].shields.length);
  assert.ok(has(s,0,lock===QX?'deck':'grave',known));
 }
});

test('Ligate is shielded face down on destruction but can be returned to hand',()=>{
 for(const spell of [DESTROY,BOUNCE]){
  const s=field(1),ligate=add(s,0,'battle',LIGATE);
  cast(s,spell);act(s,'effect',a=>a.targets[0].uid===ligate.uid);
  assert.ok(!has(s,0,'battle',ligate)&&!has(s,0,'grave',ligate));
  assert.ok(has(s,0,spell===DESTROY?'shields':'hand',ligate));
  if(spell===DESTROY)assert.ok(!ligate.faceUp);
 }
});

test('Cast Off releases only the chosen Hyper creature even without an opponent and expires at its owner’s start',()=>{
 const s=field(),vol=add(s,0,'battle',VOL),other=add(s,0,'battle',VOL);
 cast(s,CASTOFF);pick(s,vol.uid);
 assert.ok(vol.hyperActive&&!other.hyperActive&&!other.tapped);
 assert.equal(e.power(vol,false,s),9000);
 end(s);assert.equal(e.power(vol,false,s),9000);
 end(s);assert.equal(e.power(vol,false,s),4000);
});

test('Cast Off can fight using the released power, fight with a regular ally, or decline the battle',()=>{
 for(const [id,fight] of [[VOL,true],[HIGH,true],[VOL,false]]){
  const s=field(),ally=add(s,0,'battle',id),enemy=add(s,1,'battle',id===HIGH?NON:HIGH);
  cast(s,CASTOFF);pick(s,ally.uid);
  assert.equal(!!ally.hyperActive,id===VOL);
  assert.deepEqual(choices(s),[enemy.uid,null]);
  pick(s,fight?enemy.uid:null);
  assert.ok(has(s,0,'battle',ally));
  assert.equal(has(s,1,'grave',enemy),fight);
 }
});

test('Cast Off is usable as a shield trigger and releases Hyper on the defending turn',()=>{
 const s=field(1),ally=add(s,0,'battle',VOL),attacker=add(s,1,'battle',NON);
 give(s,0,'shields',[CASTOFF]);attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger');pick(s,ally.uid);pick(s,null);
 assert.ok(ally.hyperActive);
 end(s);assert.ok(!ally.hyperActive);
});

test('online Ligate inspection is visible only to its controller and ends when the card becomes a shield',async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');
 const s=field(),known=top(s,0,TRIGGER);
 const host={uid:'host',name:'Host'},guest={uid:'guest',name:'Guest'};
 const room={hostUid:host.uid,guestUid:guest.uid,phase:'playing',expiresAt:100,
  decks:[{},{}],profiles:[host,guest],events:[],game:s};
 cast(s,LIGATE);
 assert.deepEqual(projectRoom(room,host,0).game.inspectedCards.map(x=>x.id),[TRIGGER]);
 assert.equal(projectRoom(room,guest,0).game.inspectedCards,undefined);
 assert.ok(!JSON.stringify(projectRoom(room,guest,0)).includes(known.uid));
 pick(s,true);
 for(const player of [host,guest]){
  const view=projectRoom(room,player,0);
  assert.equal(view.game.inspectedCards,undefined);
  assert.ok(!JSON.stringify(view).includes(known.uid));
 }
});
