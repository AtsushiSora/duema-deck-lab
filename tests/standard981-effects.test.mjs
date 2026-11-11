import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PALLAS='dmr15-018',SWORD='dmx16-029',SIRIUS='dmex15-b005',NIGHT='dmex03-061',ZABI='dmx05-006';
const REPRINT='dm25bd2-004',TONOSAMA='dmr15-031',HAZURE='dmrp04s-057';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',TRIGGER='dm01-027',SEED='dmsd20-016';
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

function play(s,id,face=0){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 981 registers five canonical cards and maps the verified Sirius reprint to its original ID',()=>{
 const m=read('tools/support-phase-981.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PALLAS,SWORD,SIRIUS,NIGHT,ZABI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,SIRIUS]]);
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:2},{id:SIRIUS,count:1}]),[{id:SIRIUS,count:3}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:981}),row.spec);
  for(const [i,face] of faces.entries()){
   const altered=structuredClone(d);
   altered.faces[i].abilityText=face.abilityText+'未知の追加能力。';
   assert.throws(()=>standardCardSpec(altered,{phase:981}));
  }
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===SWORD?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>x!=='無色'),1,id===NIGHT?40:4]);
  assert.equal(c.supportBatch,'phase-981');
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
 }
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:981}),m.cards[2].spec);
 assert.notEqual(nameKey(e.card(NIGHT).name),nameKey(e.card(HAZURE).name));
});

test('Pallas Rex puts an own visible Pallas into play on entry and again on attack',()=>{
 let s=field();
 const first=put(s,0,'mana',TONOSAMA,{tapped:true}),second=put(s,0,'mana',TONOSAMA);
 const hidden=put(s,0,'mana',TONOSAMA,{faceDown:true}),enemy=put(s,1,'mana',TONOSAMA);
 const rex=play(s,PALLAS),all=physical(s);
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 s=restore(s);
 pick(s,first.uid);
 assert.ok(has(s,0,'battle',first)&&!has(s,0,'mana',first));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 s.players[0].battle.find(x=>x.uid===rex.uid).entered=0;
 attack(s,rex.uid);
 assert.deepEqual(choices(s),[second.uid,null]);
 pick(s,second.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'battle',second)&&has(s,0,'mana',hidden)&&has(s,1,'mana',enemy));
 assert.deepEqual(physical(s),all);
});

test('Pallas Rex may decline either deployment and may select a different copy of itself',()=>{
 const s=field(),other=put(s,0,'mana',PALLAS);
 const rex=play(s,PALLAS);
 assert.deepEqual(choices(s),[other.uid,null]);
 pick(s,null);
 rex.entered=0;
 attack(s,rex.uid);
 pick(s,other.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'battle',other));
 assert.equal(s.players[1].shields.length,4);
});

test('Dragon Element Sword returns an own creature, then an opposing mana Twinpact by its spell face',()=>{
 let s=field();
 const own=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',FIRE);
 put(s,0,'battle',SEED);
 const selfSpell=put(s,0,'mana',TRIGGER),twin=put(s,1,'mana',SIRIUS),hidden=put(s,1,'mana',TRIGGER,{faceDown:true});
 const sword=play(s,SWORD),all=physical(s);
 assert.deepEqual(new Set(choices(s)),new Set([own.uid,enemy.uid]));
 pick(s,own.uid);
 assert.ok(has(s,0,'hand',own)&&has(s,1,'battle',enemy));
 assert.deepEqual(new Set(choices(s)),new Set([selfSpell.uid,twin.uid]));
 s=restore(s);
 pick(s,twin.uid);
 assert.ok(has(s,1,'hand',twin)&&has(s,1,'mana',hidden)&&has(s,0,'grave',sword));
 assert.deepEqual(physical(s),all);
});

test('Dragon Element Sword still returns an own mana spell when no creature is available',()=>{
 const s=field(),mana=put(s,0,'mana',TRIGGER);
 const sword=play(s,SWORD);
 assert.deepEqual(choices(s),[mana.uid]);
 pick(s,mana.uid);
 assert.ok(has(s,0,'hand',mana)&&has(s,0,'grave',sword));
});

