import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TECHNO='dm20-002',PANZER='dmx17-012',ASTERIA='dm13-007';
const CREATURE='dm01-083',NATURE='dm01-108',ENERGY='dm06-085',MILPOLO='dm10-080';
const AMODEGORAS='dmrp19-s10',BABYLONIA='dm32-021',GENMU='dmrp15-km1';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

const pass=s=>{s.phase='attack';act(s,'endTurn');};

test('eight official printings resolve to three original battle IDs',()=>{
 const m=read('tools/support-phase-1272.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TECHNO,PANZER,ASTERIA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmc61-003',TECHNO],['dm23bd7-029',PANZER],['dmx20-025',PANZER],['promoy18-071',PANZER],['promoy3-029',ASTERIA]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const detail={id,status:'complete',faces:row.faces};
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1272}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:1271}));
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1272}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(e=>e.id===id&&e.canonicalId===canonicalId&&e.image===image));
 }
});

for(const id of [TECHNO,PANZER])test(id+' can accept or decline the full two-card draw',()=>{
 for(const accept of [true,false]){
  let s=field();add(s,1,'battle',id);cast(s,ENERGY);
  assert.equal(s.decision.player,1);
  assert.deepEqual(options(s),[true,null]);
  assert.match(s.decision.title,/2枚/);
  s=JSON.parse(JSON.stringify(s));pick(s,accept?true:null);
  assert.equal(s.players[1].hand.length,accept?2:0);
  assert.equal(s.decision,null);
 }
});

test('Techno Buster sees the normal turn draw (QA35445)',()=>{
 const s=field();add(s,0,'battle',TECHNO);
 pass(s);
 assert.equal(s.active,1);
 assert.match(s.decision.title,/1枚/);
 pick(s,true);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[1].hand.length,1);
});

test('two Panzers trigger independently with a one-card draw (QA37115)',()=>{
 const s=field();const first=add(s,0,'battle',PANZER),second=add(s,0,'battle',PANZER);
 pass(s);act(s,'orderEffect',a=>a.uid===second.uid);
 pick(s,true);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,0,'battle',first));
 pick(s,true);
 assert.equal(s.players[0].hand.length,2);
});

test('opposing Panzers can repeat their draws until one player declines (QA37114)',()=>{
 const s=field();add(s,0,'battle',PANZER);add(s,1,'battle',PANZER);pass(s);
 for(const chooser of [0,1,0,1]){
  assert.equal(s.decision.player,chooser);
  pick(s,true);
 }
 assert.equal(s.decision.player,0);pick(s,null);
 assert.deepEqual(s.players.map(p=>p.hand.length),[2,3]);
 assert.equal(s.decision,null);
});

test('a draw converted to mana does not count toward the matching draw',()=>{
 const s=field();add(s,1,'battle',PANZER);add(s,1,'battle',AMODEGORAS);
 cast(s,ENERGY);
 assert.match(s.decision.title,/1枚/);
 pick(s,true);
 assert.deepEqual(s.players.map(p=>p.hand.length),[1,1]);
 cast(s,ENERGY);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players.map(p=>p.hand.length),[1,1]);
});

test('cards drawn in a replacement still trigger the draw matching',()=>{
 const s=field();add(s,0,'battle',BABYLONIA);add(s,1,'battle',PANZER);
 const discard=add(s,0,'hand',CREATURE);
 cast(s,'dm36-086');act(s,'replaceDraw',a=>a.replace);act(s,'discardDraw',a=>a.uid===discard.uid);
 assert.match(s.decision.title,/2枚/);
 pick(s,true);
 assert.equal(s.players[1].hand.length,2);
});

test('Asteria excludes a normal first draw and matches each of the subsequent actual draws',()=>{
 const s=field();add(s,0,'battle',ASTERIA);
 pass(s);
 assert.equal(s.players[0].hand.length,0);
 act(s,'skipCharge');cast(s,ENERGY);drain(s);
 assert.deepEqual(s.players.map(p=>p.hand.length),[2,3]);
});

test('Asteria skips Milporo’s first draw and matches the later turn draw (QA35248)',()=>{
 const s=field();add(s,0,'battle',ASTERIA);add(s,1,'battle',MILPOLO,{tapped:true});
 pass(s);act(s,'silent496',a=>a.yes===true);drain(s);
 assert.deepEqual(s.players.map(p=>p.hand.length),[1,2]);
});

test('an ignored Asteria cannot match later draws',()=>{
 const s=field();add(s,1,'battle',ASTERIA);add(s,0,'battle',GENMU);
 cast(s,'dmr09-022');
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.players[1].hand.length,0);
});

test('Asteria is a blocker and can attack a tapped creature but cannot attack a player',()=>{
 const s=field(),x=add(s,0,'battle',ASTERIA),opp=add(s,1,'battle',CREATURE,{tapped:true});
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===opp.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 opp.tapped=false;s.active=1;attack(s,opp.uid);act(s,'block',a=>a.uid===x.uid);drain(s);
 assert.ok(has(s,1,'grave',opp));
});
