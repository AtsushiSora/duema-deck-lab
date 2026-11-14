import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AXE='dm23rp2-040',EN='dm23rp2-031',SH='dm23rp2-027';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',GEN='dmrp15-km1';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id,face=0)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;};
const ids=xs=>xs.map(x=>x.uid);
const mana=(s,x,p=0)=>{assert.ok(has(s,p,'mana',x));assert.ok(!has(s,p,'grave',x));assert.equal(s.players[p].mana.find(y=>y.uid===x.uid).tapped,false);};

test('nineteen official prints share three canonical IDs and their complete card effects',()=>{
 const m=read('support-phase-1209.json'),refs=read('image-reference-prints.json').prints,catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[AXE,EN,SH]);
 assert.deepEqual(m.printAliases.map(r=>r.id),[
  'dm23rp2x-040','dm23bd4-046','dm24ex2-Cho037','dm24bd6-051',
  'dm23rp2x-031','dm23rp2-16A','dm23rp2x-16A','dm23rp2-18B','dm23rp2x-18B','dm23bd7-050',
  'dm23rp2x-027','dm23rp2-15A','dm23rp2x-15A','dm23rp2-17B','dm23rp2x-17B','dm23bd7-049'
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1209}),row.spec);
  for(const i of [0,1]){
   const unknown=structuredClone({...row,status:'complete'});unknown.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(unknown,{phase:1209}));
  }
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(catalogue.get(id).supported,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(live.limit,4);assert.equal(live.manaValue,1);
  assert.deepEqual(e.playFaces(live).map(c=>[c.type,c.cost,c.power,c.race,c.civilizations]),
   row.faces.map((f,i)=>[i?'spell':'creature',f.cost,i?undefined:+f.powerText,f.race,f.civilizations]));
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
 }
});

test('Cerulean can fight the chosen enemy on entry or decline, never fighting allies',()=>{
 for(const choose of [true,false]){
  const s=field(),enemy=put(s,1,'battle',SMALL),larger=put(s,1,'battle',WATER);
  put(s,0,'battle',FIRE);
  larger.powerModifiers=[{amount:10000,expires:'end',who:0}];
  const x=play(s,AXE);
  assert.equal(s.decision.task.op,'g34_FightEnemy240');
  assert.deepEqual(values(s),[enemy.uid,larger.uid,null]);
  pick(s,choose?enemy.uid:null);drain(s);
  assert.equal(has(s,1,'grave',enemy),choose);
  assert.ok(has(s,1,'battle',larger));assert.ok(has(s,0,'battle',x));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,7);
 }
});

for(const n of [0,1,2])test('Double Axe bottoms '+n+' cards in order, draws that many, then becomes untapped mana',()=>{
 let s=field();
 const hand=[put(s,0,'hand',WATER),put(s,0,'hand',FIRE),put(s,0,'hand',SMALL)];
 const before=s.players[0].deck.slice(),x=play(s,AXE,1),selected=[hand[1],hand[0]].slice(0,n);
 assert.deepEqual(values(s),[...ids(hand),null]);
 assert.ok(!has(s,0,'mana',x));assert.ok(!has(s,0,'hand',x));
 for(const y of selected)pick(s,y.uid);
 if(n<2)pick(s,null);
 s=JSON.parse(JSON.stringify(s));
 mana(s,x);
 assert.deepEqual(ids(s.players[0].hand),[...ids(hand.filter(y=>!selected.includes(y))),...ids(before.slice(0,n))]);
 assert.deepEqual(ids(s.players[0].deck),[...ids(before.slice(n)),...ids(selected)]);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,3);
 assert.equal(s.players[0].grave.length,0);
});

test('Energico draws two on entry and the Charger lets you discard the newly drawn card',()=>{
 const s=field(),[a,b,c]=s.players[0].deck;
 const x=play(s,EN);
 assert.ok(has(s,0,'battle',x));
 assert.deepEqual(ids(s.players[0].hand),[a.uid,b.uid]);
 const spell=play(s,EN,1);
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid]);
 assert.ok(!has(s,0,'mana',spell));
 pick(s,c.uid);
 assert.deepEqual(ids(s.players[0].hand),[a.uid,b.uid]);
 assert.deepEqual(ids(s.players[0].grave),[c.uid]);
 mana(s,spell);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,10);
});

test('Energico Charger must discard after drawing even if there was no other card in hand',()=>{
 const s=field(),top=s.players[0].deck[0],x=play(s,EN,1);
 assert.deepEqual(values(s),[top.uid]);
 pick(s,top.uid);
 assert.deepEqual(ids(s.players[0].grave),[top.uid]);
 mana(s,x);
});

test('Shirley adds two distinct face-down shields on entry; its Charger adds one then enters mana',()=>{
 const s=field(),[top,next,third]=s.players[0].deck,first=ids(s.players[0].shields);
 const creature=play(s,SH);
 assert.ok(has(s,0,'battle',creature));
 assert.deepEqual(ids(s.players[0].shields),[...first,top.uid,next.uid]);
 assert.ok(s.players[0].shields.slice(-2).every(y=>!y.faceUp));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,7);
 const spell=play(s,SH,1);
 assert.deepEqual(ids(s.players[0].shields),[...first,top.uid,next.uid,third.uid]);
 assert.equal(s.players[0].shields.at(-1).faceUp??false,false);
 mana(s,spell);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,10);
});

for(const id of [AXE,EN,SH])test(id+' breaks two shields as a creature and does not apply its spell face',()=>{
 const s=field(),other=put(s,1,'battle',SMALL);
 const x=play(s,id);
 if(id===AXE)pick(s,null);
 assert.ok(has(s,1,'battle',other));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,7);
 assert.ok(!has(s,0,'mana',x));
 s.turn=2;attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Genmu suppresses all three spell effects and their Charger replacement',()=>{
 for(const id of [AXE,EN,SH]){
  const s=field(),cards=ids(s.players[0].deck),shields=ids(s.players[0].shields);
  const hand=put(s,0,'hand',SMALL);
  put(s,1,'battle',GEN);
  const x=play(s,id,1);
  assert.equal(s.decision,null);assert.ok(has(s,0,'grave',x));
  assert.deepEqual(ids(s.players[0].deck),cards);
  assert.deepEqual(ids(s.players[0].shields),shields);
  assert.deepEqual(ids(s.players[0].hand),[hand.uid]);
  assert.ok(!has(s,0,'mana',x));
 }
});