for(const accept of [true,false])test('W Charger charges and makes one end-of-turn decision for both recipients '+accept,()=>{
 let s=field();
 const first=put(s,0,'battle',NATURE,{tapped:true}),second=put(s,0,'battle',FIRE);
 const unselected=put(s,0,'battle',WATER,{tapped:true});
 put(s,1,'battle',NATURE,{tapped:true});
 put(s,0,'battle',SEED);
 const source=play(s,SIRIUS,1),all=physical(s);
 assert.deepEqual(choices(s),[first.uid,second.uid,unselected.uid,null]);
 pick(s,first.uid);
 assert.deepEqual(choices(s),[second.uid,unselected.uid,null]);
 s=restore(s);
 pick(s,second.uid);
 assert.ok(has(s,0,'mana',source)&&!has(s,0,'grave',source));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 s.players[0].battle.find(x=>x.uid===second.uid).tapped=true;
 assert.ok(s.players[0].battle.find(x=>x.uid===first.uid).tapped);
 s=restore(s);
 end(s);
 assert.match(s.decision.title,/まとめてアンタップ/);
 assert.equal(choices(s)[0],true);
 pick(s,accept?true:choices(s)[1]);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].battle.slice(0,3).map(x=>x.tapped),[!accept,!accept,true]);
 assert.deepEqual(physical(s),all);
});

test('W Charger never untaps a re-entered creature and follows a selected creature through evolution',()=>{
 const s=field(),gone=put(s,0,'battle',NATURE,{tapped:true}),base=put(s,0,'battle',FIRE,{tapped:true});
 play(s,SIRIUS,1);
 pick(s,gone.uid);
 pick(s,base.uid);
 gone.incarnation=2;
 const host=put(s,0,'battle','dm25rp3-S06',{tapped:true,under:[base]});
 s.players[0].battle.splice(s.players[0].battle.indexOf(base),1);
 end(s);
 pick(s,true);
 assert.ok(gone.tapped);
 assert.equal(host.tapped,false);
});

test('W Charger can select zero creatures, and Sirius blocks and breaks three shields on its creature face',()=>{
 const s=field(),ignored=put(s,0,'battle',NATURE,{tapped:true});
 const source=play(s,SIRIUS,1);
 pick(s,null);
 assert.ok(has(s,0,'mana',source));
 assert.equal(s.g501EndDelays?.length||0,0);
 assert.ok(ignored.tapped);
 const sirius=play(s,SIRIUS);
 assert.ok(has(s,0,'battle',sirius));
 assert.equal(e.effectiveCard(sirius,s).blocker,true);
 sirius.entered=0;
 attack(s,sirius.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Night Pon prevents shield breaks but can make a direct attack and may fill a deck',()=>{
 const s=field(),night=put(s,0,'battle',NIGHT);
 assert.deepEqual(e.validateDeck({name:'夜のポンの助',cards:[{id:NIGHT,count:40}]}),[]);
 attack(s,night.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.winner,null);
 night.tapped=false;
 give(s,1,'shields',[]);
 attack(s,night.uid);
 act(s,'noBlock');
 assert.equal(s.winner,0);
});

test('Night Pon suppresses only its own controller’s S-Triggers',()=>{
 for(const owner of [0,1]){
  const s=field(),attacker=put(s,1,'battle',FIRE);
  put(s,owner,'battle',NIGHT);
  give(s,0,'shields',[TRIGGER]);
  s.active=1;
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'),owner===1);
 }
});

test('Zabi Orzekia can destroy itself, then the opponent must choose their own creature',()=>{
 let s=field();
 const unrelated=put(s,0,'battle',NATURE),foe=put(s,1,'battle',WATER),other=put(s,1,'battle',FIRE);
 const zabi=play(s,ZABI),all=physical(s);
 assert.deepEqual(choices(s),[zabi.uid,null]);
 pick(s,zabi.uid);
 assert.ok(has(s,0,'grave',zabi)&&has(s,0,'battle',unrelated));
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[foe.uid,other.uid]);
 s=restore(s);
 pick(s,other.uid);
 assert.ok(has(s,1,'grave',other)&&has(s,1,'battle',foe));
 assert.deepEqual(physical(s),all);
});

test('Zabi Orzekia may decline or choose another own Alien even with no opposing creatures',()=>{
 for(const accept of [true,false]){
  const s=field(),alien=put(s,0,'battle',ZABI);
  const source=play(s,ZABI);
  assert.deepEqual(choices(s),[alien.uid,source.uid,null]);
  pick(s,accept?alien.uid:null);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'battle',source)&&has(s,0,accept?'grave':'battle',alien));
 }
});
